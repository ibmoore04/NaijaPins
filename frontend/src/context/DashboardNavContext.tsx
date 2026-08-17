import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface DashboardNavContextType {
  isDashboardSidebarOpen: boolean;
  openDashboardSidebar: () => void;
  closeDashboardSidebar: () => void;
  toggleDashboardSidebar: () => void;
}

const DashboardNavContext = createContext<DashboardNavContextType | undefined>(undefined);

export const DashboardNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDashboardSidebarOpen, setIsDashboardSidebarOpen] = useState(false);
  const location = useLocation();

  // Automatically close mobile sidebar when route changes
  useEffect(() => {
    setIsDashboardSidebarOpen(false);
  }, [location.pathname]);

  const openDashboardSidebar = useCallback(() => {
    setIsDashboardSidebarOpen(true);
  }, []);

  const closeDashboardSidebar = useCallback(() => {
    setIsDashboardSidebarOpen(false);
  }, []);

  const toggleDashboardSidebar = useCallback(() => {
    setIsDashboardSidebarOpen((prev) => !prev);
  }, []);

  return (
    <DashboardNavContext.Provider
      value={{
        isDashboardSidebarOpen,
        openDashboardSidebar,
        closeDashboardSidebar,
        toggleDashboardSidebar,
      }}
    >
      {children}
    </DashboardNavContext.Provider>
  );
};

export const useDashboardNav = (): DashboardNavContextType => {
  const context = useContext(DashboardNavContext);
  if (!context) {
    throw new Error('useDashboardNav must be used within a DashboardNavProvider');
  }
  return context;
};
