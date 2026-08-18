import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { MessageBubble } from '@/components/social/MessageBubble';
import { Send, ArrowLeft, Loader2, ShieldCheck, Crown } from 'lucide-react';
import { Message, Conversation } from '@/types/social';
import { chatService } from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';

interface ChatWindowProps {
  conversation: Conversation;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onBack,
}) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherMember = conversation.other_member;

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadMessages = async () => {
      setLoading(true);
      const data = await chatService.getConversationMessages(conversation.id);
      if (!isMounted) return;
      setMessages(data);
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      if (user) {
        await chatService.markConversationAsRead(conversation.id, user.id);
      }

      if (!isMounted) return;

      // Subscribe to Realtime messages (inserts and status updates)
      unsubscribe = chatService.subscribeToMessages(
        conversation.id,
        (newMsg) => {
          if (!isMounted) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 100);

          // If incoming message from other user, automatically mark read since conversation is open
          if (user && newMsg.sender_id !== user.id) {
            chatService.markConversationAsRead(conversation.id, user.id);
          }
        },
        (updatedMsg) => {
          if (!isMounted) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (updatedMsg.id && m.id === updatedMsg.id) {
                return {
                  ...m,
                  ...updatedMsg,
                  is_read: updatedMsg.is_read ?? m.is_read,
                  status: updatedMsg.status ?? m.status,
                };
              }

              // Other member read our messages
              if (updatedMsg.last_read_at && m.sender_id === user?.id) {
                const isNowRead =
                  new Date(updatedMsg.last_read_at).getTime() >=
                  new Date(m.created_at).getTime();
                if (isNowRead) {
                  return { ...m, is_read: true, status: 'read' };
                }
              }

              // Other member received our messages (delivered)
              if (updatedMsg.last_delivered_at && m.sender_id === user?.id) {
                const isNowDelivered =
                  new Date(updatedMsg.last_delivered_at).getTime() >=
                  new Date(m.created_at).getTime();
                if (isNowDelivered && m.status !== 'read') {
                  return { ...m, status: 'delivered' };
                }
              }

              return m;
            })
          );
        }
      );
    };

    loadMessages();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [conversation.id, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputContent.trim() || sending) return;

    const textToSend = inputContent.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: user.id,
      content: textToSend,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: profile || undefined,
      status: 'sending',
    };

    // Optimistically show message with 'sending' indicator
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputContent('');
    setSending(true);
    setTimeout(scrollToBottom, 50);

    const result = await chatService.sendMessage(
      conversation.id,
      user.id,
      textToSend,
      profile?.full_name || 'Contributor'
    );

    if (result.success && result.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...result.message!, status: 'sent' } : m))
      );
      setTimeout(scrollToBottom, 50);
    } else {
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    }

    setSending(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
      {/* Chat Header (Pinned at top, shrink-0) */}
      <div className="p-3.5 sm:p-4 border-b border-border bg-gray-50/70 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 rounded-lg text-charcoal-muted hover:text-black md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <Link
            to={`/profile/${otherMember?.user_id || ''}`}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <UserAvatar
              src={otherMember?.avatar_url}
              name={otherMember?.full_name || 'Contributor'}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-black group-hover:text-[#0B6B3A] transition-colors truncate">
                  {otherMember?.full_name || 'Contributor'}
                </span>
                {otherMember?.role === 'admin' && (
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
                )}
              </div>
              <span className="text-xs text-[#0B6B3A] font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> NaijaPins Contributor
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Messages Stream (Independently scrolling, min-h-0, handles any number of messages) */}
      <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-4 bg-white/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-[#0B6B3A] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-8">
            <p className="text-sm font-bold text-black">Start of your private conversation</p>
            <p className="text-xs text-charcoal-muted max-w-sm">
              Messages are secure and only visible to you and {otherMember?.full_name || 'this contributor'}.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={msg.sender_id === user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer (Pinned at bottom, shrink-0) */}
      <form
        onSubmit={handleSendMessage}
        className="p-3.5 border-t border-border bg-white flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          placeholder="Write a message..."
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-full border border-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 bg-gray-50"
          maxLength={5000}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={sending || !inputContent.trim()}
          className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white rounded-full w-9 h-9 p-0 flex items-center justify-center shadow-xs shrink-0"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
};
