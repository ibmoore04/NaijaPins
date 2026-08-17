import { supabase } from '@/lib/supabase';
import { Follow, FollowStats } from '@/types/social';
import { notificationsService } from './notifications.service';

export const followService = {
  // Toggle Follow / Unfollow
  async toggleFollow(
    followerId: string,
    followingId: string,
    followerName?: string
  ): Promise<{ following: boolean; stats: FollowStats }> {
    try {
      if (followerId === followingId) {
        throw new Error('You cannot follow yourself.');
      }

      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();

      if (existingFollow) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId);

        const stats = await this.getFollowStats(followingId, followerId);
        return { following: false, stats };
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: followerId,
            following_id: followingId,
          });

        // Notify target user
        await notificationsService.createNotification({
          userId: followingId,
          type: 'follow',
          title: '👤 New Follower!',
          message: `${followerName || 'A contributor'} started following your Nigerian heritage journey.`,
        });

        const stats = await this.getFollowStats(followingId, followerId);
        return { following: true, stats };
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      const stats = await this.getFollowStats(followingId, followerId);
      return { following: false, stats };
    }
  },

  // Check if followerId is following targetUserId
  async checkIsFollowing(followerId: string, targetUserId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', targetUserId)
        .maybeSingle();
      return !!data;
    } catch {
      return false;
    }
  },

  // Get followers and following counts for a user
  async getFollowStats(
    targetUserId: string,
    currentUserId?: string | null
  ): Promise<FollowStats> {
    try {
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetUserId),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', targetUserId),
      ]);

      let is_following = false;
      if (currentUserId && currentUserId !== targetUserId) {
        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
          .maybeSingle();
        is_following = !!data;
      }

      return {
        followers_count: followersRes.count || 0,
        following_count: followingRes.count || 0,
        is_following,
      };
    } catch (err) {
      console.error('Error fetching follow stats:', err);
      return {
        followers_count: 0,
        following_count: 0,
        is_following: false,
      };
    }
  },

  // List followers
  async getFollowers(userId: string): Promise<Follow[]> {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*, follower_profile:profiles!follows_follower_id_fkey(*)')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data as Follow[];
    } catch {
      return [];
    }
  },

  // List following
  async getFollowing(userId: string): Promise<Follow[]> {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*, following_profile:profiles!follows_following_id_fkey(*)')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data as Follow[];
    } catch {
      return [];
    }
  },
};
