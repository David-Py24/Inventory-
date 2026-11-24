import { CurrencyCode } from '../types';

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { code: 'PHP', label: 'Philippine Peso (₱)', symbol: '₱' },
  { code: 'CAD', label: 'Canadian Dollar (CA$)', symbol: 'CA$' },
  { code: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
  { code: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
];

let activeCurrency: CurrencyCode = 'USD';

export function setActiveCurrency(code: CurrencyCode): void {
  activeCurrency = code;
}

export function getActiveCurrency(): CurrencyCode {
  return activeCurrency;
}

export function getCurrencySymbol(code: CurrencyCode = activeCurrency): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? '$';
}

export function formatCurrency(
  value: number,
  options?: { maximumFractionDigits?: number; currency?: CurrencyCode }
): string {
  const currency = options?.currency ?? activeCurrency;
  const isZeroDecimalCurrency = currency === 'JPY';
  const maxDigits = isZeroDecimalCurrency ? 0 : (options?.maximumFractionDigits ?? 2);
  const minDigits = maxDigits === 0 ? 0 : 2;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(Math.abs(value));
  return value < 0 ? `-${formatted}` : formatted;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (cell: string | number) => {
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
