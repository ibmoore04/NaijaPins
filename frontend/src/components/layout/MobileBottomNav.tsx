import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  Home,
  Compass,
  Plus,
  Users,
  User,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenAuthModal }) => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = Boolean(user);

  // Hide on Admin portal pages so admin shell controls mobile navigation
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const isExplore = location.pathname.startsWith('/explore');
  const isCommunity = location.pathname.startsWith('/community');
  const isHome = location.pathname === '/';
  const isCreate = location.pathname === '/add-memory';
  const isProfileOrDash =
    location.pathname.startsWith('/profile') ||
    location.pathname.startsWith('/dashboard');

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border/80 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)] transition-all"
    >
      <div className="flex items-center justify-around h-15 px-2">
        {/* 1. Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all relative ${
              isActive || isHome
                ? 'text-[#0B6B3A]'
                : 'text-charcoal-muted hover:text-black'
            }`
          }
        >
          <Home className={`w-5 h-5 mb-0.5 ${isHome ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span>Home</span>
          {isHome && (
            <span className="absolute top-1 w-1 h-1 rounded-full bg-[#0B6B3A]" />
          )}
        </NavLink>

        {/* 2. Explore / Map */}
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all relative ${
              isActive || isExplore
                ? 'text-[#0B6B3A]'
                : 'text-charcoal-muted hover:text-black'
            }`
          }
        >
          <Compass className={`w-5 h-5 mb-0.5 ${isExplore ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span>Discover</span>
          {isExplore && (
            <span className="absolute top-1 w-1 h-1 rounded-full bg-[#0B6B3A]" />
          )}
        </NavLink>

        {/* 3. Center Create (+) Button */}
        <div className="flex items-center justify-center flex-1">
          <button
            type="button"
            onClick={() => navigate('/add-memory')}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
              isCreate
                ? 'bg-[#064D2A] ring-4 ring-[#0B6B3A]/30'
                : 'bg-[#0B6B3A] hover:bg-[#064D2A]'
            }`}
            title="Create Heritage Memory"
            aria-label="Create Heritage Memory"
          >
            <Plus className="w-6 h-6 stroke-[2.5px]" />
          </button>
        </div>

        {/* 4. Community */}
        <NavLink
          to="/community"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all relative ${
              isActive || isCommunity
                ? 'text-[#0B6B3A]'
                : 'text-charcoal-muted hover:text-black'
            }`
          }
        >
          <Users className={`w-5 h-5 mb-0.5 ${isCommunity ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span>Community</span>
          {isCommunity && (
            <span className="absolute top-1 w-1 h-1 rounded-full bg-[#0B6B3A]" />
          )}
        </NavLink>

        {/* 5. Profile / Sign In */}
        {isAuthenticated ? (
          <NavLink
            to={user ? `/profile/${user.id}` : '/dashboard'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all relative ${
                isActive || isProfileOrDash
                  ? 'text-[#0B6B3A]'
                  : 'text-charcoal-muted hover:text-black'
              }`
            }
          >
            {profile?.avatar_url ? (
              <div className="mb-0.5">
                <UserAvatar
                  src={profile.avatar_url}
                  name={profile.full_name}
                  size="sm"
                />
              </div>
            ) : (
              <User className={`w-5 h-5 mb-0.5 ${isProfileOrDash ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            )}
            <span>Profile</span>
            {isProfileOrDash && (
              <span className="absolute top-1 w-1 h-1 rounded-full bg-[#0B6B3A]" />
            )}
          </NavLink>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onOpenAuthModal) {
                onOpenAuthModal('login');
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold text-charcoal-muted hover:text-[#0B6B3A] transition-all relative active:scale-95"
            aria-label="Sign in to your account"
          >
            <User className="w-5 h-5 mb-0.5 stroke-2" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};
