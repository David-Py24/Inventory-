import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';
import { sqlite, newId } from '../db/sqlite.js';
import { getSupabaseConnection } from '../db/supabaseClient.js';
import { users as pgUsers } from '../db/schema.js';
import { isCloudReachable, pullCloudToSqlite, upsertLocalUserToCloud } from '../db/syncService.js';
import { HttpError } from '../middleware/errorHandler.js';
import { signToken, requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const usersRouter = Router();

interface SqliteUserRow {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  password_hash: string;
  role: string;
  department: string;
  job_title: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  last_active: string | null;
}

function formatDateLabel(iso: string | null): string {
  if (!iso) return 'Active now';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function toClientUser(row: SqliteUserRow) {
  return {
    id: row.id,
    name: row.name,
    ...(row.username ? { username: row.username } : {}),
    email: row.email ?? '',
    password: '',
    role: row.role,
    department: row.department,
    ...(row.job_title ? { jobTitle: row.job_title } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
    status: row.status,
    createdAt: formatDateLabel(row.created_at),
    lastActive: row.last_active ? formatDateLabel(row.last_active) : 'Active now',
  };
}

function findLocalUserByIdentifier(identifier: string): SqliteUserRow | undefined {
  return sqlite
    .prepare(
      `SELECT * FROM users
       WHERE lower(username) = lower(?)
          OR lower(email) = lower(?)
          OR lower(name) = lower(?)
       LIMIT 1`
    )
    .get(identifier, identifier, identifier) as unknown as SqliteUserRow | undefined;
}

usersRouter.get('/', requireAuth, (_req, res, next) => {
  try {
    const rows = sqlite
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all() as unknown as SqliteUserRow[];
    res.json(rows.map(toClientUser));
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/signup', async (req, res, next) => {
  try {
    const { name, username, email, password, role, department, mode } = req.body ?? {};
    const authMode = mode === 'online' ? 'online' : 'offline';
    const cleanName = name ? String(name).trim() : '';
    const cleanUsername = username ? String(username).trim() : null;
    const cleanEmail = email ? String(email).trim() : null;

    if (!cleanName || !password) {
      throw new HttpError(400, 'name and password are required');
    }
    if (authMode === 'online' && !cleanEmail) {
      throw new HttpError(400, 'email is required for Online mode');
    }
    if (!cleanUsername && !cleanEmail) {
      throw new HttpError(400, 'username or email is required');
    }

    if (cleanUsername) {
      const existingUsername = sqlite
        .prepare('SELECT id FROM users WHERE lower(username) = lower(?)')
        .get(cleanUsername);
      if (existingUsername) throw new HttpError(409, 'username already exists');
    }

    if (cleanEmail) {
      const existingEmail = sqlite
        .prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
        .get(cleanEmail);
      if (existingEmail) throw new HttpError(409, 'email already exists');
    }

    if (authMode === 'online') {
      const reachable = await isCloudReachable();
      if (!reachable) {
        throw new HttpError(
          503,
          'Cloud database is unreachable. Switch to Offline mode to register locally.'
        );
      }
      if (cleanEmail) {
        const { db: cloudDb } = getSupabaseConnection();
        const existingCloud = await cloudDb
          .select({ id: pgUsers.id })
          .from(pgUsers)
          .where(eq(pgUsers.email, cleanEmail));
        if (existingCloud.length > 0) {
          throw new HttpError(409, 'email already exists in cloud backup');
        }
      }
      if (cleanUsername) {
        const { db: cloudDb } = getSupabaseConnection();
        const existingCloudUser = await cloudDb
          .select({ id: pgUsers.id })
          .from(pgUsers)
          .where(eq(pgUsers.username, cleanUsername));
        if (existingCloudUser.length > 0) {
          throw new HttpError(409, 'username already exists in cloud backup');
        }
      }
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const id = newId();
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO users (id, name, username, email, password_hash, role, department, status, created_at, last_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        cleanName,
        cleanUsername,
        cleanEmail,
        passwordHash,
        String(role ?? 'Staff'),
        String(department ?? ''),
        'Active',
        now,
        now
      );
    const created = sqlite
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as SqliteUserRow;

    if (authMode === 'online') {
      await upsertLocalUserToCloud(created);
    }

    const token = signToken(created.id);
    res.status(201).json({ user: toClientUser(created), token, authMode });
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/login', async (req, res, next) => {
  try {
    const { identifier, email, password, mode, syncFromCloud } = req.body ?? {};
    const loginId = String(identifier ?? email ?? '').trim();
    if (!loginId || !password) throw new HttpError(400, 'username/email and password required');
    const authMode = mode === 'online' ? 'online' : 'offline';

    if (authMode === 'offline') {
      const found = findLocalUserByIdentifier(loginId);
      if (!found) throw new HttpError(401, 'invalid credentials');
      const ok = await bcrypt.compare(String(password), found.password_hash);
      if (!ok) throw new HttpError(401, 'invalid credentials');
      if (found.status !== 'Active') throw new HttpError(403, 'account suspended');
      const now = new Date().toISOString();
      sqlite.prepare('UPDATE users SET last_active = ? WHERE id = ?').run(now, found.id);
      const updated = sqlite
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(found.id) as unknown as SqliteUserRow;
      const token = signToken(found.id);
      res.json({ user: toClientUser(updated ?? found), token, authMode: 'offline' });
      return;
    }

    const reachable = await isCloudReachable();
    if (!reachable) {
      throw new HttpError(
        503,
        'Cloud database is unreachable. Switch to Offline mode to sign in locally.'
      );
    }

    let found = findLocalUserByIdentifier(loginId);
    let syncedFromCloud = false;

    if (!found) {
      const { db: cloudDb } = getSupabaseConnection();
      const [cloudUser] = await cloudDb
        .select()
        .from(pgUsers)
        .where(or(eq(pgUsers.email, loginId), eq(pgUsers.username, loginId)));
      if (!cloudUser) throw new HttpError(401, 'invalid credentials');
      const ok = await bcrypt.compare(String(password), cloudUser.passwordHash);
      if (!ok) throw new HttpError(401, 'invalid credentials');
      if (cloudUser.status !== 'Active') throw new HttpError(403, 'account suspended');

      await pullCloudToSqlite();
      syncedFromCloud = true;
      found = findLocalUserByIdentifier(loginId);
      if (!found) throw new HttpError(500, 'failed to load restored user');
    } else {
      const ok = await bcrypt.compare(String(password), found.password_hash);
      if (!ok) throw new HttpError(401, 'invalid credentials');
      if (found.status !== 'Active') throw new HttpError(403, 'account suspended');

      if (syncFromCloud) {
        await pullCloudToSqlite();
        syncedFromCloud = true;
        found = findLocalUserByIdentifier(loginId) ?? found;
      } else {
        await upsertLocalUserToCloud(found);
      }
    }

    const now = new Date().toISOString();
    sqlite.prepare('UPDATE users SET last_active = ? WHERE id = ?').run(now, found.id);
    const updated = sqlite
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(found.id) as unknown as SqliteUserRow;
    const token = signToken(found.id);
    res.json({
      user: toClientUser(updated ?? found),
      token,
      authMode: 'online',
      syncedFromCloud,
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/me', requireAuth, (req: AuthedRequest, res, next) => {
  try {
    const found = sqlite
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.userId!) as unknown as SqliteUserRow | undefined;
    if (!found) throw new HttpError(404, 'not found');
    res.json(toClientUser(found));
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, username, email, password, role, department, jobTitle, phone, status } =
      req.body ?? {};
    const cleanUsername = username ? String(username).trim() : null;
    const cleanEmail = email ? String(email).trim() : null;
    if (!name || !password || (!cleanUsername && !cleanEmail)) {
      throw new HttpError(400, 'name, password, and username or email are required');
    }
    if (cleanUsername) {
      const existingU = sqlite
        .prepare('SELECT id FROM users WHERE lower(username) = lower(?)')
        .get(cleanUsername);
      if (existingU) throw new HttpError(409, 'username already exists');
    }
    if (cleanEmail) {
      const existingE = sqlite
        .prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
        .get(cleanEmail);
      if (existingE) throw new HttpError(409, 'email already exists');
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const id = newId();
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO users (id, name, username, email, password_hash, role, department, job_title, phone, status, created_at, last_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        String(name),
        cleanUsername,
        cleanEmail,
        passwordHash,
        String(role ?? 'Staff'),
        String(department ?? ''),
        jobTitle ?? null,
        phone ?? null,
        String(status ?? 'Active'),
        now,
        now
      );
    const created = sqlite
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as SqliteUserRow;
    res.status(201).json(toClientUser(created));
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = sqlite
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as SqliteUserRow | undefined;
    if (!existing) throw new HttpError(404, 'user not found');

    const b = req.body ?? {};
    const passwordHash =
      b.password && String(b.password).trim().length > 0
        ? await bcrypt.hash(String(b.password), 10)
        : existing.password_hash;

    sqlite
      .prepare(
        `UPDATE users
         SET name = ?, username = ?, email = ?, password_hash = ?, role = ?, department = ?, job_title = ?, phone = ?, status = ?
         WHERE id = ?`
      )
      .run(
        b.name !== undefined ? String(b.name) : existing.name,
        b.username !== undefined ? (b.username ? String(b.username).trim() : null) : existing.username,
        b.email !== undefined ? (b.email ? String(b.email).trim() : null) : existing.email,
        passwordHash,
        b.role !== undefined ? String(b.role) : existing.role,
        b.department !== undefined ? String(b.department) : existing.department,
        b.jobTitle !== undefined ? b.jobTitle || null : existing.job_title,
        b.phone !== undefined ? b.phone || null : existing.phone,
        b.status !== undefined ? String(b.status) : existing.status,
        id
      );

    const updated = sqlite
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as SqliteUserRow;
    res.json(toClientUser(updated));
  } catch (err) {
    next(err);
  }
});

usersRouter.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const result = sqlite.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (Number(result.changes) === 0) throw new HttpError(404, 'user not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
