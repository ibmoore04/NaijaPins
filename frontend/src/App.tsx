import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { MembershipProvider } from '@/context/MembershipContext';
import { DashboardNavProvider } from '@/context/DashboardNavContext';
import { CallProvider } from '@/context/CallContext';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { PushNotificationPromptModal } from '@/components/notifications/PushNotificationPromptModal';
import { PageLoader } from '@/components/ui/PageLoader';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Eagerly loaded landing page for optimal First Contentful Paint / LCP
import { HomePage } from '@/pages/HomePage';

// Lazy-loaded Feature Pages
const ExplorePage = lazy(() => import('@/pages/ExplorePage').then(m => ({ default: m.ExplorePage })));
const CommunityPage = lazy(() => import('@/pages/CommunityPage').then(m => ({ default: m.CommunityPage })));
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const AddMemoryWizard = lazy(() => import('@/pages/AddMemoryWizard').then(m => ({ default: m.AddMemoryWizard })));
const MemoryDetailPage = lazy(() => import('@/pages/MemoryDetailPage').then(m => ({ default: m.MemoryDetailPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PremiumPage = lazy(() => import('@/pages/PremiumPage').then(m => ({ default: m.PremiumPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// User Dashboard Module Lazy Imports
const DashboardLayout = lazy(() => import('@/components/dashboard/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const DashboardOverviewPage = lazy(() => import('@/pages/dashboard/DashboardOverviewPage').then(m => ({ default: m.DashboardOverviewPage })));
const MyMemoriesPage = lazy(() => import('@/pages/dashboard/MyMemoriesPage').then(m => ({ default: m.MyMemoriesPage })));
const SavedMemoriesPage = lazy(() => import('@/pages/dashboard/SavedMemoriesPage').then(m => ({ default: m.SavedMemoriesPage })));
const ActivityPage = lazy(() => import('@/pages/dashboard/ActivityPage').then(m => ({ default: m.ActivityPage })));
const NotificationsPage = lazy(() => import('@/pages/dashboard/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const DashboardProfilePage = lazy(() => import('@/pages/dashboard/DashboardProfilePage').then(m => ({ default: m.DashboardProfilePage })));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SubscriptionsPage = lazy(() => import('@/pages/dashboard/SubscriptionsPage').then(m => ({ default: m.SubscriptionsPage })));
const BillingPage = lazy(() => import('@/pages/dashboard/BillingPage').then(m => ({ default: m.BillingPage })));

// Admin Portal Module Lazy Imports
const AdminAppShell = lazy(() => import('@/components/admin/AdminAppShell').then(m => ({ default: m.AdminAppShell })));
const AdminRouteGuard = lazy(() => import('@/components/admin/AdminRouteGuard').then(m => ({ default: m.AdminRouteGuard })));
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage').then(m => ({ default: m.AdminOverviewPage })));
const AdminModerationPage = lazy(() => import('@/pages/admin/AdminModerationPage').then(m => ({ default: m.AdminModerationPage })));
const AdminSupportInboxPage = lazy(() => import('@/pages/admin/AdminSupportInboxPage').then(m => ({ default: m.AdminSupportInboxPage })));
const AdminMemoriesPage = lazy(() => import('@/pages/admin/AdminMemoriesPage').then(m => ({ default: m.AdminMemoriesPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage').then(m => ({ default: m.AdminReportsPage })));
const AdminCommentsPage = lazy(() => import('@/pages/admin/AdminCommentsPage').then(m => ({ default: m.AdminCommentsPage })));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })));
const AdminMembershipsPage = lazy(() => import('@/pages/admin/AdminMembershipsPage').then(m => ({ default: m.AdminMembershipsPage })));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })));
const AdminNotificationsPage = lazy(() => import('@/pages/admin/AdminNotificationsPage').then(m => ({ default: m.AdminNotificationsPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));

// Contributor Help & Support Lazy Imports
const HelpCenterPage = lazy(() => import('@/pages/help/HelpCenterPage').then(m => ({ default: m.HelpCenterPage })));
const MySupportTicketsPage = lazy(() => import('@/pages/help/MySupportTicketsPage').then(m => ({ default: m.MySupportTicketsPage })));
const SupportConversationPage = lazy(() => import('@/pages/help/SupportConversationPage').then(m => ({ default: m.SupportConversationPage })));

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public & Feature Routes */}
            <Route
              path="/"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
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
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <CommunityPage />
                </div>
              }
            />
            <Route
              path="/messages"
              element={
                <div className="flex-1 h-full overflow-hidden flex flex-col mobile-page-content">
                  <MessagesPage />
                </div>
              }
            />
            <Route
              path="/messages/:conversationId"
              element={
                <div className="flex-1 h-full overflow-hidden flex flex-col mobile-page-content">
                  <MessagesPage />
                </div>
              }
            />
            <Route
              path="/premium"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <PremiumPage />
                </div>
              }
            />
            <Route
              path="/add-memory"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <AddMemoryWizard onOpenAuthModal={() => handleOpenAuthModal('login')} />
                </div>
              }
            />
            <Route
              path="/memory/:slug"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <MemoryDetailPage />
                </div>
              }
            />
            <Route
              path="/profile"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <ProfilePage />
                </div>
              }
            />
            <Route
              path="/profile/:id"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <ProfilePage />
                </div>
              }
            />

            {/* Contributor Help & Support Routes */}
            <Route
              path="/help"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <HelpCenterPage />
                </div>
              }
            />
            <Route
              path="/help/requests"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <MySupportTicketsPage />
                </div>
              }
            />
            <Route
              path="/help/requests/:ticketId"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
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

            {/* Catch-all 404 Route */}
            <Route
              path="*"
              element={
                <div className="flex-1 h-full overflow-y-auto no-scrollbar mobile-page-content">
                  <NotFoundPage />
                </div>
              }
            />
          </Routes>
        </Suspense>
      </div>

      {/* Contextual Push Notification Prompt Modal */}
      <PushNotificationPromptModal />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
      />

      {/* Global Mobile Bottom Navigation Bar */}
      <MobileBottomNav onOpenAuthModal={handleOpenAuthModal} />
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MembershipProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <DashboardNavProvider>
                <CallProvider>
                  <AppShellContent
                    authModalOpen={authModalOpen}
                    setAuthModalOpen={setAuthModalOpen}
                    authModalTab={authModalTab}
                    handleOpenAuthModal={handleOpenAuthModal}
                  />
                </CallProvider>
              </DashboardNavProvider>
            </Router>
          </MembershipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
