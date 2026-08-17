import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'reply'
  | 'repost'
  | 'follow'
  | 'message'
  | 'submission'
  | 'approval'
  | 'rejection'
  | 'report_update'
  | 'announcement';

export interface NotificationItemData {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  memory_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationItem = NotificationItemData;

export const notificationsService = {
  async getNotifications(userId: string): Promise<NotificationItemData[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error.message);
        return [];
      }

      return (data || []) as NotificationItemData[];
    } catch (err) {
      console.error('Error in getNotifications:', err);
      return [];
    }
  },

  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    memoryId?: string | null;
  }): Promise<boolean> {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        memory_id: params.memoryId || null,
      });

      return !error;
    } catch {
      return false;
    }
  },

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      return !error;
    } catch {
      return false;
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },
};
