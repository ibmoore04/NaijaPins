import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { MessageDeliveryStatus } from '@/types/social';

interface MessageStatusIndicatorProps {
  status?: MessageDeliveryStatus;
  isRead?: boolean;
  deliveredAt?: string | null;
  readAt?: string | null;
  className?: string;
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  isRead,
  deliveredAt,
  readAt,
  className = '',
}) => {
  // Determine effective delivery status
  let effectiveStatus: MessageDeliveryStatus = status || 'sent';

  if (!status) {
    if (isRead || Boolean(readAt)) {
      effectiveStatus = 'read';
    } else if (Boolean(deliveredAt)) {
      effectiveStatus = 'delivered';
    } else {
      effectiveStatus = 'sent';
    }
  }

  // 1. Sending (Subtle Clock / Pending indicator)
  if (effectiveStatus === 'sending') {
    return (
      <span
        className={`inline-flex items-center text-white/60 animate-pulse ${className}`}
        title="Sending..."
        aria-label="Message Sending"
      >
        <Clock className="w-2.5 h-2.5 stroke-2" />
      </span>
    );
  }

  // 2. Failed (Error / Retry indicator)
  if (effectiveStatus === 'failed') {
    return (
      <span
        className={`inline-flex items-center text-rose-300 ${className}`}
        title="Failed to send. Tap to retry."
        aria-label="Message Failed"
      >
        <AlertCircle className="w-3 h-3 stroke-2" />
      </span>
    );
  }

  // 3. Read (Double active checkmarks in bright emerald)
  if (effectiveStatus === 'read') {
    return (
      <span
        className={`inline-flex items-center text-emerald-300 drop-shadow-xs ${className}`}
        title="Read"
        aria-label="Message Read"
      >
        <CheckCheck className="w-3.5 h-3.5 stroke-[2.5px]" />
      </span>
    );
  }

  // 4. Delivered (Double checkmarks in subtle neutral white/grey)
  if (effectiveStatus === 'delivered') {
    return (
      <span
        className={`inline-flex items-center text-white/80 ${className}`}
        title="Delivered"
        aria-label="Message Delivered"
      >
        <CheckCheck className="w-3.5 h-3.5 stroke-[2px]" />
      </span>
    );
  }

  // 5. Sent (Single checkmark in subtle neutral)
  return (
    <span
      className={`inline-flex items-center text-white/70 ${className}`}
      title="Sent"
      aria-label="Message Sent"
    >
      <Check className="w-3 h-3 stroke-[2.5px]" />
    </span>
  );
};
