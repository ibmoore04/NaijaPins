import React, { useState, useEffect } from 'react';
import { adminUsersService, AdminUserListItem } from '@/services/adminUsers.service';
import { adminService } from '@/services/admin.service';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/database';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilterBar, FilterConfig } from '@/components/admin/AdminFilterBar';
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  X,
  Loader2,
  Lock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminUsersPage: React.FC = () => {
  const { profile: currentAdmin } = useAuth();
  const isSuperAdmin = currentAdmin?.role === 'super_admin' || currentAdmin?.role === 'admin';

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // User detail drawer
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [userDetails, setUserDetails] = useState<{
    profile: any;
    memories: any[];
    membership: any;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Role change state
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<UserRole>('authenticated_user');
  const [roleUpdating, setRoleUpdating] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminUsersService.getUsers({
        page,
        limit: 15,
        search: searchQuery,
        role: roleFilter,
        planType: planFilter,
      });

      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, searchQuery, roleFilter, planFilter]);

  const handleOpenUserDrawer = async (user: AdminUserListItem) => {
    setSelectedUser(user);
    setSelectedRoleToAssign(user.role);
    setDetailsLoading(true);

    const details = await adminUsersService.getUserDetails(user.user_id);
    setUserDetails(details);
    setDetailsLoading(false);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !isSuperAdmin) return;
    setRoleUpdating(true);
    const res = await adminService.updateUserRole(selectedUser.user_id, selectedRoleToAssign);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.user_id === selectedUser.user_id ? { ...u, role: selectedRoleToAssign } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, role: selectedRoleToAssign } : null));
    } else {
      alert(res.error || 'Failed to update role');
    }
    setRoleUpdating(false);
  };

  const filterConfigs: FilterConfig[] = [
    {
      id: 'role',
      label: 'Role',
      value: roleFilter,
      options: [
        { label: 'All Roles', value: 'all' },
        { label: 'Super Admin', value: 'super_admin' },
        { label: 'Platform Admin', value: 'platform_admin' },
        { label: 'Moderator', value: 'moderator' },
        { label: 'Support Admin', value: 'support_admin' },
        { label: 'Regular User', value: 'authenticated_user' },
      ],
      onChange: (val) => {
        setRoleFilter(val as any);
        setPage(1);
      },
    },
    {
      id: 'plan',
      label: 'Plan',
      value: planFilter,
      options: [
        { label: 'All Plans', value: 'all' },
        { label: 'Premium Tier', value: 'premium' },
        { label: 'Free Tier', value: 'free' },
      ],
      onChange: (val) => {
        setPlanFilter(val as any);
        setPage(1);
      },
    },
  ];

  const columns: Column<AdminUserListItem>[] = [
    {
      header: 'User Profile',
      render: (u) => (
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => handleOpenUserDrawer(u)}
        >
          <UserAvatar src={u.avatar_url} name={u.full_name} size="md" />
          <div className="min-w-0">
            <p className="font-bold text-black group-hover:text-[#0B6B3A] transition-colors truncate">
              {u.full_name}
            </p>
            <p className="text-[11px] text-charcoal-muted line-clamp-1">
              {u.bio || 'Heritage Contributor'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'System Role',
      render: (u) => <AdminStatusBadge type="role" value={u.role} />,
    },
    {
      header: 'Membership',
      render: (u) => <AdminStatusBadge type="membership" value={u.is_premium || false} />,
    },
    {
      header: 'Memories Pinned',
      accessor: 'memories_count',
      className: 'font-mono text-charcoal-dark font-bold',
    },
    {
      header: 'Joined Date',
      render: (u) => (
        <span className="text-[11px] text-charcoal-muted">
          {new Date(u.created_at).toLocaleDateString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (u) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenUserDrawer(u)}
          className="rounded-xl text-xs py-1 px-3"
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="User & Account Management"
        description="Monitor registered contributors, membership plans, and role assignments."
      />

      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Search contributors by name or bio..."
        filters={filterConfigs}
        onReset={() => {
          setSearchQuery('');
          setRoleFilter('all');
          setPlanFilter('all');
          setPage(1);
        }}
      />

      <AdminDataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found matching the selected filters."
        keyExtractor={(u) => u.user_id}
        pagination={{
          currentPage: page,
          totalPages,
          totalCount,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* User Details Drawer Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md h-full bg-white shadow-2xl p-6 flex flex-col space-y-6 overflow-y-auto no-scrollbar animate-slide-left">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-sm font-bold text-black">
                Contributor Account Profile
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gray-50/80 border border-border">
              <UserAvatar src={selectedUser.avatar_url} name={selectedUser.full_name} size="lg" />
              <div className="min-w-0 space-y-1">
                <p className="text-base font-bold text-black truncate">
                  {selectedUser.full_name}
                </p>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge type="role" value={selectedUser.role} />
                  <AdminStatusBadge
                    type="membership"
                    value={userDetails ? userDetails.membership.isPremium : (selectedUser.is_premium || false)}
                  />
                </div>
              </div>
            </div>

            {/* Membership & Subscription Details Card */}
            <div className="p-4 rounded-2xl border border-border space-y-3 bg-white">
              <p className="text-xs font-semibold text-black flex items-center justify-between">
                <span>Membership & Subscription</span>
                <AdminStatusBadge
                  type="membership"
                  value={userDetails ? userDetails.membership.isPremium : (selectedUser.is_premium || false)}
                  size="sm"
                />
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-border/70 space-y-0.5">
                  <span className="text-[11px] text-charcoal-muted font-medium">Current Plan</span>
                  <p className="font-semibold text-black capitalize">
                    {userDetails?.membership?.planName || selectedUser.plan_name || 'Free Tier'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-border/70 space-y-0.5">
                  <span className="text-[11px] text-charcoal-muted font-medium">Subscription Status</span>
                  <p className="font-semibold text-black capitalize">
                    {userDetails?.membership?.status || selectedUser.membership_status || 'Active'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 border border-border/70 text-xs flex items-center justify-between">
                <span className="text-[11px] text-charcoal-muted font-medium">Period End / Expiry</span>
                <span className="font-mono text-xs text-charcoal-dark font-medium">
                  {userDetails?.membership?.currentPeriodEnd
                    ? new Date(userDetails.membership.currentPeriodEnd).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Permanent (No Expiry)'}
                </span>
              </div>
            </div>

            {/* Role Assignment Section (Super Admin Only) */}
            <div className="p-4 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-black flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0B6B3A]" />
                  <span>Assign Administrative Role</span>
                </p>
                {!isSuperAdmin && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Super Admin Only
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedRoleToAssign}
                  onChange={(e) => setSelectedRoleToAssign(e.target.value as UserRole)}
                  disabled={!isSuperAdmin || roleUpdating}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-white text-black font-medium disabled:opacity-60"
                >
                  <option value="authenticated_user">Regular Contributor</option>
                  <option value="moderator">Moderator</option>
                  <option value="support_admin">Support Admin</option>
                  <option value="platform_admin">Platform Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>

                {isSuperAdmin && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleUpdateRole}
                    disabled={roleUpdating || selectedRoleToAssign === selectedUser.role}
                    leftIcon={roleUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
                    className="bg-[#0B6B3A] text-white font-semibold rounded-xl text-xs py-2"
                  >
                    Update
                  </Button>
                )}
              </div>
            </div>

            {/* Recent Memories Section */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-charcoal-muted">
                Recent Pinned Stories
              </p>

              {detailsLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-6 h-6 text-[#0B6B3A] animate-spin mx-auto" />
                </div>
              ) : userDetails?.memories && userDetails.memories.length > 0 ? (
                <div className="space-y-2">
                  {userDetails.memories.map((m: any) => (
                    <div key={m.id} className="p-3 rounded-xl border border-border bg-white text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-black truncate max-w-[200px]">{m.title}</p>
                        <AdminStatusBadge type="memory" value={m.status} size="sm" />
                      </div>
                      <p className="text-xs text-charcoal-muted">{m.location?.city}, {m.location?.state} • {m.year}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-charcoal-muted italic p-2">No memories pinned yet.</p>
              )}
            </div>

            {/* Public Profile Link */}
            <div className="pt-4 border-t border-border mt-auto">
              <Link to={`/profile/${selectedUser.user_id}`} target="_blank">
                <Button variant="outline" className="w-full rounded-xl text-xs font-bold">
                  View Public Contributor Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
