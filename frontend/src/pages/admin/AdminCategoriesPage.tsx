import React, { useState, useEffect } from 'react';
import { adminCategoriesService } from '@/services/adminCategories.service';
import { adminService } from '@/services/admin.service';
import { Category } from '@/types/database';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable';
import { AdminConfirmDialog } from '@/components/admin/AdminConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlusCircle, Edit3, Trash2, CheckCircle2, XCircle, X } from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<(Category & { memories_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'MapPin',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    const data = await adminCategoriesService.getCategories();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: 'MapPin',
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || 'MapPin',
      is_active: cat.is_active,
    });
    setModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) return;

    setSaving(true);
    const res = await adminService.upsertCategory({
      id: editingCategory?.id,
      name: formData.name.trim(),
      slug: formData.slug.trim().toLowerCase(),
      description: formData.description.trim() || undefined,
      icon: formData.icon.trim() || 'MapPin',
      is_active: formData.is_active,
    });

    if (res.success) {
      setModalOpen(false);
      loadCategories();
    } else {
      alert(res.error || 'Failed to save category');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await adminCategoriesService.deleteCategory(deleteConfirm.id);
    if (res.success) {
      setCategories((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } else {
      alert(res.error || 'Cannot delete category with pinned memories.');
    }
    setDeleting(false);
  };

  const columns: Column<Category & { memories_count: number }>[] = [
    {
      header: 'Category Name',
      render: (c) => (
        <div className="space-y-0.5">
          <p className="font-bold text-black text-xs">{c.name}</p>
          <p className="text-[11px] text-charcoal-muted line-clamp-1">{c.description || 'General heritage collection'}</p>
        </div>
      ),
    },
    {
      header: 'Slug',
      render: (c) => <span className="font-mono text-xs text-charcoal-muted bg-gray-100 px-2 py-0.5 rounded">{c.slug}</span>,
    },
    {
      header: 'Icon Name',
      render: (c) => <span className="text-xs text-charcoal-dark font-medium">{c.icon}</span>,
    },
    {
      header: 'Memories Pinned',
      accessor: 'memories_count',
      className: 'font-bold font-mono text-charcoal-dark',
    },
    {
      header: 'Active Status',
      render: (c) => (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${c.is_active ? 'text-emerald-700' : 'text-gray-500'}`}>
          {c.is_active ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
          <span>{c.is_active ? 'Active' : 'Disabled'}</span>
        </span>
      ),
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit(c)}
            className="p-1.5 rounded-lg bg-gray-100 text-charcoal-dark hover:bg-gray-200"
            title="Edit Category"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteConfirm(c)}
            className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
            title="Delete Category"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Category Management"
        description="Organize Nigerian history into structured thematic eras and cultural collections."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="bg-[#0B6B3A] text-white font-bold rounded-xl"
          >
            Create Category
          </Button>
        }
      />

      <AdminDataTable
        columns={columns}
        data={categories}
        loading={loading}
        emptyMessage="No categories created."
        keyExtractor={(c) => c.id}
      />

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <Card className="w-full max-w-md bg-white border border-border shadow-2xl rounded-3xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-border/80 bg-gray-50/70 flex items-center justify-between">
              <h3 className="text-sm font-bold text-black">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-black">Category Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData((prev) => ({
                      ...prev,
                      name,
                      slug: editingCategory ? prev.slug : slug,
                    }));
                  }}
                  placeholder="e.g. Independence & Politics"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-gray-50/70 text-black focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-black">Slug (URL Identifier)</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g. independence-politics"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-border bg-gray-50/70 text-black focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-black">Icon Name (Lucide Icon)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="e.g. MapPin, BookOpen, Music, Users"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-gray-50/70 text-black focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-black">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description of stories in this category..."
                  rows={2}
                  className="w-full p-3 text-xs rounded-xl border border-border bg-gray-50/70 text-black focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded text-[#0B6B3A] focus:ring-[#0B6B3A]"
                />
                <label htmlFor="cat_active" className="text-xs font-bold text-black cursor-pointer">
                  Active and visible to contributors
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  className="bg-[#0B6B3A] text-white font-bold rounded-xl text-xs"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Category"
        message={`Delete "${deleteConfirm?.name}"? Make sure no active memories are using this category before deleting.`}
        confirmLabel="Delete Category"
        confirmVariant="danger"
        isProcessing={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
