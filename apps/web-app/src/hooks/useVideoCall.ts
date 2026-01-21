/**
 * useVideoCall Hook
 * React hook for managing video and voice calls with WebRTC
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Type declarations for mobile-specific and screen sharing APIs
declare global {
  interface MediaStreamTrack {
    /** Mobile-specific method to switch between front and back cameras */
    _switchCamera?: () => Promise<void>;
  }
}

// Types
export type CallStatus =
  | 'idle'
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'failed'
  | 'rejected'
  | 'busy'
  | 'missed';

export type CallType = 'video' | 'audio';

export interface CallParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface CallState {
  status: CallStatus;
  callId: string | null;
  callType: CallType | null;
  localParticipant: CallParticipant | null;
  remoteParticipant: CallParticipant | null;
  duration: number;
  startTime: Date | null;
  endTime: Date | null;
  error: string | null;
}

export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: CallType;
  sdp: RTCSessionDescriptionInit;
  webrtcConfig: RTCConfiguration;
}

export interface CallStats {
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  bytesSent: number;
  jitter: number;
  roundTripTime: number;
  bitrate: number;
  frameRate?: number;
  resolution?: { width: number; height: number };
}

interface UseVideoCallOptions {
  serverUrl: string;
  token: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  onIncomingCall?: (call: IncomingCall) => void;
  onCallEnded?: (reason: string, duration: number) => void;
  onError?: (error: Error) => void;
}

interface UseVideoCallReturn {
  // State
  callState: CallState;
  incomingCall: IncomingCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStats: CallStats | null;
  isConnected: boolean;

