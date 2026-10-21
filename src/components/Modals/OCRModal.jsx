import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, ScanText, Info } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getPageGeometry, viewToPdfPoint } from '../../engine/geometry';
import { sanitizeForWinAnsi } from '../../engine/textSanitizer';

export default function OCRModal() {
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

  const [language, setLanguage] = useState('eng');
  const [pageRange, setPageRange] = useState('current'); // 'current', 'all'

  if (activeModal !== 'ocr' || !activeDoc) return null;

  const handleStartOCR = async () => {
    try {
      showBusy('Initializing OCR engine...', 0);
      setActiveModal(null);

      const targetPages = pageRange === 'current'
        ? [activeDoc.currentPage - 1]
        : Array.from({ length: activeDoc.pageCount }, (_, i) => i);

      const pdfDoc = await PDFDocument.load(activeDoc.bytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (let idx = 0; idx < targetPages.length; idx++) {
        const pIdx = targetPages[idx];
        const pageNum = pIdx + 1;

        updateBusyProgress(
          Math.round((idx / targetPages.length) * 100),
          `OCR: Processing page ${pageNum} (${idx + 1}/${targetPages.length})...`
        );

        // Render page to canvas at 2x scale
        const pdfPage = await activeDoc.pdfDoc.getPage(pageNum);
        const scale = 2.0;
        const vp = pdfPage.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');

        await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;

        // Run Tesseract
        const result = await Tesseract.recognize(canvas, language, {
          logger: (m) => {
            if (m.status === 'recognizing text' && m.progress) {
              const currentOverall = Math.round(((idx + m.progress) / targetPages.length) * 100);
              updateBusyProgress(currentOverall, `Recognizing page ${pageNum}: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        // Add invisible text layer onto the pdf-lib page
        const page = pdfDoc.getPage(pIdx);
        const geom = getPageGeometry(page);

        if (result.data && result.data.words) {
          for (const word of result.data.words) {
            if (!word.text || !word.bbox) continue;

            // Convert canvas pixel bbox (at 2x scale) back to view points (at 1x scale)
            const viewX = word.bbox.x0 / scale;
            const viewY = word.bbox.y0 / scale;
            const wordH = (word.bbox.y1 - word.bbox.y0) / scale;
            const fontSize = Math.max(6, Math.min(36, wordH * 0.8));

            const sanitized = sanitizeForWinAnsi(word.text, font);
            if (!sanitized) continue;

            const pdfPt = viewToPdfPoint(viewX, viewY + fontSize * 0.82, geom);

            // Draw text invisibly (opacity: 0) to create a real searchable text layer!
            page.drawText(sanitized, {
              x: pdfPt.x,
              y: pdfPt.y,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
              opacity: 0 // Invisible text layer!
            });
          }
        }
      }

      const ocrPdfBytes = await pdfDoc.save();
      await updateDocumentBytes(activeDoc.id, ocrPdfBytes, true);
      hideBusy();
      addToast('OCR complete: Searchable invisible text layer added', 'success', 5000);
    } catch (err) {
      hideBusy();
      addToast('OCR failed: ' + err.message, 'error');
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanText size={18} color="#f59e0b" />
            <span>Optical Character Recognition (OCR)</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#0f172a', padding: 12, borderRadius: 6 }}>
            <Info size={16} color="#38bdf8" style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
              OCR analyzes scanned pages and images, generating an invisible text layer directly underneath the image. This allows you to select, copy, and search text natively.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Recognition Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="eng">English (eng)</option>
              <option value="spa">Spanish (spa)</option>
              <option value="fra">French (fra)</option>
              <option value="deu">German (deu)</option>
              <option value="ita">Italian (ita)</option>
              <option value="por">Portuguese (por)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#cbd5e1', fontSize: 12 }}>Page Scope</label>
            <div style={{ display: 'flex', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="ocrScope"
                  checked={pageRange === 'current'}
                  onChange={() => setPageRange('current')}
                />
                Current Page ({activeDoc.currentPage})
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="ocrScope"
                  checked={pageRange === 'all'}
                  onChange={() => setPageRange('all')}
                />
                All Pages ({activeDoc.pageCount})
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStartOCR}>Run OCR</button>
        </div>
      </div>
    </div>
  );
}
