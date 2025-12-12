/**
 * Call Signaling Service
 * Handles WebSocket signaling for call initiation, acceptance, and termination
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export interface CallSignal {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  callType: 'video' | 'audio';
  timestamp: number;
}

export interface CallAcceptSignal extends CallSignal {
  agoraToken: string;
  channelName: string;
}

export interface CallEndSignal {
  callId: string;
  reason: 'normal' | 'busy' | 'rejected' | 'missed' | 'failed' | 'timeout';
  duration?: number;
}

export interface CallIceCandidate {
  callId: string;
  candidate: RTCIceCandidateInit;
}

export class CallSignalingService extends EventEmitter {
  private socket: Socket | null = null;
  private serverUrl: string;
  private userId: string | null = null;
  private authToken: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;

  constructor(serverUrl: string) {
    super();
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to signaling server
   */
  connect(userId: string, authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userId = userId;
      this.authToken = authToken;

      this.socket = io(this.serverUrl, {
        auth: {
          token: authToken,
          userId: userId,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log('Connected to signaling server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from signaling server:', reason);
        this.isConnected = false;
        this.emit('disconnected', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('connection-failed', error);
          reject(error);
        }
      });

      this.setupEventHandlers();
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Incoming call
    this.socket.on('incoming-call', (data: CallSignal) => {
      console.log('Incoming call:', data);
      this.emit('incoming-call', data);
    });

    // Call accepted
    this.socket.on('call-accepted', (data: CallAcceptSignal) => {
      console.log('Call accepted:', data);
      this.emit('call-accepted', data);
    });

    // Call rejected
    this.socket.on('call-rejected', (data: { callId: string; reason: string }) => {
      console.log('Call rejected:', data);
      this.emit('call-rejected', data);
    });

    // Call ended
    this.socket.on('call-ended', (data: CallEndSignal) => {
      console.log('Call ended:', data);
      this.emit('call-ended', data);
    });

    // Call timeout
    this.socket.on('call-timeout', (data: { callId: string }) => {
      console.log('Call timeout:', data);
      this.emit('call-timeout', data);
    });

    // User busy
    this.socket.on('user-busy', (data: { callId: string; userId: string }) => {
      console.log('User busy:', data);
      this.emit('user-busy', data);
    });

    // User offline
    this.socket.on('user-offline', (data: { callId: string; userId: string }) => {
      console.log('User offline:', data);
      this.emit('user-offline', data);
    });

    // ICE candidate
    this.socket.on('ice-candidate', (data: CallIceCandidate) => {
      this.emit('ice-candidate', data);
    });

    // Error
    this.socket.on('error', (error: any) => {
      console.error('Signaling error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Initiate a call
   */
  initiateCall(callData: Omit<CallSignal, 'callId' | 'timestamp'>): Promise<CallSignal> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Not connected to signaling server'));
        return;
      }

      this.socket.emit('initiate-call', callData, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.call);
        }
      });
    });
  }

  /**
   * Accept a call
   */
  acceptCall(callId: string): Promise<CallAcceptSignal> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Not connected to signaling server'));
        return;
      }

      this.socket.emit('accept-call', { callId }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Reject a call
   */
  rejectCall(callId: string, reason: string = 'rejected'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Not connected to signaling server'));
        return;
      }

      this.socket.emit('reject-call', { callId, reason }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * End a call
   */
  endCall(callId: string, duration?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Not connected to signaling server'));
        return;
      }

      this.socket.emit('end-call', { callId, duration }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Send ICE candidate
   */
  sendIceCandidate(callId: string, candidate: RTCIceCandidateInit): void {
    if (!this.socket || !this.isConnected) {
      console.error('Cannot send ICE candidate: not connected');
      return;
    }

    this.socket.emit('ice-candidate', { callId, candidate });
  }

  /**
   * Check if connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Disconnect from signaling server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.userId = null;
      this.authToken = null;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}

export default CallSignalingService;
