import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { MemoryCard } from '@/components/social/MemoryCard';
import { QuickMemoryComposer } from '@/components/composer/QuickMemoryComposer';
import {
  Home,
  Compass,
  Users,
  MessageSquare,
  Bell,
  Bookmark,
  Calendar,
  Wrench,
  Settings,
  Plus,
  Image,
  Video,
  Mic,
  Smile,
  Loader2,
} from 'lucide-react';
import { CommunityFeedItem, FeedTab } from '@/types/social';
import { socialFeedService } from '@/services/socialFeed.service';
import { useAuth } from '@/hooks/useAuth';

const CATEGORY_PILLS = [
  { id: 'for_you', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'recent', label: 'Questions' },
  { id: 'popular', label: 'Tips' },
  { id: 'events', label: 'Events' },
  { id: 'following', label: 'Announcements' },
];

const TRENDING_TOPICS = [
  { tag: 'NaijaCreators', count: '2.4K posts' },
  { tag: 'Entrepreneurship', count: '1.8K posts' },
  { tag: 'SocialMediaTips', count: '950 posts' },
  { tag: 'MadeInNigeria', count: '3.1K posts' },
  { tag: 'LagosHeritage', count: '1.2K posts' },
];

const UPCOMING_EVENTS = [
  {
    id: 'creator-hangout',
    title: 'Creator Hangout',
    location: 'Lagos, Nigeria',
    date: 'Aug 30, 2025 • 4:00 PM',
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'content-strategy-101',
    title: 'Content Strategy 101',
    location: 'Online Event',
    date: 'Sep 5, 2025 • 7:00 PM',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'naijapins-workshop',
    title: 'NaijaPins Workshop',
    location: 'Abuja, Nigeria',
    date: 'Sep 12, 2025 • 2:00 PM',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=200&q=80',
  },
];

