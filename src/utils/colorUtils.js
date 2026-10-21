/**
 * Color Utilities for PDF Studio
 * Converts between Hex, RGBA, and pdf-lib RGB (0..1)
 */

/**
 * Parses any color format (Hex, rgb(), rgba()) to RGBA object (0..1 range)
 * @param {string} colorStr
 * @returns {{ r: number, g: number, b: number, a: number }}
 */
export function parseColor(colorStr = '#000000') {
  if (!colorStr) return { r: 0, g: 0, b: 0, a: 1 };
  const str = colorStr.trim();

  // Hex format: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('') + 'ff';
    } else if (hex.length === 4) {
      hex = hex.split('').map(c => c + c).join('');
    } else if (hex.length === 6) {
      hex += 'ff';
    }
    const num = parseInt(hex, 16);
    return {
      r: ((num >> 24) & 255) / 255,
      g: ((num >> 16) & 255) / 255,
      b: ((num >> 8) & 255) / 255,
      a: (num & 255) / 255
    };
  }

  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (rgbaMatch) {
    return {
      r: Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10))) / 255,
      g: Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10))) / 255,
      b: Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10))) / 255,
      a: rgbaMatch[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(rgbaMatch[4]))) : 1
    };
  }

  // Named fallbacks
  const namedColors = {
    yellow: { r: 1, g: 1, b: 0, a: 1 },
    red: { r: 1, g: 0, b: 0, a: 1 },
    green: { r: 0, g: 0.8, b: 0, a: 1 },
    blue: { r: 0, g: 0, b: 1, a: 1 },
    black: { r: 0, g: 0, b: 0, a: 1 },
    white: { r: 1, g: 1, b: 1, a: 1 },
    transparent: { r: 0, g: 0, b: 0, a: 0 }
  };

  return namedColors[str.toLowerCase()] || { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Converts RGBA object (0..1) to CSS rgba() string
 */
export function rgbaToString({ r, g, b, a = 1 }) {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

/**
 * Converts Hex string to CSS rgba with custom alpha
 */
export function hexToRgbaString(hex, alpha = 1) {
  const c = parseColor(hex);
  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${alpha})`;
}
