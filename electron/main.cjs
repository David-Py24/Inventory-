const { app, BrowserWindow } = require('electron');
const path = require('node:path');

let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch {
  autoUpdater = null;
}

const developmentUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:8080';
const appRoot = app.isPackaged ? app.getAppPath() : path.resolve(__dirname, '..');

// Electron only accepts documented app path names here. Its cache path is
// writable under the system temp directory; GPU cache is Chromium-managed.
app.setPath('cache', path.join(app.getPath('temp'), 'tallyledger-cache'));

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    icon: path.join(appRoot, app.isPackaged ? 'dist/app-icon.png' : 'public/app-icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (app.isPackaged) {
    window.loadFile(path.join(appRoot, 'dist', 'index.html'));
  } else if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(developmentUrl);
  } else {
    window.loadFile(path.join(appRoot, 'dist', 'index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged && autoUpdater) {
    autoUpdater.on('error', (error) => {
      console.error('[updater] Update check failed:', error);
    });
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('[updater] Update check failed:', error);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
