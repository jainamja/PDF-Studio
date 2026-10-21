/**
 * PDF Studio - Unified Platform I/O Adapter
 * Chooses the appropriate implementation at startup:
 *  1. Electron (Desktop native)
 *  2. Capacitor (iOS & Android native)
 *  3. Plain Browser / PWA (Web standards fallback)
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { App } from '@capacitor/app';
import { FilePicker } from '@capawesome/capacitor-file-picker';

// Helpers for Base64 conversion
export function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64) {
  let clean = base64;
  if (clean.includes(',')) clean = clean.split(',')[1];
  const binStr = atob(clean);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Detect current runtime platform
 */
export function getPlatform() {
  if (typeof window !== 'undefined') {
    if (window.electronAPI || window.native) return 'electron';
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
      return 'capacitor';
    }
  }
  return 'browser';
}

export const isElectron = getPlatform() === 'electron';
export const isCapacitor = getPlatform() === 'capacitor';
export const isBrowser = getPlatform() === 'browser';

/**
 * Platform Adapter API
 */
export const ioAdapter = {
  getPlatform,
  isElectron,
  isCapacitor,
  isBrowser,

  /**
   * Open one or multiple PDF documents
   * @returns {Promise<Array<{ name: string, path: string|null, bytes: Uint8Array }>>}
   */
  async openPdfs() {
    const platform = getPlatform();

    if (platform === 'electron') {
      const api = window.electronAPI || window.native;
      const res = await api.openFileDialog({
        multiple: true,
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      });
      if (res.canceled || !res.files) return [];
      return res.files.map(f => ({
        name: f.name,
        path: f.path,
        bytes: (f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data)).slice()
      }));
    }

    if (platform === 'capacitor') {
      try {
        const result = await FilePicker.pickFiles({
          types: ['application/pdf'],
          multiple: true,
          readData: true
        });

        if (!result || !result.files || result.files.length === 0) return [];

        const loaded = [];
        for (const file of result.files) {
          let bytes;
          if (file.data) {
            bytes = base64ToUint8Array(file.data);
          } else if (file.path) {
            const readRes = await Filesystem.readFile({ path: file.path });
            bytes = base64ToUint8Array(readRes.data);
          }
          if (bytes) {
            loaded.push({
              name: file.name || 'document.pdf',
              path: file.path || null,
              bytes: bytes.slice()
            });
          }
        }
        return loaded;
      } catch (err) {
        if (err.message && err.message.includes('canceled')) return [];
        console.warn('Capacitor FilePicker notice:', err);
        return [];
      }
    }

    // Plain Browser & PWA fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.multiple = true;
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        const loaded = [];
        for (const f of files) {
          const buf = await f.arrayBuffer();
          loaded.push({
            name: f.name,
            path: null,
            bytes: new Uint8Array(buf).slice()
          });
        }
        resolve(loaded);
      };
      input.oncancel = () => resolve([]);
      input.click();
    });
  },

  /**
   * Open one or multiple images
   * @returns {Promise<Array<{ name: string, dataUrl: string, bytes: Uint8Array, type: 'png'|'jpeg' }>>}
   */
  async openImages() {
    const platform = getPlatform();

    if (platform === 'electron') {
      const api = window.electronAPI || window.native;
      const res = await api.openFileDialog({
        multiple: true,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      });
      if (res.canceled || !res.files) return [];
      return res.files.map(f => {
        const bytes = (f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data)).slice();
        const isPng = f.name.toLowerCase().endsWith('.png');
        return {
          name: f.name,
          bytes,
          dataUrl: `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${uint8ArrayToBase64(bytes)}`,
          type: isPng ? 'png' : 'jpeg'
        };
      });
    }

    if (platform === 'capacitor') {
      try {
        const result = await FilePicker.pickImages({
          multiple: true,
          readData: true
        });

        if (!result || !result.files || result.files.length === 0) return [];

        return result.files.map(f => {
          const bytes = base64ToUint8Array(f.data);
          const isPng = (f.mimeType || '').includes('png');
          return {
            name: f.name || 'image.jpg',
            bytes: bytes.slice(),
            dataUrl: `data:${f.mimeType || 'image/jpeg'};base64,${f.data}`,
            type: isPng ? 'png' : 'jpeg'
          };
        });
      } catch (err) {
        if (err.message && err.message.includes('canceled')) return [];
        console.warn('Capacitor Image picker notice:', err);
        return [];
      }
    }

    // Browser fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png, image/jpeg, image/jpg, image/webp';
      input.multiple = true;
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        const loaded = [];
        for (const f of files) {
          const buf = await f.arrayBuffer();
          const bytes = new Uint8Array(buf).slice();
          const isPng = f.type.includes('png');
          loaded.push({
            name: f.name,
            bytes,
            dataUrl: `data:${f.type || 'image/jpeg'};base64,${uint8ArrayToBase64(bytes)}`,
            type: isPng ? 'png' : 'jpeg'
          });
        }
        resolve(loaded);
      };
      input.oncancel = () => resolve([]);
      input.click();
    });
  },

  /**
   * Save or export document bytes.
   * On mobile, writes to app's cache/documents directory and opens native Share / "Save to Files" sheet.
   */
  async saveBytes(bytes, defaultName = 'document.pdf', existingPath = null) {
    const platform = getPlatform();
    const safeBytes = (bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).slice();

    if (platform === 'electron') {
      const api = window.electronAPI || window.native;
      let targetPath = existingPath;
      if (!targetPath) {
        const res = await api.saveFileDialog({
          defaultPath: defaultName,
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
        });
        if (res.canceled || !res.filePath) return null;
        targetPath = res.filePath;
      }
      const writeRes = await api.writeFile(targetPath, safeBytes);
      if (!writeRes.success) throw new Error(writeRes.error);
      return targetPath;
    }

    if (platform === 'capacitor') {
      // Write to Cache or Documents directory, then open native Share Sheet
      const base64 = uint8ArrayToBase64(safeBytes);
      const fileName = defaultName || `PDF_Studio_${Date.now()}.pdf`;

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache
      });

      // Open native Share / Save to Files sheet
      await Share.share({
        title: fileName,
        url: savedFile.uri,
        dialogTitle: 'Save or Share PDF'
      });

      return savedFile.uri;
    }

    // Browser download
    const blob = new Blob([safeBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return defaultName;
  },

  /**
   * Share file directly via native share sheet or Web Share API
   */
  async share({ title = 'PDF Document', text = '', bytes = null, filename = 'document.pdf' }) {
    const platform = getPlatform();

    if (platform === 'capacitor' && bytes) {
      const base64 = uint8ArrayToBase64(bytes);
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache
      });
      await Share.share({
        title,
        text,
        url: savedFile.uri,
        dialogTitle: 'Share PDF Document'
      });
      return true;
    }

    // Browser Web Share API
    if (typeof navigator !== 'undefined' && navigator.share && bytes) {
      try {
        const file = new File([bytes], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text,
            files: [file]
          });
          return true;
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Web Share notice:', err);
      }
    }

    // Fallback: download file
    if (bytes) {
      return await this.saveBytes(bytes, filename, null);
    }
    return false;
  },

  /**
   * Camera Document Scanner
   * Captures document photo using native camera or HTML5 environment capture
   */
  async scanCamera() {
    const platform = getPlatform();

    if (platform === 'capacitor') {
      try {
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          quality: 92,
          allowEditing: false
        });
        return photo.dataUrl;
      } catch (err) {
        if (err.message && err.message.includes('cancelled')) return null;
        console.warn('Camera scan notice:', err);
        return null;
      }
    }

    // Browser camera capture
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  },

  /**
   * Listen for "Open With" app intents on mobile or file drops in Electron
   */
  registerAppOpenListener(callback) {
    const platform = getPlatform();

    if (platform === 'capacitor') {
      const listenerPromise = App.addListener('appUrlOpen', async (data) => {
        if (data && data.url) {
          try {
            let bytes;
            if (data.url.startsWith('content://') || data.url.startsWith('file://')) {
              const res = await Filesystem.readFile({ path: data.url });
              bytes = base64ToUint8Array(res.data);
            } else {
              const fetched = await fetch(data.url);
              const buf = await fetched.arrayBuffer();
              bytes = new Uint8Array(buf);
            }
            const name = decodeURIComponent(data.url.split('/').pop() || 'document.pdf');
            callback({ name, bytes: bytes.slice(), path: data.url });
          } catch (e) {
            console.warn('Error reading appUrlOpen file:', e);
          }
        }
      });

      return () => {
        listenerPromise.then(l => l.remove());
      };
    }

    if (platform === 'electron') {
      const api = window.electronAPI || window.native;
      if (api && api.onFileDrop) {
        return api.onFileDrop(async (filePath) => {
          const res = await api.readFile(filePath);
          if (res.success) {
            const name = filePath.split(/[/\\]/).pop();
            callback({ name, bytes: new Uint8Array(res.data).slice(), path: filePath });
          }
        });
      }
    }

    return () => {};
  }
};

export default ioAdapter;
