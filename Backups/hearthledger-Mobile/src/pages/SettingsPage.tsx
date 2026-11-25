import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, RotateCcw, Upload } from 'lucide-react';
import { CurrencyCode, TimeframeKey, WorkspaceSettings } from '../types';
import { CURRENCY_OPTIONS } from '../utils/format';

interface SettingsPageProps {
  settings: WorkspaceSettings;
  onSaveSettings: (next: WorkspaceSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonText: string) => boolean;
  onResetAll: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
  onResetAll,
}) => {
  const [draft, setDraft] = useState<WorkspaceSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...draft,
      storeName: draft.storeName.trim() || 'HearthLedger',
      workspaceSubtitle: draft.workspaceSubtitle.trim() || 'Financial Command Center',
      ownerEmail: draft.ownerEmail.trim() || settings.ownerEmail,
      defaultReorderPoint: Math.max(0, Number(draft.defaultReorderPoint) || 0),
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2400);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = onImportBackup(String(reader.result ?? ''));
      setImportStatus(
        ok
          ? { type: 'success', message: 'Workspace backup restored successfully.' }
          : { type: 'error', message: 'Invalid backup file. Please choose a HearthLedger JSON export.' }
      );
      window.setTimeout(() => setImportStatus(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
            Settings
          </h1>
          <p className="mt-0.5 text-[13px] text-[#6E7166]">
            Store identity, display currency, ledger defaults, and workspace backups.
          </p>
        </div>

        {savedNotice && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#C6DEC8] bg-[#EEF6EF] px-3 py-1.5 text-[12.5px] font-medium text-[#2E5A36] self-start sm:self-auto">
            <Check className="h-3.5 w-3.5" />
            <span>Changes saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Store & Currency Card */}
        <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
          <div className="border-b border-[#EFEAE0] pb-3.5">
            <h2 className="text-[14px] font-semibold text-[#23281E]">Store & Currency</h2>
            <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
              Updates the sidebar branding, browser title, and currency formatting across all pages.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="settings-store-name"
                className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
              >
                Store Name
              </label>
              <input
                id="settings-store-name"
                type="text"
                required
                value={draft.storeName}
                onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
                placeholder="HearthLedger"
                className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
              />
            </div>

            <div>
              <label
                htmlFor="settings-currency"
                className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
              >
                Display Currency
              </label>
              <select
                id="settings-currency"
                value={draft.currency}
                onChange={(e) =>
                  setDraft({ ...draft, currency: e.target.value as CurrencyCode })
                }
                className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.code} — {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-subtitle"
                className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
              >
                Workspace Tagline
              </label>
              <input
                id="settings-subtitle"
                type="text"
                value={draft.workspaceSubtitle}
                onChange={(e) => setDraft({ ...draft, workspaceSubtitle: e.target.value })}
                placeholder="Financial Command Center"
                className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
              />
            </div>

            <div>
              <label
                htmlFor="settings-owner-email"
                className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
              >
                Primary Contact Email
              </label>
              <input
                id="settings-owner-email"
                type="email"
                value={draft.ownerEmail}
                onChange={(e) => setDraft({ ...draft, ownerEmail: e.target.value })}
                placeholder="owner@hearthledger.app"
                className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
              />
            </div>
          </div>
        </section>

        {/* Ledger & Inventory Preferences */}
        <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
          <div className="border-b border-[#EFEAE0] pb-3.5">
            <h2 className="text-[14px] font-semibold text-[#23281E]">
              Ledger & Inventory Defaults
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
              Configure default reporting periods, reorder thresholds, and spending rules.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="settings-timeframe"
                className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
              >
                Default Overview Period
              </label>
              <select
                id="settings-timeframe"
                value={draft.defaultTimeframe}
                onChange={(e) =>
                  setDraft({ ...draft, defaultTimeframe: e.target.value as TimeframeKey })
                }
                className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="quarter">This Quarter</option>
                <option value="ytd">Year to Date</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-cycle-day"
                className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
              >
                Budget Cycle Day
              </label>
              <select
                id="settings-cycle-day"
                value={draft.budgetCycleDay}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    budgetCycleDay: e.target.value as WorkspaceSettings['budgetCycleDay'],
                  })
                }
                className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none"
              >
                <option value="1">1st of Month</option>
                <option value="15">15th of Month</option>
                <option value="last">Last Day of Month</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-reorder"
                className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
              >
                Default Reorder Point
              </label>
              <input
                id="settings-reorder"
                type="number"
                min="0"
                step="1"
                value={draft.defaultReorderPoint}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    defaultReorderPoint: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] tabular-nums focus:border-[#B89260] focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 divide-y divide-[#EFEAE0] border-t border-[#EFEAE0]">
            <label className="flex items-center justify-between gap-4 py-3.5 cursor-pointer">
              <div>
                <div className="text-[13px] font-medium text-[#23281E]">
                  Low-stock status warnings
                </div>
                <div className="text-[12px] text-[#6E7166]">
                  Flag inventory items when quantity drops to or below their reorder point.
                </div>
              </div>
              <input
                type="checkbox"
                checked={draft.lowStockAlerts}
                onChange={(e) => setDraft({ ...draft, lowStockAlerts: e.target.checked })}
                className="h-4 w-4 accent-[#2C3327] rounded cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-center justify-between gap-4 pt-3.5 cursor-pointer">
              <div>
                <div className="text-[13px] font-medium text-[#23281E]">
                  Deduct unpaid upcoming bills from Safe-to-Spend
                </div>
                <div className="text-[12px] text-[#6E7166]">
                  Automatically reserve unpaid scheduled bills inside your dashboard available balance.
                </div>
              </div>
              <input
                type="checkbox"
                checked={draft.includeBillsInSafeToSpend}
                onChange={(e) =>
                  setDraft({ ...draft, includeBillsInSafeToSpend: e.target.checked })
                }
                className="h-4 w-4 accent-[#2C3327] rounded cursor-pointer shrink-0"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-[#EFEAE0] pt-4">
            {isDirty && (
              <button
                type="button"
                onClick={() => setDraft(settings)}
                className="rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-4 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
              >
                Discard
              </button>
            )}
            <button
              type="submit"
              className="rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] transition-colors"
            >
              Save Settings
            </button>
          </div>
        </section>
      </form>

      {/* Data Backup & Reset */}
      <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
        <div className="border-b border-[#EFEAE0] pb-3.5">
          <h2 className="text-[14px] font-semibold text-[#23281E]">Data Backup & Recovery</h2>
          <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
            Export a JSON snapshot of all ledger, inventory, user account, and settings data.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onExportBackup}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON Backup</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#F3EFE6] transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Restore Backup</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#9B3B2B] font-medium">Reset all data?</span>
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setConfirmReset(false);
                }}
                className="rounded-lg bg-[#B91C1C] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#991B1B]"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#6E7166] hover:bg-[#EFEAE0]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5C9C5] bg-[#FDF7F6] px-3.5 py-2 text-[12.5px] font-medium text-[#9B3B2B] hover:bg-[#F9EAE8] transition-colors self-start sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Ledger Data</span>
            </button>
          )}
        </div>

        {importStatus && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-[12.5px] ${
              importStatus.type === 'success'
                ? 'border-[#C6DEC8] bg-[#EEF6EF] text-[#2E5A36]'
                : 'border-[#E5C9C5] bg-[#FDF7F6] text-[#9B3B2B]'
            }`}
          >
            {importStatus.message}
          </div>
        )}
      </section>
    </div>
  );
};
