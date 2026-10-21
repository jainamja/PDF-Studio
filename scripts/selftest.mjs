/**
 * PDF Studio - Engine Self-Test Script
 * Verifies geometry transforms (all 4 rotations), annotation burning,
 * WinAnsi character sanitization, form engine, and organize engine.
 */

import assert from 'assert';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import {
  getPageGeometry,
  viewToPdfPoint,
  pdfToViewPoint,
  viewRectToPdfRect,
  pdfRectToViewRect,
  getTextDrawCoordinates,
  getImageDrawCoordinates,
  normalizeRotation
} from '../src/engine/geometry.js';
import { sanitizeForWinAnsi } from '../src/engine/textSanitizer.js';
import {
  commitAnnotations,
  applyWatermark,
  applyHeaderFooter,
  updateMetadata
} from '../src/engine/pdfEngine.js';
import {
  extractFormFields,
  applyFormValues,
  flattenForm,
  createFormField
} from '../src/engine/formEngine.js';
import {
  rotatePages,
  deletePages,
  duplicatePages,
  reorderPages,
  insertBlankPage,
  mergePdfs,
  splitPdf,
  cropPages
} from '../src/engine/organizeEngine.js';
import { compressLossless, replacePagesWithRaster } from '../src/engine/convertEngine.js';

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('========================================');
console.log('   PDF STUDIO - ENGINE SELF-TEST');
console.log('========================================\n');

// 1. Geometry & Coordinate System Tests
console.log('[1/6] Geometry & Coordinate Transforms (0°, 90°, 180°, 270°)');

const mockBoxes = [
  { rot: 0, w: 200, h: 300, viewW: 200, viewH: 300 },
  { rot: 90, w: 200, h: 300, viewW: 300, viewH: 200 },
  { rot: 180, w: 200, h: 300, viewW: 200, viewH: 300 },
  { rot: 270, w: 200, h: 300, viewW: 300, viewH: 200 }
];

for (const mb of mockBoxes) {
  const geom = {
    x: 0,
    y: 0,
    width: mb.w,
    height: mb.h,
    rotation: mb.rot,
    viewWidth: mb.viewW,
    viewHeight: mb.viewH
  };

  test(`Rotation ${mb.rot}°: View <-> PDF roundtrip identity`, () => {
    const pointsToTest = [
      { vx: 0, vy: 0 },
      { vx: 10, vy: 25 },
      { vx: mb.viewW / 2, vy: mb.viewH / 2 },
      { vx: mb.viewW, vy: mb.viewH }
    ];

    for (const pt of pointsToTest) {
      const pdfPt = viewToPdfPoint(pt.vx, pt.vy, geom);
      const backViewPt = pdfToViewPoint(pdfPt.x, pdfPt.y, geom);
      assert.strictEqual(Math.round(backViewPt.x), Math.round(pt.vx));
      assert.strictEqual(Math.round(backViewPt.y), Math.round(pt.vy));
    }
  });

  test(`Rotation ${mb.rot}°: ViewRect <-> PdfRect conversion`, () => {
    const vRect = { x: 10, y: 15, width: 40, height: 60 };
    const pdfRect = viewRectToPdfRect(vRect, geom);
    assert.ok(pdfRect.width > 0 && pdfRect.height > 0);
    const roundtrip = pdfRectToViewRect(pdfRect, geom);
    assert.strictEqual(Math.round(roundtrip.x), vRect.x);
    assert.strictEqual(Math.round(roundtrip.y), vRect.y);
    assert.strictEqual(Math.round(roundtrip.width), vRect.width);
    assert.strictEqual(Math.round(roundtrip.height), vRect.height);
  });
}

// 2. WinAnsi Text Sanitizer Tests
console.log('\n[2/6] WinAnsi Text Sanitizer');

test('Leaves standard ASCII and WinAnsi characters untouched', () => {
  const input = 'Normal Invoice #1029: Price $99.95 (USD)';
  const sanitized = sanitizeForWinAnsi(input);
  assert.strictEqual(sanitized, input);
});

test('Replaces curly quotes and special dashes with ASCII equivalents', () => {
  const input = '“Smart quotes” and ‘apostrophes’ — with em-dash and ellipsis…';
  const sanitized = sanitizeForWinAnsi(input);
  assert.ok(!sanitized.includes('“'));
  assert.ok(!sanitized.includes('”'));
  assert.ok(sanitized.includes('"Smart quotes"'));
  assert.ok(sanitized.includes('...'));
});

