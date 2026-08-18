import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin as MapPinType } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { savedMemoriesService } from '@/services/savedMemories.service';
import { followService } from '@/services/follow.service';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PremiumBadge } from '@/components/membership/PremiumBadge';
import {
  MapPin,
  Volume2,
  ArrowRight,
  X,
  Bookmark,
  Heart,
  MessageSquare,
  User,
  Layers,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { mapNavigation } from '@/utils/mapNavigation';

interface PinPreviewDrawerProps {
  pin: MapPinType | null;
  onClose: () => void;
  onViewAllPins?: (userId: string, userName?: string) => void;
}

export const PinPreviewDrawer: React.FC<PinPreviewDrawerProps> = ({
  pin,
  onClose,
  onViewAllPins,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (user && pin) {
        const saved = await savedMemoriesService.isMemorySaved(user.id, pin.id);
        setIsSaved(saved);

        if (pin.author_id && pin.author_id !== user.id) {
          const following = await followService.checkIsFollowing(user.id, pin.author_id);
          setIsFollowing(following);
        }
      }
    };
    checkStatus();
  }, [user, pin]);

  if (!pin) return null;

  const isOwnMemory = user && pin.author_id === user.id;

  const handleToggleSave = async () => {
    if (!user) {
      alert('Please log in to save memories to your dashboard!');
      return;
    }

    setSaving(true);
    if (isSaved) {
      const success = await savedMemoriesService.unsaveMemory(user.id, pin.id);
      if (success) setIsSaved(false);
    } else {
      const success = await savedMemoriesService.saveMemory(user.id, pin.id);
      if (success) setIsSaved(true);
    }
    setSaving(false);
  };

  const handleToggleFollow = async () => {
    if (!user || !pin.author_id) {
      alert('Please log in to follow contributors!');
      return;
    }

    setFollowLoading(true);
    const res = await followService.toggleFollow(
      user.id,
      pin.author_id,
      profile?.full_name
    );
    setIsFollowing(res.following);
    setFollowLoading(false);
  };

  const handleViewAllPinsClick = () => {
    if (!pin.author_id) return;
    if (onViewAllPins) {
      onViewAllPins(pin.author_id, pin.author_name);
    } else {
      navigate(mapNavigation.getUserMapUrl(pin.author_id, pin.author_name));
    }
  };

  return (
    <div className="fixed bottom-18 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-40 animate-slide-up">
      <Card className="shadow-2xl border-2 border-primary/20 bg-white overflow-hidden rounded-3xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
          aria-label="Close preview"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Media Thumbnail & Badges */}
        <div className="relative h-40 bg-gray-100 overflow-hidden">
          {pin.thumbnail_url ? (
            <img
              src={pin.thumbnail_url}
              alt={pin.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-950/90 text-primary-light">
              <MapPin className="w-12 h-12 opacity-80" />
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge variant="primary" size="sm">
              {pin.category_name}
            </Badge>
            <Badge variant="default" size="sm" className="bg-black/70 text-white border-0">
              {pin.year} Era
            </Badge>
          </div>

          {pin.has_audio && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="secondary" size="sm" className="inline-flex items-center gap-1 bg-amber-500 text-white border-0 shadow-sm">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio Story</span>
              </Badge>
            </div>
          )}
        </div>

        {/* Card Content */}
        <CardContent className="p-4 space-y-3">
          {/* Author Header */}
          {pin.author_id && (
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <Link
                to={`/profile/${pin.author_id}`}
                className="flex items-center gap-2 min-w-0 group"
              >
                <UserAvatar
                  src={pin.author_avatar_url}
                  name={pin.author_name || 'Contributor'}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-black group-hover:text-[#0B6B3A] transition-colors truncate">
                      {pin.author_name || 'Contributor'}
                    </span>
                    {pin.author_is_premium && <PremiumBadge size="sm" />}
                  </div>
                  <span className="text-[10px] text-charcoal-muted capitalize">
                    {pin.author_role?.replace('_', ' ') || 'Contributor'}
                  </span>
                </div>
              </Link>

              {user && !isOwnMemory && (
                <Button
                  variant={isFollowing ? 'outline' : 'primary'}
                  size="sm"
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`h-7 px-2.5 text-[11px] font-semibold rounded-full ${
                    isFollowing ? 'border-border text-charcoal-dark hover:bg-gray-50' : 'bg-[#0B6B3A] text-white'
                  }`}
                >
                  {isFollowing ? (
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      <span>Following</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <UserPlus className="w-3 h-3" />
                      <span>Follow</span>
                    </span>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Title & Story Preview */}
          <div className="space-y-1">
            <h3 className="font-bold text-base text-black line-clamp-1 leading-snug">
              {pin.title}
            </h3>
            {pin.story_preview && (
              <p className="text-xs text-charcoal-dark line-clamp-2 leading-relaxed">
                {pin.story_preview}
              </p>
            )}
            <p className="text-xs font-medium text-primary flex items-center gap-1 pt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{pin.city}{pin.state ? `, ${pin.state}` : ''}</span>
            </p>
          </div>

          {/* Social Stats & Bookmark */}
          <div className="flex items-center justify-between text-xs text-charcoal-muted pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
                <span>{pin.likes_count ?? 0}</span>
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>{pin.comments_count ?? 0}</span>
              </span>
            </div>

            <button
              onClick={handleToggleSave}
              disabled={saving}
              className={`p-1.5 rounded-lg border transition-colors ${
                isSaved
                  ? 'bg-[#E8F5EE] text-[#0B6B3A] border-[#A3D9BC]'
                  : 'bg-gray-50 text-charcoal-muted border-border hover:bg-gray-100'
              }`}
              title={isSaved ? 'Remove bookmark' : 'Bookmark memory'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#0B6B3A]' : ''}`} />
            </button>
          </div>

          {/* Action Buttons: View Profile, View All Pins, Read Full Story */}
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {pin.author_id && (
                <>
                  <Link to={`/profile/${pin.author_id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<User className="w-3.5 h-3.5 text-charcoal-muted" />}
                      className="w-full text-xs h-8 font-semibold rounded-xl border-border justify-center"
                    >
                      View Profile
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewAllPinsClick}
                    leftIcon={<Layers className="w-3.5 h-3.5 text-[#0B6B3A]" />}
                    className="w-full text-xs h-8 font-semibold rounded-xl border-border hover:bg-emerald-50 hover:text-[#0B6B3A] justify-center"
                  >
                    View All Pins
                  </Button>
                </>
              )}
            </div>

            <Link to={`/memory/${pin.slug}`} className="w-full">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="w-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white text-xs h-8.5 font-semibold rounded-xl justify-center shadow-xs"
              >
                View Memory
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
