/**
 * Video Call Service
 * Handles call signaling and Agora token generation
 */

import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { v4 as uuidv4 } from 'uuid';
import { RedisClient } from '../infrastructure/cache/redis';
import { createLogger } from '../utils/logger';
import { callHistoryRepository } from '../domain/repositories/call-history.repository';

const logger = createLogger('video-call-service');

export interface CallSession {
  callId: string;
  channelName: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  callType: 'video' | 'audio';
  status: 'initiated' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'missed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  recordingEnabled: boolean;
  recordingConsent?: {
    callerId: boolean;
    calleeId: boolean;
  };
}

export interface AgoraConfig {
  appId: string;
  appCertificate: string;
  tokenExpiryTime: number; // in seconds
}

export class VideoCallService {
  private redis: RedisClient;
  private agoraConfig: AgoraConfig;
  private readonly CALL_SESSION_PREFIX = 'call:session:';
  private readonly CALL_TIMEOUT = 60000; // 60 seconds

  constructor(redis: RedisClient, agoraConfig: AgoraConfig) {
    this.redis = redis;
    this.agoraConfig = agoraConfig;
  }

  /**
   * Initiate a new call
   */
  async initiateCall(
    callerId: string,
    callerName: string,
    calleeId: string,
    calleeName: string,
    callType: 'video' | 'audio',
    callerAvatar?: string
  ): Promise<CallSession> {
    try {
      const callId = uuidv4();
      const channelName = `flamoral_call_${callId}`;

      const callSession: CallSession = {
        callId,
        channelName,
        callerId,
        callerName,
        callerAvatar,
        calleeId,
        calleeName,
        callType,
        status: 'initiated',
        startTime: Date.now(),
        recordingEnabled: false,
      };

      // Store call session in Redis
      await this.redis.set(
        `${this.CALL_SESSION_PREFIX}${callId}`,
        JSON.stringify(callSession),
        this.CALL_TIMEOUT / 1000 // expire in 60 seconds if not accepted
      );

      logger.info('Call initiated', {
        callId,
        callerId,
        calleeId,
        callType,
      });

      return callSession;
    } catch (error) {
      logger.error('Failed to initiate call', { error });
      throw error;
    }
  }

