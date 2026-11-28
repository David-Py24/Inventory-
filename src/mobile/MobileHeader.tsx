import React from 'react';
import { Cloud, HardDrive, Menu } from 'lucide-react';
import { UserAccount } from '../types';
import type { AuthMode } from '../api/client';

interface MobileHeaderProps {
  currentUser: UserAccount;
  authMode?: AuthMode;
  isOnline?: boolean;
  onOpenProfile: () => void;
  onOpenMenu: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentUser,
  authMode = 'offline',
  isOnline = true,
  onOpenProfile,
  onOpenMenu,
}) => {
  const initials = currentUser.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F5F1E8]/95 backdrop-blur-sm px-4 py-3 border-b border-[#E6E0D3]/70 md:hidden">
      <button
        type="button"
        onClick={onOpenProfile}
        className="flex items-center gap-3 text-left min-w-0 rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89260]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2C3327] font-serif text-[13.5px] font-semibold text-[#F5F2EB] ring-2 ring-[#E6E0D3]">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[9.5px] font-semibold tracking-[0.14em] uppercase text-[#7D8075]">
            Welcome back
          </div>
          <div className="truncate text-[14.5px] font-semibold text-[#23281E] leading-tight">
            {currentUser.name}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D3] bg-[#FCFBF8] px-2.5 py-1 text-[10.5px] font-medium text-[#555A4E]">
          {isOnline && authMode === 'online' ? (
            <Cloud className="h-3 w-3 text-[#B89260]" />
          ) : (
            <HardDrive className="h-3 w-3 text-[#7D8075]" />
          )}
          <span>{!isOnline ? 'Offline' : authMode === 'online' ? 'Online' : 'Offline'}</span>
        </span>
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E0D3] bg-[#FCFBF8] text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
};
