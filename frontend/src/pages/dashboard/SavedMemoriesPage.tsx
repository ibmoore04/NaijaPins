import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Memory } from '@/types/database';
import { savedMemoriesService } from '@/services/savedMemories.service';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Bookmark, MapPin, Eye, BookmarkX, Search } from 'lucide-react';

export const SavedMemoriesPage: React.FC = () => {
  const { user } = useAuth();
  const [savedMemories, setSavedMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSaved = async () => {
      if (!user) return;
      setLoading(true);
      const data = await savedMemoriesService.getSavedMemories(user.id);
      setSavedMemories(data);
      setLoading(false);
    };

    loadSaved();
  }, [user]);

  const handleUnsave = async (memoryId: string) => {
    if (!user) return;
    const success = await savedMemoriesService.unsaveMemory(user.id, memoryId);
    if (success) {
      setSavedMemories((prev) => prev.filter((m) => m.id !== memoryId));
    }
  };

  // Derive unique categories from saved memories
  const categories = React.useMemo(() => {
    const map = new Map<string, string>();
    savedMemories.forEach((m) => {
      if (m.category?.name) {
        map.set(m.category.id, m.category.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [savedMemories]);

  // Filtered saved memories
  const filteredMemories = React.useMemo(() => {
    return savedMemories.filter((m) => {
      const matchesCategory =
        selectedCategory === 'all' || m.category_id === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.story.toLowerCase().includes(q) ||
        (m.location?.city && m.location.city.toLowerCase().includes(q)) ||
        (m.location?.state && m.location.state.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [savedMemories, selectedCategory, searchQuery]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Saved Memories</h1>
          <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
            Your personal collection of bookmarked heritage stories from across Nigeria.
          </p>
        </div>
        <Link to="/explore">
          <Button variant="outline" size="sm" className="font-semibold">
            Explore More Pins
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      {savedMemories.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
            <input
              type="text"
              placeholder="Search saved memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-border rounded-xl focus:outline-none focus:border-[#0B6B3A]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#0B6B3A] text-white'
                  : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200'
              }`}
            >
              All ({savedMemories.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#0B6B3A] text-white'
                    : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredMemories.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={savedMemories.length === 0 ? 'Nothing saved yet' : 'No matching memories'}
          description={
            savedMemories.length === 0
              ? 'Bookmark stories on the map or memory detail pages to read them here anytime.'
              : 'Try clearing your search query or switching category filters.'
          }
          actionText={savedMemories.length === 0 ? 'Explore Memories' : 'Clear Filters'}
          onAction={() => {
            if (savedMemories.length === 0) {
              window.location.href = '/explore';
            } else {
              setSearchQuery('');
              setSelectedCategory('all');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMemories.map((mem) => (
            <Card key={mem.id} className="p-5 border border-border bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5EE] text-[#0B6B3A] text-xs font-semibold">
                    {mem.category?.name || 'Heritage'}
                  </span>
                  <span className="text-xs font-semibold text-black">{mem.year} Era</span>
                </div>

                <h3 className="text-base font-semibold text-black line-clamp-1">
                  <Link to={`/memory/${mem.slug}`} className="hover:text-primary transition-colors">
                    {mem.title}
                  </Link>
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{mem.location?.city}, {mem.location?.state}</span>
                </div>

                <p className="text-xs text-charcoal-dark line-clamp-2 leading-relaxed">
                  {mem.story}
                </p>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-charcoal-muted flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {mem.view_count || 0} views
                  </span>
                  <div className="flex items-center gap-2">
                    <Link to={`/memory/${mem.slug}`}>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">
                        Read Story
                      </Button>
                    </Link>
                    <button
                      onClick={() => handleUnsave(mem.id)}
                      className="p-1 rounded-md text-charcoal-muted hover:text-red-600 hover:bg-red-50"
                      title="Remove from saved"
                    >
                      <BookmarkX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
