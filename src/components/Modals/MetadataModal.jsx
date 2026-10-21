import React, { useState, useEffect } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, FileSearch } from 'lucide-react';
import { updateMetadata } from '../../engine/pdfEngine';
import { PDFDocument } from 'pdf-lib';

export default function MetadataModal() {
  const {
    activeDoc,
    activeModal,
    setActiveModal,
    updateDocumentBytes,
    addToast
  } = useDocument();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');

  useEffect(() => {
    if (!activeDoc || activeModal !== 'metadata') return;

    PDFDocument.load(activeDoc.bytes, { ignoreEncryption: true }).then(doc => {
      setTitle(doc.getTitle() || '');
      setAuthor(doc.getAuthor() || '');
      setSubject(doc.getSubject() || '');
      const kw = doc.getKeywords();
      setKeywords(kw ? (Array.isArray(kw) ? kw.join(', ') : kw) : '');
    }).catch(e => console.warn('Could not read metadata:', e));
  }, [activeDoc, activeModal]);

  if (activeModal !== 'metadata' || !activeDoc) return null;

  const handleApply = async () => {
    try {
      const newBytes = await updateMetadata(activeDoc.bytes, {
        title,
        author,
        subject,
        keywords
      });
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast('Document metadata updated', 'success');
      setActiveModal(null);
    } catch (err) {
      addToast('Metadata error: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSearch size={18} color="#6366f1" />
            <span>Document Properties & Metadata</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Title</label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Author</label>
            <input
              type="text"
              className="input-field"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Subject</label>
            <input
              type="text"
              className="input-field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Keywords (comma separated)</label>
            <input
              type="text"
              className="input-field"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. invoice, report, 2026"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>Save Properties</button>
        </div>
      </div>
    </div>
  );
}
