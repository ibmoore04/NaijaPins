import React from 'react';
import { MemoryStatus } from '@/types/database';
import { Badge } from '@/components/ui/Badge';

interface MemoryStatusBadgeProps {
  status: MemoryStatus;
}

export const MemoryStatusBadge: React.FC<MemoryStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'published':
      return (
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
          Published
        </Badge>
      );
    case 'pending_review':
      return (
        <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200 font-bold">
          Pending Review
        </Badge>
      );
    case 'draft':
      return (
        <Badge variant="secondary" className="bg-gray-100 text-charcoal-dark border-gray-200 font-bold">
          Draft
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="secondary" className="bg-red-50 text-red-800 border-red-200 font-bold">
          Rejected
        </Badge>
      );
    case 'hidden':
      return (
        <Badge variant="secondary" className="bg-purple-50 text-purple-800 border-purple-200 font-bold">
          Hidden
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
