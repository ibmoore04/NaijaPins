import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { followService } from '@/services/follow.service';
import { useAuth } from '@/hooks/useAuth';

interface FollowButtonProps {
  targetUserId: string;
  targetUserName?: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  onRequireAuth?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  initialIsFollowing = false,
  onFollowChange,
  onRequireAuth,
  size = 'sm',
  className = '',
}) => {
  const { user, profile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // If viewing own profile/memory, do not show follow button
  if (user?.id === targetUserId) {
    return null;
  }

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      onRequireAuth ? onRequireAuth() : alert('Please log in to follow contributors.');
      return;
    }

    setLoading(true);
    // Optimistic toggle
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    const { following } = await followService.toggleFollow(
      user.id,
      targetUserId,
      profile?.full_name || 'A contributor'
    );

    setIsFollowing(following);
    onFollowChange?.(following);
    setLoading(false);
  };

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleToggleFollow}
        disabled={loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`rounded-full transition-all text-xs font-semibold ${
          isHovered
            ? 'border-red-300 bg-red-50 text-red-600'
            : 'border-emerald-200 bg-emerald-50 text-[#0B6B3A]'
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isHovered ? (
          'Unfollow'
        ) : (
          <span className="flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Following</span>
          </span>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleToggleFollow}
      disabled={loading}
      className={`rounded-full text-xs font-bold border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#0B6B3A] hover:text-white transition-colors ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <span className="flex items-center gap-1">
          <UserPlus className="w-3.5 h-3.5" />
          <span>Follow</span>
        </span>
      )}
    </Button>
  );
};
