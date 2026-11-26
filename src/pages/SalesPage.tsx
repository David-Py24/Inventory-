import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { InventoryItem, SaleChannel, SaleRecord, SaleStatus } from '../types';
import { downloadCsv, formatCurrency, formatNumber, getCurrencySymbol } from '../utils/format';

interface SalesPageProps {
  sales: SaleRecord[];
  inventory: InventoryItem[];
  onAddSale: (sale: Omit<SaleRecord, 'id'>, deductInventory: boolean) => void;
  onUpdateSale: (sale: SaleRecord) => void;
  onDeleteSale: (id: string) => void;
}

type SortField = 'orderNumber' | 'customerName' | 'channel' | 'quantity' | 'total' | 'status';
type StatusFilter = 'All' | SaleStatus;

const CHANNELS: SaleChannel[] = ['In-Store', 'Online', 'Wholesale', 'POS'];
const STATUSES: SaleStatus[] = ['Completed', 'Pending', 'Refunded'];

function getStatusBadgeClass(status: SaleStatus): string {
  if (status === 'Completed') {
    return 'bg-[#EEF2EA] text-[#2E3628] border-[#D8E0D0]';
  }
  if (status === 'Pending') {
    return 'bg-[#FBF3E4] text-[#8E6733] border-[#EAD8B8]';
  }
  return 'bg-[#F9ECE9] text-[#8C3A2B] border-[#E8C9C3]';
}

