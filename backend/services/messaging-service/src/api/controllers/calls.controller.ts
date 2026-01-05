/**
 * Calls Controller
 * Handles audio/video calling REST endpoints
 */

import axios from 'axios';
import { Request, Response } from 'express';

import { RedisClient } from '../../infrastructure/cache/redis';
import { VideoCallService, CallSession } from '../../services/video-call.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('calls-controller');

// Service URLs
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3009';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

// Agora configuration
const agoraConfig = {
  appId: process.env.AGORA_APP_ID || '',
  appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  tokenExpiryTime: parseInt(process.env.AGORA_TOKEN_EXPIRY || '3600', 10),
};

// Initialize VideoCallService
let videoCallService: VideoCallService | null = null;

const getVideoCallService = (): VideoCallService => {
  if (!videoCallService) {
    const redis = RedisClient.getInstance();
    videoCallService = new VideoCallService(redis, agoraConfig);
  }
  return videoCallService;
};

/**
 * Check if two users are matched
 */
async function areUsersMatched(userId1: string, userId2: string): Promise<boolean> {
  try {
    const response = await axios.get(`${MATCHING_SERVICE_URL}/api/internal/find`, {
      params: { user1Id: userId1, user2Id: userId2 },
      headers: {
        'X-Service-Key': INTERNAL_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    return response.status === 200 && response.data.success;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return false;
    }
    logger.error('Error checking match status', { error: error.message, userId1, userId2 });
    return false;
  }
}

/**
 * Check if user has premium subscription
 */
async function checkUserSubscription(
  userId: string
): Promise<{ isPremium: boolean; tier: string }> {
  try {
    const response = await axios.get(
      `${USER_SERVICE_URL}/api/internal/users/${userId}/subscription`,
      {
        headers: {
          'X-Service-Key': INTERNAL_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    if (response.status === 200 && response.data.success) {
      const tier = response.data.data?.tier || 'free';
      // Premium tiers that allow calls: premium, premium_plus, elite
      const premiumTiers = ['premium', 'premium_plus', 'elite'];
      return {
        isPremium: premiumTiers.includes(tier.toLowerCase()),
        tier,
      };
    }

    return { isPremium: false, tier: 'free' };
  } catch (error: any) {
    logger.error('Error checking subscription', { error: error.message, userId });
    return { isPremium: false, tier: 'free' };
  }
}

/**
 * Get user info for call session
 */
async function getUserInfo(userId: string): Promise<{ name: string; avatar?: string } | null> {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/internal/users/${userId}/profile`, {
      headers: {
        'X-Service-Key': INTERNAL_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    if (response.status === 200 && response.data.success) {
      return {
        name: response.data.data?.displayName || response.data.data?.name || 'User',
        avatar: response.data.data?.avatar || response.data.data?.profilePhoto,
      };
    }

    return null;
  } catch (error: any) {
    logger.error('Error fetching user info', { error: error.message, userId });
    return null;
  }
}

export class CallsController {
  /**
   * Request a call with another user
   * POST /api/v1/calls/request
   */
  async requestCall(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.sub;
      const { calleeId, callType } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!calleeId || !callType) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          code: 'MISSING_FIELDS',
          message: 'calleeId and callType are required',
        });
        return;
      }

      if (!['video', 'audio'].includes(callType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid call type',
          code: 'INVALID_CALL_TYPE',
          message: 'callType must be "video" or "audio"',
        });
        return;
      }

      // Check if caller has Premium subscription
      const subscription = await checkUserSubscription(userId);
      if (!subscription.isPremium) {
        res.status(403).json({
          success: false,
          error: 'Premium subscription required',
          code: 'PREMIUM_REQUIRED',
          message: 'Video/audio calls require a Premium subscription or higher',
        });
        return;
      }

      // Check if users are matched
      const matched = await areUsersMatched(userId, calleeId);
      if (!matched) {
        res.status(403).json({
          success: false,
          error: 'Users not matched',
          code: 'NOT_MATCHED',
          message: 'You can only call users you have matched with',
        });
        return;
      }

      const service = getVideoCallService();

      // Check if caller is already in a call
      const callerInCall = await service.isUserInCall(userId);
      if (callerInCall) {
        res.status(409).json({
          success: false,
          error: 'Already in a call',
          code: 'ALREADY_IN_CALL',
          message: 'You are already in an active call',
        });
        return;
      }

      // Check if callee is already in a call
      const calleeInCall = await service.isUserInCall(calleeId);
      if (calleeInCall) {
        res.status(409).json({
          success: false,
          error: 'User busy',
          code: 'USER_BUSY',
          message: 'The user you are trying to call is busy',
        });
        return;
      }

      // Get user info for both parties
      const [callerInfo, calleeInfo] = await Promise.all([
        getUserInfo(userId),
        getUserInfo(calleeId),
      ]);

      // Initiate the call
      const callSession = await service.initiateCall(
        userId,
        callerInfo?.name || 'User',
        calleeId,
        calleeInfo?.name || 'User',
        callType,
        callerInfo?.avatar
      );

      // Generate Agora token for caller
      const agoraToken = service.generateAgoraToken(
        callSession.channelName,
        parseInt(userId),
        'publisher'
      );

      logger.info('Call requested', {
        callId: callSession.callId,
        callerId: userId,
        calleeId,
        callType,
      });

      res.status(200).json({
        success: true,
        message: 'Call initiated',
        data: {
          callId: callSession.callId,
          channelName: callSession.channelName,
          agoraToken,
          callType,
          calleeId,
          calleeName: calleeInfo?.name,
          status: callSession.status,
        },
      });
    } catch (error: any) {
      logger.error('Error requesting call', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to request call',
        code: 'CALL_REQUEST_FAILED',
        message: error.message || 'An error occurred while requesting the call',
      });
    }
  }

  /**
   * Accept an incoming call
   * POST /api/v1/calls/accept
   */
  async acceptCall(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.sub;
      const { callId } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!callId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field',
          code: 'MISSING_FIELDS',
          message: 'callId is required',
        });
        return;
      }

      const service = getVideoCallService();
      const result = await service.acceptCall(callId, userId);

      logger.info('Call accepted', { callId, calleeId: userId });

      res.status(200).json({
        success: true,
        message: 'Call accepted',
        data: {
          callId: result.callSession.callId,
          channelName: result.callSession.channelName,
          agoraToken: result.agoraToken,
          callType: result.callSession.callType,
          callerId: result.callSession.callerId,
          callerName: result.callSession.callerName,
          status: result.callSession.status,
        },
      });
    } catch (error: any) {
      logger.error('Error accepting call', { error: error.message });

      if (error.message === 'Call session not found') {
        res.status(404).json({
          success: false,
          error: 'Call not found',
          code: 'CALL_NOT_FOUND',
          message: 'The call session was not found or has expired',
        });
        return;
      }

      if (error.message === 'Unauthorized to accept this call') {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: 'You are not authorized to accept this call',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to accept call',
        code: 'CALL_ACCEPT_FAILED',
        message: error.message || 'An error occurred while accepting the call',
      });
    }
  }

  /**
   * Reject an incoming call
   * POST /api/v1/calls/reject
   */
  async rejectCall(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.sub;
      const { callId, reason } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!callId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field',
          code: 'MISSING_FIELDS',
          message: 'callId is required',
        });
        return;
      }

      const service = getVideoCallService();
      await service.rejectCall(callId, userId, reason || 'rejected');

      logger.info('Call rejected', { callId, calleeId: userId, reason });

      res.status(200).json({
        success: true,
        message: 'Call rejected',
        data: { callId },
      });
    } catch (error: any) {
      logger.error('Error rejecting call', { error: error.message });

      if (error.message === 'Call session not found') {
        res.status(404).json({
          success: false,
          error: 'Call not found',
          code: 'CALL_NOT_FOUND',
          message: 'The call session was not found or has expired',
        });
        return;
      }

      if (error.message === 'Unauthorized to reject this call') {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: 'You are not authorized to reject this call',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to reject call',
        code: 'CALL_REJECT_FAILED',
        message: error.message || 'An error occurred while rejecting the call',
      });
    }
  }

  /**
   * End an active call
   * POST /api/v1/calls/end
   */
  async endCall(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.sub;
      const { callId, duration } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!callId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field',
          code: 'MISSING_FIELDS',
          message: 'callId is required',
        });
        return;
      }

      const service = getVideoCallService();
      await service.endCall(callId, userId, duration);

      logger.info('Call ended', { callId, userId, duration });

      res.status(200).json({
        success: true,
        message: 'Call ended',
        data: { callId, duration },
      });
    } catch (error: any) {
      logger.error('Error ending call', { error: error.message });

      if (error.message === 'Call session not found') {
        res.status(404).json({
          success: false,
          error: 'Call not found',
          code: 'CALL_NOT_FOUND',
          message: 'The call session was not found or has already ended',
        });
        return;
      }

      if (error.message === 'Unauthorized to end this call') {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: 'You are not authorized to end this call',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to end call',
        code: 'CALL_END_FAILED',
        message: error.message || 'An error occurred while ending the call',
      });
    }
  }

  /**
   * Get call status
   * GET /api/v1/calls/:callId
   */
  async getCallStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.sub;
      const { callId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const service = getVideoCallService();
      const callSession = await service.getCallSession(callId);

      if (!callSession) {
        res.status(404).json({
          success: false,
          error: 'Call not found',
          code: 'CALL_NOT_FOUND',
        });
        return;
      }

      // Verify user is part of the call
      if (callSession.callerId !== userId && callSession.calleeId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: 'You are not a participant of this call',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          callId: callSession.callId,
          status: callSession.status,
          callType: callSession.callType,
          callerId: callSession.callerId,
          callerName: callSession.callerName,
          calleeId: callSession.calleeId,
          calleeName: callSession.calleeName,
          startTime: callSession.startTime,
          endTime: callSession.endTime,
          duration: callSession.duration,
        },
      });
    } catch (error: any) {
      logger.error('Error getting call status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get call status',
        code: 'GET_CALL_STATUS_FAILED',
        message: error.message || 'An error occurred',
      });
    }
  }

  /**
   * Get call history
   * GET /api/v1/calls/history
   */
  async getCallHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const service = getVideoCallService();
      const history = await service.getCallHistory(userId, limit);

      // Apply offset manually (simple implementation)
      const paginatedHistory = history.slice(offset, offset + limit);

      res.status(200).json({
        success: true,
        data: {
          calls: paginatedHistory.map((call) => ({
            callId: call.callId,
            status: call.status,
            callType: call.callType,
            callerId: call.callerId,
            callerName: call.callerName,
            calleeId: call.calleeId,
            calleeName: call.calleeName,
            startTime: call.startTime,
            endTime: call.endTime,
            duration: call.duration,
          })),
          pagination: {
            total: history.length,
            limit,
            offset,
            hasMore: offset + limit < history.length,
          },
        },
      });
    } catch (error: any) {
      logger.error('Error getting call history', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get call history',
        code: 'GET_CALL_HISTORY_FAILED',
        message: error.message || 'An error occurred',
      });
    }
  }

  /**
   * Check call availability for a user
   * GET /api/v1/calls/availability/:userId
   */
  async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = (req as any).user?.userId || (req as any).user?.sub;
      const { userId } = req.params;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Check if users are matched
      const matched = await areUsersMatched(currentUserId, userId);
      if (!matched) {
        res.status(200).json({
          success: true,
          data: {
            available: false,
            reason: 'not_matched',
            message: 'You can only call users you have matched with',
          },
        });
        return;
      }

      const service = getVideoCallService();

      // Check if target user is in a call
      const userInCall = await service.isUserInCall(userId);
      if (userInCall) {
        res.status(200).json({
          success: true,
          data: {
            available: false,
            reason: 'busy',
            message: 'User is currently in another call',
          },
        });
        return;
      }

      // Check if current user is in a call
      const currentUserInCall = await service.isUserInCall(currentUserId);
      if (currentUserInCall) {
        res.status(200).json({
          success: true,
          data: {
            available: false,
            reason: 'caller_busy',
            message: 'You are already in an active call',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          available: true,
          reason: null,
          message: 'User is available for a call',
        },
      });
    } catch (error: any) {
      logger.error('Error checking availability', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to check availability',
        code: 'CHECK_AVAILABILITY_FAILED',
        message: error.message || 'An error occurred',
      });
    }
  }
}

export const callsController = new CallsController();
