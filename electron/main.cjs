const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch {
  autoUpdater = null;
}

const developmentUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:8080';
const appRoot = app.isPackaged ? app.getAppPath() : path.resolve(__dirname, '..');
let localServer = null;

// Electron only accepts documented app path names here. Its cache path is
// writable under the system temp directory; GPU cache is Chromium-managed.
app.setPath('cache', path.join(app.getPath('temp'), 'tallyledger-cache'));

function createWindow(rendererUrl) {
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

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(developmentUrl);
  } else {
    window.loadURL(rendererUrl);
  }

  return window;
}

app.whenReady().then(async () => {
  let rendererUrl = developmentUrl;
  if (!process.env.ELECTRON_RENDERER_URL) {
    process.env.SQLITE_DB_PATH = path.join(app.getPath('userData'), 'tallyledger.db');
    process.env.DATABASE_URL ||= 'postgres://localhost:5432/tallyledger';
    const { startServer } = await import(pathToFileURL(path.join(appRoot, 'server.js')).href);
    localServer = await startServer({ port: 0, host: '127.0.0.1' });
    const address = localServer.address();
    if (!address || typeof address === 'string') throw new Error('Local API server did not provide a TCP address.');
    rendererUrl = `http://127.0.0.1:${address.port}`;
  }
  createWindow(rendererUrl);

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

app.on('before-quit', () => {
  if (localServer) localServer.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
