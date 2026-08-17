import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { MembershipProvider } from '@/context/MembershipContext';
import { DashboardNavProvider } from '@/context/DashboardNavContext';
import { Header } from '@/components/layout/Header';
import { AuthModal } from '@/components/auth/AuthModal';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { CommunityPage } from '@/pages/CommunityPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { AddMemoryWizard } from '@/pages/AddMemoryWizard';
import { MemoryDetailPage } from '@/pages/MemoryDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PremiumPage } from '@/pages/PremiumPage';

// User Dashboard Module Imports
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardOverviewPage } from '@/pages/dashboard/DashboardOverviewPage';
import { MyMemoriesPage } from '@/pages/dashboard/MyMemoriesPage';
import { SavedMemoriesPage } from '@/pages/dashboard/SavedMemoriesPage';
import { ActivityPage } from '@/pages/dashboard/ActivityPage';
import { NotificationsPage } from '@/pages/dashboard/NotificationsPage';
import { DashboardProfilePage } from '@/pages/dashboard/DashboardProfilePage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { SubscriptionsPage } from '@/pages/dashboard/SubscriptionsPage';
import { BillingPage } from '@/pages/dashboard/BillingPage';

// Admin Portal Module Imports
import { AdminAppShell } from '@/components/admin/AdminAppShell';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminModerationPage } from '@/pages/admin/AdminModerationPage';
import { AdminSupportInboxPage } from '@/pages/admin/AdminSupportInboxPage';
import { AdminMemoriesPage } from '@/pages/admin/AdminMemoriesPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminCommentsPage } from '@/pages/admin/AdminCommentsPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminMembershipsPage } from '@/pages/admin/AdminMembershipsPage';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';

// Contributor Help & Support Imports
import { HelpCenterPage } from '@/pages/help/HelpCenterPage';
import { MySupportTicketsPage } from '@/pages/help/MySupportTicketsPage';
import { SupportConversationPage } from '@/pages/help/SupportConversationPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

interface AppShellContentProps {
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  handleOpenAuthModal: (tab?: 'login' | 'register') => void;
}

const AppShellContent: React.FC<AppShellContentProps> = ({
  authModalOpen,
  setAuthModalOpen,
  authModalTab,
  handleOpenAuthModal,
}) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col font-body">
      {/* 
        Only render the Public/Contributor Global Header when NOT on admin routes.
        Admin routes render their own single dedicated AdminHeader inside AdminAppShell.
      */}
      {!isAdminRoute && <Header onOpenAuthModal={handleOpenAuthModal} />}

      {/* Below Header: Viewport Body Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Routes>
          {/* Public & Feature Routes */}
          <Route
            path="/"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <HomePage onOpenAuthModal={handleOpenAuthModal} />
              </div>
            }
          />
          <Route
            path="/explore"
            element={
              <div className="flex-1 h-full overflow-hidden flex flex-col">
                <ExplorePage />
              </div>
            }
          />
          <Route
            path="/community"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <CommunityPage />
              </div>
            }
          />
          <Route
            path="/messages"
            element={
              <div className="flex-1 h-full overflow-hidden flex flex-col">
                <MessagesPage />
              </div>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <div className="flex-1 h-full overflow-hidden flex flex-col">
                <MessagesPage />
              </div>
            }
          />
          <Route
            path="/premium"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <PremiumPage />
              </div>
            }
          />
          <Route
            path="/add-memory"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <AddMemoryWizard onOpenAuthModal={() => handleOpenAuthModal('login')} />
              </div>
            }
          />
          <Route
            path="/memory/:slug"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <MemoryDetailPage />
              </div>
            }
          />
          <Route
            path="/profile"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <ProfilePage />
              </div>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <ProfilePage />
              </div>
            }
          />

          {/* Contributor Help & Support Routes */}
          <Route
            path="/help"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <HelpCenterPage />
              </div>
            }
          />
          <Route
            path="/help/requests"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <MySupportTicketsPage />
              </div>
            }
          />
          <Route
            path="/help/requests/:ticketId"
            element={
              <div className="flex-1 h-full overflow-y-auto no-scrollbar">
                <SupportConversationPage />
              </div>
            }
          />

          {/* Authenticated User Dashboard Sub-Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverviewPage />} />
            <Route path="memories" element={<MyMemoriesPage />} />
            <Route path="saved" element={<SavedMemoriesPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<DashboardProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="billing" element={<BillingPage />} />
          </Route>

          {/* Authenticated Staff Admin Portal Sub-Routes (Single Admin Header Layout) */}
          <Route
            path="/admin"
            element={
              <AdminRouteGuard>
                <AdminAppShell />
              </AdminRouteGuard>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route
              path="moderation"
              element={
                <AdminRouteGuard requiredModule="moderation">
                  <AdminModerationPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="support"
              element={
                <AdminRouteGuard requiredModule="support">
                  <AdminSupportInboxPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="memories"
              element={
                <AdminRouteGuard requiredModule="memories">
                  <AdminMemoriesPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="users"
              element={
                <AdminRouteGuard requiredModule="users">
                  <AdminUsersPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="reports"
              element={
                <AdminRouteGuard requiredModule="reports">
                  <AdminReportsPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="comments"
              element={
                <AdminRouteGuard requiredModule="comments">
                  <AdminCommentsPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="categories"
              element={
                <AdminRouteGuard requiredModule="categories">
                  <AdminCategoriesPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="memberships"
              element={
                <AdminRouteGuard requiredModule="memberships">
                  <AdminMembershipsPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="analytics"
              element={
                <AdminRouteGuard requiredModule="analytics">
                  <AdminAnalyticsPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="notifications"
              element={
                <AdminRouteGuard requiredModule="notifications">
                  <AdminNotificationsPage />
                </AdminRouteGuard>
              }
            />
            <Route
              path="settings"
              element={
                <AdminRouteGuard requiredModule="settings">
                  <AdminSettingsPage />
                </AdminRouteGuard>
              }
            />
          </Route>
        </Routes>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
      />
    </div>
  );
};

export const App: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const handleOpenAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MembershipProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <DashboardNavProvider>
              <AppShellContent
                authModalOpen={authModalOpen}
                setAuthModalOpen={setAuthModalOpen}
                authModalTab={authModalTab}
                handleOpenAuthModal={handleOpenAuthModal}
              />
            </DashboardNavProvider>
          </Router>
        </MembershipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
