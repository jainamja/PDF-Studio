import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  FileText,
  Type,
  Image as ImageIcon,
  Eraser,
  Stamp as WatermarkIcon,
  AlignLeft,
  Crop
} from 'lucide-react';

export default function RibbonTabEdit() {
  const {
    activeDoc,
    activeTool,
    setActiveTool,
    setActiveModal,
    addAnnotation
  } = useDocument();

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg, image/jpg';
    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          addAnnotation({
            type: 'image',
            dataUrl,
            format: file.type.includes('png') ? 'png' : 'jpeg',
            x: 60,
            y: 60,
            width: 200,
            height: 150
          });
          setActiveTool('select');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
            title="Add text/image watermark"
          >
            <WatermarkIcon size={18} color="#a78bfa" />
            <span>Watermark</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('header-footer')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Header, Footer & Page Numbers"
          >
            <AlignLeft size={18} color="#60a5fa" />
            <span>Header/Footer</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('crop')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Crop page margins"
          >
            <Crop size={18} color="#f472b6" />
            <span>Crop</span>
          </button>
        </div>
        <span className="ribbon-group-title">Page Layout</span>
      </div>
    </>
  );
}
