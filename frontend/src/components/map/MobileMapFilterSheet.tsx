import React from 'react';
import { MobileBottomSheet } from '@/components/ui/MobileBottomSheet';
import { Category, SocialMapFilter } from '@/types/database';
import {
  Sparkles,
  Users,
  UserCheck,
  User,
  Clock,
  Flame,
  Calendar,
  Filter,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MobileMapFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Social Filters
  activeSocialFilter: SocialMapFilter;
  onSocialFilterChange: (filter: SocialMapFilter) => void;
  // Era Filters
  startYear: number;
  endYear: number;
  onYearChange: (start: number, end: number) => void;
  // Category Filters
  selectedCategory: string | null;
  onCategoryChange: (catId: string | null) => void;
  categories: Category[];
  onOpenAuthPrompt?: () => void;
}

const DECADES = [
  { label: 'All Time', start: 1960, end: 2030 },
  { label: '1960s', start: 1960, end: 1969 },
  { label: '1970s', start: 1970, end: 1979 },
  { label: '1980s', start: 1980, end: 1989 },
  { label: '1990s', start: 1990, end: 1999 },
  { label: '2000s', start: 2000, end: 2009 },
  { label: '2010s', start: 2010, end: 2019 },
  { label: '2020s+', start: 2020, end: 2030 },
];

const SOCIAL_TABS: { id: SocialMapFilter; label: string; icon: any; requiresAuth?: boolean }[] = [
  { id: 'all', label: 'All Memories', icon: Sparkles },
  { id: 'following', label: 'Following', icon: UserCheck, requiresAuth: true },
  { id: 'followers', label: 'Followers', icon: Users, requiresAuth: true },
  { id: 'my_memories', label: 'My Pins', icon: User, requiresAuth: true },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'popular', label: 'Popular', icon: Flame },
];

export const MobileMapFilterSheet: React.FC<MobileMapFilterSheetProps> = ({
  isOpen,
  onClose,
  activeSocialFilter,
  onSocialFilterChange,
  startYear,
  endYear,
  onYearChange,
  selectedCategory,
  onCategoryChange,
  categories,
  onOpenAuthPrompt,
}) => {
  const { user } = useAuth();

  const handleSocialClick = (filterId: SocialMapFilter, requiresAuth?: boolean) => {
    if (requiresAuth && !user) {
      onClose();
      if (onOpenAuthPrompt) onOpenAuthPrompt();
      return;
    }
    onSocialFilterChange(filterId);
  };

  const hasActiveFilters =
    activeSocialFilter !== 'all' ||
    selectedCategory !== null ||
    startYear !== 1960 ||
    endYear !== 2030;

  const handleResetAll = () => {
    onSocialFilterChange('all');
    onCategoryChange(null);
    onYearChange(1960, 2030);
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Map Filters"
      subtitle="Customize what memories you discover"
    >
      <div className="space-y-6 pb-6">
        {/* 1. Feed / Social Mode */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0B6B3A]" />
              <span>Social Discovery</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SOCIAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeSocialFilter === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleSocialClick(tab.id, tab.requiresAuth)}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#E8F5EE] text-[#0B6B3A] border-[#0B6B3A]'
                      : 'bg-gray-50 text-charcoal-dark border-border hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#0B6B3A]' : 'text-charcoal-muted'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#0B6B3A]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Era / Decade Selector */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Era / Decade</span>
          </span>

          <div className="flex flex-wrap gap-2">
            {DECADES.map((dec) => {
              const isSelected = startYear === dec.start && endYear === dec.end;
              return (
                <button
                  key={dec.label}
                  onClick={() => onYearChange(dec.start, dec.end)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-black text-white shadow-xs'
                      : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200'
                  }`}
                >
                  {dec.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Category Selector */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Category</span>
          </span>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar pb-1">
            <button
              onClick={() => onCategoryChange(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === null
                  ? 'bg-[#0B6B3A] text-white shadow-xs'
                  : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(isSelected ? null : cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#0B6B3A] text-white shadow-xs'
                      : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
          {hasActiveFilters ? (
            <button
              onClick={handleResetAll}
              className="text-xs font-bold text-red-600 flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          ) : (
            <span className="text-xs text-charcoal-muted">No active filters</span>
          )}

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white text-xs font-bold shadow-xs transition-colors"
          >
            Show Results
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};
