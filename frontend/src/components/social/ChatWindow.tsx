import React, { useState, useEffect, useRef } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { MessageBubble } from '@/components/social/MessageBubble';
import { EmojiPickerPopover } from '@/components/chat/EmojiPickerPopover';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import { MessageSearchModal } from '@/components/chat/MessageSearchModal';
import { ImageLightboxModal } from '@/components/chat/ImageLightboxModal';
import { useCall } from '@/context/CallContext';
import {
  Send,
  ArrowLeft,
  Loader2,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  X,
  Search,
  Edit2,
  CornerDownRight,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Info,
} from 'lucide-react';
import { ConversationInfoPanel } from '@/components/social/ConversationInfoPanel';
import { Message, Conversation, MessageAttachment } from '@/types/social';
import { chatService } from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';

interface ChatWindowProps {
  conversation: Conversation;
  onBack?: () => void;
  onToggleInfo?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onBack,
  onToggleInfo,
}) => {
  const { user, profile } = useAuth();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState('');
  const [sending, setSending] = useState(false);

  // Advanced features state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<{ file: File; previewUrl: string; type: 'image' | 'file' }[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Blocking State
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);

  // Modals & Popovers
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [showLocalInfoPanel, setShowLocalInfoPanel] = useState(false);

  // Realtime state
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const otherMember = conversation.other_member;
  const targetUserId = otherMember?.user_id || (otherMember as any)?.id;

  const isBlocked = isBlockedByMe || isBlockedByThem;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`message-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-emerald-50/80', 'transition-colors', 'duration-500');
      setTimeout(() => el.classList.remove('bg-emerald-50/80'), 1500);
    }
  };

  // Load block status & messages
  useEffect(() => {
    let isMounted = true;
    let unsubscribeMsgs: (() => void) | null = null;
    let unsubscribeTyping: (() => void) | null = null;
    let unsubscribePresence: (() => void) | null = null;

    const loadData = async () => {
      setLoading(true);

      // 1. Fetch Block Status
      if (user && targetUserId) {
        const blockStatus = await chatService.getBlockStatus(user.id, targetUserId);
        if (isMounted) {
          setIsBlockedByMe(blockStatus.isBlockedByMe);
          setIsBlockedByThem(blockStatus.isBlockedByThem);
        }
      }

      // 2. Fetch Messages (excluding messages deleted for current user)
      const data = await chatService.getConversationMessages(conversation.id, user?.id);
      if (!isMounted) return;
      setMessages(data);
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      if (user) {
        await chatService.markConversationAsRead(conversation.id, user.id);
      }

      if (!isMounted || !user) return;

      // 3. Realtime Messages & Reactions
      unsubscribeMsgs = chatService.subscribeToMessages(
        conversation.id,
        (newMsg) => {
          if (!isMounted) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            // Check if there is an optimistic temp message that matches this new real message
            const tempIndex = prev.findIndex(
              (m) =>
                m.id.startsWith('temp-') &&
                m.sender_id === newMsg.sender_id &&
                m.content === newMsg.content
            );

            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = newMsg;
              return updated;
            }

            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 100);

          if (user && newMsg.sender_id !== user.id) {
            chatService.markConversationAsRead(conversation.id, user.id);
          }
        },
        (updatedMsg) => {
          if (!isMounted) return;

          // If message was deleted for me, remove from view
          if (
            updatedMsg.deleted_by &&
            user &&
            Array.isArray(updatedMsg.deleted_by) &&
            updatedMsg.deleted_by.includes(user.id)
          ) {
            setMessages((prev) => prev.filter((m) => m.id !== updatedMsg.id));
            return;
          }

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
              return m;
            })
          );
        },
        (reaction, action) => {
          if (!isMounted) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === reaction.message_id) {
                const currentReactions = m.reactions || [];
                const updatedReactions =
                  action === 'added'
                    ? [...currentReactions.filter((r) => r.id !== reaction.id), reaction]
                    : currentReactions.filter((r) => r.reaction !== reaction.reaction || r.user_id !== reaction.user_id);
                return { ...m, reactions: updatedReactions };
              }
              return m;
            })
          );
        }
      );

      // 4. Realtime Typing Broadcast
      unsubscribeTyping = chatService.subscribeToTyping(conversation.id, (data) => {
        if (!isMounted || data.userId === user.id) return;
        if (data.isTyping) {
          setTypingUser(data.userName);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        } else {
          setTypingUser(null);
        }
      });

      // 5. Presence
      unsubscribePresence = chatService.subscribeToPresence(
        user.id,
        profile?.full_name || 'User',
        (onlineIds) => {
          if (!isMounted) return;
          if (targetUserId) {
            setIsOtherUserOnline(onlineIds.includes(targetUserId));
          }
        }
      );

      // 6. Realtime Block/Unblock Subscription
      if (targetUserId) {
        unsubscribeBlock = chatService.subscribeToBlockStatus(
          user.id,
          targetUserId,
          (status) => {
            if (!isMounted) return;
            setIsBlockedByMe(status.isBlockedByMe);
            setIsBlockedByThem(status.isBlockedByThem);
          }
        );
      }
    };

    let unsubscribeBlock: (() => void) | null = null;
    loadData();

    return () => {
      isMounted = false;
      if (unsubscribeMsgs) unsubscribeMsgs();
      if (unsubscribeTyping) unsubscribeTyping();
      if (unsubscribePresence) unsubscribePresence();
      if (unsubscribeBlock) unsubscribeBlock();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversation.id, user?.id, targetUserId]);

  // Handle typing broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputContent(e.target.value);
    if (user && conversation.id && !isBlocked) {
      chatService.sendTypingBroadcast(
        conversation.id,
        user.id,
        profile?.full_name?.split(' ')[0] || 'Someone',
        true
      );
    }
  };

  // Handle Attachments
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isBlocked) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const mapped = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? ('image' as const) : ('file' as const),
    }));

    setPendingAttachments((prev) => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isBlocked) return;

    if (editingMessage) {
      if (!inputContent.trim()) return;
      const success = await chatService.editMessage(editingMessage.id, inputContent.trim());
      if (success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id
              ? { ...m, content: inputContent.trim(), edited_at: new Date().toISOString() }
              : m
          )
        );
      }
      setEditingMessage(null);
      setInputContent('');
      return;
    }

    if (!inputContent.trim() && pendingAttachments.length === 0) return;

    const textToSend = inputContent.trim();
    const replyId = replyingTo?.id || null;
    setInputContent('');
    setReplyingTo(null);
    setSending(true);

    try {
      const uploadedAttachments: MessageAttachment[] = [];
      if (pendingAttachments.length > 0) {
        setUploadingAttachment(true);
        for (const item of pendingAttachments) {
          const url = await chatService.uploadAttachment(item.file, item.file.name, user.id);
          if (url) {
            uploadedAttachments.push({
              id: `att-${Date.now()}-${Math.random()}`,
              url,
              name: item.file.name,
              type: item.type,
              size: item.file.size,
            });
          }
        }
        setPendingAttachments([]);
        setUploadingAttachment(false);
      }

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: conversation.id,
        sender_id: user.id,
        content: textToSend || (uploadedAttachments[0]?.type === 'image' ? '📷 Photo' : '📎 Attachment'),
        status: 'sending',
        is_read: false,
        attachments: uploadedAttachments,
        reply_to_message_id: replyId,
        reply_to: replyingTo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          id: user.id,
          user_id: user.id,
          full_name: profile?.full_name || 'You',
          avatar_url: profile?.avatar_url || null,
          role: profile?.role || 'contributor',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(scrollToBottom, 50);

      const result = await chatService.sendMessage(conversation.id, user.id, textToSend, {
        attachments: uploadedAttachments,
        replyToId: replyId,
        senderName: profile?.full_name,
      });

      if (result.success && result.message) {
        const confirmedMsg = result.message;
        setMessages((prev) => {
          // If Realtime subscription already inserted this message, remove temp message
          if (prev.some((m) => m.id === confirmedMsg.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? { ...confirmedMsg, status: 'sent' } : m));
        });
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
        );
      }
    } finally {
      setSending(false);
    }
  };

  // Handle Voice Note Send
  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    if (!user || isBlocked) return;
    try {
      const audioUrl = await chatService.uploadAttachment(
        audioBlob,
        `voice-note-${Date.now()}.webm`,
        user.id
      );

      if (audioUrl) {
        const attachment: MessageAttachment = {
          id: `voice-${Date.now()}`,
          url: audioUrl,
          name: 'Voice Note',
          type: 'audio',
          duration,
        };

        await chatService.sendMessage(conversation.id, user.id, '🎤 Voice Note', {
          attachments: [attachment],
          messageType: 'audio',
          senderName: profile?.full_name,
        });
      }
    } finally {
      setIsVoiceRecording(false);
    }
  };

  // Handle Calling
  const handleStartCall = async (callType: 'voice' | 'video') => {
    if (!targetUserId || isBlocked) return;
    await startCall(
      conversation.id,
      {
        user_id: targetUserId,
        full_name: otherMember?.full_name || 'Contributor',
        avatar_url: otherMember?.avatar_url,
      },
      callType
    );
  };

  // Handle Block / Unblock
  const handleConfirmBlock = async () => {
    if (!targetUserId) return;
    setBlockingLoading(true);
    try {
      const success = await chatService.blockUser(targetUserId);
      if (success) {
        setIsBlockedByMe(true);
        setShowBlockConfirmModal(false);
      } else {
        alert('Failed to block user. Please try again.');
      }
    } finally {
      setBlockingLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!targetUserId) return;
    setBlockingLoading(true);
    try {
      const success = await chatService.unblockUser(targetUserId);
      if (success) {
        setIsBlockedByMe(false);
        setIsBlockedByThem(false);
        if (user) {
          const latest = await chatService.getBlockStatus(user.id, targetUserId);
          setIsBlockedByMe(latest.isBlockedByMe);
          setIsBlockedByThem(latest.isBlockedByThem);
        }
      } else {
        alert('Failed to unblock user. Please try again.');
      }
    } finally {
      setBlockingLoading(false);
    }
  };

  // Reactions & Deletions
  const handleToggleReaction = async (messageId: string, reaction: string) => {
    await chatService.toggleReaction(messageId, reaction);
  };

  const handleDeleteMessage = async (messageId: string, deleteForAll: boolean) => {
    const success = await chatService.deleteMessage(messageId, deleteForAll);
    if (success) {
      if (deleteForAll) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, is_deleted: true, content: 'This message was deleted.', attachments: [] }
              : m
          )
        );
      } else {
        // Delete for me: immediately remove from current user's local message list
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    }
  };

  // Safe deduplicated messages array for rendering
  const uniqueMessages = React.useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((msg) => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F9FAFB] min-h-0 overflow-hidden select-none font-body relative">
      {/* 1. Chat Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-black md:hidden transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => {
              if (onToggleInfo) {
                onToggleInfo();
              } else {
                setShowLocalInfoPanel(true);
              }
            }}
            className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            title="View Conversation Info"
          >
            <div className="relative shrink-0">
              <UserAvatar
                src={otherMember?.avatar_url}
                name={otherMember?.full_name || 'Contributor'}
                size="md"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                  isOtherUserOnline ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                  {otherMember?.full_name || 'Contributor'}
                </h3>
                <span className="w-3.5 h-3.5 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center text-[8px] font-bold shrink-0">✓</span>
              </div>
              <p
                className={`text-[10px] sm:text-[11px] font-semibold leading-none mt-0.5 ${
                  isBlocked
                    ? 'text-gray-400'
                    : typingUser
                    ? 'text-emerald-600'
                    : isOtherUserOnline
                    ? 'text-emerald-600'
                    : 'text-gray-400'
                }`}
              >
                {isBlocked
                  ? 'Unavailable'
                  : typingUser
                  ? `${typingUser} is typing...`
                  : isOtherUserOnline
                  ? 'Online'
                  : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2 text-gray-500">
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="p-2 rounded-full hover:bg-gray-100 hover:text-black transition-colors cursor-pointer"
            title="Search in Chat"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleStartCall('voice')}
            disabled={isBlocked}
            className="p-2 rounded-full hover:bg-gray-100 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleStartCall('video')}
            disabled={isBlocked}
            className="p-2 rounded-full hover:bg-gray-100 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 rounded-full hover:bg-gray-100 hover:text-black transition-colors cursor-pointer"
              title="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Options */}
            {showOptionsMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-2xl shadow-xl p-1.5 z-40 text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    if (onToggleInfo) {
                      onToggleInfo();
                    } else {
                      setShowLocalInfoPanel(true);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-xl hover:bg-gray-50 font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                >
                  <Info className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span>Conversation Info</span>
                </button>

                {isBlockedByMe ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      handleUnblock();
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-xl hover:bg-emerald-50 font-bold text-[#0B6B3A] flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Unblock User</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowBlockConfirmModal(true);
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-xl hover:bg-rose-50 font-bold text-rose-600 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Block User</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Messages Timeline Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-2 no-scrollbar">
        <div className="flex justify-center my-2">
          <span className="px-3 py-1 rounded-full bg-gray-200/70 text-gray-600 text-[10px] font-semibold tracking-wide">
            Today
          </span>
        </div>

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#0B6B3A] animate-spin" />
          </div>
        ) : uniqueMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-gray-400">
            <p className="text-xs font-semibold text-gray-600">Start the conversation</p>
            <p className="text-[11px] max-w-xs">
              Say hello or ask about memories from {otherMember?.full_name || 'this contributor'}.
            </p>
          </div>
        ) : (
          uniqueMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={msg.sender_id === user?.id}
              onReply={(m) => {
                setReplyingTo(m);
                setEditingMessage(null);
              }}
              onEdit={(m) => {
                setEditingMessage(m);
                setInputContent(m.content);
                setReplyingTo(null);
              }}
              onDelete={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              onImageClick={(url) => setActiveLightboxImage(url)}
              onScrollToMessage={scrollToMessage}
            />
          ))
        )}

        {/* Realtime Typing Animation */}
        {typingUser && !isBlocked && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pl-2 animate-fade-in">
            <UserAvatar src={otherMember?.avatar_url} name={otherMember?.full_name} size="sm" />
            <span className="italic text-[11px] font-medium">{typingUser} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Reply / Edit Banner Indicator */}
      {(replyingTo || editingMessage) && !isBlocked && (
        <div className="px-4 py-2 bg-emerald-50/90 border-t border-emerald-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs min-w-0">
            {editingMessage ? (
              <Edit2 className="w-4 h-4 text-[#0B6B3A] shrink-0" />
            ) : (
              <CornerDownRight className="w-4 h-4 text-[#0B6B3A] shrink-0" />
            )}
            <div className="min-w-0">
              <span className="font-bold text-gray-900 block text-[11px]">
                {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender?.full_name || 'Contributor'}`}
              </span>
              <p className="text-[10px] text-gray-600 truncate">
                {editingMessage ? editingMessage.content : replyingTo?.content}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setReplyingTo(null);
              setEditingMessage(null);
              if (editingMessage) setInputContent('');
            }}
            className="p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Blocked State Banner OR Composer */}
      {isBlockedByMe ? (
        <div className="p-4 bg-rose-50 border-t border-rose-100 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-rose-800 font-medium">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <span>You have blocked this contributor. Unblock them to send messages or start calls.</span>
          </div>
          <button
            type="button"
            onClick={handleUnblock}
            disabled={blockingLoading}
            className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            {blockingLoading ? 'Unblocking...' : 'Unblock'}
          </button>
        </div>
      ) : isBlockedByThem ? (
        <div className="p-4 bg-gray-100 border-t border-gray-200 flex items-center justify-center gap-2 text-xs text-gray-600 font-medium shrink-0">
          <Ban className="w-4 h-4 text-gray-400" />
          <span>You cannot message or call this user.</span>
        </div>
      ) : (
        <>
          {/* Pending Attachments Strip */}
          {pendingAttachments.length > 0 && (
            <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              {pendingAttachments.map((att, idx) => (
                <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                  {att.type === 'image' ? (
                    <img src={att.previewUrl} alt="Pending" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 p-1 text-center">
                      File
                    </div>
                  )}
                  <button
                    onClick={() => removePendingAttachment(idx)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Composer Input Bar */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0 relative">
            {isVoiceRecording ? (
              <VoiceRecorder
                onSendVoice={handleSendVoice}
                onCancel={() => setIsVoiceRecording(false)}
              />
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Attach Media or File"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={editingMessage ? 'Edit your message...' : 'Type a message...'}
                  value={inputContent}
                  onChange={handleInputChange}
                  disabled={sending || uploadingAttachment}
                  className="flex-1 h-10 px-4 rounded-full bg-gray-100/90 border-0 focus:bg-white focus:ring-2 focus:ring-[#0B6B3A]/30 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 font-medium transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Add Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {inputContent.trim() || pendingAttachments.length > 0 ? (
                  <button
                    type="submit"
                    disabled={sending || uploadingAttachment}
                    className="w-10 h-10 rounded-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white flex items-center justify-center shadow-xs transition-all active:scale-95 shrink-0 disabled:opacity-50 cursor-pointer"
                    title="Send Message"
                  >
                    {sending || uploadingAttachment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsVoiceRecording(true)}
                    className="w-10 h-10 rounded-full bg-emerald-50 text-[#0B6B3A] hover:bg-emerald-100 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    title="Record Voice Note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </form>
            )}

            {/* Emoji Popover */}
            {showEmojiPicker && (
              <EmojiPickerPopover
                onSelectEmoji={(emoji) => {
                  setInputContent((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
        </>
      )}

      {/* Confirmation Modal for Block User */}
      {showBlockConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-body">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4 border border-gray-100 animate-scale-up text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">Block this user?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Blocked users can't message you or start new conversations with you.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockConfirmModal(false)}
                className="py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                disabled={blockingLoading}
                className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {blockingLoading ? 'Blocking...' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Search Modal */}
      {searchModalOpen && (
        <MessageSearchModal
          conversationId={conversation.id}
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onSelectMessage={(msgId) => scrollToMessage(msgId)}
        />
      )}

      {/* Image Fullscreen Lightbox */}
      {activeLightboxImage && (
        <ImageLightboxModal
          imageUrl={activeLightboxImage}
          onClose={() => setActiveLightboxImage(null)}
        />
      )}

      {/* Standalone Conversation Info Drawer Fallback */}
      {showLocalInfoPanel && !onToggleInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowLocalInfoPanel(false)}
          />
          <div className="relative w-full max-w-sm sm:max-w-md h-full bg-white shadow-2xl z-10 animate-slide-left">
            <ConversationInfoPanel
              conversation={conversation}
              onClose={() => setShowLocalInfoPanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