export const CommunityPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as FeedTab) || 'for_you';

  const [feedItems, setFeedItems] = useState<CommunityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchQuery = searchParams.get('q') || searchParams.get('tag') || '';
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

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
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in font-body">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* 1. LEFT COLUMN: Main Social Navigation & Trending Topics                  */}
        {/* ========================================================================= */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-20">
          {/* Primary Navigation Menu */}
          <nav className="bg-white rounded-2xl border border-gray-100 p-2 shadow-2xs space-y-0.5 text-[13px] font-semibold">
            <Link
              to="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Home className="w-4.5 h-4.5 text-gray-500" />
              <span>Home</span>
            </Link>

            <Link
              to="/explore"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Compass className="w-4.5 h-4.5 text-gray-500" />
              <span>Discover</span>
            </Link>

            <Link
              to="/community"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#E8F5EE] text-[#0B6B3A] font-bold transition-colors"
            >
              <Users className="w-4.5 h-4.5 text-[#0B6B3A]" />
              <span>Community</span>
            </Link>

            <Link
              to="/messages"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4.5 h-4.5 text-gray-500" />
                <span>Messages</span>
              </div>
            </Link>

            <Link
              to="/dashboard/notifications"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Bell className="w-4.5 h-4.5 text-gray-500" />
              <span>Notifications</span>
            </Link>

            <Link
              to="/dashboard/saved"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Bookmark className="w-4.5 h-4.5 text-gray-500" />
              <span>Bookmarks</span>
            </Link>

            <Link
              to="/explore?view=events"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Calendar className="w-4.5 h-4.5 text-gray-500" />
              <span>Events</span>
            </Link>

            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Wrench className="w-4.5 h-4.5 text-gray-500" />
              <span>Creator Tools</span>
            </Link>

            <Link
              to="/dashboard/settings"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Settings className="w-4.5 h-4.5 text-gray-500" />
              <span>Settings</span>
            </Link>
          </nav>

          {/* Trending Topics Widget */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-900 tracking-tight">
              Trending Topics
            </h3>

            <div className="space-y-2 text-xs">
              {TRENDING_TOPICS.map((topic) => (
                <Link
                  key={topic.tag}
                  to={`/community?tag=${topic.tag}`}
                  className="flex items-center justify-between py-1 text-gray-700 hover:text-[#0B6B3A] transition-colors group"
                >
                  <span className="font-semibold group-hover:underline">
                    # {topic.tag}
                  </span>
                  <span className="text-[11px] text-gray-400 font-normal">
                    {topic.count}
                  </span>
                </Link>
              ))}
            </div>

            <Link
              to="/explore?filter=popular"
              className="inline-block text-xs font-bold text-[#0B6B3A] hover:underline pt-1"
            >
              See more
            </Link>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 2. CENTER COLUMN: Community Feed & Quick Post Composer                    */}
        {/* ========================================================================= */}
        <main className="lg:col-span-6 space-y-4 sm:space-y-5">
          
          {/* Header Title Row */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                Community
              </h1>
              <p className="text-xs text-gray-500 font-normal">
                Connect, share and grow together
              </p>
            </div>

            <Link to="/add-memory">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl px-4 py-2 text-xs shadow-xs"
              >
                Create Post
              </Button>
            </Link>
          </div>

          {/* Category Filter Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_PILLS.map((pill) => {
              const isSelected = activeTab === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => handleTabChange(pill.id as FeedTab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#0B6B3A] text-white shadow-xs'
                      : 'bg-gray-100/90 text-gray-700 hover:bg-gray-200/90'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Quick Post Composer Box */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={profile?.avatar_url}
                name={profile?.full_name || 'User'}
                size="md"
              />
              <button
                type="button"
                onClick={() => setComposerOpen(!composerOpen)}
                className="flex-1 text-left px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs text-gray-500 font-normal border border-transparent transition-all"
              >
                Share your thoughts with the community...
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <div className="flex items-center gap-3 text-gray-400">
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="p-1.5 rounded-lg hover:text-[#0B6B3A] hover:bg-emerald-50 transition-colors"
                  title="Add Photo"
                >
                  <Image className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="p-1.5 rounded-lg hover:text-[#0B6B3A] hover:bg-emerald-50 transition-colors"
                  title="Add Video"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="p-1.5 rounded-lg hover:text-[#0B6B3A] hover:bg-emerald-50 transition-colors"
                  title="Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="p-1.5 rounded-lg hover:text-[#0B6B3A] hover:bg-emerald-50 transition-colors"
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setComposerOpen(true)}
                className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl px-5 h-8 text-xs shadow-xs"
              >
                Post
              </Button>
            </div>

            {/* Expandable Composer */}
            {composerOpen && (
              <div className="pt-3 border-t border-gray-100">
                <QuickMemoryComposer
                  placeholder="What Nigerian story or historical memory would you like to pin today?"
                  onPostSuccess={() => {
                    setComposerOpen(false);
                    setPageOffset(0);
                    loadFeed(activeTab, 0, false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Social Post Feed Stream */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-white border border-gray-100 rounded-2xl animate-pulse p-4" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-3 shadow-2xs">
              <Users className="w-10 h-10 text-[#0B6B3A] mx-auto opacity-75" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  {activeTab === 'following'
                    ? 'No posts from followed contributors yet'
                    : 'No community stories found'}
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {activeTab === 'following'
                    ? 'Follow contributors to see their stories and discussions here.'
                    : 'Be the first to share a heritage memory in this discussion category!'}
                </p>
              </div>
              <Link to="/add-memory">
                <Button variant="primary" size="sm" className="mt-2 text-xs font-bold rounded-xl bg-[#0B6B3A]">
                  Create First Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <MemoryCard key={`${item.id}-${item.reposted_by?.user_id || 'orig'}`} memory={item} />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="rounded-full px-6 text-xs font-bold border-gray-200 bg-white hover:bg-gray-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading more posts...</span>
                      </span>
                    ) : (
                      'Load More Posts'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* 3. RIGHT COLUMN: About Community, Upcoming Events & Guidelines            */}
        {/* ========================================================================= */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-20">
          
          {/* About Community Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-900 tracking-tight">
              About Community
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed font-normal">
              A place for creators, entrepreneurs and heritage storytellers to connect, share ideas and grow together.
            </p>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-50 text-center">
              <div>
                <div className="text-sm font-bold text-gray-950">12.5K</div>
                <div className="text-[10px] text-gray-400">Members</div>
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-600">320</div>
                <div className="text-[10px] text-gray-400">Online</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-950">1.2K</div>
                <div className="text-[10px] text-gray-400">Posts</div>
              </div>
            </div>

            <Link
              to="/explore"
              className="inline-block text-xs font-bold text-[#0B6B3A] hover:underline"
            >
              View members
            </Link>
          </div>

          {/* Upcoming Events Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 tracking-tight">
                Upcoming Events
              </h3>
              <Link to="/explore?view=events" className="text-[11px] font-bold text-[#0B6B3A] hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-2.5">
              {UPCOMING_EVENTS.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <img
                    src={evt.image}
                    alt={evt.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-gray-900 truncate leading-snug">
                      {evt.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">{evt.location}</p>
                    <p className="text-[10px] text-gray-400">{evt.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Community Guidelines Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs space-y-2.5">
            <h3 className="text-xs font-bold text-gray-900 tracking-tight">
              Community Guidelines
            </h3>
            <ul className="text-xs text-gray-600 space-y-1.5 font-normal">
              <li className="flex items-start gap-1.5">
                <span className="text-[#0B6B3A] font-bold">•</span>
                <span>Be respectful and kind</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#0B6B3A] font-bold">•</span>
                <span>No spam or self-promotion</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#0B6B3A] font-bold">•</span>
                <span>Share value and uplift others</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#0B6B3A] font-bold">•</span>
                <span>Report inappropriate content</span>
              </li>
            </ul>

            <Link
              to="/help"
              className="inline-block text-xs font-bold text-[#0B6B3A] hover:underline pt-1"
            >
              Read full guidelines
            </Link>
          </div>

        </aside>

      </div>
    </div>
  );
};
