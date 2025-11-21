import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Video Chat Service
 * Handles video/voice call setup, token generation, and call history
 */
export class VideoChatService {
  private appId: string;
  private appCertificate: string;
  private tokenExpirationTime: number = 3600; // 1 hour

  constructor() {
    this.appId = process.env.AGORA_APP_ID!;
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE!;

    if (!this.appId || !this.appCertificate) {
      logger.warn('Agora credentials not configured. Video chat will not work.');
    }
  }

  /**
   * Generate Agora RTC token for video/voice call
   * @param channelName - Unique channel name for the call
   * @param uid - User ID (0 for auto-assignment)
   * @param role - Publisher (1) or Subscriber (2)
   * @returns Agora token
   */
  generateToken(
    channelName: string,
    uid: number = 0,
    role: RtcRole = RtcRole.PUBLISHER
  ): string {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + this.tokenExpirationTime;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    return token;
  }

  /**
   * Initiate a video/voice call
   * @param callerId - User initiating the call
   * @param receiverId - User receiving the call
   * @param callType - 'video' or 'audio'
   * @returns Call details with token
   */
  async initiateCall(
    callerId: string,
    receiverId: string,
    callType: 'video' | 'audio'
  ): Promise<{
    success: boolean;
    callId?: string;
    channelName?: string;
    token?: string;
    error?: string;
  }> {
    try {
      // Check if users are matched
      const match = await db('matches')
        .where(function () {
          this.where({ user1_id: callerId, user2_id: receiverId })
            .orWhere({ user1_id: receiverId, user2_id: callerId });
        })
        .andWhere({ matched: true })
        .first();

      if (!match) {
        return {
          success: false,
          error: 'You can only call users you have matched with',
        };
      }

      // Check if receiver has blocked caller
      const blocked = await db('user_blocks')
        .where({ blocker_id: receiverId, blocked_id: callerId })
        .first();

      if (blocked) {
        return {
          success: false,
          error: 'Unable to initiate call',
        };
      }

      // Check caller's coin balance (Premium feature)
      const caller = await db('users')
        .where({ id: callerId })
        .select('coin_balance', 'subscription_tier')
        .first();

      // Video calls cost 10 coins per minute, audio calls cost 5 coins per minute
      const costPerMinute = callType === 'video' ? 10 : 5;

      // Free tier or basic: Requires coins
      // Mid/Ultra: Unlimited calls
      const requiresCoins = !['mid', 'ultra'].includes(caller.subscription_tier);

      if (requiresCoins && caller.coin_balance < costPerMinute) {
        return {
          success: false,
          error: `Insufficient coins. ${callType === 'video' ? 'Video' : 'Audio'} calls cost ${costPerMinute} coins per minute.`,
        };
      }

      // Create call record
      const callId = uuidv4();
      const channelName = `call_${callId}`;

      await db('video_calls').insert({
        id: callId,
        caller_id: callerId,
        receiver_id: receiverId,
        call_type: callType,
        channel_name: channelName,
        status: 'initiated',
        initiated_at: new Date(),
      });

      // Generate token for caller
      const token = this.generateToken(channelName);

      logger.info(`${callType} call initiated`, {
        callId,
        callerId,
        receiverId,
        channelName,
      });

      return {
        success: true,
        callId,
        channelName,
        token,
      };
    } catch (error: any) {
      logger.error('Failed to initiate call', {
        callerId,
        receiverId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to initiate call',
      };
    }
  }

  /**
   * Accept incoming call
   * @param callId - Call ID
   * @param userId - User accepting the call
   * @returns Call details with token
   */
  async acceptCall(
    callId: string,
    userId: string
  ): Promise<{
    success: boolean;
    channelName?: string;
    token?: string;
    callType?: 'video' | 'audio';
    error?: string;
  }> {
    try {
      const call = await db('video_calls').where({ id: callId }).first();

      if (!call) {
        return {
          success: false,
          error: 'Call not found',
        };
      }

      if (call.receiver_id !== userId) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      if (call.status !== 'initiated' && call.status !== 'ringing') {
        return {
          success: false,
          error: `Call already ${call.status}`,
        };
      }

      // Update call status
      await db('video_calls')
        .where({ id: callId })
        .update({
          status: 'active',
          started_at: new Date(),
        });

      // Generate token for receiver
      const token = this.generateToken(call.channel_name);

      logger.info('Call accepted', { callId, userId });

      return {
        success: true,
        channelName: call.channel_name,
        token,
        callType: call.call_type,
      };
    } catch (error: any) {
      logger.error('Failed to accept call', {
        callId,
        userId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to accept call',
      };
    }
  }

  /**
   * End active call
   * @param callId - Call ID
   * @param userId - User ending the call
   * @param reason - 'completed', 'declined', 'cancelled', 'missed'
   * @returns End call result
   */
  async endCall(
    callId: string,
    userId: string,
    reason: 'completed' | 'declined' | 'cancelled' | 'missed' = 'completed'
  ): Promise<{
    success: boolean;
    duration?: number;
    coinsCharged?: number;
    error?: string;
  }> {
    try {
      const call = await db('video_calls').where({ id: callId }).first();

      if (!call) {
        return {
          success: false,
          error: 'Call not found',
        };
      }

      if (call.caller_id !== userId && call.receiver_id !== userId) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      let duration = 0;
      let coinsCharged = 0;

      // Calculate duration if call was active
      if (call.started_at && reason === 'completed') {
        const endedAt = new Date();
        duration = Math.ceil((endedAt.getTime() - new Date(call.started_at).getTime()) / 1000 / 60); // Minutes

        // Charge coins if required
        const caller = await db('users')
          .where({ id: call.caller_id })
          .select('coin_balance', 'subscription_tier')
          .first();

        const requiresCoins = !['mid', 'ultra'].includes(caller.subscription_tier);

        if (requiresCoins && duration > 0) {
          const costPerMinute = call.call_type === 'video' ? 10 : 5;
          coinsCharged = duration * costPerMinute;

          // Deduct coins
          await db('users')
            .where({ id: call.caller_id })
            .decrement('coin_balance', coinsCharged);

          // Log transaction
          await db('coin_transactions').insert({
            id: uuidv4(),
            user_id: call.caller_id,
            amount: -coinsCharged,
            type: 'call',
            description: `${call.call_type} call - ${duration} min`,
            related_id: callId,
            created_at: new Date(),
          });
        }
      }

      // Update call record
      await db('video_calls')
        .where({ id: callId })
        .update({
          status: reason,
          ended_at: new Date(),
          duration_seconds: duration * 60,
        });

      logger.info('Call ended', {
        callId,
        userId,
        reason,
        duration,
        coinsCharged,
      });

      return {
        success: true,
        duration,
        coinsCharged,
      };
    } catch (error: any) {
      logger.error('Failed to end call', {
        callId,
        userId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to end call',
      };
    }
  }

  /**
   * Get call history for user
   * @param userId - User ID
   * @param limit - Number of results
   * @param offset - Pagination offset
   * @returns Call history
   */
  async getCallHistory(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const calls = await db('video_calls')
        .where(function () {
          this.where({ caller_id: userId }).orWhere({ receiver_id: userId });
        })
        .leftJoin('users as caller', 'video_calls.caller_id', 'caller.id')
        .leftJoin('users as receiver', 'video_calls.receiver_id', 'receiver.id')
        .select(
          'video_calls.*',
          'caller.first_name as caller_first_name',
          'caller.last_name as caller_last_name',
          'receiver.first_name as receiver_first_name',
          'receiver.last_name as receiver_last_name'
        )
        .orderBy('video_calls.initiated_at', 'desc')
        .limit(limit)
        .offset(offset);

      const totalCount = await db('video_calls')
        .where(function () {
          this.where({ caller_id: userId }).orWhere({ receiver_id: userId });
        })
        .count('* as count')
        .first();

      return {
        success: true,
        calls: calls.map(call => ({
          ...call,
          isCaller: call.caller_id === userId,
          otherUser: {
            id: call.caller_id === userId ? call.receiver_id : call.caller_id,
            firstName: call.caller_id === userId ? call.receiver_first_name : call.caller_first_name,
            lastName: call.caller_id === userId ? call.receiver_last_name : call.caller_last_name,
          },
        })),
        pagination: {
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: (totalCount?.count || 0) > offset + limit,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get call history', {
        userId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to retrieve call history',
        calls: [],
      };
    }
  }

  /**
   * Get active call for user
   * @param userId - User ID
   * @returns Active call if exists
   */
  async getActiveCall(userId: string) {
    try {
      const call = await db('video_calls')
        .where(function () {
          this.where({ caller_id: userId }).orWhere({ receiver_id: userId });
        })
        .whereIn('status', ['initiated', 'ringing', 'active'])
        .orderBy('initiated_at', 'desc')
        .first();

      if (!call) {
        return {
          success: true,
          hasActiveCall: false,
        };
      }

      // Generate fresh token
      const token = this.generateToken(call.channel_name);

      return {
        success: true,
        hasActiveCall: true,
        call: {
          ...call,
          isCaller: call.caller_id === userId,
          token,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get active call', {
        userId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to retrieve active call',
      };
    }
  }

  /**
   * Update call status (for ringing notification)
   * @param callId - Call ID
   * @param status - New status
   */
  async updateCallStatus(
    callId: string,
    status: 'ringing' | 'missed'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db('video_calls').where({ id: callId }).update({ status });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to update call status', {
        callId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to update call status',
      };
    }
  }
}

export const videoChatService = new VideoChatService();
