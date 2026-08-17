import React from 'react';
import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-extrabold rounded-full bg-gradient-to-r from-amber-500 via-emerald-600 to-[#0B6B3A] text-white shadow-xs border border-amber-300/40 ${sizeClasses[size]} ${className}`}
      title="Verified Premium Member"
    >
      <Crown className="w-3.5 h-3.5 fill-amber-200 stroke-white" />
      <span>PREMIUM</span>
    </span>
  );
};
