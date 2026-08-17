import React from 'react';
import { Card } from '@/components/ui/Card';
import { ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;
  };
}

export function AdminDataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
  keyExtractor,
  pagination,
}: AdminDataTableProps<T>) {
  if (loading) {
    return (
      <Card className="border border-border/80 bg-white rounded-2xl p-12 text-center shadow-xs">
        <div className="flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0B6B3A] animate-spin" />
          <p className="text-xs font-semibold text-charcoal-muted">Loading data...</p>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border border-border/80 bg-white rounded-2xl p-12 text-center shadow-xs">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-charcoal-muted flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-black">{emptyMessage}</p>
          <p className="text-xs text-charcoal-muted max-w-xs">
            Try adjusting your search query or filter criteria.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-border text-charcoal-muted font-semibold">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className={`p-3.5 font-semibold text-charcoal-muted ${col.headerClassName || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.map((item) => (
                <tr key={keyExtractor(item)} className="hover:bg-gray-50/80 transition-colors">
                  {columns.map((col, idx) => (
                    <td key={idx} className={`p-3.5 text-charcoal-dark ${col.className || ''}`}>
                      {col.render
                        ? col.render(item)
                        : col.accessor
                        ? String(item[col.accessor] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-charcoal-muted">
          <p>
            Showing <strong>{data.length}</strong> of <strong>{pagination.totalCount}</strong> records
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              className="rounded-xl px-2.5 py-1 text-xs"
            >
              Previous
            </Button>

            <span className="font-bold text-black px-2">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              className="rounded-xl px-2.5 py-1 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
