import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  HardDrive,
  Landmark,
  Layers,
  Menu,
  Monitor,
  Package,
  Search,
  ShieldCheck,
  Smartphone,
  Terminal,
  X,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { LandingSection } from '../types';

interface LandingPageProps {
  storeName: string;
  workspaceSubtitle: string;
  isAuthenticated: boolean;
  initialSection?: LandingSection;
  onChangeSection?: (section: LandingSection) => void;
  onEnterWorkspace: () => void;
  onOpenLogin: () => void;
  onDownloadStarterBundle: () => void;
}

interface DownloadPackage {
  id: string;
  platform: 'Windows' | 'macOS' | 'Linux' | 'Web & PWA';
  title: string;
  arch: string;
  version: string;
  size: string;
  filename: string;
  sha256: string;
  notes: string;
}

const DOWNLOAD_PACKAGES: DownloadPackage[] = [
  {
    id: 'win-x64',
    platform: 'Windows',
    title: 'Windows Desktop Installer',
    arch: 'Windows 10 / 11 (x64)',
    version: '2.4.0',
    size: '48.2 MB',
    filename: 'HearthLedger-Setup-2.4.0-x64.exe',
    sha256: '8f4c19a2d7b5e3104c8a29f0b1742d6e93a8c5021f44b9e6d3a08c7e12f59a10',
    notes: 'Signed NSIS installer with offline ledger storage and local receipt printing support.',
  },
  {
    id: 'mac-universal',
    platform: 'macOS',
    title: 'macOS Universal Disk Image',
    arch: 'Apple Silicon & Intel (.dmg)',
    version: '2.4.0',
    size: '54.6 MB',
    filename: 'HearthLedger-2.4.0-universal.dmg',
    sha256: '3d91b40e7c6a82f159e0b4c2d8174e3f60a9b25c1d7e83f4a092c6b14e75d38f',
    notes: 'Universal binary built for macOS Sonoma and Sequoia with hardware-accelerated charts.',
  },
  {
    id: 'linux-appimage',
    platform: 'Linux',
    title: 'Linux Portable AppImage',
    arch: 'x86_64 AppImage / .deb',
    version: '2.4.0',
    size: '51.0 MB',
    filename: 'HearthLedger-2.4.0-x86_64.AppImage',
    sha256: 'c72e8b04a1d95f6308e4a2b7c9103f5d84a6b1e029c7f3d5a814e2b90c6f47a1',
    notes: 'Zero-dependency portable executable compatible with Ubuntu, Fedora, Debian, and Arch.',
  },
  {
    id: 'web-bundle',
    platform: 'Web & PWA',
    title: 'Workspace Starter Archive',
    arch: 'JSON Ledger & Config Bundle',
    version: '2.4.0',
    size: '14 KB',
    filename: 'hearthledger-workspace-starter.json',
    sha256: '4a60e2c91b8f73d504e9a1c82b6f3d705e1a4c9b2f8d63e071a5c9b4d2e8f603',
    notes: 'Importable workspace snapshot containing sample accounts, inventory SKUs, and POS defaults.',
  },
];

interface FeatureModule {
  id: string;
  index: string;
  name: string;
  summary: string;
  highlights: string[];
  routeLabel: string;
}

const SYSTEM_MODULES: FeatureModule[] = [
  {
    id: 'dashboard',
    index: '01',
    name: 'Financial Command Center',
    summary:
      'Real-time calculation of Net Cash, Safe-to-Spend after upcoming obligations, monthly cash flow history, and earmarked sinking funds.',
    highlights: [
      'Configurable Safe-to-Spend guardrails with optional upcoming bill exclusion',
      'Interactive 6-month income vs. expense bar charts with timeframe switching',
      'Direct contribution workflows for emergency reserves and capital goals',
    ],
    routeLabel: '#/dashboard',
  },
  {
    id: 'inventory',
    index: '02',
    name: 'Inventory & Valuation Ledger',
    summary:
      'Structured SKU management tracking warehouse location, supplier, unit cost, retail value, and automated low-stock reorder alerts.',
    highlights: [
      'Inline stock adjustments (+ / -) with automatic timestamp updates',
      'Configurable default reorder threshold synced from Workspace Settings',
      'Instant filtering across Equipment, Electronics, Packaging, and Raw Materials',
    ],
    routeLabel: '#/inventory',
  },
  {
    id: 'pos',
    index: '03',
    name: 'Point of Sale Register & Kiosk',
    summary:
      'Split-pane desktop register with independent catalog and order-kiosk scrolling, paired with a customer-first mobile kiosk layout.',
    highlights: [
      'Live stock deduction and automatic ledger transaction logging on every checkout',
      'Tiered discount presets (0%, 5%, 10%, 15%), 8% tax math, and cash change calculator',
      'Printable / modal transaction receipts with searchable shift sales log',
    ],
    routeLabel: '#/pos',
  },
  {
    id: 'reports',
    index: '04',
    name: 'Executive Reports & Exports',
    summary:
      'Consolidated financial ratios, inventory turnover exposure, asset-vs-liability breakdown, and portable CSV/JSON reporting.',
    highlights: [
      'Multi-currency formatting across USD, EUR, GBP, PHP, CAD, AUD, and JPY',
      'Category spend distribution and net operating margin readouts',
      'One-click snapshot export for external accounting audits',
    ],
    routeLabel: '#/reports',
  },
  {
    id: 'accounts',
    index: '05',
    name: 'User, Admin & Profile Governance',
    summary:
      'Role-based directory for Admin, Manager, and Staff operators with dedicated profile editing and gated login/sign-up access.',
    highlights: [
      'Dedicated Sign In / Sign Up portal locked behind explicit account sign-off',
      'User status management (Active / Suspended) and department assignments',
      'Personal Profile Editor for updating credentials, job title, and contact info',
    ],
    routeLabel: '#/accounts',
  },
];

