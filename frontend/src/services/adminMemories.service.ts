import { supabase } from '@/lib/supabase';
import { Memory, MemoryStatus } from '@/types/database';

export interface GetAdminMemoriesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: MemoryStatus | 'all';
  categoryId?: string;
  state?: string;
  communityPosted?: boolean | 'all';
  sortBy?: 'created_at' | 'view_count' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export const adminMemoriesService = {
  async getMemories(options: GetAdminMemoriesOptions = {}): Promise<{
    memories: Memory[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(Math.max(options.limit || 15, 1), 50);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('memories')
      .select('*, location:locations(*), category:categories(*), profile:profiles(*), media:memory_media(*)', {
        count: 'exact',
      })
      .eq('is_deleted', false);

    // Filter by status
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    // Filter by community_posted
    if (options.communityPosted !== undefined && options.communityPosted !== 'all') {
      query = query.eq('community_posted', options.communityPosted);
    }

    // Filter by category
    if (options.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', options.categoryId);
    }

    // Sorting
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder === 'asc';
    query = query.order(sortBy, { ascending: sortOrder });

    // Range
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching admin memories:', error.message);
      return { memories: [], totalCount: 0, page, totalPages: 1 };
    }

    let results = (data || []) as Memory[];

    // Client-side text search filter for title or author name
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      results = results.filter(
        (m) =>
          m.title?.toLowerCase().includes(q) ||
          m.story?.toLowerCase().includes(q) ||
          m.profile?.full_name?.toLowerCase().includes(q) ||
          m.location?.city?.toLowerCase().includes(q) ||
          m.location?.state?.toLowerCase().includes(q)
      );
    }

    const totalCount = count || results.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      memories: results,
      totalCount,
      page,
      totalPages,
    };
  },

  async getMemoryById(id: string): Promise<Memory | null> {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*, location:locations(*), category:categories(*), profile:profiles(*), media:memory_media(*)')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data as Memory;
    } catch {
      return null;
    }
  },

  async softDeleteMemory(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('memories')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      return !error;
    } catch {
      return false;
    }
  },
};
