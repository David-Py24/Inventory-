import { Router } from 'express';
import { sqlite, newId, withSqliteTransaction } from '../db/sqlite.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

export const workspaceRouter = Router();

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
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

function formatInventoryRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    category: String(row.category),
    location: String(row.location ?? ''),
    supplier: String(row.supplier ?? ''),
    quantity: Number(row.quantity ?? 0),
    reorderPoint: Number(row.reorder_point ?? 0),
    unitCost: Number(row.unit_cost ?? 0),
    lastUpdated: String(row.last_updated ?? ''),
  };
}

function formatSaleRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    customerName: String(row.customer_name),
    channel: String(row.channel),
    ...(row.inventory_item_id ? { inventoryItemId: String(row.inventory_item_id) } : {}),
    itemName: String(row.item_name),
    ...(row.sku ? { sku: String(row.sku) } : {}),
    quantity: Number(row.quantity ?? 1),
    unitPrice: Number(row.unit_price ?? 0),
    status: String(row.status),
    date: String(row.date),
    ...(row.notes ? { notes: String(row.notes) } : {}),
  };
}

workspaceRouter.get('/', requireAuth, (_req, res, next) => {
  try {
    const accountRows = sqlite.prepare('SELECT * FROM accounts ORDER BY name ASC').all();
    const inventoryRows = sqlite.prepare('SELECT * FROM inventory_items ORDER BY name ASC').all();
    const saleRows = sqlite.prepare('SELECT * FROM sales ORDER BY created_at DESC').all();
    const billRows = sqlite.prepare('SELECT * FROM upcoming_bills').all();
    const fundRows = sqlite.prepare('SELECT * FROM sinking_funds').all();
    const goalRows = sqlite.prepare('SELECT * FROM goals').all();
    const txRows = sqlite.prepare('SELECT * FROM transactions').all();
    const cashFlowRows = sqlite.prepare('SELECT * FROM monthly_cash_flow').all();
    const userRows = sqlite.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    const rawSettings = sqlite.prepare('SELECT * FROM workspace_settings LIMIT 1').get();

    res.json({
      accounts: accountRows.map((a) => ({
        id: String(a.id),
        name: String(a.name),
        institution: String(a.institution),
        mask: String(a.mask),
        category: String(a.category),
        isLiability: Boolean(a.is_liability),
        balance: Number(a.balance),
        apyOrApr: String(a.apy_or_apr ?? ''),
        lastSynced: String(a.last_synced ?? ''),
      })),
      inventory: inventoryRows.map(formatInventoryRow),
      sales: saleRows.map(formatSaleRow),
      bills: billRows.map((b) => ({
        id: String(b.id),
        name: String(b.name),
        dueDate: String(b.due_date),
        amount: Number(b.amount),
        category: String(b.category ?? ''),
        paid: Boolean(b.paid),
      })),
      sinkingFunds: fundRows.map((f) => ({
        id: String(f.id),
        name: String(f.name),
        saved: Number(f.saved),
        target: Number(f.target),
      })),
      goals: goalRows.map((g) => ({
        id: String(g.id),
        name: String(g.name),
        saved: Number(g.saved),
        target: Number(g.target),
      })),
      transactions: txRows.map((t) => ({
        id: String(t.id),
        merchant: String(t.merchant),
        date: String(t.date),
        category: String(t.category ?? ''),
        amount: Number(t.amount),
      })),
      monthlyCashFlow: cashFlowRows.map((m) => ({
        month: String(m.month),
        income: Number(m.income),
        expenses: Number(m.expenses),
      })),
      users: userRows.map((u) => ({
        id: String(u.id),
        name: String(u.name),
        ...(u.username ? { username: String(u.username) } : {}),
        email: u.email ? String(u.email) : '',
        password: '',
        role: String(u.role),
        department: String(u.department ?? ''),
        ...(u.job_title ? { jobTitle: String(u.job_title) } : {}),
        ...(u.phone ? { phone: String(u.phone) } : {}),
        status: String(u.status),
        createdAt: formatDateLabel(String(u.created_at)),
        lastActive: formatDateLabel(u.last_active ? String(u.last_active) : null),
      })),
      settings: rawSettings
        ? {
            storeName: String(rawSettings.store_name),
            workspaceSubtitle: String(rawSettings.workspace_subtitle),
            ownerEmail: String(rawSettings.owner_email ?? ''),
            currency: String(rawSettings.currency),
            defaultTimeframe: String(rawSettings.default_timeframe),
            budgetCycleDay: String(rawSettings.budget_cycle_day),
            defaultReorderPoint: Number(rawSettings.default_reorder_point),
            lowStockAlerts: Boolean(rawSettings.low_stock_alerts),
            includeBillsInSafeToSpend: Boolean(rawSettings.include_bills_in_safe_to_spend),
            inventoryColumnLabels: JSON.parse(
              String(rawSettings.inventory_column_labels || '{}')
            ),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// Inventory CRUD
workspaceRouter.post('/inventory', requireAuth, (req, res, next) => {
  try {
    const { sku, name, category, location, supplier, quantity, reorderPoint, unitCost } =
      req.body ?? {};
    if (!sku || !name || !category) {
      throw new HttpError(400, 'sku, name, and category are required');
    }
    const id = newId();
    const lastUpdated = formatToday();
    sqlite
      .prepare(
        `INSERT INTO inventory_items (id, sku, name, category, location, supplier, quantity, reorder_point, unit_cost, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        String(sku),
        String(name),
        String(category),
        String(location ?? ''),
        String(supplier ?? ''),
        Number(quantity ?? 0),
        Number(reorderPoint ?? 0),
        Number(unitCost ?? 0),
        lastUpdated
      );
    const created = sqlite.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id)!;
    res.status(201).json(formatInventoryRow(created));
  } catch (err) {
    next(err);
  }
});

workspaceRouter.patch('/inventory/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = sqlite.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'inventory item not found');
    const b = req.body ?? {};
    sqlite
      .prepare(
        `UPDATE inventory_items
         SET sku = ?, name = ?, category = ?, location = ?, supplier = ?, quantity = ?, reorder_point = ?, unit_cost = ?, last_updated = ?
         WHERE id = ?`
      )
      .run(
        b.sku !== undefined ? String(b.sku) : existing.sku,
        b.name !== undefined ? String(b.name) : existing.name,
        b.category !== undefined ? String(b.category) : existing.category,
        b.location !== undefined ? String(b.location) : existing.location,
        b.supplier !== undefined ? String(b.supplier) : existing.supplier,
        b.quantity !== undefined ? Number(b.quantity) : existing.quantity,
        b.reorderPoint !== undefined ? Number(b.reorderPoint) : existing.reorder_point,
        b.unitCost !== undefined ? Number(b.unitCost) : existing.unit_cost,
        formatToday(),
        id
      );
    const updated = sqlite.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id)!;
    res.json(formatInventoryRow(updated));
  } catch (err) {
    next(err);
  }
});

workspaceRouter.post('/inventory/:id/adjust', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const delta = Number(req.body?.delta ?? 0);
    const current = sqlite.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
    if (!current) throw new HttpError(404, 'inventory item not found');
    const nextQty = Math.max(0, Number(current.quantity) + delta);
    sqlite
      .prepare('UPDATE inventory_items SET quantity = ?, last_updated = ? WHERE id = ?')
      .run(nextQty, formatToday(), id);
    const updated = sqlite.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id)!;
    res.json(formatInventoryRow(updated));
  } catch (err) {
    next(err);
  }
});

workspaceRouter.delete('/inventory/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const result = sqlite.prepare('DELETE FROM inventory_items WHERE id = ?').run(id);
    if (Number(result.changes) === 0) throw new HttpError(404, 'inventory item not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Sales CRUD
workspaceRouter.post('/sales', requireAuth, (req, res, next) => {
  try {
    const {
      orderNumber,
      customerName,
      channel,
      inventoryItemId,
      itemName,
      sku,
      quantity,
      unitPrice,
      status,
      date,
      notes,
      deductInventory,
    } = req.body ?? {};
    if (!orderNumber || !customerName || !itemName) {
      throw new HttpError(400, 'orderNumber, customerName, and itemName are required');
    }

    const qty = Number(quantity ?? 1);
    const result = withSqliteTransaction(() => {
      const saleId = newId();
      const now = new Date().toISOString();
      sqlite
        .prepare(
          `INSERT INTO sales (id, order_number, customer_name, channel, inventory_item_id, item_name, sku, quantity, unit_price, status, date, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          saleId,
          String(orderNumber),
          String(customerName),
          String(channel ?? 'In-Store'),
          inventoryItemId || null,
          String(itemName),
          sku ?? null,
          qty,
          Number(unitPrice ?? 0),
          String(status ?? 'Completed'),
          String(date ?? formatToday()),
          notes ?? null,
          now
        );

      let updatedInventory = null;
      if (deductInventory && inventoryItemId) {
        const item = sqlite
          .prepare('SELECT * FROM inventory_items WHERE id = ?')
          .get(String(inventoryItemId));
        if (item) {
          const nextQty = Math.max(0, Number(item.quantity) - qty);
          sqlite
            .prepare('UPDATE inventory_items SET quantity = ?, last_updated = ? WHERE id = ?')
            .run(nextQty, formatToday(), String(inventoryItemId));
          const inv = sqlite
            .prepare('SELECT * FROM inventory_items WHERE id = ?')
            .get(String(inventoryItemId))!;
          updatedInventory = formatInventoryRow(inv);
        }
      }

      const createdSale = sqlite.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)!;
      return { sale: formatSaleRow(createdSale), updatedInventory };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

workspaceRouter.patch('/sales/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = sqlite.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'sale not found');
    const b = req.body ?? {};
    sqlite
      .prepare(
        `UPDATE sales
         SET order_number = ?, customer_name = ?, channel = ?, inventory_item_id = ?, item_name = ?, sku = ?, quantity = ?, unit_price = ?, status = ?, date = ?, notes = ?
         WHERE id = ?`
      )
      .run(
        b.orderNumber !== undefined ? String(b.orderNumber) : existing.order_number,
        b.customerName !== undefined ? String(b.customerName) : existing.customer_name,
        b.channel !== undefined ? String(b.channel) : existing.channel,
        b.inventoryItemId !== undefined ? b.inventoryItemId || null : existing.inventory_item_id,
        b.itemName !== undefined ? String(b.itemName) : existing.item_name,
        b.sku !== undefined ? b.sku ?? null : existing.sku,
        b.quantity !== undefined ? Number(b.quantity) : existing.quantity,
        b.unitPrice !== undefined ? Number(b.unitPrice) : existing.unit_price,
        b.status !== undefined ? String(b.status) : existing.status,
        b.date !== undefined ? String(b.date) : existing.date,
        b.notes !== undefined ? b.notes ?? null : existing.notes,
        id
      );
    const updated = sqlite.prepare('SELECT * FROM sales WHERE id = ?').get(id)!;
    res.json(formatSaleRow(updated));
  } catch (err) {
    next(err);
  }
});

workspaceRouter.delete('/sales/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const result = sqlite.prepare('DELETE FROM sales WHERE id = ?').run(id);
    if (Number(result.changes) === 0) throw new HttpError(404, 'sale not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Bills
workspaceRouter.post('/bills', requireAuth, (req, res, next) => {
  try {
    const { name, dueDate, amount, category } = req.body ?? {};
    if (!name || !dueDate) throw new HttpError(400, 'name and dueDate are required');
    const id = newId();
    sqlite
      .prepare(
        'INSERT INTO upcoming_bills (id, name, due_date, amount, category, paid) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(id, String(name), String(dueDate), Number(amount ?? 0), String(category ?? ''), 0);
    const created = sqlite.prepare('SELECT * FROM upcoming_bills WHERE id = ?').get(id)!;
    res.status(201).json({
      id: String(created.id),
      name: String(created.name),
      dueDate: String(created.due_date),
      amount: Number(created.amount),
      category: String(created.category ?? ''),
      paid: Boolean(created.paid),
    });
  } catch (err) {
    next(err);
  }
});

workspaceRouter.patch('/bills/:id/toggle', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const current = sqlite.prepare('SELECT * FROM upcoming_bills WHERE id = ?').get(id);
    if (!current) throw new HttpError(404, 'bill not found');
    const nextPaid = current.paid ? 0 : 1;
    sqlite.prepare('UPDATE upcoming_bills SET paid = ? WHERE id = ?').run(nextPaid, id);
    res.json({
      id: String(current.id),
      name: String(current.name),
      dueDate: String(current.due_date),
      amount: Number(current.amount),
      category: String(current.category ?? ''),
      paid: Boolean(nextPaid),
    });
  } catch (err) {
    next(err);
  }
});

// Sinking Funds & Goals
workspaceRouter.post('/sinking-funds/:id/contribute', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const amount = Number(req.body?.amount ?? 0);
    const current = sqlite.prepare('SELECT * FROM sinking_funds WHERE id = ?').get(id);
    if (!current) throw new HttpError(404, 'sinking fund not found');
    const nextSaved = Math.min(Number(current.target), Math.max(0, Number(current.saved) + amount));
    sqlite.prepare('UPDATE sinking_funds SET saved = ? WHERE id = ?').run(nextSaved, id);
    res.json({
      id: String(current.id),
      name: String(current.name),
      saved: nextSaved,
      target: Number(current.target),
    });
  } catch (err) {
    next(err);
  }
});

workspaceRouter.post('/goals/:id/contribute', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const amount = Number(req.body?.amount ?? 0);
    const current = sqlite.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    if (!current) throw new HttpError(404, 'goal not found');
    const nextSaved = Math.min(Number(current.target), Math.max(0, Number(current.saved) + amount));
    sqlite.prepare('UPDATE goals SET saved = ? WHERE id = ?').run(nextSaved, id);
    res.json({
      id: String(current.id),
      name: String(current.name),
      saved: nextSaved,
      target: Number(current.target),
    });
  } catch (err) {
    next(err);
  }
});

// Settings
workspaceRouter.put('/settings', requireAuth, (req, res, next) => {
  try {
    const b = req.body ?? {};
    const existing = sqlite.prepare('SELECT id FROM workspace_settings LIMIT 1').get() as
      | { id: string }
      | undefined;
    const id = existing?.id ?? newId();
    const values = {
      storeName: String(b.storeName ?? 'TallyLedger'),
      workspaceSubtitle: String(b.workspaceSubtitle ?? 'Financial Command Center'),
      ownerEmail: String(b.ownerEmail ?? ''),
      currency: String(b.currency ?? 'USD'),
      defaultTimeframe: String(b.defaultTimeframe ?? 'this_month'),
      budgetCycleDay: String(b.budgetCycleDay ?? '1'),
      defaultReorderPoint: Number(b.defaultReorderPoint ?? 8),
      lowStockAlerts: Boolean(b.lowStockAlerts ?? true),
      includeBillsInSafeToSpend: Boolean(b.includeBillsInSafeToSpend ?? false),
      inventoryColumnLabels: b.inventoryColumnLabels ?? {},
    };

    if (existing) {
      sqlite
        .prepare(
          `UPDATE workspace_settings
           SET store_name = ?, workspace_subtitle = ?, owner_email = ?, currency = ?,
               default_timeframe = ?, budget_cycle_day = ?, default_reorder_point = ?,
               low_stock_alerts = ?, include_bills_in_safe_to_spend = ?, inventory_column_labels = ?
           WHERE id = ?`
        )
        .run(
          values.storeName,
          values.workspaceSubtitle,
          values.ownerEmail,
          values.currency,
          values.defaultTimeframe,
          values.budgetCycleDay,
          values.defaultReorderPoint,
          values.lowStockAlerts ? 1 : 0,
          values.includeBillsInSafeToSpend ? 1 : 0,
          JSON.stringify(values.inventoryColumnLabels),
          id
        );
    } else {
      sqlite
        .prepare(
          `INSERT INTO workspace_settings (
            id, store_name, workspace_subtitle, owner_email, currency,
            default_timeframe, budget_cycle_day, default_reorder_point,
            low_stock_alerts, include_bills_in_safe_to_spend, inventory_column_labels
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          values.storeName,
          values.workspaceSubtitle,
          values.ownerEmail,
          values.currency,
          values.defaultTimeframe,
          values.budgetCycleDay,
          values.defaultReorderPoint,
          values.lowStockAlerts ? 1 : 0,
          values.includeBillsInSafeToSpend ? 1 : 0,
          JSON.stringify(values.inventoryColumnLabels)
        );
    }

    res.json(values);
  } catch (err) {
    next(err);
  }
});
