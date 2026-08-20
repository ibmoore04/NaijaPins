import { supabase } from '@/lib/supabase';
import { CallType, CallStatus, Message } from '@/types/social';

export interface CallLogPayload {
  call_id: string;
  conversation_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: CallType;
  status: CallStatus;
  duration_seconds: number;
  started_at: string;
  ended_at: string;
}

export const callLogService = {
  /**
   * Parse structured call log payload from message.content
   */
  parseCallLogContent(content: string): Partial<CallLogPayload> {
    try {
      const parsed = JSON.parse(content);
      if (parsed && (parsed.call_id || parsed.call_type || parsed.status)) {
        return parsed;
      }
    } catch {
      // Fallback text parsing if not JSON
    }

    // Default fallback
    const isVideo = content.toLowerCase().includes('video');
    const isMissed = content.toLowerCase().includes('missed');
    const isDeclined = content.toLowerCase().includes('declined') || content.toLowerCase().includes('rejected');
    const isCancelled = content.toLowerCase().includes('no answer') || content.toLowerCase().includes('cancelled');

    return {
      call_type: isVideo ? 'video' : 'voice',
      status: isMissed ? 'missed' : isDeclined ? 'rejected' : isCancelled ? 'cancelled' : 'ended',
      duration_seconds: 0,
    };
  },

  /**
   * Format duration in seconds into human-readable format
   * e.g. "45s", "7 min", "1 hr 12 min"
   */
  formatCallDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs} hr ${mins} min`;
    }
    if (mins > 0) {
      return `${mins} min${secs > 0 && mins < 5 ? ` ${secs}s` : ''}`;
    }
    return `${secs}s`;
  },

  /**
   * Get human-friendly label for a call based on outcome and participant role
   */
  getCallOutcomeDetails(
    callData: Partial<CallLogPayload>,
    isCurrentUserCaller: boolean
  ): {
    title: string;
    subtitle: string;
    isMissedOrDeclined: boolean;
    isCompleted: boolean;
  } {
    const isVideo = callData.call_type === 'video';
    const status = callData.status || 'ended';
    const duration = this.formatCallDuration(callData.duration_seconds);

    const callTypeLabel = isVideo ? 'Video call' : 'Audio call';

    if (status === 'ended' || status === 'accepted') {
      return {
        title: callTypeLabel,
        subtitle: duration || 'Completed',
        isMissedOrDeclined: false,
        isCompleted: true,
      };
    }

    if (status === 'rejected') {
      return {
        title: callTypeLabel,
        subtitle: 'Declined',
        isMissedOrDeclined: true,
        isCompleted: false,
      };
    }

    if (status === 'missed') {
      return {
        title: isCurrentUserCaller ? callTypeLabel : `Missed ${callTypeLabel.toLowerCase()}`,
        subtitle: isCurrentUserCaller ? 'No answer' : 'Missed',
        isMissedOrDeclined: !isCurrentUserCaller,
        isCompleted: false,
      };
    }

    if (status === 'cancelled') {
      return {
        title: callTypeLabel,
        subtitle: 'No answer',
        isMissedOrDeclined: false,
        isCompleted: false,
      };
    }

    return {
      title: callTypeLabel,
      subtitle: status,
      isMissedOrDeclined: false,
      isCompleted: false,
    };
  },

  /**
   * Record a completed/missed/declined call in database and create persistent conversation timeline entry
   */
  async recordCallCompletion(
    callId: string,
    finalStatus: CallStatus,
    durationSeconds = 0
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      if (!callId) return { success: false };

      // 1. Try secure RPC
      const { data, error } = await supabase.rpc('log_call_completion', {
        p_call_id: callId,
        p_final_status: finalStatus,
        p_duration_seconds: Math.round(durationSeconds),
      });

      if (error) {
        console.warn('log_call_completion RPC error:', error.message);

        // Fallback: update calls table and insert message directly
        const { data: callRow } = await supabase
          .from('calls')
          .update({
            status: finalStatus,
            ended_at: new Date().toISOString(),
            duration_seconds: Math.round(durationSeconds),
          })
          .eq('id', callId)
          .select('id, conversation_id, caller_id, receiver_id, call_type, started_at')
          .single();

        if (callRow && callRow.conversation_id) {
          const content = JSON.stringify({
            call_id: callRow.id,
            conversation_id: callRow.conversation_id,
            caller_id: callRow.caller_id,
            receiver_id: callRow.receiver_id,
            call_type: callRow.call_type,
            status: finalStatus,
            duration_seconds: Math.round(durationSeconds),
            started_at: callRow.started_at,
            ended_at: new Date().toISOString(),
          });

          const { data: msgData } = await supabase
            .from('messages')
            .insert({
              conversation_id: callRow.conversation_id,
              sender_id: callRow.caller_id,
              content,
              message_type: 'call',
              call_id: callRow.id,
              is_read: false,
            })
            .select('id')
            .single();

          return { success: true, messageId: msgData?.id };
        }
      }

      return { success: true, messageId: data?.message_id };
    } catch (err) {
      console.error('Failed to record call completion:', err);
      return { success: false };
    }
  },

  /**
   * Format message preview for conversation list items
   */
  formatMessagePreview(message?: Message | null): string {
    if (!message) return 'Started a conversation';
    if (message.message_type === 'call') {
      const callData = this.parseCallLogContent(message.content);
      const isVideo = callData.call_type === 'video';
      const icon = isVideo ? '📹' : '📞';
      const duration = this.formatCallDuration(callData.duration_seconds);

      if (callData.status === 'ended' || callData.status === 'accepted') {
        return `${icon} ${isVideo ? 'Video call' : 'Audio call'}${duration ? ` (${duration})` : ''}`;
      }
      if (callData.status === 'rejected') {
        return `${icon} Declined ${isVideo ? 'video' : 'audio'} call`;
      }
      if (callData.status === 'missed') {
        return `${icon} Missed ${isVideo ? 'video' : 'audio'} call`;
      }
      return `${icon} ${isVideo ? 'Video call' : 'Audio call'} (No answer)`;
    }

    if (message.attachments && message.attachments.length > 0) {
      const first = message.attachments[0];
      if (first.type === 'image') return '📷 Photo';
      if (first.type === 'audio') return '🎤 Voice message';
      return '📎 Attachment';
    }

    return message.content || 'Started a conversation';
  },
};
