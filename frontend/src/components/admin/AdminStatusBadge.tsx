import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { getRoleDisplayName } from '@/config/adminPermissions';

interface AdminStatusBadgeProps {
  type: 'memory' | 'report' | 'role' | 'membership' | 'community';
  value: string | boolean;
  size?: 'sm' | 'md';
}

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({
  type,
  value,
  size = 'sm',
}) => {
  if (type === 'community') {
    const isPosted = !!value;
    return (
      <Badge
        size={size}
        className={
          isPosted
            ? 'bg-emerald-50 text-[#0B6B3A] border-emerald-200 font-bold'
            : 'bg-gray-100 text-charcoal-muted border-gray-200'
        }
      >
        {isPosted ? '🌐 In Community' : '🔒 Private Archive'}
      </Badge>
    );
  }

  if (type === 'role') {
    const roleStr = String(value);
    const label = getRoleDisplayName(roleStr);

    let colorClasses = 'bg-gray-100 text-charcoal-dark border-gray-200';
    if (roleStr === 'super_admin') colorClasses = 'bg-purple-100 text-purple-800 border-purple-300 font-extrabold';
    else if (roleStr === 'platform_admin' || roleStr === 'admin') colorClasses = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
    else if (roleStr === 'moderator') colorClasses = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    else if (roleStr === 'support_admin') colorClasses = 'bg-teal-100 text-teal-800 border-teal-300 font-bold';

    return (
      <Badge size={size} className={colorClasses}>
        {label}
      </Badge>
    );
  }

  if (type === 'memory') {
    const status = String(value).toLowerCase();
    switch (status) {
      case 'published':
        return (
          <Badge size={size} className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">
            Published
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge size={size} className="bg-amber-100 text-amber-800 border-amber-200 font-bold">
            Pending Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge size={size} className="bg-red-100 text-red-800 border-red-200 font-bold">
            Rejected
          </Badge>
        );
      case 'hidden':
        return (
          <Badge size={size} className="bg-gray-200 text-gray-700 border-gray-300 font-medium">
            Hidden
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge size={size} className="bg-gray-100 text-charcoal-muted border-gray-200">
            Draft
          </Badge>
        );
    }
  }

  if (type === 'report') {
    const status = String(value).toLowerCase();
    switch (status) {
      case 'pending':
        return (
          <Badge size={size} className="bg-red-100 text-red-800 border-red-200 font-extrabold animate-pulse">
            Pending
          </Badge>
        );
      case 'under_review':
        return (
          <Badge size={size} className="bg-amber-100 text-amber-800 border-amber-200 font-bold">
            Under Review
          </Badge>
        );
      case 'resolved_dismissed':
        return (
          <Badge size={size} className="bg-gray-100 text-gray-700 border-gray-200">
            Dismissed
          </Badge>
        );
      case 'resolved_removed':
      case 'resolved':
        return (
          <Badge size={size} className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">
            Resolved
          </Badge>
        );
      default:
        return <Badge size={size}>{String(value)}</Badge>;
    }
  }

  if (type === 'membership') {
    const isPrem =
      typeof value === 'boolean'
        ? value
        : String(value).toLowerCase() === 'premium' ||
          String(value).toLowerCase() === 'true' ||
          String(value).toLowerCase() === 'active';
    return (
      <Badge
        size={size}
        className={
          isPrem
            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
            : 'bg-gray-100 text-charcoal-muted border-gray-200'
        }
      >
        {isPrem ? '👑 Premium' : 'Free Tier'}
      </Badge>
    );
  }

  return <Badge size={size}>{String(value)}</Badge>;
};
