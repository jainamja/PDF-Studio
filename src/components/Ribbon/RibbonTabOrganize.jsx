import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  LayoutGrid,
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
  FilePlus,
  Files,
  Split,
  Combine
} from 'lucide-react';
import {
  rotatePages,
  deletePages,
  duplicatePages,
  insertBlankPage,
  insertPagesFromPdf,
  extractPages
} from '../../engine/organizeEngine';
import { openPdfFiles, saveAsPdfFile } from '../../utils/fileUtils';

export default function RibbonTabOrganize() {
  const {
    activeDoc,
    setActiveModal,
    updateDocumentBytes,
    addToast
  } = useDocument();

  const handleRotate = async (delta) => {
    if (!activeDoc || activeDoc.isEncrypted) return;
    try {
      const pIdx = activeDoc.currentPage - 1;
      const newBytes = await rotatePages(activeDoc.bytes, [pIdx], delta);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Rotated page ${pIdx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!activeDoc || activeDoc.isEncrypted) return;
    if (activeDoc.pageCount <= 1) {
      addToast('Cannot delete the only page in the document', 'warning');
      return;
    }
    try {
      const pIdx = activeDoc.currentPage - 1;
      const newBytes = await deletePages(activeDoc.bytes, [pIdx]);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Deleted page ${pIdx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDuplicate = async () => {
    if (!activeDoc || activeDoc.isEncrypted) return;
    try {
      const pIdx = activeDoc.currentPage - 1;
      const newBytes = await duplicatePages(activeDoc.bytes, [pIdx]);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Duplicated page ${pIdx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleInsertBlank = async () => {
    if (!activeDoc || activeDoc.isEncrypted) return;
    try {
      const pIdx = activeDoc.currentPage;
      const newBytes = await insertBlankPage(activeDoc.bytes, pIdx);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Inserted blank page after page ${pIdx}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleInsertFromPdf = async () => {
    if (!activeDoc || activeDoc.isEncrypted) return;
    const files = await openPdfFiles();
    if (files.length > 0) {
      try {
        const pIdx = activeDoc.currentPage;
        const newBytes = await insertPagesFromPdf(activeDoc.bytes, files[0].bytes, pIdx);
        await updateDocumentBytes(activeDoc.id, newBytes, false);
        addToast(`Inserted pages from ${files[0].name}`, 'success');
      } catch (e) {
        addToast('Insert error: ' + e.message, 'error');
      }
    }
  };

  const handleExtract = async () => {
    if (!activeDoc) return;
    try {
      const pIdx = activeDoc.currentPage - 1;
      const extracted = await extractPages(activeDoc.bytes, [pIdx]);
      await saveAsPdfFile(extracted, `${activeDoc.name.replace('.pdf', '')}_page_${pIdx + 1}.pdf`);
      addToast(`Extracted page ${pIdx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  return (
    <>
      {/* Visual Organizer Modal */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('organize-grid')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Open visual thumbnail grid (multi-select, drag-and-drop reorder)"
          >
            <LayoutGrid size={18} color="#6366f1" />
            <span>Grid View</span>
          </button>
        </div>
        <span className="ribbon-group-title">Overview</span>
      </div>

      {/* Page Actions */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button className="ribbon-btn" onClick={() => handleRotate(90)} disabled={!activeDoc || activeDoc.isEncrypted} title="Rotate 90° Clockwise">
            <RotateCw size={18} />
            <span>Rotate CW</span>
          </button>
          <button className="ribbon-btn" onClick={() => handleRotate(-90)} disabled={!activeDoc || activeDoc.isEncrypted} title="Rotate 90° Counter-Clockwise">
            <RotateCcw size={18} />
            <span>Rotate CCW</span>
          </button>
          <button className="ribbon-btn" onClick={handleDuplicate} disabled={!activeDoc || activeDoc.isEncrypted} title="Duplicate current page">
            <Copy size={18} />
            <span>Duplicate</span>
          </button>
          <button className="ribbon-btn" onClick={handleDelete} disabled={!activeDoc || activeDoc.isEncrypted || activeDoc.pageCount <= 1} title="Delete current page">
            <Trash2 size={18} color="#f43f5e" />
            <span>Delete</span>
          </button>
          <button className="ribbon-btn" onClick={handleExtract} disabled={!activeDoc} title="Extract current page to new PDF">
            <Files size={18} color="#38bdf8" />
            <span>Extract</span>
          </button>
        </div>
        <span className="ribbon-group-title">Page Ops</span>
      </div>

      {/* Insert Ops */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button className="ribbon-btn" onClick={handleInsertBlank} disabled={!activeDoc || activeDoc.isEncrypted} title="Insert blank page">
            <FilePlus size={18} color="#10b981" />
            <span>Insert Blank</span>
          </button>
          <button className="ribbon-btn" onClick={handleInsertFromPdf} disabled={!activeDoc || activeDoc.isEncrypted} title="Insert pages from another PDF">
            <Files size={18} color="#f59e0b" />
            <span>From PDF</span>
          </button>
        </div>
        <span className="ribbon-group-title">Insert</span>
      </div>

      {/* Document Ops */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button className="ribbon-btn" onClick={() => setActiveModal('merge')} title="Merge multiple PDFs">
            <Combine size={18} color="#38bdf8" />
            <span>Merge</span>
          </button>
          <button className="ribbon-btn" onClick={() => setActiveModal('split')} disabled={!activeDoc} title="Split PDF (every N pages, each, ranges)">
            <Split size={18} color="#a855f7" />
            <span>Split</span>
          </button>
        </div>
        <span className="ribbon-group-title">Document</span>
      </div>
    </>
  );
}
