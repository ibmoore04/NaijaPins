import React from 'react';
import { SupportTicketStatus, SupportTicketPriority, SupportTicketType } from '@/types/support';
import {
  AlertCircle,
  Clock,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Flag,
  MessageSquare,
  User,
  Shield,
  CreditCard,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  Bug,
} from 'lucide-react';

export const SupportStatusBadge: React.FC<{ status: SupportTicketStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const configs: Record<SupportTicketStatus, { label: string; bg: string; text: string; icon: any }> = {
    open: {
      label: 'Open',
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: Clock,
    },
    under_review: {
      label: 'Under Review',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      icon: AlertCircle,
    },
    waiting_for_contributor: {
      label: 'Waiting on You',
      bg: 'bg-purple-50 border-purple-200',
      text: 'text-purple-700',
      icon: HelpCircle,
    },
    resolved: {
      label: 'Resolved',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-[#0B6B3A]',
      icon: CheckCircle2,
    },
    closed: {
      label: 'Closed',
      bg: 'bg-gray-100 border-gray-200',
      text: 'text-charcoal-muted',
      icon: XCircle,
    },
    reopened: {
      label: 'Reopened',
      bg: 'bg-orange-50 border-orange-200',
      text: 'text-orange-700',
      icon: RotateCcw,
    },
  };

  const config = configs[status] || configs.open;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold ${config.bg} ${config.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
};

export const SupportPriorityBadge: React.FC<{ priority: SupportTicketPriority; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'md',
}) => {
  const configs: Record<SupportTicketPriority, { label: string; bg: string; text: string }> = {
    low: {
      label: 'Low Priority',
      bg: 'bg-gray-100 border-gray-200',
      text: 'text-charcoal-muted',
    },
    normal: {
      label: 'Normal',
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
    },
    high: {
      label: 'High',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
    },
    urgent: {
      label: 'Urgent',
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
    },
  };

  const config = configs[priority] || configs.normal;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-extrabold uppercase tracking-wide ${config.bg} ${config.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
      }`}
    >
      {config.label}
    </span>
  );
};

export const SupportTypeBadge: React.FC<{ type: SupportTicketType; size?: 'sm' | 'md' }> = ({
  type,
  size = 'md',
}) => {
  const configs: Record<SupportTicketType, { label: string; icon: any }> = {
    bug: { label: 'Bug / Technical Problem', icon: Bug },
    memory_report: { label: 'Memory Report', icon: Flag },
    comment_report: { label: 'Comment Report', icon: MessageSquare },
    user_report: { label: 'User Report', icon: User },
    account: { label: 'Account & Profile', icon: User },
    security: { label: 'Security & Privacy', icon: Shield },
    membership: { label: 'Membership & Billing', icon: CreditCard },
    map_issue: { label: 'Map / GPS Issue', icon: MapPin },
    media_issue: { label: 'Media Upload', icon: ImageIcon },
    feature_request: { label: 'Feature Request', icon: Sparkles },
    general: { label: 'General Inquiry', icon: HelpCircle },
  };

  const config = configs[type] || configs.general;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold text-charcoal-dark ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5 text-[#0B6B3A]' : 'w-4 h-4 text-[#0B6B3A]'} />
      <span>{config.label}</span>
    </span>
  );
};
