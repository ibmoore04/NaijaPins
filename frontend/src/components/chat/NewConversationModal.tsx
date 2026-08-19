import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { chatService } from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';
import { Search, X, MessageSquare, Loader2, Crown } from 'lucide-react';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      const results = await chatService.searchProfiles(searchQuery, user.id);
      setUsers(results);
      setLoading(false);
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen, user?.id]);

  if (!isOpen) return null;

  const handleStartChat = async (targetUserId: string) => {
    if (!user || creating) return;
    setCreating(true);

    try {
      const convId = await chatService.getOrCreateDirectChat(user.id, targetUserId);
      if (convId) {
        onClose();
        navigate(`/messages/${convId}`);
      } else {
        alert('Could not start conversation. Please try again.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-body">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-gray-100 animate-scale-up">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">New Message</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search people by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full h-10 pl-9 pr-4 text-xs rounded-full bg-gray-100/90 border-0 focus:bg-white focus:ring-2 focus:ring-[#0B6B3A]/30 text-gray-900 placeholder:text-gray-400 font-medium transition-all"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-gray-50 no-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400">
              <Loader2 className="w-6 h-6 text-[#0B6B3A] animate-spin" />
              <span className="text-xs">Finding contributors...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-xs font-bold text-gray-800">No contributors found</p>
              <p className="text-[11px] text-gray-400">Try searching for a different name</p>
            </div>
          ) : (
            users.map((u) => (
              <button
                key={u.user_id}
                onClick={() => handleStartChat(u.user_id)}
                disabled={creating}
                className="w-full p-3 flex items-center justify-between rounded-2xl hover:bg-emerald-50/60 text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar src={u.avatar_url} name={u.full_name} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-900 truncate group-hover:text-[#0B6B3A] transition-colors">
                        {u.full_name || 'Contributor'}
                      </p>
                      {u.role === 'admin' ? (
                        <Crown className="w-3 h-3 text-amber-500 fill-amber-300 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center text-[8px] font-bold shrink-0">✓</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">
                      @{u.username || u.full_name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-[#0B6B3A] group-hover:underline shrink-0">
                  Message →
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
