const { app, BrowserWindow, ipcMain, dialog, protocol, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Register custom protocol 'app' as standard and secure
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    title: 'PDF Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Allows preload to bridge securely
      webSecurity: true
    },
    frame: true, // Native titlebar or customizable
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximizeChange', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximizeChange', false);
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // In case dev server isn't up, load fallback
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
    // Open devtools in dev if needed
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('app://bundle/index.html');
  }

  // Handle external link navigation safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// Setup custom app:// protocol handler
function registerAppProtocol() {
  const distPath = path.join(__dirname, '../dist');

  protocol.handle('app', (request) => {
    try {
      const url = new URL(request.url);
      let relativePath = decodeURIComponent(url.pathname);
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1);
      }
      if (!relativePath || relativePath === '' || relativePath === 'bundle') {
        relativePath = 'index.html';
      }
      if (relativePath.startsWith('bundle/')) {
        relativePath = relativePath.slice('bundle/'.length);
      }
      if (!relativePath) {
        relativePath = 'index.html';
      }

      let filePath = path.join(distPath, relativePath);

      // If file doesn't exist, fallback to index.html (SPA routing support)
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distPath, 'index.html');
      }

      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      console.error('Error serving app protocol request:', err);
      return new Response('Not Found', { status: 404 });
    }
  });
}

// IPC Handlers
ipcMain.handle('dialog:openFile', async (_event, options = {}) => {
  const filters = options.filters || [
    { name: 'PDF Documents', extensions: ['pdf'] },
    { name: 'All Files', extensions: ['*'] }
  ];
  const properties = ['openFile'];
  if (options.multiple) properties.push('multiSelections');

  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Open PDF Document',
    filters,
    properties
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, files: [] };
  }

  const files = [];
  for (const fp of result.filePaths) {
    try {
      const buffer = fs.readFileSync(fp);
      files.push({
        path: fp,
        name: path.basename(fp),
        data: buffer
      });
    } catch (e) {
      console.error('Error reading file:', fp, e);
    }
  }

  return { canceled: false, files };
});

ipcMain.handle('dialog:saveFile', async (_event, options = {}) => {
  const filters = options.filters || [
    { name: 'PDF Document', extensions: ['pdf'] },
    { name: 'All Files', extensions: ['*'] }
  ];

  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || 'Save Document As',
    defaultPath: options.defaultPath || 'document.pdf',
    filters
  });

  return {
    canceled: result.canceled,
    filePath: result.filePath
  };
});

ipcMain.handle('dialog:selectFolder', async (_event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Select Folder',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, folderPath: null };
  }
  return { canceled: false, folderPath: result.filePaths[0] };
});

ipcMain.handle('fs:readFile', async (_event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return { success: true, data: buffer };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:writeFile', async (_event, filePath, data) => {
  try {
    const buffer = Buffer.from(data);
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:showItemInFolder', async (_event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

ipcMain.handle('window:print', async (_event, options = {}) => {
  if (!mainWindow) return false;
  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: options.silent || false,
        printBackground: true,
        ...options
      },
      (success, failureReason) => {
        resolve({ success, failureReason });
      }
    );
  });
});

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() || false);

// App Lifecycle
app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
