import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { FollowButton } from '@/components/social/FollowButton';
import { SocialActions } from '@/components/social/SocialActions';
import { RepostModal } from '@/components/social/RepostModal';
import { ShareModal } from '@/components/memory/ShareModal';
import { SignInPromptModal } from '@/components/social/SignInPromptModal';
import { HashtagText } from '@/components/common/HashtagText';
import { MapPin, Repeat, Crown, Volume2 } from 'lucide-react';
import { CommunityFeedItem } from '@/types/social';

interface MemoryCardProps {
  memory: CommunityFeedItem;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  className?: string;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onOpenAuthModal,
  className = '',
}) => {
  const navigate = useNavigate();
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);

  const primaryImage = memory.media?.find((m) => m.media_type === 'image');
  const hasAudio = memory.media?.some((m) => m.media_type === 'audio');

  const formattedDate = new Date(memory.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card className={`border border-border bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all ${className}`}>
      {/* Repost Header Banner */}
      {memory.reposted_by && (
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-100 flex items-center gap-2 text-xs text-amber-900 font-medium">
          <Repeat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Reposted by <strong>{memory.reposted_by.full_name}</strong>
          </span>
          {memory.reposted_by.comment && (
            <span className="italic text-charcoal-dark font-normal">"{memory.reposted_by.comment}"</span>
          )}
        </div>
      )}

      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Author & Header Section */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/profile/${memory.author.user_id}`} className="shrink-0 group">
              <UserAvatar src={memory.author.avatar_url} name={memory.author.full_name} size="md" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  to={`/profile/${memory.author.user_id}`}
                  className="text-sm font-semibold text-black hover:text-[#0B6B3A] transition-colors truncate"
                >
                  {memory.author.full_name}
                </Link>

                {memory.author.is_premium && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-300" />
                    <span>Premium</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-charcoal-muted mt-0.5">
                <span>{formattedDate}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary font-medium truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {memory.location?.city || 'Nigeria'}, {memory.location?.state}
                </span>
              </div>
            </div>
          </div>

          <FollowButton
            targetUserId={memory.author.user_id}
            targetUserName={memory.author.full_name}
            initialIsFollowing={memory.is_following_author}
            onRequireAuth={() => setSignInPromptOpen(true)}
            size="sm"
          />
        </div>

        {/* Categories & Era Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="primary" size="sm">
            {memory.category?.name || 'Heritage'}
          </Badge>
          <Badge variant="default" size="sm" className="bg-black text-white border-0">
            {memory.year} Era
          </Badge>
          {hasAudio && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
              <Volume2 className="w-3 h-3" /> Voice Story
            </span>
          )}
        </div>

        {/* Story Title & Excerpt */}
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-semibold text-black leading-snug hover:text-[#0B6B3A] transition-colors">
            <Link to={`/memory/${memory.slug}`}>{memory.title}</Link>
          </h3>
          <p className="text-sm sm:text-[15px] text-charcoal-dark leading-relaxed line-clamp-3 whitespace-pre-line">
            <HashtagText text={memory.story} target="community" />
          </p>
        </div>

        {/* Photograph Thumbnail / Display */}
        {primaryImage && (
          <div
            onClick={() => navigate(`/memory/${memory.slug}`)}
            className="rounded-xl overflow-hidden border border-border bg-gray-100 aspect-video sm:aspect-21/9 cursor-pointer group relative shadow-2xs"
          >
            <img
              src={primaryImage.file_url}
              alt={primaryImage.caption || memory.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}

        {/* Interactive Social Actions Bar */}
        <SocialActions
          memoryId={memory.id}
          authorId={memory.user_id}
          memoryTitle={memory.title}
          memorySlug={memory.slug}
          likesCount={memory.likes_count}
          commentsCount={memory.comments_count}
          repostsCount={memory.reposts_count}
          hasLiked={memory.has_liked}
          hasReposted={memory.has_reposted}
          hasSaved={memory.has_saved}
          onCommentClick={() => navigate(`/memory/${memory.slug}#comments`)}
          onRepostClick={() => setRepostModalOpen(true)}
          onShareClick={() => setShareModalOpen(true)}
          onRequireAuth={() => setSignInPromptOpen(true)}
          size="md"
        />
      </CardContent>

      {/* Modals */}
      <RepostModal
        isOpen={repostModalOpen}
        onClose={() => setRepostModalOpen(false)}
        memory={memory}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={memory.title}
        url={`${window.location.origin}/memory/${memory.slug}`}
      />

      <SignInPromptModal
        isOpen={signInPromptOpen}
        onClose={() => setSignInPromptOpen(false)}
        onOpenAuth={(tab) => onOpenAuthModal?.(tab)}
      />
    </Card>
  );
};
