import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { Bookmark, ChevronRight, ChevronDown } from 'lucide-react';

function OutlineNode({ item, onSelect }) {
  const [isOpen, setIsOpen] = React.useState(true);
  const hasChildren = item.items && item.items.length > 0;

  return (
    <div className="outline-tree-item">
      <div
        className="outline-node-content"
        onClick={() => onSelect(item)}
      >
        {hasChildren && (
          <span
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            style={{ marginRight: 4, display: 'inline-flex', cursor: 'pointer' }}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        <Bookmark size={13} style={{ marginRight: 6, color: '#6366f1', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </span>
      </div>
      {hasChildren && isOpen && (
        <div style={{ paddingLeft: 14 }}>
          {item.items.map((child, idx) => (
            <OutlineNode key={idx} item={child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OutlinePanel() {
  const { activeDoc, setPage } = useDocument();

  if (!activeDoc || !activeDoc.outline || activeDoc.outline.length === 0) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: 24, fontSize: 12 }}>
        No bookmarks or outline found in this document.
      </div>
    );
  }

  const handleSelectBookmark = async (item) => {
    if (!item.dest || !activeDoc.pdfDoc) return;
    try {
      let pageIndex = -1;
      if (typeof item.dest === 'string') {
        const dest = await activeDoc.pdfDoc.getDestination(item.dest);
        if (dest) {
          pageIndex = await activeDoc.pdfDoc.getPageIndex(dest[0]);
        }
      } else if (Array.isArray(item.dest)) {
        pageIndex = await activeDoc.pdfDoc.getPageIndex(item.dest[0]);
      }

      if (pageIndex >= 0) {
        setPage(pageIndex + 1);
      }
    } catch (e) {
      console.warn('Bookmark jump error:', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {activeDoc.outline.map((item, idx) => (
        <OutlineNode key={idx} item={item} onSelect={handleSelectBookmark} />
      ))}
    </div>
  );
}
