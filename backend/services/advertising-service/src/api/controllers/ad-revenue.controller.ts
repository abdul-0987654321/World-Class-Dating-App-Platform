/**
 * Ad Revenue Controller
 * Handles API endpoints for ad impressions, clicks, and rewards
 */

import { Request, Response } from 'express';
import { adRevenueService } from '../../domain/services/ad-revenue.service';
import logger from '../../utils/logger';
import {
  RecordImpressionRequest,
  RecordClickRequest,
  ClaimRewardRequest,
} from '../../domain/types/ad-revenue.types';

/**
 * Get ad configuration for client
 */
export async function getAdConfig(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId || (req as any).user?.id;
    const premiumTier = req.query.premiumTier as string | undefined;

    const shouldShow = await adRevenueService.shouldShowAds(userId, premiumTier);
    const frequencyCap = adRevenueService.getFrequencyCapConfig();
    const rewards = adRevenueService.getRewardConfigs();

    res.json({
      success: true,
      data: {
        enabled: shouldShow,
        testMode: process.env.NODE_ENV !== 'production',
        frequencyCap,
        rewards: rewards.filter(r => r.enabled),
        premiumTiersAdFree: ['BASIC', 'PLUS', 'PREMIUM', 'PREMIUM_PLUS', 'ELITE'],
      },
    });
  } catch (error) {
    logger.error('Error getting ad config', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ad configuration',
    });
  }
}

/**
 * Get user's ad state (for frequency capping)
 */
export async function getUserAdState(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId || (req as any).user?.id;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    const stateResponse = await adRevenueService.getAdStateResponse(userId);

    res.json({
      success: true,
      data: stateResponse,
    });
  } catch (error) {
    logger.error('Error getting user ad state', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ad state',
    });
  }
}

/**
 * Record a user action (for frequency capping)
 */
export async function recordAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId || (req as any).user?.id;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    await adRevenueService.recordAction(userId);

    res.json({
      success: true,
      message: 'Action recorded',
    });
  } catch (error) {
    logger.error('Error recording action', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record action',
    });
  }
}

/**
 * Record an ad impression
 */
export async function recordImpression(req: Request, res: Response): Promise<void> {
  try {
    const request: RecordImpressionRequest = {
      userId: req.body.userId || (req as any).user?.id,
      adType: req.body.adType,
      network: req.body.network,
      placement: req.body.placement,
      platform: req.body.platform,
      sessionId: req.body.sessionId,
      deviceInfo: req.body.deviceInfo,
    };

    if (!request.userId || !request.adType || !request.network || !request.placement) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, adType, network, placement',
      });
      return;
    }

    const impression = await adRevenueService.recordImpression(request);

    res.json({
      success: true,
      data: {
        impressionId: impression.id,
      },
    });
  } catch (error) {
    logger.error('Error recording impression', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record impression',
    });
  }
}

/**
 * Record an ad click
 */
export async function recordClick(req: Request, res: Response): Promise<void> {
  try {
    const request: RecordClickRequest = {
      impressionId: req.body.impressionId,
      userId: req.body.userId || (req as any).user?.id,
      adType: req.body.adType,
    };

    if (!request.impressionId || !request.userId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: impressionId, userId',
      });
      return;
    }

    const click = await adRevenueService.recordClick(request);

    if (!click) {
      res.status(404).json({
        success: false,
        message: 'Impression not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        clickId: click.id,
      },
    });
  } catch (error) {
    logger.error('Error recording click', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record click',
    });
  }
}

/**
 * Get available rewards for video ads
 */
export async function getAvailableRewards(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId || (req as any).user?.id;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    const { rewards, availability } = await adRevenueService.getAvailableRewards(userId);

    // Convert availability map to object
    const availabilityObj: Record<string, any> = {};
    availability.forEach((value, key) => {
      availabilityObj[key] = value;
    });

    res.json({
      success: true,
      data: {
        rewards,
        availability: availabilityObj,
      },
    });
  } catch (error) {
    logger.error('Error getting available rewards', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available rewards',
    });
  }
}

/**
 * Claim a reward after watching video ad
 */
export async function claimReward(req: Request, res: Response): Promise<void> {
  try {
    const request: ClaimRewardRequest = {
      userId: req.body.userId || (req as any).user?.id,
      rewardId: req.body.rewardId,
      transactionId: req.body.transactionId,
      impressionId: req.body.impressionId,
      videoCompletionPercent: req.body.videoCompletionPercent || 100,
    };

    if (!request.userId || !request.rewardId || !request.transactionId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, rewardId, transactionId',
      });
      return;
    }

    const result = await adRevenueService.claimReward(request);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        reward: result.reward,
        newBalance: result.newBalance,
      },
    });
  } catch (error) {
    logger.error('Error claiming reward', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim reward',
    });
  }
}

/**
 * Record a purchase (triggers ad cooldown)
 */
export async function recordPurchase(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.body.userId || (req as any).user?.id;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    await adRevenueService.recordPurchase(userId);

    res.json({
      success: true,
      message: 'Purchase recorded, ad cooldown activated',
    });
  } catch (error) {
    logger.error('Error recording purchase', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record purchase',
    });
  }
}

/**
 * Get ad performance metrics (admin)
 */
export async function getPerformanceMetrics(req: Request, res: Response): Promise<void> {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();
    const period = (req.query.period as 'hourly' | 'daily' | 'weekly' | 'monthly') || 'daily';

    const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, period);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error getting performance metrics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics',
    });
  }
}

/**
 * Get reward analytics (admin)
 */
export async function getRewardAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';

    const analytics = await adRevenueService.getRewardAnalytics(startDate, endDate, period);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error getting reward analytics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reward analytics',
    });
  }
}

export default {
  getAdConfig,
  getUserAdState,
  recordAction,
  recordImpression,
  recordClick,
  getAvailableRewards,
  claimReward,
  recordPurchase,
  getPerformanceMetrics,
  getRewardAnalytics,
};
