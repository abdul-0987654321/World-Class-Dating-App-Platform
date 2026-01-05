import { Request, Response } from 'express';

import { targetingService } from '../../domain/services/targeting.service';
import logger from '../../utils/logger';

export class TargetingController {
  // Feature 1: Dating Behavior Segmentation
  async createBehaviorSegment(req: Request, res: Response): Promise<Response> {
    try {
      const { name, criteria } = req.body;

      if (!name || !criteria) {
        return res.status(400).json({
          success: false,
          message: 'Name and criteria are required',
        });
      }

      const segment = await targetingService.createBehaviorSegment(name, criteria);
      return res.status(201).json({ success: true, data: segment });
    } catch (error: any) {
      logger.error('Create behavior segment error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create behavior segment',
      });
    }
  }

  async analyzeDatingBehavior(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const behavior = await targetingService.analyzeDatingBehavior(userId);
      return res.status(200).json({ success: true, data: behavior });
    } catch (error: any) {
      logger.error('Analyze dating behavior error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to analyze dating behavior',
      });
    }
  }

  // Feature 2: Relationship Intent Targeting
  async detectRelationshipIntent(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const intent = await targetingService.detectRelationshipIntent(userId);
      return res.status(200).json({ success: true, data: intent });
    } catch (error: any) {
      logger.error('Detect relationship intent error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to detect relationship intent',
      });
    }
  }

  // Feature 3: Compatibility-Based Ad Matching
  async matchAdToUser(req: Request, res: Response): Promise<Response> {
    try {
      const { adId, userId, adTargeting } = req.body;

      if (!adId || !userId || !adTargeting) {
        return res.status(400).json({
          success: false,
          message: 'Ad ID, User ID, and ad targeting are required',
        });
      }

      const match = await targetingService.matchAdToUser(adId, userId, adTargeting);
      return res.status(200).json({ success: true, data: match });
    } catch (error: any) {
      logger.error('Match ad to user error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to match ad to user',
      });
    }
  }

  // Feature 4: Life Stage Segmentation
  async classifyLifeStage(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const segment = await targetingService.classifyLifeStage(userId);
      return res.status(200).json({ success: true, data: segment });
    } catch (error: any) {
      logger.error('Classify life stage error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to classify life stage',
      });
    }
  }

  // Feature 5: Profile Quality Scoring for Ad Tiers
  async calculateProfileQualityTier(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const tier = await targetingService.calculateProfileQualityTier(userId);
      return res.status(200).json({ success: true, data: tier });
    } catch (error: any) {
      logger.error('Calculate profile quality tier error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate profile quality tier',
      });
    }
  }

  // Feature 6: Geographic Dating Market Targeting
  async analyzeGeoDatingMarket(req: Request, res: Response): Promise<Response> {
    try {
      const { location } = req.body;

      if (!location || !location.city || !location.country || !location.coordinates) {
        return res.status(400).json({
          success: false,
          message: 'Location with city, country, and coordinates is required',
        });
      }

      const market = await targetingService.analyzeGeoDatingMarket(location);
      return res.status(200).json({ success: true, data: market });
    } catch (error: any) {
      logger.error('Analyze geo dating market error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to analyze geo dating market',
      });
    }
  }

  // Feature 7: Activity Time Window Targeting
  async analyzeActivityPatterns(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const windows = await targetingService.analyzeActivityPatterns(userId);
      return res.status(200).json({ success: true, data: windows });
    } catch (error: any) {
      logger.error('Analyze activity patterns error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to analyze activity patterns',
      });
    }
  }

  // Feature 8: Subscription Tier Targeting
  async getSubscriptionTierTargeting(req: Request, res: Response): Promise<Response> {
    try {
      const { tier } = req.params;
      const validTiers = ['free', 'gold', 'platinum', 'diamond'];

      if (!tier || !validTiers.includes(tier)) {
        return res.status(400).json({
          success: false,
          message: 'Valid tier (free, gold, platinum, diamond) is required',
        });
      }

      const target = await targetingService.getSubscriptionTierTargeting(tier as any);
      return res.status(200).json({ success: true, data: target });
    } catch (error: any) {
      logger.error('Get subscription tier targeting error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription tier targeting',
      });
    }
  }

  // Feature 9: Interest Graph for Cross-Category Targeting
  async buildInterestGraph(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const graph = await targetingService.buildInterestGraph(userId);
      return res.status(200).json({ success: true, data: graph });
    } catch (error: any) {
      logger.error('Build interest graph error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to build interest graph',
      });
    }
  }

  // Feature 10: Lookalike Audience Builder
  async buildLookalikeAudience(req: Request, res: Response): Promise<Response> {
    try {
      const { seedAudience, expansionParams } = req.body;

      if (!seedAudience || !expansionParams) {
        return res.status(400).json({
          success: false,
          message: 'Seed audience and expansion parameters are required',
        });
      }

      const audience = await targetingService.buildLookalikeAudience(seedAudience, expansionParams);
      return res.status(201).json({ success: true, data: audience });
    } catch (error: any) {
      logger.error('Build lookalike audience error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to build lookalike audience',
      });
    }
  }
}

export const targetingController = new TargetingController();
