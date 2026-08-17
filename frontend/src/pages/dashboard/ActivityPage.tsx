import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Memory } from '@/types/database';
import { memoriesService } from '@/services/memories.service';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { Activity, CheckCircle2, Clock, UserCheck } from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [userMemories, setUserMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      if (!user) return;
      setLoading(true);
      const data = await memoriesService.getUserMemories(user.id);
      setUserMemories(data);
      setLoading(false);
    };

    loadActivity();
  }, [user]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Recent Activity</h1>
        <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
          Your personal contribution activity timeline on NaijaPins.
        </p>
      </div>

      {userMemories.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity recorded yet"
          description="Your contributions, memory submissions, and status updates will appear here."
          actionText="Pin Your First Memory"
          onAction={() => (window.location.href = '/add-memory')}
        />
      ) : (
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {/* Joined Platform Activity */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-[#E8F5EE] text-[#0B6B3A] border-2 border-white flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-black">Account Profile Created</p>
                <p className="text-xs text-charcoal-muted">
                  Joined as {profile?.full_name || user?.email}
                </p>
              </div>
            </div>

            {/* User Memory Activities */}
            {userMemories.map((mem) => (
              <div key={mem.id} className="relative">
                <div
                  className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                    mem.status === 'published'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {mem.status === 'published' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black">{mem.title}</span>
                    <span className="text-[11px] font-semibold text-charcoal-muted">
                      {new Date(mem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-dark">
                    Submitted memory for <span className="font-semibold">{mem.location?.city}, {mem.location?.state}</span> ({mem.year} Era).
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-border capitalize text-charcoal-dark">
                    Status: {mem.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
