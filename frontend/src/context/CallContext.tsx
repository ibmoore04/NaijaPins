import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { chatService } from '@/services/chat.service';
import { CallType, CallStatus } from '@/types/social';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ActiveCallData {
  callId?: string;
  conversationId: string;
  targetUser: {
    user_id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  callType: CallType;
  isIncoming: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
}

interface CallContextType {
  startCall: (
    conversationId: string,
    targetUser: { user_id: string; full_name: string; avatar_url?: string | null },
    callType: CallType
  ) => Promise<void>;
  endActiveCall: () => void;
  activeCall: ActiveCallData | null;
  isCalling: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const activeCallRef = useRef<ActiveCallData | null>(null);

  activeCallRef.current = activeCall;

  // 1. Listen for incoming calls across user's personal channel
  useEffect(() => {
    if (!user) return;

    const userChannel = supabase.channel(`user-calls:${user.id}`);
    userChannel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }: any) => {
        if (activeCallRef.current) {
          // Already on a call, auto-reject
          return;
        }

        setActiveCall({
          callId: payload.callId,
          conversationId: payload.conversationId,
          targetUser: payload.caller,
          callType: payload.callType || 'voice',
          isIncoming: true,
          incomingOffer: payload.offer,
        });
        setCallStatus('ringing');
        setIsVideoOff(payload.callType === 'voice');
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(userChannel);
      } catch {
        // Prevent socket closure race conditions on rapid re-renders
      }
    };
  }, [user?.id]);

  // 2. Duration timer for accepted calls
  useEffect(() => {
    if (callStatus === 'accepted') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Helper to safely play remote audio stream
  const attachAndPlayRemoteStream = async (stream: MediaStream) => {
    remoteStreamRef.current = stream;

    // Attach to dedicated remote audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.muted = false;
      try {
        await remoteAudioRef.current.play();
        setAutoplayBlocked(false);
      } catch (err) {
        console.warn('Autoplay blocked by browser policy:', err);
        setAutoplayBlocked(true);
      }
    }

    // Attach to remote video element if video call
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.volume = 1.0;
      remoteVideoRef.current.muted = false;
      try {
        await remoteVideoRef.current.play();
      } catch (err) {
        console.warn('Video play error:', err);
      }
    }
  };

  // Helper to flush queued ICE candidates
  const flushQueuedIceCandidates = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding queued ICE candidate', e);
        }
      }
    }
  };

  // 3. Start Outgoing Call
  const startCall = async (
    conversationId: string,
    targetUser: { user_id: string; full_name: string; avatar_url?: string | null },
    callType: CallType
  ) => {
    if (!user) return;

    // Check if blocked before initiating call
    const isBlocked = await chatService.isUserBlocked(user.id, targetUser.user_id);
    if (isBlocked) {
      alert('Cannot call this user due to block restrictions.');
      return;
    }

    setPermissionError(null);
    setAutoplayBlocked(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerMuted(false);
    setIsVideoOff(callType === 'voice');
    setCallStatus('ringing');
    iceCandidatesQueueRef.current = [];

    // Create DB call record
    const callId = await chatService.createCallRecord(conversationId, user.id, targetUser.user_id, callType);

    const newCallData: ActiveCallData = {
      callId: callId || undefined,
      conversationId,
      targetUser,
      callType,
      isIncoming: false,
    };
    setActiveCall(newCallData);

    // Initialize WebRTC Pipeline
    await setupWebRTCOutgoing(newCallData);
  };

  const setupWebRTCOutgoing = async (callData: ActiveCallData) => {
    if (!user) return;

    try {
      // Step A: Initialize PeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      // Handle Remote Track Arrivals
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        attachAndPlayRemoteStream(stream);
        setCallStatus('accepted');
      };

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate.toJSON(), senderId: user.id },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallStatus('accepted');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          endActiveCall(false, 'ended');
        }
      };

      // Step B: Acquire Local MediaStream BEFORE creating offer
      let localStream: MediaStream | null = null;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: callData.callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });
        localStreamRef.current = localStream;

        if (localVideoRef.current && callData.callType === 'video') {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.muted = true; // Local preview is ALWAYS muted
        }

        // Add each local track to peer connection
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream!);
        });
      } catch (err: any) {
        console.warn('Microphone/Camera access error:', err);
        setPermissionError('Microphone or Camera access was denied. Please allow permissions in browser settings.');
        return;
      }

      // Step C: Connect Realtime Signaling Channel
      const signalingChannelName = `call-signaling:${callData.conversationId}`;
      const signalingChannel = supabase.channel(signalingChannelName);
      channelRef.current = signalingChannel;

      signalingChannel
        .on('broadcast', { event: 'call-answer' }, async ({ payload }: any) => {
          if (payload.senderId !== user.id && payload.answer) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              await flushQueuedIceCandidates(pc);
              setCallStatus('accepted');
              if (callData.callId) {
                chatService.updateCallRecord(callData.callId, {
                  status: 'accepted',
                  answered_at: new Date().toISOString(),
                });
              }
            } catch (err) {
              console.error('Error setting remote description from answer:', err);
            }
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
          if (payload.senderId !== user.id && payload.candidate) {
            if (pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.error('Error adding ICE candidate:', e);
              }
            } else {
              iceCandidatesQueueRef.current.push(payload.candidate);
            }
          }
        })
        .on('broadcast', { event: 'call-rejected' }, () => {
          endActiveCall(false, 'rejected');
        })
        .on('broadcast', { event: 'call-ended' }, () => {
          endActiveCall(false, 'ended');
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            // Step D: Create Offer with local tracks attached
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: callData.callType === 'video',
            });
            await pc.setLocalDescription(offer);

            // Notify Receiver on their dedicated user channel
            const receiverChannel = supabase.channel(`user-calls:${callData.targetUser.user_id}`);
            receiverChannel.send({
              type: 'broadcast',
              event: 'incoming-call',
              payload: {
                callId: callData.callId,
                conversationId: callData.conversationId,
                callType: callData.callType,
                caller: {
                  user_id: user.id,
                  full_name: (user.user_metadata?.full_name as string) || 'Contributor',
                  avatar_url: (user.user_metadata?.avatar_url as string) || null,
                },
                offer,
              },
            });

            // Also broadcast on the conversation signaling channel
            signalingChannel.send({
              type: 'broadcast',
              event: 'call-offer',
              payload: { offer, senderId: user.id, callType: callData.callType },
            });
          }
        });
    } catch (err) {
      console.error('Error in setupWebRTCOutgoing:', err);
    }
  };

  // 4. Accept Incoming Call
  const handleAcceptIncomingCall = async () => {
    if (!user || !activeCall) return;

    try {
      setPermissionError(null);
      setAutoplayBlocked(false);
      iceCandidatesQueueRef.current = [];

      // Step A: Initialize PeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      // Handle Remote Track Arrivals
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        attachAndPlayRemoteStream(stream);
        setCallStatus('accepted');
      };

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate.toJSON(), senderId: user.id },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallStatus('accepted');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          endActiveCall(false, 'ended');
        }
      };

      // Step B: Acquire Local MediaStream BEFORE creating answer
      let localStream: MediaStream | null = null;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: activeCall.callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });
        localStreamRef.current = localStream;

        if (localVideoRef.current && activeCall.callType === 'video') {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.muted = true; // Local preview is ALWAYS muted
        }

        // Add each local track to peer connection
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream!);
        });
      } catch (err: any) {
        console.warn('Microphone/Camera permission error:', err);
        setPermissionError('Microphone or Camera access was denied. Please allow permissions in browser settings.');
        return;
      }

      // Step C: Connect signaling channel
      const signalingChannelName = `call-signaling:${activeCall.conversationId}`;
      const signalingChannel = supabase.channel(signalingChannelName);
      channelRef.current = signalingChannel;

      signalingChannel
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
          if (payload.senderId !== user.id && payload.candidate) {
            if (pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.error('Error adding ICE candidate:', e);
              }
            } else {
              iceCandidatesQueueRef.current.push(payload.candidate);
            }
          }
        })
        .on('broadcast', { event: 'call-ended' }, () => {
          endActiveCall(false, 'ended');
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            if (activeCall.incomingOffer) {
              try {
                // Set remote offer
                await pc.setRemoteDescription(new RTCSessionDescription(activeCall.incomingOffer));
                await flushQueuedIceCandidates(pc);

                // Create answer with local audio/video tracks attached
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                signalingChannel.send({
                  type: 'broadcast',
                  event: 'call-answer',
                  payload: { answer, senderId: user.id },
                });

                setCallStatus('accepted');

                if (activeCall.callId) {
                  chatService.updateCallRecord(activeCall.callId, {
                    status: 'accepted',
                    answered_at: new Date().toISOString(),
                  });
                }
              } catch (err) {
                console.error('Error during answer negotiation:', err);
              }
            }
          }
        });
    } catch (err) {
      console.error('Error in handleAcceptIncomingCall:', err);
    }
  };

  const handleDeclineIncomingCall = () => {
    if (activeCall && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-rejected',
        payload: { senderId: user?.id },
      });
    }
    endActiveCall(true, 'rejected');
  };

  const endActiveCall = (sendBroadcast = true, finalStatus: CallStatus = 'ended') => {
    if (sendBroadcast && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { senderId: user?.id },
      });
    }

    if (activeCall?.callId) {
      chatService.updateCallRecord(activeCall.callId, {
        status: finalStatus,
        ended_at: new Date().toISOString(),
        ended_by: user?.id,
        duration_seconds: callDuration,
      });
    }

    // Stop and clear local streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Clear remote elements
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    remoteStreamRef.current = null;
    iceCandidatesQueueRef.current = [];

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remove realtime channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setActiveCall(null);
    setCallStatus('ended');
    setCallDuration(0);
    setAutoplayBlocked(false);
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

  const toggleSpeaker = () => {
    const nextMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextMuted);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = nextMuted;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = nextMuted;
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

  const handleManualAudioEnable = async () => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      try {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        await remoteAudioRef.current.play();
        setAutoplayBlocked(false);
      } catch (err) {
        console.error('Manual audio play failed:', err);
      }
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <CallContext.Provider
      value={{
        startCall,
        endActiveCall,
        activeCall,
        isCalling: !!activeCall,
      }}
    >
      {children}

      {/* Hidden dedicated Remote Audio Element with volume 1 and unmuted */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />

      {/* Global Active Call & Incoming Call Modal UI */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none font-body">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col items-center justify-between p-6 sm:p-8 min-h-[480px] text-white relative">
            
            {/* Remote Video Stream (For Video Call) — unmuted for audio */}
            {activeCall.callType === 'video' && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            )}

            {/* Local Video Thumbnail — muted to avoid feedback loop */}
            {activeCall.callType === 'video' && !isVideoOff && (
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
                  src={activeCall.targetUser.avatar_url}
                  name={activeCall.targetUser.full_name || 'Contributor'}
                  size="xl"
                  className="ring-4 ring-emerald-500/40 shadow-2xl"
                />
                {callStatus === 'accepted' && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                )}
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                  {activeCall.targetUser.full_name || 'Contributor'}
                </h3>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                  {callStatus === 'ringing' &&
                    (activeCall.isIncoming
                      ? activeCall.callType === 'video'
                        ? 'Incoming Video Call...'
                        : 'Incoming Voice Call...'
                      : activeCall.callType === 'video'
                      ? 'Video Calling...'
                      : 'Calling...')}
                  {callStatus === 'accepted' && `Connected (${formatDuration(callDuration)})`}
                  {callStatus === 'ended' && 'Call Ended'}
                </p>

                {permissionError && (
                  <p className="text-[11px] text-amber-400 font-medium max-w-xs mt-2 bg-amber-950/60 p-2 rounded-xl border border-amber-800/40">
                    {permissionError}
                  </p>
                )}

                {autoplayBlocked && (
                  <button
                    type="button"
                    onClick={handleManualAudioEnable}
                    className="mt-2 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold flex items-center gap-1.5 mx-auto transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Tap to enable audio</span>
                  </button>
                )}
              </div>
            </div>

            {/* Center Ringing Spinner */}
            {callStatus === 'ringing' && !activeCall.isIncoming && (
              <div className="relative z-10 py-6">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            )}

            {/* Control Action Buttons */}
            <div className="relative z-10 w-full flex items-center justify-center gap-4 pt-6">
              {activeCall.isIncoming && callStatus === 'ringing' ? (
                <>
                  {/* Decline Button */}
                  <button
                    onClick={handleDeclineIncomingCall}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                    title="Decline Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>

                  {/* Accept Button */}
                  <button
                    onClick={handleAcceptIncomingCall}
                    className="w-14 h-14 rounded-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-bounce cursor-pointer"
                    title="Accept Call"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                </>
              ) : (
                <>
                  {/* Toggle Mute Microphone */}
                  <button
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isMuted ? 'bg-red-500/80 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                    title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Toggle Speaker (Remote Audio Output) */}
                  <button
                    onClick={toggleSpeaker}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isSpeakerMuted ? 'bg-amber-500/80 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                    title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
                  >
                    {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  {/* Toggle Video (for video calls) */}
                  {activeCall.callType === 'video' && (
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
                    onClick={() => endActiveCall(true, 'ended')}
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
      )}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
