import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  Menu,
  Undo2,
  Redo2,
  Share2,
  Sun,
  Moon,
  MoreVertical,
  Plus,
  FolderOpen,
  Save,
  Scan,
  Maximize2,
  Search,
  LayoutGrid
} from 'lucide-react';
import { openPdfFiles } from '../../utils/fileUtils';

export default function MobileTopAppBar() {
  const {
    activeDoc,
    undo,
    redo,
    saveDocument,
    shareDocument,
    theme,
    toggleTheme,
    loadPdfDocument,
    createBlankDocument,
    setIsSidebarOpen,
    setSidebarTab,
    setActiveModal
  } = useDocument();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleOpenDoc = async () => {
    setIsMenuOpen(false);
    const files = await openPdfFiles();
    for (const f of files) {
      await loadPdfDocument(f.name, f.bytes, f.path);
    }
  };

  const handleSidebarOpen = (tab) => {
    setIsMenuOpen(false);
    setSidebarTab(tab);
    setIsSidebarOpen(true);
  };

  return (
    <header className="mobile-top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {/* Menu / Drawer Toggle */}
        <button
          className="mobile-icon-btn"
          onClick={() => handleSidebarOpen('thumbnails')}
          title="Open thumbnails & outline drawer"
        >
          <Menu size={20} />
        </button>

        {/* Brand / Document Title */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--text-main)'
          }}>
            {activeDoc ? activeDoc.name : 'PDF Studio'}
          </span>
          {activeDoc && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Page {activeDoc.currentPage} of {activeDoc.pageCount}
              {activeDoc.isDirty && ' • Unsaved'}
            </span>
          )}
        </div>
      </div>

      {/* Action Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {activeDoc && (
          <>
            <button
              className="mobile-icon-btn"
              onClick={undo}
              disabled={activeDoc.history.past.length === 0}
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button
              className="mobile-icon-btn"
              onClick={redo}
              disabled={activeDoc.history.future.length === 0}
              title="Redo"
            >
              <Redo2 size={18} />
            </button>
            <button
              className="mobile-icon-btn"
              onClick={() => shareDocument(activeDoc.id)}
              title="Share PDF via native sheet"
            >
              <Share2 size={18} color="#38bdf8" />
            </button>
          </>
        )}

        {/* Theme Toggle */}
        <button className="mobile-icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} color="#facc15" />}
        </button>

        {/* Overflow Menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="mobile-icon-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="More Options"
          >
            <MoreVertical size={18} />
          </button>

          {isMenuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 120 }}
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="mobile-overflow-menu">
                <div className="mobile-menu-item" onClick={handleOpenDoc}>
                  <FolderOpen size={16} color="#38bdf8" />
                  <span>Open PDF...</span>
                </div>
                <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('scan-to-pdf'); }}>
                  <Scan size={16} color="#10b981" />
                  <span>Scan to PDF</span>
                </div>
                <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); createBlankDocument(); }}>
                  <Plus size={16} color="#818cf8" />
                  <span>New Blank PDF</span>
                </div>
                {activeDoc && (
                  <>
                    <div className="mobile-menu-divider" />
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); saveDocument(activeDoc.id, false); }}>
                      <Save size={16} color="#10b981" />
                      <span>Save Changes</span>
                    </div>
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); saveDocument(activeDoc.id, true); }}>
                      <Save size={16} color="#38bdf8" />
                      <span>Save Copy / As...</span>
                    </div>
                    <div className="mobile-menu-divider" />
                    <div className="mobile-menu-item" onClick={() => handleSidebarOpen('search')}>
                      <Search size={16} color="#a855f7" />
                      <span>Find Text</span>
                    </div>
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('organize-grid'); }}>
                      <LayoutGrid size={16} color="#6366f1" />
                      <span>Organize Grid</span>
                    </div>
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('compress'); }}>
                      <Maximize2 size={16} color="#f59e0b" />
                      <span>Compress Document</span>
                    </div>
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('ocr'); }}>
                      <Scan size={16} color="#38bdf8" />
                      <span>Run OCR Text Layer</span>
                    </div>
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('watermark'); }}>
                      <span>Add Watermark</span>
                    </div>
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('header-footer'); }}>
                      <span>Header & Footer</span>
                    </div>
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('crop'); }}>
                      <span>Crop Margins</span>
                    </div>
                    <div className="mobile-menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('metadata'); }}>
                      <span>Edit Metadata</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
