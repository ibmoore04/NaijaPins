import React from 'react';
import { Button } from '@/components/ui/Button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-gray-50 border border-border rounded-2xl space-y-4 my-4">
      <div className="w-16 h-16 rounded-full bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center border border-[#A3D9BC]/60">
        <Icon className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-lg font-heading font-bold text-black">{title}</h3>
        <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold mt-2">
          {actionText}
        </Button>
      )}
    </div>
  );
};
