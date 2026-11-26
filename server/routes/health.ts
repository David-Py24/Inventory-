import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TallyLedger API', time: new Date().toISOString() });
});
