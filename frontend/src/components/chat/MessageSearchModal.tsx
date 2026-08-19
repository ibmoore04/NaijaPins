import React, { useState, useEffect } from 'react';
import { chatService } from '@/services/chat.service';
import { Message } from '@/types/social';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';

interface MessageSearchModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectMessage: (messageId: string) => void;
}

export const MessageSearchModal: React.FC<MessageSearchModalProps> = ({
  conversationId,
  isOpen,
  onClose,
  onSelectMessage,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const delay = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      const msgs = await chatService.searchConversationMessages(conversationId, query);
      setResults(msgs);
      setLoading(false);
    }, 200);

    return () => clearTimeout(delay);
  }, [query, isOpen, conversationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-body">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-gray-100 animate-scale-up">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#0B6B3A]" />
            <h3 className="font-bold text-sm text-gray-900">Search in Conversation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search words, topics, questions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full h-10 pl-9 pr-4 text-xs rounded-full bg-gray-100/90 border-0 focus:bg-white focus:ring-2 focus:ring-[#0B6B3A]/30 text-gray-900 placeholder:text-gray-400 font-medium transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-gray-50 no-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400">
              <Loader2 className="w-6 h-6 text-[#0B6B3A] animate-spin" />
              <span className="text-xs">Searching messages...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-xs font-bold text-gray-800">
                {query.trim() ? 'No matching messages found' : 'Type to search messages'}
              </p>
            </div>
          ) : (
            results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => {
                  onSelectMessage(msg.id);
                  onClose();
                }}
                className="w-full p-3 flex items-start justify-between rounded-2xl hover:bg-emerald-50/60 text-left transition-colors group cursor-pointer"
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-900">
                      {msg.sender?.full_name || 'Contributor'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 font-normal line-clamp-2">
                    {msg.content}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#0B6B3A] shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
