import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Download,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Settings2,
} from 'lucide-react';
import { InventoryCategory, InventoryColumnLabels, InventoryFieldKey, InventoryItem, InventoryStatus, ShortcutAction, WorkspaceSettings } from '../types';
import { downloadCsv, formatCurrency, formatNumber, getCurrencySymbol } from '../utils/format';
import { resolveInventoryColumnLabels } from '../utils/inventoryColumns';
import { StarterPage } from './StarterPage';

interface InventoryPageProps {
  items: InventoryItem[];
  defaultReorderPoint?: number;
  lowStockAlerts?: boolean;
  enableUnitConversions?: boolean;
  columnLabels?: InventoryColumnLabels;
  onAddItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onAdjustQuantity: (id: string, delta: number) => void;
  onBreakPack: (parentId: string, childId: string, parentQty: number) => Promise<void>;
  fieldVisibility?: Partial<Record<InventoryFieldKey, boolean>>;
  keyboardShortcuts?: Partial<Record<ShortcutAction, string>>;
  onSaveSettings: (next: WorkspaceSettings) => void;
  settings: WorkspaceSettings;
}

type SortField = 'sku' | 'name' | 'category' | 'quantity' | 'unitCost' | 'totalValue';
type StatusFilter = 'All' | InventoryStatus;

const CATEGORIES: InventoryCategory[] = [
  'General',
  'Grocery',
  'Beverages',
  'Hardware',
  'Agrivet',
  'Bakery',
  'School Supplies',
  'Equipment',
  'Electronics',
  'Office & Studio',
  'Packaging',
  'Raw Materials',
];

