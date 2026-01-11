/**
 * Video Call Client
 * Core WebRTC client for video calling
 */

import { EventEmitter } from 'events';
import type {
  VideoCallConfig,
  CallState,
  CallStatus,
  CallParticipant,
  CallOptions,
  SignalMessage,
  SignalMessageType,
  CallStats,
  CallEventMap,
} from './types';

/**
 * Extended MediaStreamTrack interface for mobile-specific APIs
 * React Native and some mobile browsers expose _switchCamera method
 */
interface MobileMediaStreamTrack extends MediaStreamTrack {
  _switchCamera?: () => Promise<void>;
}

/**
 * Extended MediaDevices interface for getDisplayMedia
 * This is a standard API but not always included in TypeScript lib
 */
interface ExtendedMediaDevices extends MediaDevices {
  getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
}

const DEFAULT_CONFIG: Partial<VideoCallConfig> = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  maxBitrate: 2500000, // 2.5 Mbps
  videoConstraints: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audioConstraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export class VideoCallClient extends EventEmitter {
  private config: VideoCallConfig;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalSocket: any = null;
  private statsInterval: NodeJS.Timeout | null = null;

  private state: CallState = {
    status: 'idle',
    callId: null,
    localParticipant: null,
    remoteParticipant: null,
    duration: 0,
    startTime: null,
    endTime: null,
    error: null,
  };

  constructor(config: VideoCallConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the video call client
   */
  async initialize(socket: any, userId: string, userName: string): Promise<void> {
    this.signalSocket = socket;

    this.state.localParticipant = {
      id: userId,
      name: userName,
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,
    };

    this.setupSignalHandlers();
    this.updateState({ status: 'idle' });
  }

  /**
   * Start an outgoing call
   */
  async startCall(
    receiverId: string,
    receiverName: string,
    options: CallOptions = { video: true, audio: true }
  ): Promise<string> {
    try {
      this.updateState({ status: 'initializing' });

      // Get local media stream
      await this.initializeLocalStream(options);

      // Create peer connection
      await this.createPeerConnection();

      // Generate call ID
      const callId = this.generateCallId();

      // Set remote participant
      this.state.remoteParticipant = {
        id: receiverId,
        name: receiverName,
        isMuted: false,
        isVideoEnabled: true,
        isScreenSharing: false,
      };

      // Create and send offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection!.setLocalDescription(offer);

      // Send call initiation signal
      this.sendSignal('call_initiate', receiverId, {
        callId,
        offer: this.peerConnection!.localDescription,
        options,
      });

      this.updateState({
        status: 'ringing',
        callId,
      });

      return callId;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(
    callId: string,
    senderId: string,
    offer: RTCSessionDescriptionInit,
    options: CallOptions = { video: true, audio: true }
  ): Promise<void> {
    try {
      this.updateState({ status: 'connecting', callId });

      // Get local media stream
      await this.initializeLocalStream(options);

      // Create peer connection
      await this.createPeerConnection();

      // Set remote description
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      this.sendSignal('call_accept', senderId, {
        callId,
        answer: this.peerConnection!.localDescription,
      });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  rejectCall(callId: string, senderId: string): void {
    this.sendSignal('call_reject', senderId, { callId, reason: 'rejected' });
    this.cleanup();
  }

  /**
   * End the current call
   */
  endCall(reason: string = 'user_ended'): void {
    if (this.state.callId && this.state.remoteParticipant) {
      this.sendSignal('call_end', this.state.remoteParticipant.id, {
        callId: this.state.callId,
        reason,
      });
    }

    const duration = this.state.startTime
      ? Math.floor((Date.now() - this.state.startTime.getTime()) / 1000)
      : 0;

    this.emit('call-ended', { reason, duration });
    this.cleanup();
  }

  /**
   * Toggle local audio
   */
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const isMuted = !audioTrack.enabled;

        if (this.state.localParticipant) {
          this.state.localParticipant.isMuted = isMuted;
        }

        this.notifyMediaToggle();
        return isMuted;
      }
    }
    return false;
  }

  /**
   * Toggle local video
   */
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const isVideoEnabled = videoTrack.enabled;

        if (this.state.localParticipant) {
          this.state.localParticipant.isVideoEnabled = isVideoEnabled;
        }

        this.notifyMediaToggle();
        return isVideoEnabled;
      }
    }
    return true;
  }

  /**
   * Switch camera (mobile)
   * Uses mobile-specific _switchCamera API when available
   */
  async switchCamera(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0] as MobileMediaStreamTrack | undefined;
    if (!videoTrack) return;

    try {
      if (videoTrack._switchCamera) {
        await videoTrack._switchCamera();
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  }

  /**
   * Start screen sharing
   * Uses getDisplayMedia API for screen capture
   */
  async startScreenShare(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

    try {
      const mediaDevices = navigator.mediaDevices as ExtendedMediaDevices;
      const screenStream = await mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      if (this.peerConnection) {
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === 'video');

        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
      }

      if (this.state.localParticipant) {
        this.state.localParticipant.isScreenSharing = true;
      }

      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      this.sendSignal('screen_share_start', this.state.remoteParticipant!.id, {
        callId: this.state.callId,
      });
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.localStream || !this.peerConnection) return;

    try {
      const videoTrack = this.localStream.getVideoTracks()[0];

      if (videoTrack) {
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === 'video');

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      if (this.state.localParticipant) {
        this.state.localParticipant.isScreenSharing = false;
      }

      this.sendSignal('screen_share_stop', this.state.remoteParticipant!.id, {
        callId: this.state.callId,
      });
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }

  /**
   * Get current call state
   */
  getState(): CallState {
    return { ...this.state };
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Private methods

  private async initializeLocalStream(options: CallOptions): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: options.video ? this.config.videoConstraints : false,
        audio: options.audio ? this.config.audioConstraints : false,
      });

      if (this.state.localParticipant) {
        this.state.localParticipant.stream = this.localStream;
        this.state.localParticipant.isVideoEnabled = options.video;
        this.state.localParticipant.isMuted = !options.audio;
      }

      this.emit('local-stream', this.localStream);
    } catch (error) {
      throw new Error(`Failed to get media stream: ${(error as Error).message}`);
    }
  }

  private async createPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.state.remoteParticipant) {
        this.sendSignal('ice_candidate', this.state.remoteParticipant.id, {
          callId: this.state.callId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      switch (this.peerConnection?.connectionState) {
        case 'connected':
          this.updateState({
            status: 'connected',
            startTime: new Date(),
          });
          this.startStatsCollection();
          break;
        case 'disconnected':
          this.updateState({ status: 'reconnecting' });
          break;
        case 'failed':
          this.handleError(new Error('Connection failed'));
          break;
        case 'closed':
          this.cleanup();
          break;
      }
    };

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];

      if (this.state.remoteParticipant) {
        this.state.remoteParticipant.stream = this.remoteStream;
      }

      this.emit('remote-stream', this.remoteStream);
    };
  }

  private setupSignalHandlers(): void {
    if (!this.signalSocket) return;

    this.signalSocket.on('signal', async (message: SignalMessage) => {
      switch (message.type) {
        case 'call_initiate':
          this.handleIncomingCall(message);
          break;
        case 'call_accept':
          await this.handleCallAccepted(message);
          break;
        case 'call_reject':
          this.handleCallRejected(message);
          break;
        case 'call_end':
          this.handleCallEnded(message);
          break;
        case 'ice_candidate':
          await this.handleIceCandidate(message);
          break;
        case 'media_toggle':
          this.handleMediaToggle(message);
          break;
      }
    });
  }

  private handleIncomingCall(message: SignalMessage): void {
    this.state.remoteParticipant = {
      id: message.senderId,
      name: message.payload.senderName || 'Unknown',
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,
    };

    this.updateState({
      status: 'ringing',
      callId: message.payload.callId,
    });

    // Emit event for UI to show incoming call
    this.emit('state-change', this.getState());
  }

  private async handleCallAccepted(message: SignalMessage): Promise<void> {
    try {
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(message.payload.answer)
      );
      this.updateState({ status: 'connecting' });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleCallRejected(message: SignalMessage): void {
    this.emit('call-ended', { reason: 'rejected', duration: 0 });
    this.cleanup();
  }

  private handleCallEnded(message: SignalMessage): void {
    const duration = this.state.startTime
      ? Math.floor((Date.now() - this.state.startTime.getTime()) / 1000)
      : 0;

    this.emit('call-ended', { reason: message.payload.reason, duration });
    this.cleanup();
  }

  private async handleIceCandidate(message: SignalMessage): Promise<void> {
    try {
      if (this.peerConnection && message.payload.candidate) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(message.payload.candidate)
        );
      }
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  private handleMediaToggle(message: SignalMessage): void {
    if (this.state.remoteParticipant) {
      this.state.remoteParticipant.isMuted = message.payload.isMuted;
      this.state.remoteParticipant.isVideoEnabled = message.payload.isVideoEnabled;

      this.emit('media-toggle', {
        participantId: message.senderId,
        isMuted: message.payload.isMuted,
        isVideoEnabled: message.payload.isVideoEnabled,
      });
    }
  }

  private sendSignal(type: SignalMessageType, receiverId: string, payload: any): void {
    if (!this.signalSocket || !this.state.localParticipant) return;

    const message: SignalMessage = {
      type,
      callId: this.state.callId || '',
      senderId: this.state.localParticipant.id,
      receiverId,
      payload,
      timestamp: Date.now(),
    };

    this.signalSocket.emit('signal', message);
  }

  private notifyMediaToggle(): void {
    if (this.state.remoteParticipant && this.state.localParticipant) {
      this.sendSignal('media_toggle', this.state.remoteParticipant.id, {
        callId: this.state.callId,
        isMuted: this.state.localParticipant.isMuted,
        isVideoEnabled: this.state.localParticipant.isVideoEnabled,
      });
    }
  }

  private startStatsCollection(): void {
    this.statsInterval = setInterval(async () => {
      if (!this.peerConnection) return;

      try {
        const stats = await this.peerConnection.getStats();
        const callStats: Partial<CallStats> = {
          timestamp: Date.now(),
        };

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            callStats.packetsLost = report.packetsLost;
            callStats.packetsReceived = report.packetsReceived;
            callStats.bytesReceived = report.bytesReceived;
            callStats.jitter = report.jitter;
          }
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            callStats.bytesSent = report.bytesSent;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            callStats.roundTripTime = report.currentRoundTripTime;
          }
        });

        this.emit('stats', callStats as CallStats);
      } catch (error) {
        console.error('Failed to get stats:', error);
      }
    }, 1000);
  }

  private updateState(update: Partial<CallState>): void {
    this.state = { ...this.state, ...update };
    this.emit('state-change', this.getState());
  }

  private handleError(error: Error): void {
    console.error('VideoCallClient error:', error);
    this.updateState({
      status: 'failed',
      error: error.message,
    });
    this.emit('error', error);
  }

  private cleanup(): void {
    // Stop stats collection
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset state
    this.state = {
      status: 'ended',
      callId: null,
      localParticipant: this.state.localParticipant
        ? { ...this.state.localParticipant, stream: undefined }
        : null,
      remoteParticipant: null,
      duration: this.state.startTime
        ? Math.floor((Date.now() - this.state.startTime.getTime()) / 1000)
        : 0,
      startTime: this.state.startTime,
      endTime: new Date(),
      error: null,
    };

    this.updateState({ status: 'idle' });
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
