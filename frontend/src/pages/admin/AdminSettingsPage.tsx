import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/admin.service';
import { AdminAuditLog } from '@/types/database';
import { ADMIN_ROLE_PERMISSIONS } from '@/config/adminPermissions';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable';
import { Card } from '@/components/ui/Card';
import { ShieldCheck, Check, Minus } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    adminService.getAuditLogs(50).then((logs) => {
      setAuditLogs(logs);
      setLoadingLogs(false);
    });
  }, []);

  const rolesList = ['super_admin', 'platform_admin', 'moderator', 'support_admin'];
  const modulesList = [
    { id: 'overview', name: 'Dashboard Overview' },
    { id: 'moderation', name: 'Moderation Queue' },
    { id: 'memories', name: 'Memory Management' },
    { id: 'users', name: 'User Management' },
    { id: 'reports', name: 'Reports Resolution' },
    { id: 'comments', name: 'Comment Moderation' },
    { id: 'categories', name: 'Categories Management' },
    { id: 'memberships', name: 'Membership Subscriptions' },
    { id: 'analytics', name: 'Analytics Deep Dive' },
    { id: 'notifications', name: 'System Notifications' },
    { id: 'settings', name: 'Settings & Audit Logs' },
  ];

  const logColumns: Column<AdminAuditLog>[] = [
    {
      header: 'Administrator',
      render: (l) => (
        <div className="space-y-0.5">
          <p className="font-bold text-black text-xs">{l.admin?.full_name || 'Staff'}</p>
          <p className="text-[10px] text-charcoal-muted capitalize">{l.admin?.role?.replace('_', ' ')}</p>
        </div>
      ),
    },
    {
      header: 'Action Performed',
      render: (l) => (
        <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
          {l.action}
        </span>
      ),
    },
    {
      header: 'Target Resource',
      render: (l) => (
        <span className="text-xs text-charcoal-dark font-medium">
          {l.target_type} ({l.target_id ? l.target_id.slice(0, 8) + '...' : 'general'})
        </span>
      ),
    },
    {
      header: 'Details',
      render: (l) => (
        <span className="text-[11px] text-charcoal-muted font-mono truncate max-w-xs block">
          {JSON.stringify(l.details || {})}
        </span>
      ),
    },
    {
      header: 'Timestamp',
      render: (l) => (
        <span className="text-[11px] text-charcoal-muted whitespace-nowrap">
          {new Date(l.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <AdminPageHeader
        title="Admin Settings & Audit Logs"
        description="Review role-based permissions matrix, security configuration, and immutable administrative audit trails."
      />

      {/* Role Permission Matrix Card */}
      <Card className="border border-border/80 bg-white rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0B6B3A]" />
            <h2 className="text-sm font-bold text-black">
              Role-Based Access Control Matrix
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-border text-charcoal-muted font-semibold">
              <tr>
                <th className="p-3.5">Module</th>
                {rolesList.map((r) => (
                  <th key={r} className="p-3.5 text-center capitalize">
                    {r.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {modulesList.map((mod) => (
                <tr key={mod.id} className="hover:bg-gray-50/80">
                  <td className="p-3.5 font-semibold text-black">{mod.name}</td>
                  {rolesList.map((role) => {
                    const hasAccess = ADMIN_ROLE_PERMISSIONS[role]?.includes(mod.id as any);
                    return (
                      <td key={role} className="p-3.5 text-center">
                        {hasAccess ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-[#0B6B3A]">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-charcoal-muted">
                            <Minus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-black">
            Administrative Audit Trail
          </h2>
          <span className="text-xs text-charcoal-muted">{auditLogs.length} total entries logged</span>
        </div>

        <AdminDataTable
          columns={logColumns}
          data={auditLogs}
          loading={loadingLogs}
          emptyMessage="No audit logs recorded yet."
          keyExtractor={(l) => l.id}
        />
      </div>
    </div>
  );
};
