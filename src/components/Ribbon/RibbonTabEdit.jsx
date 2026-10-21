import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  FileText,
  Type,
  Image as ImageIcon,
  Eraser,
  Stamp as WatermarkIcon,
  AlignLeft,
  Crop,
  Trash2
} from 'lucide-react';
import ioAdapter from '../../lib/io';

export default function RibbonTabEdit() {
  const {
    activeDoc,
    activeTool,
    setActiveTool,
    setActiveModal,
    addAnnotation,
    selectedAnnotationId,
    selectedTextRange,
    deleteSelected
  } = useDocument();

  const handleImageUpload = async () => {
    try {
      const imgs = await ioAdapter.openImages();
      if (imgs && imgs.length > 0) {
        const img = imgs[0];
        addAnnotation({
          type: 'image',
          dataUrl: img.dataUrl,
          format: img.type || 'png',
          x: 60,
          y: 60,
          width: 200,
          height: 150
        });
        setActiveTool('select');
      }
    } catch (e) {
      console.warn('Image upload notice:', e);
    }
  };

  return (
    <>
      {/* Content Modification */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className={`ribbon-btn ${activeTool === 'edit-text' ? 'active' : ''}`}
            onClick={() => setActiveTool('edit-text')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Edit existing text: click a line, cover and replace"
          >
            <FileText size={18} color="#38bdf8" />
            <span>Edit Text</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'add-text' ? 'active' : ''}`}
            onClick={() => setActiveTool('add-text')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Add new text box"
          >
            <Type size={18} color="#818cf8" />
            <span>Add Text</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={handleImageUpload}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Insert image"
          >
            <ImageIcon size={18} color="#34d399" />
            <span>Add Image</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'whiteout' ? 'active' : ''}`}
            onClick={() => setActiveTool('whiteout')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Whiteout tool"
          >
            <Eraser size={18} color="#fbbf24" />
            <span>Whiteout</span>
          </button>
          {(selectedAnnotationId || selectedTextRange) && (
            <button
              className="ribbon-btn"
              onClick={deleteSelected}
              title="Delete Selected Item (Delete key)"
            >
              <Trash2 size={18} color="#f43f5e" />
              <span>Delete</span>
            </button>
          )}
        </div>
        <span className="ribbon-group-title">Edit Objects</span>
      </div>

      {/* Page Decorators */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('watermark')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Add watermark"
          >
            <WatermarkIcon size={18} color="#f59e0b" />
            <span>Watermark</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('header-footer')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Add headers, footers, and page numbers"
          >
            <AlignLeft size={18} color="#a855f7" />
            <span>Header/Footer</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('crop')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Crop page margins"
          >
            <Crop size={18} color="#38bdf8" />
            <span>Crop</span>
          </button>
        </div>
        <span className="ribbon-group-title">Page Layout</span>
      </div>
    </>
  );
}
