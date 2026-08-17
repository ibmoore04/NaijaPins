import { supabase } from '@/lib/supabase';
import { ContentReport, ReportReason, ReportStatus } from '@/types/database';

export interface GetAdminReportsOptions {
  page?: number;
  limit?: number;
  status?: ReportStatus | 'all';
  reason?: ReportReason | 'all';
}

export const adminReportsService = {
  async getReports(options: GetAdminReportsOptions = {}): Promise<{
    reports: ContentReport[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(Math.max(options.limit || 15, 1), 50);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(*), memory:memories(*, location:locations(*), category:categories(*))', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options.reason && options.reason !== 'all') {
      query = query.eq('reason', options.reason);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      // Fallback simpler select if relationship syntax differs
      const { data: fallbackData, count: fallbackCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return {
        reports: (fallbackData || []) as ContentReport[],
        totalCount: fallbackCount || 0,
        page,
        totalPages: Math.ceil((fallbackCount || 0) / limit) || 1,
      };
    }

    const totalCount = count || (data || []).length;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      reports: (data || []) as ContentReport[],
      totalCount,
      page,
      totalPages,
    };
  },
};
