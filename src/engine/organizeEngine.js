/**
 * PDF Studio - Organize Engine
 * Pure module for page manipulation: rotate, delete, duplicate, reorder,
 * insert blank, insert from PDF, merge, split, and crop margins.
 */

import { PDFDocument, degrees } from 'pdf-lib';
import { parsePageRange } from './pdfEngine.js';

/**
 * Rotates pages by deltaDegrees (+90, -90, 180).
 */
export async function rotatePages(pdfBytes, pageIndices = [], deltaDegrees = 90) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  const targets = pageIndices.length > 0
    ? pageIndices.filter(i => i >= 0 && i < pageCount)
    : Array.from({ length: pageCount }, (_, i) => i);

  for (const idx of targets) {
    const page = pdfDoc.getPage(idx);
    const currentAngle = page.getRotation ? page.getRotation().angle : 0;
    const newAngle = ((currentAngle + deltaDegrees) % 360 + 360) % 360;
    page.setRotation(degrees(newAngle));
  }

  return await pdfDoc.save();
}

/**
 * Deletes specified pages from the document.
 */
export async function deletePages(pdfBytes, pageIndices = []) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  if (pageIndices.length >= pageCount) {
    throw new Error('Cannot delete all pages in document');
  }

  // Sort descending to avoid index shifting
  const sorted = [...new Set(pageIndices)]
    .filter(i => i >= 0 && i < pageCount)
    .sort((a, b) => b - a);

  for (const idx of sorted) {
    pdfDoc.removePage(idx);
  }

  return await pdfDoc.save();
}

/**
 * Duplicates specified pages immediately after their originals.
 */
export async function duplicatePages(pdfBytes, pageIndices = []) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  const sorted = [...new Set(pageIndices)]
    .filter(i => i >= 0 && i < pageCount)
    .sort((a, b) => b - a);

  for (const idx of sorted) {
    const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [idx]);
    pdfDoc.insertPage(idx + 1, copiedPage);
  }

  return await pdfDoc.save();
}

/**
 * Reorders pages according to an array of page indices.
 * @param {Uint8Array} pdfBytes
 * @param {Array<number>} newOrder - Array representing the new sequence of original page indices
 */
export async function reorderPages(pdfBytes, newOrder = []) {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const destDoc = await PDFDocument.create();

  const pageCount = srcDoc.getPageCount();
  const validOrder = newOrder.filter(i => i >= 0 && i < pageCount);

  if (validOrder.length === 0) return pdfBytes;

  const copiedPages = await destDoc.copyPages(srcDoc, validOrder);
  for (const p of copiedPages) {
    destDoc.addPage(p);
  }

  return await destDoc.save();
}

/**
 * Inserts a blank page at target index.
 */
export async function insertBlankPage(pdfBytes, atIndex = 0, width = 595.28, height = 841.89) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const insertIdx = Math.max(0, Math.min(pageCount, atIndex));

  pdfDoc.insertPage(insertIdx, [width, height]);
  return await pdfDoc.save();
}

/**
 * Inserts pages from another PDF into target document.
 */
export async function insertPagesFromPdf(targetBytes, sourceBytes, atIndex = 0, sourcePageIndices = null) {
  const targetDoc = await PDFDocument.load(targetBytes, { ignoreEncryption: true });
  const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });

  const srcCount = sourceDoc.getPageCount();
  const srcIndices = sourcePageIndices && sourcePageIndices.length > 0
    ? sourcePageIndices.filter(i => i >= 0 && i < srcCount)
    : Array.from({ length: srcCount }, (_, i) => i);

  const copiedPages = await targetDoc.copyPages(sourceDoc, srcIndices);
  let currentInsertIdx = Math.max(0, Math.min(targetDoc.getPageCount(), atIndex));

  for (const page of copiedPages) {
    targetDoc.insertPage(currentInsertIdx, page);
    currentInsertIdx++;
  }

  return await targetDoc.save();
}

/**
 * Extracts specified pages into a new standalone PDF.
 */
