import type { NextFunction, Request, Response } from 'express';
import { getSupabaseConnection } from '../db/supabaseClient.js';
import { readWorkspaceSnapshot, restoreWorkspaceSnapshot } from '../db/backupSnapshot.js';

interface DeferredResponse {
  body: unknown;
  status: number;
}

function hostedWorkspaceId(): string {
  const id = process.env.CLOUD_BACKUP_WORKSPACE_ID?.trim();
  if (!id) throw new Error('CLOUD_BACKUP_WORKSPACE_ID is not configured.');
  return id;
}

function isWorkspaceApi(path: string): boolean {
  return /^\/api\/(auth|users|workspace|utang|backup)(\/|$)/.test(path) &&
    !path.startsWith('/api/backup/cloud');
}

function stripSeedDemoAdmin(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.users)) return value;
  return {
    ...payload,
    users: payload.users.filter((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return true;
      const user = entry as Record<string, unknown>;
      return !(
        user.username === 'admin' &&
        user.email === 'admin@tallyledger.local' &&
        user.name === 'Demo Admin'
      );
    }),
  };
}

/**
 * Load the hosted workspace into request-local SQLite, run the existing API,
 * then persist successful mutations to Supabase before returning the response.
 * A Postgres advisory lock serializes this single-workspace projection across
 * Vercel function instances.
 */
export function persistentWorkspaceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isWorkspaceApi(req.path)) {
    next();
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    res.status(503).json({ error: 'Hosted authentication is not configured. Set a JWT_SECRET of at least 32 characters.' });
    return;
  }

  let workspaceId: string;
  let connection: ReturnType<typeof getSupabaseConnection>;
  try {
    workspaceId = hostedWorkspaceId();
    connection = getSupabaseConnection();
  } catch {
    res.status(503).json({ error: 'Hosted workspace storage is not configured.' });
    return;
  }

  const originalSend = res.send.bind(res);
  let deferredResponse: DeferredResponse | undefined;

  void connection.client
    .begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`;

      const [savedState] = await transaction`
        SELECT payload
        FROM web_workspace_state
        WHERE workspace_id = ${workspaceId}
        FOR UPDATE
      `;

      if (savedState?.payload) {
        restoreWorkspaceSnapshot(stripSeedDemoAdmin(savedState.payload));
      } else {
        const [latestBackup] = await transaction`
          SELECT payload
          FROM workspace_backup_snapshots
          WHERE workspace_id = ${workspaceId}
          ORDER BY backed_up_at DESC
          LIMIT 1
        `;
        if (latestBackup?.payload) restoreWorkspaceSnapshot(stripSeedDemoAdmin(latestBackup.payload));
      }

      const responseReady = new Promise<DeferredResponse>((resolve) => {
        res.send = ((body?: unknown) => {
          if (!deferredResponse) {
            deferredResponse = { body, status: res.statusCode };
            resolve(deferredResponse);
          }
          return res;
        }) as Response['send'];
      });

      next();
      const pending = await responseReady;

      const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
      if (isMutation && pending.status >= 200 && pending.status < 400) {
        const { snapshot } = readWorkspaceSnapshot();
        await transaction`
          INSERT INTO web_workspace_state (workspace_id, payload, updated_at)
          VALUES (${workspaceId}, ${JSON.stringify(snapshot)}::jsonb, now())
          ON CONFLICT (workspace_id)
          DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
        `;
      }

      return pending;
    })
    .then((pending) => {
      if (res.headersSent) return;
      res.status(pending.status);
      originalSend(pending.body);
    })
    .catch((error: unknown) => {
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const code =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code?: unknown }).code
          : undefined;
      console.error('[vercel] workspace request failed', {
        errorName,
        code: typeof code === 'string' && /^[A-Z0-9_]{1,32}$/.test(code) ? code : undefined,
      });
      if (!res.headersSent) {
        res.status(503).json({ error: 'Hosted workspace storage is unavailable.' });
      }
    });
}
