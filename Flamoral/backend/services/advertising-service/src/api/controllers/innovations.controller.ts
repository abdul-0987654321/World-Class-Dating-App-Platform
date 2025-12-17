import { Request, Response } from 'express';
import { innovationsService } from '../../domain/services/innovations.service';
import logger from '../../utils/logger';

export class InnovationsController {
  // Feature 1: "Ready to Mingle" Status Ads
  async getReadyToMingleAudience(req: Request, res: Response): Promise<Response> {
    try {
      const audience = await innovationsService.getReadyToMingleAudience();
      return res.status(200).json({ success: true, data: audience });
    } catch (error: any) {
      logger.error('Get ready to mingle audience error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get ready to mingle audience',
      });
    }
  }

  // Feature 2: First Date Sponsor Integration
  async getFirstDateSponsors(req: Request, res: Response): Promise<Response> {
    try {
      const { location } = req.body;

      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Location is required',
        });
      }

      const sponsors = await innovationsService.getFirstDateSponsors(location);
      return res.status(200).json({ success: true, data: sponsors });
    } catch (error: any) {
      logger.error('Get first date sponsors error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get first date sponsors',
      });
    }
  }

  // Feature 3: Compatibility-Triggered Promotions
  async triggerCompatibilityPromotion(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, matchId, compatibilityScore } = req.body;

      if (!userId || !matchId || compatibilityScore === undefined) {
        return res.status(400).json({
          success: false,
          message: 'User ID, match ID, and compatibility score are required',
        });
      }

      const promotion = await innovationsService.triggerCompatibilityPromotion(
        userId,
        matchId,
        compatibilityScore
      );
      return res.status(200).json({ success: true, data: promotion });
    } catch (error: any) {
      logger.error('Trigger compatibility promotion error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to trigger compatibility promotion',
      });
    }
  }

  // Feature 4: Profile Boost Marketplace Ads
  async getBoostMarketplace(req: Request, res: Response): Promise<Response> {
    try {
      const marketplace = await innovationsService.getBoostMarketplace();
      return res.status(200).json({ success: true, data: marketplace });
    } catch (error: any) {
      logger.error('Get boost marketplace error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get boost marketplace',
      });
    }
  }

  // Feature 5: Dating Event Sponsorship Platform
  async getEventSponsorships(req: Request, res: Response): Promise<Response> {
    try {
      const sponsorships = await innovationsService.getEventSponsorships();
      return res.status(200).json({ success: true, data: sponsorships });
    } catch (error: any) {
      logger.error('Get event sponsorships error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get event sponsorships',
      });
    }
  }

  // Feature 6: Relationship Milestone Advertising
  async getMilestoneAds(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const ads = await innovationsService.getMilestoneAds(userId);
      return res.status(200).json({ success: true, data: ads });
    } catch (error: any) {
      logger.error('Get milestone ads error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get milestone ads',
      });
    }
  }

  // Feature 7: Singles Event Discovery Ads
  async discoverSinglesEvents(req: Request, res: Response): Promise<Response> {
    try {
      const { location } = req.body;

      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Location is required',
        });
      }

      const events = await innovationsService.discoverSinglesEvents(location);
      return res.status(200).json({ success: true, data: events });
    } catch (error: any) {
      logger.error('Discover singles events error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to discover singles events',
      });
    }
  }

  // Feature 8: Premium Feature Upsell Moments
  async detectUpsellMoment(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, eventType } = req.body;

      if (!userId || !eventType) {
        return res.status(400).json({
          success: false,
          message: 'User ID and event type are required',
        });
      }

      const upsell = await innovationsService.detectUpsellMoment(userId, eventType);
      return res.status(200).json({ success: true, data: upsell });
    } catch (error: any) {
      logger.error('Detect upsell moment error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to detect upsell moment',
      });
    }
  }

  // Feature 9: Date Night Planning Partner Ads
  async getDateNightPlanning(req: Request, res: Response): Promise<Response> {
    try {
      const planning = await innovationsService.getDateNightPlanning();
      return res.status(200).json({ success: true, data: planning });
    } catch (error: any) {
      logger.error('Get date night planning error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get date night planning',
      });
    }
  }

  // Feature 10: Influencer Dating Tips Integration
  async getInfluencerContent(req: Request, res: Response): Promise<Response> {
    try {
      const content = await innovationsService.getInfluencerContent();
      return res.status(200).json({ success: true, data: content });
    } catch (error: any) {
      logger.error('Get influencer content error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get influencer content',
      });
    }
  }
}

export const innovationsController = new InnovationsController();
