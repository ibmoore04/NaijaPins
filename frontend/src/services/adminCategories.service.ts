import { supabase } from '@/lib/supabase';
import { Category } from '@/types/database';

export const adminCategoriesService = {
  async getCategories(): Promise<(Category & { memories_count: number })[]> {
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error || !categories) return [];

      const { data: counts } = await supabase
        .from('memories')
        .select('category_id')
        .eq('is_deleted', false);

      const countMap = new Map<string, number>();
      (counts || []).forEach((c: any) => {
        const current = countMap.get(c.category_id) || 0;
        countMap.set(c.category_id, current + 1);
      });

      return categories.map((cat) => ({
        ...cat,
        memories_count: countMap.get(cat.id) || 0,
      }));
    } catch {
      return [];
    }
  },

  async deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete category' };
    }
  },
};
