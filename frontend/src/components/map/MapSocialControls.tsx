import React from 'react';
import { SocialMapFilter } from '@/types/database';
import {
  Sparkles,
  Users,
  UserCheck,
  User,
  Clock,
  Flame,
  Navigation,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MapSocialControlsProps {
  activeSocialFilter: SocialMapFilter;
  onSocialFilterChange: (filter: SocialMapFilter) => void;
  targetUser?: { id: string; name?: string | null } | null;
  onClearTargetUser?: () => void;
  activeHashtag?: string | null;
  onClearHashtag?: () => void;
  isLocatingNearMe?: boolean;
  onTriggerNearMe?: () => void;
  onClearNearMe?: () => void;
  onOpenAuthPrompt?: () => void;
}

const SOCIAL_TABS: { id: SocialMapFilter; label: string; icon: any; requiresAuth?: boolean }[] = [
  { id: 'all', label: 'All Memories', icon: Sparkles },
  { id: 'following', label: 'Following', icon: UserCheck, requiresAuth: true },
  { id: 'followers', label: 'Followers', icon: Users, requiresAuth: true },
  { id: 'my_memories', label: 'My Pins', icon: User, requiresAuth: true },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'popular', label: 'Popular', icon: Flame },
];

export const MapSocialControls: React.FC<MapSocialControlsProps> = ({
  activeSocialFilter,
  onSocialFilterChange,
  targetUser,
  onClearTargetUser,
  activeHashtag,
  onClearHashtag,
  isLocatingNearMe,
  onTriggerNearMe,
  onClearNearMe,
  onOpenAuthPrompt,
}) => {
  const { user } = useAuth();

  const handleTabClick = (tabId: SocialMapFilter, requiresAuth?: boolean) => {
    if (requiresAuth && !user) {
      if (onOpenAuthPrompt) {
        onOpenAuthPrompt();
      } else {
        alert('Please sign in to view your social connections and personal pins!');
      }
      return;
    }
    onSocialFilterChange(tabId);
  };

  return (
    <div className="space-y-2">
      {/* 1. Context Banner (When Viewing Specific User, Hashtag, or Location) */}
      {(targetUser || activeHashtag || activeSocialFilter === 'near_me') && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-black/85 text-white backdrop-blur-md shadow-lg text-xs font-semibold animate-fade-in mx-auto w-fit max-w-full">
          <div className="flex items-center gap-1.5 truncate">
            {targetUser && (
              <>
                <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  Viewing pins from <strong className="text-emerald-300 font-bold">{targetUser.name || 'Contributor'}</strong>
                </span>
              </>
            )}

            {activeHashtag && (
              <>
                <span className="text-emerald-400 font-bold">#</span>
                <span className="truncate">
                  Hashtag: <strong className="text-emerald-300 font-bold">#{activeHashtag.replace(/^#/, '')}</strong>
                </span>
              </>
            )}

            {activeSocialFilter === 'near_me' && (
              <>
                <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Showing memories near you (15km radius)</span>
              </>
            )}
          </div>

          <button
            onClick={() => {
              if (targetUser && onClearTargetUser) onClearTargetUser();
              if (activeHashtag && onClearHashtag) onClearHashtag();
              if (activeSocialFilter === 'near_me' && onClearNearMe) onClearNearMe();
            }}
            className="p-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors shrink-0 ml-2"
            title="Clear filter"
            aria-label="Clear active filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Floating Social Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-white/95 backdrop-blur-md border border-border/80 rounded-full shadow-md w-fit max-w-full scrollbar-none">
        {SOCIAL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSocialFilter === tab.id && !targetUser && !activeHashtag;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.requiresAuth)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#0B6B3A] text-white shadow-xs'
                  : 'text-charcoal-dark hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-charcoal-muted'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Near Me Location Button */}
        {onTriggerNearMe && (
          <button
            onClick={onTriggerNearMe}
            disabled={isLocatingNearMe}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              activeSocialFilter === 'near_me'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
          >
            {isLocatingNearMe ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>Near Me</span>
          </button>
        )}
      </div>
    </div>
  );
};
