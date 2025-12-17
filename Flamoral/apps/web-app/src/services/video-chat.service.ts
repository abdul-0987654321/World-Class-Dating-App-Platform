/**
 * Video Chat Service
 * Handles video/audio call API calls for the frontend
 */

export interface CallInitiateResponse {
  success: boolean;
  callId?: string;
  channelName?: string;
  token?: string;
  error?: string;
}

export interface CallResponse {
  success: boolean;
  error?: string;
  channelName?: string;
  token?: string;
  callType?: 'video' | 'audio';
  duration?: number;
  coinsCharged?: number;
}

export interface ActiveCallResponse {
  success: boolean;
  hasActiveCall: boolean;
  call?: {
    id: string;
    callType: 'video' | 'audio';
    status: string;
    otherUser: {
      id: string;
      firstName: string;
      photoUrl: string;
    };
    initiatedAt: string;
  };
}

export interface CallHistoryItem {
  id: string;
  callType: 'video' | 'audio';
  status: string;
  duration: number;
  isCaller: boolean;
  otherUser: {
    id: string;
    firstName: string;
    photoUrl: string;
  };
  initiatedAt: string;
}

export interface VideoCallEntitlements {
  canMakeVideoCalls: boolean;
  canMakeAudioCalls: boolean;
  maxMinutesPerCall: number; // 0 = unlimited
  callsPerDay: number; // 0 = unlimited
  remainingCallsToday: number;
  tierRequired?: string;
}

class VideoChatService {
  private baseUrl = '/api/v1/video-chat';

  /**
   * Check if user can make video calls based on subscription tier
   */
  async getVideoCallEntitlements(): Promise<VideoCallEntitlements> {
    const response = await fetch(`${this.baseUrl}/entitlements`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Default to no access if API fails
      return {
        canMakeVideoCalls: false,
        canMakeAudioCalls: false,
        maxMinutesPerCall: 0,
        callsPerDay: 0,
        remainingCallsToday: 0,
        tierRequired: 'BASIC',
      };
    }

    return response.json();
  }

  /**
   * Initiate a video or audio call
   */
  async initiateCall(receiverId: string, callType: 'video' | 'audio'): Promise<CallInitiateResponse> {
    const response = await fetch(`${this.baseUrl}/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receiverId, callType }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to initiate call',
      };
    }

    return data;
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(callId: string): Promise<CallResponse> {
    const response = await fetch(`${this.baseUrl}/accept/${callId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * End an active call
   */
  async endCall(callId: string, reason: string = 'completed'): Promise<CallResponse> {
    const response = await fetch(`${this.baseUrl}/end/${callId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    return response.json();
  }

  /**
   * Get call history
   */
  async getCallHistory(limit: number = 20, offset: number = 0): Promise<{
    success: boolean;
    calls: CallHistoryItem[];
    pagination: { limit: number; offset: number; total: number };
  }> {
    const response = await fetch(`${this.baseUrl}/history?limit=${limit}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Get active call if any
   */
  async getActiveCall(): Promise<ActiveCallResponse> {
    const response = await fetch(`${this.baseUrl}/active`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }
}

export const videoChatService = new VideoChatService();
