import React, { useEffect, useRef, useState } from 'react';
import { Check, Cloud, CloudDownload, CloudUpload, Download, RotateCcw, Upload } from 'lucide-react';
import { CurrencyCode, TimeframeKey, WorkspaceSettings } from '../types';
import { api } from '../api/client';
import { CURRENCY_OPTIONS } from '../utils/format';
import {
  DEFAULT_INVENTORY_COLUMN_LABELS,
  INVENTORY_COLUMN_KEYS,
  MAX_COLUMN_LABEL_LENGTH,
  sanitizeInventoryColumnLabels,
} from '../utils/inventoryColumns';

interface SettingsPageProps {
  settings: WorkspaceSettings;
  isOnline?: boolean;
  onSaveSettings: (next: WorkspaceSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonText: string) => boolean;
  onResetAll: () => void;
}

type SettingsSectionId = 'general' | 'inventory' | 'accounts' | 'data';

const SETTINGS_NAV_ITEMS: { id: SettingsSectionId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'data', label: 'Data & recovery' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  isOnline = true,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
  onResetAll,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');
  const [draft, setDraft] = useState<WorkspaceSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{
    lastBackupAt: string | null;
    lastRestoreAt: string | null;
    supabaseConfigured: boolean;
    supabaseReachable?: boolean;
  } | null>(null);
  const [cloudBusy, setCloudBusy] = useState<'push' | 'pull' | null>(null);
  const [cloudNotice, setCloudNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api
      .getBackupStatus(true)
      .then((res) => setBackupStatus(res))
      .catch(() => {
        // ignore if offline or unauthenticated
      });
  }, []);

  const handleCloudBackup = async () => {
    setCloudBusy('push');
    setCloudNotice(null);
    try {
      const res = await api.pushCloudBackup();
      setBackupStatus((prev) =>
        prev
          ? { ...prev, lastBackupAt: res.backedUpAt, supabaseReachable: true }
          : { lastBackupAt: res.backedUpAt, lastRestoreAt: null, supabaseConfigured: true, supabaseReachable: true }
      );
      setCloudNotice({
        type: 'success',
        message: 'Local SQLite data backed up to Supabase PostgreSQL.',
      });
    } catch (err) {
      setCloudNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Cloud backup failed.',
      });
    } finally {
      setCloudBusy(null);
    }
  };

  const handleCloudRestore = async () => {
    setCloudBusy('pull');
    setCloudNotice(null);
    try {
      const res = await api.pullCloudRestore();
      setBackupStatus((prev) =>
        prev
          ? { ...prev, lastRestoreAt: res.restoredAt, supabaseReachable: true }
          : { lastBackupAt: null, lastRestoreAt: res.restoredAt, supabaseConfigured: true, supabaseReachable: true }
      );
      onResetAll();
      setCloudNotice({
        type: 'success',
        message: 'Restored local SQLite database from Supabase PostgreSQL.',
      });
    } catch (err) {
      setCloudNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Cloud restore failed.',
      });
    } finally {
      setCloudBusy(null);
    }
  };

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    const handleScrollSpy = () => {
      let current: SettingsSectionId = 'general';
      for (const item of SETTINGS_NAV_ITEMS) {
        const el = document.getElementById(`settings-sec-${item.id}`);
        if (el && el.getBoundingClientRect().top < 160) {
          current = item.id;
        }
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        current = 'data';
      }
      setActiveSection(current);
    };

    handleScrollSpy();
    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollSpy);
  }, []);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const scrollToSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    const el = document.getElementById(`settings-sec-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSaveSettings({
      ...draft,
      storeName: draft.storeName.trim() || 'TallyLedger',
      workspaceSubtitle: draft.workspaceSubtitle.trim() || 'Financial Command Center',
      ownerEmail: draft.ownerEmail.trim() || settings.ownerEmail,
      defaultReorderPoint: Math.max(0, Number(draft.defaultReorderPoint) || 0),
      inventoryColumnLabels: sanitizeInventoryColumnLabels(draft.inventoryColumnLabels),
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
          : {
              type: 'error',
              message: 'Invalid backup file. Please choose a TallyLedger JSON export.',
            }
      );
      window.setTimeout(() => setImportStatus(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full pb-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Fixed/Sticky Settings Left Sidebar */}
        <aside className="w-full shrink-0 lg:sticky lg:top-7 lg:w-[200px]">
          <div className="mb-4">
            <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
              Settings
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#6E7166]">Workspace preferences</p>
          </div>

          <nav
            aria-label="Settings sections"
            className="flex flex-row gap-1 overflow-x-auto border-b border-[#E6E0D3] pb-1 lg:flex-col lg:gap-0.5 lg:border-b-0 lg:border-l lg:border-[#E6E0D3] lg:pb-0"
          >
            {SETTINGS_NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`whitespace-nowrap shrink-0 border-b-2 px-3.5 py-2 text-left text-[13px] transition-colors lg:border-b-0 lg:border-l-2 lg:-ml-[1px] lg:px-4 ${
                    isActive
                      ? 'border-[#2C3327] font-semibold text-[#23281E]'
                      : 'border-transparent font-medium text-[#6E7166] hover:text-[#23281E]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Scrollable Settings Sections */}
        <div className="min-w-0 flex-1">
          <form onSubmit={handleSave} className="mx-auto w-full max-w-[760px] space-y-8">
            {/* General Section */}
            <div id="settings-sec-general" className="scroll-mt-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E0D3] pb-3.5">
                <div>
                  <h2 className="font-serif text-[20px] sm:text-[22px] font-semibold tracking-tight text-[#23281E]">
                    General
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                    How the workspace looks and formats numbers.
                  </p>
                </div>

                {savedNotice && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#C6DEC8] bg-[#EEF6EF] px-3 py-1.5 text-[12.5px] font-medium text-[#2E5A36]">
                    <Check className="h-3.5 w-3.5" />
                    <span>Changes saved</span>
                  </div>
                )}
              </div>

              <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
                <div className="border-b border-[#EFEAE0] pb-3.5 mb-4">
                  <h3 className="text-[14px] font-semibold text-[#23281E]">Store identity</h3>
                  <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                    Updates the sidebar branding and browser title.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      placeholder="TallyLedger"
                      className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
                    />
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
                </div>
              </section>

              <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
                <div className="border-b border-[#EFEAE0] pb-3.5 mb-4">
                  <h3 className="text-[14px] font-semibold text-[#23281E]">
                    Currency &amp; defaults
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                    Applied to formatting and the overview page across the app.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
                    >
                      <option value="this_month">This Month</option>
                      <option value="last_month">Last Month</option>
                      <option value="quarter">This Quarter</option>
                      <option value="ytd">Year to Date</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>

            {/* Inventory Section */}
            <div id="settings-sec-inventory" className="scroll-mt-6 space-y-4">
              <div className="border-b border-[#E6E0D3] pb-3.5">
                <h2 className="font-serif text-[20px] font-semibold tracking-tight text-[#23281E]">
                  Inventory
                </h2>
                <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                  Reorder thresholds, stock alerts, and column names.
                </p>
              </div>

              <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
                <div className="border-b border-[#EFEAE0] pb-3.5 mb-4">
                  <h3 className="text-[14px] font-semibold text-[#23281E]">
                    Stock &amp; reorder rules
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                    Default thresholds and low-stock alert behavior.
                  </p>
                </div>

                <div className="max-w-[280px]">
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
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] tabular-nums focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
                  />
                </div>

                <label className="mt-5 flex items-center justify-between gap-4 border-t border-[#EFEAE0] pt-3.5 cursor-pointer">
                  <div>
                    <div className="text-[13px] font-medium text-[#23281E]">
                      Low-stock status warnings
                    </div>
                    <div className="text-[12px] text-[#6E7166]">
                      Flag items when quantity drops to or below their reorder point.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.lowStockAlerts}
                    onChange={(e) => setDraft({ ...draft, lowStockAlerts: e.target.checked })}
                    className="h-4 w-4 accent-[#2C3327] rounded cursor-pointer shrink-0"
                  />
                </label>
              </section>

              <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EFEAE0] pb-3.5 mb-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#23281E]">
                      Inventory column names
                    </h3>
                    <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                      Display only. Underlying data and database columns are never renamed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, inventoryColumnLabels: {} })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3 py-1.5 text-[12px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset names</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {INVENTORY_COLUMN_KEYS.map((key) => (
                    <div key={key}>
                      <label
                        htmlFor={`settings-col-${key}`}
                        className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
                      >
                        {DEFAULT_INVENTORY_COLUMN_LABELS[key]}
                        <span className="ml-1.5 font-mono text-[10.5px] text-[#8A8C82]">
                          ({key})
                        </span>
                      </label>
                      <input
                        id={`settings-col-${key}`}
                        type="text"
                        maxLength={MAX_COLUMN_LABEL_LENGTH}
                        value={draft.inventoryColumnLabels?.[key] ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            inventoryColumnLabels: {
                              ...draft.inventoryColumnLabels,
                              [key]: e.target.value,
                            },
                          })
                        }
                        placeholder={DEFAULT_INVENTORY_COLUMN_LABELS[key]}
                        className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11.5px] text-[#6E7166]">
                  Leave empty to use the default name.
                </p>
              </section>
            </div>

            {/* Accounts Section */}
            <div id="settings-sec-accounts" className="scroll-mt-6 space-y-4">
              <div className="border-b border-[#E6E0D3] pb-3.5">
                <h2 className="font-serif text-[20px] font-semibold tracking-tight text-[#23281E]">
                  Accounts
                </h2>
                <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                  Owner contact, budget cycle, and spending rules.
                </p>
              </div>

              <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
                <div className="border-b border-[#EFEAE0] pb-3.5 mb-4">
                  <h3 className="text-[14px] font-semibold text-[#23281E]">
                    Owner &amp; ledger defaults
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                    Workspace ownership, billing cycle day, and safe-to-spend rules.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      placeholder="owner@tallyledger.app"
                      className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
                    />
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
                      className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
                    >
                      <option value="1">1st of Month</option>
                      <option value="15">15th of Month</option>
                      <option value="last">Last Day of Month</option>
                    </select>
                  </div>
                </div>

                <label className="mt-5 flex items-center justify-between gap-4 border-t border-[#EFEAE0] pt-3.5 cursor-pointer">
                  <div>
                    <div className="text-[13px] font-medium text-[#23281E]">
                      Deduct unpaid upcoming bills from Safe-to-Spend
                    </div>
                    <div className="text-[12px] text-[#6E7166]">
                      Reserve unpaid scheduled bills inside the dashboard available balance.
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
              </section>
            </div>

            {/* Data & Recovery Section */}
            <div id="settings-sec-data" className="scroll-mt-6 space-y-4">
              <div className="border-b border-[#E6E0D3] pb-3.5">
                <h2 className="font-serif text-[20px] font-semibold tracking-tight text-[#23281E]">
                  Data &amp; recovery
                </h2>
                <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                  Backups live apart from preferences, with destructive actions separated below.
                </p>
              </div>

              <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
                <div className="border-b border-[#EFEAE0] pb-3.5 mb-4">
                  <h3 className="text-[14px] font-semibold text-[#23281E]">
                    Backup &amp; recovery
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                    Export a JSON snapshot of ledger, inventory, accounts, and settings.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export JSON backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Restore backup</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
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

              <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#EFEAE0] pb-3.5 mb-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#23281E] flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-[#6E7166]" />
                      <span>Online backup (Supabase PostgreSQL)</span>
                    </h3>
                    <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                      Your workspace runs offline-first on local SQLite. Back up to or restore from
                      Supabase when online.
                    </p>
                  </div>
                  {backupStatus && (
                    <span
                     className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                         isOnline && backupStatus.supabaseReachable
                           ? 'bg-[#EEF6EF] text-[#2E5A36]'
                           : 'bg-[#F5F1E8] text-[#6E7166]'
                       }`}
                     >
                       {!backupStatus.supabaseConfigured
                         ? 'Supabase not configured'
                         : isOnline && backupStatus.supabaseReachable
                           ? 'Supabase reachable'
                           : 'Supabase unreachable'}
                     </span>
                  )}
                </div>

                {backupStatus && (
                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-[#6E7166]">
                    <div>
                      Last backup:{' '}
                      <span className="font-medium text-[#23281E]">
                        {backupStatus.lastBackupAt
                          ? new Date(backupStatus.lastBackupAt).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                    <div>
                      Last restore:{' '}
                      <span className="font-medium text-[#23281E]">
                        {backupStatus.lastRestoreAt
                          ? new Date(backupStatus.lastRestoreAt).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                )}

                {!isOnline && (
                  <p className="mb-3 text-[11.5px] text-[#9B3B2B]">
                    You are offline. Cloud backup sync is temporarily disabled until you reconnect.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={cloudBusy !== null || !isOnline}
                    onClick={handleCloudBackup}
                    title={!isOnline ? 'No internet connection. Cloud backup disabled.' : undefined}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2C3327] px-3.5 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] disabled:opacity-50 transition-colors"
                  >
                    <CloudUpload className="h-3.5 w-3.5" />
                    <span>{cloudBusy === 'push' ? 'Backing up…' : 'Back up to cloud'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={cloudBusy !== null || !isOnline}
                    onClick={handleCloudRestore}
                    title={!isOnline ? 'No internet connection. Cloud restore disabled.' : undefined}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] disabled:opacity-50 transition-colors"
                  >
                    <CloudDownload className="h-3.5 w-3.5" />
                    <span>{cloudBusy === 'pull' ? 'Restoring…' : 'Restore from cloud'}</span>
                  </button>
                </div>

                {cloudNotice && (
                  <div
                    className={`mt-3 rounded-lg border px-3 py-2 text-[12.5px] ${
                      cloudNotice.type === 'success'
                        ? 'border-[#C6DEC8] bg-[#EEF6EF] text-[#2E5A36]'
                        : 'border-[#E5C9C5] bg-[#FDF7F6] text-[#9B3B2B]'
                    }`}
                  >
                    {cloudNotice.message}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-[#E5C9C5] bg-[#FCFBF8] p-5 sm:p-6">
                <div className="border-b border-[#EFEAE0] pb-3.5 mb-4">
                  <h3 className="text-[14px] font-semibold text-[#23281E]">Danger zone</h3>
                  <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
                    Permanently erases all ledger, inventory, and account data. Export a backup
                    first.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {confirmReset ? (
                    <>
                      <span className="text-[12.5px] font-medium text-[#9B3B2B]">
                        Reset all data?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onResetAll();
                          setConfirmReset(false);
                        }}
                        className="rounded-lg border border-[#E5C9C5] bg-[#FDF7F6] px-3.5 py-2 text-[12.5px] font-medium text-[#9B3B2B] hover:bg-[#F9EAE8]"
                      >
                        Confirm reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12.5px] font-medium text-[#23281E] hover:bg-[#EFEAE0]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5C9C5] bg-[#FDF7F6] px-3.5 py-2 text-[12.5px] font-medium text-[#9B3B2B] hover:bg-[#F9EAE8] transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset ledger data</span>
                    </button>
                  )}
                </div>
              </section>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Unsaved-Changes Bar */}
      <div
        className={`fixed left-1/2 bottom-20 md:bottom-5 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#E6E0D3] bg-[#FCFBF8] px-4 py-2.5 shadow-[0_8px_28px_rgba(35,40,30,0.14)] transition-transform duration-200 ${
          isDirty ? 'translate-y-0' : 'translate-y-[160%] pointer-events-none'
        }`}
        aria-hidden={!isDirty}
      >
        <span className="text-[13px] font-medium text-[#23281E] whitespace-nowrap">
          Unsaved changes
        </span>
        <button
          type="button"
          onClick={() => setDraft(settings)}
          className="rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-1.5 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors whitespace-nowrap"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={() => handleSave()}
          className="rounded-lg bg-[#2C3327] px-3.5 py-1.5 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] transition-colors whitespace-nowrap"
        >
          Save settings
        </button>
      </div>
    </div>
  );
};
