import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  Eye,
  Highlighter,
  FileEdit,
  PenTool,
  LayoutGrid,
  Sliders,
  Camera,
  RotateCw,
  Plus,
  Trash2,
  Copy,
  Type,
  Square,
  MessageSquare,
  Eraser,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { rotatePages, deletePages, duplicatePages } from '../../engine/organizeEngine';

export default function MobileBottomBar() {
  const {
    activeDoc,
    activeTool,
    setActiveTool,
    mobileNavTab,
    setMobileNavTab,
    isBottomSheetOpen,
    setIsBottomSheetOpen,
    setActiveModal,
    updateDocumentBytes,
    addToast
  } = useDocument();

  const [currentFormFieldIdx, setCurrentFormFieldIdx] = useState(0);

  if (!activeDoc) return null;

  const handleRotatePage = async () => {
    try {
      const pIdx = activeDoc.currentPage - 1;
      const newBytes = await rotatePages(activeDoc.bytes, [pIdx], 90);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Rotated page ${pIdx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDeletePage = async () => {
    if (activeDoc.pageCount <= 1) {
      addToast('Cannot delete the only page', 'warning');
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

  const handleDuplicatePage = async () => {
    try {
      const pIdx = activeDoc.currentPage - 1;
      const newBytes = await duplicatePages(activeDoc.bytes, [pIdx]);
      await updateDocumentBytes(activeDoc.id, newBytes, false);
      addToast(`Duplicated page ${pIdx + 1}`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleNavigateFormField = (delta) => {
    const fields = activeDoc.formFields || [];
    if (fields.length === 0) return;

    const nextIdx = (currentFormFieldIdx + delta + fields.length) % fields.length;
    setCurrentFormFieldIdx(nextIdx);
    const target = fields[nextIdx];

    const el = document.querySelector(`[data-field-name="${target.name}"]`);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const formFields = activeDoc.formFields || [];

  return (
    <footer className="mobile-bottom-bar-container">
      {/* Sub-tools row based on active mode */}
      <div className="mobile-subtool-row">
        {mobileNavTab === 'view' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className={`mobile-subtool-btn ${activeTool === 'select' ? 'active' : ''}`}
              onClick={() => setActiveTool('select')}
            >
              Select Text
            </button>
            <button
              className={`mobile-subtool-btn ${activeTool === 'hand' ? 'active' : ''}`}
              onClick={() => setActiveTool('hand')}
            >
              Hand Pan
            </button>
          </div>
        )}

        {mobileNavTab === 'annotate' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', width: '100%' }}>
            <button
              className={`mobile-subtool-btn ${activeTool === 'highlight' ? 'active' : ''}`}
              onClick={() => setActiveTool('highlight')}
            >
              <Highlighter size={14} color="#eab308" /> Highlight
            </button>
            <button
              className={`mobile-subtool-btn ${activeTool === 'ink' ? 'active' : ''}`}
              onClick={() => setActiveTool('ink')}
            >
              <PenTool size={14} color="#3b82f6" /> Draw
            </button>
            <button
              className={`mobile-subtool-btn ${activeTool === 'sticky' ? 'active' : ''}`}
              onClick={() => setActiveTool('sticky')}
            >
              <MessageSquare size={14} color="#10b981" /> Note
            </button>
            <button
              className={`mobile-subtool-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
              onClick={() => setActiveTool('rectangle')}
            >
              <Square size={14} color="#ef4444" /> Shape
            </button>
            <button
              className="mobile-subtool-btn"
              onClick={() => setIsBottomSheetOpen(true)}
            >
              <Sliders size={14} /> Style
            </button>
          </div>
        )}

        {mobileNavTab === 'edit' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', width: '100%' }}>
            <button
              className={`mobile-subtool-btn ${activeTool === 'edit-text' ? 'active' : ''}`}
              onClick={() => setActiveTool('edit-text')}
            >
              <FileEdit size={14} color="#38bdf8" /> Edit Text
            </button>
            <button
              className={`mobile-subtool-btn ${activeTool === 'add-text' ? 'active' : ''}`}
              onClick={() => setActiveTool('add-text')}
            >
              <Type size={14} color="#a855f7" /> Text Box
            </button>
            <button
              className={`mobile-subtool-btn ${activeTool === 'whiteout' ? 'active' : ''}`}
              onClick={() => setActiveTool('whiteout')}
            >
              <Eraser size={14} color="#f59e0b" /> Whiteout
            </button>
            <button
              className="mobile-subtool-btn"
              onClick={() => setIsBottomSheetOpen(true)}
            >
              <Sliders size={14} /> Format
            </button>
          </div>
        )}

        {mobileNavTab === 'sign' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', overflowX: 'auto' }}>
            <button
              className="mobile-subtool-btn active"
              onClick={() => setActiveModal('signature')}
            >
              <PenTool size={14} /> Place Signature
            </button>

            {formFields.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  Field {currentFormFieldIdx + 1}/{formFields.length}
                </span>
                <button
                  className="mobile-subtool-btn"
                  style={{ padding: '0 8px', height: 32, minHeight: 32 }}
                  onClick={() => handleNavigateFormField(-1)}
                  title="Previous Form Field"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="mobile-subtool-btn"
                  style={{ padding: '0 8px', height: 32, minHeight: 32 }}
                  onClick={() => handleNavigateFormField(1)}
                  title="Next Form Field"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {mobileNavTab === 'pages' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', width: '100%' }}>
            <button className="mobile-subtool-btn" onClick={handleRotatePage}>
              <RotateCw size={14} /> Rotate
            </button>
            <button className="mobile-subtool-btn" onClick={handleDuplicatePage}>
              <Copy size={14} /> Duplicate
            </button>
            <button className="mobile-subtool-btn" onClick={handleDeletePage}>
              <Trash2 size={14} color="#f43f5e" /> Delete
            </button>
            <button
              className="mobile-subtool-btn active"
              onClick={() => setActiveModal('organize-grid')}
            >
              <LayoutGrid size={14} /> Page Grid
            </button>
          </div>
        )}

        {mobileNavTab === 'scan' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="mobile-subtool-btn active"
              onClick={() => setActiveModal('scan-to-pdf')}
            >
              <Camera size={14} /> Start Document Scan
            </button>
          </div>
        )}
      </div>

      {/* Primary bottom modes */}
      <nav className="mobile-tab-bar">
        <button
          className={`mobile-tab-btn ${mobileNavTab === 'view' ? 'active' : ''}`}
          onClick={() => { setMobileNavTab('view'); setActiveTool('select'); }}
        >
          <Eye size={20} />
          <span>View</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileNavTab === 'annotate' ? 'active' : ''}`}
          onClick={() => { setMobileNavTab('annotate'); setActiveTool('highlight'); }}
        >
          <Highlighter size={20} />
          <span>Annotate</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileNavTab === 'edit' ? 'active' : ''}`}
          onClick={() => { setMobileNavTab('edit'); setActiveTool('edit-text'); }}
        >
          <FileEdit size={20} />
          <span>Edit</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileNavTab === 'sign' ? 'active' : ''}`}
          onClick={() => { setMobileNavTab('sign'); }}
        >
          <PenTool size={20} />
          <span>Sign</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileNavTab === 'pages' ? 'active' : ''}`}
          onClick={() => setMobileNavTab('pages')}
        >
          <LayoutGrid size={20} />
          <span>Pages</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileNavTab === 'scan' ? 'active' : ''}`}
          onClick={() => { setMobileNavTab('scan'); setActiveModal('scan-to-pdf'); }}
        >
          <Camera size={20} />
          <span>Scan</span>
        </button>
      </nav>
    </footer>
  );
}
