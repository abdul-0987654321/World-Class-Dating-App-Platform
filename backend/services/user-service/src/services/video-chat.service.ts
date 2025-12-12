import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

/**
 * Video Chat Service
 * Handles video/voice call setup, token generation, and call history
 * Supports premium features: HD quality, call duration limits, recordings
 */
export class VideoChatService {
  private appId: string;
  private appCertificate: string;
  private tokenExpirationTime: number = 3600; // 1 hour

  // Free tier call duration limits (minutes per day)
  private readonly FREE_DAILY_VIDEO_LIMIT = 30;
  private readonly FREE_DAILY_AUDIO_LIMIT = 60;

  // Per-call duration limits for free users (minutes)
  private readonly FREE_MAX_CALL_DURATION_VIDEO = 15;
  private readonly FREE_MAX_CALL_DURATION_AUDIO = 30;

  // Cost per minute in coins
  private readonly VIDEO_COST_PER_MINUTE = 10;
  private readonly AUDIO_COST_PER_MINUTE = 5;

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
    role: number = RtcRole.PUBLISHER
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
   * Check if user has exceeded daily call duration limits
   * @param userId - User ID
   * @param callType - 'video' or 'audio'
   * @returns Limit check result
   */
  private async checkCallDurationLimit(
    userId: string,
    callType: 'video' | 'audio',
    subscriptionTier: string
  ): Promise<{
    allowed: boolean;
    remainingMinutes?: number;
    error?: string;
  }> {
    // Premium users have unlimited calls
    if (['premium', 'premium_plus', 'mid', 'ultra'].includes(subscriptionTier)) {
      return { allowed: true };
    }

    const today = new Date().toISOString().split('T')[0];

    // Get or create today's limit record
    let limitRecord = await db('call_duration_limits')
      .where({ user_id: userId, limit_date: today })
      .first();

    if (!limitRecord) {
      // Create new record for today
      limitRecord = await db('call_duration_limits')
        .insert({
          id: uuidv4(),
          user_id: userId,
          limit_date: today,
          daily_video_minutes_used: 0,
          daily_audio_minutes_used: 0,
          daily_video_limit: this.FREE_DAILY_VIDEO_LIMIT,
          daily_audio_limit: this.FREE_DAILY_AUDIO_LIMIT,
        })
        .returning('*')
        .then(rows => rows[0]);
    }

    const minutesUsed = callType === 'video'
      ? limitRecord.daily_video_minutes_used
      : limitRecord.daily_audio_minutes_used;

    const dailyLimit = callType === 'video'
      ? limitRecord.daily_video_limit
      : limitRecord.daily_audio_limit;

    const remainingMinutes = dailyLimit - minutesUsed;

    if (remainingMinutes <= 0) {
      return {
        allowed: false,
        remainingMinutes: 0,
        error: `Daily ${callType} call limit reached. Upgrade to premium for unlimited calls.`,
      };
    }

    return {
      allowed: true,
      remainingMinutes,
    };
  }

  /**
   * Initiate a video/voice call
   * @param callerId - User initiating the call
   * @param receiverId - User receiving the call
   * @param callType - 'video' or 'audio'
   * @param hdEnabled - Enable HD quality (premium feature)
   * @returns Call details with token
   */
  async initiateCall(
    callerId: string,
    receiverId: string,
    callType: 'video' | 'audio',
    hdEnabled: boolean = false
  ): Promise<{
    success: boolean;
    callId?: string;
    channelName?: string;
    token?: string;
    appId?: string;
    maxDuration?: number;
    remainingMinutes?: number;
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

      // Get caller details
      const caller = await db('users')
        .where({ id: callerId })
        .select('coin_balance', 'subscription_tier')
        .first();

      const isPremium = ['premium', 'premium_plus', 'mid', 'ultra'].includes(
        caller.subscription_tier
      );

      // Check daily call duration limits for free users
      const limitCheck = await this.checkCallDurationLimit(
        callerId,
        callType,
        caller.subscription_tier
      );

      if (!limitCheck.allowed) {
        return {
          success: false,
          error: limitCheck.error,
        };
      }

      // HD quality is premium-only feature
      const actualHdEnabled = hdEnabled && isPremium;
      if (hdEnabled && !isPremium) {
        logger.info('HD quality requested but user is not premium', { callerId });
      }

      // Check caller's coin balance (for free users)
      const costPerMinute = callType === 'video'
        ? this.VIDEO_COST_PER_MINUTE
        : this.AUDIO_COST_PER_MINUTE;

      if (!isPremium && caller.coin_balance < costPerMinute) {
        return {
          success: false,
          error: `Insufficient coins. ${callType === 'video' ? 'Video' : 'Audio'} calls cost ${costPerMinute} coins per minute.`,
        };
      }

      // Determine max call duration
      const maxDuration = isPremium
        ? undefined // Unlimited for premium
        : callType === 'video'
        ? Math.min(this.FREE_MAX_CALL_DURATION_VIDEO, limitCheck.remainingMinutes!)
        : Math.min(this.FREE_MAX_CALL_DURATION_AUDIO, limitCheck.remainingMinutes!);

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
        video_quality: actualHdEnabled ? 'hd' : 'sd',
        hd_enabled: actualHdEnabled,
        was_premium_call: isPremium,
        initiated_at: new Date(),
      });

      // Generate token for caller
      const token = this.generateToken(channelName);

      logger.info(`${callType} call initiated`, {
        callId,
        callerId,
        receiverId,
        channelName,
        hdEnabled: actualHdEnabled,
        isPremium,
        maxDuration,
      });

      return {
        success: true,
        callId,
        channelName,
        token,
        appId: this.appId,
        maxDuration,
        remainingMinutes: limitCheck.remainingMinutes,
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
   * @param connectionQuality - Connection quality metrics
   * @returns End call result
   */
  async endCall(
    callId: string,
    userId: string,
    reason: 'completed' | 'declined' | 'cancelled' | 'missed' = 'completed',
    connectionQuality?: {
      avgBitrate?: number;
      packetLoss?: number;
      quality?: 'poor' | 'fair' | 'good' | 'excellent';
    }
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

        // Get caller details
        const caller = await db('users')
          .where({ id: call.caller_id })
          .select('coin_balance', 'subscription_tier')
          .first();

        const isPremium = ['premium', 'premium_plus', 'mid', 'ultra'].includes(
          caller.subscription_tier
        );

        // Update daily usage for free users
        if (!isPremium && duration > 0) {
          const today = new Date().toISOString().split('T')[0];

          const updateField = call.call_type === 'video'
            ? 'daily_video_minutes_used'
            : 'daily_audio_minutes_used';

          await db('call_duration_limits')
            .where({ user_id: call.caller_id, limit_date: today })
            .increment(updateField, duration);
        }

        // Charge coins for free users
        if (!isPremium && duration > 0) {
          const costPerMinute = call.call_type === 'video'
            ? this.VIDEO_COST_PER_MINUTE
            : this.AUDIO_COST_PER_MINUTE;

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
          avg_bitrate: connectionQuality?.avgBitrate,
          packet_loss_percentage: connectionQuality?.packetLoss,
          connection_quality: connectionQuality?.quality,
        });

      logger.info('Call ended', {
        callId,
        userId,
        reason,
        duration,
        coinsCharged,
        connectionQuality,
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
          total: Number(totalCount?.count || 0),
          limit,
          offset,
          hasMore: Number(totalCount?.count || 0) > offset + limit,
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
