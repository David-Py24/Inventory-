import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCopy, Minus, Plus, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import type { UtangCustomer } from '../types';

type Product = {
  id: string;
  name: string;
  category: string;
  currentQty: number;
  reorderLevel: number;
  costPrice: number;
  pinned: boolean;
};

type Batch = {
  id: string;
  productName: string;
  qtyRemaining: number;
  expiryDate: string;
};

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_BATCHES: Batch[] = [];


type Tab = 'lowstock' | 'restock' | 'expiry' | 'utang';

function daysUntil(dateString: string): number {
  const today = new Date();
  const target = new Date(dateString);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryBadge(days: number): { label: string; className: string } {
  if (days <= 0) return { label: 'Expired', className: 'bg-[#F9ECE9] text-[#8C3A2B] border-[#E8C9C3]' };
  if (days <= 7) return { label: `${days}d left`, className: 'bg-[#F9ECE9] text-[#8C3A2B] border-[#E8C9C3]' };
  if (days <= 30) return { label: `${days}d left`, className: 'bg-[#FBF3E4] text-[#8E6733] border-[#EAD8B8]' };
  return { label: `${days}d left`, className: 'bg-[#EEF2EA] text-[#2E3628] border-[#D8E0D0]' };
}

export const StarterPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('lowstock');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [batches] = useState<Batch[]>(INITIAL_BATCHES);
  const [customers, setCustomers] = useState<UtangCustomer[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerAlias, setNewCustomerAlias] = useState('');
  const [newCustomerLimit, setNewCustomerLimit] = useState('500');
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.getUtangCustomers(), api.getWorkspace()]).then(([ledgerCustomers, workspace]) => {
      setCustomers(ledgerCustomers);
      setProducts(workspace.inventory.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        currentQty: item.quantity,
        reorderLevel: item.reorderPoint,
        costPrice: item.unitCost,
        pinned: false,
      })));
    }).catch(() => {
      setCustomers([]);
      setProducts([]);
    });
  }, []);

  const lowStockItems = useMemo(
    () => products.filter((p) => p.currentQty <= p.reorderLevel),
    [products]
  );

  const restockItems = useMemo(() => {
    return products
      .filter((p) => p.currentQty <= p.reorderLevel || p.pinned)
      .map((p) => {
        const suggestedBuyQty = p.currentQty <= p.reorderLevel ? Math.max(p.reorderLevel - p.currentQty, 1) : 0;
        return {
          ...p,
          suggestedBuyQty,
          estimatedSubtotal: suggestedBuyQty * p.costPrice,
        };
      });
  }, [products]);

  const totalPuhunan = useMemo(
    () => restockItems.reduce((sum, item) => sum + item.estimatedSubtotal, 0),
    [restockItems]
  );

  const quickDeduct = async (id: string, delta: number) => {
    try {
      const updated = await api.adjustInventoryQuantity(id, delta);
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, currentQty: updated.quantity } : p));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update stock');
    }
  };

  const markRestocked = async (id: string, qty: number) => {
    await quickDeduct(id, qty);
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, pinned: false } : p));
  };

  const adjustUtang = async (customer: UtangCustomer, delta: number) => {
    try {
      const result = await api.postUtangTransaction(customer.id, delta > 0 ? 'CREDIT' : 'PAYMENT', Math.abs(delta));
      setCustomers((prev) => prev.map((c) => c.id === customer.id ? result.customer : c));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update the utang ledger');
    }
  };

  const addCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCustomerName.trim()) return;
    try {
      const created = await api.createUtangCustomer({
        fullName: newCustomerName.trim(),
        alias: newCustomerAlias.trim() || undefined,
        creditLimit: Number(newCustomerLimit),
      });
      setCustomers((current) => [...current, created].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setNewCustomerName('');
      setNewCustomerAlias('');
      setNewCustomerLimit('500');
      setCustomerFormOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not create customer');
    }
  };

  const copyReminder = async (customer: UtangCustomer) => {
    const text = `Hi ${customer.alias || customer.fullName}, friendly reminder that your balance is ₱${customer.currentBalance.toFixed(2)}. Thank you!`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(customer.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'lowstock', label: 'Low-Stock Alerts' },
    { id: 'restock', label: 'Restock List' },
    { id: 'expiry', label: 'Expiry Tracker' },
    { id: 'utang', label: 'Utang Tracker' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
          Stocks
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition-colors ${tab === t.id
                ? 'bg-[#2C3327] text-[#FCFBF8]'
                : 'border border-[#DDD6C7] bg-[#FCFBF8] text-[#2C3327] hover:bg-[#EFEAE0]'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lowstock' && (
        <div className="space-y-3">
          {lowStockItems.length === 0 ? (
            <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 text-center text-[13px] text-[#6E7166]">
              No low-stock items
            </div>
          ) : (
            lowStockItems.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-[14px] font-semibold text-[#23281E]">{p.name}</div>
                  <div className="text-[12px] text-[#6E7166]">
                    {p.category} · {p.currentQty} / {p.reorderLevel} reorder level
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => quickDeduct(p.id, -n)}
                      disabled={p.currentQty < n}
                      className="rounded-lg border border-[#E0D9CA] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2C3327] hover:bg-[#EFEAE0] disabled:opacity-40"
                    >
                      -{n}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'restock' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4">
            <div className="text-[11.5px] font-semibold tracking-wide text-[#6E7166]">Total Estimated Puhunan Needed</div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums text-[#23281E]">₱{totalPuhunan.toFixed(2)}</div>
          </div>

          {restockItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[14px] font-semibold text-[#23281E]">{item.name}</div>
                  <div className="text-[12px] text-[#6E7166]">
                    Stock: {item.currentQty} · Suggested buy: {item.suggestedBuyQty} · ₱{item.costPrice.toFixed(2)} each
                  </div>
                  <div className="text-[12px] font-medium text-[#23281E]">
                    Subtotal: ₱{item.estimatedSubtotal.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => markRestocked(item.id, item.suggestedBuyQty)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Mark Restocked</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'expiry' && (
        <div className="space-y-3">
          {[...batches]
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
            .map((batch) => {
              const days = daysUntil(batch.expiryDate);
              const badge = expiryBadge(days);
              return (
                <div
                  key={batch.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-[14px] font-semibold text-[#23281E]">{batch.productName}</div>
                    <div className="text-[12px] text-[#6E7166]">
                      Qty: {batch.qtyRemaining} · Expires: {batch.expiryDate}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {tab === 'utang' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => setCustomerFormOpen((open) => !open)} className="rounded-lg bg-[#2C3327] px-3 py-2 text-[12px] font-medium text-white">{customerFormOpen ? 'Cancel' : 'Add customer'}</button>
          </div>
          {customerFormOpen && (
            <form onSubmit={addCustomer} className="grid grid-cols-1 gap-2 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:grid-cols-4">
              <input required value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer full name" className="rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-sm" />
              <input value={newCustomerAlias} onChange={(e) => setNewCustomerAlias(e.target.value)} placeholder="Alias (optional)" className="rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-sm" />
              <input type="number" min="0" step="0.01" value={newCustomerLimit} onChange={(e) => setNewCustomerLimit(e.target.value)} aria-label="Credit limit" className="rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-sm" />
              <button type="submit" className="rounded-lg border border-[#D8E0D0] bg-[#EEF2EA] px-3 py-2 text-sm font-medium text-[#2E3628]">Save customer</button>
            </form>
          )}
          {customers.length === 0 && !customerFormOpen && <p className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 text-center text-sm text-[#6E7166]">No utang customers yet.</p>}
          {customers.map((customer) => (
            <div key={customer.id} className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[14px] font-semibold text-[#23281E]">{customer.fullName}</div>
                  <div className="text-[12px] text-[#6E7166]">{customer.alias}</div>
                  <div className="mt-1 text-[13px] font-medium text-[#23281E]">
                    Balance: ₱{customer.currentBalance.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustUtang(customer, 20)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8E0D0] bg-[#EEF2EA] px-3 py-1.5 text-[12px] font-medium text-[#2E3628]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Utang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustUtang(customer, -20)}
                    disabled={customer.currentBalance <= 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8C9C3] bg-[#F9ECE9] px-3 py-1.5 text-[12px] font-medium text-[#8C3A2B] disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                    <span>Record Payment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyReminder(customer)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6C7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2C3327] hover:bg-[#EFEAE0]"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
            <span>{copiedId === customer.id ? 'Copied' : 'Copy Reminder'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          <p className="text-[11.5px] text-[#7D8075]">Quick actions record ₱20 ledger entries. Payments cannot exceed the outstanding balance.</p>
        </div>
      )}
    </div>
  );
};
