import React from 'react';
import { Category } from '@/types/database';
import { Calendar, Filter, RotateCcw } from 'lucide-react';

interface TimelineFilterBarProps {
  startYear: number;
  endYear: number;
  onYearChange: (start: number, end: number) => void;
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  categories: Category[];
}

const DECADES = [
  { label: 'All Time', start: 1960, end: 2030 },
  { label: '1960s', start: 1960, end: 1969 },
  { label: '1970s', start: 1970, end: 1979 },
  { label: '1980s', start: 1980, end: 1989 },
  { label: '1990s', start: 1990, end: 1999 },
  { label: '2000s', start: 2000, end: 2009 },
  { label: '2010s', start: 2010, end: 2019 },
  { label: '2020s+', start: 2020, end: 2030 },
];

export const TimelineFilterBar: React.FC<TimelineFilterBarProps> = ({
  startYear,
  endYear,
  onYearChange,
  selectedCategory,
  onCategoryChange,
  categories,
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-border shadow-sm p-4 space-y-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Decade Quick Selectors */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-charcoal-muted uppercase tracking-wider shrink-0 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Era:</span>
          </span>
          {DECADES.map((dec) => {
            const isActive = startYear === dec.start && endYear === dec.end;
            return (
              <button
                key={dec.label}
                onClick={() => onYearChange(dec.start, dec.end)}
                className={`px-3 py-1 text-xs font-semibold rounded-full shrink-0 transition-all ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200'
                }`}
              >
                {dec.label}
              </button>
            );
          })}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-charcoal-muted uppercase tracking-wider shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </span>

          <button
            onClick={() => onCategoryChange(null)}
            className={`px-3 py-1 text-xs font-semibold rounded-full shrink-0 transition-all ${
              selectedCategory === null
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>

          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(isActive ? null : cat.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-full shrink-0 transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-charcoal-dark hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            );
          })}

          {(selectedCategory !== null || startYear !== 1960 || endYear !== 2030) && (
            <button
              onClick={() => {
                onCategoryChange(null);
                onYearChange(1960, 2030);
              }}
              className="px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-full shrink-0 flex items-center gap-1 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
