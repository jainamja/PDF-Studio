/**
 * PDF Studio - Core PDF Engine
 * Pure module with NO UI dependencies.
 * Handles annotation burning, watermarks, headers/footers, metadata, and page cropping.
 */

import { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFString, PDFArray, PDFDict, PDFNumber } from 'pdf-lib';
import { getPageGeometry, viewRectToPdfRect, getTextDrawCoordinates, getImageDrawCoordinates, viewToPdfPoint } from './geometry.js';
import { sanitizeForWinAnsi } from './textSanitizer.js';
import { parseColor } from '../utils/colorUtils.js';

/**
 * Maps font family name, bold, italic to StandardFonts
 */
export function getStandardFont(fontFamily = 'Helvetica', isBold = false, isItalic = false) {
  const family = (fontFamily || '').toLowerCase();
  if (family.includes('times') || family.includes('serif')) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (family.includes('courier') || family.includes('mono')) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
    if (isBold) return StandardFonts.CourierBold;
    if (isItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  // Default: Helvetica / Sans-serif
  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
  if (isBold) return StandardFonts.HelveticaBold;
  if (isItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

/**
 * Commits pending annotations into the PDF document using pdf-lib.
 * Handles rotations 0/90/180/270 for all items.
 *
 * @param {Uint8Array | ArrayBuffer} pdfBytes
 * @param {Array<Object>} annotations - Array of annotation objects
 * @returns {Promise<Uint8Array>} Updated PDF bytes
 */
export async function commitAnnotations(pdfBytes, annotations = []) {
  if (!annotations || annotations.length === 0) {
    return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  }

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  // Cache embedded fonts
  const fontCache = new Map();
  async function loadFont(standardFontName) {
    if (!fontCache.has(standardFontName)) {
      const f = await pdfDoc.embedFont(standardFontName);
      fontCache.set(standardFontName, f);
    }
    return fontCache.get(standardFontName);
  }

  // Group annotations by pageIndex
  const pageAnnotsMap = new Map();
  for (const ann of annotations) {
    const pIndex = ann.pageIndex !== undefined ? ann.pageIndex : 0;
    if (pIndex >= 0 && pIndex < pageCount) {
      if (!pageAnnotsMap.has(pIndex)) pageAnnotsMap.set(pIndex, []);
      pageAnnotsMap.get(pIndex).push(ann);
    }
  }

  for (const [pageIndex, annots] of pageAnnotsMap.entries()) {
    const page = pdfDoc.getPage(pageIndex);
    const geom = getPageGeometry(page);

    for (const ann of annots) {
      try {
        switch (ann.type) {
          case 'whiteout':
          case 'edit-text-cover': {
            const pdfRect = viewRectToPdfRect(ann, geom);
            const fillCol = parseColor(ann.color || '#ffffff');
            page.drawRectangle({
              x: pdfRect.x,
              y: pdfRect.y,
              width: pdfRect.width,
              height: pdfRect.height,
              color: rgb(fillCol.r, fillCol.g, fillCol.b),
              opacity: fillCol.a !== undefined ? fillCol.a : 1
            });
            break;
          }

          case 'edit-text': {
            // First whiteout original underlying area
            const pdfRect = viewRectToPdfRect(ann, geom);
            const bgCol = parseColor(ann.backgroundColor || '#ffffff');
            page.drawRectangle({
              x: pdfRect.x,
              y: pdfRect.y,
              width: pdfRect.width,
              height: pdfRect.height,
              color: rgb(bgCol.r, bgCol.g, bgCol.b),
              opacity: 1
            });

            // Draw new replacement text
            const standardFont = getStandardFont(ann.fontFamily, ann.isBold, ann.isItalic);
            const font = await loadFont(standardFont);
            const fontSize = ann.fontSize || 12;
            const textCoords = getTextDrawCoordinates({ ...ann, fontSize }, geom);
            const textCol = parseColor(ann.color || '#000000');
            const sanitized = sanitizeForWinAnsi(ann.text || '', font);

            page.drawText(sanitized, {
              x: textCoords.x,
              y: textCoords.y,
              size: fontSize,
              font,
              color: rgb(textCol.r, textCol.g, textCol.b),
              rotate: degrees(textCoords.rotateAngle)
            });
            break;
          }

          case 'text': {
            const standardFont = getStandardFont(ann.fontFamily, ann.isBold, ann.isItalic);
            const font = await loadFont(standardFont);
            const fontSize = ann.fontSize || 12;
            const textCol = parseColor(ann.color || '#000000');
            const sanitized = sanitizeForWinAnsi(ann.text || '', font);

            // Optional background fill
            if (ann.backgroundColor && ann.backgroundColor !== 'transparent') {
              const pdfRect = viewRectToPdfRect(ann, geom);
              const bgCol = parseColor(ann.backgroundColor);
              page.drawRectangle({
                x: pdfRect.x,
                y: pdfRect.y,
                width: pdfRect.width,
                height: pdfRect.height,
                color: rgb(bgCol.r, bgCol.g, bgCol.b),
                opacity: bgCol.a
              });
            }

            const textCoords = getTextDrawCoordinates({ ...ann, fontSize }, geom);
            page.drawText(sanitized, {
              x: textCoords.x,
              y: textCoords.y,
              size: fontSize,
              font,
              color: rgb(textCol.r, textCol.g, textCol.b),
              rotate: degrees(textCoords.rotateAngle)
            });
            break;
          }

          case 'highlight': {
            const pdfRect = viewRectToPdfRect(ann, geom);
            const col = parseColor(ann.color || '#fef08a'); // soft yellow
            page.drawRectangle({
              x: pdfRect.x,
              y: pdfRect.y,
              width: pdfRect.width,
              height: pdfRect.height,
              color: rgb(col.r, col.g, col.b),
              opacity: ann.opacity !== undefined ? ann.opacity : 0.4
            });
            break;
          }

          case 'underline':
          case 'strikethrough': {
            const pdfRect = viewRectToPdfRect(ann, geom);
            const col = parseColor(ann.color || '#ef4444');
            const thickness = ann.thickness || 1.5;
            page.drawRectangle({
              x: pdfRect.x,
              y: pdfRect.y,
              width: pdfRect.width,
              height: Math.max(1, thickness),
              color: rgb(col.r, col.g, col.b),
              opacity: ann.opacity !== undefined ? ann.opacity : 0.9
            });
            break;
          }

          case 'rectangle': {
            const pdfRect = viewRectToPdfRect(ann, geom);
            const strokeCol = parseColor(ann.strokeColor || '#ef4444');
            const fillCol = ann.fillColor && ann.fillColor !== 'transparent' ? parseColor(ann.fillColor) : null;

            page.drawRectangle({
              x: pdfRect.x,
              y: pdfRect.y,
              width: pdfRect.width,
              height: pdfRect.height,
              borderColor: rgb(strokeCol.r, strokeCol.g, strokeCol.b),
              borderWidth: ann.strokeWidth || 2,
              borderOpacity: ann.opacity !== undefined ? ann.opacity : 1,
              color: fillCol ? rgb(fillCol.r, fillCol.g, fillCol.b) : undefined,
              opacity: fillCol ? (fillCol.a !== undefined ? fillCol.a : 1) : 0
            });
            break;
          }

          case 'ellipse': {
            const pdfRect = viewRectToPdfRect(ann, geom);
            const strokeCol = parseColor(ann.strokeColor || '#ef4444');
            const fillCol = ann.fillColor && ann.fillColor !== 'transparent' ? parseColor(ann.fillColor) : null;

            page.drawEllipse({
              x: pdfRect.x + pdfRect.width / 2,
              y: pdfRect.y + pdfRect.height / 2,
              xScale: pdfRect.width / 2,
              yScale: pdfRect.height / 2,
              borderColor: rgb(strokeCol.r, strokeCol.g, strokeCol.b),
              borderWidth: ann.strokeWidth || 2,
              borderOpacity: ann.opacity !== undefined ? ann.opacity : 1,
              color: fillCol ? rgb(fillCol.r, fillCol.g, fillCol.b) : undefined,
              opacity: fillCol ? (fillCol.a !== undefined ? fillCol.a : 1) : 0
            });
            break;
          }

          case 'line':
          case 'arrow': {
            const startPt = viewToPdfPoint(ann.x1, ann.y1, geom);
            const endPt = viewToPdfPoint(ann.x2, ann.y2, geom);
            const strokeCol = parseColor(ann.strokeColor || '#ef4444');
            const strokeWidth = ann.strokeWidth || 2;

            page.drawLine({
              start: { x: startPt.x, y: startPt.y },
              end: { x: endPt.x, y: endPt.y },
              thickness: strokeWidth,
              color: rgb(strokeCol.r, strokeCol.g, strokeCol.b),
              opacity: ann.opacity !== undefined ? ann.opacity : 1
            });

            // If arrow, draw arrowhead lines
            if (ann.type === 'arrow') {
              const dx = endPt.x - startPt.x;
              const dy = endPt.y - startPt.y;
              const angle = Math.atan2(dy, dx);
              const headLen = strokeWidth * 5 + 4;
              const a1 = angle + Math.PI * 0.82;
              const a2 = angle - Math.PI * 0.82;

              page.drawLine({
                start: { x: endPt.x, y: endPt.y },
                end: { x: endPt.x + Math.cos(a1) * headLen, y: endPt.y + Math.sin(a1) * headLen },
                thickness: strokeWidth,
                color: rgb(strokeCol.r, strokeCol.g, strokeCol.b),
                opacity: ann.opacity !== undefined ? ann.opacity : 1
              });
              page.drawLine({
                start: { x: endPt.x, y: endPt.y },
                end: { x: endPt.x + Math.cos(a2) * headLen, y: endPt.y + Math.sin(a2) * headLen },
                thickness: strokeWidth,
                color: rgb(strokeCol.r, strokeCol.g, strokeCol.b),
                opacity: ann.opacity !== undefined ? ann.opacity : 1
              });
            }
            break;
          }

          case 'ink': {
            if (!ann.points || ann.points.length < 2) break;
            const strokeCol = parseColor(ann.strokeColor || '#2563eb');
            const strokeWidth = ann.strokeWidth || 2;

            for (let i = 0; i < ann.points.length - 1; i++) {
              const p1 = viewToPdfPoint(ann.points[i].x, ann.points[i].y, geom);
              const p2 = viewToPdfPoint(ann.points[i + 1].x, ann.points[i + 1].y, geom);
              page.drawLine({
                start: { x: p1.x, y: p1.y },
                end: { x: p2.x, y: p2.y },
                thickness: strokeWidth,
                color: rgb(strokeCol.r, strokeCol.g, strokeCol.b),
                opacity: ann.opacity !== undefined ? ann.opacity : 1
              });
            }
            break;
          }

          case 'stamp': {
            // Preset Stamps: APPROVED, DRAFT, CONFIDENTIAL, VOID, FINAL, EXPIRED
            const stampText = sanitizeForWinAnsi(ann.stampType || 'APPROVED');
            const font = await loadFont(StandardFonts.HelveticaBold);
            const pdfRect = viewRectToPdfRect(ann, geom);
            const stampCol = parseColor(ann.color || (stampText === 'APPROVED' ? '#16a34a' : '#dc2626'));

            // Stamp border
            page.drawRectangle({
              x: pdfRect.x,
              y: pdfRect.y,
              width: pdfRect.width,
              height: pdfRect.height,
              borderColor: rgb(stampCol.r, stampCol.g, stampCol.b),
              borderWidth: 2.5,
              color: rgb(stampCol.r, stampCol.g, stampCol.b),
              opacity: 0.12
            });

            // Centered stamp text
            const fontSize = Math.min(pdfRect.height * 0.55, (pdfRect.width / (stampText.length || 1)) * 1.5);
            const textWidth = font.widthOfTextAtSize(stampText, fontSize);
            const textCoords = getTextDrawCoordinates({
              x: ann.x + (ann.width - textWidth) / 2,
              y: ann.y + (ann.height - fontSize) / 2,
              fontSize
            }, geom);

            page.drawText(stampText, {
              x: textCoords.x,
              y: textCoords.y,
              size: fontSize,
              font,
              color: rgb(stampCol.r, stampCol.g, stampCol.b),
              rotate: degrees(textCoords.rotateAngle)
            });
            break;
          }

          case 'sticky': {
            // Creates real PDF /Text annotation with /Contents
            const pdfPt = viewToPdfPoint(ann.x, ann.y, geom);
            const context = pdfDoc.context;
            const contents = sanitizeForWinAnsi(ann.text || '');

            // PDF /Text Annotation dictionary
            const annotDict = context.obj({
              Type: PDFName.of('Annot'),
              Subtype: PDFName.of('Text'),
              Rect: [pdfPt.x, pdfPt.y - 20, pdfPt.x + 20, pdfPt.y],
              Contents: PDFString.of(contents),
              Name: PDFName.of('Comment'),
              C: [1, 0.85, 0], // Yellow marker
              T: PDFString.of(sanitizeForWinAnsi(ann.author || 'User')),
              F: 4 // Print flag
            });

            const annotRef = context.register(annotDict);
            let annotsArray = page.node.get(PDFName.of('Annots'));
            if (!annotsArray) {
              annotsArray = context.obj([]);
              page.node.set(PDFName.of('Annots'), annotsArray);
            }
            if (annotsArray instanceof PDFArray) {
              annotsArray.push(annotRef);
            }
            break;
          }

          case 'image':
          case 'signature': {
            if (!ann.dataUrl && !ann.imageBytes) break;
            let image;
            const isPng = ann.format === 'png' || (ann.dataUrl && ann.dataUrl.includes('image/png'));
            const imgData = ann.imageBytes || base64ToUint8Array(ann.dataUrl);

            if (isPng) {
              image = await pdfDoc.embedPng(imgData);
            } else {
              image = await pdfDoc.embedJpg(imgData);
            }

            const imgCoords = getImageDrawCoordinates(ann, geom);
            page.drawImage(image, {
              x: imgCoords.x,
              y: imgCoords.y,
              width: imgCoords.width,
              height: imgCoords.height,
              rotate: degrees(imgCoords.rotateAngle),
              opacity: ann.opacity !== undefined ? ann.opacity : 1
            });
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Error committing annotation:', ann, err);
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Applies a watermark (text or image) to the document.
 */
export async function applyWatermark(pdfBytes, options = {}) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const {
    text = 'CONFIDENTIAL',
    opacity = 0.25,
    rotation = 45,
    fontSize = 54,
    color = '#64748b',
    pageRange = 'all', // 'all', 'even', 'odd', or '1,3,5'
    isTiled = false
  } = options;

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textCol = parseColor(color);
  const sanitized = sanitizeForWinAnsi(text, font);
  const targetPages = parsePageRange(pageRange, pageCount);

  for (const pageIdx of targetPages) {
    const page = pdfDoc.getPage(pageIdx);
    const geom = getPageGeometry(page);
    const textWidth = font.widthOfTextAtSize(sanitized, fontSize);

    if (isTiled) {
      // Tile multiple watermarks across the page
      const stepX = Math.max(150, textWidth + 80);
      const stepY = 160;
      for (let vx = 40; vx < geom.viewWidth; vx += stepX) {
        for (let vy = 60; vy < geom.viewHeight; vy += stepY) {
          const coords = getTextDrawCoordinates({ x: vx, y: vy, fontSize }, geom);
          page.drawText(sanitized, {
            x: coords.x,
            y: coords.y,
            size: fontSize * 0.65,
            font,
            color: rgb(textCol.r, textCol.g, textCol.b),
            opacity,
            rotate: degrees(coords.rotateAngle + rotation)
          });
        }
      }
    } else {
      // Center single watermark
      const vx = (geom.viewWidth - textWidth) / 2;
      const vy = geom.viewHeight / 2;
      const coords = getTextDrawCoordinates({ x: vx, y: vy, fontSize }, geom);
      page.drawText(sanitized, {
        x: coords.x,
        y: coords.y,
        size: fontSize,
        font,
        color: rgb(textCol.r, textCol.g, textCol.b),
        opacity,
        rotate: degrees(coords.rotateAngle + rotation)
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Applies header and footer text with tokens {n}, {total}, {date}, {name}
 */
export async function applyHeaderFooter(pdfBytes, options = {}) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const {
    topLeft = '',
    topCenter = '',
    topRight = '',
    bottomLeft = '',
    bottomCenter = '',
    bottomRight = '',
    fontFamily = 'Helvetica',
    fontSize = 10,
    color = '#475569',
    docName = 'Document',
    pageRange = 'all'
  } = options;

  const font = await pdfDoc.embedFont(getStandardFont(fontFamily));
  const col = parseColor(color);
  const targetPages = parsePageRange(pageRange, pageCount);
  const dateStr = new Date().toLocaleDateString();

  function formatTokens(template, pageNum) {
    if (!template) return '';
    return template
      .replace(/\{n\}/gi, String(pageNum))
      .replace(/\{total\}/gi, String(pageCount))
      .replace(/\{date\}/gi, dateStr)
      .replace(/\{name\}/gi, docName);
  }

  for (const pageIdx of targetPages) {
    const pageNum = pageIdx + 1;
    const page = pdfDoc.getPage(pageIdx);
    const geom = getPageGeometry(page);
    const margin = 24;

    const items = [
      { text: formatTokens(topLeft, pageNum), x: margin, y: margin, align: 'left' },
      { text: formatTokens(topCenter, pageNum), x: geom.viewWidth / 2, y: margin, align: 'center' },
      { text: formatTokens(topRight, pageNum), x: geom.viewWidth - margin, y: margin, align: 'right' },
      { text: formatTokens(bottomLeft, pageNum), x: margin, y: geom.viewHeight - margin, align: 'left' },
      { text: formatTokens(bottomCenter, pageNum), x: geom.viewWidth / 2, y: geom.viewHeight - margin, align: 'center' },
      { text: formatTokens(bottomRight, pageNum), x: geom.viewWidth - margin, y: geom.viewHeight - margin, align: 'right' }
    ];

    for (const item of items) {
      if (!item.text) continue;
      const sanitized = sanitizeForWinAnsi(item.text, font);
      const w = font.widthOfTextAtSize(sanitized, fontSize);
      let posX = item.x;
      if (item.align === 'center') posX -= w / 2;
      if (item.align === 'right') posX -= w;

      const coords = getTextDrawCoordinates({ x: posX, y: item.y, fontSize }, geom);
      page.drawText(sanitized, {
        x: coords.x,
        y: coords.y,
        size: fontSize,
        font,
        color: rgb(col.r, col.g, col.b),
        rotate: degrees(coords.rotateAngle)
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Updates document metadata
 */
export async function updateMetadata(pdfBytes, meta = {}) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  if (meta.title !== undefined) pdfDoc.setTitle(sanitizeForWinAnsi(meta.title));
  if (meta.author !== undefined) pdfDoc.setAuthor(sanitizeForWinAnsi(meta.author));
  if (meta.subject !== undefined) pdfDoc.setSubject(sanitizeForWinAnsi(meta.subject));
  if (meta.keywords !== undefined) {
    const kw = Array.isArray(meta.keywords)
      ? meta.keywords.map(k => sanitizeForWinAnsi(k))
      : meta.keywords.split(',').map(s => sanitizeForWinAnsi(s.trim()));
    pdfDoc.setKeywords(kw);
  }
  if (meta.creator !== undefined) pdfDoc.setCreator(sanitizeForWinAnsi(meta.creator));
  if (meta.producer !== undefined) pdfDoc.setProducer(sanitizeForWinAnsi(meta.producer));

  pdfDoc.setModificationDate(new Date());

  return await pdfDoc.save();
}

/**
 * Helper to parse base64 / dataUrl to Uint8Array
 */
function base64ToUint8Array(dataUrlOrBase64) {
  let base64 = dataUrlOrBase64;
  if (base64.includes(',')) {
    base64 = base64.split(',')[1];
  }
  if (typeof atob === 'function') {
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  }
  return Buffer.from(base64, 'base64');
}

/**
 * Helper to parse page range strings e.g. 'all', '1-3, 5, 8'
 */
export function parsePageRange(rangeStr, totalPages) {
  if (!rangeStr || rangeStr.toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  if (rangeStr.toLowerCase() === 'even') {
    return Array.from({ length: totalPages }, (_, i) => i).filter(i => (i + 1) % 2 === 0);
  }
  if (rangeStr.toLowerCase() === 'odd') {
    return Array.from({ length: totalPages }, (_, i) => i).filter(i => (i + 1) % 2 !== 0);
  }

  const indices = new Set();
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = start; p <= end; p++) indices.add(p - 1);
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}
