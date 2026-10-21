import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { ShieldAlert, X } from 'lucide-react';
import { replacePagesWithRaster } from '../../engine/convertEngine';
import { commitAnnotations } from '../../engine/pdfEngine';
import pdfjsLib, { getDocumentOptions } from '../../utils/pdfjsConfig';

export default function RedactionConfirmModal() {
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

  if (activeModal !== 'redact-confirm' || !activeDoc) return null;

  // Identify pages with rectangle / whiteout / highlight annotations marked for redaction
  const affectedPages = [...new Set(activeDoc.annotations.map(a => a.pageIndex))];

  const handleApplyTrueRedaction = async () => {
    if (affectedPages.length === 0) {
      addToast('No annotations or boxes found to redact. Use "Mark Redaction" first.', 'warning');
      setActiveModal(null);
      return;
    }

    try {
      showBusy('Burning redactions and rasterizing pages...', 0);
      setActiveModal(null);

      // First burn pending annotations onto the PDF
      const burnedPdfBytes = await commitAnnotations(activeDoc.bytes, activeDoc.annotations);

      // Now load the burned document and rasterize the affected pages to permanently destroy text streams
      const burnedDoc = await pdfjsLib.getDocument(getDocumentOptions(burnedPdfBytes)).promise;

      const rasterPages = [];
      const isMobile = typeof window !== 'undefined' && (
        window.innerWidth < 800 ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      );
      const rasterScale = isMobile ? 1.25 : 2.0;

      for (let idx = 0; idx < affectedPages.length; idx++) {
        const pIdx = affectedPages[idx];
        updateBusyProgress(
          Math.round(((idx + 1) / affectedPages.length) * 100),
          `Rasterizing page ${pIdx + 1} to permanently destroy text...`
        );

        const page = await burnedDoc.getPage(pIdx + 1);
        const vp = page.getViewport({ scale: rasterScale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const buf = await blob.arrayBuffer();

        // Release canvas memory immediately
        canvas.width = 0;
        canvas.height = 0;

        rasterPages.push({
          pageIndex: pIdx,
          imageBytes: new Uint8Array(buf),
          format: 'png',
          width: vp.width,
          height: vp.height
        });
      }

      // Replace pages in pdf-lib (underlying text and vectors are completely obliterated)
      const trulyRedactedBytes = await replacePagesWithRaster(burnedPdfBytes, rasterPages);

      await updateDocumentBytes(activeDoc.id, trulyRedactedBytes, true);
      hideBusy();
      addToast(`True redaction applied to ${affectedPages.length} page(s). Underlying text destroyed.`, 'success', 6000);
    } catch (err) {
      hideBusy();
      addToast('Redaction error: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color="#ef4444" />
            <span>Apply True Redaction</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
            Are you sure you want to permanently redact content on <strong>{affectedPages.length} page(s)</strong>?
          </p>

          <div style={{
            fontSize: 12,
            color: '#fca5a5',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: 12,
            borderRadius: 6,
            lineHeight: 1.5
          }}>
            <strong>True Redaction Guarantee:</strong> The affected pages will be burned and converted to flattened raster images. Underlying text, fonts, bookmarks, and vector layers are irreversibly destroyed so they cannot be recovered by text-extraction tools or copy-paste.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleApplyTrueRedaction}>
            Apply True Redaction
          </button>
        </div>
      </div>
    </div>
  );
}
