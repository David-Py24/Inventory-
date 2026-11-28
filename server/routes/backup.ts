import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readWorkspaceSnapshot } from '../db/backupSnapshot.js';

export const backupRouter = Router();

backupRouter.get('/snapshot', requireAuth, (_req, res, next) => {
  try {
    res.json(readWorkspaceSnapshot());
  } catch (err) {
    next(err);
  }
});
