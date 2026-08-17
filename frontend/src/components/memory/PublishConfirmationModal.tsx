import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Globe, Lock, Loader2, Sparkles, X } from 'lucide-react';

interface PublishConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostToCommunity: () => void;
  onSaveToMyMemories: () => void;
  isSubmitting: boolean;
  memoryTitle: string;
}

export const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  isOpen,
  onClose,
  onPostToCommunity,
  onSaveToMyMemories,
  isSubmitting,
  memoryTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <Card className="w-full max-w-md bg-white border border-border shadow-2xl rounded-3xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/80 bg-gray-50/70">
          <div className="flex items-center gap-2 text-xs font-heading font-extrabold text-[#0B6B3A] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#0B6B3A]" />
            <span>NaijaPins Community</span>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200/60 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6 sm:p-7 space-y-6 text-center">
          {/* Visual Icon */}
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
            <Globe className="w-8 h-8 text-[#0B6B3A]" />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-black">
              Post this memory to the community?
            </h3>
            <p className="text-xs sm:text-sm text-charcoal-dark leading-relaxed max-w-sm mx-auto">
              Would you like to share this memory with the NaijaPins community feed or save it to your private memories?
            </p>
            {memoryTitle && (
              <p className="text-xs font-bold text-[#0B6B3A] bg-emerald-50/80 border border-emerald-100 rounded-xl py-1.5 px-3 truncate max-w-sm mx-auto">
                "{memoryTitle}"
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-2">
            {/* 1. Post to Community */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={onPostToCommunity}
              disabled={isSubmitting}
              leftIcon={
                isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )
              }
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-2xl shadow-xs py-3 text-sm justify-center"
            >
              {isSubmitting ? 'Saving...' : 'Post to Community'}
            </Button>

            {/* 2. Save to My Memories */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onSaveToMyMemories}
              disabled={isSubmitting}
              leftIcon={<Lock className="w-4 h-4 text-charcoal-muted" />}
              className="rounded-2xl font-bold border-border hover:bg-gray-50 text-charcoal-dark py-3 text-sm justify-center"
            >
              Save to My Memories
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
