import express from 'express';
import { cloudBackupRouter } from './routes/cloudBackup.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createCloudBackupApp() {
  const app = express();
  app.use(express.json({ limit: '3mb' }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use('/api/backup/cloud', cloudBackupRouter);
  app.use(errorHandler);
  return app;
}
