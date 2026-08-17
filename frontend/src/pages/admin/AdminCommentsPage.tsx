import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Trash2, RotateCcw, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CommentItem {
  id: string;
  memory_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url?: string | null;
    role?: string;
  };
  memory?: {
    id: string;
    title: string;
    slug: string;
  };
}

export const AdminCommentsPage: React.FC = () => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadComments = async () => {
    setLoading(true);
    try {
      const limit = 15;
      const offset = (page - 1) * limit;

      const { data, count, error } = await supabase
        .from('memory_comments')
        .select('*, author:profiles(*), memory:memories(id, title, slug)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        let filtered = data as CommentItem[];
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          filtered = filtered.filter(
            (c) =>
              c.content.toLowerCase().includes(q) ||
              c.author?.full_name.toLowerCase().includes(q) ||
              c.memory?.title.toLowerCase().includes(q)
          );
        }

        setComments(filtered);
        setTotalCount(count || filtered.length);
        setTotalPages(Math.ceil((count || filtered.length) / limit) || 1);
      }
    } catch (err) {
      console.error('Error fetching admin comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [page, searchQuery]);

  const handleToggleDelete = async (comment: CommentItem) => {
    const nextState = !comment.is_deleted;
    const { error } = await supabase
      .from('memory_comments')
      .update({ is_deleted: nextState, updated_at: new Date().toISOString() })
      .eq('id', comment.id);

    if (!error) {
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, is_deleted: nextState } : c))
      );
    }
  };

  const columns: Column<CommentItem>[] = [
    {
      header: 'Comment Content',
      render: (c) => (
        <div className="space-y-1 max-w-md">
          <p className={`text-xs ${c.is_deleted ? 'line-through text-charcoal-muted' : 'text-black'}`}>
            "{c.content}"
          </p>
          {c.is_deleted && (
            <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-bold">
              Deleted by Moderator
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Author',
      render: (c) => (
        <div className="flex items-center gap-2">
          <UserAvatar src={c.author?.avatar_url} name={c.author?.full_name || 'Author'} size="sm" />
          <p className="font-bold text-black text-xs">{c.author?.full_name || 'Contributor'}</p>
        </div>
      ),
    },
    {
      header: 'Associated Memory',
      render: (c) =>
        c.memory ? (
          <Link
            to={`/memory/${c.memory.slug}`}
            target="_blank"
            className="text-xs font-bold text-[#0B6B3A] hover:underline flex items-center gap-1 truncate max-w-[200px]"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{c.memory.title}</span>
          </Link>
        ) : (
          <span className="text-xs text-charcoal-muted italic">Memory Deleted</span>
        ),
    },
    {
      header: 'Posted Date',
      render: (c) => (
        <span className="text-[11px] text-charcoal-muted">
          {new Date(c.created_at).toLocaleDateString([], {
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
      render: (c) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleDelete(c)}
          leftIcon={c.is_deleted ? <RotateCcw className="w-3.5 h-3.5 text-emerald-700" /> : <Trash2 className="w-3.5 h-3.5 text-red-600" />}
          className={`rounded-xl text-xs py-1 px-3 ${
            c.is_deleted ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {c.is_deleted ? 'Restore' : 'Delete'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Comment Moderation"
        description="Review community discussion threads, delete abusive comments, and restore flagged messages."
      />

      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Search comments by text, author, or memory title..."
        onReset={() => {
          setSearchQuery('');
          setPage(1);
        }}
      />

      <AdminDataTable
        columns={columns}
        data={comments}
        loading={loading}
        emptyMessage="No comments found."
        keyExtractor={(c) => c.id}
        pagination={{
          currentPage: page,
          totalPages,
          totalCount,
          onPageChange: (p) => setPage(p),
        }}
      />
    </div>
  );
};
