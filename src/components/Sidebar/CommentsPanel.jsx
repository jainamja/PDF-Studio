import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { MessageSquare, Highlighter, Type, Square, Stamp, Trash2 } from 'lucide-react';

export default function CommentsPanel() {
  const {
    activeDoc,
    setPage,
    setSelectedAnnotationId,
    deleteAnnotation
  } = useDocument();

  if (!activeDoc || !activeDoc.annotations || activeDoc.annotations.length === 0) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: 24, fontSize: 12 }}>
        No comments or annotations in this document.
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case 'sticky': return <MessageSquare size={14} color="#facc15" />;
      case 'highlight': return <Highlighter size={14} color="#fef08a" />;
      case 'text':
      case 'edit-text': return <Type size={14} color="#38bdf8" />;
      case 'stamp': return <Stamp size={14} color="#10b981" />;
      default: return <Square size={14} color="#a855f7" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {activeDoc.annotations.map(ann => (
        <div
          key={ann.id}
          onClick={() => {
            setPage(ann.pageIndex + 1);
            setSelectedAnnotationId(ann.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            backgroundColor: '#131b2e',
            border: '1px solid #1e293b',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            {getIcon(ann.type)}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 11 }}>
                {ann.type.toUpperCase()} (Page {ann.pageIndex + 1})
              </span>
              <span style={{ color: '#94a3b8', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ann.text || ann.stampType || 'Shape object'}
              </span>
            </div>
          </div>

          <button
            title="Delete annotation"
            onClick={(e) => {
              e.stopPropagation();
              deleteAnnotation(ann.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#f43f5e',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
