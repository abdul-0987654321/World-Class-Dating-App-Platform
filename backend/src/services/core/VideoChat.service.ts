/**
 * Video Chat Service
 * Agora/WebRTC-based video and voice calling
 */

import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Types
export interface VideoCall {
  id: string;
  channelName: string;
  callerId: string;
  calleeId: string;
  status: CallStatus;
  type: CallType;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  callerToken?: string;
  calleeToken?: string;
  recordingUrl?: string;
  quality: CallQuality;
  createdAt: Date;
}

export type CallStatus =
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'missed'
  | 'declined'
  | 'failed'
  | 'busy';

export type CallType = 'video' | 'audio';

export interface CallQuality {
  callerRating?: number;
  calleeRating?: number;
  avgBitrate?: number;
  packetLoss?: number;
  latency?: number;
}

export interface AgoraConfig {
  appId: string;
  appCertificate: string;
}

export interface CallSession {
  callId: string;
  channelName: string;
  token: string;
  uid: number;
  expiresAt: Date;
}

// Configuration
const CALL_CONFIG = {
  tokenExpirationSeconds: 3600, // 1 hour
  ringTimeoutSeconds: 60,      // 1 minute ring time
  maxCallDuration: 3600,       // 1 hour max
  reconnectTimeoutSeconds: 30, // 30 seconds to reconnect
};

// Role types for Agora
const AGORA_ROLE = {
  PUBLISHER: 1,
  SUBSCRIBER: 2,
};

class VideoChatService {
  private appId: string = '';
  private appCertificate: string = '';
  private isInitialized = false;
  private activeCalls: Map<string, VideoCall> = new Map();

  /**
   * Initialize with Agora credentials
   */
  async initialize(config: AgoraConfig): Promise<void> {
    this.appId = config.appId;
    this.appCertificate = config.appCertificate;
    this.isInitialized = true;
    logger.info('Video chat service initialized');
  }

