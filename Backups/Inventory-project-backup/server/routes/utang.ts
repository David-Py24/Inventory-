import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { utangCustomers, utangTransactions } from '../db/schema.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

export const utangRouter = Router();

utangRouter.get('/customers', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(utangCustomers).orderBy(utangCustomers.fullName);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

utangRouter.post('/customers', requireAuth, async (req, res, next) => {
  try {
    const { fullName, alias, contactNumber, creditLimit, currentBalance } = req.body ?? {};
    if (!fullName) throw new HttpError(400, 'fullName is required');

    const [created] = await db
      .insert(utangCustomers)
      .values({
        fullName,
        alias: alias ?? null,
        contactNumber: contactNumber ?? null,
        creditLimit: String(creditLimit ?? 500),
        currentBalance: String(currentBalance ?? 0),
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

utangRouter.patch('/customers/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const [updated] = await db
      .update(utangCustomers)
      .set({
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.alias !== undefined ? { alias: body.alias } : {}),
        ...(body.contactNumber !== undefined ? { contactNumber: body.contactNumber } : {}),
        ...(body.creditLimit !== undefined ? { creditLimit: String(body.creditLimit) } : {}),
        ...(body.currentBalance !== undefined
          ? { currentBalance: String(body.currentBalance) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(utangCustomers.id, id))
      .returning();
    if (!updated) throw new HttpError(404, 'customer not found');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

utangRouter.delete('/customers/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(utangCustomers).where(eq(utangCustomers.id, id)).returning();
    if (!deleted.length) throw new HttpError(404, 'customer not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

utangRouter.get('/customers/:id/transactions', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select()
      .from(utangTransactions)
      .where(eq(utangTransactions.customerId, id))
      .orderBy(desc(utangTransactions.createdAt));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

utangRouter.post('/customers/:id/transactions', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, amount, notes } = req.body ?? {};
    if (type !== 'CREDIT' && type !== 'PAYMENT') {
      throw new HttpError(400, "type must be 'CREDIT' or 'PAYMENT'");
    }
    const value = Number(amount ?? 0);
    if (value <= 0) throw new HttpError(400, 'amount must be greater than 0');

    const [customer] = await db.select().from(utangCustomers).where(eq(utangCustomers.id, id));
    if (!customer) throw new HttpError(404, 'customer not found');

    const currentBalance = Number(customer.currentBalance);
    const nextBalance =
      type === 'CREDIT' ? currentBalance + value : Math.max(0, currentBalance - value);

    const [transaction] = await db
      .insert(utangTransactions)
      .values({
        customerId: id,
        type,
        amount: String(value),
        notes: notes ?? null,
      })
      .returning();

    const [updatedCustomer] = await db
      .update(utangCustomers)
      .set({ currentBalance: String(nextBalance), updatedAt: new Date() })
      .where(eq(utangCustomers.id, id))
      .returning();

    res.status(201).json({ customer: updatedCustomer, transaction });
  } catch (err) {
    next(err);
  }
});

utangRouter.get('/customers/:id/reminder', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [customer] = await db.select().from(utangCustomers).where(eq(utangCustomers.id, id));
    if (!customer) throw new HttpError(404, 'customer not found');

    const balance = Number(customer.currentBalance).toFixed(2);
    const name = customer.alias || customer.fullName;

    res.json({
      tagalog: `Kumusta ${name}, paalala lang na may utang ka na ₱${balance}. Salamat!`,
      bisaya: `Kumusta ${name}, pahinumdom lang nga may utang ka nga ₱${balance}. Salamat!`,
      english: `Hi ${name}, friendly reminder that your balance is ₱${balance}. Thank you!`,
    });
  } catch (err) {
    next(err);
  }
});