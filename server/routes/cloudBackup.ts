import { Router, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { getSupabaseConnection } from '../db/supabaseClient.js';
import { BACKUP_TABLES, type WorkspaceSnapshot } from '../db/backupTables.js';

export const cloudBackupRouter = Router();
const MAX_SNAPSHOT_BYTES = 2_500_000;

function authorize(req: Request, res: Response): boolean {
  const expected = process.env.CLOUD_BACKUP_TOKEN;
  const supplied = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';
  if (!expected || expected.length < 32) {
    res.status(503).json({ error: 'Cloud backup authorization is not configured securely.' });
    return false;
  }
  if (!supplied) {
    res.status(401).json({ error: 'Cloud backup authorization is required.' });
    return false;
  }
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    res.status(401).json({ error: 'Cloud backup authorization failed.' });
    return false;
  }
  return true;
}

function workspaceId(): string {
  const id = process.env.CLOUD_BACKUP_WORKSPACE_ID;
  if (!id) throw new Error('CLOUD_BACKUP_WORKSPACE_ID is not configured.');
  return id;
}

cloudBackupRouter.get('/preview', async (req, res, next) => {
  if (!authorize(req, res)) return;
  try {
    const { client } = getSupabaseConnection();
    const rows = await client`
      SELECT counts, backed_up_at
      FROM workspace_backup_snapshots
      WHERE workspace_id = ${workspaceId()}
      ORDER BY backed_up_at DESC
      LIMIT 1
    `;
    const saved = rows[0];
    res.json({
      cloudCounts: saved?.counts ?? Object.fromEntries(Object.keys(BACKUP_TABLES).map((key) => [key, 0])),
      backedUpAt: saved?.backed_up_at ?? null,
      cloudHasData: Boolean(saved),
    });
  } catch (error) {
    next(error);
  }
});

cloudBackupRouter.post('/snapshot', async (req, res, next) => {
  if (!authorize(req, res)) return;
  try {
    if (req.body?.confirmLocalToCloud !== true) {
      res.status(400).json({ error: 'Review the local snapshot and explicitly confirm the upload.' });
      return;
    }
    const snapshot = req.body?.snapshot as WorkspaceSnapshot | undefined;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      res.status(400).json({ error: 'A workspace snapshot is required.' });
      return;
    }
    for (const key of Object.keys(BACKUP_TABLES) as (keyof typeof BACKUP_TABLES)[]) {
      if (!Array.isArray(snapshot[key]) || snapshot[key].length > 100_000 || snapshot[key].some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
        res.status(400).json({ error: `Invalid snapshot table: ${key}.` });
        return;
      }
    }
    if (Object.keys(snapshot).some((key) => !Object.hasOwn(BACKUP_TABLES, key))) {
      res.status(400).json({ error: 'Snapshot contains an unsupported table.' });
      return;
    }
    const payload = JSON.stringify(snapshot);
    if (Buffer.byteLength(payload, 'utf8') > MAX_SNAPSHOT_BYTES) {
      res.status(413).json({ error: 'Snapshot is too large for this prototype backup endpoint.' });
      return;
    }
    const counts = Object.fromEntries(
      Object.keys(BACKUP_TABLES).map((key) => [key, snapshot[key as keyof WorkspaceSnapshot].length])
    );
    const { client } = getSupabaseConnection();
    const timestamp = new Date().toISOString();
    await client`
      INSERT INTO workspace_backup_snapshots (workspace_id, payload, counts, backed_up_at)
      VALUES (${workspaceId()}, ${payload}::jsonb, ${JSON.stringify(counts)}::jsonb, ${timestamp}::timestamptz)
    `;
    res.json({ ok: true, backedUpAt: timestamp, counts });
  } catch (error) {
    next(error);
  }
});
