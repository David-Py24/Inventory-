import { Router } from 'express';
import { SQLITE_DB_PATH, getSyncMeta } from '../db/sqlite.js';
import { isSupabaseDatabaseConfigured } from '../db/supabaseClient.js';
import { isCloudReachable, pullCloudToSqlite, pushSqliteToCloud } from '../db/syncService.js';
import { requireAuth } from '../middleware/auth.js';

export const backupRouter = Router();

backupRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    const supabaseConfigured = isSupabaseDatabaseConfigured();
    const supabaseReachable =
      req.query.check === 'true' ? await isCloudReachable() : undefined;

    res.json({
      mode: 'sqlite',
      dbPath: SQLITE_DB_PATH,
      lastBackupAt: getSyncMeta('last_backup_at'),
      lastRestoreAt: getSyncMeta('last_restore_at'),
      supabaseConfigured,
      ...(supabaseReachable !== undefined ? { supabaseReachable } : {}),
    });
  } catch (err) {
    next(err);
  }
});

backupRouter.post('/push', requireAuth, async (_req, res, next) => {
  try {
    const result = await pushSqliteToCloud();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

backupRouter.post('/pull', requireAuth, async (_req, res, next) => {
  try {
    const result = await pullCloudToSqlite();
    res.json(result);
  } catch (err) {
    next(err);
  }
});
