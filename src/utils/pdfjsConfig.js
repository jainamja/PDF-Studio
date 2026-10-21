import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker and standard asset paths
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.min.js';
}

export function getDocumentOptions(pdfBytes) {
  return {
    data: pdfBytes,
    cMapUrl: './pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: './pdfjs/standard_fonts/',
    enableXfa: false
  };
}

export default pdfjsLib;