interface DocArticle {
  id: string;
  number: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  sections: {
    heading: string;
    body: string;
    steps?: string[];
    snippet?: string;
  }[];
}

const DOC_ARTICLES: DocArticle[] = [
  {
    id: 'getting-started',
    number: '01',
    title: 'Getting Started & Workspace Setup',
    category: 'Fundamentals',
    readTime: '3 min read',
    summary:
      'Initialize your store identity, select your reporting currency, and understand how HearthLedger persists workspace state locally.',
    sections: [
      {
        heading: 'First-Time Workspace Configuration',
        body: 'HearthLedger runs with zero external server dependencies. Every account balance, inventory SKU, POS receipt, and team member record is stored immediately in your browser or desktop runtime under a unified ledger state.',
        steps: [
          'Open Settings from the left navigation rail to set your Store Name and Workspace Subtitle.',
          'Choose your primary Currency (USD, EUR, GBP, PHP, CAD, AUD, or JPY) to reformat every table and KPI across the app.',
          'Set your Budget Cycle Day and Default Reorder Point so low-stock warnings reflect your operational cadence.',
        ],
      },
      {
        heading: 'Keyboard & Navigation Basics',
        body: 'Use the collapsible desktop sidebar toggle at the top of the left rail to switch between full labels (236px) and a compact icon rail (72px) when working in dense inventory tables or the POS terminal.',
      },
    ],
  },
  {
    id: 'auth-rbac',
    number: '02',
    title: 'Authentication & Role Permissions',
    category: 'Security',
    readTime: '4 min read',
    summary:
      'Manage Admin, Manager, and Staff accounts, edit personal operator profiles, and lock sessions via the sign-off gate.',
    sections: [
      {
        heading: 'Role Hierarchy & Access Levels',
        body: 'Accounts are categorized into Admin, Manager, and Staff roles. Active accounts can sign in immediately from the authentication portal, while Suspended accounts are blocked at login until reactivated by an administrator.',
        steps: [
          'Navigate to Accounts to view all registered team members, departments, and activity status.',
          'Click Edit Profile inside Accounts (or tap your avatar in the mobile header) to update your display name, job title, phone number, or password.',
          'Click Log Out to lock the workspace and return to the standalone Login / Sign Up portal.',
        ],
      },
      {
        heading: 'Default Admin Reference',
        body: 'For quick testing on a fresh workspace, the Login screen includes a Fill Admin Demo shortcut mapped to the primary store administrator record.',
        snippet: 'Email: arb32433@imcc.edu.ph  |  Role: Admin  |  Route: #/accounts',
      },
    ],
  },
  {
    id: 'inventory-pos',
    number: '03',
    title: 'Inventory & POS Checkout Sync',
    category: 'Operations',
    readTime: '5 min read',
    summary:
      'Understand how Point of Sale checkouts automatically deduct SKU quantities and record revenue entries in the main ledger.',
    sections: [
      {
        heading: 'Unified Stock-to-Register Pipeline',
        body: 'Every item created in the Inventory ledger automatically appears in the POS product catalog. Retail pricing applies a consistent markup over unit cost, and out-of-stock items are safeguarded from overselling.',
        steps: [
          'Click items from the POS catalog to add them to the Customer Order Kiosk on the right pane.',
          'Apply optional ticket discounts (5%, 10%, or 15%) and choose Card, Cash, or Transfer payment.',
          'For Cash tenders, enter the amount received to verify change due before completing checkout.',
          'Completing a sale issues a numbered receipt (e.g., POS-1001), deducts sold units from Inventory, and logs the revenue in Recent Transactions.',
        ],
      },
      {
        heading: 'Mobile POS Layout',
        body: 'On screens narrower than 768px, the POS route defaults strictly to the Customer Order Kiosk so cashiers can build orders rapidly, while Products, Sales Log, and Metrics remain one tap away in the bottom bar or burger drawer.',
      },
    ],
  },
  {
    id: 'backups-recovery',
    number: '04',
    title: 'Backups, JSON Import & Ledger Reset',
    category: 'Data Management',
    readTime: '3 min read',
    summary:
      'Export full workspace snapshots for safe keeping, restore previous ledgers, or reset sample records cleanly.',
    sections: [
      {
        heading: 'Portable JSON Snapshots',
        body: 'You can back up your entire workspace state—including accounts, cash flow months, inventory items, POS orders, and user profiles—into a single portable JSON file.',
        steps: [
          'Open Settings and click Export Backup JSON to download a timestamped workspace snapshot.',
          'Use Import Backup JSON on any device or browser to restore your exact accounts, inventory, and configuration.',
          'Click Reset Ledger Data in the sidebar footer whenever you want to restore clean baseline data.',
        ],
      },
    ],
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  storeName,
  workspaceSubtitle,
  isAuthenticated,
  initialSection = 'overview',
  onChangeSection,
  onEnterWorkspace,
  onOpenLogin,
  onDownloadStarterBundle,
}) => {
  const [section, setSection] = useState<LandingSection>(initialSection);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync external initialSection prop when hash changes
  React.useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const navigateSection = (next: LandingSection) => {
    setSection(next);
    onChangeSection?.(next);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Features page interactive state
  const [activeModuleId, setActiveModuleId] = useState<string>(SYSTEM_MODULES[0].id);
  const activeModule = useMemo(
    () => SYSTEM_MODULES.find((m) => m.id === activeModuleId) ?? SYSTEM_MODULES[0],
    [activeModuleId]
  );

  // Download page interactive state
  const [selectedPlatform, setSelectedPlatform] = useState<'All' | DownloadPackage['platform']>('All');
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [copiedShaId, setCopiedShaId] = useState<string | null>(null);

  const visiblePackages = useMemo(
    () =>
      selectedPlatform === 'All'
        ? DOWNLOAD_PACKAGES
        : DOWNLOAD_PACKAGES.filter((p) => p.platform === selectedPlatform),
    [selectedPlatform]
  );

  const handleDownloadPackage = (pkg: DownloadPackage) => {
    setDownloadedId(pkg.id);
    if (pkg.id === 'web-bundle') {
      onDownloadStarterBundle();
    } else {
      // Generate a verifiable release manifest / setup receipt text file so download executes cleanly
      const manifest = [
        `${storeName} Release Package Manifest`,
        `Package: ${pkg.filename}`,
        `Platform: ${pkg.platform} (${pkg.arch})`,
        `Version: ${pkg.version}`,
        `SHA-256: ${pkg.sha256}`,
        `Notes: ${pkg.notes}`,
        ``,
        `Verify integrity or launch the web workspace directly at #/dashboard.`,
      ].join('\n');
      const blob = new Blob([manifest], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pkg.filename}.manifest.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    window.setTimeout(() => {
      setDownloadedId((curr) => (curr === pkg.id ? null : curr));
    }, 3200);
  };

  const handleCopySha = (pkg: DownloadPackage) => {
    navigator.clipboard?.writeText(pkg.sha256).catch(() => undefined);
    setCopiedShaId(pkg.id);
    window.setTimeout(() => {
      setCopiedShaId((curr) => (curr === pkg.id ? null : curr));
    }, 2000);
  };

  // Documentation page interactive state
  const [docSearch, setDocSearch] = useState('');
  const [activeDocId, setActiveDocId] = useState<string>(DOC_ARTICLES[0].id);

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return DOC_ARTICLES;
    return DOC_ARTICLES.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        doc.sections.some(
          (s) =>
            s.heading.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
        )
    );
  }, [docSearch]);

  const activeDoc = useMemo(() => {
    const matched = filteredDocs.find((d) => d.id === activeDocId);
    return matched ?? filteredDocs[0] ?? DOC_ARTICLES[0];
  }, [filteredDocs, activeDocId]);

  const activeDocIndex = DOC_ARTICLES.findIndex((d) => d.id === activeDoc.id);
  const prevDoc = activeDocIndex > 0 ? DOC_ARTICLES[activeDocIndex - 1] : null;
  const nextDoc =
    activeDocIndex >= 0 && activeDocIndex < DOC_ARTICLES.length - 1
      ? DOC_ARTICLES[activeDocIndex + 1]
      : null;

  const primaryCtaLabel = isAuthenticated ? 'Open Workspace' : 'Log In';
  const handlePrimaryCta = isAuthenticated ? onEnterWorkspace : onOpenLogin;

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#23281E] flex flex-col">
      {/* Top Bar Contract: Zone 1 Brand — Zone 2 4 single-line links — Zone 3 1 Primary CTA */}
      <header className="sticky top-0 z-40 border-b border-[#E6E0D3] bg-[#F5F1E8]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => navigateSection('overview')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89260] rounded-lg"
          >
            <BrandLogo size="sm" surface="sidebar" />
            <span className="font-serif text-[19px] font-semibold tracking-tight text-[#23281E]">
              {storeName}
            </span>
          </button>

          <nav aria-label="Landing Navigation" className="hidden md:flex items-center gap-7">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'features', label: 'Features' },
                { id: 'download', label: 'Download' },
                { id: 'docs', label: 'Documentation' },
              ] as const
            ).map((item) => {
              const isCurrent = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateSection(item.id)}
                  className={`text-[13.5px] font-medium whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
                    isCurrent
                      ? 'border-[#B89260] text-[#23281E]'
                      : 'border-transparent text-[#6E7166] hover:text-[#23281E]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrimaryCta}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[#2C3327] px-4 py-2 text-[13px] font-semibold text-[#FCFBF8] hover:bg-[#3A4333] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{primaryCtaLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] text-[#2C3327]"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-[#E6E0D3] bg-[#FCFBF8] px-5 py-4 space-y-2">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'features', label: 'Features' },
                { id: 'download', label: 'Download' },
                { id: 'docs', label: 'Documentation' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateSection(item.id)}
                className={`block w-full text-left rounded-lg px-3 py-2.5 text-[14px] font-medium ${
                  section === item.id
                    ? 'bg-[#EFEAE0] text-[#23281E]'
                    : 'text-[#5C6055] hover:bg-[#F5F1E8]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePrimaryCta}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2C3327] px-4 py-2.5 text-[13.5px] font-semibold text-[#FCFBF8]"
            >
              <span>{primaryCtaLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Switching Across Landing Sub-Pages */}
      <main className="flex-1">
        {/* ================= 1. LANDING OVERVIEW PAGE ================= */}
        {section === 'overview' && (
          <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-16 space-y-16 sm:space-y-20">
            {/* Hero Split */}
            <section className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between py-2">
                <div>
                  <div className="text-[12px] font-medium text-[#7D8075]">
                    {workspaceSubtitle}
                  </div>
                  <h1
                    className="mt-3 font-serif font-semibold tracking-tight text-[#23281E] leading-[1.08]"
                    style={{
                      fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                      textWrap: 'balance',
                    }}
                  >
                    Financial ledger, live inventory, and point of sale in one place.
                  </h1>
                  <p className="mt-5 max-w-[540px] text-[15.5px] leading-[1.65] text-[#5C6055]">
                    {storeName} unifies account cash flow, SKU stock valuation, retail register
                    checkouts, and team access control without external cloud latency or fragmented
                    spreadsheets.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => navigateSection('download')}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2C3327] px-5 py-3 text-[13.5px] font-semibold text-[#FCFBF8] hover:bg-[#3A4333] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Application</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateSection('features')}
                      className="inline-flex items-center gap-1.5 px-2 py-2 text-[13.5px] font-medium text-[#2C3327] hover:text-[#B89260] transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Explore System Overview</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[#E6E0D3] pt-5 text-[12.5px] text-[#6E7166]">
                  <span>Local-First Architecture</span>
                  <span aria-hidden="true">·</span>
                  <span>7 Supported Currencies</span>
                  <span aria-hidden="true">·</span>
                  <span>Desktop & Mobile Register</span>
                </div>
              </div>

              {/* Architectural Product Showcase Panel */}
              <div className="lg:col-span-6 rounded-xl border border-[#2D3227] bg-[#1F221B] p-6 sm:p-8 text-[#F5F2EB] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <BrandLogo size="md" surface="dark" />
                    <div>
                      <div className="font-serif text-[17px] font-semibold text-[#F6F3EC]">
                        {storeName} v2.4
                      </div>
                      <div className="text-[11.5px] text-[#9A9E92]">
                        Unified Operations Architecture
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[11.5px] text-[#D4AE78] tabular-nums">
                    #/{isAuthenticated ? 'dashboard' : 'login'}
                  </span>
                </div>

                <div className="my-7 grid grid-cols-2 gap-4">
                  <div className="border border-white/10 bg-[#262A21] p-4 rounded-lg">
                    <div className="text-[11px] font-medium text-[#9A9E92]">
                      Accounts & Cash Flow
                    </div>
                    <div className="mt-1.5 font-serif text-[22px] font-semibold text-[#F6F3EC] tabular-nums">
                      Safe-to-Spend
                    </div>
                    <div className="mt-1 text-[11.5px] text-[#A8AA9D]">
                      Net liquidity after bills & reserves
                    </div>
                  </div>

                  <div className="border border-white/10 bg-[#262A21] p-4 rounded-lg">
                    <div className="text-[11px] font-medium text-[#9A9E92]">
                      Stock Control
                    </div>
                    <div className="mt-1.5 font-serif text-[22px] font-semibold text-[#F6F3EC] tabular-nums">
                      Live SKU Sync
                    </div>
                    <div className="mt-1 text-[11.5px] text-[#A8AA9D]">
                      Automated reorder point tracking
                    </div>
                  </div>

                  <div className="border border-white/10 bg-[#262A21] p-4 rounded-lg">
                    <div className="text-[11px] font-medium text-[#9A9E92]">
                      Register Terminal
                    </div>
                    <div className="mt-1.5 font-serif text-[22px] font-semibold text-[#D4AE78] tabular-nums">
                      POS Kiosk
                    </div>
                    <div className="mt-1 text-[11.5px] text-[#A8AA9D]">
                      Instant receipt & ledger posting
                    </div>
                  </div>

                  <div className="border border-white/10 bg-[#262A21] p-4 rounded-lg">
                    <div className="text-[11px] font-medium text-[#9A9E92]">
                      Portability
                    </div>
                    <div className="mt-1.5 font-serif text-[22px] font-semibold text-[#F6F3EC] tabular-nums">
                      JSON Backup
                    </div>
                    <div className="mt-1 text-[11.5px] text-[#A8AA9D]">
                      Full export & offline recovery
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[12px] text-[#A8AA9D]">
                  <span>Ready across Desktop, Tablet, and Mobile</span>
                  <button
                    type="button"
                    onClick={() => navigateSection('docs')}
                    className="font-medium text-[#D4AE78] hover:underline underline-offset-4"
                  >
                    Read Setup Guide →
                  </button>
                </div>
              </div>
            </section>

            {/* Asymmetric Capabilities Bento Grid */}
            <section className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[#E6E0D3] pb-4">
                <div>
                  <h2 className="font-serif text-[26px] font-semibold tracking-tight text-[#23281E]">
                    Core System Capabilities
                  </h2>
                  <p className="mt-1 text-[14px] text-[#6E7166]">
                    Four tightly integrated modules operating on a single shared ledger state.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateSection('features')}
                  className="text-[13px] font-medium text-[#2C3327] hover:text-[#B89260] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  View Full System Overview →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 sm:p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-[12px] font-mono text-[#9B7849]">01</div>
                    <h3 className="mt-2 font-serif text-[22px] font-semibold text-[#23281E]">
                      01. Unified Cash Flow & Safe-to-Spend Accounting
                    </h3>
                    <p className="mt-2.5 max-w-[600px] text-[14px] leading-relaxed text-[#5C6055]">
                      Monitor checking, savings, investment, credit, and loan balances side by side.
                      HearthLedger calculates real Safe-to-Spend capital after reserving upcoming
                      obligations and sinking fund targets.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-[#EFEAE0] pt-4 text-[12.5px] text-[#6E7166] tabular-nums">
                    <span>6-Month Cash Flow Charts</span>
                    <span>·</span>
                    <span>Upcoming Bill Tracking</span>
                    <span>·</span>
                    <span>Sinking Fund Milestones</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 sm:p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-[12px] font-mono text-[#9B7849]">02</div>
                    <h3 className="mt-2 font-serif text-[20px] font-semibold text-[#23281E]">
                      02. Live Inventory Control
                    </h3>
                    <p className="mt-2.5 text-[14px] leading-relaxed text-[#5C6055]">
                      Track SKU unit costs, warehouse shelves, and automated low-stock thresholds
                      with one-click quantity adjustments.
                    </p>
                  </div>
                  <div className="mt-6 border-t border-[#EFEAE0] pt-4 text-[12.5px] text-[#6E7166]">
                    Synced directly to POS catalog
                  </div>
                </div>

                <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 sm:p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-[12px] font-mono text-[#9B7849]">03</div>
                    <h3 className="mt-2 font-serif text-[20px] font-semibold text-[#23281E]">
                      03. Role-Gated Team Access
                    </h3>
                    <p className="mt-2.5 text-[14px] leading-relaxed text-[#5C6055]">
                      Manage Admin, Manager, and Staff accounts with personal profile editing and a
                      dedicated sign-in portal on logoff.
                    </p>
                  </div>
                  <div className="mt-6 border-t border-[#EFEAE0] pt-4 text-[12.5px] text-[#6E7166]">
                    Active & Suspended status controls
                  </div>
                </div>

                <div className="lg:col-span-2 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 sm:p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-[12px] font-mono text-[#9B7849]">04</div>
                    <h3 className="mt-2 font-serif text-[22px] font-semibold text-[#23281E]">
                      04. Point of Sale Register with Real-Time Ledger Posting
                    </h3>
                    <p className="mt-2.5 max-w-[600px] text-[14px] leading-relaxed text-[#5C6055]">
                      Ring up walk-in orders through an independent dual-scroll desktop terminal or
                      focused mobile Customer Order Kiosk. Every completed checkout deducts stock and
                      appends a verified transaction entry automatically.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-[#EFEAE0] pt-4 text-[12.5px] text-[#6E7166] tabular-nums">
                    <span>Card, Cash & Transfer</span>
                    <span>·</span>
                    <span>Preset Discounts</span>
                    <span>·</span>
                    <span>Instant Receipt Log</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Call to Action Strip */}
            <section className="rounded-xl border border-[#2D3227] bg-[#2C3327] p-7 sm:p-10 text-[#F5F2EB] flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-[620px]">
                <h2 className="font-serif text-[24px] sm:text-[28px] font-semibold text-[#F6F3EC]">
                  Deploy on your desktop or launch in the browser.
                </h2>
                <p className="mt-2 text-[14px] text-[#C8C7BD]">
                  Grab the latest desktop release package for Windows, macOS, and Linux, or inspect
                  the complete operator documentation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateSection('download')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#B89260] px-5 py-2.5 text-[13.5px] font-semibold text-[#FCFBF8] hover:bg-[#A37E4F] transition-colors whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>Get {storeName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateSection('docs')}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-[13.5px] font-medium text-[#F5F2EB] hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Documentation</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================= 2. SYSTEM OVERVIEW & FEATURES PAGE ================= */}
        {section === 'features' && (
          <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-14 space-y-12">
            <div className="max-w-[740px]">
              <div className="text-[12px] font-medium text-[#7D8075]">System Overview & Features</div>
              <h1
                className="mt-2 font-serif font-semibold tracking-tight text-[#23281E] leading-[1.12]"
                style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', textWrap: 'balance' }}
              >
                One state engine powering ledger accounting, stock, and checkout.
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5C6055]">
                Every module inside {storeName} reads and updates the same underlying workspace
                records so inventory counts, sales revenue, and cash-flow projections never drift
                out of sync.
              </p>
            </div>

            {/* Interactive System Architecture Pipeline */}
            <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#EFEAE0] pb-4">
                <h2 className="font-serif text-[20px] font-semibold text-[#23281E]">
                  Interactive Module Explorer
                </h2>
                <span className="text-[12.5px] text-[#6E7166]">
                  Select a subsystem to inspect its workflow and capabilities
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Selector List */}
                <div className="lg:col-span-5 space-y-2">
                  {SYSTEM_MODULES.map((mod) => {
                    const selected = mod.id === activeModule.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setActiveModuleId(mod.id)}
                        className={`w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors ${
                          selected
                            ? 'border-[#2C3327] bg-[#2C3327] text-[#FCFBF8]'
                            : 'border-[#E6E0D3] bg-[#F8F5EE] text-[#23281E] hover:bg-[#EFEAE0]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`font-mono text-[12px] shrink-0 ${
                              selected ? 'text-[#D4AE78]' : 'text-[#9B7849]'
                            }`}
                          >
                            {mod.index}
                          </span>
                          <span className="text-[14px] font-semibold truncate">{mod.name}</span>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 ${
                            selected ? 'text-[#D4AE78]' : 'text-[#8E9086]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Right Detail Surface */}
                <div className="lg:col-span-7 rounded-xl border border-[#E6E0D3] bg-[#F8F5EE] p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-4 border-b border-[#E6E0D3] pb-4">
                      <div>
                        <span className="font-mono text-[12px] text-[#9B7849]">
                          Module {activeModule.index}
                        </span>
                        <h3 className="mt-1 font-serif text-[22px] font-semibold text-[#23281E]">
                          {activeModule.name}
                        </h3>
                      </div>
                      <span className="font-mono text-[12px] text-[#6E7166]">
                        {activeModule.routeLabel}
                      </span>
                    </div>

                    <p className="mt-4 text-[14.5px] leading-relaxed text-[#43473E]">
                      {activeModule.summary}
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="text-[12px] font-semibold tracking-wide text-[#6E7166]">
                        Included Capabilities
                      </div>
                      <ul className="space-y-2.5">
                        {activeModule.highlights.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2.5 text-[13.5px] text-[#23281E]"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2E5A36]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E0D3] pt-4">
                    <button
                      type="button"
                      onClick={() => navigateSection('docs')}
                      className="text-[13px] font-medium text-[#2C3327] hover:text-[#B89260] transition-colors"
                    >
                      Read Documentation for this workflow →
                    </button>
                    <button
                      type="button"
                      onClick={handlePrimaryCta}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-semibold text-[#FCFBF8] hover:bg-[#3A4333] transition-colors"
                    >
                      <span>{primaryCtaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Technical & Architectural Grid */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6">
                <Layers className="h-5 w-5 text-[#9B7849]" />
                <h3 className="mt-3 font-serif text-[18px] font-semibold text-[#23281E]">
                  Dual-Shell Responsiveness
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#5C6055]">
                  Desktop viewports get a collapsible navigation rail and multi-pane split views,
                  while mobile viewports switch seamlessly to a thumb-friendly bottom bar and
                  kiosk-first POS layout.
                </p>
              </div>

              <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6">
                <Landmark className="h-5 w-5 text-[#9B7849]" />
                <h3 className="mt-3 font-serif text-[18px] font-semibold text-[#23281E]">
                  Multi-Currency Ledger Math
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#5C6055]">
                  Switch display currency across USD, EUR, GBP, PHP, CAD, AUD, and JPY with
                  consistent tabular numeral formatting across every KPI, chart, and receipt.
                </p>
              </div>

              <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6">
                <ShieldCheck className="h-5 w-5 text-[#9B7849]" />
                <h3 className="mt-3 font-serif text-[18px] font-semibold text-[#23281E]">
                  Zero-Lock-In Data Ownership
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#5C6055]">
                  Export your entire ledger, inventory catalog, POS sales log, and operator
                  directory to portable JSON anytime and restore across devices offline.
                </p>
              </div>
            </section>

            {/* Quick System Comparison Table */}
            <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] overflow-hidden">
              <div className="border-b border-[#EFEAE0] px-6 py-4">
                <h2 className="font-serif text-[19px] font-semibold text-[#23281E]">
                  Subsystem Specification Matrix
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13.5px]">
                  <thead className="border-b border-[#EFEAE0] bg-[#F8F5EE] text-[12px] font-semibold text-[#5C6055]">
                    <tr>
                      <th className="px-6 py-3">Subsystem</th>
                      <th className="px-6 py-3">Primary Data Entities</th>
                      <th className="px-6 py-3">Sync Behavior</th>
                      <th className="px-6 py-3 text-right">Route</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEAE0]">
                    <tr>
                      <td className="px-6 py-3.5 font-medium text-[#23281E]">Dashboard</td>
                      <td className="px-6 py-3.5 text-[#5C6055]">
                        Cash Flow, Bills, Sinking Funds, Goals
                      </td>
                      <td className="px-6 py-3.5 text-[#5C6055]">Instant local persistence</td>
                      <td className="px-6 py-3.5 text-right font-mono text-[12px] text-[#7D8075]">
                        #/dashboard
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 font-medium text-[#23281E]">Inventory</td>
                      <td className="px-6 py-3.5 text-[#5C6055]">
                        SKUs, Stock Counts, Unit Costs, Thresholds
                      </td>
                      <td className="px-6 py-3.5 text-[#5C6055]">Two-way sync with POS</td>
                      <td className="px-6 py-3.5 text-right font-mono text-[12px] text-[#7D8075]">
                        #/inventory
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 font-medium text-[#23281E]">Point of Sale</td>
                      <td className="px-6 py-3.5 text-[#5C6055]">
                        Cart Lines, Discounts, Taxes, Receipts
                      </td>
                      <td className="px-6 py-3.5 text-[#5C6055]">
                        Deducts stock & logs ledger transaction
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-[12px] text-[#7D8075]">
                        #/pos
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 font-medium text-[#23281E]">Reports</td>
                      <td className="px-6 py-3.5 text-[#5C6055]">
                        Liquidity, Valuation, Category Ratios
                      </td>
                      <td className="px-6 py-3.5 text-[#5C6055]">Derived live from ledger</td>
                      <td className="px-6 py-3.5 text-right font-mono text-[12px] text-[#7D8075]">
                        #/reports
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 font-medium text-[#23281E]">Accounts & Profile</td>
                      <td className="px-6 py-3.5 text-[#5C6055]">
                        Team Operators, Roles, Auth Gate
                      </td>
                      <td className="px-6 py-3.5 text-[#5C6055]">Role-checked session state</td>
                      <td className="px-6 py-3.5 text-right font-mono text-[12px] text-[#7D8075]">
                        #/accounts
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ================= 3. DOWNLOAD PAGE ================= */}
        {section === 'download' && (
          <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-14 space-y-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between border-b border-[#E6E0D3] pb-6">
              <div className="max-w-[660px]">
                <div className="text-[12px] font-medium text-[#7D8075]">
                  Releases & Packages · v2.4.0
                </div>
                <h1
                  className="mt-2 font-serif font-semibold tracking-tight text-[#23281E] leading-[1.12]"
                  style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', textWrap: 'balance' }}
                >
                  Download {storeName} for desktop or portable backup.
                </h1>
                <p className="mt-3 text-[15px] text-[#5C6055]">
                  Select your operating system below to download the installation manifest or export
                  a ready-to-import workspace starter JSON bundle.
                </p>
              </div>

              {/* Platform Filter Controls */}
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#EFEAE0] p-1 self-start md:self-auto">
                {(['All', 'Windows', 'macOS', 'Linux', 'Web & PWA'] as const).map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setSelectedPlatform(plat)}
                    className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors whitespace-nowrap ${
                      selectedPlatform === plat
                        ? 'bg-[#FCFBF8] text-[#23281E] shadow-xs'
                        : 'text-[#6E7166] hover:text-[#23281E]'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>
            </div>

            {/* Package Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {visiblePackages.map((pkg) => {
                const isDone = downloadedId === pkg.id;
                const isCopied = copiedShaId === pkg.id;
                const Icon =
                  pkg.platform === 'Windows' || pkg.platform === 'macOS'
                    ? Monitor
                    : pkg.platform === 'Linux'
                      ? Terminal
                      : FileJson;

                return (
                  <div
                    key={pkg.id}
                    className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E6E0D3] bg-[#F8F5EE] text-[#2C3327]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-[12px] font-medium text-[#7D8075]">
                              {pkg.platform} · {pkg.arch}
                            </div>
                            <h2 className="font-serif text-[20px] font-semibold text-[#23281E]">
                              {pkg.title}
                            </h2>
                          </div>
                        </div>

                        <span className="font-mono text-[12px] text-[#6E7166] tabular-nums shrink-0">
                          {pkg.size}
                        </span>
                      </div>

                      <p className="mt-4 text-[13.5px] leading-relaxed text-[#5C6055]">
                        {pkg.notes}
                      </p>

                      <div className="mt-4 rounded-lg border border-[#EFEAE0] bg-[#F8F5EE] px-3.5 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10.5px] font-medium text-[#7D8075]">
                            SHA-256 Checksum
                          </div>
                          <div className="truncate font-mono text-[11.5px] text-[#23281E]">
                            {pkg.sha256}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySha(pkg)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[#DDD6C7] bg-[#FCFBF8] px-2.5 py-1 text-[11.5px] font-medium text-[#2C3327] hover:bg-[#EFEAE0] transition-colors"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3 w-3 text-[#2E5A36]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EFEAE0] pt-4">
                      <span className="font-mono text-[11.5px] text-[#7D8075] truncate max-w-[230px]">
                        {pkg.filename}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDownloadPackage(pkg)}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          isDone
                            ? 'bg-[#2E5A36] text-[#FCFBF8]'
                            : 'bg-[#2C3327] text-[#FCFBF8] hover:bg-[#3A4333]'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Downloaded</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span>
                              {pkg.id === 'web-bundle' ? 'Export Starter JSON' : 'Download Release'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Minimum System Requirements */}
            <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 sm:p-7">
              <h2 className="font-serif text-[20px] font-semibold text-[#23281E]">
                Runtime & System Requirements
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#2C3327]">
                    <Monitor className="h-4 w-4 text-[#9B7849]" />
                    <span>Operating System</span>
                  </div>
                  <p className="text-[13px] text-[#5C6055]">
                    Windows 10+, macOS 13+, or modern Linux x86_64 distribution.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#2C3327]">
                    <HardDrive className="h-4 w-4 text-[#9B7849]" />
                    <span>Memory & Disk</span>
                  </div>
                  <p className="text-[13px] text-[#5C6055]">
                    256 MB RAM and 120 MB free storage for local ledger persistence.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#2C3327]">
                    <Smartphone className="h-4 w-4 text-[#9B7849]" />
                    <span>Mobile Browser</span>
                  </div>
                  <p className="text-[13px] text-[#5C6055]">
                    iOS Safari 16+ or Android Chrome 115+ for mobile POS & dashboard access.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#2C3327]">
                    <Package className="h-4 w-4 text-[#9B7849]" />
                    <span>Backup Compatibility</span>
                  </div>
                  <p className="text-[13px] text-[#5C6055]">
                    All releases share identical JSON schema portability for instant migration.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= 4. DOCUMENTATION PAGE ================= */}
        {section === 'docs' && (
          <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-14">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              {/* Left Sidebar TOC & Search */}
              <aside className="lg:col-span-4 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 space-y-4 lg:sticky lg:top-24">
                <div>
                  <div className="text-[12px] font-medium text-[#7D8075]">Operator Manual</div>
                  <h1 className="mt-1 font-serif text-[22px] font-semibold text-[#23281E]">
                    Documentation
                  </h1>
                </div>

                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#8E9086]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search guides and topics..."
                    aria-label="Search documentation"
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white pl-9 pr-3 py-2 text-[13px] text-[#23281E] placeholder-[#8E9086] focus:border-[#B89260] focus:outline-none"
                  />
                </div>

                <nav aria-label="Documentation Sections" className="space-y-1">
                  {filteredDocs.length === 0 ? (
                    <div className="py-4 text-[13px] text-[#7D8075]">
                      No matching guides found.
                    </div>
                  ) : (
                    filteredDocs.map((doc) => {
                      const isCurrent = doc.id === activeDoc.id;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setActiveDocId(doc.id)}
                          className={`w-full flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            isCurrent
                              ? 'bg-[#2C3327] text-[#FCFBF8]'
                              : 'text-[#43473E] hover:bg-[#F5F1E8]'
                          }`}
                        >
                          <span
                            className={`font-mono text-[11.5px] mt-0.5 shrink-0 ${
                              isCurrent ? 'text-[#D4AE78]' : 'text-[#9B7849]'
                            }`}
                          >
                            {doc.number}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold leading-snug">
                              {doc.title}
                            </div>
                            <div
                              className={`mt-0.5 text-[11px] ${
                                isCurrent ? 'text-[#C8C7BD]' : 'text-[#7D8075]'
                              }`}
                            >
                              {doc.category} · {doc.readTime}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </nav>
              </aside>

              {/* Right Article Content */}
              <article className="lg:col-span-8 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-6 sm:p-10">
                <div className="border-b border-[#EFEAE0] pb-6">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#7D8075]">
                    <span>Chapter {activeDoc.number}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeDoc.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeDoc.readTime}</span>
                  </div>

                  <h2 className="mt-2 font-serif text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#23281E] leading-tight">
                    {activeDoc.title}
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#5C6055]">
                    {activeDoc.summary}
                  </p>
                </div>

                <div className="py-8 space-y-8">
                  {activeDoc.sections.map((sec) => (
                    <section key={sec.heading} className="space-y-3">
                      <h3 className="font-serif text-[20px] font-semibold text-[#23281E]">
                        {sec.heading}
                      </h3>
                      <p className="text-[14.5px] leading-[1.7] text-[#43473E]">{sec.body}</p>

                      {sec.steps && (
                        <ol className="mt-3 space-y-2.5 rounded-lg border border-[#EFEAE0] bg-[#F8F5EE] p-4 sm:p-5">
                          {sec.steps.map((step, idx) => (
                            <li
                              key={step}
                              className="flex items-start gap-3 text-[13.5px] leading-relaxed text-[#23281E]"
                            >
                              <span className="font-mono text-[12px] font-semibold text-[#9B7849] mt-0.5 shrink-0">
                                {String(idx + 1).padStart(2, '0')}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      )}

                      {sec.snippet && (
                        <div className="mt-3 rounded-lg border border-[#2D3227] bg-[#1F221B] px-4 py-3 font-mono text-[12.5px] text-[#E6E2D8] overflow-x-auto">
                          {sec.snippet}
                        </div>
                      )}
                    </section>
                  ))}
                </div>

                {/* Prev / Next Chapter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#EFEAE0] pt-6">
                  {prevDoc ? (
                    <button
                      type="button"
                      onClick={() => setActiveDocId(prevDoc.id)}
                      className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2C3327] hover:text-[#B89260] transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>
                        {prevDoc.number}. {prevDoc.title}
                      </span>
                    </button>
                  ) : (
                    <span />
                  )}

                  {nextDoc && (
                    <button
                      type="button"
                      onClick={() => setActiveDocId(nextDoc.id)}
                      className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2C3327] hover:text-[#B89260] transition-colors ml-auto"
                    >
                      <span>
                        {nextDoc.number}. {nextDoc.title}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </article>
            </div>
          </div>
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E6E0D3] bg-[#FCFBF8]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5 text-[13px] text-[#5C6055]">
            <BrandLogo size="sm" surface="sidebar" />
            <span className="font-serif font-semibold text-[#23281E]">{storeName}</span>
            <span aria-hidden="true">·</span>
            <span>{workspaceSubtitle}</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-[12.5px] text-[#6E7166]">
            <button
              type="button"
              onClick={() => navigateSection('overview')}
              className="hover:text-[#23281E] transition-colors"
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => navigateSection('features')}
              className="hover:text-[#23281E] transition-colors"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => navigateSection('download')}
              className="hover:text-[#23281E] transition-colors"
            >
              Download
            </button>
            <button
              type="button"
              onClick={() => navigateSection('docs')}
              className="hover:text-[#23281E] transition-colors"
            >
              Documentation
            </button>
            <button
              type="button"
              onClick={handlePrimaryCta}
              className="font-semibold text-[#2C3327] hover:text-[#B89260] transition-colors"
            >
              {primaryCtaLabel}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