  /**
   * Generate Agora RTC token
   */
  generateAgoraToken(channelName: string, uid: number, role: 'publisher' | 'subscriber' = 'publisher'): string {
    try {
      const expirationTimeInSeconds = this.agoraConfig.tokenExpiryTime;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

      const token = RtcTokenBuilder.buildTokenWithUid(
        this.agoraConfig.appId,
        this.agoraConfig.appCertificate,
        channelName,
        uid,
        agoraRole,
        privilegeExpiredTs
      );

      logger.debug('Generated Agora token', {
        channelName,
        uid,
        role,
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate Agora token', { error });
      throw error;
    }
  }

  /**
   * Accept a call
   */
  async acceptCall(callId: string, calleeId: string): Promise<{
    callSession: CallSession;
    agoraToken: string;
  }> {
    try {
      const callSession = await this.getCallSession(callId);

      if (!callSession) {
        throw new Error('Call session not found');
      }

      if (callSession.calleeId !== calleeId) {
        throw new Error('Unauthorized to accept this call');
      }

      if (callSession.status !== 'initiated' && callSession.status !== 'ringing') {
        throw new Error('Call cannot be accepted in current status');
      }

      // Update call status
      callSession.status = 'connected';
      callSession.startTime = Date.now();

      // Generate Agora token for callee
      const agoraToken = this.generateAgoraToken(
        callSession.channelName,
        parseInt(calleeId),
        'publisher'
      );

      // Update call session in Redis (extend expiry to 2 hours for active call)
      await this.redis.set(
        `${this.CALL_SESSION_PREFIX}${callId}`,
        JSON.stringify(callSession),
        7200 // 2 hours
      );

      logger.info('Call accepted', {
        callId,
        calleeId,
      });

      return {
        callSession,
        agoraToken,
      };
    } catch (error) {
      logger.error('Failed to accept call', { error, callId });
      throw error;
    }
  }

  /**
   * Reject a call
   */
  async rejectCall(callId: string, calleeId: string, reason: string = 'rejected'): Promise<void> {
    try {
      const callSession = await this.getCallSession(callId);

      if (!callSession) {
        throw new Error('Call session not found');
      }

      if (callSession.calleeId !== calleeId) {
        throw new Error('Unauthorized to reject this call');
      }

      // Update call status
      callSession.status = 'rejected';
      callSession.endTime = Date.now();
      callSession.duration = 0;

      // Update call session in Redis
      await this.redis.set(
        `${this.CALL_SESSION_PREFIX}${callId}`,
        JSON.stringify(callSession),
        300 // keep for 5 minutes for history
      );

      logger.info('Call rejected', {
        callId,
        calleeId,
        reason,
      });

      // Save rejected call to database for history/analytics
      await this.saveCallToDatabase(callSession);
    } catch (error) {
      logger.error('Failed to reject call', { error, callId });
      throw error;
    }
  }

  /**
   * End a call
   */
  async endCall(callId: string, userId: string, duration?: number): Promise<void> {
    try {
      const callSession = await this.getCallSession(callId);

      if (!callSession) {
        throw new Error('Call session not found');
      }

      if (callSession.callerId !== userId && callSession.calleeId !== userId) {
        throw new Error('Unauthorized to end this call');
      }

      // Update call status
      callSession.status = 'ended';
      callSession.endTime = Date.now();
      callSession.duration = duration || (callSession.endTime - callSession.startTime) / 1000;

      // Update call session in Redis
      await this.redis.set(
        `${this.CALL_SESSION_PREFIX}${callId}`,
        JSON.stringify(callSession),
        86400 // keep for 24 hours for history
      );

      logger.info('Call ended', {
        callId,
        userId,
        duration: callSession.duration,
      });

      // Save call to database for history/analytics
      await this.saveCallToDatabase(callSession);
    } catch (error) {
      logger.error('Failed to end call', { error, callId });
      throw error;
    }
  }

  /**
   * Save call session to database for history/analytics
   */
  private async saveCallToDatabase(callSession: CallSession): Promise<void> {
    try {
      await callHistoryRepository.save(callSession);
      logger.info('Call saved to database', {
        callId: callSession.callId,
        callerId: callSession.callerId,
        calleeId: callSession.calleeId,
        duration: callSession.duration,
        status: callSession.status,
      });
    } catch (error) {
      // Log error but don't throw - call history save failure shouldn't block call end
      logger.error('Failed to save call to database', {
        error,
        callId: callSession.callId,
      });
    }
  }

  /**
   * Mark call as missed
   */
  async markCallAsMissed(callId: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(callId);

      if (!callSession) {
        return;
      }

      callSession.status = 'missed';
      callSession.endTime = Date.now();
      callSession.duration = 0;

      await this.redis.set(
        `${this.CALL_SESSION_PREFIX}${callId}`,
        JSON.stringify(callSession),
        86400 // keep for 24 hours
      );

      logger.info('Call marked as missed', { callId });

      // Save missed call to database for history/analytics
      await this.saveCallToDatabase(callSession);
    } catch (error) {
      logger.error('Failed to mark call as missed', { error, callId });
    }
  }

  /**
   * Set recording consent
   */
  async setRecordingConsent(callId: string, userId: string, consent: boolean): Promise<void> {
    try {
      const callSession = await this.getCallSession(callId);

      if (!callSession) {
        throw new Error('Call session not found');
      }

      if (!callSession.recordingConsent) {
        callSession.recordingConsent = {
          callerId: false,
          calleeId: false,
        };
      }

      if (userId === callSession.callerId) {
        callSession.recordingConsent.callerId = consent;
      } else if (userId === callSession.calleeId) {
        callSession.recordingConsent.calleeId = consent;
      }

      // Enable recording only if both parties consent
      callSession.recordingEnabled =
        callSession.recordingConsent.callerId && callSession.recordingConsent.calleeId;

      await this.redis.set(
        `${this.CALL_SESSION_PREFIX}${callId}`,
        JSON.stringify(callSession),
        7200
      );

      logger.info('Recording consent updated', {
        callId,
        userId,
        consent,
        recordingEnabled: callSession.recordingEnabled,
      });
    } catch (error) {
      logger.error('Failed to set recording consent', { error, callId });
      throw error;
    }
  }

  /**
   * Get call session
   */
  async getCallSession(callId: string): Promise<CallSession | null> {
    try {
      const data = await this.redis.get(`${this.CALL_SESSION_PREFIX}${callId}`);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as CallSession;
    } catch (error) {
      logger.error('Failed to get call session', { error, callId });
      return null;
    }
  }

  /**
   * Check if user is in a call
   */
  async isUserInCall(userId: string): Promise<boolean> {
    try {
      // This is a simple implementation - in production, you'd want to maintain
      // a separate index of active calls by user
      const keys = await this.redis.keys(`${this.CALL_SESSION_PREFIX}*`);

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const session = JSON.parse(data) as CallSession;
          if (
            (session.callerId === userId || session.calleeId === userId) &&
            (session.status === 'connected' || session.status === 'ringing')
          ) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check if user is in call', { error, userId });
      return false;
    }
  }

  /**
   * Get user's call history from database
   */
  async getCallHistory(userId: string, limit: number = 50): Promise<CallSession[]> {
    try {
      const history = await callHistoryRepository.getHistoryForUser(userId, 'all', limit);
      return history;
    } catch (error) {
      logger.error('Failed to get call history', { error, userId });
      return [];
    }
  }

  /**
   * Get call statistics for a user
   */
  async getCallStatistics(userId: string) {
    try {
      return await callHistoryRepository.getStatisticsForUser(userId);
    } catch (error) {
      logger.error('Failed to get call statistics', { error, userId });
      throw error;
    }
  }

  /**
   * Get calls between two users
   */
  async getCallsBetweenUsers(userId1: string, userId2: string, limit: number = 50): Promise<CallSession[]> {
    try {
      return await callHistoryRepository.getCallsBetweenUsers(userId1, userId2, limit);
    } catch (error) {
      logger.error('Failed to get calls between users', { error, userId1, userId2 });
      return [];
    }
  }
}

export default VideoCallService;
