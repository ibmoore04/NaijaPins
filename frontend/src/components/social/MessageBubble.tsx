import React, { useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Message, MessageAttachment } from '@/types/social';
import { MessageStatusIndicator } from '@/components/chat/MessageStatusIndicator';
import { MessageReactionsBar } from '@/components/chat/MessageReactionsBar';
import {
  MoreHorizontal,
  Reply,
  Edit2,
  Trash2,
  Download,
  Play,
  Pause,
  FileText,
  Smile,
  CornerDownRight,
} from 'lucide-react';
import { downloadMediaFile } from '@/lib/download';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string, deleteForAll: boolean) => void;
  onToggleReaction?: (messageId: string, reaction: string) => void;
  onImageClick?: (imageUrl: string) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onImageClick,
  onScrollToMessage,
}) => {
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const attachments: MessageAttachment[] = message.attachments || [];

  // Group reactions by emoji
  const reactionCounts = (message.reactions || []).reduce((acc: { [key: string]: number }, r) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      id={`message-${message.id}`}
      className={`group relative flex items-end gap-2.5 my-1.5 ${
        isCurrentUser ? 'justify-end' : 'justify-start'
      } animate-fade-in`}
    >
      {/* Received Avatar */}
      {!isCurrentUser && (
        <UserAvatar
          src={message.sender?.avatar_url}
          name={message.sender?.full_name}
          size="sm"
          className="mb-1 shrink-0"
        />
      )}

      {/* Message Content Container */}
      <div className="relative max-w-[85%] sm:max-w-[70%] space-y-1">
        
        {/* Reply Quote Banner */}
        {message.reply_to && (
          <button
            type="button"
            onClick={() => onScrollToMessage && onScrollToMessage(message.reply_to!.id)}
            className="w-full text-left p-2 rounded-xl bg-black/5 dark:bg-white/5 border-l-3 border-[#0B6B3A] text-xs space-y-0.5 mb-1 hover:bg-black/10 transition-colors"
          >
            <div className="flex items-center gap-1 font-bold text-[11px] text-[#0B6B3A]">
              <CornerDownRight className="w-3 h-3" />
              <span>{message.reply_to.sender?.full_name || 'Contributor'}</span>
            </div>
            <p className="text-[11px] text-gray-600 truncate font-normal">
              {message.reply_to.content}
            </p>
          </button>
        )}

        {/* Main Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed space-y-2 shadow-2xs relative ${
            isCurrentUser
              ? 'bg-[#E8F5EE] text-gray-900 rounded-tr-xs border border-emerald-100/70'
              : 'bg-white text-gray-900 rounded-tl-xs border border-gray-100'
          } ${message.is_deleted ? 'italic opacity-60' : ''}`}
        >
          {/* 1. Attachments Preview (Images, Files, Voice) */}
          {attachments.map((att, idx) => {
            if (att.type === 'image') {
              return (
                <div
                  key={idx}
                  onClick={() => onImageClick && onImageClick(att.url)}
                  className="rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity max-w-sm"
                >
                  <img src={att.url} alt="Attachment" className="w-full h-auto max-h-60 object-cover rounded-xl" />
                </div>
              );
            }

            if (att.type === 'audio') {
              return (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-emerald-50/80 border border-emerald-100">
                  <button
                    type="button"
                    onClick={() => {
                      const audio = new Audio(att.url);
                      if (isPlayingAudio) {
                        setIsPlayingAudio(false);
                      } else {
                        setIsPlayingAudio(true);
                        audio.play();
                        audio.onended = () => setIsPlayingAudio(false);
                      }
                    }}
                    className="w-8 h-8 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center shadow-xs"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-gray-900 truncate">{att.name || 'Voice Message'}</p>
                    <span className="text-[9px] text-gray-500 font-medium">{att.duration ? `${att.duration}s` : 'Audio note'}</span>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => downloadMediaFile(att.url, att.name || 'document')}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer text-left"
                title="Download Attachment"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="text-xs font-bold text-gray-800 truncate">{att.name || 'Document'}</span>
                </div>
                <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </button>
            );
          })}

          {/* 2. Text Message Content */}
          {message.content && (
            <p className="whitespace-pre-line break-words font-normal">{message.content}</p>
          )}

          {/* 3. Footer: Time, Edited tag & Receipts */}
          <div className="text-[10px] flex items-center justify-end gap-1.5 font-medium text-gray-400 pt-0.5">
            {message.edited_at && <span className="italic text-[9px] text-gray-400">(edited)</span>}
            <span>{formattedTime}</span>
            {isCurrentUser && (
              <MessageStatusIndicator
                status={message.status}
                isRead={message.is_read}
                deliveredAt={message.delivered_at}
                readAt={message.read_at}
              />
            )}
          </div>
        </div>

        {/* 4. Message Reaction Badges Row */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction && onToggleReaction(message.id, emoji)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200 shadow-2xs text-xs hover:bg-emerald-50 transition-colors"
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-bold text-gray-600">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover Quick Action Buttons */}
        <div
          className={`opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 ${
            isCurrentUser ? '-left-20' : '-right-20'
          } flex items-center gap-1 bg-white border border-gray-100 rounded-full px-1.5 py-1 shadow-sm select-none z-20`}
        >
          <button
            type="button"
            onClick={() => setShowReactionsBar(!showReactionsBar)}
            className="p-1 rounded-full text-gray-400 hover:text-[#0B6B3A] hover:bg-emerald-50 transition-colors"
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onReply && onReply(message)}
            className="p-1 rounded-full text-gray-400 hover:text-[#0B6B3A] hover:bg-emerald-50 transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
              title="Options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {showOptionsMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-2xl shadow-xl p-1.5 z-40 text-xs space-y-0.5">
                {isCurrentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onEdit && onEdit(message);
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-xl hover:bg-gray-50 font-medium flex items-center gap-2 text-gray-700"
                  >
                    <Edit2 className="w-3 h-3 text-gray-500" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    onDelete && onDelete(message.id, false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-xl hover:bg-gray-50 font-medium flex items-center gap-2 text-gray-700"
                >
                  <Trash2 className="w-3 h-3 text-gray-500" />
                  <span>Delete for me</span>
                </button>

                {isCurrentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onDelete && onDelete(message.id, true);
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-xl hover:bg-red-50 font-bold flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                    <span>Delete for all</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Reactions Bar Popover */}
        {showReactionsBar && (
          <MessageReactionsBar
            onReact={(emoji) => onToggleReaction && onToggleReaction(message.id, emoji)}
            onClose={() => setShowReactionsBar(false)}
            isCurrentUser={isCurrentUser}
          />
        )}
      </div>
    </div>
  );
};
