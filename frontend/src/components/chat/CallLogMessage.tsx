import React from 'react';
import { Message } from '@/types/social';
import { callLogService } from '@/services/callLog.service';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/context/CallContext';
import {
  Phone,
  PhoneMissed,
  Video,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface CallLogMessageProps {
  message: Message;
  isCurrentUser: boolean;
  onCallBack?: (callType: 'voice' | 'video') => void;
}

export const CallLogMessage: React.FC<CallLogMessageProps> = ({
  message,
  isCurrentUser,
  onCallBack,
}) => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const callData = callLogService.parseCallLogContent(message.content);

  const isCaller = callData.caller_id ? callData.caller_id === user?.id : isCurrentUser;
  const isVideo = callData.call_type === 'video';
  const { title, subtitle, isMissedOrDeclined, isCompleted } = callLogService.getCallOutcomeDetails(
    callData,
    isCaller
  );

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleInitiateCallback = () => {
    if (onCallBack) {
      onCallBack(isVideo ? 'video' : 'voice');
    } else if (message.conversation_id && message.sender) {
      startCall(
        message.conversation_id,
        {
          user_id: message.sender.user_id || (message.sender as any).id,
          full_name: message.sender.full_name || 'Contributor',
          avatar_url: message.sender.avatar_url,
        },
        isVideo ? 'video' : 'voice'
      );
    }
  };

  return (
    <div
      className={`group flex flex-col my-2 max-w-xs sm:max-w-sm ${
        isCurrentUser ? 'ml-auto items-end' : 'mr-auto items-start'
      }`}
    >
      <div
        className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-2xs transition-all ${
          isCurrentUser
            ? 'bg-[#E8F5EE] border-emerald-100 text-gray-900 rounded-tr-xs'
            : 'bg-white border-gray-100 text-gray-900 rounded-tl-xs'
        }`}
      >
        {/* Call Icon Badge */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
            isMissedOrDeclined
              ? 'bg-rose-50 text-rose-600 border border-rose-100'
              : isCompleted
              ? 'bg-emerald-100/70 text-[#0B6B3A] border border-emerald-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}
        >
          {isVideo ? (
            <Video className="w-5 h-5" />
          ) : isMissedOrDeclined ? (
            <PhoneMissed className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
        </div>

        {/* Call Title & Metadata */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <h4
              className={`text-xs font-bold truncate ${
                isMissedOrDeclined ? 'text-rose-600' : 'text-gray-900'
              }`}
            >
              {title}
            </h4>
            {isCaller ? (
              <span title="Outgoing">
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </span>
            ) : (
              <span title="Incoming">
                <ArrowDownLeft
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isMissedOrDeclined ? 'text-rose-500' : 'text-emerald-600'
                  }`}
                />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-[11px] font-medium ${
                isMissedOrDeclined ? 'text-rose-500 font-semibold' : 'text-gray-500'
              }`}
            >
              {subtitle}
            </span>
            <span className="text-[10px] text-gray-400 font-normal">• {formattedTime}</span>
          </div>
        </div>

        {/* Quick Call Back Action */}
        <button
          type="button"
          onClick={handleInitiateCallback}
          className={`p-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
            isMissedOrDeclined
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
              : 'bg-[#0B6B3A] hover:bg-[#064D2A] text-white shadow-xs'
          }`}
          title={`Call back (${isVideo ? 'Video' : 'Voice'})`}
        >
          {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline text-[10px]">Call back</span>
        </button>
      </div>
    </div>
  );
};
