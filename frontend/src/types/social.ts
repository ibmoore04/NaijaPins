import { Profile, Memory } from './database';

export type FeedTab = 'for_you' | 'recent' | 'popular' | 'following';

export interface MemoryAuthorInfo {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  role?: string;
  is_premium?: boolean;
}

export interface CommunityFeedItem {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  story: string;
  date_type: string;
  year: number;
  end_year?: number | null;
  view_count: number;
  community_posted?: boolean;
  created_at: string;
  author: MemoryAuthorInfo;
  location: {
    id: string;
    city: string;
    state: string;
    country: string;
    formatted_address: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  };
  media: {
    id: string;
    file_url: string;
    media_type: 'image' | 'audio';
    caption?: string | null;
  }[];
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  has_liked: boolean;
  has_reposted: boolean;
  has_saved: boolean;
  is_following_author: boolean;
  // Repost info if in user profile reposts tab
  reposted_by?: {
    user_id: string;
    full_name: string;
    comment?: string | null;
    created_at: string;
  } | null;
}

export interface MemoryLike {
  id: string;
  memory_id: string;
  user_id: string;
  created_at: string;
}

export interface MemoryComment {
  id: string;
  memory_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile & { is_premium?: boolean };
  likes_count?: number;
  has_liked?: boolean;
  replies?: MemoryComment[];
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface MemoryRepost {
  id: string;
  memory_id: string;
  user_id: string;
  comment?: string | null;
  created_at: string;
  memory?: Memory;
  profile?: Profile;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  follower_profile?: Profile;
  following_profile?: Profile;
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  other_member?: Profile & { is_premium?: boolean };
  last_message?: Message | null;
  unread_count?: number;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  last_delivered_at?: string | null;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  status?: MessageDeliveryStatus;
}

export interface SocialNotification {
  id: string;
  user_id: string;
  type:
    | 'like'
    | 'comment'
    | 'reply'
    | 'repost'
    | 'follow'
    | 'message'
    | 'submission'
    | 'approval'
    | 'rejection'
    | 'report_update'
    | 'announcement';
  title: string;
  message: string;
  memory_id?: string | null;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}
