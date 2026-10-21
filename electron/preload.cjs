const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  selectFolderDialog: (options) => ipcRenderer.invoke('dialog:selectFolder', options),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  showItemInFolder: (filePath) => ipcRenderer.invoke('fs:showItemInFolder', filePath),
  print: (options) => ipcRenderer.invoke('window:print', options),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximizeChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window:maximizeChange', handler);
    return () => ipcRenderer.removeListener('window:maximizeChange', handler);
  },
  onFileDrop: (callback) => {
    const handler = (_event, filePath) => callback(filePath);
    ipcRenderer.on('file:open', handler);
    return () => ipcRenderer.removeListener('file:open', handler);
  }
});
