import React, { useState, useEffect, useRef } from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  X,
  RotateCw,
  Copy,
  Trash2,
  FileDown,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  rotatePages,
  deletePages,
  duplicatePages,
  reorderPages,
  extractPages
} from '../../engine/organizeEngine';
import ioAdapter from '../../lib/io';

function GridThumbnail({
  pageIndex,
  originalIndex,
  isSelected,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onTouchMovePage
}) {
  const { activeDoc } = useDocument();
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const longPressTimerRef = useRef(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  useEffect(() => {
    if (!activeDoc?.pdfDoc || rendered) return;

    let isCancelled = false;
    activeDoc.pdfDoc.getPage(originalIndex + 1).then(page => {
      if (isCancelled) return;
      const vp = page.getViewport({ scale: 0.25 });
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');

      page.render({
        canvasContext: ctx,
        viewport: vp
      }).promise.then(() => {
        if (!isCancelled) setRendered(true);
      }).catch(() => {});
    });

    return () => { isCancelled = true; };
  }, [activeDoc, originalIndex, rendered]);

  // Touch long press to drag
  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsTouchDragging(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 350);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isTouchDragging) {
      setIsTouchDragging(false);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, pageIndex)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, pageIndex)}
      onClick={onToggleSelect}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface)',
        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
        transition: 'all 0.15s ease',
        transform: isTouchDragging ? 'scale(1.05)' : 'none',
        boxShadow: isTouchDragging ? '0 10px 20px rgba(0,0,0,0.4)' : 'none'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        background: 'rgba(15, 23, 42, 0.85)',
        borderRadius: '50%',
        width: 22,
        height: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: '#f8fafc'
      }}>
        {pageIndex + 1}
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120
      }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={e => e.stopPropagation()}
          style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: 16, height: 16 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {pageIndex + 1}</span>
      </div>
    </div>
  );
}

export default function OrganizeGridModal() {
  const {
    activeDoc,
    activeModal,
    setActiveModal,
    updateDocumentBytes,
    loadPdfDocument,
    addToast
  } = useDocument();

  const [pageOrder, setPageOrder] = useState([]);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    if (activeDoc) {
      setPageOrder(Array.from({ length: activeDoc.pageCount }, (_, i) => i));
      setSelectedPages(new Set());
    }
  }, [activeDoc, activeModal]);

  if (activeModal !== 'organize-grid' || !activeDoc) return null;

  const toggleSelect = (pageIndex) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPages.size === pageOrder.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pageOrder.map((_, i) => i)));
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const copy = [...pageOrder];
    const [moved] = copy.splice(draggedIndex, 1);
    copy.splice(targetIndex, 0, moved);
    setPageOrder(copy);
    setDraggedIndex(null);
  };

  const handleRotateSelected = async () => {
    if (selectedPages.size === 0) {
      addToast('Please select pages to rotate', 'warning');
      return;
    }
    try {
      const targetOriginalIndices = Array.from(selectedPages).map(pos => pageOrder[pos]);
      const newBytes = await rotatePages(activeDoc.bytes, targetOriginalIndices, 90);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Rotated ${selectedPages.size} page(s)`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPages.size === 0) {
      addToast('Please select pages to delete', 'warning');
      return;
    }
    if (pageOrder.length - selectedPages.size < 1) {
      addToast('Cannot delete all pages', 'warning');
      return;
    }
    try {
      const targetOriginalIndices = Array.from(selectedPages).map(pos => pageOrder[pos]);
      const newBytes = await deletePages(activeDoc.bytes, targetOriginalIndices);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Deleted ${selectedPages.size} page(s)`, 'success');
      setSelectedPages(new Set());
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDuplicateSelected = async () => {
    if (selectedPages.size === 0) {
      addToast('Please select pages to duplicate', 'warning');
      return;
    }
    try {
      const targetOriginalIndices = Array.from(selectedPages).map(pos => pageOrder[pos]);
      const newBytes = await duplicatePages(activeDoc.bytes, targetOriginalIndices);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Duplicated ${selectedPages.size} page(s)`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleExtractSelected = async () => {
    if (selectedPages.size === 0) {
      addToast('Please select pages to extract', 'warning');
      return;
    }
    try {
      const targetOriginalIndices = Array.from(selectedPages).map(pos => pageOrder[pos]);
      const extractedBytes = await extractPages(activeDoc.bytes, targetOriginalIndices);
      const fileName = `Extracted_${activeDoc.name || 'document.pdf'}`;

      await ioAdapter.saveBytes(extractedBytes, fileName);
      addToast(`Extracted ${selectedPages.size} page(s) successfully`, 'success');
    } catch (e) {
      addToast('Extraction failed: ' + e.message, 'error');
    }
  };

  const handleSaveOrder = async () => {
    const hasChanged = pageOrder.some((origIdx, pos) => origIdx !== pos);
    if (!hasChanged) {
      setActiveModal(null);
      return;
    }

    try {
      const newBytes = await reorderPages(activeDoc.bytes, pageOrder);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast('Page order updated', 'success');
      setActiveModal(null);
    } catch (e) {
      addToast('Reorder failed: ' + e.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 860, height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600 }}>Organize Pages</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {selectedPages.size} of {pageOrder.length} selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={selectAll}
            >
              {selectedPages.size === pageOrder.length ? 'Deselect' : 'Select All'}
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={handleRotateSelected}
            >
              <RotateCw size={14} /> Rotate
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={handleDuplicateSelected}
            >
              <Copy size={14} /> Duplicate
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={handleExtractSelected}
            >
              <FileDown size={14} /> Extract
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={handleDeleteSelected}
            >
              <Trash2 size={14} /> Delete
            </button>
            <button
              onClick={() => setActiveModal(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 14
          }}>
            {pageOrder.map((origIdx, pos) => (
              <GridThumbnail
                key={`${origIdx}_at_${pos}`}
                pageIndex={pos}
                originalIndex={origIdx}
                isSelected={selectedPages.has(pos)}
                onToggleSelect={() => toggleSelect(pos)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveOrder}>
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
