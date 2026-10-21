import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker and standard asset paths
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.min.js';
}

export function getDocumentOptions(pdfBytes) {
  // Always clone/slice bytes so pdfjs web worker postMessage([data.buffer]) does not detach caller's ArrayBuffer!
  const safeData = pdfBytes instanceof Uint8Array
    ? pdfBytes.slice()
    : new Uint8Array(pdfBytes).slice();

  return {
    data: safeData,
    cMapUrl: './pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: './pdfjs/standard_fonts/',
    enableXfa: false
  };
}

export default pdfjsLib;
