/**
 * PDF Studio - AcroForm Engine
 * Handles extraction of form fields (with missing /P entry resolution),
 * filling fields, flattening, and programmatic field creation.
 */

import { PDFDocument, PDFName, PDFArray, PDFRef, PDFDict } from 'pdf-lib';
import { getPageGeometry, pdfRectToViewRect, viewRectToPdfRect } from './geometry.js';
import { sanitizeForWinAnsi } from './textSanitizer.js';

/**
 * Extracts all AcroForm fields from a PDF with page mapping and view coordinates.
 * Resolves pages even when /P entries are missing from widget annotations.
 *
 * @param {Uint8Array | ArrayBuffer} pdfBytes
 * @returns {Promise<{ fields: Array<any>, hasForm: boolean }>}
 */
export async function extractFormFields(pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const rawFields = form.getFields();

    if (!rawFields || rawFields.length === 0) {
      return { fields: [], hasForm: false };
    }

    const pageCount = pdfDoc.getPageCount();

    // Map annotation object refs to page indices (resolves missing /P entries)
    const annotRefToPage = new Map();
    const pageGeometries = [];

    for (let pIdx = 0; pIdx < pageCount; pIdx++) {
      const page = pdfDoc.getPage(pIdx);
      const geom = getPageGeometry(page);
      pageGeometries.push(geom);

      const annots = page.node.get(PDFName.of('Annots'));
      if (annots instanceof PDFArray) {
        for (let aIdx = 0; aIdx < annots.size(); aIdx++) {
          const ref = annots.get(aIdx);
          if (ref instanceof PDFRef) {
            annotRefToPage.set(ref.toString(), pIdx);
          }
        }
      }
    }

    const extractedFields = [];

    for (const field of rawFields) {
      const fieldName = field.getName();
      const typeName = field.constructor.name; // PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFOptionList
      const widgets = field.acroField.getWidgets();

      for (let wIdx = 0; wIdx < widgets.length; wIdx++) {
        const widget = widgets[wIdx];
        const rectArray = widget.getRectangle(); // { x, y, width, height }

        // Find page index: 1. check widget.P(), 2. check annotRefToPage, 3. spatial check
        let pageIndex = -1;
        const pRef = widget.dict.get(PDFName.of('P'));
        if (pRef instanceof PDFRef && annotRefToPage.has(pRef.toString())) {
          pageIndex = annotRefToPage.get(pRef.toString());
        }

        if (pageIndex === -1) {
          // Check if widget's own ref is mapped to a page
          for (const [refStr, pIdx] of annotRefToPage.entries()) {
            const resolvedObj = pdfDoc.context.lookup(PDFRef.of(parseInt(refStr.split(' ')[0], 10), parseInt(refStr.split(' ')[1], 10)));
            if (resolvedObj === widget.dict) {
              pageIndex = pIdx;
              break;
            }
          }
        }

        // Fallback: spatial matching against page boundaries
        if (pageIndex === -1 && rectArray) {
          for (let pIdx = 0; pIdx < pageCount; pIdx++) {
            const g = pageGeometries[pIdx];
            if (
              rectArray.x >= g.x - 10 &&
              rectArray.x <= g.x + g.width + 10 &&
              rectArray.y >= g.y - 10 &&
              rectArray.y <= g.y + g.height + 10
            ) {
              pageIndex = pIdx;
              break;
            }
          }
        }

        if (pageIndex === -1) pageIndex = 0;

        const geom = pageGeometries[pageIndex];
        const viewRect = pdfRectToViewRect(rectArray, geom);

        let type = 'text';
        let value = '';
        let options = [];

        if (typeName.includes('CheckBox')) {
          type = 'checkbox';
          value = field.isChecked ? field.isChecked() : false;
        } else if (typeName.includes('Dropdown') || typeName.includes('OptionList')) {
          type = 'dropdown';
          options = field.getOptions ? field.getOptions() : [];
          const selected = field.getSelected ? field.getSelected() : [];
          value = selected.length > 0 ? selected[0] : '';
        } else if (typeName.includes('RadioGroup')) {
          type = 'radio';
          options = field.getOptions ? field.getOptions() : [];
          value = field.getSelected ? field.getSelected() : '';
        } else {
          // Text field
          type = 'text';
          value = field.getText ? field.getText() || '' : '';
        }

        extractedFields.push({
          id: `${fieldName}_${wIdx}`,
          name: fieldName,
          type,
          value,
          options,
          pageIndex,
          rect: viewRect,
          pdfRect: rectArray
        });
      }
    }

    return { fields: extractedFields, hasForm: true };
  } catch (err) {
    console.error('Error extracting form fields:', err);
    return { fields: [], hasForm: false };
  }
}

/**
 * Fills form fields with new values.
 *
 * @param {Uint8Array | ArrayBuffer} pdfBytes
 * @param {Record<string, any>} formValues - Keyed by field name
 * @returns {Promise<Uint8Array>}
 */
export async function applyFormValues(pdfBytes, formValues = {}) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  for (const [name, val] of Object.entries(formValues)) {
    try {
      const field = form.getField(name);
      if (!field) continue;
      const typeName = field.constructor.name;

      if (typeName.includes('CheckBox')) {
        if (val) field.check();
        else field.uncheck();
      } else if (typeName.includes('RadioGroup') || typeName.includes('Dropdown')) {
        if (val) field.select(sanitizeForWinAnsi(String(val)));
      } else if (typeName.includes('TextField')) {
        field.setText(sanitizeForWinAnsi(String(val || '')));
      }
    } catch (e) {
      console.warn(`Could not set form field ${name}:`, e.message);
    }
  }

  return await pdfDoc.save();
}

/**
 * Flattens all interactive form fields into permanent page graphics.
 *
 * @param {Uint8Array | ArrayBuffer} pdfBytes
 * @returns {Promise<Uint8Array>}
 */
export async function flattenForm(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch (err) {
    console.warn('Form flatten notice:', err.message);
  }
  return await pdfDoc.save();
}

/**
 * Creates a new form field (text or checkbox) on a page.
 *
 * @param {Uint8Array | ArrayBuffer} pdfBytes
 * @param {{
 *   name: string,
 *   type: 'text' | 'checkbox',
 *   pageIndex: number,
 *   rect: { x: number, y: number, width: number, height: number }
 * }} fieldDef
 * @returns {Promise<Uint8Array>}
 */
export async function createFormField(pdfBytes, fieldDef) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const page = pdfDoc.getPage(fieldDef.pageIndex || 0);
  const geom = getPageGeometry(page);
  const pdfRect = viewRectToPdfRect(fieldDef.rect, geom);

  const cleanName = sanitizeForWinAnsi(fieldDef.name || `Field_${Date.now()}`);

  if (fieldDef.type === 'checkbox') {
    const checkBox = form.createCheckBox(cleanName);
    checkBox.addToPage(page, {
      x: pdfRect.x,
      y: pdfRect.y,
      width: pdfRect.width,
      height: pdfRect.height
    });
  } else {
    const textField = form.createTextField(cleanName);
    textField.addToPage(page, {
      x: pdfRect.x,
      y: pdfRect.y,
      width: pdfRect.width,
      height: pdfRect.height
    });
  }

  return await pdfDoc.save();
}
