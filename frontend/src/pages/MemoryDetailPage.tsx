import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Memory } from '@/types/database';
import { AudioPlayer } from '@/components/memory/AudioPlayer';
import { ReportModal } from '@/components/memory/ReportModal';
import { ShareModal } from '@/components/memory/ShareModal';
import { RepostModal } from '@/components/social/RepostModal';
import { DirectMessageModal } from '@/components/social/DirectMessageModal';
import { SocialActions } from '@/components/social/SocialActions';
import { CommentSection } from '@/components/social/CommentSection';
import { FollowButton } from '@/components/social/FollowButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { HashtagText } from '@/components/common/HashtagText';
import {
  MapPin,
  Eye,
  ArrowLeft,
  Trash2,
  Flag,
  Loader2,
  Crown,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { socialInteractionsService } from '@/services/socialInteractions.service';
import { ImageLightboxModal } from '@/components/chat/ImageLightboxModal';

export const MemoryDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Social Stats
  const [socialStats, setSocialStats] = useState({
    likes_count: 0,
    comments_count: 0,
    reposts_count: 0,
    has_liked: false,
    has_reposted: false,
    has_saved: false,
  });

  // Related Memories
  const [relatedMemories, setRelatedMemories] = useState<Memory[]>([]);

  // Modals state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [dmModalOpen, setDmModalOpen] = useState(false);

  useEffect(() => {
    const fetchMemoryAndStats = async () => {
      if (!slug) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('memories')
        .select(`
          *,
          profile:profiles(*),
          location:locations(*),
          category:categories(*),
          media:memory_media(*)
        `)
        .eq('slug', slug)
        .eq('is_deleted', false)
        .single();

      if (error || !data) {
        setErrorMsg('Memory story not found or may have been deleted.');
      } else {
        const mem = data as Memory;
        setMemory(mem);

        // Fetch social stats
        const stats = await socialInteractionsService.getMemorySocialStats(mem.id, user?.id);
        setSocialStats(stats);

        // Increment view count
        await supabase
          .from('memories')
          .update({ view_count: (mem.view_count || 0) + 1 })
          .eq('id', mem.id);

        // Fetch related memories in same category
        if (mem.category_id) {
          const { data: related } = await supabase
            .from('memories')
            .select('*, location:locations(*), category:categories(*), media:memory_media(*)')
            .eq('category_id', mem.category_id)
            .neq('id', mem.id)
            .eq('status', 'published')
            .eq('is_deleted', false)
            .limit(3);

          if (related) setRelatedMemories(related as Memory[]);
        }
      }
      setLoading(false);
    };

    fetchMemoryAndStats();
  }, [slug, user?.id]);

  const handleSoftDelete = async () => {
    if (!memory || !window.confirm('Are you sure you want to delete this memory pin?')) return;

    const { error } = await supabase
      .from('memories')
      .update({ is_deleted: true })
      .eq('id', memory.id);

    if (!error) {
      navigate('/explore');
    } else {
      alert('Failed to delete memory: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#0B6B3A] animate-spin" />
        <p className="text-sm font-semibold text-charcoal-dark">Loading heritage memory...</p>
      </div>
    );
  }

  if (errorMsg || !memory) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-black">Memory Not Found</h2>
        <p className="text-sm text-charcoal-dark">{errorMsg}</p>
        <Link to="/explore">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Map
          </Button>
        </Link>
      </div>
    );
  }

  const isAuthor = user?.id === memory.user_id;
  const imageMedia = memory.media?.filter((m) => m.media_type === 'image') || [];
  const audioMedia = memory.media?.find((m) => m.media_type === 'audio');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Navigation & Actions Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-muted hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReportModalOpen(true)}
            leftIcon={<Flag className="w-3.5 h-3.5 text-charcoal-muted" />}
            className="text-xs"
          >
            Report
          </Button>

          {isAuthor && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSoftDelete}
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Memory Details Card */}
      <article className="bg-white border border-border rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        
        {/* Author Header Banner */}
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link to={`/profile/${memory.user_id}`} className="shrink-0 group">
              <UserAvatar
                src={memory.profile?.avatar_url}
                name={memory.profile?.full_name}
                size="lg"
              />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/profile/${memory.user_id}`}
                  className="text-base font-semibold text-black hover:text-[#0B6B3A] transition-colors truncate"
                >
                  {memory.profile?.full_name || 'Contributor'}
                </Link>

                {memory.profile?.role === 'admin' && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-300" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-charcoal-muted flex items-center gap-2">
                <span>Pinned {new Date(memory.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {memory.view_count || 1} Views
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAuthor && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDmModalOpen(true)}
                  leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                  className="hidden sm:inline-flex text-xs rounded-full font-semibold"
                >
                  Message
                </Button>
                <FollowButton
                  targetUserId={memory.user_id}
                  targetUserName={memory.profile?.full_name}
                  size="sm"
                />
              </>
            )}
          </div>
        </div>

        {/* Badges & Meta */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="primary" size="sm">
            {memory.category?.name || 'Heritage'}
          </Badge>
          <Badge variant="default" size="sm" className="bg-black text-white border-0">
            {memory.year} Era
          </Badge>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary ml-auto">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              {memory.location?.formatted_address || `${memory.location?.city}, ${memory.location?.state}`}
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black leading-tight tracking-tight">
          {memory.title}
        </h1>

        {/* Voice Story Audio Player */}
        {audioMedia && (
          <div className="py-2">
            <AudioPlayer src={audioMedia.file_url} title={`Voice Recording by Contributor`} />
          </div>
        )}

        {/* Photograph Gallery */}
        {imageMedia.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {imageMedia.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActivePhoto(img.file_url)}
                  className="relative rounded-2xl overflow-hidden border border-border bg-gray-100 aspect-video cursor-pointer group shadow-2xs hover:shadow-md transition-all"
                >
                  <img
                    src={img.file_url}
                    alt={img.caption || `Memory photo ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Story Body Content */}
        <div className="prose max-w-none pt-4 text-charcoal-dark text-base sm:text-[17px] leading-relaxed whitespace-pre-line border-t border-border">
          <HashtagText text={memory.story} />
        </div>

        {/* Interactive Social Actions Bar */}
        <div className="pt-2">
          <SocialActions
            memoryId={memory.id}
            authorId={memory.user_id}
            memoryTitle={memory.title}
            memorySlug={memory.slug}
            likesCount={socialStats.likes_count}
            commentsCount={socialStats.comments_count}
            repostsCount={socialStats.reposts_count}
            hasLiked={socialStats.has_liked}
            hasReposted={socialStats.has_reposted}
            hasSaved={socialStats.has_saved}
            onRepostClick={() => setRepostModalOpen(true)}
            onShareClick={() => setShareModalOpen(true)}
            size="lg"
          />
        </div>

        {/* Comments Section */}
        <CommentSection
          memoryId={memory.id}
          memoryAuthorId={memory.user_id}
          memoryTitle={memory.title}
        />
      </article>

      {/* Related Heritage Memories */}
      {relatedMemories.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0B6B3A]" />
            <h3 className="text-lg sm:text-xl font-bold text-black">
              Related Heritage Stories
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedMemories.map((rel) => {
              const relImg = rel.media?.find((m) => m.media_type === 'image');
              return (
                <Card
                  key={rel.id}
                  onClick={() => navigate(`/memory/${rel.slug}`)}
                  className="border border-border bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                >
                  {relImg && (
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      <img
                        src={relImg.file_url}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-1.5">
                    <span className="text-xs font-semibold text-[#0B6B3A]">
                      {rel.location?.city}, {rel.year} Era
                    </span>
                    <h4 className="text-sm font-semibold text-black line-clamp-1 group-hover:text-[#0B6B3A] transition-colors">
                      {rel.title}
                    </h4>
                    <p className="text-xs text-charcoal-muted line-clamp-2">{rel.story}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <RepostModal
        isOpen={repostModalOpen}
        onClose={() => setRepostModalOpen(false)}
        memory={{
          id: memory.id,
          title: memory.title,
          slug: memory.slug,
          story: memory.story,
          user_id: memory.user_id,
          author: {
            full_name: memory.profile?.full_name || 'Contributor',
            avatar_url: memory.profile?.avatar_url,
          },
          location: memory.location
            ? { city: memory.location.city, state: memory.location.state }
            : undefined,
          year: memory.year,
        }}
      />

      <ShareModal
        isOpen={shareModalOpen}
        title={memory.title}
        url={window.location.href}
        onClose={() => setShareModalOpen(false)}
      />

      <ReportModal
        isOpen={reportModalOpen}
        memoryId={memory.id}
        memoryTitle={memory.title}
        onClose={() => setReportModalOpen(false)}
      />

      {memory.profile && (
        <DirectMessageModal
          isOpen={dmModalOpen}
          onClose={() => setDmModalOpen(false)}
          targetUser={{
            user_id: memory.user_id,
            full_name: memory.profile.full_name,
            avatar_url: memory.profile.avatar_url,
          }}
        />
      )}

      {/* Lightbox Photo Modal with In-Page Download */}
      {activePhoto && (
        <ImageLightboxModal
          imageUrl={activePhoto}
          onClose={() => setActivePhoto(null)}
        />
      )}
    </div>
  );
};
