import express from 'express';
import { cloudBackupRouter } from './routes/cloudBackup.js';
import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';
import { productsRouter } from './routes/products.js';
import { batchesRouter } from './routes/batches.js';
import { utangRouter } from './routes/utang.js';
import { workspaceRouter } from './routes/workspace.js';
import { backupRouter } from './routes/backup.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { persistentWorkspaceMiddleware } from './middleware/persistentWorkspace.js';

export function createApp(options: { hostedWorkspace?: boolean } = {}) {
  const app = express();
  app.use(express.json({ limit: options.hostedWorkspace ? '3mb' : '1mb' }));

  if (options.hostedWorkspace) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      }
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });
    app.use('/api/backup/cloud', cloudBackupRouter);
  }

  app.use(authMiddleware);
  if (options.hostedWorkspace) app.use(persistentWorkspaceMiddleware);

  app.use('/api', healthRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/auth', usersRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/utang', utangRouter);
  app.use('/api/workspace', workspaceRouter);
  app.use('/api/backup', backupRouter);

  app.use((_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use(errorHandler);
  return app;
}
