import { supabase } from '@/lib/supabase';
import { Conversation, Message } from '@/types/social';
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

  // Get Messages for a conversation
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];
      return data as Message[];
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

      return { success: true, message: data as Message };
    } catch (err: any) {
      console.error('Error sending message:', err);
      return { success: false, error: err.message || 'Failed to send message.' };
    }
  },

  // Mark conversation as read
  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error marking conversation read:', err);
    }
  },

  // Subscribe to Realtime Messages
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void
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
          };
          onMessage(fullMessage);
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
