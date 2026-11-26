import { Router } from 'express';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { HttpError } from '../middleware/errorHandler.js';
import { signToken, requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      department: users.department,
      jobTitle: users.jobTitle,
      phone: users.phone,
      status: users.status,
      createdAt: users.createdAt,
      lastActive: users.lastActive,
    }).from(users);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body ?? {};
    if (!name || !email || !password) throw new HttpError(400, 'name, email, password required');
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length) throw new HttpError(409, 'email already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const [created] = await db.insert(users).values({
      name, email, passwordHash, role: role ?? 'Staff', department: department ?? '',
    }).returning();
    const token = signToken(created.id);
    res.status(201).json({ user: created, token });
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) throw new HttpError(400, 'email and password required');
    const [found] = await db.select().from(users).where(eq(users.email, email));
    if (!found) throw new HttpError(401, 'invalid credentials');
    const ok = await bcrypt.compare(password, found.passwordHash);
    if (!ok) throw new HttpError(401, 'invalid credentials');
    if (found.status !== 'Active') throw new HttpError(403, 'account suspended');
    const token = signToken(found.id);
    res.json({ user: found, token });
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const [found] = await db.select().from(users).where(eq(users.id, req.userId!));
    if (!found) throw new HttpError(404, 'not found');
    res.json(found);
  } catch (err) {
    next(err);
  }
});
