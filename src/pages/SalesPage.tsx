import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  Download,
  Upload,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Settings2,
} from 'lucide-react';
import { InventoryItem, SaleChannel, SaleRecord, SaleStatus, SalesFieldKey, ShortcutAction, WorkspaceSettings } from '../types';
import { downloadCsv, formatCurrency, formatNumber, getCurrencySymbol } from '../utils/format';
import { api } from '../api/client';
import type { UtangCustomer } from '../types';

interface SalesPageProps {
  sales: SaleRecord[];
  inventory: InventoryItem[];
  onAddSale: (sale: Omit<SaleRecord, 'id'>, deductInventory: boolean) => void | Promise<void>;
  onUpdateSale: (sale: SaleRecord) => void | Promise<void>;
  onDeleteSale: (id: string) => void | Promise<void>;
  requireCustomerName?: boolean;
  requireSaleStatus?: boolean;
  fieldVisibility?: Partial<Record<SalesFieldKey, boolean>>;
  keyboardShortcuts?: Partial<Record<ShortcutAction, string>>;
  onSaveSettings: (next: WorkspaceSettings) => void;
  settings: WorkspaceSettings;
}

type SortField = 'orderNumber' | 'customerName' | 'channel' | 'quantity' | 'total' | 'status';
type StatusFilter = 'All' | SaleStatus;

const CHANNELS: SaleChannel[] = ['In-Store', 'Online', 'Wholesale', 'POS'];
const STATUSES: SaleStatus[] = ['Completed', 'Pending', 'UTANG', 'PARTIAL', 'FOR_DELIVERY'];

