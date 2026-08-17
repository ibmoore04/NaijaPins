import { supabase } from '@/lib/supabase';
import { Plan, UserMembership } from '@/types/membership';
import { resolveUserMembership } from '@/utils/membershipResolver';

export interface AdminMembershipListItem extends UserMembership {
  user_profile?: {
    full_name: string;
    avatar_url?: string | null;
    role?: string;
  };
  is_actually_premium?: boolean;
}

export const adminMembershipsService = {
  async getPlans(): Promise<Plan[]> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as Plan[];
    } catch {
      return [];
    }
  },

  async getMemberships(options: {
    page?: number;
    limit?: number;
    status?: string;
    planSlug?: string;
  } = {}): Promise<{
    memberships: AdminMembershipListItem[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(Math.max(options.limit || 15, 1), 50);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('user_memberships')
      .select('*, plan:plans(*), user:profiles!user_memberships_user_id_fkey(full_name, avatar_url, role)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      // Fallback query if foreign key alias differs
      const { data: fallbackData, count: fallbackCount } = await supabase
        .from('user_memberships')
        .select('*, plan:plans(*)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const items = (fallbackData || []).map((m: any) => {
        const resolved = resolveUserMembership(m);
        return {
          ...m,
          is_actually_premium: resolved.isPremium,
          plan_name: resolved.planName,
          plan_slug: resolved.planSlug,
        };
      });

      return {
        memberships: items as AdminMembershipListItem[],
        totalCount: fallbackCount || 0,
        page,
        totalPages: Math.ceil((fallbackCount || 0) / limit) || 1,
      };
    }

    const items = (data || []).map((m: any) => {
      const resolved = resolveUserMembership(m);
      return {
        ...m,
        user_profile: m.user,
        is_actually_premium: resolved.isPremium,
        plan_name: resolved.planName,
        plan_slug: resolved.planSlug,
      };
    });

    const totalCount = count || items.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      memberships: items as AdminMembershipListItem[],
      totalCount,
      page,
      totalPages,
    };
  },
};
