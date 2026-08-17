import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface AdminFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onReset?: () => void;
  actions?: React.ReactNode;
}

export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  onReset,
  actions,
}) => {
  return (
    <div className="bg-white border border-border/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {/* Search Input */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-border bg-gray-50/70 text-black placeholder:text-charcoal-muted focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:bg-white"
            />
          </div>
        )}

        {/* Dropdown Filters */}
        {filters.map((filter) => (
          <div key={filter.id} className="flex items-center gap-1.5">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-border bg-gray-50/70 text-charcoal-dark font-medium focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {filter.label}: {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Reset Button */}
        {onReset && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="rounded-xl text-xs font-semibold text-charcoal-muted hover:text-black py-2"
          >
            Reset
          </Button>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
