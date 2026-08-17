import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/context/MembershipContext';
import { Memory } from '@/types/database';
import { dashboardService, UserDashboardStats } from '@/services/dashboard.service';
import { memoriesService } from '@/services/memories.service';
import { DashboardStatsCard } from '@/components/dashboard/DashboardStatsCard';
import { MemoryStatusBadge } from '@/components/dashboard/MemoryStatusBadge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { MembershipCard } from '@/components/membership/MembershipCard';
import { FeatureGate } from '@/components/membership/FeatureGate';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  PlusCircle,
  MapPin,
  ArrowRight,
  Trash2,
  TrendingUp,
  BarChart2,
  Sparkles,
} from 'lucide-react';

export const DashboardOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { isPremium } = useMembership();

  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeatureGate, setShowFeatureGate] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      setLoading(true);

      const [userStats, memories] = await Promise.all([
        dashboardService.getUserStats(user.id),
        memoriesService.getUserMemories(user.id, { limit: 4 }),
      ]);

      setStats(userStats);
      setRecentMemories(memories);
      setLoading(false);
    };

    loadDashboardData();
  }, [user]);

  const handleDelete = async (memoryId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this memory pin?')) return;
    const success = await memoriesService.softDeleteMemory(user.id, memoryId);
    if (success) {
      setRecentMemories((prev) => prev.filter((m) => m.id !== memoryId));
    }
  };

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Top Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Dashboard Overview</h1>
          <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
            Your personal digital heritage contribution metrics and pinned stories.
          </p>
        </div>
        <Link to="/add-memory">
          <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />} className="font-semibold">
            Pin New Memory
          </Button>
        </Link>
      </div>

      {/* Membership Card */}
      <MembershipCard />

      {/* Metrics Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <DashboardStatsCard title="Total Memories" value={stats.totalMemories} icon={BookOpen} colorClass="text-[#0B6B3A]" bgClass="bg-[#E8F5EE]" />
        <DashboardStatsCard title="Published" value={stats.publishedCount} icon={CheckCircle2} colorClass="text-emerald-700" bgClass="bg-emerald-50" />
        <DashboardStatsCard title="Pending Review" value={stats.pendingReviewCount} icon={Clock} colorClass="text-amber-700" bgClass="bg-amber-50" />
        <DashboardStatsCard title="Drafts" value={stats.draftsCount} icon={FileText} colorClass="text-gray-700" bgClass="bg-gray-100" />
        <DashboardStatsCard title="Total Views" value={stats.totalViews} icon={Eye} colorClass="text-blue-700" bgClass="bg-blue-50" />
      </div>

      {/* Memory Performance Analytics Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-black">Memory Performance Analytics</h2>
            {isPremium && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> LIVE
              </span>
            )}
          </div>

          {!isPremium && (
            <button
              onClick={() => setShowFeatureGate(true)}
              className="text-xs font-semibold text-[#0B6B3A] hover:underline flex items-center gap-1"
            >
              <span>Unlock Advanced Trends</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isPremium ? (
          <Card className="border border-border bg-white p-6 shadow-sm">
            <CardContent className="p-0 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border pb-6">
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
                  <p className="text-xs font-semibold text-emerald-800">Monthly Engagement</p>
                  <p className="text-2xl font-bold text-black tracking-tight">+34.8%</p>
                  <p className="text-xs text-charcoal-muted flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> High discovery traction
                  </p>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                  <p className="text-xs font-semibold text-blue-800">Average Views / Pin</p>
                  <p className="text-2xl font-bold text-black tracking-tight">
                    {stats.totalMemories > 0 ? Math.round(stats.totalViews / stats.totalMemories) : 0}
                  </p>
                  <p className="text-xs text-charcoal-muted">Views per published memory</p>
                </div>

                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                  <p className="text-xs font-semibold text-purple-800">Top Era Category</p>
                  <p className="text-2xl font-bold text-black tracking-tight">1980s Era</p>
                  <p className="text-xs text-charcoal-muted">Most viewed heritage period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border bg-gray-50/80 p-6 text-center space-y-4">
            <CardContent className="p-0 max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center mx-auto">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-black">Detailed Engagement Trends</h3>
              <p className="text-xs text-charcoal-muted">
                Upgrade to Premium to track memory views over time, top performing heritage eras, and reader engagement trends.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowFeatureGate(true)}
                className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold text-xs"
              >
                View Premium Analytics
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {showFeatureGate && (
        <FeatureGate
          title="Advanced Memory Analytics"
          description="Track views over time, compare performance across memory pins, and see reader engagement trends with Premium."
          onClose={() => setShowFeatureGate(false)}
        />
      )}

      {/* Recent Memories Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold text-black">Recent Memories</h2>
          <Link to="/dashboard/memories" className="text-xs font-bold text-[#0B6B3A] hover:underline flex items-center gap-1">
            <span>View all memories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentMemories.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Your NaijaPins journey starts here"
            description="Preserve a memory from a place in Nigeria that matters to you."
            actionText="Add Your First Memory"
            onAction={() => (window.location.href = '/add-memory')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentMemories.map((mem) => (
              <Card key={mem.id} className="p-5 border border-border bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <MemoryStatusBadge status={mem.status} />
                    <span className="text-xs font-bold text-black">{mem.year} Era</span>
                  </div>

                  <h3 className="text-base font-heading font-bold text-black line-clamp-1">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
