import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, AlignLeft } from 'lucide-react';
import { applyHeaderFooter } from '../../engine/pdfEngine';

export default function HeaderFooterModal() {
  const {
    activeDoc,
    activeModal,
    setActiveModal,
    updateDocumentBytes,
    addToast
  } = useDocument();

  const [topLeft, setTopLeft] = useState('');
  const [topCenter, setTopCenter] = useState('{name}');
  const [topRight, setTopRight] = useState('{date}');
  const [bottomLeft, setBottomLeft] = useState('PDF Studio');
  const [bottomCenter, setBottomCenter] = useState('');
  const [bottomRight, setBottomRight] = useState('Page {n} of {total}');
  const [fontSize, setFontSize] = useState(10);
  const [pageRange, setPageRange] = useState('all');

  if (activeModal !== 'header-footer' || !activeDoc) return null;

  const handleApply = async () => {
    try {
      const newBytes = await applyHeaderFooter(activeDoc.bytes, {
        topLeft,
        topCenter,
        topRight,
        bottomLeft,
        bottomCenter,
        bottomRight,
        fontSize,
        docName: activeDoc.name,
        pageRange
      });
      await updateDocumentBytes(activeDoc.id, newBytes, true);
      addToast('Header & footer applied successfully', 'success');
      setActiveModal(null);
    } catch (err) {
      addToast('Error applying header/footer: ' + err.message, 'error');
    }
  };

  const insertToken = (setter, currentVal, token) => {
    setter(currentVal ? `${currentVal} ${token}` : token);
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlignLeft size={18} color="#6366f1" />
            <span>Header & Footer / Page Numbers</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', background: '#0f172a', padding: '8px 12px', borderRadius: 6 }}>
            Tokens available: <code style={{ color: '#38bdf8' }}>{'{n}'}</code> (Page number), <code style={{ color: '#38bdf8' }}>{'{total}'}</code> (Total pages), <code style={{ color: '#38bdf8' }}>{'{date}'}</code> (Current date), <code style={{ color: '#38bdf8' }}>{'{name}'}</code> (Filename)
          </div>

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 6 }}>Header</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <input
                type="text"
                className="input-field"
                placeholder="Top Left"
                value={topLeft}
                onChange={(e) => setTopLeft(e.target.value)}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Top Center"
                value={topCenter}
                onChange={(e) => setTopCenter(e.target.value)}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Top Right"
                value={topRight}
                onChange={(e) => setTopRight(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 6 }}>Footer</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <input
                type="text"
                className="input-field"
                placeholder="Bottom Left"
                value={bottomLeft}
                onChange={(e) => setBottomLeft(e.target.value)}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Bottom Center"
                value={bottomCenter}
                onChange={(e) => setBottomCenter(e.target.value)}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Bottom Right"
                value={bottomRight}
                onChange={(e) => setBottomRight(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Font Size ({fontSize}pt)</label>
              <input
                type="number"
                className="input-field"
                min="8"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 10)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Page Range</label>
              <input
                type="text"
                className="input-field"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="all, even, odd, or 1-5"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>Apply to Pages</button>
        </div>
      </div>
    </div>
  );
}
