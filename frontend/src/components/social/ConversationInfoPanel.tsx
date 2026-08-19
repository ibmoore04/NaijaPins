import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Conversation, MessageAttachment } from '@/types/social';
import { chatService } from '@/services/chat.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  X,
  User,
  Bell,
  BellOff,
  Search,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface ConversationInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
  onOpenSearch?: () => void;
}

export const ConversationInfoPanel: React.FC<ConversationInfoPanelProps> = ({
  conversation,
  onClose,
  onOpenSearch,
}) => {
  const { user } = useAuth();
  const member = conversation.other_member;
  const targetUserId = member?.user_id || (member as any)?.id;
  const username = member?.full_name?.toLowerCase().replace(/\s+/g, '') || 'contributor';

  const [isMuted, setIsMuted] = useState(conversation.is_muted || false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [mediaItems, setMediaItems] = useState<MessageAttachment[]>([]);
  const [sharedMemories, setSharedMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    const fetchInfoData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Block Status
        if (user && targetUserId) {
          const status = await chatService.getBlockStatus(user.id, targetUserId);
          setIsBlocked(status.isBlockedByMe);
        }

        // 2. Fetch real attachments from messages
        const { data: msgRows } = await supabase
          .from('messages')
          .select('attachments, content')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false });

        const extractedMedia: MessageAttachment[] = [];
        if (msgRows) {
          msgRows.forEach((row) => {
            if (row.attachments && Array.isArray(row.attachments)) {
              row.attachments.forEach((att: any) => extractedMedia.push(att));
            }
          });
        }
        setMediaItems(extractedMedia);

        // 3. Fetch shared memories by this contributor
        if (targetUserId) {
          const { data: memRows } = await supabase
            .from('memories')
            .select('id, title, slug, media:memory_media(*)')
            .eq('user_id', targetUserId)
            .eq('status', 'published')
            .limit(4);

          setSharedMemories(memRows || []);
        }
      } catch (err) {
        console.error('Error fetching conversation info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInfoData();
  }, [conversation.id, user?.id, targetUserId]);

  const handleToggleMute = async () => {
    const newState = await chatService.toggleMuteConversation(conversation.id);
    setIsMuted(newState);
  };

  const handleConfirmBlock = async () => {
    if (!targetUserId) return;
    setBlocking(true);
    const success = await chatService.blockUser(targetUserId);
    setBlocking(false);
    setShowBlockModal(false);
    if (success) {
      setIsBlocked(true);
    }
  };

  const handleUnblock = async () => {
    if (!targetUserId) return;
    setBlocking(true);
    const success = await chatService.unblockUser(targetUserId);
    setBlocking(false);
    if (success) {
      setIsBlocked(false);
    }
  };

  const imageAttachments = mediaItems.filter((m) => m.type === 'image');

  return (
    <div className="w-72 xl:w-80 h-full bg-white border-l border-gray-100 flex flex-col overflow-y-auto no-scrollbar select-none animate-fade-in font-body">
      {/* Header with Close button */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold text-gray-900">Conversation Info</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1">
        {/* Contributor Profile Card */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative">
            <UserAvatar
              src={member?.avatar_url}
              name={member?.full_name || 'Contributor'}
              size="xl"
              className="ring-4 ring-emerald-50 shadow-sm"
            />
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1">
              <h4 className="text-sm font-bold text-gray-900">{member?.full_name || 'Contributor'}</h4>
              <span className="w-3.5 h-3.5 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center text-[8px] font-bold">✓</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">@{username}</p>
            <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Online</p>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-50 text-center">
          <Link
            to={`/profile/${targetUserId || ''}`}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:text-[#0B6B3A] group-hover:bg-emerald-50 transition-colors">
              <User className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-gray-600">Profile</span>
          </Link>

          <button
            type="button"
            onClick={handleToggleMute}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600 group-hover:text-[#0B6B3A] group-hover:bg-emerald-50'
            }`}>
              {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </div>
            <span className="text-[10px] font-medium text-gray-600">
              {isMuted ? 'Muted' : 'Mute'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:text-[#0B6B3A] group-hover:bg-emerald-50 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-gray-600">Search</span>
          </button>

          <button
            type="button"
            onClick={() => alert(`Direct conversation with ${member?.full_name || 'user'}`)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:text-[#0B6B3A] group-hover:bg-emerald-50 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-gray-600">More</span>
          </button>
        </div>

        {/* Media, Links & Files Section */}
        <div className="space-y-2 pt-2 border-t border-gray-50">
          <div className="flex items-center justify-between text-xs font-bold text-gray-900">
            <span>Media, Links & Files</span>
            <span className="text-[11px] text-gray-400 font-normal">{mediaItems.length} items</span>
          </div>

          {loading ? (
            <div className="py-4 text-center">
              <Loader2 className="w-4 h-4 text-[#0B6B3A] animate-spin mx-auto" />
            </div>
          ) : imageAttachments.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {imageAttachments.slice(0, 4).map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                >
                  <img src={att.url} alt="Media" className="w-full h-full object-cover" />
                </a>
              ))}
              {imageAttachments.length > 4 && (
                <div className="aspect-square rounded-lg bg-gray-800 text-white flex items-center justify-center text-xs font-bold">
                  +{imageAttachments.length - 4}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 italic py-1">No shared media yet</p>
          )}
        </div>

        {/* Shared Memories Section */}
        <div className="space-y-2 pt-2 border-t border-gray-50">
          <div className="flex items-center justify-between text-xs font-bold text-gray-900">
            <span>Shared Memories</span>
            <span className="text-[11px] text-gray-400 font-normal">{sharedMemories.length}</span>
          </div>

          {sharedMemories.length > 0 ? (
            <div className="space-y-1.5">
              {sharedMemories.map((mem) => (
                <Link
                  key={mem.id}
                  to={`/memory/${mem.slug}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-800 hover:text-[#0B6B3A] transition-colors"
                >
                  <span className="text-xs font-semibold truncate">{mem.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 italic py-1">No memories pinned by user yet</p>
          )}
        </div>

        {/* Notifications Setting */}
        <div className="space-y-1 pt-2 border-t border-gray-50">
          <button
            type="button"
            onClick={handleToggleMute}
            className="w-full flex items-center justify-between text-xs font-bold text-gray-900 py-1.5 hover:text-[#0B6B3A] transition-colors cursor-pointer"
          >
            <span>Notifications</span>
            <span className="text-[11px] text-gray-400 font-normal">
              {isMuted ? 'Muted' : 'All messages >'}
            </span>
          </button>
        </div>

        {/* Block / Unblock User Action */}
        <div className="pt-3 border-t border-gray-50">
          {isBlocked ? (
            <button
              type="button"
              onClick={handleUnblock}
              disabled={blocking}
              className="flex items-center gap-2 text-xs font-bold text-[#0B6B3A] hover:text-[#064D2A] transition-colors w-full disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{blocking ? 'Unblocking...' : 'Unblock User'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowBlockModal(true)}
              disabled={blocking}
              className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors w-full disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{blocking ? 'Blocking...' : 'Block User'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showBlockModal && (
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
                onClick={() => setShowBlockModal(false)}
                className="py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                disabled={blocking}
                className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {blocking ? 'Blocking...' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
