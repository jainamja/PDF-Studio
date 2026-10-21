import React, { useState, useEffect, useRef } from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  X,
  RotateCw,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Plus
} from 'lucide-react';
import {
  rotatePages,
  deletePages,
  duplicatePages,
  reorderPages,
  insertBlankPage
} from '../../engine/organizeEngine';

function GridThumbnail({ pageIndex, originalIndex, isSelected, onToggleSelect, onDragStart, onDragOver, onDrop }) {
  const { activeDoc } = useDocument();
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);

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

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, pageIndex)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, pageIndex)}
      onClick={onToggleSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : '#172033',
        border: `2px solid ${isSelected ? '#6366f1' : '#1e293b'}`,
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
        transition: 'all 0.15s ease'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 6,
        left: 6,
        background: 'rgba(15, 23, 42, 0.8)',
        borderRadius: '50%',
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 600,
        color: '#f8fafc'
      }}>
        {pageIndex + 1}
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        marginBottom: 6,
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
          style={{ cursor: 'pointer', accentColor: '#6366f1' }}
        />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Page {pageIndex + 1}</span>
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
    addToast
  } = useDocument();

  // Page ordering state: array of original page indices
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

  // Drag and Drop reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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

  // Actions
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

  const handleSaveOrder = async () => {
    // Check if order actually changed
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
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 840, height: '80vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600 }}>Organize Pages</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {selectedPages.size} of {pageOrder.length} selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={selectAll}
            >
              {selectedPages.size === pageOrder.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={handleRotateSelected}
            >
              <RotateCw size={13} /> Rotate 90°
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={handleDuplicateSelected}
            >
              <Copy size={13} /> Duplicate
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={handleDeleteSelected}
            >
              <Trash2 size={13} /> Delete
            </button>
            <button
              onClick={() => setActiveModal(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: 8 }}
            >
              <X size={18} />
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
