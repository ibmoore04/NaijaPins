import { supabase } from '@/lib/supabase';
import { CommunityFeedItem, FeedTab } from '@/types/social';

export const socialFeedService = {
  async getCommunityFeed(
    tab: FeedTab = 'for_you',
    currentUserId?: string | null,
    limit: number = 15,
    offset: number = 0
  ): Promise<CommunityFeedItem[]> {
    try {
      // 1. First attempt the fast RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_community_feed', {
        feed_tab: tab,
        current_user_id: currentUserId || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData as CommunityFeedItem[];
      }

      if (rpcError) {
        console.warn('get_community_feed RPC not available, falling back to direct queries:', rpcError.message);
      }

      // 2. Direct Query Fallback
      let query = supabase
        .from('memories')
        .select(`
          id,
          user_id,
          title,
          slug,
          story,
          date_type,
          year,
          end_year,
          view_count,
          created_at,
          profile:profiles(*),
          location:locations(*),
          category:categories(*),
          media:memory_media(*)
        `)
        .eq('status', 'published')
        .eq('is_deleted', false)
        .eq('community_posted', true);

      if (tab === 'popular') {
        query = query.order('view_count', { ascending: false }).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error || !data) {
        console.error('Error fetching fallback feed:', error?.message);
        return [];
      }

      // Map to CommunityFeedItem
      const formattedItems: CommunityFeedItem[] = await Promise.all(
        data.map(async (m: any) => {
          // Fetch likes, comments, reposts count in parallel
          const [likesCountRes, commentsCountRes, repostsCountRes] = await Promise.all([
            supabase.from('memory_likes').select('*', { count: 'exact', head: true }).eq('memory_id', m.id),
            supabase.from('memory_comments').select('*', { count: 'exact', head: true }).eq('memory_id', m.id).eq('is_deleted', false),
            supabase.from('memory_reposts').select('*', { count: 'exact', head: true }).eq('memory_id', m.id),
          ]);

          let has_liked = false;
          let has_reposted = false;
          let has_saved = false;
          let is_following_author = false;

          if (currentUserId) {
            const [likeRes, repostRes, saveRes, followRes] = await Promise.all([
              supabase.from('memory_likes').select('id').eq('memory_id', m.id).eq('user_id', currentUserId).maybeSingle(),
              supabase.from('memory_reposts').select('id').eq('memory_id', m.id).eq('user_id', currentUserId).maybeSingle(),
              supabase.from('saved_memories').select('id').eq('memory_id', m.id).eq('user_id', currentUserId).maybeSingle(),
              supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', m.user_id).maybeSingle(),
            ]);

            has_liked = !!likeRes.data;
            has_reposted = !!repostRes.data;
            has_saved = !!saveRes.data;
            is_following_author = !!followRes.data;
          }

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
              avatar_url: m.profile?.avatar_url || null,
              role: m.profile?.role || 'authenticated_user',
              is_premium: m.profile?.role === 'admin',
            },
            location: {
              id: m.location?.id || '',
              city: m.location?.city || 'Nigeria',
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
            likes_count: likesCountRes.count || 0,
            comments_count: commentsCountRes.count || 0,
            reposts_count: repostsCountRes.count || 0,
            has_liked,
            has_reposted,
            has_saved,
            is_following_author,
          };
        })
      );

      // If 'following' tab in fallback mode, filter only followed
      if (tab === 'following' && currentUserId) {
        return formattedItems.filter((i) => i.is_following_author);
      }

      return formattedItems;
    } catch (err) {
      console.error('Error in getCommunityFeed:', err);
      return [];
    }
  },

  async getUserReposts(userId: string): Promise<CommunityFeedItem[]> {
    try {
      const { data, error } = await supabase
        .from('memory_reposts')
        .select(`
          id,
          comment,
          created_at,
          memory:memories(
            *,
            profile:profiles(*),
            location:locations(*),
            category:categories(*),
            media:memory_media(*)
          ),
          reposter:profiles(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data
        .filter((r: any) => r.memory && !r.memory.is_deleted && r.memory.status === 'published' && r.memory.community_posted === true)
        .map((r: any) => {
          const m = r.memory;
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
              avatar_url: m.profile?.avatar_url || null,
              role: m.profile?.role || 'authenticated_user',
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
            has_reposted: true,
            has_saved: false,
            is_following_author: false,
            reposted_by: {
              user_id: r.user_id,
              full_name: r.reposter?.full_name || 'Contributor',
              comment: r.comment,
              created_at: r.created_at,
            },
          };
        });
    } catch {
      return [];
    }
  },
};
