import { supabase } from '@/lib/supabase';
import {
  SupportTicket,
  SupportMessage,
  SupportTicketType,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportStats,
} from '@/types/support';

export interface CreateTicketParams {
  type: SupportTicketType;
  subject: string;
  description: string;
  priority?: SupportTicketPriority;
  related_memory_id?: string;
  related_comment_id?: string;
  related_user_id?: string;
  metadata?: Record<string, any>;
}

export const supportService = {
  // 1. Create a new support ticket / report
  async createTicket(params: CreateTicketParams): Promise<{ success: boolean; ticketId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_support_ticket', {
        p_type: params.type,
        p_subject: params.subject,
        p_description: params.description,
        p_priority: params.priority || 'normal',
        p_related_memory_id: params.related_memory_id || null,
        p_related_comment_id: params.related_comment_id || null,
        p_related_user_id: params.related_user_id || null,
        p_metadata: params.metadata || {},
      });

      if (error) throw error;
      return { success: true, ticketId: data };
    } catch (err: any) {
      console.error('Error creating support ticket:', err);
      return { success: false, error: err.message || 'Failed to submit support request.' };
    }
  },

  // 2. Get Contributor's own tickets
  async getContributorTickets(userId: string): Promise<SupportTicket[]> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user:profiles!support_tickets_user_id_fkey(*),
          assigned_admin:profiles!support_tickets_assigned_admin_id_fkey(*),
          related_memory:memories(id, title, slug)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SupportTicket[];
    } catch (err: any) {
      console.error('Error fetching contributor tickets:', err);
      return [];
    }
  },

  // 3. Get single ticket details
  async getTicketDetails(ticketId: string): Promise<SupportTicket | null> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user:profiles!support_tickets_user_id_fkey(*),
          assigned_admin:profiles!support_tickets_assigned_admin_id_fkey(*),
          related_memory:memories(id, title, slug)
        `)
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      return data as SupportTicket;
    } catch (err: any) {
      console.error('Error fetching ticket details:', err);
      return null;
    }
  },

  // 4. Get conversation messages for a ticket
  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          sender:profiles!support_messages_sender_id_fkey(*)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as SupportMessage[];
    } catch (err: any) {
      console.error('Error fetching ticket messages:', err);
      return [];
    }
  },

  // 5. Send message in ticket conversation
  async sendMessage(
    ticketId: string,
    message: string,
    isInternal: boolean = false,
    attachments: string[] = []
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('send_support_message', {
        p_ticket_id: ticketId,
        p_message: message,
        p_is_internal: isInternal,
        p_attachments: attachments,
      });

      if (error) throw error;
      return { success: true, messageId: data };
    } catch (err: any) {
      console.error('Error sending support message:', err);
      return { success: false, error: err.message || 'Failed to send message.' };
    }
  },

  // 6. Update ticket status / assignment (Staff action)
  async updateTicketStatus(
    ticketId: string,
    status: SupportTicketStatus,
    priority?: SupportTicketPriority,
    assignedAdminId?: string,
    resolutionNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('update_support_ticket_status', {
        p_ticket_id: ticketId,
        p_status: status,
        p_priority: priority || null,
        p_assigned_admin_id: assignedAdminId || null,
        p_resolution_notes: resolutionNotes || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('Error updating ticket status:', err);
      return { success: false, error: err.message || 'Failed to update ticket.' };
    }
  },

  // 7. Get Admin Support Inbox tickets
  async getAdminTickets(filters?: {
    status?: SupportTicketStatus | 'ALL';
    priority?: SupportTicketPriority | 'ALL';
    type?: SupportTicketType | 'ALL';
    searchQuery?: string;
  }): Promise<SupportTicket[]> {
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          user:profiles!support_tickets_user_id_fkey(*),
          assigned_admin:profiles!support_tickets_assigned_admin_id_fkey(*),
          related_memory:memories(id, title, slug)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority && filters.priority !== 'ALL') {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.type && filters.type !== 'ALL') {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;

      let list = (data || []) as SupportTicket[];
      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        list = list.filter(
          (t) =>
            t.subject.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.user?.full_name?.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q)
        );
      }
      return list;
    } catch (err: any) {
      console.error('Error fetching admin tickets:', err);
      return [];
    }
  },

  // 8. Get Admin Support Overview Metrics
  async getAdminSupportStats(): Promise<SupportStats> {
    try {
      const { data, error } = await supabase.rpc('get_admin_support_overview_stats');
      if (error) throw error;
      return (data || {
        open_tickets: 0,
        under_review: 0,
        waiting_for_contributor: 0,
        urgent_tickets: 0,
        resolved_this_week: 0,
      }) as SupportStats;
    } catch (err) {
      console.error('Error loading admin support stats:', err);
      return {
        open_tickets: 0,
        under_review: 0,
        waiting_for_contributor: 0,
        urgent_tickets: 0,
        resolved_this_week: 0,
      };
    }
  },
};
