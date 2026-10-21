import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { AlertCircle, X } from 'lucide-react';

export default function UnsavedPromptModal() {
  const {
    activeModal,
    setActiveModal,
    modalProps,
    closeDocument,
    saveDocument
  } = useDocument();

  if (activeModal !== 'unsaved-prompt') return null;

  const { docId, docName } = modalProps;

  const handleSaveAndClose = async () => {
    await saveDocument(docId, false);
    setActiveModal(null);
    closeDocument(docId, true);
  };

  const handleDiscardAndClose = () => {
    setActiveModal(null);
    closeDocument(docId, true);
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} color="#f59e0b" />
            <span>Unsaved Changes</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
            Do you want to save the changes made to <strong>"{docName}"</strong> before closing?
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            If you don't save, all pending edits, annotations, and form inputs will be lost.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDiscardAndClose}>Don't Save</button>
          <button className="btn btn-primary" onClick={handleSaveAndClose}>Save</button>
        </div>
      </div>
    </div>
  );
}
