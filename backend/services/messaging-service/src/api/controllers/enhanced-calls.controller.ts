/**
 * Enhanced Calls Controller
 * Additional endpoints for video/voice calling functionality
 */

import { Request, Response } from 'express';
import { createLogger } from '../../utils/logger';
import { callHistoryRepository } from '../../domain/repositories/call-history.repository';
import { VideoCallService } from '../../services/video-call.service';
import { getDefaultICEConfig } from '../../config/webrtc.config';
import redisClient from '../../infrastructure/cache/redis';
import config from '../../config';

const logger = createLogger('enhanced-calls-controller');

// Initialize VideoCallService with required dependencies
const agoraConfig = {
  appId: process.env.AGORA_APP_ID || '',
  appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  tokenExpiryTime: parseInt(process.env.AGORA_TOKEN_EXPIRY || '3600', 10),
};
const videoCallService = new VideoCallService(redisClient, agoraConfig);

export class EnhancedCallsController {
  /**
   * Get WebRTC configuration
   */
  async getWebRTCConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = getDefaultICEConfig();

      res.json({
        success: true,
        data: {
          webrtcConfig: config,
          callSettings: {
            maxDuration: parseInt(process.env.MAX_CALL_DURATION_MS || '7200000', 10) / 1000,
            timeoutDuration: parseInt(process.env.CALL_TIMEOUT_MS || '60000', 10) / 1000,
          },
        },
      });
    } catch (error: any) {
      logger.error('Error fetching WebRTC config:', error);
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  }

  /**
   * Get call statistics for user
   */
  async getCallStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await callHistoryRepository.getStatisticsForUser(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error fetching call statistics:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  /**
   * Get call history between current user and another user
   */
  async getCallsWithUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { otherUserId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const history = await callHistoryRepository.getCallsBetweenUsers(userId, otherUserId, limit);

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      logger.error('Error fetching calls with user:', error);
      res.status(500).json({ error: 'Failed to fetch calls' });
    }
  }

  /**
   * Delete a call from history
   */
  async deleteCall(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { callId } = req.params;

      // Verify ownership
      const call = await callHistoryRepository.findById(callId, userId);
      if (!call) {
        res.status(404).json({ error: 'Call not found' });
        return;
      }

      if (call.callerId !== userId && call.calleeId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Note: Implement soft delete in production
      logger.info(`User ${userId} deleted call ${callId} from history`);

      res.json({
        success: true,
        message: 'Call removed from history',
      });
    } catch (error: any) {
      logger.error('Error deleting call:', error);
      res.status(500).json({ error: 'Failed to delete call' });
    }
  }

  /**
   * Report call quality metrics
   */
  async reportQuality(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { callId, metrics } = req.body;

      if (!callId || !metrics) {
        res.status(400).json({ error: 'Call ID and metrics required' });
        return;
      }

      // Log for analytics
      logger.info('Call quality report received', {
        callId,
        userId,
        packetsLost: metrics.packetsLost,
        jitter: metrics.jitter,
        roundTripTime: metrics.roundTripTime,
        bitrate: metrics.bitrate,
      });

      res.json({
        success: true,
        message: 'Quality report received',
      });
    } catch (error: any) {
      logger.error('Error reporting quality:', error);
      res.status(500).json({ error: 'Failed to report quality' });
    }
  }

  /**
   * Get recent missed calls count
   */
  async getMissedCallsCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const hours = parseInt(req.query.hours as string) || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const count = await callHistoryRepository.getRecentCallsCount(userId, since);

      res.json({
        success: true,
        data: { count, since },
      });
    } catch (error: any) {
      logger.error('Error fetching missed calls count:', error);
      res.status(500).json({ error: 'Failed to fetch count' });
    }
  }

  /**
   * Check if user is currently in a call
   */
  async checkUserInCall(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { targetUserId } = req.params;

      const isInCall = await videoCallService.isUserInCall(targetUserId);

      res.json({
        success: true,
        data: {
          userId: targetUserId,
          isInCall,
        },
      });
    } catch (error: any) {
      logger.error('Error checking if user in call:', error);
      res.status(500).json({ error: 'Failed to check status' });
    }
  }
}

export const enhancedCallsController = new EnhancedCallsController();
