import { sqlite, setSyncMeta, withSqliteTransaction } from './sqlite.js';
import { getSupabaseConnection, isSupabaseDatabaseConfigured } from './supabaseClient.js';
import {
  accounts,
  goals,
  inventoryItems,
  monthlyCashFlow,
  sales,
  sinkingFunds,
  transactions,
  upcomingBills,
  users,
  workspaceSettings,
  utangCustomers,
  utangTransactions,
} from './schema.js';
import { HttpError } from '../middleware/errorHandler.js';

function logCloudFailure(operation: string, error: unknown): void {
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  const code =
    error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined;
  console.error(`[supabase] ${operation} failed`, {
    errorName,
    code: typeof code === 'string' && /^[A-Z0-9_]{1,32}$/.test(code) ? code : undefined,
  });
}

export async function isCloudReachable(): Promise<boolean> {
  if (!isSupabaseDatabaseConfigured()) return false;
  try {
    await getSupabaseConnection().client.unsafe('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function upsertLocalUserToCloud(localUser: {
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
}): Promise<void> {
  const { db: cloudDb } = getSupabaseConnection();
  const conflictTarget = localUser.email ? users.email : users.id;
  await cloudDb
    .insert(users)
    .values({
      id: localUser.id,
      name: localUser.name,
      username: localUser.username,
      email: localUser.email,
      passwordHash: localUser.password_hash,
      role: localUser.role,
      department: localUser.department,
      jobTitle: localUser.job_title,
      phone: localUser.phone,
      status: localUser.status,
      createdAt: new Date(localUser.created_at),
      lastActive: localUser.last_active ? new Date(localUser.last_active) : null,
    })
    .onConflictDoUpdate({
      target: conflictTarget,
      set: {
        name: localUser.name,
        username: localUser.username,
        email: localUser.email,
        passwordHash: localUser.password_hash,
        role: localUser.role,
        department: localUser.department,
        jobTitle: localUser.job_title,
        phone: localUser.phone,
        status: localUser.status,
        lastActive: localUser.last_active ? new Date(localUser.last_active) : null,
      },
    });
}

export async function pushSqliteToCloud() {
  if (!isSupabaseDatabaseConfigured()) {
    throw new HttpError(503, 'SUPABASE_DATABASE_URL is not configured for online backups');
  }
  const { db: cloudDb } = getSupabaseConnection();

  const localUsers = sqlite.prepare('SELECT * FROM users').all();
  const localAccounts = sqlite.prepare('SELECT * FROM accounts').all();
  const localInventory = sqlite.prepare('SELECT * FROM inventory_items').all();
  const localSales = sqlite.prepare('SELECT * FROM sales').all();
  const localBills = sqlite.prepare('SELECT * FROM upcoming_bills').all();
  const localFunds = sqlite.prepare('SELECT * FROM sinking_funds').all();
  const localGoals = sqlite.prepare('SELECT * FROM goals').all();
  const localTx = sqlite.prepare('SELECT * FROM transactions').all();
  const localCashFlow = sqlite.prepare('SELECT * FROM monthly_cash_flow').all();
  const localSettings = sqlite.prepare('SELECT * FROM workspace_settings').all();
  const localUtangCustomers = sqlite.prepare('SELECT * FROM utang_customers').all();
  const localUtangTransactions = sqlite.prepare('SELECT * FROM utang_transactions').all();

  try {
    await cloudDb.transaction(async (tx) => {
      for (const u of localUsers) {
        const emailVal = u.email ? String(u.email) : null;
        const usernameVal = u.username ? String(u.username) : null;
        await tx
          .insert(users)
          .values({
            id: String(u.id),
            name: String(u.name),
            username: usernameVal,
            email: emailVal,
            passwordHash: String(u.password_hash),
            role: String(u.role),
            department: String(u.department ?? ''),
            jobTitle: u.job_title ? String(u.job_title) : null,
            phone: u.phone ? String(u.phone) : null,
            status: String(u.status),
            createdAt: new Date(String(u.created_at)),
            lastActive: u.last_active ? new Date(String(u.last_active)) : null,
          })
          .onConflictDoUpdate({
            target: emailVal ? users.email : users.id,
            set: {
              name: String(u.name),
              username: usernameVal,
              email: emailVal,
              passwordHash: String(u.password_hash),
              role: String(u.role),
              department: String(u.department ?? ''),
              jobTitle: u.job_title ? String(u.job_title) : null,
              phone: u.phone ? String(u.phone) : null,
              status: String(u.status),
              lastActive: u.last_active ? new Date(String(u.last_active)) : null,
            },
          });
      }

      for (const a of localAccounts) {
        await tx
          .insert(accounts)
          .values({
            id: String(a.id),
            name: String(a.name),
            institution: String(a.institution),
            mask: String(a.mask),
            category: String(a.category),
            isLiability: Boolean(a.is_liability),
            balance: String(a.balance),
            apyOrApr: String(a.apy_or_apr ?? ''),
            lastSynced: String(a.last_synced ?? ''),
          })
          .onConflictDoUpdate({
            target: accounts.id,
            set: {
              name: String(a.name),
              institution: String(a.institution),
              mask: String(a.mask),
              category: String(a.category),
              isLiability: Boolean(a.is_liability),
              balance: String(a.balance),
              apyOrApr: String(a.apy_or_apr ?? ''),
              lastSynced: String(a.last_synced ?? ''),
            },
          });
      }

      for (const i of localInventory) {
        await tx
          .insert(inventoryItems)
          .values({
            id: String(i.id),
            sku: String(i.sku),
            name: String(i.name),
            category: String(i.category),
            location: String(i.location ?? ''),
            supplier: String(i.supplier ?? ''),
            quantity: String(i.quantity ?? 0),
            reorderPoint: String(i.reorder_point ?? 0),
            unitCost: String(i.unit_cost ?? 0),
            unitPrice: String(i.unit_price ?? 0),
            aliases: JSON.parse(String(i.aliases_json || '[]')),
            baseUnit: String(i.base_unit ?? 'pc'),
            sellingUnit: String(i.selling_unit ?? i.base_unit ?? 'pc'),
            parentProductId: i.parent_product_id ? String(i.parent_product_id) : null,
            conversionFactor: String(i.conversion_factor ?? 1),
            isAutoGeneratedSku: Boolean(i.is_auto_generated_sku),
            lastUpdated: String(i.last_updated ?? ''),
          })
          .onConflictDoUpdate({
            target: inventoryItems.id,
            set: {
              sku: String(i.sku),
              name: String(i.name),
              category: String(i.category),
              location: String(i.location ?? ''),
              supplier: String(i.supplier ?? ''),
              quantity: String(i.quantity ?? 0),
              reorderPoint: String(i.reorder_point ?? 0),
              unitCost: String(i.unit_cost ?? 0),
              unitPrice: String(i.unit_price ?? 0),
              aliases: JSON.parse(String(i.aliases_json || '[]')),
              baseUnit: String(i.base_unit ?? 'pc'),
              sellingUnit: String(i.selling_unit ?? i.base_unit ?? 'pc'),
              parentProductId: i.parent_product_id ? String(i.parent_product_id) : null,
              conversionFactor: String(i.conversion_factor ?? 1),
              isAutoGeneratedSku: Boolean(i.is_auto_generated_sku),
              lastUpdated: String(i.last_updated ?? ''),
            },
          });
      }

      for (const c of localUtangCustomers) {
        await tx.insert(utangCustomers).values({
          id: String(c.id),
          fullName: String(c.full_name),
          alias: c.alias ? String(c.alias) : null,
          contactNumber: c.contact_number ? String(c.contact_number) : null,
          creditLimit: String(c.credit_limit),
          currentBalance: String(c.current_balance),
          updatedAt: new Date(String(c.updated_at)),
        }).onConflictDoUpdate({
          target: utangCustomers.id,
          set: {
            fullName: String(c.full_name),
            alias: c.alias ? String(c.alias) : null,
            contactNumber: c.contact_number ? String(c.contact_number) : null,
            creditLimit: String(c.credit_limit),
            currentBalance: String(c.current_balance),
            updatedAt: new Date(String(c.updated_at)),
          },
        });
      }

      for (const s of localSales) {
        await tx
          .insert(sales)
          .values({
            id: String(s.id),
            orderNumber: String(s.order_number),
            customerName: String(s.customer_name),
            channel: String(s.channel),
            inventoryItemId: s.inventory_item_id ? String(s.inventory_item_id) : null,
            itemName: String(s.item_name),
            sku: s.sku ? String(s.sku) : null,
            quantity: String(s.quantity ?? 1),
            unitPrice: String(s.unit_price ?? 0),
            unitSold: String(s.unit_sold ?? 'pc'),
            unitCostSnapshot: String(s.unit_cost_snapshot ?? 0),
            discountAmount: String(s.discount_amount ?? 0),
            amountPaid: String(s.amount_paid ?? 0),
            customerId: s.customer_id ? String(s.customer_id) : null,
            recordSource: String(s.record_source ?? 'POS_LIVE'),
            deductStock: Boolean(s.deduct_stock ?? 1),
            extraMetadata: JSON.parse(String(s.extra_metadata || '{}')),
            status: String(s.status),
            date: String(s.date),
            notes: s.notes ? String(s.notes) : null,
            createdAt: new Date(String(s.created_at)),
          })
          .onConflictDoUpdate({
            target: sales.id,
            set: {
              orderNumber: String(s.order_number),
              customerName: String(s.customer_name),
              channel: String(s.channel),
              inventoryItemId: s.inventory_item_id ? String(s.inventory_item_id) : null,
              itemName: String(s.item_name),
              sku: s.sku ? String(s.sku) : null,
              quantity: String(s.quantity ?? 1),
              unitPrice: String(s.unit_price ?? 0),
              unitSold: String(s.unit_sold ?? 'pc'),
              unitCostSnapshot: String(s.unit_cost_snapshot ?? 0),
              discountAmount: String(s.discount_amount ?? 0),
              amountPaid: String(s.amount_paid ?? 0),
              customerId: s.customer_id ? String(s.customer_id) : null,
              recordSource: String(s.record_source ?? 'POS_LIVE'),
              deductStock: Boolean(s.deduct_stock ?? 1),
              extraMetadata: JSON.parse(String(s.extra_metadata || '{}')),
              status: String(s.status),
              date: String(s.date),
              notes: s.notes ? String(s.notes) : null,
            },
          });
      }

      for (const t of localUtangTransactions) {
        await tx.insert(utangTransactions).values({
          id: String(t.id),
          customerId: String(t.customer_id),
          type: String(t.type),
          amount: String(t.amount),
          notes: t.notes ? String(t.notes) : null,
          createdAt: new Date(String(t.created_at)),
        }).onConflictDoUpdate({
          target: utangTransactions.id,
          set: {
            customerId: String(t.customer_id),
            type: String(t.type),
            amount: String(t.amount),
            notes: t.notes ? String(t.notes) : null,
          },
        });
      }

      for (const b of localBills) {
        await tx
          .insert(upcomingBills)
          .values({
            id: String(b.id),
            name: String(b.name),
            dueDate: String(b.due_date),
            amount: String(b.amount),
            category: String(b.category ?? ''),
            paid: Boolean(b.paid),
          })
          .onConflictDoUpdate({
            target: upcomingBills.id,
            set: {
              name: String(b.name),
              dueDate: String(b.due_date),
              amount: String(b.amount),
              category: String(b.category ?? ''),
              paid: Boolean(b.paid),
            },
          });
      }

      for (const f of localFunds) {
        await tx
          .insert(sinkingFunds)
          .values({
            id: String(f.id),
            name: String(f.name),
            saved: String(f.saved),
            target: String(f.target),
          })
          .onConflictDoUpdate({
            target: sinkingFunds.id,
            set: {
              name: String(f.name),
              saved: String(f.saved),
              target: String(f.target),
            },
          });
      }

      for (const g of localGoals) {
        await tx
          .insert(goals)
          .values({
            id: String(g.id),
            name: String(g.name),
            saved: String(g.saved),
            target: String(g.target),
          })
          .onConflictDoUpdate({
            target: goals.id,
            set: {
              name: String(g.name),
              saved: String(g.saved),
              target: String(g.target),
            },
          });
      }

      for (const t of localTx) {
        await tx
          .insert(transactions)
          .values({
            id: String(t.id),
            merchant: String(t.merchant),
            date: String(t.date),
            category: String(t.category ?? ''),
            amount: String(t.amount),
          })
          .onConflictDoUpdate({
            target: transactions.id,
            set: {
              merchant: String(t.merchant),
              date: String(t.date),
              category: String(t.category ?? ''),
              amount: String(t.amount),
            },
          });
      }

      for (const m of localCashFlow) {
        await tx
          .insert(monthlyCashFlow)
          .values({
            id: String(m.id),
            month: String(m.month),
            income: String(m.income),
            expenses: String(m.expenses),
          })
          .onConflictDoUpdate({
            target: monthlyCashFlow.id,
            set: {
              month: String(m.month),
              income: String(m.income),
              expenses: String(m.expenses),
            },
          });
      }

      for (const ws of localSettings) {
        await tx
          .insert(workspaceSettings)
          .values({
            id: String(ws.id),
            storeName: String(ws.store_name),
            workspaceSubtitle: String(ws.workspace_subtitle),
            ownerEmail: String(ws.owner_email ?? ''),
            currency: String(ws.currency),
            defaultTimeframe: String(ws.default_timeframe),
            budgetCycleDay: String(ws.budget_cycle_day),
            defaultReorderPoint: Number(ws.default_reorder_point ?? 8),
            lowStockAlerts: Boolean(ws.low_stock_alerts),
            includeBillsInSafeToSpend: Boolean(ws.include_bills_in_safe_to_spend),
            inventoryColumnLabels: JSON.parse(String(ws.inventory_column_labels || '{}')),
            businessType: String(ws.business_type ?? 'SARI_SARI'),
            requireCustomerName: Boolean(ws.require_customer_name),
            requireSaleStatus: Boolean(ws.require_sale_status),
            enableUnitConversions: Boolean(ws.enable_unit_conversions ?? 1),
            columnMappingJson: JSON.parse(String(ws.column_mapping_json || '{}')),
            salesFieldVisibility: JSON.parse(String(ws.sales_field_visibility || '{}')),
            inventoryFieldVisibility: JSON.parse(String(ws.inventory_field_visibility || '{}')),
            keyboardShortcuts: JSON.parse(String(ws.keyboard_shortcuts || '{}')),
          })
          .onConflictDoUpdate({
            target: workspaceSettings.id,
            set: {
              storeName: String(ws.store_name),
              workspaceSubtitle: String(ws.workspace_subtitle),
              ownerEmail: String(ws.owner_email ?? ''),
              currency: String(ws.currency),
              defaultTimeframe: String(ws.default_timeframe),
              budgetCycleDay: String(ws.budget_cycle_day),
              defaultReorderPoint: Number(ws.default_reorder_point ?? 8),
              lowStockAlerts: Boolean(ws.low_stock_alerts),
              includeBillsInSafeToSpend: Boolean(ws.include_bills_in_safe_to_spend),
              inventoryColumnLabels: JSON.parse(String(ws.inventory_column_labels || '{}')),
              businessType: String(ws.business_type ?? 'SARI_SARI'),
              requireCustomerName: Boolean(ws.require_customer_name),
              requireSaleStatus: Boolean(ws.require_sale_status),
              enableUnitConversions: Boolean(ws.enable_unit_conversions ?? 1),
              columnMappingJson: JSON.parse(String(ws.column_mapping_json || '{}')),
              salesFieldVisibility: JSON.parse(String(ws.sales_field_visibility || '{}')),
              inventoryFieldVisibility: JSON.parse(String(ws.inventory_field_visibility || '{}')),
              keyboardShortcuts: JSON.parse(String(ws.keyboard_shortcuts || '{}')),
            },
          });
      }
    });
  } catch (cloudErr) {
    logCloudFailure('backup', cloudErr);
    throw new HttpError(
      503,
      'Supabase backup failed. Confirm the database migrations are applied, then retry.'
    );
  }

  const backedUpAt = new Date().toISOString();
  setSyncMeta('last_backup_at', backedUpAt);

  return {
    ok: true,
    backedUpAt,
    counts: {
      users: localUsers.length,
      accounts: localAccounts.length,
      inventory: localInventory.length,
      sales: localSales.length,
      bills: localBills.length,
      sinkingFunds: localFunds.length,
      goals: localGoals.length,
      transactions: localTx.length,
      utangCustomers: localUtangCustomers.length,
      utangTransactions: localUtangTransactions.length,
    },
  };
}

export async function pullCloudToSqlite() {
  if (!isSupabaseDatabaseConfigured()) {
    throw new HttpError(503, 'SUPABASE_DATABASE_URL is not configured for online restore');
  }
  const { db: cloudDb } = getSupabaseConnection();

  let cloudData;
  try {
    const [
      cloudUsers,
      cloudAccounts,
      cloudInventory,
      cloudSales,
      cloudBills,
      cloudFunds,
      cloudGoals,
      cloudTx,
      cloudCashFlow,
      cloudSettings,
      cloudUtangCustomers,
      cloudUtangTransactions,
    ] = await Promise.all([
      cloudDb.select().from(users),
      cloudDb.select().from(accounts),
      cloudDb.select().from(inventoryItems),
      cloudDb.select().from(sales),
      cloudDb.select().from(upcomingBills),
      cloudDb.select().from(sinkingFunds),
      cloudDb.select().from(goals),
      cloudDb.select().from(transactions),
      cloudDb.select().from(monthlyCashFlow),
      cloudDb.select().from(workspaceSettings),
      cloudDb.select().from(utangCustomers),
      cloudDb.select().from(utangTransactions),
    ]);
    cloudData = {
      cloudUsers,
      cloudAccounts,
      cloudInventory,
      cloudSales,
      cloudBills,
      cloudFunds,
      cloudGoals,
      cloudTx,
      cloudCashFlow,
      cloudSettings,
      cloudUtangCustomers,
      cloudUtangTransactions,
    };
  } catch (cloudErr) {
    logCloudFailure('restore', cloudErr);
    throw new HttpError(
      503,
      'Supabase restore failed. Confirm the database migrations are applied, then retry.'
    );
  }

  withSqliteTransaction(() => {
    sqlite.exec('DELETE FROM sales');
    sqlite.exec('DELETE FROM utang_transactions');
    sqlite.exec('DELETE FROM utang_customers');
    sqlite.exec('DELETE FROM inventory_items');
    sqlite.exec('DELETE FROM accounts');
    sqlite.exec('DELETE FROM upcoming_bills');
    sqlite.exec('DELETE FROM sinking_funds');
    sqlite.exec('DELETE FROM goals');
    sqlite.exec('DELETE FROM transactions');
    sqlite.exec('DELETE FROM monthly_cash_flow');
    if (cloudData.cloudSettings.length > 0) sqlite.exec('DELETE FROM workspace_settings');
    if (cloudData.cloudUsers.length > 0) sqlite.exec('DELETE FROM users');

    const insUser = sqlite.prepare(
      `INSERT INTO users (id, name, username, email, password_hash, role, department, job_title, phone, status, created_at, last_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const u of cloudData.cloudUsers) {
      insUser.run(
        u.id,
        u.name,
        u.username ?? null,
        u.email ?? null,
        u.passwordHash,
        u.role,
        u.department,
        u.jobTitle ?? null,
        u.phone ?? null,
        u.status,
        u.createdAt.toISOString(),
        u.lastActive ? u.lastActive.toISOString() : null
      );
    }

    const insAcc = sqlite.prepare(
      `INSERT INTO accounts (id, name, institution, mask, category, is_liability, balance, apy_or_apr, last_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const a of cloudData.cloudAccounts) {
      insAcc.run(
        a.id,
        a.name,
        a.institution,
        a.mask,
        a.category,
        a.isLiability ? 1 : 0,
        Number(a.balance),
        a.apyOrApr,
        a.lastSynced
      );
    }

    const insInv = sqlite.prepare(
      `INSERT INTO inventory_items (id, sku, name, category, location, supplier, quantity, reorder_point, unit_cost, unit_price, selling_unit, aliases_json, base_unit, parent_product_id, conversion_factor, is_auto_generated_sku, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const i of cloudData.cloudInventory) {
      insInv.run(
        i.id,
        i.sku,
        i.name,
        i.category,
        i.location,
        i.supplier,
        i.quantity,
        i.reorderPoint,
        Number(i.unitCost),
        Number(i.unitPrice),
        i.sellingUnit ?? i.baseUnit ?? 'pc',
        JSON.stringify(i.aliases ?? []),
        i.baseUnit,
        i.parentProductId ?? null,
        Number(i.conversionFactor),
        i.isAutoGeneratedSku ? 1 : 0,
        i.lastUpdated
      );
    }

    const insUtangCustomer = sqlite.prepare(
      'INSERT INTO utang_customers (id, full_name, alias, contact_number, credit_limit, current_balance, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const c of cloudData.cloudUtangCustomers) {
      insUtangCustomer.run(c.id, c.fullName, c.alias ?? null, c.contactNumber ?? null, Number(c.creditLimit), Number(c.currentBalance), c.updatedAt.toISOString());
    }

    const insUtangTransaction = sqlite.prepare(
      'INSERT INTO utang_transactions (id, customer_id, type, amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const t of cloudData.cloudUtangTransactions) {
      insUtangTransaction.run(t.id, t.customerId, t.type, Number(t.amount), t.notes ?? null, t.createdAt.toISOString());
    }

    const insSale = sqlite.prepare(
      `INSERT INTO sales (id, order_number, customer_name, channel, inventory_item_id, item_name, sku, quantity, unit_price, unit_sold, unit_cost_snapshot, discount_amount, amount_paid, customer_id, status, record_source, deduct_stock, extra_metadata, date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const s of cloudData.cloudSales) {
      insSale.run(
        s.id,
        s.orderNumber,
        s.customerName,
        s.channel,
        s.inventoryItemId ?? null,
        s.itemName,
        s.sku ?? null,
        s.quantity,
        Number(s.unitPrice),
        s.unitSold,
        Number(s.unitCostSnapshot),
        Number(s.discountAmount),
        Number(s.amountPaid),
        s.customerId ?? null,
        s.status,
        s.recordSource,
        s.deductStock ? 1 : 0,
        JSON.stringify(s.extraMetadata ?? {}),
        s.date,
        s.notes ?? null,
        s.createdAt.toISOString()
      );
    }

    const insBill = sqlite.prepare(
      'INSERT INTO upcoming_bills (id, name, due_date, amount, category, paid) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const b of cloudData.cloudBills) {
      insBill.run(b.id, b.name, b.dueDate, Number(b.amount), b.category, b.paid ? 1 : 0);
    }

    const insFund = sqlite.prepare(
      'INSERT INTO sinking_funds (id, name, saved, target) VALUES (?, ?, ?, ?)'
    );
    for (const f of cloudData.cloudFunds) {
      insFund.run(f.id, f.name, Number(f.saved), Number(f.target));
    }

    const insGoal = sqlite.prepare(
      'INSERT INTO goals (id, name, saved, target) VALUES (?, ?, ?, ?)'
    );
    for (const g of cloudData.cloudGoals) {
      insGoal.run(g.id, g.name, Number(g.saved), Number(g.target));
    }

    const insTx = sqlite.prepare(
      'INSERT INTO transactions (id, merchant, date, category, amount) VALUES (?, ?, ?, ?, ?)'
    );
    for (const t of cloudData.cloudTx) {
      insTx.run(t.id, t.merchant, t.date, t.category, Number(t.amount));
    }

    const insCash = sqlite.prepare(
      'INSERT INTO monthly_cash_flow (id, month, income, expenses) VALUES (?, ?, ?, ?)'
    );
    for (const m of cloudData.cloudCashFlow) {
      insCash.run(m.id, m.month, Number(m.income), Number(m.expenses));
    }

    const insWs = sqlite.prepare(
      `INSERT INTO workspace_settings (
        id, store_name, workspace_subtitle, owner_email, currency,
        default_timeframe, budget_cycle_day, default_reorder_point,
        low_stock_alerts, include_bills_in_safe_to_spend, inventory_column_labels,
        business_type, require_customer_name, require_sale_status, enable_unit_conversions, column_mapping_json
        , sales_field_visibility, inventory_field_visibility, keyboard_shortcuts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const ws of cloudData.cloudSettings) {
      insWs.run(
        ws.id,
        ws.storeName,
        ws.workspaceSubtitle,
        ws.ownerEmail,
        ws.currency,
        ws.defaultTimeframe,
        ws.budgetCycleDay,
        ws.defaultReorderPoint,
        ws.lowStockAlerts ? 1 : 0,
        ws.includeBillsInSafeToSpend ? 1 : 0,
        JSON.stringify(ws.inventoryColumnLabels ?? {}),
        ws.businessType ?? 'SARI_SARI',
        ws.requireCustomerName ? 1 : 0,
        ws.requireSaleStatus ? 1 : 0,
        ws.enableUnitConversions ? 1 : 0,
        JSON.stringify(ws.columnMappingJson ?? {}),
        JSON.stringify(ws.salesFieldVisibility ?? {}),
        JSON.stringify(ws.inventoryFieldVisibility ?? {}),
        JSON.stringify(ws.keyboardShortcuts ?? {})
      );
    }
  });

  const restoredAt = new Date().toISOString();
  setSyncMeta('last_restore_at', restoredAt);

  return {
    ok: true,
    restoredAt,
    counts: {
      users: cloudData.cloudUsers.length,
      accounts: cloudData.cloudAccounts.length,
      inventory: cloudData.cloudInventory.length,
      sales: cloudData.cloudSales.length,
      bills: cloudData.cloudBills.length,
    },
  };
}