  // Actions
  startCall: (
    recipientId: string,
    recipientName: string,
    callType: CallType
  ) => Promise<string | null>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: (reason?: string) => void;
  toggleMute: () => boolean;
  toggleVideo: () => boolean;
  switchCamera: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useVideoCall(options: UseVideoCallOptions): UseVideoCallReturn {
  const { serverUrl, token, userId, userName, userAvatar, onIncomingCall, onCallEnded, onError } =
    options;

  // State
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    callId: null,
    callType: null,
    localParticipant: null,
    remoteParticipant: null,
    duration: 0,
    startTime: null,
    endTime: null,
    error: null,
  });
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStats, setCallStats] = useState<CallStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const webrtcConfigRef = useRef<RTCConfiguration>({ iceServers: DEFAULT_ICE_SERVERS });

  // Initialize socket connection
  useEffect(() => {
    const socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle incoming call
    socket.on('call:incoming', (data: IncomingCall) => {
      setIncomingCall(data);
      webrtcConfigRef.current = data.webrtcConfig || { iceServers: DEFAULT_ICE_SERVERS };

      setCallState((prev) => ({
        ...prev,
        status: 'ringing',
        callId: data.callId,
        callType: data.callType,
        remoteParticipant: {
          id: data.callerId,
          name: data.callerName,
          avatarUrl: data.callerAvatar,
          isMuted: false,
          isVideoEnabled: data.callType === 'video',
          isScreenSharing: false,
        },
      }));

      onIncomingCall?.(data);
    });

    // Handle call answered
    socket.on(
      'call:answered',
      async (data: {
        callId: string;
        calleeId: string;
        calleeName: string;
        calleeAvatar?: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        try {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.sdp)
            );

            // Process queued ICE candidates
            for (const candidate of iceCandidatesQueue.current) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidatesQueue.current = [];
          }

          setCallState((prev) => ({
            ...prev,
            status: 'connecting',
            remoteParticipant: {
              id: data.calleeId,
              name: data.calleeName,
              avatarUrl: data.calleeAvatar,
              isMuted: false,
              isVideoEnabled: prev.callType === 'video',
              isScreenSharing: false,
            },
          }));
        } catch (error) {
          console.error('Error handling call answered:', error);
        }
      }
    );

    // Handle call rejected
    socket.on('call:rejected', () => {
      handleCallEnded('rejected', 0);
    });

    // Handle call ended
    socket.on('call:ended', (data: { callId: string; reason: string; duration?: number }) => {
      handleCallEnded(data.reason, data.duration || 0);
    });

    // Handle call timeout
    socket.on('call:timeout', () => {
      handleCallEnded('missed', 0);
    });

    // Handle ICE candidate
    socket.on(
      'call:ice-candidate',
      async (data: { callId: string; candidate: RTCIceCandidateInit }) => {
        try {
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            iceCandidatesQueue.current.push(data.candidate);
          }
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    );

    // Handle media toggle from remote
    socket.on(
      'call:media-toggle',
      (data: { callId: string; userId: string; audio: boolean; video: boolean }) => {
        setCallState((prev) => {
          if (prev.remoteParticipant && prev.remoteParticipant.id === data.userId) {
            return {
              ...prev,
              remoteParticipant: {
                ...prev.remoteParticipant,
                isMuted: !data.audio,
                isVideoEnabled: data.video,
              },
            };
          }
          return prev;
        });
      }
    );

    // Handle renegotiation
    socket.on(
      'call:renegotiate',
      async (data: { callId: string; sdp: RTCSessionDescriptionInit; fromUserId: string }) => {
        try {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.sdp)
            );

            if (data.sdp.type === 'offer') {
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);

              socket.emit('call:renegotiate', {
                callId: data.callId,
                sdp: answer,
              });
            }
          }
        } catch (error) {
          console.error('Error handling renegotiation:', error);
        }
      }
    );

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      cleanup();
    };
  }, [serverUrl, token]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setRemoteStream(null);
    setCallStats(null);
    iceCandidatesQueue.current = [];
  }, [localStream]);

  // Handle call ended
  const handleCallEnded = useCallback(
    (reason: string, duration: number) => {
      const finalDuration = callState.startTime
        ? Math.floor((Date.now() - callState.startTime.getTime()) / 1000)
        : duration;

      setCallState((prev) => ({
        ...prev,
        status: reason === 'missed' ? 'missed' : reason === 'rejected' ? 'rejected' : 'ended',
        endTime: new Date(),
        duration: finalDuration,
      }));

      setIncomingCall(null);
      onCallEnded?.(reason, finalDuration);

      // Cleanup after a short delay to allow UI transition
      setTimeout(() => {
        cleanup();
        setCallState({
          status: 'idle',
          callId: null,
          callType: null,
          localParticipant: null,
          remoteParticipant: null,
          duration: 0,
          startTime: null,
          endTime: null,
          error: null,
        });
      }, 2000);
    },
    [callState.startTime, cleanup, onCallEnded]
  );

  // Create peer connection
  const createPeerConnection = useCallback(
    async (stream: MediaStream): Promise<RTCPeerConnection> => {
      const pc = new RTCPeerConnection(webrtcConfigRef.current);

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current && callState.callId) {
          socketRef.current.emit('call:ice-candidate', {
            callId: callState.callId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case 'connected':
            setCallState((prev) => ({
              ...prev,
              status: 'connected',
              startTime: prev.startTime || new Date(),
            }));
            startDurationTimer();
            startStatsCollection(pc);
            break;
          case 'disconnected':
            setCallState((prev) => ({ ...prev, status: 'reconnecting' }));
            break;
          case 'failed':
            handleCallEnded('failed', 0);
            break;
          case 'closed':
            // Already handled
            break;
        }
      };

      // Handle remote tracks
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [callState.callId, handleCallEnded]
  );

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }

    durationTimerRef.current = setInterval(() => {
      setCallState((prev) => ({
        ...prev,
        duration: prev.startTime ? Math.floor((Date.now() - prev.startTime.getTime()) / 1000) : 0,
      }));
    }, 1000);
  }, []);

  // Start stats collection
  const startStatsCollection = useCallback(
    (pc: RTCPeerConnection) => {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
      }

      statsTimerRef.current = setInterval(async () => {
        try {
          const stats = await pc.getStats();
          const newStats: Partial<CallStats> = {};

          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              newStats.packetsLost = report.packetsLost;
              newStats.packetsReceived = report.packetsReceived;
              newStats.bytesReceived = report.bytesReceived;
              newStats.jitter = report.jitter;
              newStats.frameRate = report.framesPerSecond;
            }
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              newStats.bytesSent = report.bytesSent;
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              newStats.roundTripTime = report.currentRoundTripTime;
              if (report.availableOutgoingBitrate) {
                newStats.bitrate = report.availableOutgoingBitrate;
              }
            }
          });

          setCallStats(newStats as CallStats);

          // Report quality to server
          if (socketRef.current && callState.callId) {
            socketRef.current.emit('call:quality-report', {
              callId: callState.callId,
              report: newStats,
            });
          }
        } catch (error) {
          console.error('Error collecting stats:', error);
        }
      }, 2000);
    },
    [callState.callId]
  );

  // Start a call
  const startCall = useCallback(
    async (
      recipientId: string,
      recipientName: string,
      callType: CallType
    ): Promise<string | null> => {
      if (!socketRef.current || !isConnected) {
        onError?.(new Error('Not connected to server'));
        return null;
      }

      try {
        setCallState((prev) => ({
          ...prev,
          status: 'initiating',
          callType,
          localParticipant: {
            id: userId,
            name: userName,
            avatarUrl: userAvatar,
            isMuted: false,
            isVideoEnabled: callType === 'video',
            isScreenSharing: false,
          },
          remoteParticipant: {
            id: recipientId,
            name: recipientName,
            isMuted: false,
            isVideoEnabled: callType === 'video',
            isScreenSharing: false,
          },
        }));

        // Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video:
            callType === 'video'
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30 },
                }
              : false,
        });
        setLocalStream(stream);

        // Create peer connection and offer
        const pc = await createPeerConnection(stream);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);

        // Send offer to server
        return new Promise((resolve, reject) => {
          socketRef.current!.emit(
            'call:offer',
            {
              calleeId: recipientId,
              calleeName: recipientName,
              callType,
              sdp: pc.localDescription,
            },
            (response: {
              success: boolean;
              callId?: string;
              webrtcConfig?: RTCConfiguration;
              error?: string;
            }) => {
              if (response.success && response.callId) {
                if (response.webrtcConfig) {
                  webrtcConfigRef.current = response.webrtcConfig;
                }

                setCallState((prev) => ({
                  ...prev,
                  status: 'ringing',
                  callId: response.callId!,
                }));
                resolve(response.callId);
              } else {
                cleanup();
                setCallState((prev) => ({
                  ...prev,
                  status: response.error === 'User is busy' ? 'busy' : 'failed',
                  error: response.error || 'Failed to start call',
                }));
                reject(new Error(response.error || 'Failed to start call'));
              }
            }
          );
        });
      } catch (error: any) {
        console.error('Error starting call:', error);
        cleanup();
        setCallState((prev) => ({
          ...prev,
          status: 'failed',
          error: error.message,
        }));
        onError?.(error);
        return null;
      }
    },
    [isConnected, userId, userName, userAvatar, createPeerConnection, cleanup, onError]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !socketRef.current) return;

    try {
      setCallState((prev) => ({ ...prev, status: 'connecting' }));

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          incomingCall.callType === 'video'
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : false,
      });
      setLocalStream(stream);

      // Create peer connection
      const pc = await createPeerConnection(stream);

      // Set remote description (offer)
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));

      // Create and set answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Process queued ICE candidates
      for (const candidate of iceCandidatesQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidatesQueue.current = [];

      // Send answer to server
      socketRef.current.emit(
        'call:answer',
        {
          callId: incomingCall.callId,
          sdp: pc.localDescription,
        },
        (response: { success: boolean; error?: string }) => {
          if (!response.success) {
            console.error('Failed to send answer:', response.error);
            handleCallEnded('failed', 0);
          }
        }
      );

      setCallState((prev) => ({
        ...prev,
        localParticipant: {
          id: userId,
          name: userName,
          avatarUrl: userAvatar,
          isMuted: false,
          isVideoEnabled: incomingCall.callType === 'video',
          isScreenSharing: false,
        },
      }));

      setIncomingCall(null);
    } catch (error: any) {
      console.error('Error accepting call:', error);
      cleanup();
      setCallState((prev) => ({
        ...prev,
        status: 'failed',
        error: error.message,
      }));
      onError?.(error);
    }
  }, [
    incomingCall,
    userId,
    userName,
    userAvatar,
    createPeerConnection,
    cleanup,
    handleCallEnded,
    onError,
  ]);

  // Reject incoming call
  const rejectCall = useCallback(
    (reason: string = 'rejected') => {
      if (!incomingCall || !socketRef.current) return;

      socketRef.current.emit(
        'call:reject',
        {
          callId: incomingCall.callId,
          reason,
        },
        () => {}
      );

      setIncomingCall(null);
      setCallState({
        status: 'idle',
        callId: null,
        callType: null,
        localParticipant: null,
        remoteParticipant: null,
        duration: 0,
        startTime: null,
        endTime: null,
        error: null,
      });
    },
    [incomingCall]
  );

  // End current call
  const endCall = useCallback(
    (reason: string = 'user_ended') => {
      if (!socketRef.current || !callState.callId) return;

      socketRef.current.emit(
        'call:hangup',
        {
          callId: callState.callId,
          reason,
          duration: callState.duration,
        },
        () => {}
      );

      handleCallEnded(reason, callState.duration);
    },
    [callState.callId, callState.duration, handleCallEnded]
  );

  // Toggle mute
  const toggleMute = useCallback((): boolean => {
    if (!localStream) return false;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const isMuted = !audioTrack.enabled;

      setCallState((prev) => {
        if (prev.localParticipant) {
          return {
            ...prev,
            localParticipant: {
              ...prev.localParticipant,
              isMuted,
            },
          };
        }
        return prev;
      });

      // Notify remote participant
      if (socketRef.current && callState.callId) {
        socketRef.current.emit('call:media-toggle', {
          callId: callState.callId,
          audio: !isMuted,
          video: callState.localParticipant?.isVideoEnabled ?? true,
        });
      }

      return isMuted;
    }
    return false;
  }, [localStream, callState.callId, callState.localParticipant]);

  // Toggle video
  const toggleVideo = useCallback((): boolean => {
    if (!localStream) return true;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const isVideoEnabled = videoTrack.enabled;

      setCallState((prev) => {
        if (prev.localParticipant) {
          return {
            ...prev,
            localParticipant: {
              ...prev.localParticipant,
              isVideoEnabled,
            },
          };
        }
        return prev;
      });

      // Notify remote participant
      if (socketRef.current && callState.callId) {
        socketRef.current.emit('call:media-toggle', {
          callId: callState.callId,
          audio: !callState.localParticipant?.isMuted,
          video: isVideoEnabled,
        });
      }

      return isVideoEnabled;
    }
    return true;
  }, [localStream, callState.callId, callState.localParticipant]);

  // Switch camera (for mobile)
  const switchCamera = useCallback(async () => {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        if (videoTrack._switchCamera) {
          await videoTrack._switchCamera();
        }
      } catch (error) {
        console.error('Failed to switch camera:', error);
      }
    }
  }, [localStream]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      setCallState((prev) => {
        if (prev.localParticipant) {
          return {
            ...prev,
            localParticipant: {
              ...prev.localParticipant,
              isScreenSharing: true,
            },
          };
        }
        return prev;
      });

      // Handle when user stops screen share from browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Failed to start screen share:', error);
      onError?.(error as Error);
    }
  }, [onError]);

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current || !localStream) return;

    try {
      const videoTrack = localStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }

      setCallState((prev) => {
        if (prev.localParticipant) {
          return {
            ...prev,
            localParticipant: {
              ...prev.localParticipant,
              isScreenSharing: false,
            },
          };
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }, [localStream]);

  return {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    callStats,
    isConnected,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    startScreenShare,
    stopScreenShare,
  };
}

export default useVideoCall;
