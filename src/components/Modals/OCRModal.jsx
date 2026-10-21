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

      const isMobile = typeof window !== 'undefined' && (
        window.innerWidth < 800 ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      );
      const scale = isMobile ? 1.25 : 2.0;

      for (let idx = 0; idx < targetPages.length; idx++) {
        const pIdx = targetPages[idx];
        const pageNum = pIdx + 1;

        updateBusyProgress(
          Math.round((idx / targetPages.length) * 100),
          `OCR: Processing page ${pageNum} (${idx + 1}/${targetPages.length})...`
        );

        // Render page to canvas at appropriate scale
        const pdfPage = await activeDoc.pdfDoc.getPage(pageNum);
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

        // Release canvas memory immediately
        canvas.width = 0;
        canvas.height = 0;

        // Add invisible text layer onto the pdf-lib page
        const page = pdfDoc.getPage(pIdx);
        const geom = getPageGeometry(page);

        if (result.data && result.data.words) {
          for (const word of result.data.words) {
            if (!word.text || !word.bbox) continue;

            // Convert canvas pixel bbox back to view points
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
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            color: 'var(--text-main)',
            lineHeight: 1.4
          }}>
            <Info size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              OCR detects text within scanned images and creates an invisible, searchable text layer directly on top of the original document.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Recognition Language
            </label>
            <select
              className="select-field"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="eng">English (eng)</option>
              <option value="spa">Spanish (spa)</option>
              <option value="fra">French (fra)</option>
              <option value="deu">German (deu)</option>
              <option value="ita">Italian (ita)</option>
              <option value="por">Portuguese (por)</option>
              <option value="rus">Russian (rus)</option>
              <option value="hin">Hindi (hin)</option>
              <option value="chi_sim">Chinese Simplified (chi_sim)</option>
              <option value="jpn">Japanese (jpn)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Page Range
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="ocrRange"
                  checked={pageRange === 'current'}
                  onChange={() => setPageRange('current')}
                />
                Current Page ({activeDoc.currentPage})
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="ocrRange"
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
          <button className="btn btn-primary" onClick={handleStartOCR}>
            Start OCR Recognition
          </button>
        </div>
      </div>
    </div>
  );
}
