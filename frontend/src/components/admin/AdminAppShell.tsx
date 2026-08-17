import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { adminService } from '@/services/admin.service';

export const AdminAppShell: React.FC = () => {
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openReportsCount, setOpenReportsCount] = useState(0);
  const [pendingMemoriesCount, setPendingMemoriesCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;
      const stats = await adminService.getOverviewStats();
      setOpenReportsCount(stats.open_reports);
      setPendingMemoriesCount(stats.pending_memories);
    };

    fetchCounts();
  }, [user]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gray-50 font-body">
      {/* 1. Single Top Fixed Admin Header */}
      <AdminHeader
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        openReportsCount={openReportsCount}
      />

      {/* 2. Below Header: App Shell Body */}
      <div className="flex-1 min-h-0 flex w-full h-full overflow-hidden">
        {/* Stationary Left Sidebar */}
        <AdminSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          openReportsCount={openReportsCount}
          pendingMemoriesCount={pendingMemoriesCount}
        />

        {/* Independently Scrolling Main Content Area */}
        <main className="flex-1 h-full min-w-0 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
