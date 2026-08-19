import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ConversationList } from '@/components/social/ConversationList';
import { ChatWindow } from '@/components/social/ChatWindow';
import { ConversationInfoPanel } from '@/components/social/ConversationInfoPanel';
import { NewConversationModal } from '@/components/chat/NewConversationModal';
import { MessageSquare } from 'lucide-react';
import { Conversation } from '@/types/social';
import { chatService } from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [newMsgModalOpen, setNewMsgModalOpen] = useState(false);

  useEffect(() => {
    const loadConversations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const list = await chatService.getUserConversations(user.id);
      setConversations(list);
      setLoading(false);

      // Auto-select first conversation if none selected on desktop
      if (!conversationId && list.length > 0 && window.innerWidth >= 768) {
        navigate(`/messages/${list[0].id}`, { replace: true });
      }
    };

    loadConversations();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gray-50 font-body">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center shadow-inner">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Direct Messages</h2>
        <p className="text-xs sm:text-sm text-gray-500 max-w-sm">
          Sign in to start private conversations with Nigerian heritage contributors.
        </p>
        <Link
          to="/login"
          className="px-6 py-2.5 rounded-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white text-xs font-bold shadow-md transition-all"
        >
          Sign In to Chat
        </Link>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === conversationId) || conversations[0];

  return (
    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden bg-white font-body">
      {/* Main 3-Pane Messaging Workspace */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        
        {/* Pane 1: Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 h-full border-r border-gray-200 flex flex-col shrink-0 ${
            conversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ConversationList
            conversations={conversations}
            activeConversationId={selectedConversation?.id}
            onSelectConversation={(id) => navigate(`/messages/${id}`)}
            onNewMessage={() => setNewMsgModalOpen(true)}
            loading={loading}
          />
        </div>

        {/* Pane 2: Active Chat Window */}
        <div
          className={`flex-1 h-full flex flex-col min-w-0 min-h-0 ${
            !conversationId && conversations.length > 0 ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              onBack={() => navigate('/messages')}
              onToggleInfo={() => setShowInfoPanel(!showInfoPanel)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2 text-gray-400 bg-[#F9FAFB]">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-gray-800">No conversation selected</p>
              <p className="text-xs text-gray-500 max-w-xs">
                Select a contributor from the list on the left to start messaging.
              </p>
            </div>
          )}
        </div>

        {/* Pane 3: Conversation Info Panel (Desktop Right Side) */}
        {selectedConversation && showInfoPanel && (
          <div className="hidden lg:block h-full shrink-0">
            <ConversationInfoPanel
              conversation={selectedConversation}
              onClose={() => setShowInfoPanel(false)}
            />
          </div>
        )}
      </div>

      {/* New Conversation Modal with real search */}
      {newMsgModalOpen && (
        <NewConversationModal
          isOpen={newMsgModalOpen}
          onClose={() => setNewMsgModalOpen(false)}
        />
      )}
    </div>
  );
};
