const { app, BrowserWindow } = require('electron');
const path = require('node:path');

let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch {
  autoUpdater = null;
}

const developmentUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:8080';

// Keep Chromium caches in a writable temp location to avoid permission errors.
app.setPath('cache', path.join(app.getPath('temp'), 'tallyledger-cache'));
app.setPath('gpuCache', path.join(app.getPath('temp'), 'tallyledger-gpu-cache'));

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (app.isPackaged) {
    window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  } else if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(developmentUrl);
  } else {
    window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged && autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      // ignore update check failures
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