await asyncTest('Replaces unsupported Unicode (emojis, CJK) with ? without crashing font encoding', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const complexStr = 'Invoice 🚀 total: €50. Hello 世界! Arabic: مرحبا';
  const sanitized = sanitizeForWinAnsi(complexStr, font);

  // Must not throw when passed to font.encodeText
  assert.doesNotThrow(() => {
    font.encodeText(sanitized);
  });
  assert.ok(sanitized.includes('?'));
});

// 3. Annotations Burning on Rotated Pages
console.log('\n[3/6] Annotation Burning on Rotated Pages (0°, 90°, 180°, 270°)');

await asyncTest('Burn multiple annotation types across 4 rotated pages', async () => {
  const doc = await PDFDocument.create();

  // Page 0: 0 deg
  const p0 = doc.addPage([400, 600]);
  // Page 1: 90 deg
  const p1 = doc.addPage([400, 600]);
  p1.setRotation(degrees(90));
  // Page 2: 180 deg
  const p2 = doc.addPage([400, 600]);
  p2.setRotation(degrees(180));
  // Page 3: 270 deg
  const p3 = doc.addPage([400, 600]);
  p3.setRotation(degrees(270));

  const baseBytes = await doc.save();

  const annotations = [
    // Text box on page 0
    { pageIndex: 0, type: 'text', text: 'Page 0 Text', x: 20, y: 30, fontSize: 14, color: '#000000' },
    // Highlight on page 0
    { pageIndex: 0, type: 'highlight', x: 20, y: 60, width: 100, height: 20, color: '#fef08a' },
    // Sticky note on page 0
    { pageIndex: 0, type: 'sticky', text: 'Check this detail', x: 50, y: 100, author: 'Reviewer' },

    // Edit text on page 1 (90 deg)
    { pageIndex: 1, type: 'edit-text', text: 'Replaced Line', x: 30, y: 40, width: 120, height: 25, fontSize: 12 },
    // Rectangle on page 1
    { pageIndex: 1, type: 'rectangle', x: 30, y: 80, width: 80, height: 50, strokeColor: '#ef4444' },

    // Whiteout on page 2 (180 deg)
    { pageIndex: 2, type: 'whiteout', x: 40, y: 40, width: 100, height: 30 },
    // Stamp on page 2
    { pageIndex: 2, type: 'stamp', stampType: 'APPROVED', x: 40, y: 100, width: 120, height: 40 },

    // Ink path and arrow on page 3 (270 deg)
    {
      pageIndex: 3,
      type: 'ink',
      points: [{ x: 50, y: 50 }, { x: 70, y: 60 }, { x: 90, y: 80 }],
      strokeColor: '#3b82f6',
      strokeWidth: 2
    },
    { pageIndex: 3, type: 'arrow', x1: 20, y1: 20, x2: 100, y2: 120, strokeColor: '#10b981', strokeWidth: 2 }
  ];

  const burnedBytes = await commitAnnotations(baseBytes, annotations);
  assert.ok(burnedBytes instanceof Uint8Array);
  assert.ok(burnedBytes.length > baseBytes.length);

  // Reload to verify document integrity
  const loaded = await PDFDocument.load(burnedBytes);
  assert.strictEqual(loaded.getPageCount(), 4);
});

await asyncTest('Apply watermarks, header/footers, and metadata', async () => {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  doc.addPage([300, 400]);
  const baseBytes = await doc.save();

  // Watermark
  const watermarked = await applyWatermark(baseBytes, {
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    pageRange: 'all'
  });
  assert.ok(watermarked.length > baseBytes.length);

  // Header and Footer with tokens
  const withHf = await applyHeaderFooter(watermarked, {
    topLeft: 'Doc: {name}',
    bottomRight: 'Page {n} of {total}',
    docName: 'AnnualReport.pdf'
  });
  assert.ok(withHf.length > watermarked.length);

  // Metadata
  const withMeta = await updateMetadata(withHf, {
    title: 'Financial Summary',
    author: 'PDF Studio User',
    keywords: ['finance', '2026', 'report']
  });

  const verifiedDoc = await PDFDocument.load(withMeta);
  assert.strictEqual(verifiedDoc.getTitle(), 'Financial Summary');
  assert.strictEqual(verifiedDoc.getAuthor(), 'PDF Studio User');
});

// 4. Form Engine Tests
console.log('\n[4/6] Form Engine (Extraction, Missing /P, Filling, Flattening)');

