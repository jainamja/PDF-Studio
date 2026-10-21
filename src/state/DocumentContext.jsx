/**
 * PDF Studio - Document State Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import pdfjsLib, { getDocumentOptions } from '../utils/pdfjsConfig';
import { initHistory, pushHistorySnapshot, undoHistory, redoHistory } from './history.js';
import { commitAnnotations } from '../engine/pdfEngine.js';
import { extractFormFields, applyFormValues } from '../engine/formEngine.js';
import { savePdfFile, saveAsPdfFile, openPdfFiles } from '../utils/fileUtils.js';

const DocumentContext = createContext(null);

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);

  // Active Tool
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'hand', 'add-text', 'edit-text', 'add-image', 'whiteout', 'highlight', 'underline', 'strikethrough', 'sticky', 'rectangle', 'ellipse', 'line', 'arrow', 'ink', 'stamp'
  const [stampType, setStampType] = useState('APPROVED');

  // Annotation Properties Panel
  const [activeProperties, setActiveProperties] = useState({
    strokeColor: '#ef4444',
    fillColor: 'transparent',
    strokeWidth: 2,
    opacity: 1,
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Helvetica',
    isBold: false,
    isItalic: false
  });

  // Selected annotation ID for moving, resizing, properties editing
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);

  // Modals & Panels
  const [activeModal, setActiveModal] = useState(null); // 'watermark', 'header-footer', 'crop', 'metadata', 'compress', 'ocr', 'split', 'merge', 'signature', 'images-to-pdf', 'unsaved-prompt'
  const [modalProps, setModalProps] = useState({});

  // Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('thumbnails'); // 'thumbnails', 'outline', 'search', 'comments'

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchCase, setSearchMatchCase] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchCurrentIndex, setSearchCurrentIndex] = useState(0);

  // Busy & Toast Feedback
  const [busyState, setBusyState] = useState({ isBusy: false, message: '', progress: 0 });
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const showBusy = useCallback((message = 'Processing...', progress = 0) => {
    setBusyState({ isBusy: true, message, progress });
  }, []);

  const updateBusyProgress = useCallback((progress, message = null) => {
    setBusyState(prev => ({
      ...prev,
      progress,
      message: message !== null ? message : prev.message
    }));
  }, []);

  const hideBusy = useCallback(() => {
    setBusyState({ isBusy: false, message: '', progress: 0 });
  }, []);

  // Active document helper
  const activeDoc = documents.find(d => d.id === activeDocId) || null;

  /**
   * Loads a PDF into memory, extracts pages, forms, and outline.
   */
  const loadPdfDocument = useCallback(async (name, bytes, path = null) => {
    try {
      showBusy('Loading document...');
      const safeBytes = (bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).slice();
      let isEncrypted = false;
      let pdfDoc = null;

      try {
        const loadingTask = pdfjsLib.getDocument(getDocumentOptions(safeBytes.slice()));
        pdfDoc = await loadingTask.promise;
      } catch (err) {
        if (err.name === 'PasswordException' || (err.message && err.message.includes('password'))) {
          isEncrypted = true;
          addToast('This PDF is password-protected/encrypted and will open in read-only mode.', 'warning', 6000);
        } else {
          throw err;
        }
      }

      const pageCount = pdfDoc ? pdfDoc.numPages : 0;

      // Extract outline/bookmarks
      let outline = [];
      if (pdfDoc) {
        try {
          outline = (await pdfDoc.getOutline()) || [];
        } catch {
          outline = [];
        }
      }

      // Extract form fields
      let formFields = [];
      let hasForm = false;
      if (!isEncrypted) {
        try {
          const formRes = await extractFormFields(safeBytes.slice());
          formFields = formRes.fields;
          hasForm = formRes.hasForm;
        } catch (e) {
          console.warn('Form extraction notice:', e);
        }
      }

      const docBytes = safeBytes.slice();
      const initialSnapshot = {
        bytes: docBytes,
        annotations: [],
        formValues: {}
      };

      const newDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        path,
        bytes: docBytes,
        pdfDoc,
        pageCount,
        outline,
        formFields,
        hasForm,
        isEncrypted,
        isDirty: false,
        annotations: [],
        formValues: {},
        scale: 1.0,
        currentPage: 1,
        history: initHistory(initialSnapshot)
      };

      setDocuments(prev => [...prev, newDoc]);
      setActiveDocId(newDoc.id);
      hideBusy();
      return newDoc;
    } catch (err) {
      hideBusy();
      addToast(`Failed to open PDF: ${err.message}`, 'error');
      console.error(err);
      return null;
    }
  }, [addToast, hideBusy, showBusy]);

  /**
   * Creates a blank new document (1 blank A4 page)
   */
  const createBlankDocument = useCallback(async () => {
    try {
      showBusy('Creating blank document...');
      const doc = await PDFDocument.create();
      doc.addPage([595.28, 841.89]);
      const bytes = await doc.save();
      await loadPdfDocument('Untitled.pdf', bytes, null);
      hideBusy();
    } catch (err) {
      hideBusy();
      addToast('Error creating blank document: ' + err.message, 'error');
    }
  }, [addToast, hideBusy, loadPdfDocument, showBusy]);

  /**
   * Commits pending annotations and form values into active document bytes.
   */
  const commitPendingEdits = useCallback(async (docId = activeDocId) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc || doc.isEncrypted) return doc ? doc.bytes : null;

    let updatedBytes = doc.bytes;

    if (Object.keys(doc.formValues).length > 0) {
      updatedBytes = await applyFormValues(updatedBytes, doc.formValues);
    }

    if (doc.annotations.length > 0) {
      updatedBytes = await commitAnnotations(updatedBytes, doc.annotations);
    }

    return updatedBytes;
  }, [activeDocId, documents]);

  /**
   * Updates document bytes and reloads pdfjs proxy.
   */
  const updateDocumentBytes = useCallback(async (docId, rawBytes, shouldClearPending = true) => {
    const newBytes = (rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes)).slice();
    try {
      showBusy('Updating document...');
      const loadingTask = pdfjsLib.getDocument(getDocumentOptions(newBytes));
      const newPdfDoc = await loadingTask.promise;
      const pageCount = newPdfDoc.numPages;

      let outline = [];
      try {
        outline = (await newPdfDoc.getOutline()) || [];
      } catch {
        outline = [];
      }

      let formFields = [];
      let hasForm = false;
      try {
        const formRes = await extractFormFields(newBytes);
        formFields = formRes.fields;
        hasForm = formRes.hasForm;
      } catch (e) {
        console.warn('Form extract error:', e);
      }

      setDocuments(prev => prev.map(d => {
        if (d.id !== docId) return d;
        const newAnnotations = shouldClearPending ? [] : d.annotations;
        const newFormValues = shouldClearPending ? {} : d.formValues;

        const newSnapshot = {
          bytes: newBytes,
          annotations: newAnnotations,
          formValues: newFormValues
        };

        return {
          ...d,
          bytes: newBytes,
          pdfDoc: newPdfDoc,
          pageCount,
          outline,
          formFields,
          hasForm,
          isDirty: true,
          annotations: newAnnotations,
          formValues: newFormValues,
          history: pushHistorySnapshot(d.history, newSnapshot)
        };
      }));

      hideBusy();
    } catch (err) {
      hideBusy();
      addToast('Error refreshing PDF view: ' + err.message, 'error');
    }
  }, [addToast, hideBusy, showBusy]);

  /**
   * Saves the current document.
   */
  const saveDocument = useCallback(async (docId = activeDocId, isSaveAs = false) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    if (doc.isEncrypted) {
      addToast('Encrypted PDF cannot be modified or saved.', 'warning');
      return;
    }

    try {
      showBusy('Saving document...');
      const burnedBytes = await commitPendingEdits(docId);

      let savedPath = null;
      if (isSaveAs || !doc.path) {
        savedPath = await saveAsPdfFile(burnedBytes, doc.name);
      } else {
        savedPath = await savePdfFile(burnedBytes, doc.name, doc.path);
      }

      if (savedPath) {
        await updateDocumentBytes(docId, burnedBytes, true);
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, isDirty: false, path: savedPath } : d));
        addToast(`Document saved successfully`, 'success');
      }
      hideBusy();
    } catch (err) {
      hideBusy();
      addToast('Save failed: ' + err.message, 'error');
    }
  }, [activeDocId, addToast, commitPendingEdits, documents, hideBusy, showBusy, updateDocumentBytes]);

  /**
   * Closes a document, prompting if unsaved changes exist.
   */
  const closeDocument = useCallback((docId, force = false) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    if (doc.isDirty && !force) {
      setActiveModal('unsaved-prompt');
      setModalProps({ docId, docName: doc.name });
      return;
    }

    setDocuments(prev => {
      const remaining = prev.filter(d => d.id !== docId);
      if (activeDocId === docId) {
        setActiveDocId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });
  }, [activeDocId, documents]);

  /**
   * Adds an annotation to the active document.
   */
  const addAnnotation = useCallback((annotation) => {
    if (!activeDoc || activeDoc.isEncrypted) return;

    const annWithId = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageIndex: activeDoc.currentPage - 1,
      ...activeProperties,
      ...annotation
    };

    setDocuments(prev => prev.map(d => {
      if (d.id !== activeDocId) return d;
      const nextAnnots = [...d.annotations, annWithId];
      const nextSnapshot = {
        bytes: d.bytes,
        annotations: nextAnnots,
        formValues: d.formValues
      };
      return {
        ...d,
        annotations: nextAnnots,
        isDirty: true,
        history: pushHistorySnapshot(d.history, nextSnapshot)
      };
    }));

    setSelectedAnnotationId(annWithId.id);
  }, [activeDoc, activeDocId, activeProperties]);

  /**
   * Updates an annotation.
   */
  const updateAnnotation = useCallback((id, updates) => {
    if (!activeDoc) return;

    setDocuments(prev => prev.map(d => {
      if (d.id !== activeDocId) return d;
      const nextAnnots = d.annotations.map(a => a.id === id ? { ...a, ...updates } : a);
      const nextSnapshot = {
        bytes: d.bytes,
        annotations: nextAnnots,
        formValues: d.formValues
      };
      return {
        ...d,
        annotations: nextAnnots,
        isDirty: true,
        history: pushHistorySnapshot(d.history, nextSnapshot)
      };
    }));
  }, [activeDoc, activeDocId]);

  /**
   * Deletes an annotation.
   */
  const deleteAnnotation = useCallback((id) => {
    if (!activeDoc) return;

    setDocuments(prev => prev.map(d => {
      if (d.id !== activeDocId) return d;
      const nextAnnots = d.annotations.filter(a => a.id !== id);
      const nextSnapshot = {
        bytes: d.bytes,
        annotations: nextAnnots,
        formValues: d.formValues
      };
      return {
        ...d,
        annotations: nextAnnots,
        isDirty: true,
        history: pushHistorySnapshot(d.history, nextSnapshot)
      };
    }));

    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
  }, [activeDoc, activeDocId, selectedAnnotationId]);

  /**
   * Sets a form value.
   */
  const setFormValue = useCallback((name, value) => {
    if (!activeDoc || activeDoc.isEncrypted) return;

    setDocuments(prev => prev.map(d => {
      if (d.id !== activeDocId) return d;
      const nextValues = { ...d.formValues, [name]: value };
      const nextSnapshot = {
        bytes: d.bytes,
        annotations: d.annotations,
        formValues: nextValues
      };
      return {
        ...d,
        formValues: nextValues,
        isDirty: true,
        history: pushHistorySnapshot(d.history, nextSnapshot)
      };
    }));
  }, [activeDoc, activeDocId]);

  /**
   * Undo
   */
  const undo = useCallback(() => {
    if (!activeDoc) return;
    const currentHist = activeDoc.history;
    if (currentHist.past.length === 0) return;

    const newHist = undoHistory(currentHist);
    const present = newHist.present;

    setDocuments(prev => prev.map(d => {
      if (d.id !== activeDocId) return d;
      return {
        ...d,
        annotations: present ? present.annotations : [],
        formValues: present ? present.formValues : {},
        history: newHist
      };
    }));
  }, [activeDoc, activeDocId]);

  /**
   * Redo
   */
  const redo = useCallback(() => {
    if (!activeDoc) return;
    const currentHist = activeDoc.history;
    if (currentHist.future.length === 0) return;

    const newHist = redoHistory(currentHist);
    const present = newHist.present;

    setDocuments(prev => prev.map(d => {
      if (d.id !== activeDocId) return d;
      return {
        ...d,
        annotations: present ? present.annotations : [],
        formValues: present ? present.formValues : {},
        history: newHist
      };
    }));
  }, [activeDoc, activeDocId]);

  /**
   * Zoom controls
   */
  const setZoom = useCallback((zoom) => {
    setDocuments(prev => prev.map(d => {
      if (d.id !== activeDocId) return d;
      let nextScale = d.scale;
      if (typeof zoom === 'number') {
        nextScale = Math.min(5.0, Math.max(0.25, zoom));
      } else if (zoom === 'in') {
        nextScale = Math.min(5.0, d.scale + 0.15);
      } else if (zoom === 'out') {
        nextScale = Math.max(0.25, d.scale - 0.15);
      } else if (zoom === 'fit-width' || zoom === 'fit-page') {
        nextScale = zoom;
      }
      return { ...d, scale: nextScale };
    }));
  }, [activeDocId]);

  /**
   * Current page navigation
   */
  const setPage = useCallback((pageNum) => {
    setDocuments(prev => prev.map(d => {
      if (d.id !== activeDocId) return d;
      const target = Math.max(1, Math.min(d.pageCount, pageNum));
      return { ...d, currentPage: target };
    }));
  }, [activeDocId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid intercepting inside inputs/textareas
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl+S / Ctrl+Shift+S
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDocument(activeDocId, e.shiftKey);
      }
      // Ctrl+O
      else if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        openPdfFiles().then(files => {
          files.forEach(f => loadPdfDocument(f.name, f.bytes, f.path));
        });
      }
      // Ctrl+Z / Ctrl+Y
      else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
      // Ctrl+F (Find)
      else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSidebarOpen(true);
        setSidebarTab('search');
      }
      // Ctrl+P (Print)
      else if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (activeDoc) {
          commitPendingEdits(activeDoc.id).then(burned => {
            if (window.electronAPI && window.electronAPI.print) {
              window.electronAPI.print();
            } else {
              window.print();
            }
          });
        }
      }
      // Delete key
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          e.preventDefault();
          deleteAnnotation(selectedAnnotationId);
        }
      }
      // Escape
      else if (e.key === 'Escape') {
        setSelectedAnnotationId(null);
        setActiveTool('select');
      }
      // Arrow keys nudging
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedAnnotationId && activeDoc) {
          e.preventDefault();
          const ann = activeDoc.annotations.find(a => a.id === selectedAnnotationId);
          if (ann) {
            const step = e.shiftKey ? 10 : 2;
            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowUp') dy = -step;
            if (e.key === 'ArrowDown') dy = step;
            if (e.key === 'ArrowLeft') dx = -step;
            if (e.key === 'ArrowRight') dx = step;

            updateAnnotation(selectedAnnotationId, {
              x: (ann.x || 0) + dx,
              y: (ann.y || 0) + dy
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDoc, activeDocId, deleteAnnotation, loadPdfDocument, redo, saveDocument, selectedAnnotationId, undo, updateAnnotation, commitPendingEdits]);

  return (
    <DocumentContext.Provider
      value={{
        documents,
        activeDocId,
        activeDoc,
        activeTool,
        setActiveTool,
        stampType,
        setStampType,
        activeProperties,
        setActiveProperties,
        selectedAnnotationId,
        setSelectedAnnotationId,
        activeModal,
        setActiveModal,
        modalProps,
        setModalProps,
        isSidebarOpen,
        setIsSidebarOpen,
        sidebarTab,
        setSidebarTab,
        searchQuery,
        setSearchQuery,
        searchMatchCase,
        setSearchMatchCase,
        searchResults,
        setSearchResults,
        searchCurrentIndex,
        setSearchCurrentIndex,
        busyState,
        showBusy,
        updateBusyProgress,
        hideBusy,
        toasts,
        addToast,
        loadPdfDocument,
        createBlankDocument,
        saveDocument,
        closeDocument,
        setActiveDoc: setActiveDocId,
        commitPendingEdits,
        updateDocumentBytes,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        setFormValue,
        undo,
        redo,
        setZoom,
        setPage
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}
