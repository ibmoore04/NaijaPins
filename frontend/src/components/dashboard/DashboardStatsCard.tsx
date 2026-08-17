import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';

interface DashboardStatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  colorClass?: string;
  bgClass?: string;
}

export const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({
  title,
  value,
  icon: Icon,
  colorClass = 'text-[#0B6B3A]',
  bgClass = 'bg-[#E8F5EE]',
}) => {
  return (
    <Card className="border border-border bg-white shadow-xs hover:shadow-md transition-shadow p-4">
      <CardContent className="p-0 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-heading font-extrabold text-black">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
};