function getStatusBadgeClass(status: SaleStatus): string {
  if (status === 'Completed' || status === 'COMPLETED') {
    return 'bg-[#EEF2EA] text-[#2E3628] border-[#D8E0D0]';
  }
  if (status === 'Pending' || status === 'PENDING' || status === 'UTANG' || status === 'PARTIAL' || status === 'FOR_DELIVERY') {
    return 'bg-[#FBF3E4] text-[#8E6733] border-[#EAD8B8]';
  }
  return 'bg-[#F9ECE9] text-[#8C3A2B] border-[#E8C9C3]';
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  sales,
  inventory,
  onAddSale,
  onUpdateSale,
  onDeleteSale,
  requireCustomerName = false,
  requireSaleStatus = false,
  fieldVisibility = {},
  keyboardShortcuts = {},
  onSaveSettings,
  settings,
}) => {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'All' | SaleChannel>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortField, setSortField] = useState<SortField>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState<SaleChannel>('In-Store');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [itemName, setItemName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [status, setStatus] = useState<SaleStatus>('Completed');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);
  const [customerId, setCustomerId] = useState('');
  const [creditCustomers, setCreditCustomers] = useState<UtangCustomer[]>([]);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [amountPaid, setAmountPaid] = useState('0');
  const [importingNotebook, setImportingNotebook] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [visibleFields, setVisibleFields] = useState(fieldVisibility);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkChannel, setBulkChannel] = useState<SaleChannel>('In-Store');
  const [bulkBusy, setBulkBusy] = useState(false);
  const visible = (key: SalesFieldKey) => visibleFields[key] !== false;

  useEffect(() => setVisibleFields(fieldVisibility), [fieldVisibility]);

  const shortcutMatches = (event: KeyboardEvent, shortcut?: string) => {
    if (!shortcut) return false;
    const parts = shortcut.toLowerCase().split('+').map((part) => part.trim());
    const key = parts[parts.length - 1];
    return event.key.toLowerCase() === key && event.altKey === parts.includes('alt') &&
      event.ctrlKey === parts.includes('ctrl') && event.shiftKey === parts.includes('shift') && event.metaKey === parts.includes('meta');
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (shortcutMatches(event, keyboardShortcuts.newSale) && !typing) { event.preventDefault(); openAddModal(); }
      else if (shortcutMatches(event, keyboardShortcuts.bulkEditSales) && !typing) { event.preventDefault(); setSelectedIds(sales.map((sale) => sale.id)); }
      else if (shortcutMatches(event, keyboardShortcuts.searchSales) && !typing) {
        event.preventDefault(); document.querySelector<HTMLInputElement>('[aria-label="Search sales orders"]')?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [keyboardShortcuts]);

  const saveFieldVisibility = (key: SalesFieldKey, checked: boolean) => {
    const nextVisibility = { ...visibleFields, [key]: checked };
    setVisibleFields(nextVisibility);
    onSaveSettings({ ...settings, salesFieldVisibility: nextVisibility });
  };

  const applyBulkChannel = async () => {
    setBulkBusy(true);
    try {
      await Promise.all(sales.filter((sale) => selectedIds.includes(sale.id)).map((sale) => onUpdateSale({ ...sale, channel: bulkChannel })));
      setSelectedIds([]);
    } finally { setBulkBusy(false); }
  };

  useEffect(() => {
    api.getUtangCustomers().then(setCreditCustomers).catch(() => setCreditCustomers([]));
  }, []);

  const summary = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'Completed' || s.status === 'COMPLETED');
    const pending = sales.filter((s) => ['Pending', 'PENDING', 'UTANG', 'PARTIAL', 'FOR_DELIVERY'].includes(s.status));
    const totalRevenue = completed.reduce((sum, s) => sum + s.quantity * s.unitPrice - (s.discountAmount ?? 0), 0);
    const pendingTotal = pending.reduce((sum, s) => sum + Math.max(0, s.quantity * s.unitPrice - (s.discountAmount ?? 0) - (s.amountPaid ?? 0)), 0);
    const totalOrders = sales.length;
    const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0;

    return {
      totalRevenue,
      totalOrders,
      completedCount: completed.length,
      avgOrderValue,
      pendingTotal,
      pendingCount: pending.length,
    };
  }, [sales]);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sales.filter((sale) => {
      if (channelFilter !== 'All' && sale.channel !== channelFilter) return false;
      if (statusFilter !== 'All' && sale.status !== statusFilter) return false;
      if (!q) return true;
      return (
        sale.orderNumber.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        sale.itemName.toLowerCase().includes(q) ||
        (sale.sku ?? '').toLowerCase().includes(q) ||
        sale.channel.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'orderNumber') comparison = a.orderNumber.localeCompare(b.orderNumber);
      else if (sortField === 'customerName') comparison = a.customerName.localeCompare(b.customerName);
      else if (sortField === 'channel') comparison = a.channel.localeCompare(b.channel);
      else if (sortField === 'quantity') comparison = a.quantity - b.quantity;
      else if (sortField === 'total')
        comparison = (a.quantity * a.unitPrice - (a.discountAmount ?? 0)) - (b.quantity * b.unitPrice - (b.discountAmount ?? 0));
      else if (sortField === 'status') comparison = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [sales, search, channelFilter, statusFilter, sortField, sortDir]);

  const filteredUnits = useMemo(
    () => filteredSales.reduce((sum, s) => sum + s.quantity, 0),
    [filteredSales]
  );

  const filteredRevenue = useMemo(
    () =>
      filteredSales
        .filter((s) => s.status !== 'Refunded' && s.status !== 'REFUNDED' && s.status !== 'VOIDED')
        .reduce((sum, s) => sum + s.quantity * s.unitPrice - (s.discountAmount ?? 0), 0),
    [filteredSales]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const formatToday = () =>
    new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

  const openAddModal = () => {
    setSubmitError('');
    setEditingSale(null);
    setOrderNumber(`SO-2026-${Math.floor(1050 + Math.random() * 899)}`);
    setCustomerName('');
    setChannel('In-Store');
    setSelectedInventoryId('');
    setItemName('');
    setSku('');
    setQuantity('1');
    setUnitPrice('0.00');
    setStatus('Completed');
    setDate(formatToday());
    setNotes('');
    setDeductInventory(true);
    setCustomerId('');
    setDiscountAmount('0');
    setAmountPaid('0');
    setModalOpen(true);
  };

  const openEditModal = (sale: SaleRecord) => {
    setEditingSale(sale);
    setOrderNumber(sale.orderNumber);
    setCustomerName(sale.customerName);
    setCustomerId(sale.customerId ?? '');
    setChannel(sale.channel);
    setSelectedInventoryId(sale.inventoryItemId ?? '');
    setItemName(sale.itemName);
    setSku(sale.sku ?? '');
    setQuantity(String(sale.quantity));
    setUnitPrice(String(sale.unitPrice));
    setStatus(sale.status);
    setDate(sale.date);
    setNotes(sale.notes ?? '');
    setDiscountAmount(String(sale.discountAmount ?? 0));
    setAmountPaid(String(sale.amountPaid ?? 0));
    setDeductInventory(false);
    setModalOpen(true);
  };

  const handleInventorySelect = (id: string) => {
    setSelectedInventoryId(id);
    if (!id) return;
    const found = inventory.find((item) => item.id === id);
    if (found) {
      setItemName(found.name);
      setSku(found.sku);
      // Suggest a default retail markup over unit cost if price is currently 0
      if ((parseFloat(unitPrice) || 0) === 0) {
        setUnitPrice((found.unitPrice || found.unitCost * 1.35).toFixed(2));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const parsedQty = Math.max(0.001, parseFloat(quantity) || 0.001);
    const parsedPrice = Math.max(0, parseFloat(unitPrice) || 0);
    const parsedDiscount = Math.max(0, parseFloat(discountAmount) || 0);
    const parsedPaid = Math.max(0, parseFloat(amountPaid) || 0);
    const selectedCustomer = creditCustomers.find((customer) => customer.id === customerId);
    if (!orderNumber.trim() || (!customerId && !customerName.trim()) || !itemName.trim()) {
      setSubmitError('Enter an order number, customer or walk-in name, and item name.');
      return;
    }
    if (['UTANG', 'PARTIAL'].includes(status) && !customerId) {
      setSubmitError('Choose a utang customer for a credit sale.');
      return;
    }

    const payload = {
      orderNumber: orderNumber.trim(),
      customerName: selectedCustomer?.fullName ?? customerName.trim(),
      channel,
      inventoryItemId: selectedInventoryId || undefined,
      itemName: itemName.trim(),
      sku: sku.trim() || undefined,
      quantity: parsedQty,
      unitPrice: parsedPrice,
      unitSold: inventory.find((item) => item.id === selectedInventoryId)?.sellingUnit ?? inventory.find((item) => item.id === selectedInventoryId)?.baseUnit ?? 'pc',
      discountAmount: parsedDiscount,
      amountPaid: status === 'Completed' ? parsedQty * parsedPrice - parsedDiscount : parsedPaid,
      ...(customerId ? { customerId } : {}),
      recordSource: 'POS_LIVE' as const,
      deductStock: deductInventory,
      status,
      date: date.trim() || formatToday(),
      notes: notes.trim() || undefined,
    };

    try {
      if (editingSale) {
        await onUpdateSale({ ...editingSale, ...payload });
      } else {
        await onAddSale(payload, deductInventory && Boolean(selectedInventoryId) && status !== 'Refunded' && status !== 'VOIDED');
      }
      setModalOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save sale');
    }
  };

  const handleExportCsv = () => {
    downloadCsv(
      'tallyledger-sales.csv',
      ['Order #', 'Customer', 'Channel', 'SKU', 'Item', 'Quantity', 'Unit Price', 'Total', 'Status', 'Date'],
      filteredSales.map((s) => [
        s.orderNumber,
        s.customerName,
        s.channel,
        s.sku ?? '',
        s.itemName,
        s.quantity,
        s.unitPrice.toFixed(2),
        (s.quantity * s.unitPrice - (s.discountAmount ?? 0)).toFixed(2),
        s.status,
        s.date,
      ])
    );
  };

  const handleDelete = async (id: string) => {
    setDeleteError('');
    try {
      await onDeleteSale(id);
      setConfirmDeleteId(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not void sale');
    }
  };

  const handleNotebookImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseCsvRows(await file.text());
      if (parsed.length < 2) throw new Error('CSV needs a header row and at least one data row');
      const header = parsed[0].map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      const findColumn = (...names: string[]) => header.findIndex((value) => names.includes(value));
      const dateColumn = findColumn('date', 'soldat');
      const quantityColumn = findColumn('qty', 'quantity');
      const productColumn = findColumn('product', 'item', 'productname');
      const salesColumn = findColumn('sales', 'total', 'amount');
      if ([dateColumn, quantityColumn, productColumn, salesColumn].some((index) => index < 0)) {
        throw new Error('CSV headers must include Date, Qty, Product, and Sales');
      }
      const rows = parsed.slice(1).map((cells, index) => ({
        rowNumber: index + 2,
        date: cells[dateColumn] ?? '',
        quantity: Number(cells[quantityColumn]),
        product: cells[productColumn] ?? '',
        sales: Number(String(cells[salesColumn] ?? '').replace(/[,₱$\s]/g, '')),
      }));
      const importId = `${file.name.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 20)}-${file.lastModified}-${file.size}`;
      if (!window.confirm(`Import ${rows.length} notebook rows from ${file.name}? Imported rows will be archived and will not deduct stock.`)) return;
      setImportingNotebook(true);
      const result = await api.importNotebookSales(importId, rows);
      window.alert(`Imported ${result.imported} rows. Skipped ${result.skipped.length}.`);
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not import notebook CSV');
    } finally {
      setImportingNotebook(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
          Sales
        </h1>

        <div className="flex items-center gap-2.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFEAE0]">
            <Upload className="h-3.5 w-3.5 text-[#6E7166]" />
            <span>{importingNotebook ? 'Importing…' : 'Import notebook CSV'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" disabled={importingNotebook} onChange={handleNotebookImport} />
          </label>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFEAE0] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-[#6E7166]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Record Sale</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Total Revenue
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">
            {summary.completedCount} completed orders
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Total Orders
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatNumber(summary.totalOrders)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">recorded entries</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Avg Order Value
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(summary.avgOrderValue)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">per completed sale</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Pending Balance
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(summary.pendingTotal)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">
            {summary.pendingCount} awaiting settlement
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8]">
        <div className="flex flex-col gap-3 border-b border-[#EFEAE0] p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#85877C]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, customer, SKU..."
                aria-label="Search sales orders"
                className="w-full rounded-lg border border-[#E3DDD0] bg-white py-2 pl-8 pr-3 text-[12.5px] text-[#23281E] placeholder-[#8E9086] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
              />
            </div>

            <select
              aria-label="Filter by channel"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as 'All' | SaleChannel)}
              className="rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[12.5px] font-medium text-[#2C3327] focus:border-[#B89260] focus:outline-none"
            >
              <option value="All">All Channels</option>
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
            <select aria-label="Filter by sale status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[12.5px] font-medium text-[#2C3327] focus:border-[#B89260] focus:outline-none">
              {(['All', ...STATUSES, 'Refunded', 'VOIDED'] as StatusFilter[]).map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption === 'All' ? 'All statuses' : statusOption}</option>)}
            </select>
            <div className="relative">
              <button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Sales display settings" className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[12.5px] font-medium text-[#2C3327]"><Settings2 className="h-4 w-4"/><span className="hidden sm:inline">View</span></button>
              {settingsOpen && <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-[#E3DDD0] bg-white p-3 shadow-lg"><div className="mb-2 text-xs font-semibold">Show fields</div>{(['customerName','channel','inventoryItem','sku','quantity','unitPrice','status','date','notes'] as SalesFieldKey[]).map((key) => <label key={key} className="flex items-center gap-2 py-1 text-xs capitalize"><input type="checkbox" checked={visible(key)} onChange={(e) => saveFieldVisibility(key,e.target.checked)}/>{key === 'inventoryItem' ? 'Item' : key.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)}</label>)}</div>}
            </div>
          </div>
        {selectedIds.length > 0 && <div className="flex items-center justify-between border-t border-[#EFEAE0] px-4 py-2 text-xs"><span>{selectedIds.length} sales selected</span><div className="flex gap-2"><select aria-label="Bulk sale channel" value={bulkChannel} onChange={(e) => setBulkChannel(e.target.value as SaleChannel)} className="rounded border px-2 py-1">{CHANNELS.map((value) => <option key={value}>{value}</option>)}</select><button type="button" disabled={bulkBusy} onClick={applyBulkChannel} className="rounded bg-[#2C3327] px-3 py-1 text-white">Apply channel</button><button type="button" onClick={() => setSelectedIds([])}>Clear</button></div></div>}
        </div>

        {sales.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="text-[14px] font-medium text-[#23281E]">
              Your sales table is empty
            </div>
            <p className="mt-1 text-[12.5px] text-[#6E7166]">
              Record your first sale to start tracking orders and revenue.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FAF8F3] hover:bg-[#3A4333]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Sale</span>
            </button>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="text-[14px] font-medium text-[#23281E]">
              No sales orders match your filters
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setChannelFilter('All');
                setStatusFilter('All');
              }}
              className="mt-3 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-4 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="divide-y divide-[#EFEAE0] md:hidden">
              {filteredSales.map((sale) => {
                const total = sale.quantity * sale.unitPrice - (sale.discountAmount ?? 0);
                return (
                  <div key={sale.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <input className="mr-2" aria-label={`Select ${sale.orderNumber}`} type="checkbox" checked={selectedIds.includes(sale.id)} onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, sale.id] : ids.filter((id) => id !== sale.id))}/>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11.5px] font-semibold text-[#6E7166]">
                            {sale.orderNumber}
                          </span>
                          {visible('date') && <span className="text-[11px] text-[#8A8C82]">{sale.date}</span>}
                        </div>
                        {visible('customerName') && <div className="mt-0.5 truncate text-[14px] font-semibold text-[#23281E]">
                          {sale.customerName}
                        </div>}
                        {visible('inventoryItem') && <div className="truncate text-[12.5px] text-[#6E7166]">
                          {sale.itemName} · {sale.quantity} × {formatCurrency(sale.unitPrice)}
                        </div>}
                      </div>
                      {visible('status') && <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(
                          sale.status
                        )}`}
                      >
                        {sale.status}
                      </span>}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {visible('channel') && <div className="text-[12px] text-[#6E7166]">
                        Channel: <span className="font-medium text-[#23281E]">{sale.channel}</span>
                      </div>}
                      <div className="text-[14.5px] font-semibold text-[#23281E] tabular-nums">
                        {formatCurrency(total)}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                    {(sale.status === 'Pending' || sale.status === 'PENDING') && (
                        <button
                          type="button"
                          onClick={() => onUpdateSale({ ...sale, status: 'Completed' })}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D8E0D0] bg-[#EEF2EA] px-2.5 py-1 text-[11.5px] font-medium text-[#2E3628]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Mark Paid</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(sale)}
                        aria-label={`Edit ${sale.orderNumber}`}
                        className="rounded-lg border border-[#E3DDD0] bg-white p-1.5 text-[#6E7166] hover:text-[#23281E]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(sale.id)}
                        aria-label={`Delete ${sale.orderNumber}`}
                        className="rounded-lg border border-[#E3DDD0] bg-white p-1.5 text-[#8C3A2B] hover:bg-[#F9ECE9]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFEAE0] bg-[#F8F5EE]/70 text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
                    <th className="py-3 pl-5 pr-3"><input aria-label="Select all visible sales" type="checkbox" checked={filteredSales.length > 0 && filteredSales.every((sale) => selectedIds.includes(sale.id))} onChange={(e) => setSelectedIds(e.target.checked ? filteredSales.map((sale) => sale.id) : [])}/></th>
                    <th className="py-3 pl-5 pr-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('orderNumber')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Order #</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    {visible('customerName') && <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('customerName')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Customer</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    {visible('inventoryItem') && <th className="px-3 py-3">Item</th>}
                    {visible('channel') && <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('channel')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Channel</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    {visible('quantity') && <th className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('quantity')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Qty</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    <th className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('total')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Total</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    {visible('status') && <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Status</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEAE0] text-[13px]">
                  {filteredSales.map((sale) => {
                    const total = sale.quantity * sale.unitPrice - (sale.discountAmount ?? 0);
                    return (
                      <tr key={sale.id} className="hover:bg-[#F8F5EE]/60 transition-colors">
                        <td className="py-3.5 pl-5 pr-3 align-top"><input aria-label={`Select ${sale.orderNumber}`} type="checkbox" checked={selectedIds.includes(sale.id)} onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, sale.id] : ids.filter((id) => id !== sale.id))}/></td>
                        <td className="py-3.5 pl-5 pr-3 align-top">
                          <div className="font-mono text-[12px] font-semibold text-[#23281E]">
                            {sale.orderNumber}
                          </div>
                          {visible('date') && <div className="text-[11px] text-[#7D8075]">{sale.date}</div>}
                        </td>
                        {visible('customerName') && <td className="px-3 py-3.5 align-top">
                          <div className="font-medium text-[#23281E]">{sale.customerName}</div>
                          {visible('notes') && sale.notes && (
                            <div className="mt-0.5 max-w-[200px] truncate text-[11px] text-[#7D8075]">
                              {sale.notes}
                            </div>
                          )}
                        </td>}
                        {visible('inventoryItem') && <td className="px-3 py-3.5 align-top">
                          <div className="text-[#23281E]">{sale.itemName}</div>
                          {visible('sku') && sale.sku && (
                            <div className="font-mono text-[11px] text-[#7D8075]">{sale.sku}</div>
                          )}
                        </td>}
                        {visible('channel') && <td className="px-3 py-3.5 align-top text-[#55584F]">{sale.channel}</td>}
                        {visible('quantity') && <td className="px-3 py-3.5 align-top text-right tabular-nums text-[#23281E]">
                          {formatNumber(sale.quantity)}
                        </td>}
                        <td className="px-3 py-3.5 align-top text-right tabular-nums">
                          <div className="font-semibold text-[#23281E]">{formatCurrency(total)}</div>
                          {visible('unitPrice') && <div className="text-[11px] text-[#7D8075]">
                            {formatCurrency(sale.unitPrice)} ea
                          </div>}
                        </td>
                        {visible('status') && <td className="px-3 py-3.5 align-top">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(
                              sale.status
                            )}`}
                          >
                            {sale.status}
                          </span>
                        </td>}
                        <td className="py-3.5 pl-3 pr-5 align-top text-right">
                          <div className="inline-flex items-center gap-1">
                            {(sale.status === 'Pending' || sale.status === 'PENDING') && (
                              <button
                                type="button"
                                onClick={() => onUpdateSale({ ...sale, status: 'Completed' })}
                                title="Mark as Completed"
                                aria-label={`Mark ${sale.orderNumber} as completed`}
                                className="rounded-lg p-1.5 text-[#2E3628] hover:bg-[#EEF2EA] transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(sale)}
                              title="Edit sale"
                              aria-label={`Edit ${sale.orderNumber}`}
                              className="rounded-lg p-1.5 text-[#6E7166] hover:bg-[#EFEAE0] hover:text-[#23281E] transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(sale.id)}
                              title="Delete sale"
                              aria-label={`Delete ${sale.orderNumber}`}
                              className="rounded-lg p-1.5 text-[#8C3A2B] hover:bg-[#F9ECE9] transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-1 border-t border-[#EFEAE0] bg-[#F8F5EE]/50 px-5 py-3 text-[12px] text-[#6E7166] sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing <strong className="text-[#23281E]">{filteredSales.length}</strong> of{' '}
                {sales.length} orders ({formatNumber(filteredUnits)} units)
              </span>
              <span className="tabular-nums">
                Active Revenue:{' '}
                <strong className="text-[#23281E]">{formatCurrency(filteredRevenue)}</strong>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Sale Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1F17]/50 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-lg rounded-2xl border border-[#E6E0D3] bg-[#FCFBF8] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EFEAE0] px-6 py-4">
              <h2 className="font-serif text-[19px] font-semibold text-[#23281E]">
                {editingSale ? 'Edit Sale Order' : 'Record New Sale'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-[#6E7166] hover:bg-[#EFEAE0] hover:text-[#23281E]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">
                    Order Number
                  </label>
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 font-mono text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">Date</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Jul 15, 2026"
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required={requireCustomerName && !customerId}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Alder & Oak Studio"
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">Utang customer (optional)</label>
                  <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); const found = creditCustomers.find((c) => c.id === e.target.value); if (found) setCustomerName(found.fullName); }} className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E]">
                    <option value="">Walk-in / no ledger</option>
                    {creditCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} · ₱{customer.currentBalance.toFixed(2)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">
                    Sales Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as SaleChannel)}
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  >
                    {CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#55584F]">
                  Link Inventory Item (Optional)
                </label>
                <select
                  value={selectedInventoryId}
                  onChange={(e) => handleInventorySelect(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                >
                  <option value="">Custom / Unlinked Item</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.sku} — {inv.name} ({inv.quantity} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Product or service name"
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Optional"
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 font-mono text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={0.001}
                    step="0.001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] tabular-nums text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">
                    Unit Price ({getCurrencySymbol()})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] tabular-nums text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  />
                </div>

                {(requireSaleStatus || customerId) && <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SaleStatus)}
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">Discount ({getCurrencySymbol()})</label>
                  <input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#55584F]">Amount paid ({getCurrencySymbol()})</label>
                  <input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} disabled={status === 'Completed'} className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] disabled:opacity-60" />
                </div>
              </div>

              {!editingSale && selectedInventoryId && status !== 'Refunded' && (
                <label className="flex items-center gap-2.5 rounded-lg border border-[#E6E0D3] bg-[#F8F5EE] px-3.5 py-2.5 text-[12.5px] text-[#23281E]">
                  <input
                    type="checkbox"
                    checked={deductInventory}
                    onChange={(e) => setDeductInventory(e.target.checked)}
                    className="h-4 w-4 rounded border-[#CFC7B5] text-[#2C3327] focus:ring-[#B89260]"
                  />
                  <span>Deduct sold quantity from inventory stock</span>
                </label>
              )}

              <div>
                <label className="block text-[11.5px] font-semibold text-[#55584F]">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment terms, delivery note, etc."
                  className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                />
              </div>

              {submitError && <p role="alert" className="rounded-lg border border-[#E8C9C3] bg-[#F9ECE9] px-3 py-2 text-[12px] text-[#8C3A2B]">{submitError}</p>}

              <div className="flex items-center justify-between border-t border-[#EFEAE0] pt-4">
                <div className="text-[12.5px] text-[#6E7166]">
                  Order Total:{' '}
                  <strong className="text-[14px] text-[#23281E] tabular-nums">
                    {formatCurrency(Math.max(0, (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0) - (parseFloat(discountAmount) || 0)))}
                  </strong>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] px-4 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFEAE0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333]"
                  >
                    {editingSale ? 'Save Changes' : 'Create Sale'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1F17]/50 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 shadow-xl">
            <h3 className="font-serif text-[18px] font-semibold text-[#23281E]">Void Sale?</h3>
            <p className="mt-2 text-[13px] text-[#6E7166]">
              The sale will be marked void and any deducted inventory will be returned.
            </p>
            {deleteError && <p role="alert" className="mt-3 rounded-lg border border-[#E8C9C3] bg-[#F9ECE9] px-3 py-2 text-[12px] text-[#8C3A2B]">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] px-4 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFEAE0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(confirmDeleteId)}
                className="rounded-lg bg-[#8C3A2B] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[#732E22]"
              >
                Void sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
