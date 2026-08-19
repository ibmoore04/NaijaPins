import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { chatService } from '@/services/chat.service';
import { notificationsService } from '@/services/notifications.service';
import {
  Home,
  Compass,
  Users,
  MessageSquare,
  Bell,
  Bookmark,
  User,
  Settings,
  Plus,
} from 'lucide-react';

interface DesktopSidebarProps {
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  className?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  onOpenAuthModal,
  className = '',
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (user) {
      chatService.getTotalUnreadMessagesCount(user.id).then(setUnreadMsgCount);
      notificationsService.getUnreadCount(user.id).then(setUnreadNotifCount);
    }
  }, [user, location.pathname]);

  const navItems = [
    {
      label: 'Home',
      to: '/',
      icon: Home,
      exact: true,
    },
    {
      label: 'Discover',
      to: '/explore',
      icon: Compass,
      exact: false,
    },
    {
      label: 'Community',
      to: '/community',
      icon: Users,
      exact: false,
    },
    {
      label: 'Messages',
      to: '/messages',
      icon: MessageSquare,
      exact: false,
      badge: unreadMsgCount,
      requiresAuth: true,
    },
    {
      label: 'Notifications',
      to: '/dashboard/notifications',
      icon: Bell,
      exact: false,
      badge: unreadNotifCount,
      requiresAuth: true,
    },
    {
      label: 'Saved',
      to: '/dashboard/saved',
      icon: Bookmark,
      exact: false,
      requiresAuth: true,
    },
    {
      label: 'Profile',
      to: user ? `/profile/${user.id}` : '/profile',
      icon: User,
      exact: false,
      requiresAuth: true,
    },
    {
      label: 'Settings',
      to: '/dashboard/settings',
      icon: Settings,
      exact: false,
      requiresAuth: true,
    },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col w-56 xl:w-64 h-[calc(100vh-4rem)] sticky top-16 bg-white border-r border-gray-100 p-4 shrink-0 justify-between select-none ${className}`}
    >
      {/* Primary Navigation Menu */}
      <div className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          if (item.requiresAuth && !user) {
            return (
              <button
                key={item.label}
                onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
              >
                <Icon className="w-5 h-5 text-gray-500" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                isItemActive
                  ? 'bg-[#E8F5EE] text-[#0B6B3A] font-bold shadow-2xs'
                  : 'text-gray-700 hover:text-black hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon
                  className={`w-5 h-5 ${
                    isItemActive ? 'text-[#0B6B3A] stroke-[2.5px]' : 'text-gray-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && item.badge > 0 ? (
                <span className="w-5 h-5 rounded-full bg-[#0B6B3A] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Create Memory Pill Button */}
      <div className="pt-4 border-t border-gray-100">
        <Link
          to="/add-memory"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold text-sm shadow-md transition-all active:scale-98"
        >
          <Plus className="w-4 h-4 stroke-[3px]" />
          <span>Create</span>
        </Link>
      </div>
    </aside>
  );
};
