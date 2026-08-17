import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { FollowButton } from './FollowButton';
import { followService } from '@/services/follow.service';
import { Follow } from '@/types/social';
import { X, MapPin, Loader2, Users } from 'lucide-react';
import { mapNavigation } from '@/utils/mapNavigation';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: 'followers' | 'following';
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialTab = 'followers',
}) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);
  const [list, setList] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadData = async () => {
      setLoading(true);
      if (tab === 'followers') {
        const data = await followService.getFollowers(userId);
        setList(data);
      } else {
        const data = await followService.getFollowing(userId);
        setList(data);
      }
      setLoading(false);
    };

    loadData();
  }, [isOpen, userId, tab]);

  if (!isOpen) return null;

  const handleViewPins = (targetUserId: string, targetName?: string) => {
    onClose();
    navigate(mapNavigation.getUserMapUrl(targetUserId, targetName));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <Card className="w-full max-w-md bg-white border border-border shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('followers')}
              className={`text-sm font-bold pb-0.5 border-b-2 transition-colors ${
                tab === 'followers'
                  ? 'border-[#0B6B3A] text-[#0B6B3A]'
                  : 'border-transparent text-charcoal-muted hover:text-black'
              }`}
            >
              Followers
            </button>
            <span className="text-charcoal-muted">·</span>
            <button
              onClick={() => setTab('following')}
              className={`text-sm font-bold pb-0.5 border-b-2 transition-colors ${
                tab === 'following'
                  ? 'border-[#0B6B3A] text-[#0B6B3A]'
                  : 'border-transparent text-charcoal-muted hover:text-black'
              }`}
            >
              Following
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Stream */}
        <CardContent className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#0B6B3A] animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Users className="w-8 h-8 text-charcoal-muted mx-auto opacity-50" />
              <p className="text-xs font-semibold text-charcoal-dark">
                {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            list.map((item) => {
              const profile = tab === 'followers' ? item.follower_profile : item.following_profile;
              if (!profile) return null;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Link
                    to={`/profile/${profile.user_id}`}
                    onClick={onClose}
                    className="flex items-center gap-2.5 min-w-0 flex-1 group"
                  >
                    <UserAvatar src={profile.avatar_url} name={profile.full_name} size="md" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-black group-hover:text-[#0B6B3A] transition-colors truncate">
                        {profile.full_name}
                      </p>
                      <p className="text-[10px] text-charcoal-muted capitalize">
                        {profile.role?.replace('_', ' ') || 'Contributor'}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPins(profile.user_id, profile.full_name)}
                      leftIcon={<MapPin className="w-3 h-3 text-[#0B6B3A]" />}
                      className="h-7 px-2 text-[11px] font-semibold rounded-full border-border hover:bg-emerald-50"
                      title="View Pins on Map"
                    >
                      View Pins
                    </Button>

                    <FollowButton
                      targetUserId={profile.user_id}
                      targetUserName={profile.full_name}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
