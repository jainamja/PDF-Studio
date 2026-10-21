/**
 * PDF Studio Geometry Helper
 *
 * Handles coordinate transformations between View Coordinates (top-left origin, upright page display)
 * and PDF User Space (bottom-left origin, CropBox/MediaBox offset, and rotations 0/90/180/270).
 *
 * Used for drawing text, shapes, highlights, images, form fields, and annotations.
 */

/**
 * Normalizes an angle in degrees to one of: 0, 90, 180, 270
 * @param {number} angle
 * @returns {0 | 90 | 180 | 270}
 */
export function normalizeRotation(angle = 0) {
  const norm = ((angle % 360) + 360) % 360;
  if (norm >= 45 && norm < 135) return 90;
  if (norm >= 135 && norm < 225) return 180;
  if (norm >= 225 && norm < 315) return 270;
  return 0;
}

/**
 * Extracts normalized page box and rotation information from a pdf-lib PDFPage.
 * Handles CropBox intersection with MediaBox.
 * @param {import('pdf-lib').PDFPage} page
 * @returns {{
 *   x: number,
 *   y: number,
 *   width: number,
 *   height: number,
 *   rotation: 0 | 90 | 180 | 270,
 *   viewWidth: number,
 *   viewHeight: number
 * }}
 */
export function getPageGeometry(page) {
  const mediaBox = page.getMediaBox();
  let effectiveBox = {
    x: mediaBox.x || 0,
    y: mediaBox.y || 0,
    width: mediaBox.width,
    height: mediaBox.height
  };

  try {
    const cropBox = page.getCropBox();
    if (cropBox) {
      // Intersection of CropBox and MediaBox
      const x1 = Math.max(effectiveBox.x, cropBox.x || 0);
      const y1 = Math.max(effectiveBox.y, cropBox.y || 0);
      const x2 = Math.min(effectiveBox.x + effectiveBox.width, (cropBox.x || 0) + cropBox.width);
      const y2 = Math.min(effectiveBox.y + effectiveBox.height, (cropBox.y || 0) + cropBox.height);
      if (x2 > x1 && y2 > y1) {
        effectiveBox = {
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1
        };
      }
    }
  } catch {
    // If getCropBox is not available or throws, use mediaBox
  }

  const rawRotation = page.getRotation ? page.getRotation().angle : 0;
  const rotation = normalizeRotation(rawRotation);

  const isTransposed = rotation === 90 || rotation === 270;
  const viewWidth = isTransposed ? effectiveBox.height : effectiveBox.width;
  const viewHeight = isTransposed ? effectiveBox.width : effectiveBox.height;

  return {
    x: effectiveBox.x,
    y: effectiveBox.y,
    width: effectiveBox.width,
    height: effectiveBox.height,
    rotation,
    viewWidth,
    viewHeight
  };
}

/**
 * Converts a point (vx, vy) from View space to PDF User Space.
 * (vx, vy) are unscaled view coordinates where (0,0) is top-left of the visible upright page.
 * @param {number} vx
 * @param {number} vy
 * @param {ReturnType<typeof getPageGeometry>} geom
 * @returns {{ x: number, y: number }}
 */
export function viewToPdfPoint(vx, vy, geom) {
  const { x, y, width, height, rotation } = geom;

  switch (rotation) {
    case 0:
      return {
        x: x + vx,
        y: y + height - vy
      };
    case 90:
      return {
        x: x + vy,
        y: y + vx
      };
    case 180:
      return {
        x: x + width - vx,
        y: y + vy
      };
    case 270:
      return {
        x: x + width - vy,
        y: y + height - vx
      };
    default:
      return { x: x + vx, y: y + height - vy };
  }
}

/**
 * Converts a point (px, py) from PDF User Space to View space.
 * @param {number} px
 * @param {number} py
 * @param {ReturnType<typeof getPageGeometry>} geom
 * @returns {{ x: number, y: number }}
 */
export function pdfToViewPoint(px, py, geom) {
  const { x, y, width, height, rotation } = geom;

  switch (rotation) {
    case 0:
      return {
        x: px - x,
        y: y + height - py
      };
    case 90:
      return {
        x: py - y,
        y: px - x
      };
    case 180:
      return {
        x: x + width - px,
        y: py - y
      };
    case 270:
      return {
        x: y + height - py,
        y: x + width - px
      };
    default:
      return { x: px - x, y: y + height - py };
  }
}

