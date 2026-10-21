import React, { useState, useRef, useEffect } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Camera, Image as ImageIcon, Plus, Trash2, Sliders, Check, Scan, ArrowLeft, ArrowRight } from 'lucide-react';
import ioAdapter from '../../lib/io';
import { imagesToPdf } from '../../engine/convertEngine';

export default function ScanModal() {
  const {
    activeModal,
    setActiveModal,
    loadPdfDocument,
    showBusy,
    updateBusyProgress,
    hideBusy,
    addToast
  } = useDocument();

  // Scanned pages: array of { id, originalDataUrl, processedDataUrl, filter: 'original'|'grayscale'|'bw', crop: { top, bottom, left, right } }
  const [scannedPages, setScannedPages] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [shouldRunOcr, setShouldRunOcr] = useState(false);

  if (activeModal !== 'scan-to-pdf') return null;

  const activePage = scannedPages[activePageIndex] || null;

  const handleCaptureCamera = async () => {
    try {
      const dataUrl = await ioAdapter.scanCamera();
      if (dataUrl) {
        addPage(dataUrl);
      }
    } catch (err) {
      addToast('Camera error: ' + err.message, 'error');
    }
  };

  const handleImportGallery = async () => {
    try {
      const imgs = await ioAdapter.openImages();
      for (const img of imgs) {
        addPage(img.dataUrl);
      }
    } catch (err) {
      addToast('Import error: ' + err.message, 'error');
    }
  };

  const addPage = (dataUrl) => {
    const newPage = {
      id: `scan_${Date.now()}_${Math.random()}`,
      originalDataUrl: dataUrl,
      processedDataUrl: dataUrl,
      filter: 'original',
      crop: { top: 0, bottom: 0, left: 0, right: 0 }
    };
    setScannedPages(prev => [...prev, newPage]);
    setActivePageIndex(scannedPages.length);
  };

  // Apply filters and crop onto canvas
  const applyFilterToPage = (filterType) => {
    if (!activePage) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      if (filterType !== 'original') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (filterType === 'grayscale') {
            d[i] = lum;
            d[i + 1] = lum;
            d[i + 2] = lum;
          } else if (filterType === 'bw') {
            // High-contrast clean thresholding for document text
            const v = lum > 135 ? 255 : 0;
            d[i] = v;
            d[i + 1] = v;
            d[i + 2] = v;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setScannedPages(prev => prev.map((p, idx) => {
        if (idx !== activePageIndex) return p;
        return { ...p, filter: filterType, processedDataUrl };
      }));
    };
    img.src = activePage.originalDataUrl;
  };

  const removePage = (index) => {
    setScannedPages(prev => prev.filter((_, i) => i !== index));
    if (activePageIndex >= index && activePageIndex > 0) {
      setActivePageIndex(activePageIndex - 1);
    }
  };

  const handleFinishScan = async () => {
    if (scannedPages.length === 0) {
      addToast('Please scan at least one page', 'warning');
      return;
    }

    try {
      showBusy('Compiling scanned pages into PDF...');

      const images = [];
      for (const p of scannedPages) {
        const clean = p.processedDataUrl.split(',')[1];
        const binStr = atob(clean);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        images.push({
          bytes,
          type: 'jpeg'
        });
      }

      const pdfBytes = await imagesToPdf(images, 'a4');
      const newDoc = await loadPdfDocument(`Scanned_Doc_${Date.now().toString().slice(-4)}.pdf`, pdfBytes, null);
      hideBusy();
      setActiveModal(null);
      setScannedPages([]);
      addToast(`Scanned ${images.length} page(s) to PDF`, 'success');

      if (shouldRunOcr && newDoc) {
        // Automatically open OCR modal
        setActiveModal('ocr');
      }
    } catch (err) {
      hideBusy();
      addToast('Scan to PDF error: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, maxHeight: '90vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scan size={18} color="#10b981" />
            <span>Scan to PDF</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Action buttons to add scans */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: 10 }} onClick={handleCaptureCamera}>
              <Camera size={16} /> Take Photo
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, padding: 10 }} onClick={handleImportGallery}>
              <ImageIcon size={16} /> From Gallery
            </button>
          </div>

          {/* Current Page Preview & Filters */}
          {activePage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <div style={{
                position: 'relative',
                maxHeight: 280,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000',
                borderRadius: 6,
                overflow: 'hidden'
              }}>
                <img
                  src={activePage.processedDataUrl}
                  alt={`Scan page ${activePageIndex + 1}`}
                  style={{ maxHeight: 280, maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Filter selector */}
              <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
                <button
                  className={`btn ${activePage.filter === 'original' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => applyFilterToPage('original')}
                >
                  Original
                </button>
                <button
                  className={`btn ${activePage.filter === 'grayscale' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => applyFilterToPage('grayscale')}
                >
                  Grayscale
                </button>
                <button
                  className={`btn ${activePage.filter === 'bw' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => applyFilterToPage('bw')}
                >
                  Black & White
                </button>
              </div>

              {/* Scanned pages list carousel */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', width: '100%', padding: '6px 0' }}>
                {scannedPages.map((page, idx) => (
                  <div
                    key={page.id}
                    onClick={() => setActivePageIndex(idx)}
                    style={{
                      position: 'relative',
                      border: idx === activePageIndex ? '2px solid #6366f1' : '1px solid #334155',
                      borderRadius: 4,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <img src={page.processedDataUrl} alt="thumb" style={{ width: 44, height: 56, objectFit: 'cover' }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); removePage(idx); }}
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        background: '#f43f5e',
                        border: 'none',
                        borderRadius: '50%',
                        width: 16,
                        height: 16,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              border: '2px dashed #334155',
              borderRadius: 8,
              padding: 32,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 12
            }}>
              Tap "Take Photo" with your camera or "From Gallery" to begin scanning pages into a multi-page PDF.
            </div>
          )}

          {/* OCR Checkbox */}
          {scannedPages.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={shouldRunOcr}
                onChange={(e) => setShouldRunOcr(e.target.checked)}
                style={{ accentColor: '#10b981' }}
              />
              Automatically run OCR to make scanned text searchable & copyable
            </label>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleFinishScan}
            disabled={scannedPages.length === 0}
          >
            Create PDF ({scannedPages.length} pages)
          </button>
        </div>
      </div>
    </div>
  );
}
