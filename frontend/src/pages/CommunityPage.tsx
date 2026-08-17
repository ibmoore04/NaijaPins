import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { MemoryCard } from '@/components/social/MemoryCard';
import {
  Sparkles,
  Clock,
  Flame,
  Users,
  MapPin,
  PlusCircle,
  Search,
  Loader2,
  TrendingUp,
  Compass,
} from 'lucide-react';
import { CommunityFeedItem, FeedTab } from '@/types/social';
import { socialFeedService } from '@/services/socialFeed.service';
import { useAuth } from '@/hooks/useAuth';
import { QuickMemoryComposer } from '@/components/composer/QuickMemoryComposer';

const POPULAR_LOCATIONS = [
  { city: 'Lagos', state: 'Lagos', count: 128 },
  { city: 'Ibadan', state: 'Oyo', count: 74 },
  { city: 'Enugu', state: 'Enugu', count: 52 },
  { city: 'Benin City', state: 'Edo', count: 48 },
  { city: 'Calabar', state: 'Cross River', count: 39 },
  { city: 'Kano', state: 'Kano', count: 36 },
];

export const CommunityPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as FeedTab) || 'for_you';

  const [feedItems, setFeedItems] = useState<CommunityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 12;

  const loadFeed = async (tab: FeedTab, offset: number = 0, append: boolean = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    const items = await socialFeedService.getCommunityFeed(tab, user?.id, PAGE_SIZE, offset);

    if (append) {
      setFeedItems((prev) => [...prev, ...items]);
    } else {
      setFeedItems(items);
    }

    setHasMore(items.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    setPageOffset(0);
    loadFeed(activeTab, 0, false);
  }, [activeTab, user?.id]);

  const handleTabChange = (tab: FeedTab) => {
    setSearchParams({ tab });
  };

  const handleLoadMore = () => {
    const nextOffset = pageOffset + PAGE_SIZE;
    setPageOffset(nextOffset);
    loadFeed(activeTab, nextOffset, true);
  };

  const filteredItems = feedItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.story.toLowerCase().includes(q) ||
      item.location.city.toLowerCase().includes(q) ||
      item.location.state.toLowerCase().includes(q) ||
      item.author.full_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar (Desktop Navigation & Contributor Card) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24">
          {/* User Profile Mini Card */}
          {user && profile ? (
            <Card className="border border-border bg-white rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <UserAvatar src={profile.avatar_url} name={profile.full_name} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-black truncate">
                    {profile.full_name}
                  </h3>
                  <p className="text-xs text-charcoal-muted capitalize">
                    {profile.role?.replace('_', ' ') || 'Contributor'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-between text-xs text-charcoal-dark font-semibold">
                <Link to="/dashboard/memories" className="hover:text-[#0B6B3A] transition-colors">
                  My Pins
                </Link>
                <Link to="/dashboard/saved" className="hover:text-[#0B6B3A] transition-colors">
                  Saved
                </Link>
                <Link to="/messages" className="hover:text-[#0B6B3A] transition-colors">
                  Messages
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="border border-border bg-emerald-50/50 rounded-2xl p-5 space-y-3 text-center">
              <h4 className="text-sm font-bold text-black">
                Join the Movement
              </h4>
              <p className="text-xs text-charcoal-dark leading-relaxed">
                Log in to like memories, follow contributors, reply to discussions, and preserve Nigeria's history.
              </p>
              <Link to="/explore">
                <Button variant="primary" size="sm" className="w-full bg-[#0B6B3A] font-semibold text-xs">
                  Explore Interactive Map
                </Button>
              </Link>
            </Card>
          )}

          {/* Quick Community Navigation */}
          <Card className="border border-border bg-white rounded-2xl p-4 shadow-xs">
            <h4 className="text-xs font-semibold text-charcoal-muted px-3 mb-2">
              Feed Discovery
            </h4>
            <nav className="space-y-1 text-xs font-medium">
              <button
                onClick={() => handleTabChange('for_you')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                  activeTab === 'for_you'
                    ? 'bg-[#E8F5EE] text-[#0B6B3A] font-semibold'
                    : 'text-charcoal-dark hover:bg-gray-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>For You</span>
              </button>

              <button
                onClick={() => handleTabChange('recent')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                  activeTab === 'recent'
                    ? 'bg-[#E8F5EE] text-[#0B6B3A] font-semibold'
                    : 'text-charcoal-dark hover:bg-gray-50'
                }`}
              >
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Recent Stories</span>
              </button>

              <button
                onClick={() => handleTabChange('popular')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                  activeTab === 'popular'
                    ? 'bg-[#E8F5EE] text-[#0B6B3A] font-bold'
                    : 'text-charcoal-dark hover:bg-gray-50'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Trending & Popular</span>
              </button>

              <button
                onClick={() => handleTabChange('following')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                  activeTab === 'following'
                    ? 'bg-[#E8F5EE] text-[#0B6B3A] font-bold'
                    : 'text-charcoal-dark hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4 text-purple-600" />
                <span>Following</span>
              </button>
            </nav>
          </Card>

          {/* Add Memory CTA */}
          <Link to="/add-memory" className="block">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<PlusCircle className="w-5 h-5" />}
              className="w-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-2xl shadow-sm text-sm justify-center"
            >
              Pin a New Memory
            </Button>
          </Link>
        </aside>

        {/* Center Column (Main Community Feed) */}
        <main className="lg:col-span-6 space-y-6">
          {/* Header Banner & Mobile Tabs */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight flex items-center gap-2">
                  <span>NaijaPins Community</span>
                </h1>
                <p className="text-xs sm:text-sm text-charcoal-muted">
                  Discover, engage, and connect with heritage stories across Nigeria.
                </p>
              </div>

              <Link to="/add-memory" className="sm:hidden">
                <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />} className="w-full bg-[#0B6B3A] font-semibold">
                  Add Memory
                </Button>
              </Link>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
              <input
                type="text"
                placeholder="Search stories, historic cities, or contributors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 shadow-2xs"
              />
            </div>

            {/* Mobile / Horizontal Tab Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border scrollbar-none">
              <button
                onClick={() => handleTabChange('for_you')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'for_you'
                    ? 'bg-[#0B6B3A] text-white shadow-xs'
                    : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200 font-medium'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>For You</span>
              </button>

              <button
                onClick={() => handleTabChange('recent')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'recent'
                    ? 'bg-[#0B6B3A] text-white shadow-xs'
                    : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200 font-medium'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Recent</span>
              </button>

              <button
                onClick={() => handleTabChange('popular')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'popular'
                    ? 'bg-[#0B6B3A] text-white shadow-xs'
                    : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200 font-medium'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Popular</span>
              </button>

              <button
                onClick={() => handleTabChange('following')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'following'
                    ? 'bg-[#0B6B3A] text-white shadow-xs'
                    : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200 font-medium'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Following</span>
              </button>
            </div>
          </div>

          {/* Quick Memory Composer for logged-in contributors */}
          {user && (
            <QuickMemoryComposer
              placeholder="What Nigerian story or historical memory would you like to pin today?"
              onPostSuccess={() => {
                setPageOffset(0);
                loadFeed(activeTab, 0, false);
              }}
            />
          )}

          {/* Feed Content List */}
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="p-10 text-center border border-dashed border-border rounded-2xl space-y-3 bg-white">
              <Compass className="w-10 h-10 text-[#0B6B3A] mx-auto opacity-80" />
              <div className="space-y-1">
                <h3 className="text-base font-heading font-bold text-black">
                  {activeTab === 'following'
                    ? 'No memories from followed contributors yet'
                    : 'No heritage stories found'}
                </h3>
                <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                  {activeTab === 'following'
                    ? 'Follow contributors to see their pinned heritage stories in this feed.'
                    : 'Try changing your search terms or pin a new memory to kickstart this category.'}
                </p>
              </div>
              <Link to="/explore">
                <Button variant="outline" size="sm" className="mt-2 text-xs font-semibold">
                  Browse Interactive Map
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredItems.map((item) => (
                <MemoryCard key={`${item.id}-${item.reposted_by?.user_id || 'orig'}`} memory={item} />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="rounded-full px-6 text-xs font-bold border-border hover:bg-gray-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading more stories...</span>
                      </span>
                    ) : (
                      'Load More Stories'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Sidebar (Trending Cities & Suggested Contributors) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24">
          {/* Trending Locations */}
          <Card className="border border-border bg-white rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-muted">
              <TrendingUp className="w-4 h-4 text-[#0B6B3A]" />
              <span>Trending Heritage Cities</span>
            </div>

            <div className="space-y-2 text-xs">
              {POPULAR_LOCATIONS.map((loc) => (
                <Link
                  key={loc.city}
                  to={`/explore?city=${encodeURIComponent(loc.city)}`}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-black group-hover:text-[#0B6B3A] transition-colors">
                      {loc.city}
                    </span>
                    <span className="text-charcoal-muted text-[11px]">{loc.state}</span>
                  </div>
                  <span className="text-[11px] text-charcoal-muted font-normal bg-gray-100 px-2 py-0.5 rounded-full">
                    {loc.count} pins
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Interactive Map Teaser Card */}
          <Card className="border border-border bg-[#E8F5EE]/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0B6B3A]">
              <MapPin className="w-4 h-4" />
              <span>Interactive Memory Map</span>
            </div>
            <p className="text-xs text-charcoal-dark leading-relaxed">
              Experience Nigerian history pinned geographically across all 36 states and the FCT with timeline filters.
            </p>
            <Link to="/explore">
              <Button variant="primary" size="sm" className="w-full bg-[#0B6B3A] text-xs font-semibold rounded-xl">
                Open Full Map
              </Button>
            </Link>
          </Card>
        </aside>

      </div>
    </div>
  );
};