/**
 * Converts a rectangle in View space to an axis-aligned bounding box in PDF User Space.
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {ReturnType<typeof getPageGeometry>} geom
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function viewRectToPdfRect(rect, geom) {
  const p1 = viewToPdfPoint(rect.x, rect.y, geom);
  const p2 = viewToPdfPoint(rect.x + rect.width, rect.y, geom);
  const p3 = viewToPdfPoint(rect.x + rect.width, rect.y + rect.height, geom);
  const p4 = viewToPdfPoint(rect.x, rect.y + rect.height, geom);

  const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Converts an axis-aligned bounding box from PDF User Space to View Space.
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {ReturnType<typeof getPageGeometry>} geom
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function pdfRectToViewRect(rect, geom) {
  const p1 = pdfToViewPoint(rect.x, rect.y, geom);
  const p2 = pdfToViewPoint(rect.x + rect.width, rect.y, geom);
  const p3 = pdfToViewPoint(rect.x + rect.width, rect.y + rect.height, geom);
  const p4 = pdfToViewPoint(rect.x, rect.y + rect.height, geom);

  const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculates parameters for page.drawText to draw text upright at a specific view position.
 * @param {{ x: number, y: number, width?: number, height?: number, fontSize: number }} item
 * @param {ReturnType<typeof getPageGeometry>} geom
 * @returns {{ x: number, y: number, rotateAngle: number }}
 */
export function getTextDrawCoordinates(item, geom) {
  const { rotation } = geom;
  const baselineOffset = (item.fontSize || 12) * 0.82;

  switch (rotation) {
    case 0: {
      const p = viewToPdfPoint(item.x, item.y + baselineOffset, geom);
      return { x: p.x, y: p.y, rotateAngle: 0 };
    }
    case 90: {
      const p = viewToPdfPoint(item.x, item.y + baselineOffset, geom);
      return { x: p.x, y: p.y, rotateAngle: 90 };
    }
    case 180: {
      const p = viewToPdfPoint(item.x, item.y + baselineOffset, geom);
      return { x: p.x, y: p.y, rotateAngle: 180 };
    }
    case 270: {
      const p = viewToPdfPoint(item.x, item.y + baselineOffset, geom);
      return { x: p.x, y: p.y, rotateAngle: 270 };
    }
    default: {
      const p = viewToPdfPoint(item.x, item.y + baselineOffset, geom);
      return { x: p.x, y: p.y, rotateAngle: 0 };
    }
  }
}

/**
 * Calculates coordinates and rotation for drawing an image upright at a view rectangle.
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {ReturnType<typeof getPageGeometry>} geom
 * @returns {{ x: number, y: number, width: number, height: number, rotateAngle: number }}
 */
export function getImageDrawCoordinates(rect, geom) {
  const { rotation } = geom;

  switch (rotation) {
    case 0: {
      // Bottom-left in view is (rect.x, rect.y + rect.height)
      const bl = viewToPdfPoint(rect.x, rect.y + rect.height, geom);
      return {
        x: bl.x,
        y: bl.y,
        width: rect.width,
        height: rect.height,
        rotateAngle: 0
      };
    }
    case 90: {
      // In 90deg, local (0,0) rotated +90deg places top-left at view (rect.x, rect.y)
      // When rotated 90deg CCW around (x,y): width goes up (+Y), height goes left (-X)
      // So bottom-left in view is bottom-right in PDF
      const p = viewToPdfPoint(rect.x, rect.y, geom);
      // Wait: at rot=90, p is (x + rect.y, y + rect.x).
      // Rotating by 90 around p: local x (width) goes along +Y, local y (height) goes along -X.
      // So (rect.x, rect.y + rect.height) is at p.x + rect.height, which would be outside unless we start at p.x + rect.height!
      // Let's check: viewToPdfPoint(rect.x, rect.y + rect.height)
      const startPt = viewToPdfPoint(rect.x, rect.y + rect.height, geom);
      return {
        x: startPt.x,
        y: startPt.y,
        width: rect.width,
        height: rect.height,
        rotateAngle: 90
      };
    }
    case 180: {
      const startPt = viewToPdfPoint(rect.x + rect.width, rect.y + rect.height, geom);
      return {
        x: startPt.x,
        y: startPt.y,
        width: rect.width,
        height: rect.height,
        rotateAngle: 180
      };
    }
    case 270: {
      const startPt = viewToPdfPoint(rect.x + rect.width, rect.y, geom);
      return {
        x: startPt.x,
        y: startPt.y,
        width: rect.width,
        height: rect.height,
        rotateAngle: 270
      };
    }
    default: {
      const bl = viewToPdfPoint(rect.x, rect.y + rect.height, geom);
      return {
        x: bl.x,
        y: bl.y,
        width: rect.width,
        height: rect.height,
        rotateAngle: 0
      };
    }
  }
}
