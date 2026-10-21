import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  ShieldAlert,
  FileSearch,
  Minimize2,
  ScanText
} from 'lucide-react';

export default function RibbonTabProtect() {
  const {
    activeDoc,
    setActiveModal,
    setActiveTool,
    addToast
  } = useDocument();

  const handleStartRedaction = () => {
    if (!activeDoc || activeDoc.isEncrypted) return;
    setActiveTool('rectangle');
    addToast('Draw black redaction boxes over text/content. Then click "Apply Redaction" to permanently rasterize the page.', 'info', 6000);
  };

  return (
    <>
      {/* Redaction */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={handleStartRedaction}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Mark areas for true redaction"
          >
            <ShieldAlert size={18} color="#f43f5e" />
            <span>Mark Redaction</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('redact-confirm')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Permanently burn redaction boxes into raster image"
          >
            <ShieldAlert size={18} color="#ef4444" />
            <span>Apply Redaction</span>
          </button>
        </div>
        <span className="ribbon-group-title">Redaction</span>
      </div>

      {/* Document Properties & Compression */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('metadata')}
            disabled={!activeDoc}
            title="Edit Document Metadata (Title, Author, Subject, Keywords)"
          >
            <FileSearch size={18} color="#38bdf8" />
            <span>Metadata</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('compress')}
            disabled={!activeDoc}
            title="Lossless & Lossy Compression"
          >
            <Minimize2 size={18} color="#10b981" />
            <span>Compress</span>
          </button>
        </div>
        <span className="ribbon-group-title">Optimization</span>
      </div>

      {/* OCR */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('ocr')}
            disabled={!activeDoc}
            title="Optical Character Recognition with language selection (Tesseract.js)"
          >
            <ScanText size={18} color="#f59e0b" />
            <span>OCR</span>
          </button>
        </div>
        <span className="ribbon-group-title">Recognition</span>
      </div>
    </>
  );
}
