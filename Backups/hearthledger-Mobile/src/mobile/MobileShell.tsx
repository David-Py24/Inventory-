import React from 'react';
import { PageRoute, UserAccount } from '../types';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileShellProps {
  currentUser: UserAccount;
  activeRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onOpenProfile: () => void;
  onOpenMenu: () => void;
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  currentUser,
  activeRoute,
  onNavigate,
  onOpenProfile,
  onOpenMenu,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#23281E] flex flex-col md:hidden">
      <MobileHeader
        currentUser={currentUser}
        onOpenProfile={onOpenProfile}
        onOpenMenu={onOpenMenu}
      />
      <main className="flex-1 min-w-0 px-4 pt-4 pb-24">{children}</main>
      <MobileBottomNav activeRoute={activeRoute} onNavigate={onNavigate} />
    </div>
  );
};
