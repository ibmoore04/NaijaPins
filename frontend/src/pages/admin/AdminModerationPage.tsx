import React, { useState, useEffect } from 'react';
import { adminMemoriesService } from '@/services/adminMemories.service';
import { adminService } from '@/services/admin.service';
import { Memory, MemoryStatus } from '@/types/database';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminConfirmDialog } from '@/components/admin/AdminConfirmDialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Globe,
  Lock,
  Trash2,
  MapPin,
  Calendar,
  X,
  Volume2,
} from 'lucide-react';

export const AdminModerationPage: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MemoryStatus | 'all'>('pending_review');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspection modal
  const [previewMemory, setPreviewMemory] = useState<Memory | null>(null);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    confirmVariant?: 'primary' | 'danger';
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });
  const [processing, setProcessing] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await adminMemoriesService.getMemories({
        page,
        limit: 15,
        status: activeTab,
        search: searchQuery,
      });

      setMemories(data.memories);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      console.error('Error fetching moderation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [activeTab, page, searchQuery]);

  const handleApprove = (memory: Memory) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Memory',
      message: `Approve "${memory.title}"? This marks status as Published for map and search visibility. (Community posting will remain ${memory.community_posted ? 'active' : 'private archive'}).`,
      confirmLabel: 'Approve Pin',
      confirmVariant: 'primary',
      action: async () => {
        setProcessing(true);
        const res = await adminService.updateMemoryStatus(memory.id, 'published');
        if (res.success) {
          setMemories((prev) =>
            prev.map((m) => (m.id === memory.id ? { ...m, status: 'published' } : m))
          );
          if (previewMemory?.id === memory.id) {
            setPreviewMemory((prev) => (prev ? { ...prev, status: 'published' } : null));
          }
        }
        setProcessing(false);
        setConfirmDialog((d) => ({ ...d, isOpen: false }));
      },
    });
  };

  const handleReject = (memory: Memory) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reject Memory',
      message: `Reject "${memory.title}"? This will hide the pin from public views.`,
      confirmLabel: 'Reject Memory',
      confirmVariant: 'danger',
      action: async () => {
        setProcessing(true);
        const res = await adminService.updateMemoryStatus(memory.id, 'rejected');
        if (res.success) {
          setMemories((prev) =>
            prev.map((m) => (m.id === memory.id ? { ...m, status: 'rejected' } : m))
          );
          if (previewMemory?.id === memory.id) {
            setPreviewMemory((prev) => (prev ? { ...prev, status: 'rejected' } : null));
          }
        }
        setProcessing(false);
        setConfirmDialog((d) => ({ ...d, isOpen: false }));
      },
    });
  };

  const handleToggleCommunity = async (memory: Memory) => {
    const nextState = !memory.community_posted;
    const res = await adminService.toggleCommunityPosted(memory.id, nextState);
    if (res.success) {
      setMemories((prev) =>
        prev.map((m) => (m.id === memory.id ? { ...m, community_posted: nextState } : m))
      );
      if (previewMemory?.id === memory.id) {
        setPreviewMemory((prev) => (prev ? { ...prev, community_posted: nextState } : null));
      }
    }
  };

  const handleDelete = (memory: Memory) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Soft Delete Memory',
      message: `Are you sure you want to delete "${memory.title}"? This removes it permanently from user and admin views.`,
      confirmLabel: 'Delete Memory',
      confirmVariant: 'danger',
      action: async () => {
        setProcessing(true);
        const ok = await adminMemoriesService.softDeleteMemory(memory.id);
        if (ok) {
          setMemories((prev) => prev.filter((m) => m.id !== memory.id));
          setPreviewMemory(null);
        }
        setProcessing(false);
        setConfirmDialog((d) => ({ ...d, isOpen: false }));
      },
    });
  };

  const columns: Column<Memory>[] = [
    {
      header: 'Memory & Story',
      render: (m) => (
        <div className="space-y-1 max-w-sm">
          <p className="font-bold text-black hover:text-[#0B6B3A] cursor-pointer" onClick={() => setPreviewMemory(m)}>
            {m.title}
          </p>
          <p className="text-[11px] text-charcoal-muted line-clamp-2 leading-relaxed">
            {m.story}
          </p>
          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-charcoal-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#0B6B3A]" /> {m.location?.city || 'Nigeria'}, {m.location?.state}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-charcoal-muted" /> {m.year}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Author',
      render: (m) => (
        <div className="flex items-center gap-2">
          <UserAvatar src={m.profile?.avatar_url} name={m.profile?.full_name || 'Contributor'} size="sm" />
          <div className="min-w-0">
            <p className="font-bold text-black truncate">{m.profile?.full_name || 'Contributor'}</p>
            <p className="text-[10px] text-charcoal-muted capitalize">{m.profile?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (m) => (
        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-charcoal-dark font-medium text-[11px]">
          {m.category?.name || 'General'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (m) => <AdminStatusBadge type="memory" value={m.status} />,
    },
    {
      header: 'Community',
      render: (m) => <AdminStatusBadge type="community" value={m.community_posted || false} />,
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setPreviewMemory(m)}
            className="p-1.5 rounded-lg bg-gray-100 text-charcoal-dark hover:bg-gray-200"
            title="Inspect Details"
          >
            <Eye className="w-4 h-4 text-primary" />
          </button>

          {m.status !== 'published' && (
            <button
              onClick={() => handleApprove(m)}
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              title="Approve Memory"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}

          {m.status !== 'rejected' && (
            <button
              onClick={() => handleReject(m)}
              className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
              title="Reject Memory"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => handleToggleCommunity(m)}
            className={`p-1.5 rounded-lg ${
              m.community_posted
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-gray-100 text-charcoal-muted hover:bg-gray-200'
            }`}
            title={m.community_posted ? 'Unpost from Community Feed' : 'Post to Community Feed'}
          >
            {m.community_posted ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Moderation Center"
        description="Inspect submitted memories, approve heritage pins, manage community visibility, and enforce platform standards."
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        {[
          { id: 'pending_review', label: 'Pending Review' },
          { id: 'published', label: 'Published' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'all', label: 'All Statuses' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0B6B3A] text-white shadow-xs'
                : 'bg-white border border-border text-charcoal-dark hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Search by title, author, or city..."
        onReset={() => {
          setSearchQuery('');
          setActiveTab('pending_review');
          setPage(1);
        }}
      />

      {/* Moderation Data Table */}
      <AdminDataTable
        columns={columns}
        data={memories}
        loading={loading}
        emptyMessage={`No ${activeTab.replace('_', ' ')} memories found.`}
        keyExtractor={(m) => m.id}
        pagination={{
          currentPage: page,
          totalPages,
          totalCount,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Memory Preview Modal */}
      {previewMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <Card className="w-full max-w-2xl max-h-[90vh] bg-white border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col animate-scale-up">
            <div className="p-4 border-b border-border/80 bg-gray-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AdminStatusBadge type="memory" value={previewMemory.status} />
                <AdminStatusBadge type="community" value={previewMemory.community_posted || false} />
              </div>
              <button
                onClick={() => setPreviewMemory(null)}
                className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar space-y-6 flex-1">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                  {previewMemory.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-muted">
                  <span className="font-semibold text-[#0B6B3A]">
                    {previewMemory.category?.name || 'Heritage'}
                  </span>
                  <span>•</span>
                  <span>{previewMemory.location?.formatted_address || `${previewMemory.location?.city}, ${previewMemory.location?.state}`}</span>
                  <span>•</span>
                  <span>{previewMemory.year} Era</span>
                </div>
              </div>

              {/* Story */}
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-border/60 text-xs sm:text-sm text-charcoal-dark whitespace-pre-line leading-relaxed">
                {previewMemory.story}
              </div>

              {/* Media Gallery */}
              {previewMemory.media && previewMemory.media.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-charcoal-muted">
                    Attached Media ({previewMemory.media.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {previewMemory.media.map((med) => (
                      <div key={med.id} className="relative rounded-xl overflow-hidden border border-border bg-gray-100 aspect-video">
                        {med.media_type === 'image' ? (
                          <img src={med.file_url} alt={med.caption || 'Memory media'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center text-xs">
                            <Volume2 className="w-6 h-6 text-amber-600" />
                            <span className="text-[11px] text-charcoal-muted truncate">Audio Recording</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Author Information */}
              <div className="p-4 rounded-2xl border border-border/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar src={previewMemory.profile?.avatar_url} name={previewMemory.profile?.full_name || 'Contributor'} size="md" />
                  <div>
                    <p className="text-xs font-bold text-black">{previewMemory.profile?.full_name}</p>
                    <p className="text-[10px] text-charcoal-muted">Submitted on {new Date(previewMemory.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-border/80 bg-gray-50/70 flex items-center justify-between gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(previewMemory)}
                leftIcon={<Trash2 className="w-4 h-4 text-red-600" />}
                className="text-red-600 hover:bg-red-50 rounded-xl"
              >
                Delete
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleCommunity(previewMemory)}
                  leftIcon={previewMemory.community_posted ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  className="rounded-xl"
                >
                  {previewMemory.community_posted ? 'Unpost Community' : 'Post Community'}
                </Button>

                {previewMemory.status !== 'rejected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(previewMemory)}
                    className="rounded-xl text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    Reject
                  </Button>
                )}

                {previewMemory.status !== 'published' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(previewMemory)}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white rounded-xl font-bold"
                  >
                    Approve Memory
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
        isProcessing={processing}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((d) => ({ ...d, isOpen: false }))}
      />
    </div>
  );
};
