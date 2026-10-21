import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  Trash2,
  FileText,
  Highlighter,
  Underline,
  Strikethrough,
  Copy,
  X
} from 'lucide-react';

export default function TextSelectionToolbar() {
  const {
    selectedTextRange,
    setSelectedTextRange,
    addAnnotation,
    addToast
  } = useDocument();

  if (!selectedTextRange) return null;

  const handleDelete = () => {
    addAnnotation({
      pageIndex: selectedTextRange.pageIndex,
      type: 'whiteout',
      x: selectedTextRange.x - 1,
      y: selectedTextRange.y - 1,
      width: selectedTextRange.width + 2,
      height: selectedTextRange.height + 2,
      color: '#ffffff'
    });
    window.getSelection()?.removeAllRanges();
    setSelectedTextRange(null);
    addToast('Selected text deleted', 'success', 2500);
  };

  const handleEditText = () => {
    addAnnotation({
      pageIndex: selectedTextRange.pageIndex,
      type: 'edit-text',
      text: selectedTextRange.text,
      x: selectedTextRange.x - 1,
      y: selectedTextRange.y - 2,
      width: selectedTextRange.width + 10,
      height: Math.max(22, selectedTextRange.height + 4),
      fontSize: Math.round(selectedTextRange.height * 0.85) || 12,
      backgroundColor: '#ffffff',
      color: '#000000'
    });
    window.getSelection()?.removeAllRanges();
    setSelectedTextRange(null);
    addToast('Text replaced with editable box', 'info', 2500);
  };

  const handleMarkup = (type, color) => {
    addAnnotation({
      pageIndex: selectedTextRange.pageIndex,
      type,
      x: selectedTextRange.x,
      y: selectedTextRange.y,
      width: selectedTextRange.width,
      height: selectedTextRange.height,
      color
    });
    window.getSelection()?.removeAllRanges();
    setSelectedTextRange(null);
    addToast(`Added ${type} markup`, 'success', 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedTextRange.text);
      addToast('Copied text to clipboard', 'info', 2000);
    } catch {
      addToast('Could not copy text', 'warning');
    }
    window.getSelection()?.removeAllRanges();
    setSelectedTextRange(null);
  };

  const clientX = selectedTextRange.clientX || window.innerWidth / 2;
  const clientY = selectedTextRange.clientY || 120;

  return (
    <div
      className="text-selection-toolbar"
      style={{
        position: 'fixed',
        left: `${Math.max(12, Math.min(window.innerWidth - 340, clientX - 160))}px`,
        top: `${Math.max(60, clientY - 46)}px`,
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 6px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <button
        className="btn btn-danger"
        style={{ padding: '4px 8px', fontSize: 11, minHeight: 28, display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={handleDelete}
        title="Delete selected text (Delete key)"
      >
        <Trash2 size={13} /> Delete
      </button>

      <button
        className="btn btn-secondary"
        style={{ padding: '4px 8px', fontSize: 11, minHeight: 28, display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={handleEditText}
        title="Edit and replace text"
      >
        <FileText size={13} color="#38bdf8" /> Edit
      </button>

      <button
        className="btn btn-secondary"
        style={{ padding: '4px 6px', fontSize: 11, minHeight: 28 }}
        onClick={() => handleMarkup('highlight', '#fef08a')}
        title="Highlight"
      >
        <Highlighter size={13} color="#facc15" />
      </button>

      <button
        className="btn btn-secondary"
        style={{ padding: '4px 6px', fontSize: 11, minHeight: 28 }}
        onClick={() => handleMarkup('underline', '#38bdf8')}
        title="Underline"
      >
        <Underline size={13} color="#38bdf8" />
      </button>

      <button
        className="btn btn-secondary"
        style={{ padding: '4px 6px', fontSize: 11, minHeight: 28 }}
        onClick={() => handleMarkup('strikethrough', '#ef4444')}
        title="Strikethrough"
      >
        <Strikethrough size={13} color="#ef4444" />
      </button>

      <button
        className="btn btn-secondary"
        style={{ padding: '4px 8px', fontSize: 11, minHeight: 28, display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={handleCopy}
        title="Copy to clipboard (Ctrl+C)"
      >
        <Copy size={13} /> Copy
      </button>

      <button
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center'
        }}
        onClick={() => {
          window.getSelection()?.removeAllRanges();
          setSelectedTextRange(null);
        }}
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
