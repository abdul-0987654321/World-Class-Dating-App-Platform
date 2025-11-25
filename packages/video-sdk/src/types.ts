/**
 * Video SDK Types
 */

export interface VideoCallConfig {
  iceServers: RTCIceServer[];
  signalServerUrl: string;
  maxBitrate?: number;
  videoConstraints?: MediaTrackConstraints;
  audioConstraints?: MediaTrackConstraints;
}

export interface CallParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface CallState {
  status: CallStatus;
  callId: string | null;
  localParticipant: CallParticipant | null;
  remoteParticipant: CallParticipant | null;
  duration: number;
  startTime: Date | null;
  endTime: Date | null;
  error: string | null;
}

export type CallStatus =
  | 'idle'
  | 'initializing'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'failed';

export interface CallOptions {
  video: boolean;
  audio: boolean;
}

export interface SignalMessage {
  type: SignalMessageType;
  callId: string;
  senderId: string;
  receiverId: string;
  payload?: any;
  timestamp: number;
}

export type SignalMessageType =
  | 'call_initiate'
  | 'call_accept'
  | 'call_reject'
  | 'call_end'
  | 'offer'
  | 'answer'
  | 'ice_candidate'
  | 'media_toggle'
  | 'screen_share_start'
  | 'screen_share_stop';

export interface CallStats {
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  bytesSent: number;
  jitter: number;
  roundTripTime: number;
  timestamp: number;
}

export interface CallEventMap {
  'state-change': CallState;
  'local-stream': MediaStream;
  'remote-stream': MediaStream;
  'call-ended': { reason: string; duration: number };
  'error': Error;
  'stats': CallStats;
  'participant-joined': CallParticipant;
  'participant-left': string;
  'media-toggle': { participantId: string; isMuted: boolean; isVideoEnabled: boolean };
}
