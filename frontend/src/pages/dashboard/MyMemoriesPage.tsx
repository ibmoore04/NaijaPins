import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Memory, MemoryStatus } from '@/types/database';
import { memoriesService } from '@/services/memories.service';
import { MemoryStatusBadge } from '@/components/dashboard/MemoryStatusBadge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { QuickMemoryComposer } from '@/components/composer/QuickMemoryComposer';
import {
  BookOpen,
  Search,
  MapPin,
  Eye,
  Trash2,
  Globe,
  Lock,
  Loader2,
  Share2,
  EyeOff,
} from 'lucide-react';

export const MyMemoriesPage: React.FC = () => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<MemoryStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingCommunityId, setTogglingCommunityId] = useState<string | null>(null);

  useEffect(() => {
    const loadMemories = async () => {
      if (!user) return;
      setLoading(true);
      const data = await memoriesService.getUserMemories(user.id, {
        status: selectedStatus,
        searchQuery,
      });
      setMemories(data);
      setLoading(false);
    };

    loadMemories();
  }, [user, selectedStatus, searchQuery]);

  const handleDelete = async (memoryId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this memory pin?')) return;
    const success = await memoriesService.softDeleteMemory(user.id, memoryId);
    if (success) {
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    }
  };

  const handleToggleCommunity = async (memoryId: string, currentlyPosted: boolean) => {
    if (!user) return;

    const actionText = currentlyPosted ? 'remove this memory from the Community feed' : 'post this memory to the NaijaPins Community feed';
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) {
      return;
    }

    setTogglingCommunityId(memoryId);
    const newPostedState = !currentlyPosted;

    const result = await memoriesService.setCommunityPosted(memoryId, newPostedState, user.id);
    if (result.success) {
      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, community_posted: newPostedState } : m))
      );
    } else {
      alert(result.error || 'Failed to update community posting.');
    }
    setTogglingCommunityId(null);
  };

  const statusTabs: { label: string; value: MemoryStatus | 'ALL' }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Published', value: 'published' },
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'Drafts', value: 'draft' },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">My Memories</h1>
          <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
            Manage your submitted heritage stories, moderation status, and community feed visibility.
          </p>
        </div>
      </div>

      {/* Quick Memory Composer */}
      <QuickMemoryComposer
        placeholder="Pin another memory to your archive or community..."
        onPostSuccess={() => {
          if (user) {
            memoriesService.getUserMemories(user.id, {
              status: selectedStatus,
              searchQuery,
            }).then(setMemories);
          }
        }}
      />

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                selectedStatus === tab.value
                  ? 'bg-[#0B6B3A] text-white shadow-xs'
                  : 'bg-white border border-border text-charcoal-dark hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search my stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/40 bg-white"
          />
        </div>
      </div>

      {/* Memories Grid */}
      {memories.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No memories found"
          description={
            searchQuery
              ? `No memories match "${searchQuery}". Try a different search term.`
              : 'You have no memories in this category.'
          }
          actionText="Pin a New Memory"
          onAction={() => (window.location.href = '/add-memory')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem) => {
            const isCommunityPosted = mem.community_posted === true;

            return (
              <Card key={mem.id} className="p-5 border border-border bg-white rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MemoryStatusBadge status={mem.status} />
                      {isCommunityPosted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                          <Globe className="w-3 h-3" /> In Community
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-charcoal-muted bg-gray-100 px-2 py-0.5 rounded-full font-medium border border-border">
                          <Lock className="w-3 h-3" /> Private Archive
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-black">{mem.year} Era</span>
                  </div>

                  <h3 className="text-base font-semibold text-black line-clamp-1">
                    <Link to={`/memory/${mem.slug}`} className="hover:text-[#0B6B3A] transition-colors">
                      {mem.title}
                    </Link>
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      {mem.location?.city}, {mem.location?.state}
                    </span>
                  </div>

                  <p className="text-xs text-charcoal-dark line-clamp-2 leading-relaxed">
                    {mem.story}
                  </p>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-charcoal-muted flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {mem.view_count || 0} views
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Community Post / Remove Action */}
                      <Button
                        variant={isCommunityPosted ? 'outline' : 'primary'}
                        size="sm"
                        disabled={togglingCommunityId === mem.id}
                        onClick={() => handleToggleCommunity(mem.id, isCommunityPosted)}
                        leftIcon={
                          togglingCommunityId === mem.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isCommunityPosted ? (
                            <EyeOff className="w-3.5 h-3.5 text-charcoal-muted" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )
                        }
                        className={`h-7 text-[11px] px-2.5 rounded-lg ${
                          !isCommunityPosted
                            ? 'bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold'
                            : 'text-charcoal-dark hover:bg-gray-50'
                        }`}
                      >
                        {togglingCommunityId === mem.id
                          ? 'Updating...'
                          : isCommunityPosted
                          ? 'Remove from Community'
                          : 'Post to Community'}
                      </Button>

                      <Link to={`/memory/${mem.slug}`}>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5 rounded-lg">
                          View
                        </Button>
                      </Link>

                      <button
                        onClick={() => handleDelete(mem.id)}
                        className="p-1 rounded-md text-red-600 hover:bg-red-50"
                        title="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
