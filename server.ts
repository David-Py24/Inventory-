import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './server/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startServer(options: { port?: number; host?: string } = {}) {
  const app = createApp();
  const PORT = options.port ?? (Number(process.env.PORT) || 8080);
  const HOST = options.host ?? '0.0.0.0';

  const isDev = process.argv.includes('--dev');

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  const server = await new Promise<import('node:http').Server>((resolve, reject) => {
    const listener = app.listen(PORT, HOST, () => resolve(listener));
    listener.once('error', reject);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : PORT;
  console.log(`Server running on http://${HOST}:${port}`);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
