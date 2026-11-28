import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const isElectronPreview = process.env.ELECTRON_PREVIEW === 'true';
  return {
    // Electron loads the packaged renderer from file://, so its assets must
    // resolve relative to the packaged index.html. Web builds stay root-based.
    base: mode === 'desktop' ? './' : '/',
    define: {
      'import.meta.env.VITE_HOSTED_RUNTIME': JSON.stringify(mode === 'vercel'),
    },
    cacheDir: isElectronPreview
      ? path.resolve(__dirname, 'node_modules/.vite-electron-preview')
      : undefined,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: isElectronPreview
        ? { port: 24679 }
        : process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
