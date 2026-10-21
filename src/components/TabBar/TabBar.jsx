import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { Plus, X, Minus, Square, Copy } from 'lucide-react';
import { openPdfFiles } from '../../utils/fileUtils';

export default function TabBar() {
  const {
    documents,
    activeDocId,
    setActiveDoc,
    closeDocument,
    loadPdfDocument,
    createBlankDocument
  } = useDocument();

  const handleOpenNew = async () => {
    const files = await openPdfFiles();
    for (const f of files) {
      await loadPdfDocument(f.name, f.bytes, f.path);
    }
  };

  return (
    <div className="title-bar">
      {/* Brand */}
      <div className="brand-section">
        <img src="./logo.svg" alt="PDF Studio Logo" className="brand-logo" />
        <span>PDF Studio</span>
      </div>

      {/* Tabs */}
      <div className="doc-tabs-container">
        {documents.map(doc => {
          const isActive = doc.id === activeDocId;
          return (
            <div
              key={doc.id}
              className={`doc-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveDoc(doc.id)}
              title={doc.path || doc.name}
            >
              {doc.isDirty && <div className="doc-tab-unsaved" title="Unsaved changes" />}
              <span className="doc-tab-title">{doc.name}</span>
              <span
                className="doc-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeDocument(doc.id);
                }}
              >
                <X size={12} />
              </span>
            </div>
          );
        })}

        <button
          className="ribbon-btn-sm"
          onClick={handleOpenNew}
          title="Open another PDF document"
          style={{ height: 26, width: 26, padding: 0, justifyContent: 'center' }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Window Controls (Electron context) */}
      {window.electronAPI && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, WebkitAppRegion: 'no-drag' }}>
          <button
            className="sidebar-icon-btn"
            style={{ width: 28, height: 26 }}
            onClick={() => window.electronAPI.minimizeWindow()}
          >
            <Minus size={13} />
          </button>
          <button
            className="sidebar-icon-btn"
            style={{ width: 28, height: 26 }}
            onClick={() => window.electronAPI.maximizeWindow()}
          >
            <Square size={12} />
          </button>
          <button
            className="sidebar-icon-btn"
            style={{ width: 28, height: 26 }}
            onClick={() => window.electronAPI.closeWindow()}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
