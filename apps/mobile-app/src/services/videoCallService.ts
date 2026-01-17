/**
 * Video Call Service
 * API service for video call operations
 */

import axios from 'axios';
import { API_BASE_URL } from './api/config';

export interface VideoCallInitiateResponse {
  success: boolean;
  callId?: string;
  channelName?: string;
  token?: string;
  appId?: string;
  maxDuration?: number;
  remainingMinutes?: number;
  error?: string;
}

export interface VideoCallAcceptResponse {
  success: boolean;
  channelName?: string;
  token?: string;
  callType?: 'video' | 'audio';
  error?: string;
}

export interface VideoCallEndResponse {
  success: boolean;
  duration?: number;
  coinsCharged?: number;
  error?: string;
}

export interface VideoCallHistoryResponse {
  success: boolean;
  calls: VideoCallRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface VideoCallRecord {
  id: string;
  callType: 'video' | 'audio';
  status: string;
  duration: number;
  isCaller: boolean;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
  initiatedAt: string;
  hdEnabled?: boolean;
  connectionQuality?: string;
}

export interface ActiveCallResponse {
  success: boolean;
  hasActiveCall: boolean;
  call?: {
    id: string;
    callType: 'video' | 'audio';
    channelName: string;
    token: string;
    isCaller: boolean;
    otherUserId: string;
  };
}

class VideoCallService {
  private authToken: string = '';

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Get authorization headers
   */
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initiate a video/audio call
   */
  async initiateCall(
    receiverId: string,
    callType: 'video' | 'audio',
    hdEnabled: boolean = false
  ): Promise<VideoCallInitiateResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/video-chat/initiate`,
        { receiverId, callType, hdEnabled },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Initiate call error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to initiate call',
      };
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(callId: string): Promise<VideoCallAcceptResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/video-chat/accept/${callId}`,
        {},
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Accept call error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to accept call',
      };
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(callId: string): Promise<VideoCallEndResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/video-chat/end/${callId}`,
        { reason: 'declined' },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Reject call error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to reject call',
      };
    }
  }

  /**
   * End an active call
   */
  async endCall(
    callId: string,
    reason: 'completed' | 'cancelled' = 'completed',
    connectionQuality?: {
      avgBitrate?: number;
      packetLoss?: number;
      quality?: 'poor' | 'fair' | 'good' | 'excellent';
    }
  ): Promise<VideoCallEndResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/video-chat/end/${callId}`,
        { reason, connectionQuality },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('End call error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to end call',
      };
    }
  }

  /**
   * Get call history
   */
  async getCallHistory(
    limit: number = 20,
    offset: number = 0
  ): Promise<VideoCallHistoryResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/video-chat/history`,
        {
          params: { limit, offset },
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Get call history error:', error);
      return {
        success: false,
        calls: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      };
    }
  }

  /**
   * Get active call status
   */
  async getActiveCall(): Promise<ActiveCallResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/video-chat/active`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Get active call error:', error);
      return {
        success: false,
        hasActiveCall: false,
      };
    }
  }

  /**
   * Update call status (ringing/missed)
   */
  async updateCallStatus(
    callId: string,
    status: 'ringing' | 'missed'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/video-chat/status/${callId}`,
        { status },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Update call status error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update call status',
      };
    }
  }

  /**
   * Check if user can make calls (has remaining minutes)
   */
  async checkCallEligibility(
    callType: 'video' | 'audio'
  ): Promise<{
    success: boolean;
    canCall: boolean;
    remainingMinutes?: number;
    requiresUpgrade?: boolean;
    error?: string;
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/video-chat/eligibility`,
        {
          params: { callType },
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Check eligibility error:', error);
      return {
        success: false,
        canCall: false,
        error: error.response?.data?.error || 'Failed to check eligibility',
      };
    }
  }
}

export default new VideoCallService();
