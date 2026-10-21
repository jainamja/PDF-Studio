/**
 * PDF Studio - File Operations Helper
 * Routes through the unified platform I/O adapter (src/lib/io.js)
 */

import ioAdapter from '../lib/io.js';
import JSZip from 'jszip';

export async function openPdfFiles() {
  return await ioAdapter.openPdfs();
}

export async function savePdfFile(bytes, defaultName = 'document.pdf', existingPath = null) {
  return await ioAdapter.saveBytes(bytes, defaultName, existingPath);
}

export async function saveAsPdfFile(bytes, defaultName = 'document.pdf') {
  return await ioAdapter.saveBytes(bytes, defaultName, null);
}

export async function sharePdfFile(bytes, filename = 'document.pdf', title = 'Share PDF') {
  return await ioAdapter.share({ title, bytes, filename });
}

export async function selectFolder() {
  if (window.electronAPI && window.electronAPI.selectFolderDialog) {
    const res = await window.electronAPI.selectFolderDialog();
    return res.canceled ? null : res.folderPath;
  }
  return null;
}

export async function writeFilesToFolder(folderPath, files = []) {
  if (window.electronAPI && folderPath) {
    for (const f of files) {
      const fullPath = `${folderPath}\\${f.name}`;
      await window.electronAPI.writeFile(fullPath, f.bytes);
    }
    return true;
  }

  // Fallback: zip and download in browser / mobile
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.bytes);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'exported_files.zip';
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export function exportTextFile(text, fileName = 'extracted_text.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportImagesZip(images = [], zipName = 'pdf_pages.zip') {
  const zip = new JSZip();
  for (const img of images) {
    zip.file(img.name, img.bytes);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}
