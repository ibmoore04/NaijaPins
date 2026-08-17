import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/admin.service';
import { adminReportsService } from '@/services/adminReports.service';
import { adminMemoriesService } from '@/services/adminMemories.service';
import { AdminOverviewStats, ContentReport, Memory, AdminAuditLog } from '@/types/database';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Crown,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [pendingMemories, setPendingMemories] = useState<Memory[]>([]);
  const [recentReports, setRecentReports] = useState<ContentReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      setLoading(true);
      try {
        const [statsData, memoriesData, reportsData, logsData] = await Promise.all([
          adminService.getOverviewStats(),
          adminMemoriesService.getMemories({ status: 'pending_review', limit: 5 }),
          adminReportsService.getReports({ status: 'pending', limit: 5 }),
          adminService.getAuditLogs(6),
        ]);

        setStats(statsData);
        setPendingMemories(memoriesData.memories);
        setRecentReports(reportsData.reports);
        setAuditLogs(logsData);
      } catch (err) {
        console.error('Error loading admin overview:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <AdminPageHeader
        title="Platform Overview"
        description="Real-time metrics, moderation activity, and community system health."
        actions={
          <Link to="/admin/moderation">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ShieldCheck className="w-4 h-4" />}
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl"
            >
              Open Moderation Queue
            </Button>
          </Link>
        }
      />

      {/* Top KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard
          title="Total Users"
          value={stats?.total_users ?? 0}
          subtitle={`${stats?.new_users_week ?? 0} new this week`}
          icon={Users}
          colorClass="text-blue-700"
          bgClass="bg-blue-50"
          loading={loading}
        />
        <AdminStatCard
          title="Total Memories"
          value={stats?.total_memories ?? 0}
          subtitle={`${stats?.memories_week ?? 0} pinned this week`}
          icon={BookOpen}
          colorClass="text-[#0B6B3A]"
          bgClass="bg-[#E8F5EE]"
          loading={loading}
        />
        <AdminStatCard
          title="Pending Review"
          value={stats?.pending_memories ?? 0}
          subtitle="Requires moderator review"
          icon={Clock}
          colorClass="text-amber-700"
          bgClass="bg-amber-50"
          loading={loading}
        />
        <AdminStatCard
          title="Open Reports"
          value={stats?.open_reports ?? 0}
          subtitle="Community flags"
          icon={AlertTriangle}
          colorClass="text-red-700"
          bgClass="bg-red-50"
          loading={loading}
        />
      </div>

      {/* Secondary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard
          title="Published Pins"
          value={stats?.published_memories ?? 0}
          icon={CheckCircle2}
          colorClass="text-emerald-700"
          bgClass="bg-emerald-50"
          loading={loading}
        />
        <AdminStatCard
          title="Active Paid Members"
          value={stats?.premium_members ?? 0}
          icon={Crown}
          colorClass="text-amber-800"
          bgClass="bg-amber-100"
          loading={loading}
        />
        <AdminStatCard
          title="Community Likes"
          value={stats?.total_likes ?? 0}
          icon={TrendingUp}
          colorClass="text-rose-700"
          bgClass="bg-rose-50"
          loading={loading}
        />
        <AdminStatCard
          title="Discussion Comments"
          value={stats?.total_comments ?? 0}
          icon={Activity}
          colorClass="text-indigo-700"
          bgClass="bg-indigo-50"
          loading={loading}
        />
      </div>

      {/* Main Dual Queues (Pending Moderation & Reports) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Moderation Queue */}
        <Card className="border border-border/80 bg-white rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-black">
                Pending Moderation Queue ({pendingMemories.length})
              </h2>
            </div>
            <Link
              to="/admin/moderation"
              className="text-xs font-semibold text-[#0B6B3A] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <CardContent className="p-0 divide-y divide-border/60">
            {pendingMemories.length === 0 ? (
              <p className="p-8 text-center text-xs text-charcoal-muted font-normal">
                No pending memories. Moderation queue is clear!
              </p>
            ) : (
              pendingMemories.map((m) => (
                <div
                  key={m.id}
                  className="p-4 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-black truncate">{m.title}</p>
                    <div className="flex items-center gap-2 text-xs text-charcoal-muted">
                      <span>By {m.profile?.full_name || 'Contributor'}</span>
                      <span>•</span>
                      <span>{m.location?.city || 'Nigeria'}</span>
                      <span>•</span>
                      <AdminStatusBadge type="community" value={m.community_posted || false} size="sm" />
                    </div>
                  </div>

                  <Link to="/admin/moderation">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs py-1 px-3 font-semibold">
                      Review
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Open Reports Queue */}
        <Card className="border border-border/80 bg-white rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h2 className="text-sm font-bold text-black">
                Open Community Reports ({recentReports.length})
              </h2>
            </div>
            <Link
              to="/admin/reports"
              className="text-xs font-semibold text-[#0B6B3A] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <CardContent className="p-0 divide-y divide-border/60">
            {recentReports.length === 0 ? (
              <p className="p-8 text-center text-xs text-charcoal-muted font-normal">
                No active community reports. Everything is running smoothly!
              </p>
            ) : (
              recentReports.map((r) => (
                <div
                  key={r.id}
                  className="p-4 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <AdminStatusBadge type="report" value={r.status} size="sm" />
                      <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                        {r.reason}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-dark truncate">
                      {r.details || 'Flagged memory content'}
                    </p>
                  </div>

                  <Link to="/admin/reports">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs py-1 px-3 font-semibold">
                      Investigate
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Admin Audit Activity */}
      {auditLogs.length > 0 && (
        <Card className="border border-border/80 bg-white rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-black">
              Recent Administrative Actions
            </h2>
            <Link to="/admin/settings" className="text-xs font-semibold text-[#0B6B3A] hover:underline">
              View Audit Log
            </Link>
          </div>

          <CardContent className="p-0 divide-y divide-border/60">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 text-xs flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black">
                      {log.admin?.full_name || 'Administrator'}
                    </span>
                    <span className="text-charcoal-muted">executed</span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 font-mono text-[11px] text-charcoal-dark">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-muted">
                    Target: {log.target_type} ({log.target_id || 'general'})
                  </p>
                </div>

                <span className="text-[11px] text-charcoal-muted shrink-0">
                  {new Date(log.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
