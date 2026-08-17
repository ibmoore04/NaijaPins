import React, { useState, useEffect } from 'react';
import { adminMembershipsService, AdminMembershipListItem } from '@/services/adminMemberships.service';
import { Plan } from '@/types/membership';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Card } from '@/components/ui/Card';
import { Crown } from 'lucide-react';

export const AdminMembershipsPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [memberships, setMemberships] = useState<AdminMembershipListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [plansData, membershipsData] = await Promise.all([
        adminMembershipsService.getPlans(),
        adminMembershipsService.getMemberships({ page, limit: 15 }),
      ]);

      setPlans(plansData);
      setMemberships(membershipsData.memberships);
      setTotalPages(membershipsData.totalPages);
      setTotalCount(membershipsData.totalCount);
      setLoading(false);
    };

    loadData();
  }, [page]);

  const columns: Column<AdminMembershipListItem>[] = [
    {
      header: 'Subscriber User',
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar src={m.user_profile?.avatar_url} name={m.user_profile?.full_name || 'Subscriber'} size="sm" />
          <div>
            <p className="font-bold text-black text-xs">{m.user_profile?.full_name || 'Subscriber'}</p>
            <p className="text-[10px] text-charcoal-muted capitalize">{m.user_profile?.role || 'User'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Plan Tier',
      render: (m) => (
        <span className="font-bold text-xs text-black">
          {m.plan?.name || (m.is_actually_premium ? 'Premium' : 'Free Tier')}
        </span>
      ),
    },
    {
      header: 'Calculated Premium Status',
      render: (m) => <AdminStatusBadge type="membership" value={m.is_actually_premium || false} />,
    },
    {
      header: 'Billing Interval',
      render: (m) => (
        <span className="capitalize text-xs text-charcoal-dark font-medium">
          {m.plan?.billing_interval || 'Standard'}
        </span>
      ),
    },
    {
      header: 'Period End',
      render: (m) => (
        <span className="text-[11px] text-charcoal-muted">
          {m.current_period_end
            ? new Date(m.current_period_end).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Permanent / Free'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <AdminPageHeader
        title="Membership & Subscriptions"
        description="Monitor revenue subscriptions, plan configurations, and verify premium tier entitlements."
      />

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Card key={p.id} className="p-5 border border-border/80 bg-white rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-muted">
                {p.name}
              </span>
              <Crown className={`w-4 h-4 ${p.slug !== 'free' ? 'text-amber-500' : 'text-gray-400'}`} />
            </div>

            <div>
              <p className="text-2xl font-bold text-black tracking-tight">
                ₦{Number(p.price).toLocaleString()}
                <span className="text-xs font-normal text-charcoal-muted">/{p.billing_interval}</span>
              </p>
              <p className="text-xs text-charcoal-muted line-clamp-2 mt-1">
                {p.description || 'Access to platform heritage features'}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-charcoal-muted">
              <span>Code: {p.paystack_plan_code || 'N/A'}</span>
              <span className="font-semibold text-emerald-700">Active</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Subscriber Records Table */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-black">
          Membership Subscribers Records
        </h2>

        <AdminDataTable
          columns={columns}
          data={memberships}
          loading={loading}
          emptyMessage="No subscription records found."
          keyExtractor={(m) => m.id}
          pagination={{
            currentPage: page,
            totalPages,
            totalCount,
            onPageChange: (p) => setPage(p),
          }}
        />
      </div>
    </div>
  );
};
