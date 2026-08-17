import React, { useState, useEffect } from 'react';
import { adminMemoriesService } from '@/services/adminMemories.service';
import { adminCategoriesService } from '@/services/adminCategories.service';
import { Memory, Category, MemoryStatus } from '@/types/database';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilterBar, FilterConfig } from '@/components/admin/AdminFilterBar';
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminConfirmDialog } from '@/components/admin/AdminConfirmDialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Eye,
  Trash2,
  MapPin,
  Calendar,
  X,
  Volume2,
  PlusCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminMemoriesPage: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemoryStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [communityFilter, setCommunityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [previewMemory, setPreviewMemory] = useState<Memory | null>(null);
  const [deleteConfirmMemory, setDeleteConfirmMemory] = useState<Memory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    adminCategoriesService.getCategories().then(setCategories);
  }, []);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await adminMemoriesService.getMemories({
        page,
        limit: 15,
        search: searchQuery,
        status: statusFilter,
        categoryId: categoryFilter,
        communityPosted:
          communityFilter === 'all'
            ? 'all'
            : communityFilter === 'true',
      });

      setMemories(data.memories);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      console.error('Error fetching admin memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [page, searchQuery, statusFilter, categoryFilter, communityFilter]);

  const handleDelete = async () => {
    if (!deleteConfirmMemory) return;
    setDeleting(true);
    const ok = await adminMemoriesService.softDeleteMemory(deleteConfirmMemory.id);
    if (ok) {
      setMemories((prev) => prev.filter((m) => m.id !== deleteConfirmMemory.id));
      setDeleteConfirmMemory(null);
    }
    setDeleting(false);
  };

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      value: statusFilter,
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Published', value: 'published' },
        { label: 'Pending Review', value: 'pending_review' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Draft', value: 'draft' },
      ],
      onChange: (val) => {
        setStatusFilter(val as any);
        setPage(1);
      },
    },
    {
      id: 'category',
      label: 'Category',
      value: categoryFilter,
      options: [
        { label: 'All Categories', value: 'all' },
        ...categories.map((c) => ({ label: c.name, value: c.id })),
      ],
      onChange: (val) => {
        setCategoryFilter(val);
        setPage(1);
      },
    },
    {
      id: 'community',
      label: 'Community Feed',
      value: communityFilter,
      options: [
        { label: 'All Visibility', value: 'all' },
        { label: 'In Community', value: 'true' },
        { label: 'Private Archive', value: 'false' },
      ],
      onChange: (val) => {
        setCommunityFilter(val);
        setPage(1);
      },
    },
  ];

  const columns: Column<Memory>[] = [
    {
      header: 'Memory Title & Location',
      render: (m) => (
        <div className="space-y-1 max-w-sm">
          <p
            className="font-bold text-black hover:text-[#0B6B3A] cursor-pointer"
            onClick={() => setPreviewMemory(m)}
          >
            {m.title}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-charcoal-muted">
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
      header: 'Views',
      accessor: 'view_count',
      className: 'font-mono text-charcoal-muted',
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
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteConfirmMemory(m)}
            className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
            title="Delete Memory"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Memory Archive Management"
        description="Comprehensive repository of all pinned Nigerian heritage memories across the platform."
        actions={
          <Link to="/add-memory">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl"
            >
              Add New Memory
            </Button>
          </Link>
        }
      />

      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Search memories by title or author..."
        filters={filterConfigs}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('all');
          setCategoryFilter('all');
          setCommunityFilter('all');
          setPage(1);
        }}
      />

      <AdminDataTable
        columns={columns}
        data={memories}
        loading={loading}
        emptyMessage="No memories matching the selected filters."
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
                  <span>•</span>
                  <span>{previewMemory.view_count} views</span>
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
                            <span className="text-[10px] text-charcoal-muted truncate">Audio</span>
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

                <Link to={`/memory/${previewMemory.slug}`} target="_blank">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs">
                    View Public Page
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteConfirmMemory}
        title="Delete Memory"
        message={`Are you sure you want to soft delete "${deleteConfirmMemory?.title}"?`}
        confirmLabel="Delete Memory"
        confirmVariant="danger"
        isProcessing={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmMemory(null)}
      />
    </div>
  );
};
