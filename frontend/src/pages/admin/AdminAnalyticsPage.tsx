import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/admin.service';
import { AdminAnalyticsData } from '@/types/database';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { MapPin, FolderTree, Activity, Calendar, Loader2 } from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAnalytics().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#0B6B3A] animate-spin" />
        <p className="text-xs font-bold text-charcoal-muted">Computing platform analytics...</p>
      </div>
    );
  }

  const maxStateCount = Math.max(...(data?.states.map((s) => s.count) || [1]), 1);
  const maxCatCount = Math.max(...(data?.categories.map((c) => c.count) || [1]), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      <AdminPageHeader
        title="Platform & Geographic Analytics"
        description="Deep-dive distribution of Nigerian digital memory preservation, state representation, and category engagement."
      />

      {/* Dual Column Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nigerian States Geographic Representation */}
        <Card className="border border-border/80 bg-white rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0B6B3A]" />
              <h2 className="text-sm font-bold text-black">
                Top Represented Nigerian States
              </h2>
            </div>
            <span className="text-xs font-semibold text-charcoal-muted">Memory Pins</span>
          </div>

          <CardContent className="p-5 space-y-4">
            {data?.states && data.states.length > 0 ? (
              data.states.map((st) => {
                const pct = Math.round((st.count / maxStateCount) * 100);
                return (
                  <div key={st.state} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-black">{st.state}</span>
                      <span className="text-charcoal-dark font-mono">{st.count} pins</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0B6B3A] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-charcoal-muted text-center py-6">No geographic records yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Categories Distribution */}
        <Card className="border border-border/80 bg-white rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-black">
                Heritage Categories Breakdown
              </h2>
            </div>
            <span className="text-xs font-semibold text-charcoal-muted">Distribution</span>
          </div>

          <CardContent className="p-5 space-y-4">
            {data?.categories && data.categories.length > 0 ? (
              data.categories.map((cat) => {
                const pct = Math.round((cat.count / maxCatCount) * 100);
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-black">{cat.name}</span>
                      <span className="text-charcoal-dark font-mono">{cat.count} stories</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-charcoal-muted text-center py-6">No category data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Moderation Status Distribution & Monthly Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card className="border border-border/80 bg-white rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/80 pb-3">
            <Activity className="w-4 h-4 text-charcoal-muted" />
            <h2 className="text-sm font-heading font-extrabold text-black uppercase tracking-wider">
              Memory Lifecycle Status
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data?.status_distribution.map((st) => (
              <div key={st.status} className="p-3.5 rounded-xl border border-border bg-gray-50/60 text-center space-y-1">
                <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">
                  {st.status.replace('_', ' ')}
                </p>
                <p className="text-xl font-heading font-extrabold text-black">{st.count}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Pins Growth */}
        <Card className="border border-border/80 bg-white rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/80 pb-3">
            <Calendar className="w-4 h-4 text-charcoal-muted" />
            <h2 className="text-sm font-heading font-extrabold text-black uppercase tracking-wider">
              Recent Monthly Story Pins
            </h2>
          </div>

          <div className="space-y-3">
            {data?.monthly_growth && data.monthly_growth.length > 0 ? (
              data.monthly_growth.map((g) => (
                <div key={g.month_label} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50">
                  <span className="font-bold text-black">{g.month_label}</span>
                  <span className="font-mono text-[#0B6B3A] font-extrabold">+{g.memories_count} pins</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-charcoal-muted text-center py-4">No monthly timeline records available.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
