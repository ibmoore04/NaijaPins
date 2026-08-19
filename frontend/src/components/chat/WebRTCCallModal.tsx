import React, { useState, useEffect, useRef } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { supabase } from '@/lib/supabase';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Loader2,
} from 'lucide-react';

interface WebRTCCallModalProps {
  conversationId: string;
  currentUserId: string;
  targetUser: {
    user_id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  callType: 'voice' | 'video';
  isIncoming?: boolean;
  incomingOffer?: any;
  onClose: () => void;
}

export const WebRTCCallModal: React.FC<WebRTCCallModalProps> = ({
  conversationId,
  currentUserId,
  targetUser,
  callType,
  isIncoming = false,
  incomingOffer,
  onClose,
}) => {
  const [callStatus, setCallStatus] = useState<'calling' | 'incoming' | 'connected' | 'ended'>(
    isIncoming ? 'incoming' : 'calling'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [callDuration, setCallDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  const channelName = `call:${conversationId}`;

  useEffect(() => {
    let pc: RTCPeerConnection;

    const setupCall = async () => {
      try {
        // 1. Initialize RTCPeerConnection
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });
        peerConnectionRef.current = pc;

        // 2. Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setCallStatus('connected');
          }
        };

        // 3. Handle ICE Candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate, senderId: currentUserId },
            });
          }
        };

        // 4. Request Local Media Stream
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: callType === 'video',
            });
            localStreamRef.current = stream;

            if (localVideoRef.current && callType === 'video') {
              localVideoRef.current.srcObject = stream;
            }

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          }
        } catch (err: any) {
          console.warn('Microphone/Camera access error:', err);
          setPermissionError('Please allow camera/microphone access in your browser settings.');
        }

        // 5. Connect Realtime Signaling Channel
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel
          .on('broadcast', { event: 'call-answer' }, async ({ payload }: any) => {
            if (payload.senderId !== currentUserId && payload.answer) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              setCallStatus('connected');
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
            if (payload.senderId !== currentUserId && payload.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.error('Error adding ICE candidate:', e);
              }
            }
          })
          .on('broadcast', { event: 'call-ended' }, () => {
            endCall(false);
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED' && !isIncoming) {
              // Outgoing call: Create Offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: 'broadcast',
                event: 'call-offer',
                payload: {
                  offer,
                  senderId: currentUserId,
                  callType,
                  senderName: 'Contributor',
                },
              });
            }
          });

        // If incoming call with existing offer, set remote description
        if (isIncoming && incomingOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        }
      } catch (err) {
        console.error('Call initialization error:', err);
      }
    };

    setupCall();

    return () => {
      endCall(true);
    };
  }, []);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const handleAcceptCall = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      // Get local stream if not yet acquired
      if (!localStreamRef.current && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        localStreamRef.current = stream;
        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      if (incomingOffer && !pc.remoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'call-answer',
          payload: { answer, senderId: currentUserId },
        });
      }

      setCallStatus('connected');
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  };

  const endCall = (sendBroadcast = true) => {
    if (sendBroadcast && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { senderId: currentUserId },
      });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none font-body">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col items-center justify-between p-6 sm:p-8 min-h-[480px] text-white relative">
        
        {/* Remote Video Stream (If Video Call) */}
        {callType === 'video' && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        )}

        {/* Local Video Thumbnail */}
        {callType === 'video' && !isVideoOff && (
          <div className="absolute top-4 right-4 w-28 h-36 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg z-10 bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Contributor Profile Info */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-3 pt-6">
          <div className="relative">
            <UserAvatar
              src={targetUser.avatar_url}
              name={targetUser.full_name || 'Contributor'}
              size="xl"
              className="ring-4 ring-emerald-500/40 shadow-2xl"
            />
            {callStatus === 'connected' && (
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            )}
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              {targetUser.full_name || 'Contributor'}
            </h3>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
              {callStatus === 'calling' && (callType === 'video' ? 'Video Calling...' : 'Calling...')}
              {callStatus === 'incoming' && (callType === 'video' ? 'Incoming Video Call...' : 'Incoming Voice Call...')}
              {callStatus === 'connected' && `Connected (${formatDuration(callDuration)})`}
              {callStatus === 'ended' && 'Call Ended'}
            </p>

            {permissionError && (
              <p className="text-[11px] text-amber-400 font-medium max-w-xs mt-2 bg-amber-950/60 p-2 rounded-xl border border-amber-800/40">
                {permissionError}
              </p>
            )}
          </div>
        </div>

        {/* Center Calling Spinner */}
        {callStatus === 'calling' && (
          <div className="relative z-10 py-6">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Control Action Buttons */}
        <div className="relative z-10 w-full flex items-center justify-center gap-4 pt-6">
          {callStatus === 'incoming' ? (
            <>
              {/* Decline Button */}
              <button
                onClick={() => endCall(true)}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title="Decline Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              {/* Accept Button */}
              <button
                onClick={handleAcceptCall}
                className="w-14 h-14 rounded-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-bounce cursor-pointer"
                title="Accept Call"
              >
                <Phone className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              {/* Toggle Mute */}
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isMuted ? 'bg-red-500/80 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Toggle Video (for video calls) */}
              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isVideoOff ? 'bg-red-500/80 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                  title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={() => endCall(true)}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
