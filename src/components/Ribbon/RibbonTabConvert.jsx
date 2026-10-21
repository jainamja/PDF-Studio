import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  FileImage,
  FileText,
  Images
} from 'lucide-react';
import { exportTextFile, exportImagesZip, selectFolder, writeFilesToFolder } from '../../utils/fileUtils';

export default function RibbonTabConvert() {
  const {
    activeDoc,
    setActiveModal,
    showBusy,
    updateBusyProgress,
    hideBusy,
    addToast
  } = useDocument();

  // Export Pages as Images (PNG or JPG)
  const handleExportImages = async (format = 'png') => {
    if (!activeDoc || !activeDoc.pdfDoc) return;
    try {
      showBusy(`Exporting pages as ${format.toUpperCase()}...`, 0);
      const exported = [];

      for (let i = 0; i < activeDoc.pageCount; i++) {
        updateBusyProgress(Math.round(((i + 1) / activeDoc.pageCount) * 100), `Rendering page ${i + 1} of ${activeDoc.pageCount}...`);
        const page = await activeDoc.pdfDoc.getPage(i + 1);
        const vp = page.getViewport({ scale: 2.0 }); // High quality 2x scale
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        const blob = await new Promise(r => canvas.toBlob(r, mime, 0.92));
        const buf = await blob.arrayBuffer();

        exported.push({
          name: `${activeDoc.name.replace('.pdf', '')}_page_${i + 1}.${format}`,
          bytes: new Uint8Array(buf)
        });
      }

      // Check if Electron select folder is available
      const folderPath = await selectFolder();
      if (folderPath) {
        await writeFilesToFolder(folderPath, exported);
        addToast(`Exported ${exported.length} pages to folder`, 'success');
      } else {
        await exportImagesZip(exported, `${activeDoc.name.replace('.pdf', '')}_images.zip`);
        addToast(`Exported ${exported.length} pages as ZIP`, 'success');
      }

      hideBusy();
    } catch (err) {
      hideBusy();
      addToast('Image export failed: ' + err.message, 'error');
    }
  };

  // Export text as .txt
  const handleExportText = async () => {
    if (!activeDoc || !activeDoc.pdfDoc) return;
    try {
      showBusy('Extracting text...', 0);
      let fullText = '';

      for (let i = 0; i < activeDoc.pageCount; i++) {
        updateBusyProgress(Math.round(((i + 1) / activeDoc.pageCount) * 100));
        const page = await activeDoc.pdfDoc.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(it => it.str).join(' ');
        fullText += `--- Page ${i + 1} ---\n` + pageText + '\n\n';
      }

      exportTextFile(fullText, `${activeDoc.name.replace('.pdf', '')}_text.txt`);
      hideBusy();
      addToast('Text exported successfully', 'success');
    } catch (err) {
      hideBusy();
      addToast('Text export failed: ' + err.message, 'error');
    }
  };

  return (
    <>
      {/* Export Pages */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={() => handleExportImages('png')}
            disabled={!activeDoc}
            title="Export all pages as high-resolution PNG images"
          >
            <FileImage size={18} color="#38bdf8" />
            <span>Pages to PNG</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => handleExportImages('jpg')}
            disabled={!activeDoc}
            title="Export all pages as JPG images"
          >
            <FileImage size={18} color="#f59e0b" />
            <span>Pages to JPG</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={handleExportText}
            disabled={!activeDoc}
            title="Extract and export document text as .txt file"
          >
            <FileText size={18} color="#34d399" />
            <span>Export Text</span>
          </button>
        </div>
        <span className="ribbon-group-title">Export</span>
      </div>

      {/* Convert to PDF */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('images-to-pdf')}
            title="Convert images to a PDF document"
          >
            <Images size={18} color="#a855f7" />
            <span>Images to PDF</span>
          </button>
        </div>
        <span className="ribbon-group-title">Create</span>
      </div>
    </>
  );
}
