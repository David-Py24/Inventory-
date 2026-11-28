import { InventoryColumnKey, InventoryColumnLabels } from '../types';

export const MAX_COLUMN_LABEL_LENGTH = 32;

export const DEFAULT_INVENTORY_COLUMN_LABELS: Record<InventoryColumnKey, string> = {
  sku: 'SKU',
  name: 'Item',
  category: 'Category',
  location: 'Location',
  supplier: 'Supplier',
  quantity: 'Qty',
  reorderPoint: 'Reorder Pt.',
  unitCost: 'Unit Cost',
  totalValue: 'Total Value',
  status: 'Status',
};

export const INVENTORY_COLUMN_KEYS = Object.keys(
  DEFAULT_INVENTORY_COLUMN_LABELS
) as InventoryColumnKey[];

/** Merge user overrides over defaults. Display-only; never changes data keys or DB columns. */
export function resolveInventoryColumnLabels(
  overrides?: InventoryColumnLabels
): Record<InventoryColumnKey, string> {
  const resolved = { ...DEFAULT_INVENTORY_COLUMN_LABELS };
  if (!overrides) return resolved;
  for (const key of INVENTORY_COLUMN_KEYS) {
    const value = overrides[key]?.trim();
    if (value) resolved[key] = value.slice(0, MAX_COLUMN_LABEL_LENGTH);
  }
  return resolved;
}

/** Keep only non-empty overrides that differ from defaults. */
export function sanitizeInventoryColumnLabels(
  overrides?: InventoryColumnLabels
): InventoryColumnLabels {
  const clean: InventoryColumnLabels = {};
  if (!overrides) return clean;
  for (const key of INVENTORY_COLUMN_KEYS) {
    const value = overrides[key]?.trim().slice(0, MAX_COLUMN_LABEL_LENGTH);
    if (value && value !== DEFAULT_INVENTORY_COLUMN_LABELS[key]) clean[key] = value;
  }
  return clean;
}
