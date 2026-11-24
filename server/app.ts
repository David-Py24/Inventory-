import express from 'express';
import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(authMiddleware);

  app.use('/api', healthRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/auth', usersRouter);

  app.use(errorHandler);
  return app;
}
