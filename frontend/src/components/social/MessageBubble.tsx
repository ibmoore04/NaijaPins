import React from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Message } from '@/types/social';
import { MessageStatusIndicator } from '@/components/chat/MessageStatusIndicator';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
}) => {
  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex items-end gap-2.5 ${
        isCurrentUser ? 'justify-end' : 'justify-start'
      } animate-fade-in`}
    >
      {!isCurrentUser && (
        <UserAvatar
          src={message.sender?.avatar_url}
          name={message.sender?.full_name}
          size="sm"
          className="mb-1 shrink-0"
        />
      )}

      <div
        className={`max-w-[78%] sm:max-w-[68%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed space-y-1 shadow-2xs ${
          isCurrentUser
            ? 'bg-[#0B6B3A] text-white rounded-br-xs'
            : 'bg-gray-100 text-charcoal-dark rounded-bl-xs border border-border/60'
        }`}
      >
        <p className="whitespace-pre-line break-words">{message.content}</p>
        <div
          className={`text-[10px] flex items-center justify-end gap-1.5 font-medium ${
            isCurrentUser ? 'text-emerald-100' : 'text-charcoal-muted'
          }`}
        >
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
    </div>
  );
};
