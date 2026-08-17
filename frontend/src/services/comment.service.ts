import { supabase } from '@/lib/supabase';
import { MemoryComment } from '@/types/social';
import { notificationsService } from './notifications.service';

export const commentService = {
  // Get all comments for a memory and construct parent-reply tree
  async getMemoryComments(
    memoryId: string,
    currentUserId?: string | null
  ): Promise<MemoryComment[]> {
    try {
      const { data, error } = await supabase
        .from('memory_comments')
        .select(`
          id,
          memory_id,
          user_id,
          parent_comment_id,
          content,
          is_deleted,
          created_at,
          updated_at,
          author:profiles(*)
        `)
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      // Fetch comment likes
      const commentIds = data.map((c) => c.id);
      let likesMap: Record<string, { count: number; userLiked: boolean }> = {};

      if (commentIds.length > 0) {
        const { data: likesData } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', commentIds);

        if (likesData) {
          likesData.forEach((l) => {
            if (!likesMap[l.comment_id]) {
              likesMap[l.comment_id] = { count: 0, userLiked: false };
            }
            likesMap[l.comment_id].count++;
            if (currentUserId && l.user_id === currentUserId) {
              likesMap[l.comment_id].userLiked = true;
            }
          });
        }
      }

      // Convert to flat list with like stats
      const flatComments: MemoryComment[] = data.map((c: any) => ({
        id: c.id,
        memory_id: c.memory_id,
        user_id: c.user_id,
        parent_comment_id: c.parent_comment_id,
        content: c.is_deleted ? '[This comment has been removed]' : c.content,
        is_deleted: c.is_deleted,
        created_at: c.created_at,
        updated_at: c.updated_at,
        author: c.author,
        likes_count: likesMap[c.id]?.count || 0,
        has_liked: likesMap[c.id]?.userLiked || false,
        replies: [],
      }));

      // Build hierarchical tree
      const rootComments: MemoryComment[] = [];
      const commentMap = new Map<string, MemoryComment>();

      flatComments.forEach((c) => {
        commentMap.set(c.id, c);
      });

      flatComments.forEach((c) => {
        if (c.parent_comment_id && commentMap.has(c.parent_comment_id)) {
          const parent = commentMap.get(c.parent_comment_id);
          parent?.replies?.push(c);
        } else {
          rootComments.push(c);
        }
      });

      return rootComments;
    } catch (err) {
      console.error('Error fetching comments:', err);
      return [];
    }
  },

  // Add Comment or Reply
  async addComment(params: {
    memoryId: string;
    userId: string;
    content: string;
    parentCommentId?: string | null;
    memoryAuthorId?: string;
    parentCommentAuthorId?: string;
    memoryTitle?: string;
  }): Promise<{ success: boolean; comment?: MemoryComment; error?: string }> {
    try {
      if (!params.content.trim()) {
        return { success: false, error: 'Comment cannot be empty.' };
      }

      const { data, error } = await supabase
        .from('memory_comments')
        .insert({
          memory_id: params.memoryId,
          user_id: params.userId,
          parent_comment_id: params.parentCommentId || null,
          content: params.content.trim(),
        })
        .select('*, author:profiles(*)')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to post comment.');
      }

      // Notify parent comment author if it's a reply
      if (params.parentCommentAuthorId && params.parentCommentAuthorId !== params.userId) {
        await notificationsService.createNotification({
          userId: params.parentCommentAuthorId,
          type: 'reply',
          title: '💬 New reply to your comment!',
          message: `Someone replied to your comment on "${params.memoryTitle || 'Heritage Story'}".`,
          memoryId: params.memoryId,
        });
      } else if (params.memoryAuthorId && params.memoryAuthorId !== params.userId) {
        // Notify memory author for top-level comment
        await notificationsService.createNotification({
          userId: params.memoryAuthorId,
          type: 'comment',
          title: '💬 New comment on your memory!',
          message: `A contributor commented on your story "${params.memoryTitle || 'Heritage Story'}".`,
          memoryId: params.memoryId,
        });
      }

      const newComment: MemoryComment = {
        ...data,
        likes_count: 0,
        has_liked: false,
        replies: [],
      };

      return { success: true, comment: newComment };
    } catch (err: any) {
      console.error('Error adding comment:', err);
      return { success: false, error: err.message || 'Failed to post comment.' };
    }
  },

  // Edit Comment
  async editComment(commentId: string, userId: string, newContent: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('memory_comments')
        .update({
          content: newContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  // Soft Delete Comment (Preserves conversation structure)
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('memory_comments')
        .update({
          is_deleted: true,
          content: '[This comment has been removed]',
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  // Toggle Comment Like
  async toggleCommentLike(
    commentId: string,
    userId: string
  ): Promise<{ liked: boolean; count: number }> {
    try {
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingLike) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);

        const count = await this.getCommentLikesCount(commentId);
        return { liked: false, count };
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: userId });

        const count = await this.getCommentLikesCount(commentId);
        return { liked: true, count };
      }
    } catch (err) {
      console.error('Error toggling comment like:', err);
      const count = await this.getCommentLikesCount(commentId);
      return { liked: false, count };
    }
  },

  async getCommentLikesCount(commentId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);
      return count || 0;
    } catch {
      return 0;
    }
  },
};
