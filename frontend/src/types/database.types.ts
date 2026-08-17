export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'visitor' | 'authenticated_user' | 'moderator' | 'admin';
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
  is_deleted: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
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

export interface Report {
  id: string;
  reporter_id: string;
  memory_id: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationLog {
  id: string;
  moderator_id: string;
  memory_id: string;
  action: string;
  reason: string;
  created_at: string;
}

export interface MapPinRpcResult {
  id: string;
  title: string;
  slug: string;
  date_type: string;
  year: number;
  city: string;
  category_name: string;
  category_icon: string;
  latitude: number;
  longitude: number;
  thumbnail_url?: string | null;
  has_audio: boolean;
}
