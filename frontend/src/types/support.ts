import { Profile } from './database';

export type SupportTicketType =
  | 'bug'
  | 'memory_report'
  | 'comment_report'
  | 'user_report'
  | 'account'
  | 'security'
  | 'membership'
  | 'map_issue'
  | 'media_issue'
  | 'feature_request'
  | 'general';

export type SupportTicketStatus =
  | 'open'
  | 'under_review'
  | 'waiting_for_contributor'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  user_id: string;
  type: SupportTicketType;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assigned_admin_id?: string | null;
  related_memory_id?: string | null;
  related_comment_id?: string | null;
  related_user_id?: string | null;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Joined relations
  user?: Profile;
  assigned_admin?: Profile | null;
  related_memory?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  attachments?: string[];
  created_at: string;

  // Joined relations
  sender?: Profile;
}

export interface SupportStats {
  open_tickets: number;
  under_review: number;
  waiting_for_contributor: number;
  urgent_tickets: number;
  resolved_this_week: number;
}

export interface FAQArticle {
  id: string;
  category: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
}
