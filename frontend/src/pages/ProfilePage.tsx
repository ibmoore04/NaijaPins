import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/database';
import { CommunityFeedItem, FollowStats } from '@/types/social';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { FollowButton } from '@/components/social/FollowButton';
import { DirectMessageModal } from '@/components/social/DirectMessageModal';
import { FollowListModal } from '@/components/social/FollowListModal';
import { MemoryCard } from '@/components/social/MemoryCard';
import { followService } from '@/services/follow.service';
import { socialFeedService } from '@/services/socialFeed.service';
import { mapNavigation } from '@/utils/mapNavigation';
import {
  Edit3,
  Check,
  Loader2,
  Crown,
  MessageSquare,
  Repeat,
  Bookmark,
  MapPin,
} from 'lucide-react';

type ProfileTab = 'memories' | 'reposts' | 'saved';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, profile: currentProfile, refreshProfile } = useAuth();

  const targetUserId = id || currentUser?.id;
  const isOwnProfile = currentUser?.id === targetUserId;

  const [profileData, setProfileData] = useState<Profile | null>(isOwnProfile ? currentProfile : null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('memories');
  const [loading, setLoading] = useState(true);

  // Content lists
  const [userMemories, setUserMemories] = useState<CommunityFeedItem[]>([]);
  const [userReposts, setUserReposts] = useState<CommunityFeedItem[]>([]);
  const [savedMemories, setSavedMemories] = useState<CommunityFeedItem[]>([]);

  // Social Stats
  const [followStats, setFollowStats] = useState<FollowStats>({
    followers_count: 0,
    following_count: 0,
    is_following: false,
  });

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Direct Message Modal
  const [dmModalOpen, setDmModalOpen] = useState(false);

  // Follow List Modal (Followers / Following)
  const [followListModalOpen, setFollowListModalOpen] = useState(false);
  const [followListTab, setFollowListTab] = useState<'followers' | 'following'>('followers');

  useEffect(() => {
    const loadProfileAndContent = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (prof) {
        setProfileData(prof as Profile);
        setFullName(prof.full_name);
        setBio(prof.bio || '');
      }

      // 2. Fetch Follow Stats
      const stats = await followService.getFollowStats(targetUserId, currentUser?.id);
      setFollowStats(stats);

      // 3. Fetch User's Published Memories as Feed items
      const { data: mems } = await supabase
        .from('memories')
        .select(`
          *,
          location:locations(*),
          category:categories(*),
          media:memory_media(*)
        `)
        .eq('user_id', targetUserId)
        .eq('status', 'published')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (mems) {
        const formatted = mems.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          title: m.title,
          slug: m.slug,
          story: m.story,
          date_type: m.date_type,
          year: m.year,
          end_year: m.end_year,
          view_count: m.view_count || 1,
          created_at: m.created_at,
          author: {
            user_id: prof?.user_id || m.user_id,
            full_name: prof?.full_name || 'Contributor',
            avatar_url: prof?.avatar_url || null,
            role: prof?.role,
          },
          location: {
            id: m.location?.id || '',
            city: m.location?.city || '',
            state: m.location?.state || '',
            country: m.location?.country || 'Nigeria',
            formatted_address: m.location?.formatted_address || '',
          },
          category: {
            id: m.category?.id || '',
            name: m.category?.name || 'Heritage',
            slug: m.category?.slug || 'heritage',
            icon: m.category?.icon || 'MapPin',
          },
          media: (m.media || []).map((med: any) => ({
            id: med.id,
            file_url: med.file_url,
            media_type: med.media_type,
            caption: med.caption,
          })),
          likes_count: 0,
          comments_count: 0,
          reposts_count: 0,
          has_liked: false,
          has_reposted: false,
          has_saved: false,
          is_following_author: false,
        }));
        setUserMemories(formatted);
      }

      // 4. Fetch User's Reposts
      const reposts = await socialFeedService.getUserReposts(targetUserId);
      setUserReposts(reposts);

      // 5. Fetch Saved Memories (if viewing own profile)
      if (isOwnProfile && currentUser) {
        const { data: savedData } = await supabase
          .from('saved_memories')
          .select(`
            id,
            memory:memories(
              *,
              profile:profiles(*),
              location:locations(*),
              category:categories(*),
              media:memory_media(*)
            )
          `)
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (savedData) {
          const formattedSaved = savedData
            .filter((s: any) => s.memory && !s.memory.is_deleted)
            .map((s: any) => {
              const m = s.memory;
              return {
                id: m.id,
                user_id: m.user_id,
                title: m.title,
                slug: m.slug,
                story: m.story,
                date_type: m.date_type,
                year: m.year,
                end_year: m.end_year,
                view_count: m.view_count || 1,
                created_at: m.created_at,
                author: {
                  user_id: m.profile?.user_id || m.user_id,
                  full_name: m.profile?.full_name || 'Contributor',
                  avatar_url: m.profile?.avatar_url,
                  role: m.profile?.role,
                },
                location: {
                  id: m.location?.id || '',
                  city: m.location?.city || '',
                  state: m.location?.state || '',
                  country: m.location?.country || 'Nigeria',
                  formatted_address: m.location?.formatted_address || '',
                },
                category: {
                  id: m.category?.id || '',
                  name: m.category?.name || 'Heritage',
                  slug: m.category?.slug || 'heritage',
                  icon: m.category?.icon || 'MapPin',
                },
                media: (m.media || []).map((med: any) => ({
                  id: med.id,
                  file_url: med.file_url,
                  media_type: med.media_type,
                  caption: med.caption,
                })),
                likes_count: 0,
                comments_count: 0,
                reposts_count: 0,
                has_liked: false,
                has_reposted: false,
                has_saved: true,
                is_following_author: false,
              };
            });
          setSavedMemories(formattedSaved);
        }
      }

      setLoading(false);
    };

    loadProfileAndContent();
  }, [targetUserId, currentUser?.id, isOwnProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        bio,
      })
      .eq('user_id', currentUser.id);

    if (!error) {
      await refreshProfile();
      setIsEditing(false);
    } else {
      alert('Failed to update profile: ' + error.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#0B6B3A] animate-spin" />
        <p className="text-sm font-semibold text-charcoal-dark">Loading contributor profile...</p>
      </div>
    );
  }

  if (!profileData && !isOwnProfile) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-black">Profile Not Found</h2>
        <p className="text-sm text-charcoal-dark">This contributor profile does not exist.</p>
        <Link to="/explore">
          <Button variant="primary">Return to Explore</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Profile Card */}
      <Card className="shadow-xs border border-border bg-white rounded-3xl overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profileData?.avatar_url}
              name={profileData?.full_name}
              size="xl"
            />

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
                  {profileData?.full_name || 'Contributor'}
                </h1>
                {profileData?.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
                    <span>Verified Contributor</span>
                  </span>
                ) : (
                  <Badge variant="primary" size="sm" className="capitalize text-xs">
                    {profileData?.role?.replace('_', ' ') || 'Contributor'}
                  </Badge>
                )}
              </div>

              {/* Social Stats Counters (Clickable) */}
              <div className="flex items-center gap-4 text-xs font-semibold text-charcoal-dark pt-1">
                <span>
                  <strong>{userMemories.length}</strong> Memories
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFollowListTab('followers');
                    setFollowListModalOpen(true);
                  }}
                  className="hover:text-[#0B6B3A] transition-colors"
                >
                  <strong>{followStats.followers_count}</strong> Followers
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFollowListTab('following');
                    setFollowListModalOpen(true);
                  }}
                  className="hover:text-[#0B6B3A] transition-colors"
                >
                  <strong>{followStats.following_count}</strong> Following
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            {/* View on Map Button */}
            {profileData && (
              <Link to={mapNavigation.getUserMapUrl(profileData.user_id, profileData.full_name)}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<MapPin className="w-4 h-4 text-[#0B6B3A]" />}
                  className="rounded-full text-xs font-semibold hover:bg-emerald-50 hover:text-[#0B6B3A] border-border"
                >
                  View on Map
                </Button>
              </Link>
            )}

            {isOwnProfile ? (
              !isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  leftIcon={<Edit3 className="w-4 h-4" />}
                  className="rounded-full text-xs font-semibold"
                >
                  Edit Profile
                </Button>
              )
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDmModalOpen(true)}
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                  className="rounded-full text-xs font-semibold"
                >
                  Message
                </Button>
                {targetUserId && (
                  <FollowButton
                    targetUserId={targetUserId}
                    targetUserName={profileData?.full_name}
                    initialIsFollowing={followStats.is_following}
                    onFollowChange={(isFol) =>
                      setFollowStats((prev) => ({
                        ...prev,
                        is_following: isFol,
                        followers_count: isFol ? prev.followers_count + 1 : Math.max(0, prev.followers_count - 1),
                      }))
                    }
                    size="sm"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Bio or Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-border">
            <div>
              <label className="block text-xs font-bold text-charcoal-dark mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal-dark mb-1">Bio</label>
              <textarea
                rows={3}
                placeholder="Share your personal connection or heritage lineage in Nigeria..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={saving} leftIcon={<Check className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-charcoal-dark leading-relaxed">
              {profileData?.bio || 'This contributor has not written a bio yet.'}
            </p>
          </div>
        )}
      </Card>

      {/* Profile Content Sub-Tabs */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('memories')}
            className={`pb-3 px-4 text-xs sm:text-sm font-extrabold transition-colors border-b-2 ${
              activeTab === 'memories'
                ? 'border-[#0B6B3A] text-[#0B6B3A]'
                : 'border-transparent text-charcoal-muted hover:text-black'
            }`}
          >
            Pinned Memories ({userMemories.length})
          </button>

          <button
            onClick={() => setActiveTab('reposts')}
            className={`pb-3 px-4 text-xs sm:text-sm font-extrabold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'reposts'
                ? 'border-[#0B6B3A] text-[#0B6B3A]'
                : 'border-transparent text-charcoal-muted hover:text-black'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Reposts ({userReposts.length})</span>
          </button>

          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`pb-3 px-4 text-xs sm:text-sm font-extrabold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'border-[#0B6B3A] text-[#0B6B3A]'
                  : 'border-transparent text-charcoal-muted hover:text-black'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({savedMemories.length})</span>
            </button>
          )}
        </div>

        {/* Tab Content Display */}
        {activeTab === 'memories' && (
          userMemories.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border border-dashed border-border rounded-2xl space-y-2">
              <p className="text-sm font-semibold text-charcoal-dark">No memories pinned yet.</p>
              {isOwnProfile && (
                <Link to="/add-memory">
                  <Button variant="primary" size="sm" className="mt-2 bg-[#0B6B3A]">
                    Pin Your First Memory
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {userMemories.map((mem) => (
                <MemoryCard key={mem.id} memory={mem} />
              ))}
            </div>
          )
        )}

        {activeTab === 'reposts' && (
          userReposts.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border border-dashed border-border rounded-2xl space-y-1">
              <p className="text-sm font-semibold text-charcoal-dark">No reposted memories yet.</p>
              <p className="text-xs text-charcoal-muted">
                Explore the community feed and repost inspiring heritage stories to your profile.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {userReposts.map((repost) => (
                <MemoryCard key={`repost-${repost.id}`} memory={repost} />
              ))}
            </div>
          )
        )}

        {activeTab === 'saved' && isOwnProfile && (
          savedMemories.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border border-dashed border-border rounded-2xl space-y-1">
              <p className="text-sm font-semibold text-charcoal-dark">No saved bookmarks yet.</p>
              <p className="text-xs text-charcoal-muted">
                Click the bookmark icon on any memory story to save it for quick reference.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {savedMemories.map((saved) => (
                <MemoryCard key={`saved-${saved.id}`} memory={saved} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Direct Message Modal */}
      {profileData && targetUserId && (
        <DirectMessageModal
          isOpen={dmModalOpen}
          onClose={() => setDmModalOpen(false)}
          targetUser={{
            user_id: targetUserId,
            full_name: profileData.full_name,
            avatar_url: profileData.avatar_url,
          }}
        />
      )}

      {/* Follow List Modal (Followers / Following with View Pins) */}
      {targetUserId && (
        <FollowListModal
          isOpen={followListModalOpen}
          onClose={() => setFollowListModalOpen(false)}
          userId={targetUserId}
          initialTab={followListTab}
        />
      )}
    </div>
  );
};
