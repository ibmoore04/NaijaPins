import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardNav } from '@/context/DashboardNavContext';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardSkeleton } from './DashboardSkeleton';
import { notificationsService } from '@/services/notifications.service';

export const DashboardLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isDashboardSidebarOpen, closeDashboardSidebar } = useDashboardNav();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      if (user) {
        const notifs = await notificationsService.getNotifications(user.id);
        const unread = notifs.filter((n) => !n.is_read).length;
        setUnreadNotificationsCount(unread);
      }
    };
    fetchUnread();
  }, [user]);

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  // Route protection
  if (!user) {
    return <Navigate to="/explore" replace />;
  }

  return (
    <div className="flex-1 min-h-0 flex w-full h-full overflow-hidden bg-gray-50 font-body">
      {/* Stationary Desktop Sidebar & Mobile Drawer */}
      <DashboardSidebar
        mobileOpen={isDashboardSidebarOpen}
        onCloseMobile={closeDashboardSidebar}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Dashboard Content - Independently Scrolling with hidden scrollbars & mobile nav clearance */}
      <main className="flex-1 h-full min-w-0 overflow-y-auto no-scrollbar p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
