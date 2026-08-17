import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorClass?: string;
  bgClass?: string;
  loading?: boolean;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorClass = 'text-[#0B6B3A]',
  bgClass = 'bg-[#E8F5EE]',
  loading = false,
}) => {
  if (loading) {
    return (
      <Card className="p-4 sm:p-5 border border-border bg-white rounded-2xl shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="w-20 h-3 bg-gray-200 rounded" />
            <div className="w-16 h-7 bg-gray-200 rounded" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-200" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-border/80 bg-white rounded-2xl shadow-xs hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-charcoal-muted truncate">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-black tracking-tight leading-none mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs text-charcoal-muted pt-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <p
                className={`text-xs font-semibold flex items-center gap-1 pt-0.5 ${
                  trend.isPositive ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{trend.value}</span>
              </p>
            )}
          </div>

          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}
          >
            <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
