import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, LayoutGrid, Bookmark, Search, MessageSquare } from 'lucide-react';
import ThumbnailPanel from '../Sidebar/ThumbnailPanel';
import OutlinePanel from '../Sidebar/OutlinePanel';
import SearchPanel from '../Sidebar/SearchPanel';
import CommentsPanel from '../Sidebar/CommentsPanel';

export default function MobileDrawer() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarTab,
    setSidebarTab
  } = useDocument();

  if (!isSidebarOpen) return null;

  return (
    <>
      <div className="mobile-drawer-backdrop" onClick={() => setIsSidebarOpen(false)} />
      <div className="mobile-drawer">
        <div className="mobile-drawer-header">
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`mobile-subtool-btn ${sidebarTab === 'thumbnails' ? 'active' : ''}`}
              onClick={() => setSidebarTab('thumbnails')}
            >
              <LayoutGrid size={15} /> Pages
            </button>
            <button
              className={`mobile-subtool-btn ${sidebarTab === 'outline' ? 'active' : ''}`}
              onClick={() => setSidebarTab('outline')}
            >
              <Bookmark size={15} /> Outline
            </button>
            <button
              className={`mobile-subtool-btn ${sidebarTab === 'search' ? 'active' : ''}`}
              onClick={() => setSidebarTab('search')}
            >
              <Search size={15} /> Find
            </button>
            <button
              className={`mobile-subtool-btn ${sidebarTab === 'comments' ? 'active' : ''}`}
              onClick={() => setSidebarTab('comments')}
            >
              <MessageSquare size={15} /> Notes
            </button>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8 }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mobile-drawer-body">
          {sidebarTab === 'thumbnails' && <ThumbnailPanel />}
          {sidebarTab === 'outline' && <OutlinePanel />}
          {sidebarTab === 'search' && <SearchPanel />}
          {sidebarTab === 'comments' && <CommentsPanel />}
        </div>
      </div>
    </>
  );
}
