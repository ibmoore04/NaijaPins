import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { chatService } from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    user_id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [initialMessage, setInitialMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !initialMessage.trim()) return;

    setSubmitting(true);
    const convId = await chatService.getOrCreateDirectChat(user.id, targetUser.user_id);

    if (convId) {
      // Send initial message
      await chatService.sendMessage(
        convId,
        user.id,
        initialMessage.trim(),
        profile?.full_name || 'Contributor'
      );
      onClose();
      navigate(`/messages/${convId}`);
    } else {
      alert('Failed to start conversation. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <Card className="w-full max-w-md bg-white border border-border shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/70">
          <div className="flex items-center gap-2 font-semibold text-sm text-black">
            <MessageSquare className="w-4 h-4 text-[#0B6B3A]" />
            <span>Direct Message</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6 space-y-5">
          {/* Target User Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-border">
            <UserAvatar src={targetUser.avatar_url} name={targetUser.full_name} size="md" />
            <div>
              <h4 className="text-sm font-semibold text-black">{targetUser.full_name}</h4>
              <p className="text-xs text-charcoal-muted">NaijaPins Contributor</p>
            </div>
          </div>

          <form onSubmit={handleStartChat} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-dark mb-1.5">
                Your Message
              </label>
              <textarea
                rows={4}
                placeholder={`Say hello to ${targetUser.full_name.split(' ')[0]}...`}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 resize-none"
                required
                maxLength={5000}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || !initialMessage.trim()}
                leftIcon={submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl"
              >
                Send Message
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
