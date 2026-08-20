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
  // Determine effective status in priority order:
  // 1. Read: is_read === true OR read_at !== null -> Double check in Emerald Green (#0B6B3A)
  // 2. Delivered: delivered_at !== null OR status === 'delivered' -> Double check in Gray
  // 3. Sent: Single check in Gray
  // 4. Sending: Clock
  // 5. Failed: Red Alert Circle

  let effectiveStatus: MessageDeliveryStatus = status || 'sent';

  if (isRead || Boolean(readAt) || status === 'read') {
    effectiveStatus = 'read';
  } else if (Boolean(deliveredAt) || status === 'delivered') {
    effectiveStatus = 'delivered';
  } else if (status === 'sending') {
    effectiveStatus = 'sending';
  } else if (status === 'failed') {
    effectiveStatus = 'failed';
  } else {
    effectiveStatus = 'sent';
  }

  // 1. Sending (Subtle Clock)
  if (effectiveStatus === 'sending') {
    return (
      <span
        className={`inline-flex items-center text-gray-400 animate-pulse ${className}`}
        title="Sending..."
        aria-label="Message Sending"
      >
        <Clock className="w-2.5 h-2.5 stroke-2" />
      </span>
    );
  }

  // 2. Failed (Error)
  if (effectiveStatus === 'failed') {
    return (
      <span
        className={`inline-flex items-center text-rose-500 ${className}`}
        title="Failed to send"
        aria-label="Message Failed"
      >
        <AlertCircle className="w-3 h-3 stroke-2" />
      </span>
    );
  }

  // 3. Read (Double checkmarks in green / emerald #0B6B3A)
  if (effectiveStatus === 'read') {
    return (
      <span
        className={`inline-flex items-center text-[#0B6B3A] ${className}`}
        title="Read"
        aria-label="Message Read"
      >
        <CheckCheck className="w-3.5 h-3.5 stroke-[2.5px]" />
      </span>
    );
  }

  // 4. Delivered (Double checkmarks in neutral gray)
  if (effectiveStatus === 'delivered') {
    return (
      <span
        className={`inline-flex items-center text-gray-400 ${className}`}
        title="Delivered"
        aria-label="Message Delivered"
      >
        <CheckCheck className="w-3.5 h-3.5 stroke-[2px]" />
      </span>
    );
  }

  // 5. Sent (Single checkmark in neutral gray)
  return (
    <span
      className={`inline-flex items-center text-gray-400 ${className}`}
      title="Sent"
      aria-label="Message Sent"
    >
      <Check className="w-3 h-3 stroke-[2.5px]" />
    </span>
  );
};
