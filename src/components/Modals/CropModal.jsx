import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Crop } from 'lucide-react';
import { cropPages } from '../../engine/organizeEngine';
import { parsePageRange } from '../../engine/pdfEngine';

export default function CropModal() {
  const {
    activeDoc,
    activeModal,
    setActiveModal,
    updateDocumentBytes,
    addToast
  } = useDocument();

  const [top, setTop] = useState(20);
  const [bottom, setBottom] = useState(20);
  const [left, setLeft] = useState(20);
  const [right, setRight] = useState(20);
  const [pageRange, setPageRange] = useState('all');

  if (activeModal !== 'crop' || !activeDoc) return null;

  const handleApply = async () => {
    try {
      const targetIndices = parsePageRange(pageRange, activeDoc.pageCount);
      const newBytes = await cropPages(activeDoc.bytes, targetIndices, {
        top: parseFloat(top) || 0,
        bottom: parseFloat(bottom) || 0,
        left: parseFloat(left) || 0,
        right: parseFloat(right) || 0
      });
      await updateDocumentBytes(activeDoc.id, newBytes, true);
      addToast('Page margins cropped', 'success');
      setActiveModal(null);
    } catch (err) {
      addToast('Crop error: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Crop size={18} color="#6366f1" />
            <span>Crop Page Margins</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            Set margins to crop from the page boundaries (in points, 72 pt = 1 inch):
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Top Margin</label>
              <input
                type="number"
                className="input-field"
                value={top}
                onChange={(e) => setTop(e.target.value)}
                style={{ width: '100%' }}
                min="0"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Bottom Margin</label>
              <input
                type="number"
                className="input-field"
                value={bottom}
                onChange={(e) => setBottom(e.target.value)}
                style={{ width: '100%' }}
                min="0"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Left Margin</label>
              <input
                type="number"
                className="input-field"
                value={left}
                onChange={(e) => setLeft(e.target.value)}
                style={{ width: '100%' }}
                min="0"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Right Margin</label>
              <input
                type="number"
                className="input-field"
                value={right}
                onChange={(e) => setRight(e.target.value)}
                style={{ width: '100%' }}
                min="0"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Apply to Pages</label>
            <input
              type="text"
              className="input-field"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="all, even, odd, or e.g. 1-3, 5"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>Crop Pages</button>
        </div>
      </div>
    </div>
  );
}
