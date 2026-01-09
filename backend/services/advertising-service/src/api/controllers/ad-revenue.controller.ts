/**
 * Ad Revenue Controller
 * Handles ad impressions, clicks, rewards, and analytics API endpoints
 */

import { Request, Response } from 'express';

import { adRevenueService } from '../../domain/services/ad-revenue.service';
import logger from '../../utils/logger';

export class AdRevenueController {
  /**
   * Get ad configuration for client
   */
  async getAdConfig(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      const premiumTier = (req as any).user?.premiumTier;

      const shouldShowAds = userId
        ? await adRevenueService.shouldShowAds(userId, premiumTier)
        : true;

      const frequencyConfig = adRevenueService.getFrequencyCapConfig();
      const rewardConfigs = adRevenueService.getRewardConfigs();

      return res.status(200).json({
        success: true,
        data: {
          showAds: shouldShowAds,
          frequencyConfig: shouldShowAds ? frequencyConfig : null,
          rewardConfigs: shouldShowAds ? rewardConfigs : [],
          networks: ['admob', 'ironsource', 'unity'],
        },
      });
    } catch (error: any) {
      logger.error('Get ad config error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get ad configuration',
      });
    }
  }

  /**
   * Get user's ad state
   */
  async getUserAdState(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const stateResponse = await adRevenueService.getAdStateResponse(userId);

      return res.status(200).json({
        success: true,
        data: stateResponse,
      });
    } catch (error: any) {
      logger.error('Get user ad state error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user ad state',
      });
    }
  }

  /**
   * Record a user action (for frequency capping)
   */
  async recordAction(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      await adRevenueService.recordAction(userId);

      return res.status(200).json({
        success: true,
        message: 'Action recorded',
      });
    } catch (error: any) {
      logger.error('Record action error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to record action',
      });
    }
  }

  /**
   * Record an ad impression
   */
  async recordImpression(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const { adType, network, placement, platform, sessionId, deviceInfo } = req.body;

      if (!adType || !network) {
        return res.status(400).json({
          success: false,
          message: 'Ad type and network are required',
        });
      }

      const impression = await adRevenueService.recordImpression({
        userId,
        adType,
        network,
        placement: placement || 'unknown',
        platform: platform || 'unknown',
        sessionId,
        deviceInfo,
      });

      return res.status(201).json({
        success: true,
        data: impression,
      });
    } catch (error: any) {
      logger.error('Record impression error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to record impression',
      });
    }
  }

  /**
   * Record an ad click
   */
  async recordClick(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const { impressionId, adType } = req.body;

      if (!impressionId) {
        return res.status(400).json({
          success: false,
          message: 'Impression ID is required',
        });
      }

      const click = await adRevenueService.recordClick({
        impressionId,
        userId,
        adType: adType || 'unknown',
      });

      if (!click) {
        return res.status(404).json({
          success: false,
          message: 'Impression not found',
        });
      }

      return res.status(201).json({
        success: true,
        data: click,
      });
    } catch (error: any) {
      logger.error('Record click error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to record click',
      });
    }
  }

  /**
   * Get available rewards for video ads
   */
  async getAvailableRewards(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const { rewards, availability } = await adRevenueService.getAvailableRewards(userId);

      // Convert Map to object for JSON serialization
      const availabilityObj: Record<string, any> = {};
      availability.forEach((value, key) => {
        availabilityObj[key] = value;
      });

      return res.status(200).json({
        success: true,
        data: {
          rewards,
          availability: availabilityObj,
        },
      });
    } catch (error: any) {
      logger.error('Get available rewards error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get available rewards',
      });
    }
  }

  /**
   * Claim a reward after watching video ad
   */
  async claimReward(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const { rewardId, transactionId, impressionId, videoCompletionPercent } = req.body;

      if (!rewardId || videoCompletionPercent === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Reward ID and video completion percent are required',
        });
      }

      const result = await adRevenueService.claimReward({
        userId,
        rewardId,
        transactionId: transactionId || '',
        impressionId: impressionId || '',
        videoCompletionPercent,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Claim reward error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to claim reward',
      });
    }
  }

  /**
   * Record a purchase (triggers ad cooldown)
   */
  async recordPurchase(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      await adRevenueService.recordPurchase(userId);

      return res.status(200).json({
        success: true,
        message: 'Purchase recorded, ad cooldown activated',
      });
    } catch (error: any) {
      logger.error('Record purchase error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to record purchase',
      });
    }
  }

  /**
   * Get ad performance metrics (admin only)
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const { startDate, endDate, period } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const metrics = await adRevenueService.getPerformanceMetrics(
        start,
        end,
        (period as 'hourly' | 'daily' | 'weekly' | 'monthly') || 'daily'
      );

      return res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Get performance metrics error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get performance metrics',
      });
    }
  }

  /**
   * Get reward analytics (admin only)
   */
  async getRewardAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { startDate, endDate, period } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await adRevenueService.getRewardAnalytics(
        start,
        end,
        (period as 'daily' | 'weekly' | 'monthly') || 'daily'
      );

      return res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logger.error('Get reward analytics error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reward analytics',
      });
    }
  }
}

export const adRevenueController = new AdRevenueController();
export default adRevenueController;
