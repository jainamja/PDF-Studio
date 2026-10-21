import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  FolderOpen,
  Save,
  Printer,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { openPdfFiles } from '../../utils/fileUtils';

export default function RibbonTabHome() {
  const {
    activeDoc,
    activeTool,
    setActiveTool,
    loadPdfDocument,
    saveDocument,
    undo,
    redo,
    setZoom,
    setPage,
    commitPendingEdits
  } = useDocument();

  const handleOpen = async () => {
    const files = await openPdfFiles();
    for (const f of files) {
      await loadPdfDocument(f.name, f.bytes, f.path);
    }
  };

  const handlePrint = async () => {
    if (!activeDoc) return;
    await commitPendingEdits(activeDoc.id);
    if (window.electronAPI && window.electronAPI.print) {
      window.electronAPI.print();
    } else {
      window.print();
    }
  };

  return (
    <>
      {/* File Group */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button className="ribbon-btn" onClick={handleOpen} title="Open PDF (Ctrl+O)">
            <FolderOpen size={18} color="#38bdf8" />
            <span>Open</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => saveDocument(activeDoc?.id, false)}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Save (Ctrl+S)"
          >
            <Save size={18} color="#10b981" />
            <span>Save</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={handlePrint}
            disabled={!activeDoc}
            title="Print (Ctrl+P)"
          >
            <Printer size={18} color="#cbd5e1" />
            <span>Print</span>
          </button>
        </div>
        <span className="ribbon-group-title">File</span>
      </div>

      {/* History Group */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={undo}
            disabled={!activeDoc || (activeDoc.history && activeDoc.history.past.length === 0)}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
            <span>Undo</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={redo}
            disabled={!activeDoc || (activeDoc.history && activeDoc.history.future.length === 0)}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
            <span>Redo</span>
          </button>
        </div>
        <span className="ribbon-group-title">History</span>
      </div>

      {/* Navigation Tools */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className={`ribbon-btn ${activeTool === 'select' ? 'active' : ''}`}
            onClick={() => setActiveTool('select')}
            title="Select tool"
          >
            <MousePointer size={18} />
            <span>Select</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'hand' ? 'active' : ''}`}
            onClick={() => setActiveTool('hand')}
            title="Hand pan tool"
          >
            <Hand size={18} />
            <span>Hand</span>
          </button>
        </div>
        <span className="ribbon-group-title">Tools</span>
      </div>

      {/* Zoom Group */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button className="ribbon-btn" onClick={() => setZoom('out')} disabled={!activeDoc} title="Zoom out">
            <ZoomOut size={17} />
            <span>Out</span>
          </button>
          <button className="ribbon-btn" onClick={() => setZoom('in')} disabled={!activeDoc} title="Zoom in">
            <ZoomIn size={17} />
            <span>In</span>
          </button>
          <button className="ribbon-btn" onClick={() => setZoom('fit-width')} disabled={!activeDoc} title="Fit Width">
            <Maximize2 size={17} />
            <span>Fit Width</span>
          </button>
          <button className="ribbon-btn" onClick={() => setZoom('fit-page')} disabled={!activeDoc} title="Fit Page">
            <Minimize2 size={17} />
            <span>Fit Page</span>
          </button>
        </div>
        <span className="ribbon-group-title">Zoom</span>
      </div>

      {/* Page Navigation */}
      {activeDoc && (
        <div className="ribbon-group">
          <div className="ribbon-group-items" style={{ gap: 4 }}>
            <button
              className="ribbon-btn-sm"
              onClick={() => setPage(activeDoc.currentPage - 1)}
              disabled={activeDoc.currentPage <= 1}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, padding: '0 4px', color: '#e2e8f0' }}>
              {activeDoc.currentPage} / {activeDoc.pageCount}
            </span>
            <button
              className="ribbon-btn-sm"
              onClick={() => setPage(activeDoc.currentPage + 1)}
              disabled={activeDoc.currentPage >= activeDoc.pageCount}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="ribbon-group-title">Page</span>
        </div>
      )}
    </>
  );
}
