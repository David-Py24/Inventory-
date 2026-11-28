To add Electron to your React/Vite project without breaking standard web builds, isolate all desktop-specific files inside a dedicated `electron/` directory, configure Vite with relative asset paths (`base: './'`), and expose desktop APIs strictly through a secure `preload` bridge rather than importing Node modules directly into your React components.

  

### 1. Install Electron & Dev Orchestration Dependencies

On your `feat/standalone-hybrid` branch, install Electron alongside `concurrently` and `wait-on` as **devDependencies** so they never bloat your web production bundle:

  

Bash

```
npm install -D electron electron-builder concurrently wait-on
```

_Verification:_ Check `package.json` and confirm `electron`, `electron-builder`, `concurrently`, and `wait-on` appear under `"devDependencies"`, while `"dependencies"` remains unchanged.

  

### 2. Create the Isolated `electron/` Folder

Keep Electron's main process and preload script completely separate from `src/` so Vite's web bundler never touches Node-only modules (`fs`, `path`, `better-sqlite3`).

  

**`electron/main.cjs`** _(Using `.cjs` avoids ESM/CommonJS conflicts if your `package.json` has `"type": "module"`)_

  

JavaScript

```
const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Loads the standard Vite production build output
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

**`electron/preload.cjs`** _(Safe bridge for future local SQLite or file operations)_

  

JavaScript

```
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  // Add IPC channels here later when wiring local SQLite
  ping: () => ipcRenderer.invoke('ping'),
});
```

_Verification:_ Confirm `electron/main.cjs` and `electron/preload.cjs` exist at the project root alongside `src/`, with zero imports inside `src/` referencing them.

  

### 3. Configure `vite.config.js` (or `.ts`) for Relative Paths

In a web browser, Vite serves assets from `/assets/...`. In packaged Electron (`file://` protocol), leading slashes resolve to the root of your hard drive (`C:/assets/...`) and produce a blank white screen unless `base` is set to `'./'`.

  

JavaScript

```
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Works identically on both web servers and Electron file:// loads
});
```

_Note on React Router:_ If you use `BrowserRouter`, switch to `HashRouter` (or conditionally select `HashRouter` when `window.desktopAPI?.isDesktop` is true) so page refreshes inside Electron don't fail on `file://` routes.

  

_Verification:_ Run `npm run build` and inspect `dist/index.html`—script and CSS `src`/`href` attributes must begin with `./assets/...` rather than `/assets/...`.

  

### 4. Add Parallel Scripts to `package.json`

Keep your existing `"dev"` and `"build"` scripts untouched for web deployments, and add separate `"desktop:*"` scripts alongside `"main"`:

  

JSON

```
{
  "name": "your-app",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "desktop:dev": "concurrently -k \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "desktop:build": "npm run build && electron-builder --dir"
  },
  "build": {
    "appId": "com.yourbrand.storeapp",
    "files": [
      "dist/**/*",
      "electron/**/*"
    ]
  }
}
```

_Verification:_

  

1. Run `npm run build` — confirms your standard web build succeeds cleanly without Electron interference.
    
2. Run `npm run desktop:dev` — starts Vite on port `5173` and opens your React app inside a native Electron desktop window with hot-reload active.
    

### 5. Guard Desktop Features in React (`window.desktopAPI`)

Whenever you later add local SQLite or offline sync triggers inside your React code, check for `window.desktopAPI` first so the exact same React codebase still runs in a regular browser:

JavaScript

```
const isDesktop = Boolean(window.desktopAPI?.isDesktop);

if (isDesktop) {
  // Route reads/writes to local SQLite via preload IPC
} else {
  // Fall back to standard web/cloud behavior
}
```