import React, { useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Conversation } from '@/types/social';
import {
  Edit,
  Filter,
  Search,
} from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewMessage?: () => void;
  loading?: boolean;
}

type FilterTab = 'all' | 'unread' | 'groups';

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewMessage,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Active top contacts strip
  const activeContacts = conversations.slice(0, 8);

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.other_member?.full_name?.toLowerCase() || '';
    const lastMsg = conv.last_message?.content?.toLowerCase() || '';
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || name.includes(q) || lastMsg.includes(q);

    if (!matchesSearch) return false;

    if (filterTab === 'unread') {
      return (conv.unread_count || 0) > 0;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* 1. Header with New Message & Filter Controls */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="text-base font-bold text-gray-900">Messages</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewMessage}
            className="p-2 rounded-full text-gray-500 hover:text-[#0B6B3A] hover:bg-emerald-50 transition-colors"
            title="New Conversation"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFilterTab(filterTab === 'all' ? 'unread' : 'all')}
            className="p-2 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
            title="Filter Conversations"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Search Input */}
      <div className="px-4 py-2.5 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 text-xs rounded-full bg-gray-100/90 border-0 focus:bg-white focus:ring-2 focus:ring-[#0B6B3A]/30 text-gray-900 placeholder:text-gray-400 font-medium transition-all"
          />
        </div>
      </div>

      {/* 3. Active Contacts Avatar Row */}
      {activeContacts.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100 overflow-x-auto scrollbar-none shrink-0 bg-white">
          <div className="flex items-center gap-3 min-w-max">
            {activeContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                className="flex flex-col items-center gap-1 group focus:outline-none"
              >
                <div className="relative">
                  <UserAvatar
                    src={c.other_member?.avatar_url}
                    name={c.other_member?.full_name || 'User'}
                    size="md"
                    className="ring-2 ring-emerald-500/20 group-hover:ring-[#0B6B3A] transition-all"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 truncate max-w-[48px] text-center">
                  {c.other_member?.full_name?.split(' ')[0] || 'User'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filter Pills (All, Unread, Groups) */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 shrink-0 bg-gray-50/50">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterTab === 'all'
              ? 'bg-[#0B6B3A] text-white shadow-2xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All
        </button>

        <button
          onClick={() => setFilterTab('unread')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterTab === 'unread'
              ? 'bg-[#0B6B3A] text-white shadow-2xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>Unread</span>
          {totalUnread > 0 && (
            <span
              className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                filterTab === 'unread'
                  ? 'bg-white text-[#0B6B3A]'
                  : 'bg-[#0B6B3A] text-white'
              }`}
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilterTab('groups')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterTab === 'groups'
              ? 'bg-[#0B6B3A] text-white shadow-2xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Groups
        </button>
      </div>

      {/* 5. Conversation Items Stream */}
      <div className="divide-y divide-gray-100 overflow-y-auto flex-1 no-scrollbar">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading chats...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-xs font-bold text-gray-700">No conversations</p>
            <p className="text-[11px] text-gray-400">Search for members to start messaging</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const otherMember = conv.other_member;
            const lastMsg = conv.last_message;

            const timeStr = lastMsg?.created_at
              ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-3.5 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 ${
                  isActive ? 'bg-[#E8F5EE]/60 border-l-4 border-[#0B6B3A]' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <UserAvatar
                    src={otherMember?.avatar_url}
                    name={otherMember?.full_name || 'Contributor'}
                    size="md"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {otherMember?.full_name || 'Contributor'}
                      </span>
                      <span className="w-3 h-3 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center text-[7px] font-bold shrink-0">✓</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium shrink-0">{timeStr}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] text-gray-600 truncate font-normal">
                      {lastMsg?.content || 'Started a conversation'}
                    </p>

                    {(conv.unread_count || 0) > 0 && (
                      <span className="min-w-4 h-4 px-1 rounded-full bg-[#0B6B3A] text-white text-[10px] font-bold flex items-center justify-center shadow-xs shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
