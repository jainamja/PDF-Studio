/**
 * PDF Studio - Convert & Compression Engine
 * Handles Images to PDF, Lossless & Lossy Compression,
 * Text extraction, and True Redaction preparation.
 */

import { PDFDocument, PageSizes } from 'pdf-lib';

/**
 * Creates a new PDF document from an array of images.
 * @param {Array<{ bytes: Uint8Array, type: 'png' | 'jpeg' | 'jpg' }>} images
 * @param {'a4' | 'fit'} layout - 'a4' fits image on A4 page; 'fit' matches page size to image dimensions
 */
export async function imagesToPdf(images = [], layout = 'fit') {
  if (images.length === 0) throw new Error('No images provided');

  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    const isPng = img.type === 'png';
    const embedded = isPng
      ? await pdfDoc.embedPng(img.bytes)
      : await pdfDoc.embedJpg(img.bytes);

    const { width: imgW, height: imgH } = embedded.scale(1);

    if (layout === 'a4') {
      const [a4W, a4H] = PageSizes.A4;
      const page = pdfDoc.addPage([a4W, a4H]);
      // Fit with margins
      const margin = 20;
      const maxW = a4W - margin * 2;
      const maxH = a4H - margin * 2;
      const scale = Math.min(maxW / imgW, maxH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      page.drawImage(embedded, {
        x: (a4W - drawW) / 2,
        y: (a4H - drawH) / 2,
        width: drawW,
        height: drawH
      });
    } else {
      // Fit to image dimensions
      const page = pdfDoc.addPage([imgW, imgH]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: imgW,
        height: imgH
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Lossless compression: rewrites document structures and removes unreferenced objects.
 */
export async function compressLossless(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false
  });

  return await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false
  });
}

/**
 * Lossy compression or True Redaction replacement:
 * Replaces page contents with rasterized image bytes at target DPI and quality.
 *
 * @param {Uint8Array} pdfBytes - Original PDF bytes
 * @param {Array<{ pageIndex: number, imageBytes: Uint8Array, format: 'jpeg' | 'png', width: number, height: number }>} rasterizedPages
 */
export async function replacePagesWithRaster(pdfBytes, rasterizedPages = []) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  for (const item of rasterizedPages) {
    const { pageIndex, imageBytes, format = 'jpeg' } = item;
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;

    const originalPage = pdfDoc.getPage(pageIndex);
    const mediaBox = originalPage.getMediaBox();
    const width = mediaBox.width;
    const height = mediaBox.height;

    // Embed rasterized image
    const embedded = format === 'png'
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

    // Create fresh clean page with identical dimensions and replace original
    const newPage = pdfDoc.insertPage(pageIndex + 1, [width, height]);
    newPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width,
      height
    });

    // Remove the old vector/text page completely (destroys underlying text/streams!)
    pdfDoc.removePage(pageIndex);
  }

  return await pdfDoc.save();
}
