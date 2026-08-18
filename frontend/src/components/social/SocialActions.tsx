import React, { useState } from 'react';
import { Heart, MessageSquare, Repeat, Bookmark, Share2 } from 'lucide-react';
import { socialInteractionsService } from '@/services/socialInteractions.service';
import { useAuth } from '@/hooks/useAuth';

interface SocialActionsProps {
  memoryId: string;
  authorId: string;
  memoryTitle?: string;
  memorySlug?: string;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  hasLiked?: boolean;
  hasReposted?: boolean;
  hasSaved?: boolean;
  onCommentClick?: () => void;
  onRepostClick?: () => void;
  onShareClick?: () => void;
  onRequireAuth?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SocialActions: React.FC<SocialActionsProps> = ({
  memoryId,
  authorId,
  memoryTitle,
  likesCount: initialLikesCount,
  commentsCount,
  repostsCount,
  hasLiked: initialHasLiked = false,
  hasReposted = false,
  hasSaved: initialHasSaved = false,
  onCommentClick,
  onRepostClick,
  onShareClick,
  onRequireAuth,
  size = 'md',
  className = '',
}) => {
  const { user } = useAuth();

  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [hasSaved, setHasSaved] = useState(initialHasSaved);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      onRequireAuth ? onRequireAuth() : alert('Please log in to like memories.');
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    // Optimistic UI update
    const previousLiked = hasLiked;
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const result = await socialInteractionsService.toggleLike(
        memoryId,
        user.id,
        authorId,
        memoryTitle,
        previousLiked
      );

      // Re-sync with exact state returned by database
      setHasLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch {
      // Revert optimistic update on unexpected failure
      setHasLiked(previousLiked);
      setLikesCount((prev) => (previousLiked ? prev + 1 : Math.max(0, prev - 1)));
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      onRequireAuth ? onRequireAuth() : alert('Please log in to save memories.');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    const nextSaved = !hasSaved;
    setHasSaved(nextSaved);

    const result = await socialInteractionsService.toggleSave(memoryId, user.id);
    setHasSaved(result.saved);
    setIsSaving(false);
  };

  const handleRepostClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      onRequireAuth ? onRequireAuth() : alert('Please log in to repost memories.');
      return;
    }

    onRepostClick?.();
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`flex items-center justify-between border-t border-gray-100 pt-3 text-xs font-semibold text-gray-500 ${className}`}>
      <div className="flex items-center gap-1 sm:gap-4">
        {/* Like Button with isLiking disable guard */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors group ${
            isLiking ? 'opacity-70 cursor-not-allowed' : ''
          } ${
            hasLiked ? 'text-rose-600 bg-rose-50/80 font-bold' : 'hover:text-rose-600 hover:bg-rose-50/40 text-gray-600'
          }`}
          aria-label={hasLiked ? 'Unlike memory' : 'Like memory'}
        >
          <Heart
            className={`${iconSizes[size]} transition-transform active:scale-125 ${
              hasLiked ? 'fill-rose-600 text-rose-600' : 'group-hover:scale-110'
            }`}
          />
          <span>{likesCount > 0 ? likesCount : 'Like'}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommentClick?.();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors hover:text-[#0B6B3A] hover:bg-emerald-50/50 text-gray-600 group"
          aria-label="Comment on memory"
        >
          <MessageSquare className={`${iconSizes[size]} group-hover:scale-110 transition-transform`} />
          <span>{commentsCount > 0 ? commentsCount : 'Comment'}</span>
        </button>

        {/* Repost Button */}
        <button
          onClick={handleRepostClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors group ${
            hasReposted ? 'text-amber-700 bg-amber-50/80 font-bold' : 'hover:text-amber-700 hover:bg-amber-50/40 text-gray-600'
          }`}
          aria-label="Repost memory"
        >
          <Repeat className={`${iconSizes[size]} transition-transform ${hasReposted ? 'text-amber-700' : 'group-hover:scale-110'}`} />
          {repostsCount > 0 && <span>{repostsCount}</span>}
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Bookmark / Save Button */}
        <button
          onClick={handleSave}
          className={`p-2 rounded-xl transition-colors ${
            hasSaved ? 'text-[#0B6B3A] bg-[#E8F5EE]' : 'hover:text-[#0B6B3A] hover:bg-gray-100 text-gray-500'
          }`}
          aria-label="Save memory"
          title={hasSaved ? 'Saved to bookmarks' : 'Save to bookmarks'}
        >
          <Bookmark className={`${iconSizes[size]} ${hasSaved ? 'fill-[#0B6B3A] text-[#0B6B3A]' : ''}`} />
        </button>

        {/* Share Button with text label */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShareClick?.();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors text-gray-600 hover:text-black hover:bg-gray-100 font-semibold"
          aria-label="Share memory"
          title="Share memory"
        >
          <Share2 className={iconSizes[size]} />
          <span className="hidden sm:inline text-xs">Share</span>
        </button>
      </div>
    </div>
  );
};
