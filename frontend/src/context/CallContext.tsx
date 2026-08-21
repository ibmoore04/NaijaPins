import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { chatService } from '@/services/chat.service';
import { callLogService } from '@/services/callLog.service';
import { pushNotificationService } from '@/services/pushNotification.service';
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

export interface CallContextType {
  startCall: (
    conversationId: string,
    targetUser: { user_id: string; full_name: string; avatar_url?: string | null },
    callType: CallType
  ) => Promise<void>;
  endActiveCall: (sendBroadcast?: boolean, finalStatus?: CallStatus) => void;
  activeCall: ActiveCallData | null;
  isCalling: boolean;
  callStatus: CallStatus;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
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

// Web Audio API Ringtone Generator for incoming calls
class RingtonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private isPlaying = false;

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      // Lazy init or reuse existing
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }

      const ensureRunning = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };

      if (this.ctx.state === 'suspended') {
        window.addEventListener('click', ensureRunning, { once: true });
        window.addEventListener('touchstart', ensureRunning, { once: true });
        window.addEventListener('keydown', ensureRunning, { once: true });
      }

      const playDualTone = () => {
        if (!this.ctx || !this.isPlaying || this.ctx.state !== 'running') return;
        try {
          const now = this.ctx.currentTime;

          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
          gain.gain.setValueAtTime(0.2, now + 1.2);
          gain.gain.linearRampToValueAtTime(0, now + 1.3);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.3);
          osc2.stop(now + 1.3);
        } catch {
          // Ignore interruption
        }
      };

      if (this.ctx.state === 'running') {
        playDualTone();
      }
      this.intervalId = setInterval(playDualTone, 3000);
    } catch {
      // Audio autoplay policy notice caught gracefully
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      try {
        if (this.ctx.state !== 'closed') {
          this.ctx.close().catch(() => {});
        }
      } catch {
        // ignore
      }
      this.ctx = null;
    }
  }
}

