/**
 * WinAnsi character sanitizer for standard PDF fonts.
 * Standard PDF fonts (Helvetica, TimesRoman, Courier) only support WinAnsi encoding.
 * Any character outside this range causes pdf-lib to crash with WinAnsi cannot encode error.
 * This module replaces unsupported characters with '?' or best approximations.
 */

const REPLACEMENTS = {
  '\u2018': "'", // Left single quote
  '\u2019': "'", // Right single quote
  '\u201C': '"', // Left double quote
  '\u201D': '"', // Right double quote
  '\u2013': '-', // En dash
  '\u2014': '-', // Em dash
  '\u2026': '...', // Horizontal ellipsis
  '\u2022': '*', // Bullet
  '\u00A0': ' ', // Non-breaking space
  '\u200B': '',  // Zero-width space
  '\uFEFF': '',  // Byte order mark
};

const charCache = new Map();

/**
 * Sanitizes input string to ensure it contains only WinAnsi encodable characters.
 * @param {string} text - Input text
 * @param {any} [font] - Optional pdf-lib PDFFont instance for authoritative validation
 * @returns {string} Sanitized string
 */
export function sanitizeForWinAnsi(text, font = null) {
  if (!text) return '';
  let str = String(text);

  // Apply common replacement mappings
  for (const [target, replacement] of Object.entries(REPLACEMENTS)) {
    if (str.includes(target)) {
      str = str.split(target).join(replacement);
    }
  }

  // If font instance provided, validate using font.encodeText
  if (font && typeof font.encodeText === 'function') {
    let result = '';
    for (const char of str) {
      if (char === '\n' || char === '\r' || char === '\t') {
        result += char;
        continue;
      }
      if (charCache.has(char)) {
        result += charCache.get(char);
        continue;
      }
      try {
        font.encodeText(char);
        charCache.set(char, char);
        result += char;
      } catch {
        charCache.set(char, '?');
        result += '?';
      }
    }
    return result;
  }

  // Fast fallback regex / code-point filter for WinAnsi
  let sanitized = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Printable ASCII + common whitespace
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      sanitized += str[i];
    } else if (code >= 160 && code <= 255) {
      // Latin-1 Supplement (part of WinAnsi)
      sanitized += str[i];
    } else {
      sanitized += '?';
    }
  }
  return sanitized;
}
