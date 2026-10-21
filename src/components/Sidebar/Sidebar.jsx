import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { LayoutGrid, Bookmark, Search, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import ThumbnailPanel from './ThumbnailPanel';
import OutlinePanel from './OutlinePanel';
import SearchPanel from './SearchPanel';
import CommentsPanel from './CommentsPanel';

export default function Sidebar() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarTab,
    setSidebarTab
  } = useDocument();

  const handleTabClick = (tab) => {
    if (sidebarTab === tab && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setIsSidebarOpen(true);
    }
  };

  const getTitle = () => {
    switch (sidebarTab) {
      case 'thumbnails': return 'Page Thumbnails';
      case 'outline': return 'Bookmarks & Outline';
      case 'search': return 'Find Text';
      case 'comments': return 'Comments & Markup';
      default: return 'Sidebar';
    }
  };

  return (
    <div className="sidebar">
      {/* Icon Rail */}
      <div className="sidebar-icons-rail">
        <button
          className={`sidebar-icon-btn ${isSidebarOpen && sidebarTab === 'thumbnails' ? 'active' : ''}`}
          title="Thumbnails"
          onClick={() => handleTabClick('thumbnails')}
        >
          <LayoutGrid size={18} />
        </button>
        <button
          className={`sidebar-icon-btn ${isSidebarOpen && sidebarTab === 'outline' ? 'active' : ''}`}
          title="Bookmarks"
          onClick={() => handleTabClick('outline')}
        >
          <Bookmark size={18} />
        </button>
        <button
          className={`sidebar-icon-btn ${isSidebarOpen && sidebarTab === 'search' ? 'active' : ''}`}
          title="Search Document"
          onClick={() => handleTabClick('search')}
        >
          <Search size={18} />
        </button>
        <button
          className={`sidebar-icon-btn ${isSidebarOpen && sidebarTab === 'comments' ? 'active' : ''}`}
          title="Comments List"
          onClick={() => handleTabClick('comments')}
        >
          <MessageSquare size={18} />
        </button>
      </div>

      {/* Drawer */}
      {isSidebarOpen && (
        <div className="sidebar-drawer">
          <div className="sidebar-drawer-header">
            <span>{getTitle()}</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="sidebar-drawer-content">
            {sidebarTab === 'thumbnails' && <ThumbnailPanel />}
            {sidebarTab === 'outline' && <OutlinePanel />}
            {sidebarTab === 'search' && <SearchPanel />}
            {sidebarTab === 'comments' && <CommentsPanel />}
          </div>
        </div>
      )}
    </div>
  );
}
