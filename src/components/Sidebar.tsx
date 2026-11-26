import React from 'react';
import {
  BarChart3,
  Cloud,
  HardDrive,
  Home,
  Landmark,
  Package,
  Receipt,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import { PageRoute } from '../types';
import type { AuthMode } from '../api/client';

interface SidebarProps {
  activeRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onResetDemoData: () => void;
  storeName?: string;
  workspaceSubtitle?: string;
  authMode?: AuthMode;
  isOnline?: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: PageRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'sales', label: 'Sales', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'accounts', label: 'Accounts', icon: Landmark },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeRoute,
  onNavigate,
  onResetDemoData,
  storeName = 'TallyLedger',
  workspaceSubtitle = 'Financial Command Center',
  authMode = 'offline',
  isOnline = true,
  mobileOpen,
  onCloseMobile,
}) => {
  const handleSelect = (route: PageRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#2C3327] text-[#F5F2EB] select-none">
      <div>
        <div className="flex items-center justify-between px-5 pt-7 pb-6">
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89260] rounded-lg p-1 -m-1 min-w-0"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#B89260]/40 bg-[#353D2F] text-[#C6A270]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M3 10.5L12 3l9 7.5" />
                <path d="M5.5 9.5V20h13V9.5" />
                <path d="M10 20v-5.5h4V20" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-serif text-[19px] font-semibold tracking-tight text-[#F6F3EC] leading-tight truncate">
                {storeName}
              </div>
              <div className="mt-0.5 text-[8.5px] font-medium tracking-[0.1em] text-[#A8AA9D] uppercase whitespace-nowrap truncate">
                {workspaceSubtitle}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="md:hidden rounded-lg p-1.5 text-[#C5C6BC] hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-5 mb-4 border-t border-white/10" />

        <nav aria-label="Primary Sidebar" className="px-3.5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeRoute === item.id || (item.id === 'accounts' && activeRoute === 'profile');
            return (
              <a
                key={item.id}
                href={`#/${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89260] ${
                  isActive
                    ? 'bg-[#B89260] text-[#FCFBF8] shadow-sm'
                    : 'text-[#C8C7BD] hover:bg-white/[0.06] hover:text-[#FAF8F3]'
                }`}
              >
                <Icon
                  className={`h-[17px] w-[17px] shrink-0 transition-colors ${
                    isActive ? 'text-[#FCFBF8]' : 'text-[#A2A499] group-hover:text-[#FAF8F3]'
                  }`}
                />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>

      <div className="px-3.5 pb-6 pt-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3.5 py-2 text-[11.5px] font-medium text-[#B9B9AE]">
          {isOnline && authMode === 'online' ? (
            <Cloud className="h-3.5 w-3.5 shrink-0 text-[#B89260]" />
          ) : (
            <HardDrive className="h-3.5 w-3.5 shrink-0 text-[#97998E]" />
          )}
          <span>
            {!isOnline
              ? 'Offline · No Internet'
              : authMode === 'online'
                ? 'Online · Cloud Sync'
                : 'Offline · Local DB'}
          </span>
        </div>
        <button
          type="button"
          onClick={onResetDemoData}
          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-[#B9B9AE] hover:bg-white/[0.06] hover:text-[#FAF8F3] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89260]"
        >
          <RotateCcw className="h-4 w-4 shrink-0 text-[#97998E]" />
          <span>Refresh Workspace</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-[236px] shrink-0 border-r border-[#21271D]">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#1B1F17]/55 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[260px] max-w-[82vw] h-full shadow-xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
