import React from 'react';
import { BarChart3, Home, Landmark, Package, Settings } from 'lucide-react';
import { PageRoute } from '../types';

interface MobileBottomNavProps {
  activeRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeRoute,
  onNavigate,
}) => {
  const isAccountsActive = activeRoute === 'accounts' || activeRoute === 'profile';

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-[#E6E0D3] bg-[#FCFBF8]/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-2">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-[10.5px] font-medium transition-colors ${
            activeRoute === 'dashboard' ? 'text-[#23281E]' : 'text-[#85877C]'
          }`}
        >
          <Home
            className={`h-[19px] w-[19px] ${
              activeRoute === 'dashboard' ? 'text-[#2C3327]' : 'text-[#85877C]'
            }`}
          />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-[10.5px] font-medium transition-colors ${
            activeRoute === 'inventory' ? 'text-[#23281E]' : 'text-[#85877C]'
          }`}
        >
          <Package
            className={`h-[19px] w-[19px] ${
              activeRoute === 'inventory' ? 'text-[#2C3327]' : 'text-[#85877C]'
            }`}
          />
          <span>Stock</span>
        </button>

        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            aria-label="Reports"
            className={`flex h-11 w-11 -mt-3 items-center justify-center rounded-2xl transition-all shadow-[0_6px_16px_rgba(184,146,96,0.35)] ${
              activeRoute === 'reports'
                ? 'bg-[#2C3327] text-[#E0B75E] ring-2 ring-[#E0B75E]'
                : 'bg-[#E0B75E] text-[#1F221B] hover:bg-[#D5AA4E]'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
          </button>
          <span
            className={`mt-1 text-[10.5px] font-medium ${
              activeRoute === 'reports' ? 'text-[#23281E]' : 'text-[#85877C]'
            }`}
          >
            Reports
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('accounts')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-[10.5px] font-medium transition-colors ${
            isAccountsActive ? 'text-[#23281E]' : 'text-[#85877C]'
          }`}
        >
          <Landmark
            className={`h-[19px] w-[19px] ${
              isAccountsActive ? 'text-[#2C3327]' : 'text-[#85877C]'
            }`}
          />
          <span>Accounts</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-[10.5px] font-medium transition-colors ${
            activeRoute === 'settings' ? 'text-[#23281E]' : 'text-[#85877C]'
          }`}
        >
          <Settings
            className={`h-[19px] w-[19px] ${
              activeRoute === 'settings' ? 'text-[#2C3327]' : 'text-[#85877C]'
            }`}
          />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};
