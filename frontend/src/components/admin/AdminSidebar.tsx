import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasModulePermission, AdminModule } from '@/config/adminPermissions';
import {
  LayoutDashboard,
  ShieldCheck,
  LifeBuoy,
  BookOpen,
  Users,
  AlertTriangle,
  MessageSquare,
  FolderTree,
  CreditCard,
  BarChart2,
  Bell,
  Settings,
  X,
  MapPin,
} from 'lucide-react';

interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  openReportsCount?: number;
  pendingMemoriesCount?: number;
}

interface NavEntry {
  label: string;
  path: string;
  icon: any;
  module: AdminModule;
  end?: boolean;
  badge?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  mobileOpen,
  onCloseMobile,
  openReportsCount = 0,
  pendingMemoriesCount = 0,
}) => {
  const { profile } = useAuth();
  const role = profile?.role || 'admin';

  // Close on Escape key press & prevent background scroll while open
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseMobile) {
        onCloseMobile();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen, onCloseMobile]);

  const allNavItems: NavEntry[] = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard, module: 'overview', end: true },
    {
      label: 'Moderation',
      path: '/admin/moderation',
      icon: ShieldCheck,
      module: 'moderation',
      badge: pendingMemoriesCount > 0 ? pendingMemoriesCount : undefined,
    },
    { label: 'Support Inbox', path: '/admin/support', icon: LifeBuoy, module: 'support' },
    { label: 'Memories', path: '/admin/memories', icon: BookOpen, module: 'memories' },
    { label: 'Users', path: '/admin/users', icon: Users, module: 'users' },
    {
      label: 'Reports',
      path: '/admin/reports',
      icon: AlertTriangle,
      module: 'reports',
      badge: openReportsCount > 0 ? openReportsCount : undefined,
    },
    { label: 'Comments', path: '/admin/comments', icon: MessageSquare, module: 'comments' },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree, module: 'categories' },
    { label: 'Memberships', path: '/admin/memberships', icon: CreditCard, module: 'memberships' },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart2, module: 'analytics' },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell, module: 'notifications' },
    { label: 'Settings & Logs', path: '/admin/settings', icon: Settings, module: 'settings' },
  ];

  // Filter items based on current role permissions
  const authorizedNavItems = allNavItems.filter((item) =>
    hasModulePermission(role, item.module)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Mobile Drawer Header */}
      {mobileOpen && (
        <div className="flex items-center justify-between p-4 border-b border-border/80 md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center font-bold text-sm">
              <MapPin className="w-4 h-4 fill-white stroke-[#0B6B3A]" />
            </div>
            <span className="font-bold text-base text-black">
              Admin Portal
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-100 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation Links Header */}
      <div className="px-3.5 pt-4 pb-2 text-xs font-semibold text-charcoal-muted">
        Management Modules
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar p-3.5 pt-0">
        {authorizedNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                    : 'text-charcoal-dark font-medium hover:bg-gray-100 hover:text-black'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-semibold shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Role Banner */}
      <div className="p-3.5 border-t border-border/80 bg-gray-50/60 shrink-0">
        <div className="text-xs font-normal text-charcoal-muted">
          Active Role
        </div>
        <div className="text-xs font-semibold text-black capitalize">
          {role.replace('_', ' ')}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Fixed Stationary Sidebar */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 h-full border-r border-border bg-white overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-xs flex animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Admin Navigation"
        >
          <div className="w-72 max-w-[85vw] h-full bg-white shadow-2xl animate-slide-right flex flex-col">
            {sidebarContent}
          </div>
          <div className="flex-1 cursor-pointer" onClick={onCloseMobile} aria-hidden="true" />
        </div>
      )}
    </>
  );
};
