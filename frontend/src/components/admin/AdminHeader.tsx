import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AdminStatusBadge } from './AdminStatusBadge';
import {
  MapPin,
  Menu,
  Bell,
  ArrowUpRight,
  LogOut,
  Globe,
} from 'lucide-react';

interface AdminHeaderProps {
  onToggleMobileSidebar: () => void;
  openReportsCount?: number;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileSidebar,
  openReportsCount = 0,
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="h-16 shrink-0 z-40 bg-white border-b border-border/90 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 text-charcoal-dark hover:bg-gray-100 rounded-xl md:hidden transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/admin" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center font-semibold text-sm shadow-xs group-hover:bg-[#064D2A] transition-colors">
            <MapPin className="w-4 h-4 fill-white stroke-[#0B6B3A]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-black tracking-tight leading-none">
              NaijaPins
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#0B6B3A] text-white text-[11px] font-semibold tracking-wide uppercase">
              Admin
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-3">
        {/* Reports Notification Indicator */}
        <Link
          to="/admin/reports"
          className="relative p-2 text-charcoal-dark hover:text-[#0B6B3A] hover:bg-gray-100 rounded-xl transition-colors"
          title="Open Reports"
        >
          <Bell className="w-4.5 h-4.5" />
          {openReportsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
          )}
        </Link>

        {/* Exit to Main App */}
        <Link
          to="/explore"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-charcoal-dark hover:bg-gray-50 transition-colors"
          title="Switch to public platform"
        >
          <Globe className="w-3.5 h-3.5 text-[#0B6B3A]" />
          <span>Exit to App</span>
          <ArrowUpRight className="w-3 h-3 text-charcoal-muted" />
        </Link>

        {/* Admin Profile Info */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border/80">
          <UserAvatar
            src={profile?.avatar_url}
            name={profile?.full_name || 'Admin'}
            size="sm"
          />
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-semibold text-black line-clamp-1">
              {profile?.full_name || 'Staff User'}
            </span>
            <AdminStatusBadge type="role" value={profile?.role || 'admin'} size="sm" />
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="p-2 text-charcoal-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          title="Sign out of Admin Portal"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
