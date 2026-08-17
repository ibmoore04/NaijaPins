import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConversationList } from '@/components/social/ConversationList';
import { ChatWindow } from '@/components/social/ChatWindow';
import { MessageSquare, Users, Compass, ArrowLeft } from 'lucide-react';
import { Conversation } from '@/types/social';
import { chatService } from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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
    };

    loadConversations();
  }, [user?.id, conversationId]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4 text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-black">
          Direct Messages
        </h2>
        <p className="text-sm text-charcoal-dark max-w-sm mx-auto">
          Sign in to your account to send private messages and connect directly with other Nigerian heritage contributors.
        </p>
        <Link to="/community">
          <Button variant="primary" className="bg-[#0B6B3A] font-semibold text-xs">
            Back to Community
          </Button>
        </Link>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === conversationId);

  return (
    <div className="h-full w-full max-w-6xl mx-auto flex flex-col min-h-0 overflow-hidden p-3 sm:p-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0B6B3A]" />
            <span>Direct Messages</span>
          </h1>
          <p className="text-xs text-charcoal-muted">
            Private conversations with fellow memory contributors.
          </p>
        </div>

        <Link to="/community">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Feed
          </Button>
        </Link>
      </div>

      {/* Main Messaging Container */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
        {/* Left Pane: Conversation List */}
        <div
          className={`md:col-span-4 h-full min-h-0 bg-white border border-border rounded-2xl overflow-hidden shadow-xs flex flex-col ${
            conversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-border bg-gray-50/80 shrink-0">
            <h3 className="text-xs font-semibold text-black">
              Conversations ({conversations.length})
            </h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <ConversationList
              conversations={conversations}
              activeConversationId={conversationId}
              onSelectConversation={(id) => navigate(`/messages/${id}`)}
              loading={loading}
            />
          </div>
        </div>

        {/* Right Pane: Active Chat Window or Empty State */}
        <div
          className={`md:col-span-8 h-full min-h-0 flex flex-col overflow-hidden ${
            !conversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConversation ? (
            <div className="w-full h-full min-h-0 flex flex-col overflow-hidden">
              <ChatWindow
                conversation={selectedConversation}
                onBack={() => navigate('/messages')}
              />
            </div>
          ) : (
            <Card className="w-full h-full min-h-0 flex flex-col items-center justify-center text-center p-8 bg-white border border-border rounded-2xl shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-semibold text-black">
                  Select a Conversation
                </h3>
                <p className="text-xs text-charcoal-muted max-w-sm mx-auto leading-relaxed">
                  Choose an existing conversation from the list on the left or visit any contributor's profile to start a new chat.
                </p>
              </div>
              <Link to="/community">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Compass className="w-4 h-4" />}
                  className="rounded-xl text-xs font-semibold"
                >
                  Discover Contributors in Community
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
