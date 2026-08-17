import { supabase } from '@/lib/supabase';

export interface SubscriptionPreferences {
  id?: string;
  user_id: string;
  newsletter_subscribed: boolean;
  submission_updates: boolean;
  community_updates: boolean;
}

export const subscriptionsService = {
  async getSubscriptionPreferences(userId: string): Promise<SubscriptionPreferences> {
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        return data as SubscriptionPreferences;
      }
    } catch (err) {
      // Fallback to defaults
    }

    return {
      user_id: userId,
      newsletter_subscribed: true,
      submission_updates: true,
      community_updates: true,
    };
  },

  async saveSubscriptionPreferences(
    userId: string,
    prefs: {
      newsletter_subscribed: boolean;
      submission_updates: boolean;
      community_updates: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            newsletter_subscribed: prefs.newsletter_subscribed,
            submission_updates: prefs.submission_updates,
            community_updates: prefs.community_updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving subscriptions:', err);
      return {
        success: false,
        error: 'Unable to save your subscription preferences. Please try again.',
      };
    }
  },
};
