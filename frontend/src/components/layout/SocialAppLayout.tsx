import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';

interface SocialAppLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  fullWidth?: boolean;
}

export const SocialAppLayout: React.FC<SocialAppLayoutProps> = ({
  children,
  rightPanel,
  onOpenAuthModal,
  fullWidth = false,
}) => {
  return (
    <div className="flex-1 min-h-0 flex w-full max-w-[1440px] mx-auto overflow-hidden">
      {/* 1. Left Navigation Sidebar (Desktop Only) */}
      <DesktopSidebar onOpenAuthModal={onOpenAuthModal} />

      {/* 2. Main Center Content Column */}
      <main
        className={`flex-1 min-h-0 h-full overflow-y-auto no-scrollbar pb-24 md:pb-6 ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        <div
          className={`mx-auto ${
            rightPanel
              ? 'grid grid-cols-1 xl:grid-cols-12 gap-6 px-3 sm:px-6 py-4'
              : fullWidth
              ? 'w-full'
              : 'max-w-4xl px-3 sm:px-6 py-4'
          }`}
        >
          {/* Main Feed/Content Column */}
          <div className={rightPanel ? 'xl:col-span-8 space-y-4' : 'w-full'}>
            {children}
          </div>

          {/* 3. Right Contextual Information Panel (Desktop Only) */}
          {rightPanel && (
            <aside className="hidden xl:block xl:col-span-4 space-y-5 sticky top-4 h-fit">
              {rightPanel}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};
