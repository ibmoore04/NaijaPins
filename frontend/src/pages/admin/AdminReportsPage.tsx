import React, { useState, useEffect } from 'react';
import { adminReportsService } from '@/services/adminReports.service';
import { adminService } from '@/services/admin.service';
import { ContentReport, ReportReason, ReportStatus } from '@/types/database';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilterBar, FilterConfig } from '@/components/admin/AdminFilterBar';
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  AlertTriangle,
  EyeOff,
  Trash2,
  X,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [reasonFilter, setReasonFilter] = useState<ReportReason | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await adminReportsService.getReports({
        page,
        limit: 15,
        status: statusFilter,
        reason: reasonFilter,
      });

      setReports(data.reports);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      console.error('Error fetching admin reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [page, statusFilter, reasonFilter]);

  const handleResolveAction = async (
    status: ReportStatus,
    memoryAction?: 'hide' | 'delete' | 'unpost_community'
  ) => {
    if (!selectedReport) return;
    setResolving(true);

    const res = await adminService.resolveReport(
      selectedReport.id,
      status,
      resolutionNotes || `Report resolved as ${status}`,
      memoryAction
    );

    if (res.success) {
      setReports((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? { ...r, status, resolution_notes: resolutionNotes } : r))
      );
      setSelectedReport(null);
      setResolutionNotes('');
    } else {
      alert(res.error || 'Failed to resolve report');
    }

    setResolving(false);
  };

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      value: statusFilter,
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Pending Action', value: 'pending' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Dismissed', value: 'resolved_dismissed' },
      ],
      onChange: (val) => {
        setStatusFilter(val as any);
        setPage(1);
      },
    },
    {
      id: 'reason',
      label: 'Reason',
      value: reasonFilter,
      options: [
        { label: 'All Reasons', value: 'all' },
        { label: 'Spam', value: 'SPAM' },
        { label: 'Harassment', value: 'HARASSMENT' },
        { label: 'Misinformation', value: 'MISINFORMATION' },
        { label: 'Privacy Violation', value: 'PRIVACY_VIOLATION' },
        { label: 'Inappropriate', value: 'INAPPROPRIATE' },
        { label: 'Copyright', value: 'COPYRIGHT' },
        { label: 'Other', value: 'OTHER' },
      ],
      onChange: (val) => {
        setReasonFilter(val as any);
        setPage(1);
      },
    },
  ];

  const columns: Column<ContentReport>[] = [
    {
      header: 'Reported Memory / Content',
      render: (r) => (
        <div className="space-y-1 max-w-sm">
          {r.memory ? (
            <p
              className="font-bold text-black hover:text-[#0B6B3A] cursor-pointer"
              onClick={() => setSelectedReport(r)}
            >
              {r.memory.title}
            </p>
          ) : (
            <p className="text-charcoal-muted italic">Memory no longer exists</p>
          )}
          <p className="text-[11px] text-charcoal-muted line-clamp-1">
            {r.details || 'No additional note provided by reporter.'}
          </p>
        </div>
      ),
    },
    {
      header: 'Reason',
      render: (r) => (
        <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-extrabold text-[11px]">
          {r.reason}
        </span>
      ),
    },
    {
      header: 'Reporter',
      render: (r) => (
        <div className="flex items-center gap-2">
          <UserAvatar src={r.reporter?.avatar_url} name={r.reporter?.full_name || 'Reporter'} size="sm" />
          <p className="font-medium text-black text-xs">{r.reporter?.full_name || 'Contributor'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (r) => <AdminStatusBadge type="report" value={r.status} />,
    },
    {
      header: 'Date Reported',
      render: (r) => (
        <span className="text-[11px] text-charcoal-muted">
          {new Date(r.created_at).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (r) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedReport(r)}
          className="rounded-xl text-xs py-1 px-3"
        >
          Review & Resolve
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Community Content Reports"
        description="Inspect flagged stories, user safety violations, and resolve community moderation tickets."
      />

      <AdminFilterBar
        filters={filterConfigs}
        onReset={() => {
          setStatusFilter('pending');
          setReasonFilter('all');
          setPage(1);
        }}
      />

      <AdminDataTable
        columns={columns}
        data={reports}
        loading={loading}
        emptyMessage="No reports found matching criteria."
        keyExtractor={(r) => r.id}
        pagination={{
          currentPage: page,
          totalPages,
          totalCount,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Resolution & Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <Card className="w-full max-w-xl bg-white border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col animate-scale-up">
            <div className="p-4 border-b border-border/80 bg-gray-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-bold text-black">
                  Report Resolution Center
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
              {/* Report Reason & Details */}
              <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-700">
                    Violation Category: {selectedReport.reason}
                  </span>
                  <AdminStatusBadge type="report" value={selectedReport.status} />
                </div>
                <p className="text-xs text-charcoal-dark leading-relaxed">
                  {selectedReport.details || 'No additional comment provided by the reporter.'}
                </p>
              </div>

              {/* Memory Information */}
              {selectedReport.memory ? (
                <div className="p-4 rounded-2xl border border-border space-y-2 bg-gray-50/50">
                  <p className="text-xs font-semibold text-black">
                    Target Memory: {selectedReport.memory.title}
                  </p>
                  <p className="text-xs text-charcoal-muted line-clamp-3 leading-relaxed">
                    {selectedReport.memory.story}
                  </p>
                  <div className="pt-2">
                    <Link to={`/memory/${selectedReport.memory.slug}`} target="_blank">
                      <Button variant="outline" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />} className="rounded-xl text-xs font-semibold">
                        Inspect Public Memory Pin
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-charcoal-muted italic">Associated memory record was removed.</p>
              )}

              {/* Resolution Notes Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black">
                  Staff Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record justification and action taken for the audit log..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 bg-gray-50/70"
                />
              </div>
            </div>

            {/* Resolution Actions */}
            <div className="p-4 border-t border-border/80 bg-gray-50/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolveAction('resolved_dismissed')}
                disabled={resolving}
                className="rounded-xl text-xs"
              >
                Dismiss Report
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolveAction('resolved_removed', 'hide')}
                  disabled={resolving}
                  leftIcon={<EyeOff className="w-3.5 h-3.5 text-amber-700" />}
                  className="rounded-xl text-xs bg-amber-50 text-amber-800 hover:bg-amber-100"
                >
                  Hide Memory
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleResolveAction('resolved_removed', 'delete')}
                  disabled={resolving}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-white" />}
                  className="rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Delete Memory
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
