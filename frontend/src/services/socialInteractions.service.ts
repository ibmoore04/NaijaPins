import { supabase } from '@/lib/supabase';
import { notificationsService } from './notifications.service';

export interface SocialStatsResult {
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  has_liked: boolean;
  has_reposted: boolean;
  has_saved: boolean;
}

// In-flight mutex set to prevent rapid concurrent like requests for same user & memory
const inFlightLikes = new Set<string>();

export const socialInteractionsService = {
  // Check if a specific user has liked a memory
  async hasUserLikedMemory(memoryId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('memory_likes')
        .select('id')
        .eq('memory_id', memoryId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  },

  // Toggle Memory Like with concurrency lock, duplicate prevention, and graceful error handling
  async toggleLike(
    memoryId: string,
    userId: string,
    authorId?: string,
    memoryTitle?: string,
    currentHasLikedHint?: boolean
  ): Promise<{ liked: boolean; likesCount: number; error?: string }> {
    const lockKey = `${userId}:${memoryId}`;

    // Prevent concurrent requests for same user + memory
    if (inFlightLikes.has(lockKey)) {
      const likesCount = await this.getLikesCount(memoryId);
      const isLiked = await this.hasUserLikedMemory(memoryId, userId);
      return { liked: isLiked, likesCount };
    }

    inFlightLikes.add(lockKey);

    try {
      // 1. Check existing like directly in database to ensure 100% accurate state
      const { data: existingLike, error: checkError } = await supabase
        .from('memory_likes')
        .select('id')
        .eq('memory_id', memoryId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.warn('Error checking existing like status:', checkError.message);
      }

      const isAlreadyLiked = !!existingLike || (existingLike === null && currentHasLikedHint === true && !checkError);

      if (isAlreadyLiked) {
        // UNLIKE: Remove existing record
        const { error: deleteError } = await supabase
          .from('memory_likes')
          .delete()
          .eq('memory_id', memoryId)
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error unliking memory:', deleteError.message);
        }

        const likesCount = await this.getLikesCount(memoryId);
        return { liked: false, likesCount };
      } else {
        // LIKE: Insert single record
        const { error: insertError } = await supabase
          .from('memory_likes')
          .insert({ memory_id: memoryId, user_id: userId });

        if (insertError) {
          // Handle duplicate constraint (code 23505) gracefully without crashing
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.info('Like already recorded in database (unique constraint prevented duplicate).');
            const likesCount = await this.getLikesCount(memoryId);
            return { liked: true, likesCount };
          }
          console.error('Error inserting memory like:', insertError.message);
        } else {
          // Trigger notification only on successful like and if not self-like
          if (authorId && authorId !== userId) {
            await notificationsService.createNotification({
              userId: authorId,
              type: 'like',
              title: '❤️ Someone liked your memory!',
              message: `A community contributor liked your memory "${memoryTitle || 'Heritage Story'}".`,
              memoryId: memoryId,
            });
          }
        }

        const likesCount = await this.getLikesCount(memoryId);
        return { liked: true, likesCount };
      }
    } catch (err: any) {
      console.error('Unexpected error toggling memory like:', err);
      const likesCount = await this.getLikesCount(memoryId);
      const isLiked = await this.hasUserLikedMemory(memoryId, userId);
      return { liked: isLiked, likesCount, error: err?.message };
    } finally {
      inFlightLikes.delete(lockKey);
    }
  },

  async getLikesCount(memoryId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('memory_likes')
        .select('*', { count: 'exact', head: true })
        .eq('memory_id', memoryId);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },

  // Toggle Memory Repost
  async toggleRepost(
    memoryId: string,
    userId: string,
    comment?: string | null,
    authorId?: string,
    memoryTitle?: string
  ): Promise<{ reposted: boolean; repostsCount: number }> {
    try {
      const { data: existingRepost } = await supabase
        .from('memory_reposts')
        .select('id')
        .eq('memory_id', memoryId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRepost) {
        // Remove repost
        await supabase
          .from('memory_reposts')
          .delete()
          .eq('memory_id', memoryId)
          .eq('user_id', userId);

        const repostsCount = await this.getRepostsCount(memoryId);
        return { reposted: false, repostsCount };
      } else {
        // Create repost
        await supabase
          .from('memory_reposts')
          .insert({
            memory_id: memoryId,
            user_id: userId,
            comment: comment?.trim() || null,
          });

        // Notify memory author if not self-repost
        if (authorId && authorId !== userId) {
          await notificationsService.createNotification({
            userId: authorId,
            type: 'repost',
            title: '🔁 Your memory was reposted!',
            message: `A contributor amplified your story "${memoryTitle || 'Heritage Story'}" to the community feed.`,
            memoryId: memoryId,
          });
        }

        const repostsCount = await this.getRepostsCount(memoryId);
        return { reposted: true, repostsCount };
      }
    } catch (err) {
      console.error('Error toggling repost:', err);
      const repostsCount = await this.getRepostsCount(memoryId);
      return { reposted: false, repostsCount };
    }
  },

  async getRepostsCount(memoryId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('memory_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('memory_id', memoryId);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },

  // Toggle Save/Bookmark
  async toggleSave(memoryId: string, userId: string): Promise<{ saved: boolean }> {
    try {
      const { data: existingSave } = await supabase
        .from('saved_memories')
        .select('id')
        .eq('memory_id', memoryId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSave) {
        await supabase
          .from('saved_memories')
          .delete()
          .eq('memory_id', memoryId)
          .eq('user_id', userId);
        return { saved: false };
      } else {
        await supabase
          .from('saved_memories')
          .insert({ memory_id: memoryId, user_id: userId });
        return { saved: true };
      }
    } catch (err) {
      console.error('Error toggling memory save:', err);
      return { saved: false };
    }
  },

  // Get social stats for a single memory
  async getMemorySocialStats(
    memoryId: string,
    currentUserId?: string | null
  ): Promise<SocialStatsResult> {
    try {
      const [likesRes, commentsRes, repostsRes] = await Promise.all([
        supabase
          .from('memory_likes')
          .select('*', { count: 'exact', head: true })
          .eq('memory_id', memoryId),
        supabase
          .from('memory_comments')
          .select('*', { count: 'exact', head: true })
          .eq('memory_id', memoryId)
          .eq('is_deleted', false),
        supabase
          .from('memory_reposts')
          .select('*', { count: 'exact', head: true })
          .eq('memory_id', memoryId),
      ]);

      let has_liked = false;
      let has_reposted = false;
      let has_saved = false;

      if (currentUserId) {
        const [likeCheck, repostCheck, saveCheck] = await Promise.all([
          supabase
            .from('memory_likes')
            .select('id')
            .eq('memory_id', memoryId)
            .eq('user_id', currentUserId)
            .maybeSingle(),
          supabase
            .from('memory_reposts')
            .select('id')
            .eq('memory_id', memoryId)
            .eq('user_id', currentUserId)
            .maybeSingle(),
          supabase
            .from('saved_memories')
            .select('id')
            .eq('memory_id', memoryId)
            .eq('user_id', currentUserId)
            .maybeSingle(),
        ]);

        has_liked = !!likeCheck.data;
        has_reposted = !!repostCheck.data;
        has_saved = !!saveCheck.data;
      }

      return {
        likes_count: likesRes.count || 0,
        comments_count: commentsRes.count || 0,
        reposts_count: repostsRes.count || 0,
        has_liked,
        has_reposted,
        has_saved,
      };
    } catch (err) {
      console.error('Error fetching social stats:', err);
      return {
        likes_count: 0,
        comments_count: 0,
        reposts_count: 0,
        has_liked: false,
        has_reposted: false,
        has_saved: false,
      };
    }
  },
};

// Convenient standalone alias
export const toggleMemoryLike = socialInteractionsService.toggleLike.bind(socialInteractionsService);