export const SalesPage: React.FC<SalesPageProps> = ({
  sales,
  inventory,
  onAddSale,
  onUpdateSale,
  onDeleteSale,
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

  const summary = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'Completed');
    const pending = sales.filter((s) => s.status === 'Pending');
    const totalRevenue = completed.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
    const pendingTotal = pending.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
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
        comparison = a.quantity * a.unitPrice - b.quantity * b.unitPrice;
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
        .filter((s) => s.status !== 'Refunded')
        .reduce((sum, s) => sum + s.quantity * s.unitPrice, 0),
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
    setModalOpen(true);
  };

  const openEditModal = (sale: SaleRecord) => {
    setEditingSale(sale);
    setOrderNumber(sale.orderNumber);
    setCustomerName(sale.customerName);
    setChannel(sale.channel);
    setSelectedInventoryId(sale.inventoryItemId ?? '');
    setItemName(sale.itemName);
    setSku(sale.sku ?? '');
    setQuantity(String(sale.quantity));
    setUnitPrice(String(sale.unitPrice));
    setStatus(sale.status);
    setDate(sale.date);
    setNotes(sale.notes ?? '');
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
        setUnitPrice((found.unitCost * 1.35).toFixed(2));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);
    const parsedPrice = Math.max(0, parseFloat(unitPrice) || 0);
    if (!orderNumber.trim() || !customerName.trim() || !itemName.trim()) return;

    const payload = {
      orderNumber: orderNumber.trim(),
      customerName: customerName.trim(),
      channel,
      inventoryItemId: selectedInventoryId || undefined,
      itemName: itemName.trim(),
      sku: sku.trim() || undefined,
      quantity: parsedQty,
      unitPrice: parsedPrice,
      status,
      date: date.trim() || formatToday(),
      notes: notes.trim() || undefined,
    };

    if (editingSale) {
      onUpdateSale({ ...editingSale, ...payload });
    } else {
      onAddSale(payload, deductInventory && Boolean(selectedInventoryId) && status !== 'Refunded');
    }
    setModalOpen(false);
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
        (s.quantity * s.unitPrice).toFixed(2),
        s.status,
        s.date,
      ])
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
          Sales
        </h1>

        <div className="flex items-center gap-2.5">
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
          </div>

          <div
            role="group"
            aria-label="Filter by sale status"
            className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#EFEAE0] p-1"
          >
            {(['All', 'Completed', 'Pending', 'Refunded'] as StatusFilter[]).map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-2.5 sm:px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#FCFBF8] text-[#23281E] shadow-xs'
                      : 'text-[#6E7166] hover:text-[#23281E]'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
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
                const total = sale.quantity * sale.unitPrice;
                return (
                  <div key={sale.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11.5px] font-semibold text-[#6E7166]">
                            {sale.orderNumber}
                          </span>
                          <span className="text-[11px] text-[#8A8C82]">{sale.date}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[14px] font-semibold text-[#23281E]">
                          {sale.customerName}
                        </div>
                        <div className="truncate text-[12.5px] text-[#6E7166]">
                          {sale.itemName} · {sale.quantity} × {formatCurrency(sale.unitPrice)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(
                          sale.status
                        )}`}
                      >
                        {sale.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[12px] text-[#6E7166]">
                        Channel: <span className="font-medium text-[#23281E]">{sale.channel}</span>
                      </div>
                      <div className="text-[14.5px] font-semibold text-[#23281E] tabular-nums">
                        {formatCurrency(total)}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {sale.status === 'Pending' && (
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
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('customerName')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Customer</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    <th className="px-3 py-3">Item</th>
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('channel')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Channel</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('quantity')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Qty</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
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
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="inline-flex items-center gap-1.5 hover:text-[#23281E]"
                      >
                        <span>Status</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEAE0] text-[13px]">
                  {filteredSales.map((sale) => {
                    const total = sale.quantity * sale.unitPrice;
                    return (
                      <tr key={sale.id} className="hover:bg-[#F8F5EE]/60 transition-colors">
                        <td className="py-3.5 pl-5 pr-3 align-top">
                          <div className="font-mono text-[12px] font-semibold text-[#23281E]">
                            {sale.orderNumber}
                          </div>
                          <div className="text-[11px] text-[#7D8075]">{sale.date}</div>
                        </td>
                        <td className="px-3 py-3.5 align-top">
                          <div className="font-medium text-[#23281E]">{sale.customerName}</div>
                          {sale.notes && (
                            <div className="mt-0.5 max-w-[200px] truncate text-[11px] text-[#7D8075]">
                              {sale.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3.5 align-top">
                          <div className="text-[#23281E]">{sale.itemName}</div>
                          {sale.sku && (
                            <div className="font-mono text-[11px] text-[#7D8075]">{sale.sku}</div>
                          )}
                        </td>
                        <td className="px-3 py-3.5 align-top text-[#55584F]">{sale.channel}</td>
                        <td className="px-3 py-3.5 align-top text-right tabular-nums text-[#23281E]">
                          {formatNumber(sale.quantity)}
                        </td>
                        <td className="px-3 py-3.5 align-top text-right tabular-nums">
                          <div className="font-semibold text-[#23281E]">{formatCurrency(total)}</div>
                          <div className="text-[11px] text-[#7D8075]">
                            {formatCurrency(sale.unitPrice)} ea
                          </div>
                        </td>
                        <td className="px-3 py-3.5 align-top">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(
                              sale.status
                            )}`}
                          >
                            {sale.status}
                          </span>
                        </td>
                        <td className="py-3.5 pl-3 pr-5 align-top text-right">
                          <div className="inline-flex items-center gap-1">
                            {sale.status === 'Pending' && (
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
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Alder & Oak Studio"
                    className="mt-1.5 w-full rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
                  />
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
                    min={1}
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

                <div>
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

              <div className="flex items-center justify-between border-t border-[#EFEAE0] pt-4">
                <div className="text-[12.5px] text-[#6E7166]">
                  Order Total:{' '}
                  <strong className="text-[14px] text-[#23281E] tabular-nums">
                    {formatCurrency(
                      (Math.max(1, parseInt(quantity, 10) || 1)) *
                        (Math.max(0, parseFloat(unitPrice) || 0))
                    )}
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
            <h3 className="font-serif text-[18px] font-semibold text-[#23281E]">Delete Sale?</h3>
            <p className="mt-2 text-[13px] text-[#6E7166]">
              This will permanently remove the sale record from your ledger.
            </p>
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
                onClick={() => {
                  onDeleteSale(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-lg bg-[#8C3A2B] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[#732E22]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