await asyncTest('Create form fields, extract them, fill, and flatten', async () => {
  const doc = await PDFDocument.create();
  doc.addPage([400, 500]);
  const baseBytes = await doc.save();

  // Create text field and checkbox
  const withText = await createFormField(baseBytes, {
    name: 'CustomerName',
    type: 'text',
    pageIndex: 0,
    rect: { x: 50, y: 50, width: 150, height: 25 }
  });

  const withForm = await createFormField(withText, {
    name: 'AgreeTerms',
    type: 'checkbox',
    pageIndex: 0,
    rect: { x: 50, y: 90, width: 20, height: 20 }
  });

  // Extract fields
  const { fields, hasForm } = await extractFormFields(withForm);
  assert.strictEqual(hasForm, true);
  assert.ok(fields.length >= 2);
  const nameField = fields.find(f => f.name === 'CustomerName');
  assert.ok(nameField);
  assert.strictEqual(nameField.pageIndex, 0);

  // Fill form
  const filled = await applyFormValues(withForm, {
    CustomerName: 'Jane Doe',
    AgreeTerms: true
  });
  const reExtracted = await extractFormFields(filled);
  const reName = reExtracted.fields.find(f => f.name === 'CustomerName');
  assert.strictEqual(reName.value, 'Jane Doe');

  // Flatten
  const flattened = await flattenForm(filled);
  assert.ok(flattened.length > 0);
});

// 5. Organize Engine Tests
console.log('\n[5/6] Organize Engine (Rotate, Delete, Duplicate, Reorder, Split, Merge, Crop)');

await asyncTest('Page operations: rotate, duplicate, delete, reorder', async () => {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]); // Page 0
  doc.addPage([300, 300]); // Page 1
  doc.addPage([400, 400]); // Page 2
  const baseBytes = await doc.save();

  // Rotate page 1 by 90
  const rotated = await rotatePages(baseBytes, [1], 90);
  const rotDoc = await PDFDocument.load(rotated);
  assert.strictEqual(rotDoc.getPage(1).getRotation().angle, 90);

  // Insert blank page
  const withBlank = await insertBlankPage(rotated, 1);
  const blankDoc = await PDFDocument.load(withBlank);
  assert.strictEqual(blankDoc.getPageCount(), 4);

  // Duplicate page 0
  const duplicated = await duplicatePages(withBlank, [0]);
  const dupDoc = await PDFDocument.load(duplicated);
  assert.strictEqual(dupDoc.getPageCount(), 5);

  // Delete page
  const afterDelete = await deletePages(duplicated, [0]);
  const delDoc = await PDFDocument.load(afterDelete);
  assert.strictEqual(delDoc.getPageCount(), 4);

  // Reorder
  const reordered = await reorderPages(afterDelete, [3, 2, 1, 0]);
  const reDoc = await PDFDocument.load(reordered);
  assert.strictEqual(reDoc.getPageCount(), 4);

  // Crop margins
  const cropped = await cropPages(reordered, [0], { top: 10, bottom: 10, left: 10, right: 10 });
  assert.ok(cropped.length > 0);
});

await asyncTest('Document operations: Merge and Split', async () => {
  const doc1 = await PDFDocument.create();
  doc1.addPage([200, 200]);
  doc1.addPage([200, 200]);
  const b1 = await doc1.save();

  const doc2 = await PDFDocument.create();
  doc2.addPage([300, 300]);
  const b2 = await doc2.save();

  // Merge
  const merged = await mergePdfs([b1, b2]);
  const mDoc = await PDFDocument.load(merged);
  assert.strictEqual(mDoc.getPageCount(), 3);

  // Split each
  const partsEach = await splitPdf(merged, 'each');
  assert.strictEqual(partsEach.length, 3);

  // Split every 2 pages
  const partsChunks = await splitPdf(merged, 'every-n', { everyN: 2 });
  assert.strictEqual(partsChunks.length, 2);
});

// 6. Convert & Compression Tests
console.log('\n[6/6] Convert & Compression Engine');

await asyncTest('Lossless compression preserves document structures', async () => {
  const doc = await PDFDocument.create();
  doc.addPage([300, 300]);
  const base = await doc.save();
  const compressed = await compressLossless(base);
  assert.ok(compressed instanceof Uint8Array);
  const reDoc = await PDFDocument.load(compressed);
  assert.strictEqual(reDoc.getPageCount(), 1);
});

console.log('\n========================================');
console.log(`Results: ${passedTests}/${totalTests} tests passed.`);
console.log('========================================\n');

if (passedTests === totalTests) {
  console.log('ALL SELF-TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
