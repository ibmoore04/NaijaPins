import React from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Conversation } from '@/types/social';
import { MessageSquare, Crown } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation: (conversationId: string) => void;
  loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="divide-y divide-border/60">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="w-24 h-3 bg-gray-200 rounded" />
              <div className="w-40 h-2.5 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-black">No messages yet</p>
          <p className="text-xs text-charcoal-muted max-w-[200px] mx-auto">
            Connect with Nigerian heritage contributors and start a conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 overflow-y-auto">
      {conversations.map((conv) => {
        const isActive = conv.id === activeConversationId;
        const otherMember = conv.other_member;
        const lastMsg = conv.last_message;

        const timeStr = lastMsg?.created_at
          ? new Date(lastMsg.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            })
          : '';

        return (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 ${
              isActive ? 'bg-emerald-50/70 border-l-4 border-[#0B6B3A]' : ''
            }`}
          >
            <div className="relative">
              <UserAvatar
                src={otherMember?.avatar_url}
                name={otherMember?.full_name || 'Contributor'}
                size="md"
              />
              {(conv.unread_count || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0B6B3A] text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-xs">
                  {conv.unread_count}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-black truncate">
                    {otherMember?.full_name || 'Contributor'}
                  </span>
                  {otherMember?.role === 'admin' && (
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-300 shrink-0" />
                  )}
                </div>
                <span className="text-[10px] text-charcoal-muted shrink-0">{timeStr}</span>
              </div>

              <p className="text-xs text-charcoal-dark truncate font-normal">
                {lastMsg?.content || 'Started a conversation'}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
