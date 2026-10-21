/**
 * PDF Studio - File Operations Helper
 * Interacts with Electron ContextBridge (secure) with browser fallbacks.
 */

import JSZip from 'jszip';

export async function openPdfFiles() {
  if (window.electronAPI && window.electronAPI.openFileDialog) {
    const result = await window.electronAPI.openFileDialog({
      multiple: true,
      filters: [
        { name: 'PDF Documents', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.files || result.files.length === 0) {
      return [];
    }

    return result.files.map(f => ({
      name: f.name,
      path: f.path,
      bytes: new Uint8Array(f.data)
    }));
  }

  // Browser fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      const loaded = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        loaded.push({
          name: file.name,
          path: file.name,
          bytes: new Uint8Array(buffer)
        });
      }
      resolve(loaded);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export async function savePdfFile(bytes, defaultName = 'document.pdf', existingPath = null) {
  if (window.electronAPI) {
    let targetPath = existingPath;
    if (!targetPath) {
      const result = await window.electronAPI.saveFileDialog({
        defaultPath: defaultName,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
      });
      if (result.canceled || !result.filePath) return null;
      targetPath = result.filePath;
    }

    const writeRes = await window.electronAPI.writeFile(targetPath, bytes);
    if (!writeRes.success) throw new Error(writeRes.error);
    return targetPath;
  }

  // Browser download fallback
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  a.click();
  URL.revokeObjectURL(url);
  return defaultName;
}

export async function saveAsPdfFile(bytes, defaultName = 'document.pdf') {
  return await savePdfFile(bytes, defaultName, null);
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

  // Fallback: zip and download in browser
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
