import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Stamp } from 'lucide-react';
import { applyWatermark } from '../../engine/pdfEngine';

export default function WatermarkModal() {
  const {
    activeDoc,
    activeModal,
    setActiveModal,
    updateDocumentBytes,
    addToast
  } = useDocument();

  const [text, setText] = useState('CONFIDENTIAL');
  const [color, setColor] = useState('#64748b');
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(45);
  const [fontSize, setFontSize] = useState(50);
  const [pageRange, setPageRange] = useState('all');
  const [isTiled, setIsTiled] = useState(false);

  if (activeModal !== 'watermark' || !activeDoc) return null;

  const handleApply = async () => {
    try {
      const newBytes = await applyWatermark(activeDoc.bytes, {
        text,
        color,
        opacity,
        rotation,
        fontSize,
        pageRange,
        isTiled
      });
      await updateDocumentBytes(activeDoc.id, newBytes, true);
      addToast('Watermark applied successfully', 'success');
      setActiveModal(null);
    } catch (err) {
      addToast('Failed to apply watermark: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stamp size={18} color="#6366f1" />
            <span>Add Watermark</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Watermark Text</label>
            <input
              type="text"
              className="input-field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Font Size ({fontSize}pt)</label>
              <input
                type="range"
                min="20"
                max="90"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Opacity ({Math.round(opacity * 100)}%)</label>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Rotation ({rotation}°)</label>
              <input
                type="range"
                min="0"
                max="90"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: '100%', height: 32, padding: 0, border: 'none', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="tileCheck"
              checked={isTiled}
              onChange={(e) => setIsTiled(e.target.checked)}
            />
            <label htmlFor="tileCheck" style={{ fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
              Tile repeatedly across page
            </label>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Page Range</label>
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
          <button className="btn btn-primary" onClick={handleApply}>Apply Watermark</button>
        </div>
      </div>
    </div>
  );
}
