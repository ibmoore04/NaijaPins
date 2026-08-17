import { supabase } from '@/lib/supabase';
import { UserMembership } from '@/types/membership';
import { DEFAULT_PLANS } from './plans.service';

export const membershipService = {
  async getUserMembership(userId: string): Promise<UserMembership> {
    try {
      // 1. Check existing user membership
      const { data } = await supabase
        .from('user_memberships')
        .select('*, plan:plans(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        const mem = data as any;
        return {
          ...mem,
          plan_slug: mem.plan?.slug || 'free',
          plan_name: mem.plan?.name || 'Free Contributor',
          plan_features: mem.plan?.features || DEFAULT_PLANS[0].features,
        } as UserMembership;
      }

      // 2. Fallback to RPC function get_or_create_user_membership
      const { data: rpcData } = await supabase.rpc('get_or_create_user_membership', {
        target_user_id: userId,
      });

      if (rpcData) {
        return rpcData as UserMembership;
      }
    } catch (err) {
      console.error('Error fetching membership:', err);
    }

    // Default Fallback Free Membership
    const freePlan = DEFAULT_PLANS[0];
    return {
      id: 'default-free',
      user_id: userId,
      plan_id: freePlan.id,
      status: 'active',
      provider: 'paystack',
      current_period_start: new Date().toISOString(),
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plan_slug: 'free',
      plan_name: freePlan.name,
      plan_features: freePlan.features,
      plan: freePlan,
    };
  },

  async cancelMembership(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_memberships')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return !error;
    } catch (err) {
      console.error('Error cancelling membership:', err);
      return false;
    }
  },

  async reactivateMembership(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_memberships')
        .update({
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return !error;
    } catch (err) {
      console.error('Error reactivating membership:', err);
      return false;
    }
  },
};
