import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { Lock, FileCheck, ZoomIn, ZoomOut } from 'lucide-react';

export default function StatusBar() {
  const { activeDoc, setZoom } = useDocument();

  if (!activeDoc) {
    return (
      <div className="status-bar">
        <span>No document open</span>
        <span>PDF Studio v1.0</span>
      </div>
    );
  }

  const zoomPercent = typeof activeDoc.scale === 'number'
    ? Math.round(activeDoc.scale * 100)
    : activeDoc.scale;

  return (
    <div className="status-bar">
      <div className="status-bar-group">
        <span>Page {activeDoc.currentPage} of {activeDoc.pageCount}</span>
        {activeDoc.isEncrypted ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
            <Lock size={12} /> Read-Only (Encrypted)
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: activeDoc.isDirty ? '#f59e0b' : '#10b981' }}>
            <FileCheck size={12} /> {activeDoc.isDirty ? 'Unsaved edits' : 'Ready'}
          </span>
        )}
      </div>

      <div className="status-bar-group">
        <button
          onClick={() => setZoom('out')}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <ZoomOut size={13} />
        </button>

        <select
          value={typeof activeDoc.scale === 'number' ? activeDoc.scale : activeDoc.scale}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'fit-width' || val === 'fit-page') {
              setZoom(val);
            } else {
              setZoom(parseFloat(val));
            }
          }}
          className="input-field"
          style={{ padding: '2px 4px', fontSize: 11, height: 22 }}
        >
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1.0">100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
          <option value="2.0">200%</option>
          <option value="fit-width">Fit Width</option>
          <option value="fit-page">Fit Page</option>
        </select>

        <button
          onClick={() => setZoom('in')}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <ZoomIn size={13} />
        </button>
      </div>
    </div>
  );
}
