import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types/database';
import { resolveUserMembership, ResolvedUserMembership } from '@/utils/membershipResolver';

export interface AdminUserListItem extends Profile {
  memories_count?: number;
  is_premium?: boolean;
  plan_name?: string;
  plan_slug?: string;
  membership_status?: string;
  current_period_end?: string | null;
}

export interface GetAdminUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | 'all';
  planType?: 'all' | 'premium' | 'free';
}

export const adminUsersService = {
  async getUsers(options: GetAdminUsersOptions = {}): Promise<{
    users: AdminUserListItem[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(Math.max(options.limit || 15, 1), 50);

    // Try RPC first for server-side accuracy and performance
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_users', {
        p_page: page,
        p_limit: limit,
        p_search: options.search?.trim() || null,
        p_role: options.role && options.role !== 'all' ? options.role : null,
        p_plan_type: options.planType && options.planType !== 'all' ? options.planType : null,
      });

      if (!rpcError && rpcData && Array.isArray(rpcData.users)) {
        return {
          users: rpcData.users as AdminUserListItem[],
          totalCount: Number(rpcData.total_count) || 0,
          page: Number(rpcData.page) || page,
          totalPages: Number(rpcData.total_pages) || 1,
        };
      }
    } catch (rpcErr) {
      console.warn('RPC get_admin_users failed or not yet deployed, falling back to direct query:', rpcErr);
    }

    // Direct query fallback using shared resolveUserMembership logic
    const offset = (page - 1) * limit;
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options.role && options.role !== 'all') {
      query = query.eq('role', options.role);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: profiles, count, error } = await query;

    if (error) {
      console.error('Error fetching admin users:', error.message);
      return { users: [], totalCount: 0, page, totalPages: 1 };
    }

    const userList: AdminUserListItem[] = (profiles || []) as AdminUserListItem[];

    if (userList.length > 0) {
      const userIds = userList.map((u) => u.user_id);

      const [membershipsRes, memoriesRes] = await Promise.all([
        supabase
          .from('user_memberships')
          .select('id, user_id, status, current_period_end, created_at, updated_at, plan:plans(name, slug)')
          .in('user_id', userIds),
        supabase
          .from('memories')
          .select('user_id')
          .in('user_id', userIds)
          .eq('is_deleted', false),
      ]);

      // Group all memberships by user_id to handle multiple records per user
      const userMembershipsMap = new Map<string, any[]>();
      (membershipsRes.data || []).forEach((m: any) => {
        const existing = userMembershipsMap.get(m.user_id) || [];
        existing.push(m);
        userMembershipsMap.set(m.user_id, existing);
      });

      // Count memories
      const memoryCountMap = new Map<string, number>();
      (memoriesRes.data || []).forEach((mem: any) => {
        const c = memoryCountMap.get(mem.user_id) || 0;
        memoryCountMap.set(mem.user_id, c + 1);
      });

      // Apply shared membership resolver for each user
      userList.forEach((u) => {
        const userMems = userMembershipsMap.get(u.user_id) || [];
        const resolved: ResolvedUserMembership = resolveUserMembership(userMems);

        u.is_premium = resolved.isPremium;
        u.plan_name = resolved.planName;
        u.plan_slug = resolved.planSlug;
        u.membership_status = resolved.status;
        u.current_period_end = resolved.currentPeriodEnd;
        u.memories_count = memoryCountMap.get(u.user_id) || 0;
      });
    }

    let filtered = userList;
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.bio?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)
      );
    }

    if (options.planType && options.planType !== 'all') {
      filtered = filtered.filter((u) =>
        options.planType === 'premium' ? u.is_premium : !u.is_premium
      );
    }

    const totalCount = count || filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      users: filtered,
      totalCount,
      page,
      totalPages,
    };
  },

  async getUserDetails(userId: string): Promise<{
    profile: Profile | null;
    memories: any[];
    membership: ResolvedUserMembership;
    rawMemberships: any[];
    reports: any[];
  }> {
    try {
      const [profileRes, memoriesRes, membershipRes, reportsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('memories')
          .select('*, location:locations(*), category:categories(*)')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('user_memberships')
          .select('*, plan:plans(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('reports')
          .select('*')
          .eq('reporter_id', userId)
          .limit(5),
      ]);

      const rawMems = membershipRes.data || [];
      const resolvedMembership = resolveUserMembership(rawMems);

      return {
        profile: profileRes.data as Profile | null,
        memories: memoriesRes.data || [],
        membership: resolvedMembership,
        rawMemberships: rawMems,
        reports: reportsRes.data || [],
      };
    } catch {
      return {
        profile: null,
        memories: [],
        membership: resolveUserMembership(null),
        rawMemberships: [],
        reports: [],
      };
    }
  },
};
