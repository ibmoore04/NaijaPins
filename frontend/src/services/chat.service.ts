import { supabase } from '@/lib/supabase';
import {
  Conversation,
  Message,
  MessageDeliveryStatus,
  MessageAttachment,
  MessageReaction,
} from '@/types/social';
import { notificationsService } from './notifications.service';

export const chatService = {
  // 1. Get all active conversations for a user
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data: memberData, error: memErr } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at, is_muted')
        .eq('user_id', userId);

      if (memErr || !memberData || memberData.length === 0) {
        return [];
      }

      const convIds = memberData.map((m) => m.conversation_id);

      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      if (convErr || !convData) return [];

      const conversationsWithDetails = await Promise.all(
        convData.map(async (conv) => {
          const { data: otherMemberRow } = await supabase
            .from('conversation_members')
            .select('user_id, profile:profiles(*)')
            .eq('conversation_id', conv.id)
            .neq('user_id', userId)
            .maybeSingle();

          const { data: lastMsgRow } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

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
            is_muted: userMem?.is_muted || false,
          } as Conversation;
        })
      );

      return conversationsWithDetails;
    } catch (err) {
      console.error('Error in getUserConversations:', err);
      return [];
    }
  },

  // 2. Get or Create Direct Chat using start_direct_conversation RPC
  async getOrCreateDirectChat(currentUserId: string, targetUserId: string): Promise<string | null> {
    try {
      if (currentUserId === targetUserId) {
        throw new Error('Cannot start a direct message with yourself.');
      }

      // Primary: start_direct_conversation
      const { data: convId, error: rpcErr } = await supabase.rpc('start_direct_conversation', {
        p_target_user_id: targetUserId,
      });

      if (!rpcErr && convId) {
        return convId as string;
      }

      // Secondary fallback: get_or_create_direct_conversation
      const { data: fallbackConvId, error: fallbackErr } = await supabase.rpc('get_or_create_direct_conversation', {
        p_other_user_id: targetUserId,
      });

      if (!fallbackErr && fallbackConvId) {
        return fallbackConvId as string;
      }

      console.error('Failed to get/create conversation:', rpcErr?.message || fallbackErr?.message);
      return null;
    } catch (err: any) {
      console.error('Error in getOrCreateDirectChat:', err);
      return null;
    }
  },

  // 3. Get Messages for a conversation
  async getConversationMessages(conversationId: string, currentUserId?: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(*), reply_to:reply_to_message_id(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      // Filter out messages deleted for current user
      const visibleData = currentUserId
        ? data.filter((msg) => !msg.deleted_by || !Array.isArray(msg.deleted_by) || !msg.deleted_by.includes(currentUserId))
        : data;

      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id, last_read_at, last_delivered_at')
        .eq('conversation_id', conversationId);

      const msgIds = visibleData.map((m) => m.id);
      const { data: reactionsData } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', msgIds);

      const messagesWithStatus: Message[] = visibleData.map((msg) => {
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

        const msgReactions = (reactionsData || []).filter((r) => r.message_id === msg.id);

        return {
          ...msg,
          is_read: isRead,
          status,
          reactions: msgReactions,
          attachments: msg.attachments || [],
        };
      });

      return messagesWithStatus;
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  },

  // 4. Send Message with attachments, reply_to, and message_type
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    options?: {
      attachments?: MessageAttachment[];
      replyToId?: string | null;
      messageType?: 'text' | 'image' | 'audio' | 'file' | 'call';
      senderName?: string;
    }
  ): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      const trimmed = content.trim();
      const attachments = options?.attachments || [];
      if (!trimmed && attachments.length === 0) {
        return { success: false, error: 'Message cannot be empty.' };
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: trimmed || (attachments[0]?.type === 'image' ? '📷 Photo' : attachments[0]?.type === 'audio' ? '🎤 Voice message' : '📎 File'),
          attachments: attachments,
          reply_to_message_id: options?.replyToId || null,
          message_type: options?.messageType || (attachments.length > 0 ? attachments[0].type : 'text'),
          is_read: false,
        })
        .select('*, sender:profiles(*), reply_to:reply_to_message_id(*)')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to send message.');
      }

      await supabase
        .from('conversations')
        .update({ updated_at: now })
        .eq('id', conversationId);

      const { data: otherMember } = await supabase
        .from('conversation_members')
        .select('user_id, is_muted')
        .eq('conversation_id', conversationId)
        .neq('user_id', senderId)
        .maybeSingle();

      if (otherMember && !otherMember.is_muted) {
        await notificationsService.createNotification({
          userId: otherMember.user_id,
          type: 'message',
          title: '💬 New Direct Message',
          message: `${options?.senderName || 'A contributor'}: "${content.slice(0, 45)}${content.length > 45 ? '...' : ''}"`,
        });
      }

      const fullMsg: Message = {
        ...(data as Message),
        status: 'sent',
        reactions: [],
      };

      return { success: true, message: fullMsg };
    } catch (err: any) {
      console.error('Error sending message:', err);
      return { success: false, error: err.message || 'Failed to send message.' };
    }
  },

  // 5. Edit Message (using edit_my_message RPC)
  async editMessage(messageId: string, newContent: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('edit_my_message', {
        p_message_id: messageId,
        p_content: newContent,
      });

      if (error) {
        // Fallback update
        await supabase
          .from('messages')
          .update({ content: newContent.trim(), edited_at: new Date().toISOString() })
          .eq('id', messageId);
      }
      return true;
    } catch (err) {
      console.error('Error editing message:', err);
      return false;
    }
  },

  // 6. Delete Message (using delete_my_message RPC with fallbacks)
  async deleteMessage(messageId: string, deleteForAll: boolean = false): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('delete_my_message', {
        p_message_id: messageId,
        p_delete_for_all: deleteForAll,
      });

      if (error) {
        if (deleteForAll) {
          await supabase
            .from('messages')
            .update({
              is_deleted: true,
              deleted_for_all: true,
              content: 'This message was deleted.',
              attachments: [],
            })
            .eq('id', messageId);
        } else {
          // Delete for me fallback
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            const { data: msgRow } = await supabase
              .from('messages')
              .select('deleted_by')
              .eq('id', messageId)
              .single();

            const currentDeletedBy: string[] = msgRow?.deleted_by || [];
            if (!currentDeletedBy.includes(authData.user.id)) {
              await supabase
                .from('messages')
                .update({ deleted_by: [...currentDeletedBy, authData.user.id] })
                .eq('id', messageId);
            }
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      return false;
    }
  },

  // 7. Toggle Message Reaction (using toggle_my_message_reaction RPC)
  async toggleReaction(messageId: string, reaction: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('toggle_my_message_reaction', {
        p_message_id: messageId,
        p_reaction: reaction,
      });
      return !error;
    } catch (err) {
      console.error('Error toggling reaction:', err);
      return false;
    }
  },

  // 8. Toggle Mute Conversation (using toggle_my_conversation_mute RPC)
  async toggleMuteConversation(conversationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('toggle_my_conversation_mute', {
        p_conversation_id: conversationId,
      });
      return !error && Boolean(data);
    } catch (err) {
      console.error('Error toggling mute:', err);
      return false;
    }
  },

  // 9. Block / Unblock User
  async blockUser(targetUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('block_my_user', {
        p_target_user_id: targetUserId,
      });

      if (error) {
        // Fallback direct insert
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          await supabase.from('blocked_users').insert({
            blocker_id: authData.user.id,
            blocked_user_id: targetUserId,
          });
        }
      }
      return true;
    } catch (err) {
      console.error('Error blocking user:', err);
      return false;
    }
  },

  async unblockUser(targetUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('unblock_my_user', {
        p_target_user_id: targetUserId,
      });

      if (error) {
        // Fallback direct delete
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          await supabase
            .from('blocked_users')
            .delete()
            .eq('blocker_id', authData.user.id)
            .eq('blocked_user_id', targetUserId);
        }
      }
      return true;
    } catch (err) {
      console.error('Error unblocking user:', err);
      return false;
    }
  },

  // Check detailed blocking relationships
  async getBlockStatus(currentUserId: string, targetUserId: string): Promise<{ isBlockedByMe: boolean; isBlockedByThem: boolean }> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocker_id, blocked_user_id')
        .or(`and(blocker_id.eq.${currentUserId},blocked_user_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_user_id.eq.${currentUserId})`);

      if (error || !data) return { isBlockedByMe: false, isBlockedByThem: false };

      const isBlockedByMe = data.some((r) => r.blocker_id === currentUserId && r.blocked_user_id === targetUserId);
      const isBlockedByThem = data.some((r) => r.blocker_id === targetUserId && r.blocked_user_id === currentUserId);

      return { isBlockedByMe, isBlockedByThem };
    } catch {
      return { isBlockedByMe: false, isBlockedByThem: false };
    }
  },

  // 10. Update Last Seen (using update_my_last_seen RPC)
  async updateLastSeen(): Promise<void> {
    try {
      await supabase.rpc('update_my_last_seen');
    } catch (err) {
      console.error('Error updating last seen:', err);
    }
  },

  async isUserBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
    const status = await this.getBlockStatus(currentUserId, targetUserId);
    return status.isBlockedByMe || status.isBlockedByThem;
  },

  // Calls Management
  async createCallRecord(
    conversationId: string,
    callerId: string,
    receiverId: string,
    callType: 'voice' | 'video'
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversationId,
          caller_id: callerId,
          receiver_id: receiverId,
          call_type: callType,
          status: 'ringing',
        })
        .select('id')
        .single();

      if (error || !data) return null;
      return data.id;
    } catch {
      return null;
    }
  },

  async updateCallRecord(
    callId: string,
    updates: {
      status?: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'cancelled';
      answered_at?: string;
      ended_at?: string;
      ended_by?: string;
      duration_seconds?: number;
    }
  ): Promise<void> {
    try {
      await supabase.from('calls').update(updates).eq('id', callId);
    } catch (err) {
      console.error('Error updating call record:', err);
    }
  },

  // 11. Search Conversation Messages
  async searchConversationMessages(conversationId: string, query: string): Promise<Message[]> {
    try {
      if (!query.trim()) return [];
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('conversation_id', conversationId)
        .ilike('content', `%${query.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      return (data as Message[]) || [];
    } catch {
      return [];
    }
  },

  // 12. Search Discoverable Profiles for New Chat
  async searchProfiles(query: string, currentUserId: string): Promise<any[]> {
    try {
      const q = query.trim().toLowerCase();
      let req = supabase
        .from('profiles')
        .select('*')
        .neq('user_id', currentUserId)
        .limit(10);

      if (q) {
        req = req.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
      }

      const { data } = await req;
      return data || [];
    } catch {
      return [];
    }
  },

  // 13. Upload File / Voice Audio to Supabase Storage
  async uploadAttachment(file: File | Blob, fileName: string, userId: string): Promise<string | null> {
    try {
      const fileExt = fileName.split('.').pop() || 'bin';
      const cleanPath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(cleanPath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error || !data) {
        console.error('Storage upload error:', error);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(cleanPath);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Error uploading chat attachment:', err);
      return null;
    }
  },

  // 14. Mark Delivered / Read Checkpoints
  async markConversationAsDelivered(conversationId: string, _userId?: string): Promise<void> {
    try {
      await supabase.rpc('mark_conversation_as_delivered', {
        p_conversation_id: conversationId,
      });
    } catch (err) {
      console.error('Error marking conversation delivered:', err);
    }
  },

  async markConversationAsRead(conversationId: string, _userId?: string): Promise<void> {
    try {
      await supabase.rpc('mark_conversation_as_read', {
        p_conversation_id: conversationId,
      });
    } catch (err) {
      console.error('Error marking conversation read:', err);
    }
  },

  // 15. Realtime Subscription for Messages, Updates, and Reactions
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void,
    onMessageUpdate?: (message: Partial<Message> & { id?: string; conversation_id?: string; last_read_at?: string; last_delivered_at?: string }) => void,
    onReactionChange?: (reaction: MessageReaction, action: 'added' | 'removed') => void
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
          const { data: senderProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', payload.new.sender_id)
            .single();

          const fullMessage: Message = {
            ...(payload.new as Message),
            sender: senderProf || undefined,
            status: payload.new.is_read ? 'read' : payload.new.delivered_at ? 'delivered' : 'sent',
            reactions: [],
            attachments: payload.new.attachments || [],
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
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          if (onReactionChange) {
            if (payload.eventType === 'INSERT') {
              onReactionChange(payload.new as MessageReaction, 'added');
            } else if (payload.eventType === 'DELETE') {
              onReactionChange(payload.old as MessageReaction, 'removed');
            }
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

  // 16. Realtime Online Presence Tracker with heartbeat
  subscribeToPresence(
    currentUserId: string,
    userName: string,
    onPresenceChange: (onlineUserIds: string[]) => void
  ) {
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = Object.keys(state);
        onPresenceChange(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: currentUserId,
            name: userName,
            online_at: new Date().toISOString(),
          });
          // Update last_seen_at in DB
          chatService.updateLastSeen();
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  },

  // 17. Realtime Typing Broadcast
  subscribeToTyping(
    conversationId: string,
    onTyping: (data: { userId: string; userName: string; isTyping: boolean }) => void
  ) {
    const channelName = `typing:${conversationId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        onTyping(payload.payload);
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore unmount errors
      }
    };
  },

  sendTypingBroadcast(
    conversationId: string,
    userId: string,
    userName: string,
    isTyping: boolean
  ) {
    const channelName = `typing:${conversationId}`;
    // Reuse channel or create once
    const channel = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`) || supabase.channel(channelName);
    
    if (channel.state === 'joined') {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, userName, isTyping },
      });
    } else {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId, userName, isTyping },
          });
        }
      });
    }
  },

  // 18. Get total unread count
  async getTotalUnreadMessagesCount(userId: string): Promise<number> {
    try {
      const conversations = await this.getUserConversations(userId);
      return conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
    } catch {
      return 0;
    }
  },
};