export async function extractPages(pdfBytes, pageIndices = []) {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const destDoc = await PDFDocument.create();

  const srcCount = srcDoc.getPageCount();
  const validIndices = pageIndices.filter(i => i >= 0 && i < srcCount);
  if (validIndices.length === 0) throw new Error('No valid pages to extract');

  const copiedPages = await destDoc.copyPages(srcDoc, validIndices);
  for (const p of copiedPages) {
    destDoc.addPage(p);
  }

  return await destDoc.save();
}

/**
 * Merges multiple PDFs into a single document.
 * @param {Array<Uint8Array | ArrayBuffer>} pdfByteArrays
 */
export async function mergePdfs(pdfByteArrays = []) {
  if (pdfByteArrays.length === 0) throw new Error('No PDFs provided to merge');
  if (pdfByteArrays.length === 1) return pdfByteArrays[0];

  const mergedDoc = await PDFDocument.create();

  for (const bytes of pdfByteArrays) {
    try {
      const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageIndices = Array.from({ length: srcDoc.getPageCount() }, (_, i) => i);
      const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
      for (const p of copiedPages) {
        mergedDoc.addPage(p);
      }
    } catch (err) {
      console.warn('Skipping unreadable document during merge:', err.message);
    }
  }

  return await mergedDoc.save();
}

/**
 * Splits a PDF into multiple parts.
 * splitType: 'each' | 'every-n' | 'range'
 * @returns {Promise<Array<{ name: string, bytes: Uint8Array }>>}
 */
export async function splitPdf(pdfBytes, splitType = 'each', options = {}) {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();
  const results = [];
  const baseName = options.baseName || 'document';

  if (splitType === 'each') {
    for (let i = 0; i < pageCount; i++) {
      const destDoc = await PDFDocument.create();
      const [copied] = await destDoc.copyPages(srcDoc, [i]);
      destDoc.addPage(copied);
      results.push({
        name: `${baseName}_page_${i + 1}.pdf`,
        bytes: await destDoc.save()
      });
    }
  } else if (splitType === 'every-n') {
    const n = Math.max(1, options.everyN || 1);
    let partNum = 1;
    for (let i = 0; i < pageCount; i += n) {
      const chunkIndices = [];
      for (let j = i; j < Math.min(pageCount, i + n); j++) {
        chunkIndices.push(j);
      }
      const destDoc = await PDFDocument.create();
      const copied = await destDoc.copyPages(srcDoc, chunkIndices);
      for (const p of copied) destDoc.addPage(p);
      results.push({
        name: `${baseName}_part_${partNum}.pdf`,
        bytes: await destDoc.save()
      });
      partNum++;
    }
  } else if (splitType === 'range') {
    // Array of ranges or comma separated, e.g. ["1-2", "3-5"]
    const ranges = options.ranges || ['1-' + pageCount];
    let partNum = 1;
    for (const rangeStr of ranges) {
      const targetIndices = parsePageRange(rangeStr, pageCount);
      if (targetIndices.length > 0) {
        const destDoc = await PDFDocument.create();
        const copied = await destDoc.copyPages(srcDoc, targetIndices);
        for (const p of copied) destDoc.addPage(p);
        results.push({
          name: `${baseName}_range_${rangeStr.replace(/[^0-9-]/g, '_')}_p${partNum}.pdf`,
          bytes: await destDoc.save()
        });
        partNum++;
      }
    }
  }

  return results;
}

/**
 * Crops page margins (top, bottom, left, right in points) by adjusting CropBox.
 */
export async function cropPages(pdfBytes, pageIndices = [], margins = { top: 0, bottom: 0, left: 0, right: 0 }) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  const targets = pageIndices.length > 0
    ? pageIndices.filter(i => i >= 0 && i < pageCount)
    : Array.from({ length: pageCount }, (_, i) => i);

  for (const idx of targets) {
    const page = pdfDoc.getPage(idx);
    const mediaBox = page.getMediaBox();
    const currentCrop = page.getCropBox() || mediaBox;

    const newX = currentCrop.x + (margins.left || 0);
    const newY = currentCrop.y + (margins.bottom || 0);
    const newW = Math.max(10, currentCrop.width - (margins.left || 0) - (margins.right || 0));
    const newH = Math.max(10, currentCrop.height - (margins.top || 0) - (margins.bottom || 0));

    page.setCropBox(newX, newY, newW, newH);
  }

  return await pdfDoc.save();
}