export function getStockStatus(item: InventoryItem, lowStockAlerts = true): InventoryStatus {
  if (item.quantity <= 0) return 'Out of Stock';
  if (lowStockAlerts && item.quantity <= item.reorderPoint) return 'Low Stock';
  return 'In Stock';
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  items,
  defaultReorderPoint = 8,
  lowStockAlerts = true,
  enableUnitConversions = true,
  columnLabels,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAdjustQuantity,
  onBreakPack,
  fieldVisibility = {},
  keyboardShortcuts = {},
  onSaveSettings,
  settings,
}) => {
  const labels = resolveInventoryColumnLabels(columnLabels);
  const [view, setView] = useState<'inventory' | 'starter'>('inventory');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | InventoryCategory>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('General');
  const [location, setLocation] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [reorderPoint, setReorderPoint] = useState(String(defaultReorderPoint));
  const [unitCost, setUnitCost] = useState('0');
  const [unitPrice, setUnitPrice] = useState('0');
  const [baseUnit, setBaseUnit] = useState<NonNullable<InventoryItem['baseUnit']>>('pc');
  const [aliasesText, setAliasesText] = useState('');
  const [parentProductId, setParentProductId] = useState('');
  const [conversionFactor, setConversionFactor] = useState('1');
  const [sellingUnit, setSellingUnit] = useState<NonNullable<InventoryItem['sellingUnit']>>('pc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState<InventoryCategory>('General');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [visibleFields, setVisibleFields] = useState(fieldVisibility);
  const visible = (key: InventoryFieldKey) => visibleFields[key] !== false;

  useEffect(() => setVisibleFields(fieldVisibility), [fieldVisibility]);

  const saveFieldVisibility = (key: InventoryFieldKey, checked: boolean) => {
    const nextVisibility = { ...visibleFields, [key]: checked };
    setVisibleFields(nextVisibility);
    onSaveSettings({ ...settings, inventoryFieldVisibility: nextVisibility });
  };
  const shortcutMatches = (event: KeyboardEvent, shortcut?: string) => {
    if (!shortcut) return false;
    const parts = shortcut.toLowerCase().split('+').map((part) => part.trim());
    return event.key.toLowerCase() === parts[parts.length - 1] && event.altKey === parts.includes('alt') && event.ctrlKey === parts.includes('ctrl') && event.shiftKey === parts.includes('shift') && event.metaKey === parts.includes('meta');
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (shortcutMatches(event, keyboardShortcuts.newInventoryItem) && !typing) { event.preventDefault(); openAddModal(); }
      else if (shortcutMatches(event, keyboardShortcuts.bulkEditInventory) && !typing) { event.preventDefault(); setSelectedIds(items.map((item) => item.id)); }
      else if (shortcutMatches(event, keyboardShortcuts.searchInventory) && !typing) { event.preventDefault(); document.querySelector<HTMLInputElement>('[aria-label="Search inventory"]')?.focus(); }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [keyboardShortcuts]);

  const summary = useMemo(() => {
    const totalSkus = items.length;
    const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const attentionCount = items.filter((i) => getStockStatus(i, lowStockAlerts) !== 'In Stock').length;
    return { totalSkus, totalUnits, totalValue, attentionCount };
  }, [items, lowStockAlerts]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((item) => {
      const status = getStockStatus(item, lowStockAlerts);
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'sku') comparison = a.sku.localeCompare(b.sku);
      else if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortField === 'category') comparison = a.category.localeCompare(b.category);
      else if (sortField === 'quantity') comparison = a.quantity - b.quantity;
      else if (sortField === 'unitCost') comparison = a.unitCost - b.unitCost;
      else if (sortField === 'totalValue')
        comparison = a.quantity * a.unitCost - b.quantity * b.unitCost;
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [items, search, categoryFilter, statusFilter, sortField, sortDir, lowStockAlerts]);

  const filteredTotalUnits = useMemo(
    () => filteredItems.reduce((sum, i) => sum + i.quantity, 0),
    [filteredItems]
  );
  const filteredTotalValue = useMemo(
    () => filteredItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0),
    [filteredItems]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const breakPack = async (parent: InventoryItem) => {
    const child = items.find((candidate) => candidate.parentProductId === parent.id);
    if (!child) {
      window.alert('Add a child product and link it to this bulk product first.');
      return;
    }
    const rawQty = window.prompt(`How many ${parent.baseUnit ?? 'units'} of ${parent.name} to open?`, '1');
    if (rawQty === null) return;
    const parentQty = Number(rawQty);
    if (!Number.isFinite(parentQty) || parentQty <= 0) {
      window.alert('Enter a quantity greater than zero.');
      return;
    }
    try {
      await onBreakPack(parent.id, child.id, parentQty);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not convert stock');
    }
  };

  const applyBulkCategory = async () => {
    setBulkBusy(true);
    try {
      await Promise.all(items.filter((item) => selectedIds.includes(item.id)).map((item) => onUpdateItem({ ...item, category: bulkCategory, lastUpdated: 'Today' })));
      setSelectedIds([]);
    } finally { setBulkBusy(false); }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setSku('');
    setName('');
    setCategory('General');
    setLocation('Aisle A · Bin 01');
    setSupplier('');
    setQuantity('12');
    setReorderPoint(String(defaultReorderPoint));
    setUnitCost('45.00');
    setUnitPrice('60.75');
    setBaseUnit('pc');
    setSellingUnit('pc');
    setAliasesText('');
    setParentProductId('');
    setConversionFactor('1');
    setModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setSku(item.sku);
    setName(item.name);
    setCategory(item.category);
    setLocation(item.location);
    setSupplier(item.supplier);
    setQuantity(String(item.quantity));
    setReorderPoint(String(item.reorderPoint));
    setUnitCost(String(item.unitCost));
    setUnitPrice(String(item.unitPrice ?? 0));
    setBaseUnit(item.baseUnit ?? 'pc');
    setSellingUnit(item.sellingUnit ?? item.baseUnit ?? 'pc');
    setAliasesText((item.aliases ?? []).join(', '));
    setParentProductId(item.parentProductId ?? '');
    setConversionFactor(String(item.conversionFactor ?? 1));
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = Math.max(0, parseFloat(quantity) || 0);
    const parsedReorder = Math.max(0, parseFloat(reorderPoint) || 0);
    const parsedCost = Math.max(0, parseFloat(unitCost) || 0);
    const parsedPrice = Math.max(0, parseFloat(unitPrice) || 0);
    if (!name.trim()) return;

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        sku: sku.trim(),
        name: name.trim(),
        category,
        location: location.trim() || 'Unassigned',
        supplier: supplier.trim() || 'General Vendor',
        quantity: parsedQty,
        reorderPoint: parsedReorder,
        unitCost: parsedCost,
        unitPrice: parsedPrice,
        baseUnit,
        sellingUnit,
        aliases: aliasesText.split(',').map((value) => value.trim()).filter(Boolean),
        parentProductId: parentProductId || undefined,
        conversionFactor: Math.max(0.001, parseFloat(conversionFactor) || 1),
        lastUpdated: 'Today',
      });
    } else {
      onAddItem({
        sku: sku.trim(),
        name: name.trim(),
        category,
        location: location.trim() || 'Unassigned',
        supplier: supplier.trim() || 'General Vendor',
        quantity: parsedQty,
        reorderPoint: parsedReorder,
        unitCost: parsedCost,
        unitPrice: parsedPrice,
        baseUnit,
        sellingUnit,
        aliases: aliasesText.split(',').map((value) => value.trim()).filter(Boolean),
        parentProductId: parentProductId || undefined,
        conversionFactor: Math.max(0.001, parseFloat(conversionFactor) || 1),
      });
    }
    setModalOpen(false);
  };

  const handleExportCsv = () => {
    downloadCsv(
      'tallyledger-inventory.csv',
      [
        labels.sku,
        labels.name,
        labels.category,
        labels.location,
        labels.supplier,
        labels.quantity,
        labels.reorderPoint,
        labels.unitCost,
        labels.totalValue,
        labels.status,
      ],
      filteredItems.map((i) => [
        i.sku,
        i.name,
        i.category,
        i.location,
        i.supplier,
        i.quantity,
        i.reorderPoint,
        i.unitCost.toFixed(2),
        (i.quantity * i.unitCost).toFixed(2),
        getStockStatus(i, lowStockAlerts),
      ])
    );
  };

  if (view === 'starter') {
    return (
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
            Stocks
          </h1>
          <button
            type="button"
            onClick={() => setView('inventory')}
            className="rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFEAE0]"
          >
            Back to Inventory
          </button>
        </div>
        <StarterPage />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
          Inventory
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
            <span>Add Item</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Total SKUs
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatNumber(summary.totalSkus)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">catalog items</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Units on Hand
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatNumber(summary.totalUnits)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">in stock</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Total Value
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(summary.totalValue)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">cost basis</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Low / Out
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {summary.attentionCount}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">need reorder</div>
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
                placeholder="Search SKU or item..."
                aria-label="Search inventory"
                className="w-full rounded-lg border border-[#E3DDD0] bg-white py-2 pl-8 pr-3 text-[12.5px] text-[#23281E] placeholder-[#8E9086] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
              />
            </div>

            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'All' | InventoryCategory)}
              className="rounded-lg border border-[#E3DDD0] bg-white px-3 py-2 text-[12.5px] font-medium text-[#2C3327] focus:border-[#B89260] focus:outline-none"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="relative">
              <button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Inventory display settings" className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[12.5px] font-medium text-[#2C3327]"><Settings2 className="h-4 w-4"/><span className="hidden sm:inline">View</span></button>
              {settingsOpen && <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-[#E3DDD0] bg-white p-3 shadow-lg"><div className="mb-2 text-xs font-semibold">Show fields</div>{(['sku','name','category','location','supplier','quantity','unitCost'] as InventoryFieldKey[]).map((key) => <label key={key} className="flex items-center gap-2 py-1 text-xs capitalize"><input type="checkbox" checked={visible(key)} onChange={(e) => saveFieldVisibility(key, e.target.checked)}/>{key.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)}</label>)}</div>}
            </div>
            <button
              type="button"
              onClick={() => setView('starter')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFEAE0] transition-colors whitespace-nowrap shrink-0"
            >
              <Package className="h-3.5 w-3.5 text-[#6E7166]" />
              <span>Stocks</span>
            </button>
          </div>

          <div
            role="group"
            aria-label="Filter by stock status"
            className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#EFEAE0] p-1"
          >
            {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as StatusFilter[]).map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-md px-2.5 sm:px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#FCFBF8] text-[#23281E] shadow-xs'
                      : 'text-[#6E7166] hover:text-[#23281E]'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
        {selectedIds.length > 0 && <div className="flex items-center justify-between border-t border-[#EFEAE0] px-4 py-2 text-xs"><span>{selectedIds.length} items selected</span><div className="flex gap-2"><select aria-label="Bulk inventory category" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value as InventoryCategory)} className="rounded border px-2 py-1">{CATEGORIES.map((categoryOption) => <option key={categoryOption}>{categoryOption}</option>)}</select><button type="button" disabled={bulkBusy} onClick={applyBulkCategory} className="rounded bg-[#2C3327] px-3 py-1 text-white">Apply category</button><button type="button" onClick={() => setSelectedIds([])}>Clear</button></div></div>}

        {items.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="text-[14px] font-medium text-[#23281E]">
              Your inventory table is empty
            </div>
            <p className="mt-1 text-[12.5px] text-[#6E7166]">
              Add your first product or item to start tracking stock levels and costs.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FAF8F3] hover:bg-[#3A4333]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="text-[14px] font-medium text-[#23281E]">
              No inventory items match your filters
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('All');
                setStatusFilter('All');
              }}
              className="mt-3 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-4 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#EFEAE0] md:hidden">
              {filteredItems.map((item) => {
                const status = getStockStatus(item, lowStockAlerts);
                const totalValue = item.quantity * item.unitCost;
                const statusColor =
                  status === 'In Stock'
                    ? 'text-[#2E5A36]'
                    : status === 'Low Stock'
                      ? 'text-[#A16207]'
                      : 'text-[#B91C1C]';
                const markerColor =
                  status === 'In Stock'
                    ? 'bg-[#2E5A36]'
                    : status === 'Low Stock'
                      ? 'bg-[#D97706]'
                      : 'bg-[#DC2626]';

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <input className="mr-2" aria-label={`Select ${item.name}`} type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))}/>
                        {visible('sku') && <div className="font-mono text-[11.5px] text-[#6E7166]">{item.sku}</div>}
                        {visible('name') && <div className="mt-0.5 text-[14px] font-semibold text-[#23281E] leading-snug">
                          {item.name}
                        </div>}
                        {(visible('category') || visible('location')) && <div className="mt-0.5 text-[12px] text-[#6E7166]">
                          {visible('category') ? item.category : ''}{visible('category') && visible('location') ? ' · ' : ''}{visible('location') ? item.location : ''}
                        </div>}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium shrink-0 ${statusColor}`}>
                        <span className={`h-1.5 w-1.5 rounded-[1px] ${markerColor}`} aria-hidden="true" />
                        <span>{status}</span>
                      </span>
                    </div>

                    {enableUnitConversions && items.some((candidate) => candidate.parentProductId === item.id) && (
                      <button type="button" onClick={() => breakPack(item)} className="rounded-lg border border-[#DDD6C7] bg-white px-3 py-1.5 text-[11.5px] font-medium text-[#2C3327]">Break pack into child units</button>
                    )}

                    <div className="flex items-center justify-between pt-1 gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAdjustQuantity(item.id, -1)}
                          disabled={item.quantity <= 0}
                          aria-label={`Decrease quantity for ${item.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0D9CA] bg-white text-[#4B4E44] active:bg-[#EFEAE0] disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[32px] text-center text-[14px] font-semibold text-[#23281E] tabular-nums">
                          {formatNumber(item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAdjustQuantity(item.id, 1)}
                          aria-label={`Increase quantity for ${item.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0D9CA] bg-white text-[#4B4E44] active:bg-[#EFEAE0]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="text-right tabular-nums">
                        <div className="text-[14px] font-semibold text-[#23281E]">
                          {formatCurrency(totalValue)}
                        </div>
                        <div className="text-[11.5px] text-[#7D8075]">
                          {formatCurrency(item.unitCost)} each
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F4F0E6]">
                      {confirmDeleteId === item.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteItem(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded-lg px-3 py-1.5 text-[12px] font-medium bg-[#B91C1C] text-white"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#6E7166]"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#4B4E44] hover:bg-[#EFEAE0]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#B91C1C] hover:bg-[#FEE2E2]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E6E0D3] bg-[#F8F5EE] text-[11.5px] font-semibold text-[#5C6055]">
                    <th className="py-3 pl-5 pr-3 whitespace-nowrap"><input aria-label="Select all visible inventory" type="checkbox" checked={filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id))} onChange={(e) => setSelectedIds(e.target.checked ? filteredItems.map((item) => item.id) : [])}/></th>
                    {visible('sku') && <th className="py-3 pl-5 pr-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('sku')}
                        className="inline-flex items-center gap-1 hover:text-[#23281E]"
                      >
                        <span>{labels.sku}</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    {visible('name') && <th className="py-3 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-[#23281E]"
                      >
                        <span>{labels.name}</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    {visible('category') && <th className="py-3 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('category')}
                        className="inline-flex items-center gap-1 hover:text-[#23281E]"
                      >
                        <span>{labels.category}</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    {visible('location') && <th className="py-3 px-3 whitespace-nowrap">{labels.location}</th>}
                    {visible('quantity') && <th className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('quantity')}
                        className="inline-flex items-center gap-1 hover:text-[#23281E]"
                      >
                        <span>{labels.quantity}</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    {visible('unitCost') && <th className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('unitCost')}
                        className="inline-flex items-center gap-1 hover:text-[#23281E]"
                      >
                        <span>{labels.unitCost}</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>}
                    <th className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('totalValue')}
                        className="inline-flex items-center gap-1 hover:text-[#23281E]"
                      >
                        <span>{labels.totalValue}</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap">{labels.status}</th>
                    <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEAE0] text-[13px]">
                  {filteredItems.map((item) => {
                    const status = getStockStatus(item, lowStockAlerts);
                    const totalValue = item.quantity * item.unitCost;
                    const statusColor =
                      status === 'In Stock'
                        ? 'text-[#2E5A36]'
                        : status === 'Low Stock'
                          ? 'text-[#A16207]'
                          : 'text-[#B91C1C]';
                    const markerColor =
                      status === 'In Stock'
                        ? 'bg-[#2E5A36]'
                        : status === 'Low Stock'
                          ? 'bg-[#D97706]'
                          : 'bg-[#DC2626]';

                    return (
                      <tr key={item.id} className="hover:bg-[#F8F5EE]/70 transition-colors">
                        <td className="py-3 pl-5 pr-3"><input aria-label={`Select ${item.name}`} type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))}/></td>
                        {visible('sku') && <td className="py-3 pl-5 pr-3 font-mono text-[12px] text-[#4B4E44] whitespace-nowrap">
                          {item.sku}
                        </td>}
                        {visible('name') && <td className="py-3 px-3">
                          <div className="font-medium text-[#23281E]">{item.name}</div>
                          {visible('supplier') && <div className="text-[11.5px] text-[#7D8075]">{item.supplier}</div>}
                        </td>}
                        {visible('category') && <td className="py-3 px-3 text-[#4B4E44] whitespace-nowrap">
                          {item.category}
                        </td>}
                        {visible('location') && <td className="py-3 px-3 text-[12.5px] text-[#6E7166] whitespace-nowrap">
                          {item.location}
                        </td>}
                        {visible('quantity') && <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onAdjustQuantity(item.id, -1)}
                              disabled={item.quantity <= 0}
                              aria-label={`Decrease quantity for ${item.name}`}
                              className="flex h-6 w-6 items-center justify-center rounded border border-[#E0D9CA] bg-white text-[#4B4E44] hover:bg-[#EFEAE0] disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[32px] text-center font-semibold text-[#23281E] tabular-nums">
                              {formatNumber(item.quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onAdjustQuantity(item.id, 1)}
                              aria-label={`Increase quantity for ${item.name}`}
                              className="flex h-6 w-6 items-center justify-center rounded border border-[#E0D9CA] bg-white text-[#4B4E44] hover:bg-[#EFEAE0]"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>}
                        {visible('unitCost') && <td className="py-3 px-3 text-right text-[#23281E] tabular-nums whitespace-nowrap">
                          {formatCurrency(item.unitCost)}
                        </td>}
                        <td className="py-3 px-3 text-right font-medium text-[#23281E] tabular-nums whitespace-nowrap">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-2 text-[12.5px] font-medium ${statusColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-[1px] ${markerColor}`} aria-hidden="true" />
                            <span>{status}</span>
                          </span>
                        </td>
                        <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                          {confirmDeleteId === item.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteItem(item.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="rounded px-2 py-1 text-[11.5px] font-medium bg-[#B91C1C] text-white"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded px-2 py-1 text-[11.5px] font-medium text-[#6E7166]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                aria-label={`Edit ${item.name}`}
                                className="rounded-md p-1.5 text-[#6E7166] hover:bg-[#EFEAE0] hover:text-[#23281E]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {enableUnitConversions && items.some((candidate) => candidate.parentProductId === item.id) && <button type="button" onClick={() => breakPack(item)} aria-label={`Break pack for ${item.name}`} className="rounded-md px-2 py-1 text-[11px] text-[#2C3327] hover:bg-[#EFEAE0]">Break</button>}
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                aria-label={`Delete ${item.name}`}
                                className="rounded-md p-1.5 text-[#6E7166] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5 border-t border-[#E6E0D3] bg-[#F8F5EE] px-4 sm:px-5 py-3 text-[12px] text-[#5C6055] sm:flex-row sm:items-center sm:justify-between rounded-b-xl">
          <span>
            {filteredItems.length} of {items.length} SKUs
          </span>
          <div className="flex items-center gap-5 tabular-nums">
            <span>
              Units: <strong className="font-semibold text-[#23281E]">{formatNumber(filteredTotalUnits)}</strong>
            </span>
            <span>
              Value: <strong className="font-semibold text-[#23281E]">{formatCurrency(filteredTotalValue)}</strong>
            </span>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1F17]/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE0]">
              <h2 className="font-serif text-[20px] font-semibold text-[#23281E]">
                {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close item form"
                className="rounded-lg p-2 text-[#6E7166] hover:bg-[#EFEAE0]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    {labels.sku}
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Leave blank to generate a SKU"
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 font-mono text-[13px] focus:border-[#B89260] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    {labels.category}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                  {labels.name}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Brass Counterweight Scale Set"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    {labels.location}
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    {labels.supplier}
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    {labels.quantity}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] tabular-nums focus:border-[#B89260] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    {labels.reorderPoint}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] tabular-nums focus:border-[#B89260] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    {labels.unitCost} ({getCurrencySymbol()})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] tabular-nums focus:border-[#B89260] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#5C6055]">Base unit</label>
                  <select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value as typeof baseUnit)} className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px]">
                    {['pc', 'pack', 'kg', 'g', 'meter', 'liter', 'sack', 'box', 'sheet', 'tasa', 'tray', 'ream'].map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#5C6055]">Default selling unit</label>
                  <select value={sellingUnit} onChange={(e) => setSellingUnit(e.target.value as typeof sellingUnit)} className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px]">
                    {['pc', 'pack', 'kg', 'g', 'meter', 'liter', 'sack', 'box', 'sheet', 'tasa', 'tray', 'ream'].map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#5C6055]">Default selling price ({getCurrencySymbol()})</label>
                  <input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] tabular-nums" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#5C6055]">Aliases (comma separated)</label>
                  <input value={aliasesText} onChange={(e) => setAliasesText(e.target.value)} placeholder="Common spelling or local name" className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px]" />
                </div>
                <div>
                  {enableUnitConversions && <>
                    <label className="mb-1 block text-[12px] font-medium text-[#5C6055]">Parent bulk product (optional)</label>
                    <select value={parentProductId} onChange={(e) => setParentProductId(e.target.value)} className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px]">
                      <option value="">None</option>
                      {items.filter((candidate) => candidate.id !== editingItem?.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                    </select>
                  </>}
                </div>
              </div>
              {enableUnitConversions && parentProductId && <div>
                <label className="mb-1 block text-[12px] font-medium text-[#5C6055]">Child units yielded from one parent unit</label>
                <input type="number" min="0.001" step="0.001" value={conversionFactor} onChange={(e) => setConversionFactor(e.target.value)} className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px]" />
              </div>}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EFEAE0]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-4 py-2 text-[12.5px] font-medium text-[#2C3327]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333]"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