  /**
   * Initiate a video/audio call
   */
  async initiateCall(
    callerId: string,
    calleeId: string,
    type: CallType = 'video'
  ): Promise<{
    success: boolean;
    call?: VideoCall;
    callerSession?: CallSession;
    error?: string;
  }> {
    try {
      // Check if users can call each other (must be matched)
      const canCall = await this.canUsersCall(callerId, calleeId);
      if (!canCall.allowed) {
        return { success: false, error: canCall.reason };
      }

      // Check if callee is already in a call
      const calleeInCall = await this.isUserInCall(calleeId);
      if (calleeInCall) {
        return { success: false, error: 'User is busy in another call' };
      }

      // Check if caller is already in a call
      const callerInCall = await this.isUserInCall(callerId);
      if (callerInCall) {
        return { success: false, error: 'You are already in a call' };
      }

      // Generate channel name and tokens
      const callId = uuidv4();
      const channelName = `call_${callId}`;
      const callerUid = this.generateUid();
      const calleeUid = this.generateUid();

      const callerToken = this.generateToken(channelName, callerUid, AGORA_ROLE.PUBLISHER);
      const calleeToken = this.generateToken(channelName, calleeUid, AGORA_ROLE.PUBLISHER);

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + CALL_CONFIG.tokenExpirationSeconds);

      // Create call record
      const call: VideoCall = {
        id: callId,
        channelName,
        callerId,
        calleeId,
        status: 'initiating',
        type,
        callerToken,
        calleeToken,
        quality: {},
        createdAt: new Date(),
      };

      await db('video_calls').insert({
        id: call.id,
        channel_name: call.channelName,
        caller_id: call.callerId,
        callee_id: call.calleeId,
        status: call.status,
        type: call.type,
        caller_token: call.callerToken,
        callee_token: call.calleeToken,
        created_at: call.createdAt,
        updated_at: new Date(),
      });

      this.activeCalls.set(callId, call);

      // Set ring timeout
      this.setRingTimeout(callId);

      logger.info(`Call initiated: ${callId} from ${callerId} to ${calleeId}`);

      return {
        success: true,
        call,
        callerSession: {
          callId,
          channelName,
          token: callerToken,
          uid: callerUid,
          expiresAt,
        },
      };
    } catch (error) {
      logger.error('Error initiating call:', error);
      return { success: false, error: 'Failed to initiate call' };
    }
  }

  /**
   * Answer an incoming call
   */
  async answerCall(
    callId: string,
    calleeId: string
  ): Promise<{
    success: boolean;
    session?: CallSession;
    call?: VideoCall;
    error?: string;
  }> {
    try {
      const call = await this.getCall(callId);

      if (!call) {
        return { success: false, error: 'Call not found' };
      }

      if (call.calleeId !== calleeId) {
        return { success: false, error: 'Unauthorized to answer this call' };
      }

      if (call.status !== 'ringing' && call.status !== 'initiating') {
        return { success: false, error: `Cannot answer call in ${call.status} state` };
      }

      // Update call status
      await this.updateCallStatus(callId, 'connecting');

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + CALL_CONFIG.tokenExpirationSeconds);

      logger.info(`Call ${callId} answered by ${calleeId}`);

      return {
        success: true,
        session: {
          callId,
          channelName: call.channelName,
          token: call.calleeToken!,
          uid: this.generateUid(),
          expiresAt,
        },
        call,
      };
    } catch (error) {
      logger.error('Error answering call:', error);
      return { success: false, error: 'Failed to answer call' };
    }
  }

  /**
   * Decline an incoming call
   */
  async declineCall(
    callId: string,
    calleeId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const call = await this.getCall(callId);

      if (!call) {
        return { success: false, error: 'Call not found' };
      }

      if (call.calleeId !== calleeId) {
        return { success: false, error: 'Unauthorized' };
      }

      await this.updateCallStatus(callId, 'declined');
      logger.info(`Call ${callId} declined by ${calleeId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error declining call:', error);
      return { success: false, error: 'Failed to decline call' };
    }
  }

  /**
   * End an active call
   */
  async endCall(
    callId: string,
    userId: string
  ): Promise<{ success: boolean; duration?: number; error?: string }> {
    try {
      const call = await this.getCall(callId);

      if (!call) {
        return { success: false, error: 'Call not found' };
      }

      if (call.callerId !== userId && call.calleeId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      const endedAt = new Date();
      let duration = 0;

      if (call.startedAt) {
        duration = Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000);
      }

      await db('video_calls')
        .where('id', callId)
        .update({
          status: 'ended',
          ended_at: endedAt,
          duration,
          updated_at: new Date(),
        });

      this.activeCalls.delete(callId);

      logger.info(`Call ${callId} ended. Duration: ${duration}s`);

      return { success: true, duration };
    } catch (error) {
      logger.error('Error ending call:', error);
      return { success: false, error: 'Failed to end call' };
    }
  }

  /**
   * Mark call as connected (both parties joined)
   */
  async markCallActive(callId: string): Promise<boolean> {
    try {
      const startedAt = new Date();

      await db('video_calls')
        .where('id', callId)
        .update({
          status: 'active',
          started_at: startedAt,
          updated_at: new Date(),
        });

      const call = this.activeCalls.get(callId);
      if (call) {
        call.status = 'active';
        call.startedAt = startedAt;
      }

      logger.info(`Call ${callId} is now active`);
      return true;
    } catch (error) {
      logger.error('Error marking call active:', error);
      return false;
    }
  }

  /**
   * Get call details
   */
  async getCall(callId: string): Promise<VideoCall | null> {
    // Check memory cache first
    if (this.activeCalls.has(callId)) {
      return this.activeCalls.get(callId)!;
    }

    const call = await db('video_calls').where('id', callId).first();

    if (!call) return null;

    return {
      id: call.id,
      channelName: call.channel_name,
      callerId: call.caller_id,
      calleeId: call.callee_id,
      status: call.status,
      type: call.type,
      startedAt: call.started_at,
      endedAt: call.ended_at,
      duration: call.duration,
      callerToken: call.caller_token,
      calleeToken: call.callee_token,
      recordingUrl: call.recording_url,
      quality: call.quality || {},
      createdAt: call.created_at,
    };
  }

  /**
   * Get user's call history
   */
  async getCallHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Array<VideoCall & { otherUser: { id: string; name: string; photoUrl?: string } }>> {
    const calls = await db('video_calls')
      .where('caller_id', userId)
      .orWhere('callee_id', userId)
      .whereIn('status', ['ended', 'missed', 'declined'])
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get other user info for each call
    const enrichedCalls = await Promise.all(
      calls.map(async (call: any) => {
        const otherUserId = call.caller_id === userId ? call.callee_id : call.caller_id;
        const otherUser = await db('users')
          .where('id', otherUserId)
          .select('id', 'first_name as name')
          .first();

        const photo = await db('profile_photos')
          .where('user_id', otherUserId)
          .orderBy('order_index', 'asc')
          .first();

        return {
          id: call.id,
          channelName: call.channel_name,
          callerId: call.caller_id,
          calleeId: call.callee_id,
          status: call.status,
          type: call.type,
          startedAt: call.started_at,
          endedAt: call.ended_at,
          duration: call.duration,
          quality: call.quality || {},
          createdAt: call.created_at,
          isOutgoing: call.caller_id === userId,
          otherUser: {
            id: otherUser?.id,
            name: otherUser?.name,
            photoUrl: photo?.url,
          },
        };
      })
    );

    return enrichedCalls;
  }

  /**
   * Rate call quality
   */
  async rateCallQuality(
    callId: string,
    userId: string,
    rating: number
  ): Promise<boolean> {
    try {
      const call = await this.getCall(callId);
      if (!call) return false;

      const updateField = call.callerId === userId ? 'caller_rating' : 'callee_rating';

      await db('video_calls')
        .where('id', callId)
        .update({
          [`quality`]: db.raw(`jsonb_set(COALESCE(quality, '{}'), '{${updateField}}', '${rating}')`),
          updated_at: new Date(),
        });

      return true;
    } catch (error) {
      logger.error('Error rating call quality:', error);
      return false;
    }
  }

  /**
   * Check if user is in an active call
   */
  async isUserInCall(userId: string): Promise<boolean> {
    const activeCall = await db('video_calls')
      .where(function() {
        this.where('caller_id', userId).orWhere('callee_id', userId);
      })
      .whereIn('status', ['initiating', 'ringing', 'connecting', 'active'])
      .first();

    return !!activeCall;
  }

  /**
   * Get Agora app ID (for client SDK initialization)
   */
  getAppId(): string {
    return this.appId;
  }

  /**
   * Refresh token for ongoing call
   */
  async refreshToken(
    callId: string,
    userId: string
  ): Promise<{ token: string; expiresAt: Date } | null> {
    const call = await this.getCall(callId);
    if (!call || (call.callerId !== userId && call.calleeId !== userId)) {
      return null;
    }

    const uid = this.generateUid();
    const token = this.generateToken(call.channelName, uid, AGORA_ROLE.PUBLISHER);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + CALL_CONFIG.tokenExpirationSeconds);

    return { token, expiresAt };
  }

  // Private helper methods

  /**
   * Check if users can call each other
   */
  private async canUsersCall(
    callerId: string,
    calleeId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check if they are matched
    const match = await db('matches')
      .where(function() {
        this.where({ user_id_1: callerId, user_id_2: calleeId })
          .orWhere({ user_id_1: calleeId, user_id_2: callerId });
      })
      .where('is_active', true)
      .first();

    if (!match) {
      return { allowed: false, reason: 'You can only call your matches' };
    }

    // Check if either user is blocked
    const isBlocked = await db('user_blocks')
      .where(function() {
        this.where({ blocker_id: callerId, blocked_id: calleeId })
          .orWhere({ blocker_id: calleeId, blocked_id: callerId });
      })
      .first();

    if (isBlocked) {
      return { allowed: false, reason: 'Cannot call this user' };
    }

    return { allowed: true };
  }

  /**
   * Update call status
   */
  private async updateCallStatus(callId: string, status: CallStatus): Promise<void> {
    await db('video_calls')
      .where('id', callId)
      .update({ status, updated_at: new Date() });

    const call = this.activeCalls.get(callId);
    if (call) {
      call.status = status;
    }
  }

  /**
   * Set ring timeout
   */
  private setRingTimeout(callId: string): void {
    setTimeout(async () => {
      const call = await this.getCall(callId);
      if (call && (call.status === 'initiating' || call.status === 'ringing')) {
        await this.updateCallStatus(callId, 'missed');
        this.activeCalls.delete(callId);
        logger.info(`Call ${callId} missed (ring timeout)`);
      }
    }, CALL_CONFIG.ringTimeoutSeconds * 1000);
  }

  /**
   * Generate Agora token
   */
  private generateToken(
    channelName: string,
    uid: number,
    role: number
  ): string {
    if (!this.appCertificate) {
      // Return dummy token for development
      return `dev_token_${channelName}_${uid}_${Date.now()}`;
    }

    // In production, use Agora token generation
    // const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
    // return RtcTokenBuilder.buildTokenWithUid(
    //   this.appId,
    //   this.appCertificate,
    //   channelName,
    //   uid,
    //   role,
    //   Math.floor(Date.now() / 1000) + CALL_CONFIG.tokenExpirationSeconds
    // );

    // Simplified token for development
    const timestamp = Math.floor(Date.now() / 1000) + CALL_CONFIG.tokenExpirationSeconds;
    const payload = `${this.appId}:${channelName}:${uid}:${role}:${timestamp}`;
    const signature = crypto.createHmac('sha256', this.appCertificate || 'dev')
      .update(payload)
      .digest('hex');

    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  /**
   * Generate random UID for Agora
   */
  private generateUid(): number {
    return Math.floor(Math.random() * 100000) + 1;
  }
}

export const videoChatService = new VideoChatService();
