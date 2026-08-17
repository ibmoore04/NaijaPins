import { supabase } from '@/lib/supabase';

export interface UserDashboardStats {
  totalMemories: number;
  publishedCount: number;
  pendingReviewCount: number;
  draftsCount: number;
  totalViews: number;
  savedCount: number;
  unreadNotificationsCount: number;
}

export const dashboardService = {
  async getUserStats(userId: string): Promise<UserDashboardStats> {
    // 1. Fetch user's memories breakdown
    const { data: memories } = await supabase
      .from('memories')
      .select('status, view_count')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    const mems = memories || [];
    const totalMemories = mems.length;
    const publishedCount = mems.filter((m) => m.status === 'published').length;
    const pendingReviewCount = mems.filter((m) => m.status === 'pending_review').length;
    const draftsCount = mems.filter((m) => m.status === 'draft').length;
    const totalViews = mems.reduce((sum, m) => sum + (m.view_count || 0), 0);

    // 2. Fetch user's saved count
    const { count: savedCount } = await supabase
      .from('saved_memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // 3. Fetch unread notifications count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      totalMemories,
      publishedCount,
      pendingReviewCount,
      draftsCount,
      totalViews,
      savedCount: savedCount || 0,
      unreadNotificationsCount: unreadCount || 0,
    };
  },
};
