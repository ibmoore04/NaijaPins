import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Repeat, X, MapPin, Loader2, Quote } from 'lucide-react';
import { socialInteractionsService } from '@/services/socialInteractions.service';
import { useAuth } from '@/hooks/useAuth';
import { CommunityFeedItem } from '@/types/social';

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: CommunityFeedItem | {
    id: string;
    title: string;
    slug: string;
    story: string;
    user_id: string;
    author: { full_name: string; avatar_url?: string | null };
    location?: { city: string; state: string };
    year?: number;
  };
  onSuccess?: (reposted: boolean) => void;
}

export const RepostModal: React.FC<RepostModalProps> = ({
  isOpen,
  onClose,
  memory,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInstantRepost = async () => {
    if (!user) return;
    setSubmitting(true);
    const result = await socialInteractionsService.toggleRepost(
      memory.id,
      user.id,
      null,
      memory.user_id,
      memory.title
    );
    setSubmitting(false);
    onSuccess?.(result.reposted);
    onClose();
  };

  const handleQuoteRepost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const result = await socialInteractionsService.toggleRepost(
      memory.id,
      user.id,
      comment.trim(),
      memory.user_id,
      memory.title
    );
    setSubmitting(false);
    onSuccess?.(result.reposted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <Card className="w-full max-w-lg bg-white border border-border shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/80">
          <div className="flex items-center gap-2 font-semibold text-sm text-black">
            <Repeat className="w-4 h-4 text-amber-600" />
            <span>Repost Heritage Memory</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6 space-y-5">
          {/* Quote Repost Form */}
          <form onSubmit={handleQuoteRepost} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-black mb-1.5 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-amber-600" />
                <span>Add your own reflection (optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Why are you reposting this memory? Add your perspective, personal connection, or family story..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 resize-none"
                maxLength={500}
              />
            </div>

            {/* Original Memory Preview Box */}
            <div className="p-3.5 rounded-xl border border-border bg-gray-50/70 space-y-1.5 text-left">
              <div className="flex items-center justify-between text-xs text-charcoal-muted font-medium">
                <span>Story by {memory.author?.full_name || 'Contributor'}</span>
                {memory.location?.city && (
                  <span className="flex items-center gap-1 text-primary">
                    <MapPin className="w-3 h-3" />
                    {memory.location.city}, {memory.location.state}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-black line-clamp-1">{memory.title}</h4>
              <p className="text-xs text-charcoal-dark line-clamp-2 leading-relaxed">{memory.story}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleInstantRepost}
                disabled={submitting}
                className="text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl"
              >
                Instant Repost
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="md" onClick={onClose} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submitting || !comment.trim()}
                  className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl text-xs"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Repost with Comment'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
