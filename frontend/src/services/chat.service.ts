import { supabase } from '@/lib/supabase';
import { Conversation, Message, MessageDeliveryStatus } from '@/types/social';
import { notificationsService } from './notifications.service';

export const chatService = {
  // Get all active conversations for a user
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      // 1. Get user's conversation memberships
      const { data: memberData, error: memErr } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId);

      if (memErr || !memberData || memberData.length === 0) {
        return [];
      }

      const convIds = memberData.map((m) => m.conversation_id);

      // 2. Fetch conversations
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      if (convErr || !convData) return [];

      // 3. For each conversation, fetch the other member and the latest message
      const conversationsWithDetails = await Promise.all(
        convData.map(async (conv) => {
          // Find other member
          const { data: otherMemberRow } = await supabase
            .from('conversation_members')
            .select('user_id, profile:profiles(*)')
            .eq('conversation_id', conv.id)
            .neq('user_id', userId)
            .maybeSingle();

          // Fetch latest message
          const { data: lastMsgRow } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Compute unread count
          const userMem = memberData.find((m) => m.conversation_id === conv.id);
          const lastRead = userMem?.last_read_at || '1970-01-01T00:00:00Z';

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .gt('created_at', lastRead);

          return {
            id: conv.id,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            other_member: (otherMemberRow?.profile as any) || null,
            last_message: (lastMsgRow as Message) || null,
            unread_count: unreadCount || 0,
          } as Conversation;
        })
      );

      return conversationsWithDetails;
    } catch (err) {
      console.error('Error in getUserConversations:', err);
      return [];
    }
  },

  // Get or Create a 1-on-1 Direct Chat between two users
  // Get or Create a 1-on-1 Direct Chat between two users using secure RPC
  async getOrCreateDirectChat(currentUserId: string, targetUserId: string): Promise<string | null> {
    try {
      if (currentUserId === targetUserId) {
        throw new Error('Cannot start a direct message with yourself.');
      }

      // 1. Call standard RPC signature
      const { data: convId, error: rpcErr } = await supabase.rpc('get_or_create_direct_conversation', {
        user_a: currentUserId,
        user_b: targetUserId,
      });

      if (!rpcErr && convId) {
        return convId as string;
      }

      // 2. Fallback to single parameter overload if needed
      if (rpcErr) {
        const { data: fallbackConvId, error: fallbackErr } = await supabase.rpc('get_or_create_direct_conversation', {
          target_user_id: targetUserId,
        });

        if (!fallbackErr && fallbackConvId) {
          return fallbackConvId as string;
        }

        console.error('Failed to get or create conversation via RPC:', rpcErr.message || fallbackErr?.message);
        throw new Error(rpcErr.message || fallbackErr?.message || 'Could not start conversation.');
      }

      return null;
    } catch (err: any) {
      console.error('Error in getOrCreateDirectChat:', err);
      return null;
    }
  },

  // Get Messages for a conversation with accurate delivery & read statuses
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      // Fetch members' last_read_at & last_delivered_at to compute real-time statuses
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id, last_read_at, last_delivered_at')
        .eq('conversation_id', conversationId);

      const messagesWithStatus: Message[] = data.map((msg) => {
        const otherMember = members?.find((m) => m.user_id !== msg.sender_id);
        const msgTime = new Date(msg.created_at).getTime();

        const isRead =
          msg.is_read ||
          Boolean(msg.read_at) ||
          Boolean(
            otherMember?.last_read_at &&
              new Date(otherMember.last_read_at).getTime() >= msgTime
          );

        const isDelivered =
          Boolean(msg.delivered_at) ||
          Boolean(
            otherMember?.last_delivered_at &&
              new Date(otherMember.last_delivered_at).getTime() >= msgTime
          );

        let status: MessageDeliveryStatus = 'sent';
        if (isRead) {
          status = 'read';
        } else if (isDelivered) {
          status = 'delivered';
        }

        return {
          ...msg,
          is_read: isRead,
          status,
        };
      });

      return messagesWithStatus;
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  },

  // Send a message
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    senderName?: string
  ): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      if (!content.trim()) {
        return { success: false, error: 'Message cannot be empty.' };
      }

      const now = new Date().toISOString();

      // 1. Insert message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content.trim(),
          is_read: false,
        })
        .select('*, sender:profiles(*)')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to send message.');
      }

      // 2. Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: now })
        .eq('id', conversationId);

      // 3. Notify receiver
      const { data: otherMember } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', senderId)
        .maybeSingle();

      if (otherMember) {
        await notificationsService.createNotification({
          userId: otherMember.user_id,
          type: 'message',
          title: '💬 New Direct Message',
          message: `${senderName || 'A contributor'}: "${content.slice(0, 45)}${content.length > 45 ? '...' : ''}"`,
        });
      }

      const fullMsg: Message = {
        ...(data as Message),
        status: 'sent',
      };

      return { success: true, message: fullMsg };
    } catch (err: any) {
      console.error('Error sending message:', err);
      return { success: false, error: err.message || 'Failed to send message.' };
    }
  },

  // Mark incoming messages as delivered (recipient client received message)
  async markConversationAsDelivered(conversationId: string, userId: string): Promise<void> {
    try {
      const { error: rpcErr } = await supabase.rpc('mark_conversation_as_delivered', {
        p_conversation_id: conversationId,
      });

      if (rpcErr) {
        // Fallback: update member record if RPC not yet deployed
        await supabase
          .from('conversation_members')
          .update({ last_delivered_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
      }
    } catch (err) {
      console.error('Error marking conversation delivered:', err);
    }
  },

  // Mark conversation as read (recipient opened conversation)
  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const { error: rpcErr } = await supabase.rpc('mark_conversation_as_read', {
        p_conversation_id: conversationId,
      });

      if (rpcErr) {
        // Fallback: direct updates
        const now = new Date().toISOString();
        await supabase
          .from('conversation_members')
          .update({ last_read_at: now, last_delivered_at: now })
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
      }
    } catch (err) {
      console.error('Error marking conversation read:', err);
    }
  },

  // Subscribe to Realtime Messages (INSERT & UPDATE for delivered/read receipts)
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void,
    onMessageUpdate?: (message: Partial<Message> & { id?: string; conversation_id?: string; last_read_at?: string; last_delivered_at?: string }) => void
  ) {
    const channelName = `room:${conversationId}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender profile for the new message
          const { data: senderProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', payload.new.sender_id)
            .single();

          const fullMessage: Message = {
            ...(payload.new as Message),
            sender: senderProf || undefined,
            status: payload.new.is_read ? 'read' : payload.new.delivered_at ? 'delivered' : 'sent',
          };
          onMessage(fullMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (onMessageUpdate && payload.new) {
            const isRead = Boolean(payload.new.is_read || payload.new.read_at);
            const isDelivered = Boolean(payload.new.delivered_at);
            onMessageUpdate({
              ...(payload.new as any),
              is_read: isRead,
              status: isRead ? 'read' : isDelivered ? 'delivered' : 'sent',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (onMessageUpdate && payload.new) {
            onMessageUpdate({
              conversation_id: conversationId,
              last_read_at: payload.new.last_read_at,
              last_delivered_at: payload.new.last_delivered_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  // Get total unread messages count across all conversations
  async getTotalUnreadMessagesCount(userId: string): Promise<number> {
    try {
      const conversations = await this.getUserConversations(userId);
      return conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
    } catch {
      return 0;
    }
  },
};
