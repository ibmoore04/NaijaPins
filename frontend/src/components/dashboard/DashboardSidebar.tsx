import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  BookOpen,
  Bookmark,
  PlusCircle,
  Activity,
  Bell,
  User,
  Settings,
  Mail,
  CreditCard,
  HelpCircle,
  LogOut,
  MapPin,
  X,
  Crown,
} from 'lucide-react';

interface DashboardSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  unreadNotificationsCount?: number;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
  unreadNotificationsCount = 0,
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, end: true },
    { label: 'My Memories', path: '/dashboard/memories', icon: BookOpen },
    { label: 'Saved Memories', path: '/dashboard/saved', icon: Bookmark },
    { label: 'Add Memory', path: '/add-memory', icon: PlusCircle, highlight: true },
    { label: 'Activity', path: '/dashboard/activity', icon: Activity },
    {
      label: 'Notifications',
      path: '/dashboard/notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { label: 'Profile', path: '/dashboard/profile', icon: User },
    { label: 'Settings', path: '/dashboard/settings', icon: Settings },
    { label: 'Billing & Membership', path: '/dashboard/billing', icon: CreditCard },
    { label: 'Subscriptions', path: '/dashboard/subscriptions', icon: Mail },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Mobile Drawer Header (Only visible on mobile drawer overlay) */}
      {mobileOpen && (
        <div className="flex items-center justify-between p-4 border-b border-border/80 md:hidden shrink-0">
          <NavLink to="/" onClick={onCloseMobile} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center font-bold text-sm">
              <MapPin className="w-4 h-4 fill-white stroke-[#0B6B3A]" />
            </div>
            <span className="font-heading font-extrabold text-lg text-[#0B6B3A] tracking-tight">
              NaijaPins
            </span>
          </NavLink>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-100 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Navigation Links (Independently scrolling, hidden scrollbar) */}
      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar p-3.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  item.highlight
                    ? 'bg-[#E8F5EE] text-[#0B6B3A] border border-[#A3D9BC]/60 hover:bg-[#d0ebd9]'
                    : isActive
                    ? 'bg-[#0B6B3A] text-white shadow-xs'
                    : 'text-charcoal-dark hover:bg-gray-100 hover:text-black'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Upgrade Banner & Footer Area (Pinned at bottom) */}
      <div className="p-3 border-t border-border space-y-3 shrink-0 bg-white">
        <NavLink
          to="/premium"
          onClick={onCloseMobile}
          className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-[#0B6B3A]/10 border border-[#A3D9BC]/80 hover:border-[#0B6B3A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-extrabold text-black">Upgrade Premium</span>
          </div>
          <span className="text-[10px] font-bold text-[#0B6B3A]">₦2.5k/mo</span>
        </NavLink>

        <div className="space-y-0.5">
          <NavLink
            to="/help"
            onClick={onCloseMobile}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-charcoal-muted hover:text-black hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Help & Support</span>
          </NavLink>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Fixed Stationary Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-full border-r border-border bg-white overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-xs flex animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="User Dashboard Navigation"
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
