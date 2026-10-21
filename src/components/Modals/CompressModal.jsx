import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Minimize2, Check } from 'lucide-react';
import { compressLossless, replacePagesWithRaster } from '../../engine/convertEngine';

export default function CompressModal() {
  const {
    activeDoc,
    activeModal,
    setActiveModal,
    updateDocumentBytes,
    showBusy,
    updateBusyProgress,
    hideBusy,
    addToast
  } = useDocument();

  const [mode, setMode] = useState('lossless'); // 'lossless', 'lossy'
  const [dpi, setDpi] = useState(120);
  const [quality, setQuality] = useState(70);

  if (activeModal !== 'compress' || !activeDoc) return null;

  const handleCompress = async () => {
    try {
      showBusy('Compressing document...', 0);
      const originalSize = activeDoc.bytes.length;

      let compressedBytes;
      if (mode === 'lossless') {
        compressedBytes = await compressLossless(activeDoc.bytes);
      } else {
        // Lossy raster compression
        const scale = dpi / 72;
        const rasterPages = [];

        for (let i = 0; i < activeDoc.pageCount; i++) {
          updateBusyProgress(
            Math.round(((i + 1) / activeDoc.pageCount) * 100),
            `Compressing page ${i + 1} of ${activeDoc.pageCount}...`
          );

          const page = await activeDoc.pdfDoc.getPage(i + 1);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext('2d');

          await page.render({ canvasContext: ctx, viewport: vp }).promise;

          const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality / 100));
          const buf = await blob.arrayBuffer();

          rasterPages.push({
            pageIndex: i,
            imageBytes: new Uint8Array(buf),
            format: 'jpeg',
            width: vp.width,
            height: vp.height
          });
        }

        compressedBytes = await replacePagesWithRaster(activeDoc.bytes, rasterPages);
      }

      const newSize = compressedBytes.length;
      const savings = Math.round(((originalSize - newSize) / originalSize) * 100);

      await updateDocumentBytes(activeDoc.id, compressedBytes, true);
      hideBusy();
      setActiveModal(null);

      const formatSize = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
      addToast(
        `Compressed from ${formatSize(originalSize)} to ${formatSize(newSize)} (${savings >= 0 ? savings + '% smaller' : 're-encoded'})`,
        'success',
        6000
      );
    } catch (err) {
      hideBusy();
      addToast('Compression error: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Minimize2 size={18} color="#10b981" />
            <span>Compress PDF Document</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${mode === 'lossless' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px' }}
              onClick={() => setMode('lossless')}
            >
              Lossless Optimization
            </button>
            <button
              className={`btn ${mode === 'lossy' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px' }}
              onClick={() => setMode('lossy')}
            >
              Lossy Raster Compression
            </button>
          </div>

          {mode === 'lossless' ? (
            <div style={{ fontSize: 12, color: '#94a3b8', background: '#0f172a', padding: 12, borderRadius: 6, lineHeight: 1.5 }}>
              Removes duplicate resources, compresses object streams, and reorganizes document structure without any quality loss.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: '#cbd5e1' }}>Resolution: {dpi} DPI</span>
                  <span style={{ color: '#94a3b8' }}>{dpi < 100 ? 'Low' : dpi < 150 ? 'Standard' : 'High'}</span>
                </div>
                <input
                  type="range"
                  min="72"
                  max="200"
                  step="10"
                  value={dpi}
                  onChange={(e) => setDpi(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: '#cbd5e1' }}>JPEG Quality: {quality}%</span>
                  <span style={{ color: '#94a3b8' }}>{quality < 50 ? 'Smallest Size' : 'Balanced'}</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCompress}>Start Compression</button>
        </div>
      </div>
    </div>
  );
}
