import { Router } from 'express';
import { sqlite, newId, withSqliteTransaction } from '../db/sqlite.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

export const utangRouter = Router();

function formatCustomer(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    alias: row.alias ? String(row.alias) : undefined,
    contactNumber: row.contact_number ? String(row.contact_number) : undefined,
    creditLimit: Number(row.credit_limit),
    currentBalance: Number(row.current_balance),
    updatedAt: String(row.updated_at),
  };
}

function formatTransaction(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    type: String(row.type),
    amount: Number(row.amount),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
  };
}

utangRouter.get('/customers', requireAuth, (_req, res, next) => {
  try {
    const rows = sqlite.prepare('SELECT * FROM utang_customers ORDER BY full_name').all();
    res.json(rows.map(formatCustomer));
  } catch (err) { next(err); }
});

utangRouter.post('/customers', requireAuth, (req, res, next) => {
  try {
    const { fullName, alias, contactNumber, creditLimit } = req.body ?? {};
    if (!String(fullName ?? '').trim()) throw new HttpError(400, 'fullName is required');
    const limit = Number(creditLimit ?? 500);
    if (!Number.isFinite(limit) || limit < 0 || !Number.isInteger(limit * 100)) throw new HttpError(400, 'creditLimit must be non-negative and use cents');
    const id = newId();
    const now = new Date().toISOString();
    sqlite.prepare('INSERT INTO utang_customers (id, full_name, alias, contact_number, credit_limit, current_balance, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
      .run(id, String(fullName).trim(), alias ?? null, contactNumber ?? null, limit, now);
    res.status(201).json(formatCustomer(sqlite.prepare('SELECT * FROM utang_customers WHERE id = ?').get(id)!));
  } catch (err) { next(err); }
});

utangRouter.patch('/customers/:id', requireAuth, (req, res, next) => {
  try {
    const current = sqlite.prepare('SELECT * FROM utang_customers WHERE id = ?').get(req.params.id);
    if (!current) throw new HttpError(404, 'customer not found');
    const b = req.body ?? {};
    const limit = b.creditLimit === undefined ? Number(current.credit_limit) : Number(b.creditLimit);
    if (!Number.isFinite(limit) || limit < 0 || !Number.isInteger(limit * 100)) throw new HttpError(400, 'creditLimit must be non-negative and use cents');
    sqlite.prepare('UPDATE utang_customers SET full_name = ?, alias = ?, contact_number = ?, credit_limit = ?, updated_at = ? WHERE id = ?')
      .run(b.fullName !== undefined ? String(b.fullName).trim() : current.full_name, b.alias !== undefined ? b.alias || null : current.alias, b.contactNumber !== undefined ? b.contactNumber || null : current.contact_number, limit, new Date().toISOString(), req.params.id);
    res.json(formatCustomer(sqlite.prepare('SELECT * FROM utang_customers WHERE id = ?').get(req.params.id)!));
  } catch (err) { next(err); }
});

utangRouter.delete('/customers/:id', requireAuth, (req, res, next) => {
  try {
    const hasHistory = sqlite.prepare('SELECT id FROM utang_transactions WHERE customer_id = ? LIMIT 1').get(req.params.id);
    if (hasHistory) throw new HttpError(409, 'customers with ledger history cannot be deleted');
    const result = sqlite.prepare('DELETE FROM utang_customers WHERE id = ?').run(req.params.id);
    if (!Number(result.changes)) throw new HttpError(404, 'customer not found');
    res.status(204).send();
  } catch (err) { next(err); }
});

utangRouter.get('/customers/:id/transactions', requireAuth, (req, res, next) => {
  try {
    const rows = sqlite.prepare('SELECT * FROM utang_transactions WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(rows.map(formatTransaction));
  } catch (err) { next(err); }
});

utangRouter.post('/customers/:id/transactions', requireAuth, (req, res, next) => {
  try {
    const { type, notes } = req.body ?? {};
    const amount = Number(req.body?.amount);
    if (type !== 'CREDIT' && type !== 'PAYMENT') throw new HttpError(400, "type must be 'CREDIT' or 'PAYMENT'");
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount * 100)) throw new HttpError(400, 'amount must be positive and use cents');
    const result = withSqliteTransaction(() => {
      const customer = sqlite.prepare('SELECT * FROM utang_customers WHERE id = ?').get(req.params.id);
      if (!customer) throw new HttpError(404, 'customer not found');
      const balance = Number(customer.current_balance);
      if (type === 'PAYMENT' && amount > balance) throw new HttpError(409, 'payment exceeds outstanding balance');
      if (type === 'CREDIT' && balance + amount > Number(customer.credit_limit)) throw new HttpError(409, 'credit would exceed the customer credit limit');
      const now = new Date().toISOString();
      const id = newId();
      sqlite.prepare('INSERT INTO utang_transactions (id, customer_id, type, amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, req.params.id, type, amount, notes ?? null, now);
      const nextBalance = type === 'CREDIT' ? balance + amount : balance - amount;
      sqlite.prepare('UPDATE utang_customers SET current_balance = ?, updated_at = ? WHERE id = ?').run(nextBalance, now, req.params.id);
      return {
        customer: formatCustomer(sqlite.prepare('SELECT * FROM utang_customers WHERE id = ?').get(req.params.id)!),
        transaction: formatTransaction(sqlite.prepare('SELECT * FROM utang_transactions WHERE id = ?').get(id)!),
      };
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

utangRouter.get('/customers/:id/reminder', requireAuth, (req, res, next) => {
  try {
    const customer = sqlite.prepare('SELECT * FROM utang_customers WHERE id = ?').get(req.params.id);
    if (!customer) throw new HttpError(404, 'customer not found');
    const balance = Number(customer.current_balance).toFixed(2);
    const name = String(customer.alias || customer.full_name);
    res.json({
      tagalog: `Kumusta ${name}, paalala lang na may utang ka na ₱${balance}. Salamat!`,
      bisaya: `Kumusta ${name}, pahinumdom lang nga may utang ka nga ₱${balance}. Salamat!`,
      english: `Hi ${name}, friendly reminder that your balance is ₱${balance}. Thank you!`,
    });
  } catch (err) { next(err); }
});
