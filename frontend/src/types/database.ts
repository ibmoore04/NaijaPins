export type UserRole =
  | 'visitor'
  | 'authenticated_user'
  | 'contributor'
  | 'moderator'
  | 'support_admin'
  | 'platform_admin'
  | 'super_admin'
  | 'admin';

export type MemoryStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'hidden';
export type DatePrecision = 'EXACT_DATE' | 'EXACT_YEAR' | 'DECADE' | 'DATE_RANGE';
export type MediaType = 'image' | 'audio';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'MISINFORMATION' | 'PRIVACY_VIOLATION' | 'INAPPROPRIATE' | 'COPYRIGHT' | 'OTHER';
export type ReportStatus = 'pending' | 'under_review' | 'resolved_dismissed' | 'resolved_removed';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export interface Location {
  id: string;
  country: string;
  state: string;
  lga: string;
  city: string;
  neighborhood?: string | null;
  formatted_address: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  story: string;
  date_type: DatePrecision;
  year: number;
  end_year?: number | null;
  exact_date?: string | null;
  location_id: string;
  category_id: string;
  status: MemoryStatus;
  community_posted?: boolean;
  is_deleted: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  location?: Location;
  category?: Category;
  profile?: Profile;
  media?: MemoryMedia[];
}

export interface MemoryMedia {
  id: string;
  memory_id: string;
  media_type: MediaType;
  file_path: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  caption?: string | null;
  display_order: number;
  created_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  memory_id?: string | null;
  comment_id?: string | null;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  resolved_by?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
  reporter?: Profile;
  memory?: Memory;
  resolver?: Profile;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  details: Record<string, any>;
  created_at: string;
  admin?: Profile;
}

export interface AdminOverviewStats {
  total_users: number;
  active_users: number;
  new_users_week: number;
  total_memories: number;
  published_memories: number;
  pending_memories: number;
  rejected_memories: number;
  memories_week: number;
  open_reports: number;
  premium_members: number;
  free_members: number;
  total_likes: number;
  total_comments: number;
  total_reposts: number;
}

export interface AdminAnalyticsData {
  categories: { id: string; name: string; slug: string; icon: string; count: number }[];
  states: { state: string; count: number }[];
  status_distribution: { status: string; count: number }[];
  monthly_growth: { month_label: string; memories_count: number }[];
}

export interface MapPin {
  id: string;
  title: string;
  slug: string;
  story_preview?: string;
  date_type: DatePrecision;
  year: number;
  city: string;
  state?: string;
  category_name: string;
  category_icon: string;
  latitude: number;
  longitude: number;
  thumbnail_url?: string | null;
  has_audio: boolean;
  author_id?: string;
  author_name?: string;
  author_avatar_url?: string | null;
  author_role?: UserRole;
  author_is_premium?: boolean;
  is_following?: boolean;
  is_follower?: boolean;
  is_own?: boolean;
  likes_count?: number;
  comments_count?: number;
  created_at?: string;
}

export type SocialMapFilter =
  | 'all'
  | 'my_memories'
  | 'following'
  | 'followers'
  | 'social'
  | 'recent'
  | 'popular'
  | 'near_me';

export interface MapBounds {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

export * from './social';
