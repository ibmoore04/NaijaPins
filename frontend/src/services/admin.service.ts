import { supabase } from '@/lib/supabase';
import {
  AdminOverviewStats,
  AdminAnalyticsData,
  AdminAuditLog,
  MemoryStatus,
  ReportStatus,
  UserRole,
} from '@/types/database';

export const adminService = {
  // Fetch real-time KPI overview statistics
  async getOverviewStats(): Promise<AdminOverviewStats> {
    try {
      const { data, error } = await supabase.rpc('get_admin_overview_stats');

      if (error) {
        throw new Error(error.message);
      }

      return (
        data || {
          total_users: 0,
          active_users: 0,
          new_users_week: 0,
          total_memories: 0,
          published_memories: 0,
          pending_memories: 0,
          rejected_memories: 0,
          memories_week: 0,
          open_reports: 0,
          premium_members: 0,
          free_members: 0,
          total_likes: 0,
          total_comments: 0,
          total_reposts: 0,
        }
      );
    } catch (err) {
      console.error('Error fetching admin overview stats:', err);
      // Fallback calculation using direct queries if RPC is not yet executed
      return this.fallbackCalculateOverviewStats();
    }
  },

  // Fallback direct count query in case RPC is pending migration execution
  async fallbackCalculateOverviewStats(): Promise<AdminOverviewStats> {
    try {
      const [
        usersRes,
        memoriesRes,
        pendingRes,
        publishedRes,
        rejectedRes,
        reportsRes,
        likesRes,
        commentsRes,
        repostsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'pending_review'),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'published'),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'rejected'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
        supabase.from('memory_likes').select('*', { count: 'exact', head: true }),
        supabase.from('memory_comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('memory_reposts').select('*', { count: 'exact', head: true }),
      ]);

      const totalUsers = usersRes.count || 0;
      const totalMemories = memoriesRes.count || 0;

      return {
        total_users: totalUsers,
        active_users: totalUsers,
        new_users_week: 0,
        total_memories: totalMemories,
        published_memories: publishedRes.count || 0,
        pending_memories: pendingRes.count || 0,
        rejected_memories: rejectedRes.count || 0,
        memories_week: 0,
        open_reports: reportsRes.count || 0,
        premium_members: 0,
        free_members: totalUsers,
        total_likes: likesRes.count || 0,
        total_comments: commentsRes.count || 0,
        total_reposts: repostsRes.count || 0,
      };
    } catch {
      return {
        total_users: 0,
        active_users: 0,
        new_users_week: 0,
        total_memories: 0,
        published_memories: 0,
        pending_memories: 0,
        rejected_memories: 0,
        memories_week: 0,
        open_reports: 0,
        premium_members: 0,
        free_members: 0,
        total_likes: 0,
        total_comments: 0,
        total_reposts: 0,
      };
    }
  },

  // Deep-dive Analytics
  async getAnalytics(): Promise<AdminAnalyticsData> {
    try {
      const { data, error } = await supabase.rpc('get_admin_analytics');
      if (error) throw new Error(error.message);
      return data as AdminAnalyticsData;
    } catch (err) {
      console.error('Error fetching admin analytics:', err);
      return {
        categories: [],
        states: [],
        status_distribution: [],
        monthly_growth: [],
      };
    }
  },

  // Audit Logs
  async getAuditLogs(limit = 20, offset = 0): Promise<AdminAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*, admin:profiles(*)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.warn('Audit logs not available:', error.message);
        return [];
      }

      return (data || []) as AdminAuditLog[];
    } catch {
      return [];
    }
  },

  // Update Memory Moderation Status
  async updateMemoryStatus(
    memoryId: string,
    status: MemoryStatus,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('admin_update_memory_status', {
        p_memory_id: memoryId,
        p_status: status,
        p_notes: notes || null,
      });

      if (error) {
        // Fallback direct update
        const { error: directErr } = await supabase
          .from('memories')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', memoryId);

        if (directErr) throw new Error(directErr.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating memory status:', err);
      return { success: false, error: err?.message || 'Failed to update status' };
    }
  },

  // Toggle Community Posted Status Independently
  async toggleCommunityPosted(
    memoryId: string,
    communityPosted: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('admin_toggle_community_posted', {
        p_memory_id: memoryId,
        p_community_posted: communityPosted,
      });

      if (error) {
        const { error: directErr } = await supabase
          .from('memories')
          .update({ community_posted: communityPosted, updated_at: new Date().toISOString() })
          .eq('id', memoryId);

        if (directErr) throw new Error(directErr.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error toggling community_posted:', err);
      return { success: false, error: err?.message || 'Failed to toggle community post' };
    }
  },

  // Super Admin: Update User Role
  async updateUserRole(
    targetUserId: string,
    newRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('admin_update_user_role', {
        p_target_user_id: targetUserId,
        p_new_role: newRole,
      });

      if (error) {
        // Direct update fallback if permitted
        const { error: directErr } = await supabase
          .from('profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('user_id', targetUserId);

        if (directErr) throw new Error(directErr.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating user role:', err);
      return { success: false, error: err?.message || 'Failed to update user role' };
    }
  },

  // Resolve Report
  async resolveReport(
    reportId: string,
    status: ReportStatus,
    notes?: string,
    memoryAction?: 'hide' | 'delete' | 'unpost_community'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('admin_resolve_report', {
        p_report_id: reportId,
        p_status: status,
        p_resolution_notes: notes || null,
        p_memory_action: memoryAction || null,
      });

      if (error) {
        const { error: directErr } = await supabase
          .from('reports')
          .update({
            status,
            resolution_notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reportId);

        if (directErr) throw new Error(directErr.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error resolving report:', err);
      return { success: false, error: err?.message || 'Failed to resolve report' };
    }
  },

  // Upsert Category
  async upsertCategory(params: {
    id?: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    is_active?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('admin_upsert_category', {
        p_id: params.id || null,
        p_name: params.name,
        p_slug: params.slug,
        p_description: params.description || null,
        p_icon: params.icon || 'MapPin',
        p_is_active: params.is_active ?? true,
      });


      if (error) {
        if (params.id) {
          const { error: updErr } = await supabase
            .from('categories')
            .update({
              name: params.name,
              slug: params.slug,
              description: params.description || null,
              icon: params.icon || 'MapPin',
              is_active: params.is_active ?? true,
            })
            .eq('id', params.id);
          if (updErr) throw new Error(updErr.message);
        } else {
          const { error: insErr } = await supabase.from('categories').insert({
            name: params.name,
            slug: params.slug,
            description: params.description || null,
            icon: params.icon || 'MapPin',
            is_active: params.is_active ?? true,
          });
          if (insErr) throw new Error(insErr.message);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error upserting category:', err);
      return { success: false, error: err?.message || 'Failed to save category' };
    }
  },
};
