import React, { useEffect, useState, useRef } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { RotateCw, Trash2, Copy } from 'lucide-react';
import { rotatePages, deletePages, duplicatePages } from '../../engine/organizeEngine';

function PageThumbnailItem({ pageIndex, isActive, onClick, onRotate, onDelete, onDuplicate }) {
  const { activeDoc } = useDocument();
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!activeDoc?.pdfDoc || rendered) return;

    let isCancelled = false;
    activeDoc.pdfDoc.getPage(pageIndex + 1).then(page => {
      if (isCancelled) return;
      const vp = page.getViewport({ scale: 0.22 });
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
  }, [activeDoc, pageIndex, rendered]);

  return (
    <div className={`thumbnail-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="thumbnail-canvas-wrapper">
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 4px', marginTop: 4 }}>
        <span className="thumbnail-label">{pageIndex + 1}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            title="Rotate 90° CW"
            onClick={(e) => { e.stopPropagation(); onRotate(pageIndex); }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
          >
            <RotateCw size={12} />
          </button>
          <button
            title="Duplicate"
            onClick={(e) => { e.stopPropagation(); onDuplicate(pageIndex); }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
          >
            <Copy size={12} />
          </button>
          <button
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(pageIndex); }}
            style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 2 }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ThumbnailPanel() {
  const { activeDoc, updateDocumentBytes, addToast, setPage } = useDocument();

  if (!activeDoc) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No document open</div>;
  }

  const handleRotate = async (idx) => {
    try {
      const newBytes = await rotatePages(activeDoc.bytes, [idx], 90);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Rotated page ${idx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDuplicate = async (idx) => {
    try {
      const newBytes = await duplicatePages(activeDoc.bytes, [idx]);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Duplicated page ${idx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDelete = async (idx) => {
    if (activeDoc.pageCount <= 1) {
      addToast('Cannot delete the only page in the document', 'warning');
      return;
    }
    try {
      const newBytes = await deletePages(activeDoc.bytes, [idx]);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Deleted page ${idx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: activeDoc.pageCount }, (_, i) => (
        <PageThumbnailItem
          key={`${activeDoc.id}_thumb_${i}`}
          pageIndex={i}
          isActive={activeDoc.currentPage === i + 1}
          onClick={() => setPage(i + 1)}
          onRotate={handleRotate}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
