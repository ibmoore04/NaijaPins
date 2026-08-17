import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MapPin,
  Search,
  PlusCircle,
  Menu,
  X,
  ChevronDown,
  Compass,
  Users,
  Clock,
  Folder,
  LayoutGrid,
  Bookmark,
  Bell,
  MessageSquare,
  User,
  Settings,
  LogOut,
  Home,
  UserCheck,
  Flame,
  Trophy,
  Navigation,
  TrendingUp,
  BookOpen,
  LifeBuoy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardNav } from '@/context/DashboardNavContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { chatService } from '@/services/chat.service';
import { notificationsService } from '@/services/notifications.service';

interface HeaderProps {
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuthModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [communityDropdownOpen, setCommunityDropdownOpen] = useState(false);
  const [appsDropdownOpen, setAppsDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { isDashboardSidebarOpen, toggleDashboardSidebar } = useDashboardNav();

  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  const exploreRef = useRef<HTMLDivElement>(null);
  const communityRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = !!user;

  // Close dropdowns and public mobile menu on route change
  useEffect(() => {
    setExploreDropdownOpen(false);
    setCommunityDropdownOpen(false);
    setAppsDropdownOpen(false);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Handle Escape key and body scroll lock for public mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setExploreDropdownOpen(false);
      }
      if (communityRef.current && !communityRef.current.contains(event.target as Node)) {
        setCommunityDropdownOpen(false);
      }
      if (appsRef.current && !appsRef.current.contains(event.target as Node)) {
        setAppsDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread counters
  useEffect(() => {
    if (user) {
      chatService.getTotalUnreadMessagesCount(user.id).then((count) => {
        setUnreadMsgCount(count);
      });
      notificationsService.getUnreadCount(user.id).then((count) => {
        setUnreadNotifCount(count);
      });
    } else {
      setUnreadMsgCount(0);
      setUnreadNotifCount(0);
    }
  }, [user, location.pathname]);

  const isExploreActive = location.pathname === '/explore' && !location.search.includes('view=timeline') && !location.search.includes('view=categories');
  const isCommunityActive = location.pathname === '/community';
  const isTimelineActive = location.pathname === '/explore' && location.search.includes('view=timeline');
  const isCategoriesActive = location.pathname === '/explore' && location.search.includes('view=categories');

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-border/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* 1. Brand Logo & Tagline */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group focus:outline-none">
          <div className="w-9 h-9 rounded-full bg-[#0B6B3A] flex items-center justify-center text-white shadow-xs group-hover:bg-[#064D2A] transition-colors">
            <MapPin className="w-4.5 h-4.5 fill-white stroke-[#0B6B3A]" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-lg sm:text-xl text-[#0B6B3A] tracking-tight leading-none">
              NaijaPins
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-charcoal-muted tracking-wide mt-0.5">
              Where Nigeria remembers.
            </span>
          </div>
        </Link>

        {/* 2. Desktop Navigation Links (Clean & Smart Grouping) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          
          {/* Explore Dropdown */}
          <div className="relative" ref={exploreRef}>
            <button
              onClick={() => {
                setExploreDropdownOpen(!exploreDropdownOpen);
                setCommunityDropdownOpen(false);
                setAppsDropdownOpen(false);
                setUserDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
                isExploreActive
                  ? 'text-[#0B6B3A] font-bold'
                  : 'text-charcoal-dark hover:text-black hover:bg-gray-50'
              }`}
            >
              <Compass className={`w-4 h-4 ${isExploreActive ? 'text-[#0B6B3A]' : 'text-charcoal-dark'}`} />
              <span>Explore</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${exploreDropdownOpen ? 'rotate-180 text-[#0B6B3A]' : 'text-charcoal-muted'}`} />
              {isExploreActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#0B6B3A] rounded-full" />
              )}
            </button>

            {exploreDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-border rounded-2xl shadow-xl p-2 z-50 animate-scale-up space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-heading font-extrabold text-charcoal-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2 mb-1">
                  <Compass className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  <span>Explore</span>
                </div>
                <Link
                  to="/explore"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Map View</span>
                </Link>
                <Link
                  to="/explore?view=grid"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>All Memories</span>
                </Link>
                <Link
                  to="/explore?filter=nearby"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nearby</span>
                </Link>
                <Link
                  to="/explore?filter=popular"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  <span>Popular</span>
                </Link>
              </div>
            )}
          </div>

          {/* Community Dropdown */}
          <div className="relative" ref={communityRef}>
            <button
              onClick={() => {
                setCommunityDropdownOpen(!communityDropdownOpen);
                setExploreDropdownOpen(false);
                setAppsDropdownOpen(false);
                setUserDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
                isCommunityActive
                  ? 'text-[#0B6B3A] font-bold'
                  : 'text-charcoal-dark hover:text-black hover:bg-gray-50'
              }`}
            >
              <Users className={`w-4 h-4 ${isCommunityActive ? 'text-[#0B6B3A]' : 'text-charcoal-dark'}`} />
              <span>Community</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${communityDropdownOpen ? 'rotate-180 text-[#0B6B3A]' : 'text-charcoal-muted'}`} />
              {isCommunityActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#0B6B3A] rounded-full" />
              )}
            </button>

            {communityDropdownOpen && (
              <div className="absolute left-0 mt-2 w-52 bg-white border border-border rounded-2xl shadow-xl p-2 z-50 animate-scale-up space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-heading font-extrabold text-charcoal-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2 mb-1">
                  <Users className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  <span>Community</span>
                </div>
                <Link
                  to="/community"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  <span>Community Feed</span>
                </Link>
                <Link
                  to="/community?tab=following"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Following</span>
                </Link>
                <Link
                  to="/community?tab=popular"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  <span>Popular</span>
                </Link>
                <Link
                  to="/community?tab=popular"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5 text-yellow-600" />
                  <span>Leaderboard</span>
                </Link>
              </div>
            )}
          </div>

          {/* Timeline Link */}
          <Link
            to="/explore?view=timeline"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
              isTimelineActive
                ? 'text-[#0B6B3A] font-bold'
                : 'text-charcoal-dark hover:text-black hover:bg-gray-50'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimelineActive ? 'text-[#0B6B3A]' : 'text-charcoal-dark'}`} />
            <span>Timeline</span>
            {isTimelineActive && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#0B6B3A] rounded-full" />
            )}
          </Link>

          {/* Categories Link */}
          <Link
            to="/explore?view=categories"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
              isCategoriesActive
                ? 'text-[#0B6B3A] font-bold'
                : 'text-charcoal-dark hover:text-black hover:bg-gray-50'
            }`}
          >
            <Folder className={`w-4 h-4 ${isCategoriesActive ? 'text-[#0B6B3A]' : 'text-charcoal-dark'}`} />
            <span>Categories</span>
            {isCategoriesActive && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#0B6B3A] rounded-full" />
            )}
          </Link>
        </nav>

        {/* 3. Header Right Actions (Search, Messages, Apps Grid, Avatar, Add Memory) */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-2.5">
          {/* Search Button */}
          <Link
            to="/explore?search=true"
            className="p-2.5 text-charcoal-dark hover:text-[#0B6B3A] hover:bg-gray-50 rounded-xl transition-colors"
            title="Search"
            aria-label="Search memories"
          >
            <Search className="w-4.5 h-4.5" />
          </Link>

          {/* Direct Messages Icon Button */}
          <Link
            to="/messages"
            className="relative p-2.5 text-charcoal-dark hover:text-[#0B6B3A] hover:bg-gray-50 rounded-xl transition-colors"
            title="Direct Messages"
            aria-label="Direct Messages"
          >
            <MessageSquare className="w-4.5 h-4.5" />
            {unreadMsgCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#0B6B3A] text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-2xs">
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </span>
            )}
          </Link>

          {/* Apps Grid Menu Dropdown */}
          <div className="relative" ref={appsRef}>
            <button
              onClick={() => {
                setAppsDropdownOpen(!appsDropdownOpen);
                setExploreDropdownOpen(false);
                setCommunityDropdownOpen(false);
                setUserDropdownOpen(false);
              }}
              className={`p-2.5 text-charcoal-dark hover:text-[#0B6B3A] hover:bg-gray-50 rounded-xl transition-colors relative ${
                appsDropdownOpen ? 'bg-[#E8F5EE] text-[#0B6B3A]' : ''
              }`}
              title="Apps"
              aria-label="Apps Menu"
            >
              <LayoutGrid className="w-4.5 h-4.5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0B6B3A]" />
              )}
            </button>

            {appsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-2xl shadow-xl p-2 z-50 animate-scale-up space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-heading font-extrabold text-charcoal-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2 mb-1">
                  <LayoutGrid className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  <span>Apps</span>
                </div>

                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/dashboard/saved"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <Bookmark className="w-4 h-4 text-blue-600" />
                  <span>Saved</span>
                </Link>

                <Link
                  to="/dashboard/notifications"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <span>Notifications</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <span className="w-4.5 h-4.5 rounded-full bg-[#0B6B3A] text-white text-[10px] font-extrabold flex items-center justify-center">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/messages"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span>Messages</span>
                  </div>
                  {unreadMsgCount > 0 && (
                    <span className="w-4.5 h-4.5 rounded-full bg-[#0B6B3A] text-white text-[10px] font-extrabold flex items-center justify-center">
                      {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                    </span>
                  )}
                </Link>

                <Link
                  to={user ? `/profile/${user.id}` : '/profile'}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <User className="w-4 h-4 text-teal-600" />
                  <span>Profile</span>
                </Link>

                <Link
                  to="/dashboard/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>Settings</span>
                </Link>

                <Link
                  to="/help"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A] transition-colors"
                >
                  <LifeBuoy className="w-4 h-4 text-[#0B6B3A]" />
                  <span>Help & Support</span>
                </Link>
              </div>
            )}
          </div>

          {/* User Avatar / Profile Menu */}
          {isAuthenticated ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setExploreDropdownOpen(false);
                  setCommunityDropdownOpen(false);
                  setAppsDropdownOpen(false);
                }}
                className="flex items-center p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 transition-transform active:scale-95"
                aria-label="User profile options"
              >
                <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-2xl shadow-xl p-2 z-50 animate-scale-up space-y-1">
                  <div className="px-3 py-2 border-b border-border/50 mb-1">
                    <p className="text-xs font-bold text-black truncate">{profile?.full_name || 'Contributor'}</p>
                    <p className="text-[11px] text-charcoal-muted truncate">{user.email}</p>
                  </div>

                  <Link
                    to={`/profile/${user.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-gray-50"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to="/help"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-dark hover:bg-gray-50"
                  >
                    <LifeBuoy className="w-4 h-4 text-[#0B6B3A]" />
                    <span>Help & Support</span>
                  </Link>

                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 text-left transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="text-xs font-bold text-charcoal-dark hover:text-[#0B6B3A] px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Log in
            </button>
          )}

          {/* Add Memory Button */}
          <Link to="/add-memory">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-full px-4 h-9 shadow-xs text-xs"
            >
              Add Memory
            </Button>
          </Link>
        </div>

        {/* 4. Mobile Right Triggers */}
        <div className="flex md:hidden items-center gap-1.5">
          <Link
            to="/explore?search=true"
            className="p-2 text-charcoal-dark"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Link>

          {isAuthenticated && (
            <Link to="/messages" className="relative p-2 text-charcoal-dark" aria-label="Messages">
              <MessageSquare className="w-5 h-5" />
              {unreadMsgCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#0B6B3A] text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadMsgCount}
                </span>
              )}
            </Link>
          )}

          <button
            onClick={() => {
              if (isDashboardRoute) {
                toggleDashboardSidebar();
              } else {
                setMobileMenuOpen(!mobileMenuOpen);
              }
            }}
            className="p-2 text-charcoal-dark hover:bg-gray-100 rounded-xl focus:outline-none transition-colors"
            aria-label={
              (isDashboardRoute ? isDashboardSidebarOpen : mobileMenuOpen)
                ? 'Close navigation'
                : 'Open navigation'
            }
            aria-expanded={isDashboardRoute ? isDashboardSidebarOpen : mobileMenuOpen}
          >
            {(isDashboardRoute ? isDashboardSidebarOpen : mobileMenuOpen) ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* 5. Mobile Drawer Menu (For Public / Non-Dashboard Pages) */}
      {!isDashboardRoute && mobileMenuOpen && (
        <div
          className="md:hidden border-t border-border bg-white px-5 pt-4 pb-8 space-y-4 animate-fade-in max-h-[85vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          {/* Drawer Header Brand */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B6B3A] flex items-center justify-center text-white">
                <MapPin className="w-4 h-4 fill-white stroke-[#0B6B3A]" />
              </div>
              <div>
                <h4 className="font-heading font-extrabold text-base text-[#0B6B3A]">NaijaPins</h4>
                <p className="text-[10px] text-charcoal-muted">Where Nigeria remembers.</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col space-y-1 text-sm font-semibold">
            <Link
              to="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A]"
            >
              <div className="flex items-center gap-3">
                <Compass className="w-4.5 h-4.5 text-[#0B6B3A]" />
                <span>Explore</span>
              </div>
              <span className="text-xs text-charcoal-muted">›</span>
            </Link>

            <Link
              to="/community"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-[#E8F5EE] hover:text-[#0B6B3A]"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4.5 h-4.5 text-[#0B6B3A]" />
                <span>Community</span>
              </div>
              <span className="text-xs text-charcoal-muted">›</span>
            </Link>

            <Link
              to="/explore?view=timeline"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-gray-50"
            >
              <Clock className="w-4.5 h-4.5 text-charcoal-muted" />
              <span>Timeline</span>
            </Link>

            <Link
              to="/explore?view=categories"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-gray-50"
            >
              <Folder className="w-4.5 h-4.5 text-charcoal-muted" />
              <span>Categories</span>
            </Link>

            <div className="pt-2 border-t border-border/70 my-1 space-y-1">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-gray-50"
              >
                <BookOpen className="w-4.5 h-4.5 text-emerald-600" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/dashboard/saved"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-gray-50"
              >
                <Bookmark className="w-4.5 h-4.5 text-blue-600" />
                <span>Saved</span>
              </Link>

              <Link
                to="/dashboard/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4.5 h-4.5 text-amber-600" />
                  <span>Notifications</span>
                </div>
                {unreadNotifCount > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-[#0B6B3A] text-white text-[10px] font-extrabold flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </Link>

              <Link
                to="/messages"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4.5 h-4.5 text-purple-600" />
                  <span>Messages</span>
                </div>
                {unreadMsgCount > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-[#0B6B3A] text-white text-[10px] font-extrabold flex items-center justify-center">
                    {unreadMsgCount}
                  </span>
                )}
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    to={`/profile/${user.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-gray-50"
                  >
                    <User className="w-4.5 h-4.5 text-teal-600" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    to="/dashboard/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-charcoal-dark hover:bg-gray-50"
                  >
                    <Settings className="w-4.5 h-4.5 text-gray-500" />
                    <span>Settings</span>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Add Memory Action Button */}
          <div className="pt-2">
            <Link
              to="/add-memory"
              onClick={() => setMobileMenuOpen(false)}
              className="block"
            >
              <Button
                variant="primary"
                size="lg"
                leftIcon={<PlusCircle className="w-5 h-5" />}
                className="w-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-2xl justify-center text-sm shadow-xs"
              >
                Add Your Memory
              </Button>
            </Link>

            {isAuthenticated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                leftIcon={<LogOut className="w-4 h-4" />}
                className="w-full justify-center mt-2.5 text-xs text-red-600 border-red-200"
              >
                Sign Out
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenAuthModal && onOpenAuthModal('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full justify-center mt-2.5 text-xs font-bold"
              >
                Log In / Register
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