const ringtone = new RingtonePlayer();
const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
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

  // 1. Listen for incoming calls across user's personal broadcast channel AND postgres changes + Pending Call Recovery
  useEffect(() => {
    if (!user) return;

    // A: Check for any pending active ringing call on startup/focus
    const checkPendingIncomingCalls = async () => {
      try {
        const cutoff = new Date(Date.now() - 60000).toISOString();
        const { data: pendingCall } = await supabase
          .from('calls')
          .select('id, conversation_id, caller_id, call_type, status, started_at')
          .eq('receiver_id', user.id)
          .eq('status', 'ringing')
          .gt('started_at', cutoff)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingCall && !activeCallRef.current) {
          console.log('[CALL] Recovered pending ringing call from database:', pendingCall);
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .eq('user_id', pendingCall.caller_id)
            .maybeSingle();

          setActiveCall({
            callId: pendingCall.id,
            conversationId: pendingCall.conversation_id,
            targetUser: {
              user_id: pendingCall.caller_id,
              full_name: callerProfile?.full_name || 'Contributor',
              avatar_url: callerProfile?.avatar_url || null,
            },
            callType: pendingCall.call_type || 'voice',
            isIncoming: true,
          });
          setCallStatus('ringing');
          setIsVideoOff(pendingCall.call_type === 'voice');
          ringtone.start();
        }
      } catch (err) {
        console.warn('[CALL] Error checking pending incoming calls:', err);
      }
    };

    checkPendingIncomingCalls();

    // B: Personal Broadcast Channel
    const userChannel = supabase.channel(`user-calls:${user.id}`);
    userChannel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }: any) => {
        console.log('[CALL] Received incoming-call broadcast:', payload);
        if (activeCallRef.current) return;

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
        ringtone.start();
      })
      .subscribe((status) => {
        console.log(`[CALL] Realtime subscription status for user-calls:${user.id}:`, status);
      });

    // C: Database Realtime Backup for Incoming Calls (Guaranteed delivery)
    const dbCallsChannel = supabase
      .channel(`db-calls:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          console.log('[CALL] Received DB calls INSERT:', payload.new);
          if (activeCallRef.current || payload.new.status !== 'ringing') return;

          // Fetch caller profile
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .eq('user_id', payload.new.caller_id)
            .maybeSingle();

          setActiveCall({
            callId: payload.new.id,
            conversationId: payload.new.conversation_id,
            targetUser: {
              user_id: payload.new.caller_id,
              full_name: callerProfile?.full_name || 'Contributor',
              avatar_url: callerProfile?.avatar_url || null,
            },
            callType: payload.new.call_type || 'voice',
            isIncoming: true,
          });
          setCallStatus('ringing');
          setIsVideoOff(payload.new.call_type === 'voice');
          ringtone.start();
        }
      )
      .subscribe();

    // D: Listen for Service Worker Messages (e.g. Call Declined from push notification action)
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CALL_DECLINED_FROM_NOTIFICATION') {
        if (activeCallRef.current && activeCallRef.current.callId === event.data.callId) {
          endActiveCall(true, 'rejected');
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      try {
        userChannel.unsubscribe();
        supabase.removeChannel(userChannel);
        dbCallsChannel.unsubscribe();
        supabase.removeChannel(dbCallsChannel);
      } catch {
        // Prevent socket closure race conditions on rapid re-renders
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [user?.id]);

  // 2. Duration timer for accepted calls & ringtone lifecycle
  useEffect(() => {
    if (callStatus === 'accepted') {
      ringtone.stop();
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (callStatus !== 'ringing') {
      ringtone.stop();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // 3. Ringing Timeout (45s) — Mark as Missed if unanswered
  useEffect(() => {
    let timeoutId: any = null;
    if (activeCall && callStatus === 'ringing') {
      timeoutId = setTimeout(() => {
        console.log('[CALL] Ringing timeout reached (45s) — marking call as missed (duration = 0)');
        endActiveCall(true, 'missed');
      }, 45000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeCall?.callId, callStatus]);

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

    console.log('[CALL DEBUG] Current auth user:', user.id);
    console.log('[CALL DEBUG] Conversation ID:', conversationId);
    console.log('[CALL DEBUG] Conversation targetUser object:', targetUser);
    console.log('[CALL DEBUG] Receiver auth UUID:', targetUser.user_id);

    // Guard: Prevent calling self
    if (user.id === targetUser.user_id) {
      console.error('[CALL] Cannot call yourself! Caller auth ID and Receiver auth ID are identical:', user.id);
      alert('Cannot start a call with yourself.');
      return;
    }

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

    console.log(`[CALL] Starting call to conversation ${conversationId}, receiver: ${targetUser.user_id}`);

    // Create DB call record
    const callId = await chatService.createCallRecord(conversationId, user.id, targetUser.user_id, callType);
    
    if (!callId) {
      console.error('[CALL] Failed to create call record in database. Aborting call initialization.');
      setCallStatus('ended');
      setActiveCall(null);
      alert('Failed to initiate call. Please check communication permissions.');
      return;
    }

    console.log(`[CALL] Call record created: ${callId}`);
    console.log(`[CALL] Receiver ID resolved: ${targetUser.user_id}`);

    const newCallData: ActiveCallData = {
      callId,
      conversationId,
      targetUser,
      callType,
      isIncoming: false,
    };
    setActiveCall(newCallData);

    // Trigger Web Push Notification to target user for background/off-site call alert
    const callerName = profile?.full_name || (user.user_metadata?.full_name as string) || 'Contributor';
    console.log('[REAL PUSH][CALL] Starting');
    console.log('[REAL PUSH][CALL] Target user ID:', targetUser.user_id);
    const callPushPayload = {
      targetUserId: targetUser.user_id,
      notificationType: 'incoming_call' as const,
      title: `📞 Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`,
      body: `${callerName} is calling you on NaijaPins`,
      data: {
        url: `/messages`,
        callId,
        callType,
        conversationId,
      },
    };
    console.log('[REAL PUSH][CALL] Payload:', callPushPayload);
    console.log('[REAL PUSH][CALL] Invoking Edge Function');

    pushNotificationService.sendPushNotification(callPushPayload).then((res) => {
      console.log('[REAL PUSH][CALL] Edge Function HTTP/result:', res);
      console.log('[REAL PUSH][CALL] sent:', res.data?.sent ?? (res.success ? 1 : 0));
      console.log('[REAL PUSH][CALL] failed:', res.data?.failed ?? (res.success ? 0 : 1));
    }).catch((e) => console.warn('[REAL PUSH][CALL] Push notification for call error:', e));

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
        .on('broadcast', { event: 'request-offer' }, async () => {
          if (pc.localDescription) {
            console.log('[CALL] Resending offer upon receiver request');
            signalingChannel.send({
              type: 'broadcast',
              event: 'call-offer',
              payload: { offer: pc.localDescription, senderId: user.id, callType: callData.callType },
            });
          }
        })
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
            receiverChannel.subscribe(async (recvStatus) => {
              if (recvStatus === 'SUBSCRIBED') {
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
              }
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
    ringtone.stop();

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
        .on('broadcast', { event: 'call-offer' }, async ({ payload }: any) => {
          if (payload.senderId !== user.id && payload.offer) {
            try {
              console.log('[CALL] Receiver received call-offer on signaling channel');
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              await flushQueuedIceCandidates(pc);

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
              console.error('Error handling call-offer on answerer:', err);
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
        .on('broadcast', { event: 'call-ended' }, () => {
          endActiveCall(false, 'ended');
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[CALL] Receiver subscribed to signaling channel');
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
            } else {
              // Request offer from caller if not pre-populated
              signalingChannel.send({
                type: 'broadcast',
                event: 'request-offer',
                payload: { senderId: user.id },
              });
            }
          }
        });
    } catch (err) {
      console.error('Error in handleAcceptIncomingCall:', err);
    }
  };

  const handleDeclineIncomingCall = () => {
    ringtone.stop();
    if (activeCall && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-rejected',
        payload: { senderId: user?.id },
      });
    }
    endActiveCall(true, 'rejected');
  };

  const endActiveCall = (sendBroadcast = true, overrideStatus?: CallStatus) => {
    ringtone.stop();

    // Determine accurate final status based on actual call lifecycle
    let resolvedStatus: CallStatus = overrideStatus || 'ended';
    let finalDuration = callDuration;

    if (!overrideStatus) {
      if (callStatus === 'ringing') {
        // Never answered
        resolvedStatus = activeCall?.isIncoming ? 'missed' : 'cancelled';
        finalDuration = 0;
      } else if (callStatus === 'accepted') {
        resolvedStatus = 'ended';
      }
    } else if (overrideStatus === 'rejected' || overrideStatus === 'missed' || overrideStatus === 'cancelled') {
      finalDuration = 0;
    }

    console.log(`[CALL] Ending call: resolvedStatus=${resolvedStatus}, duration=${finalDuration}s`);

    if (sendBroadcast && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: resolvedStatus === 'rejected' ? 'call-rejected' : 'call-ended',
        payload: { senderId: user?.id, status: resolvedStatus },
      });
    }

    if (activeCall?.callId) {
      callLogService.recordCallCompletion(
        activeCall.callId,
        resolvedStatus,
        finalDuration
      );
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
        callStatus,
        callDuration,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
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

export const useCall = (): CallContextType => {
  const context = useContext(CallContext);
  if (!context) {
    console.warn('useCall was called outside CallProvider; providing fallback');
    return {
      startCall: async () => {},
      endActiveCall: () => {},
      activeCall: null,
      isCalling: false,
      callStatus: 'ringing',
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      toggleMute: () => {},
      toggleVideo: () => {},
      toggleSpeaker: () => {},
    };
  }
  return context;
};
