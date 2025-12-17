import { Request, Response } from 'express';
import { adServingService } from '../../domain/services/ad-serving.service';
import logger from '../../utils/logger';

export class AdServingController {
  /**
   * Serve ads based on user context and placement
   */
  async serveAds(req: Request, res: Response): Promise<Response> {
    try {
      const adRequest = req.body;

      if (!adRequest.user_id || !adRequest.placement || !adRequest.user_context) {
        return res.status(400).json({
          success: false,
          message: 'User ID, placement, and user context are required',
        });
      }

      const response = await adServingService.serveAds(adRequest);
      return res.status(200).json({ success: true, data: response });
    } catch (error: any) {
      logger.error('Serve ads error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to serve ads',
      });
    }
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(req: Request, res: Response): Promise<Response> {
    try {
      const campaigns = await adServingService.getActiveCampaigns();
      return res.status(200).json({ success: true, data: campaigns });
    } catch (error: any) {
      logger.error('Get active campaigns error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get active campaigns',
      });
    }
  }

  /**
   * Get ad by ID
   */
  async getAdById(req: Request, res: Response): Promise<Response> {
    try {
      const { adId } = req.params;

      if (!adId) {
        return res.status(400).json({
          success: false,
          message: 'Ad ID is required',
        });
      }

      const ad = await adServingService.getAdById(adId);

      if (!ad) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found',
        });
      }

      return res.status(200).json({ success: true, data: ad });
    } catch (error: any) {
      logger.error('Get ad by ID error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get ad',
      });
    }
  }

  /**
   * Create a new campaign
   */
  async createCampaign(req: Request, res: Response): Promise<Response> {
    try {
      const campaignData = req.body;

      if (!campaignData.advertiser_id || !campaignData.name || !campaignData.objective) {
        return res.status(400).json({
          success: false,
          message: 'Advertiser ID, name, and objective are required',
        });
      }

      const campaign = await adServingService.createCampaign(campaignData);
      return res.status(201).json({ success: true, data: campaign });
    } catch (error: any) {
      logger.error('Create campaign error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create campaign',
      });
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;
      const updates = req.body;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
        });
      }

      const campaign = await adServingService.updateCampaign(campaignId, updates);
      return res.status(200).json({ success: true, data: campaign });
    } catch (error: any) {
      logger.error('Update campaign error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update campaign',
      });
    }
  }

  /**
   * Create a new ad
   */
  async createAd(req: Request, res: Response): Promise<Response> {
    try {
      const adData = req.body;

      if (!adData.campaign_id || !adData.title || !adData.cta_text || !adData.cta_url) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID, title, CTA text, and CTA URL are required',
        });
      }

      const ad = await adServingService.createAd(adData);
      return res.status(201).json({ success: true, data: ad });
    } catch (error: any) {
      logger.error('Create ad error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create ad',
      });
    }
  }

  /**
   * Update ad
   */
  async updateAd(req: Request, res: Response): Promise<Response> {
    try {
      const { adId } = req.params;
      const updates = req.body;

      if (!adId) {
        return res.status(400).json({
          success: false,
          message: 'Ad ID is required',
        });
      }

      const ad = await adServingService.updateAd(adId, updates);
      return res.status(200).json({ success: true, data: ad });
    } catch (error: any) {
      logger.error('Update ad error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update ad',
      });
    }
  }
}

export const adServingController = new AdServingController();
