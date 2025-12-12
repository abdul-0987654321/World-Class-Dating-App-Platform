/**
 * Call State Management Redux Slice
 * Manages video/audio call state across the application
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NetworkQuality } from '../../services/agora.service';

export type CallState = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
}

export interface ActiveCall {
  callId: string;
  channelName: string;
  agoraToken: string;
  callType: 'video' | 'audio';
  state: CallState;
  participant: CallParticipant;
  isIncoming: boolean;
  startTime?: number;
  endTime?: number;
  duration: number;
}

export interface IncomingCall {
  callId: string;
  caller: CallParticipant;
  callType: 'video' | 'audio';
  timestamp: number;
}

interface CallSliceState {
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  callHistory: Array<{
    callId: string;
    participant: CallParticipant;
    callType: 'video' | 'audio';
    duration: number;
    timestamp: number;
    status: 'completed' | 'missed' | 'rejected' | 'failed';
  }>;
  networkQuality: NetworkQuality | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  recordingConsent: {
    granted: boolean;
    timestamp?: number;
  } | null;
}

const initialState: CallSliceState = {
  activeCall: null,
  incomingCall: null,
  callHistory: [],
  networkQuality: null,
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  recordingConsent: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // Start outgoing call
    startCall: (state, action: PayloadAction<{
      callId: string;
      channelName: string;
      agoraToken: string;
      callType: 'video' | 'audio';
      participant: CallParticipant;
    }>) => {
      state.activeCall = {
        ...action.payload,
        state: 'ringing',
        isIncoming: false,
        duration: 0,
      };
      state.isVideoEnabled = action.payload.callType === 'video';
    },

    // Receive incoming call
    receiveIncomingCall: (state, action: PayloadAction<IncomingCall>) => {
      state.incomingCall = action.payload;
    },

    // Accept incoming call
    acceptIncomingCall: (state, action: PayloadAction<{
      channelName: string;
      agoraToken: string;
    }>) => {
      if (state.incomingCall) {
        state.activeCall = {
          callId: state.incomingCall.callId,
          channelName: action.payload.channelName,
          agoraToken: action.payload.agoraToken,
          callType: state.incomingCall.callType,
          state: 'connecting',
          participant: state.incomingCall.caller,
          isIncoming: true,
          duration: 0,
        };
        state.incomingCall = null;
        state.isVideoEnabled = state.activeCall.callType === 'video';
      }
    },

    // Reject incoming call
    rejectIncomingCall: (state) => {
      if (state.incomingCall) {
        // Add to call history
        state.callHistory.unshift({
          callId: state.incomingCall.callId,
          participant: state.incomingCall.caller,
          callType: state.incomingCall.callType,
          duration: 0,
          timestamp: state.incomingCall.timestamp,
          status: 'rejected',
        });
        state.incomingCall = null;
      }
    },

    // Update call state
    setCallState: (state, action: PayloadAction<CallState>) => {
      if (state.activeCall) {
        state.activeCall.state = action.payload;

        if (action.payload === 'connected' && !state.activeCall.startTime) {
          state.activeCall.startTime = Date.now();
        }

        if (action.payload === 'ended' || action.payload === 'failed') {
          state.activeCall.endTime = Date.now();
        }
      }
    },

    // Update call duration
    updateCallDuration: (state, action: PayloadAction<number>) => {
      if (state.activeCall) {
        state.activeCall.duration = action.payload;
      }
    },

    // Set network quality
    setNetworkQuality: (state, action: PayloadAction<NetworkQuality>) => {
      state.networkQuality = action.payload;
    },

    // Toggle mute
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },

    // Toggle video
    toggleVideo: (state) => {
      state.isVideoEnabled = !state.isVideoEnabled;
    },

    // Toggle screen sharing
    toggleScreenShare: (state) => {
      state.isScreenSharing = !state.isScreenSharing;
    },

    // Set recording consent
    setRecordingConsent: (state, action: PayloadAction<boolean>) => {
      state.recordingConsent = {
        granted: action.payload,
        timestamp: Date.now(),
      };
    },

    // End call
    endCall: (state, action: PayloadAction<{ reason: 'completed' | 'missed' | 'rejected' | 'failed' }>) => {
      if (state.activeCall) {
        // Add to call history
        state.callHistory.unshift({
          callId: state.activeCall.callId,
          participant: state.activeCall.participant,
          callType: state.activeCall.callType,
          duration: state.activeCall.duration,
          timestamp: state.activeCall.startTime || Date.now(),
          status: action.payload.reason,
        });

        // Keep only last 50 calls in history
        if (state.callHistory.length > 50) {
          state.callHistory = state.callHistory.slice(0, 50);
        }
      }

      state.activeCall = null;
      state.networkQuality = null;
      state.isMuted = false;
      state.isVideoEnabled = true;
      state.isScreenSharing = false;
      state.recordingConsent = null;
    },

    // Clear call (force cleanup)
    clearCall: (state) => {
      state.activeCall = null;
      state.incomingCall = null;
      state.networkQuality = null;
      state.isMuted = false;
      state.isVideoEnabled = true;
      state.isScreenSharing = false;
      state.recordingConsent = null;
    },

    // Clear call history
    clearCallHistory: (state) => {
      state.callHistory = [];
    },

    // Remove call from history
    removeCallFromHistory: (state, action: PayloadAction<string>) => {
      state.callHistory = state.callHistory.filter(
        (call) => call.callId !== action.payload
      );
    },
  },
});

export const {
  startCall,
  receiveIncomingCall,
  acceptIncomingCall,
  rejectIncomingCall,
  setCallState,
  updateCallDuration,
  setNetworkQuality,
  toggleMute,
  toggleVideo,
  toggleScreenShare,
  setRecordingConsent,
  endCall,
  clearCall,
  clearCallHistory,
  removeCallFromHistory,
} = callSlice.actions;

export default callSlice.reducer;
