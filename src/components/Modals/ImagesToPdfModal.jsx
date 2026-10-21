import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Images, Plus, Trash2 } from 'lucide-react';
import { imagesToPdf } from '../../engine/convertEngine';

export default function ImagesToPdfModal() {
  const {
    activeModal,
    setActiveModal,
    loadPdfDocument,
    showBusy,
    hideBusy,
    addToast
  } = useDocument();

  const [images, setImages] = useState([]);
  const [layout, setLayout] = useState('a4'); // 'a4', 'fit'

  if (activeModal !== 'images-to-pdf') return null;

  const handleSelectImages = (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const isPng = f.type.includes('png');
        setImages(prev => [
          ...prev,
          {
            name: f.name,
            type: isPng ? 'png' : 'jpeg',
            bytes: new Uint8Array(ev.target.result)
          }
        ]);
      };
      reader.readAsArrayBuffer(f);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      addToast('Please select at least one image', 'warning');
      return;
    }

    try {
      showBusy('Converting images to PDF...');
      const pdfBytes = await imagesToPdf(images, layout);
      await loadPdfDocument('Converted_Images.pdf', pdfBytes, null);
      hideBusy();
      setActiveModal(null);
      addToast(`Created PDF from ${images.length} images`, 'success');
    } catch (err) {
      hideBusy();
      addToast('Conversion failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Images size={18} color="#a855f7" />
            <span>Images to PDF Converter</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
              <Plus size={14} /> Add Images
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleSelectImages}
                style={{ display: 'none' }}
              />
            </label>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {images.length} image(s) selected
            </span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 200,
            overflowY: 'auto',
            background: '#0f172a',
            padding: 8,
            borderRadius: 6,
            minHeight: 100
          }}>
            {images.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: 24, fontSize: 12 }}>
                Click "+ Add Images" to choose PNG or JPEG files
              </div>
            ) : (
              images.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#172033',
                    border: '1px solid #1e293b',
                    borderRadius: 4,
                    fontSize: 12
                  }}
                >
                  <span style={{ color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {idx + 1}. {img.name}
                  </span>
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#cbd5e1', fontSize: 12 }}>Page Layout</label>
            <div style={{ display: 'flex', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="imgLayout"
                  checked={layout === 'a4'}
                  onChange={() => setLayout('a4')}
                />
                Fit onto Standard A4 pages
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="imgLayout"
                  checked={layout === 'fit'}
                  onChange={() => setLayout('fit')}
                />
                Match original image dimensions
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConvert} disabled={images.length === 0}>
            Convert to PDF
          </button>
        </div>
      </div>
    </div>
  );
}
