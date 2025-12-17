import { Request, Response } from 'express';
import { trackingService } from '../../domain/services/tracking.service';
import logger from '../../utils/logger';

export class TrackingController {
  /**
   * Track ad impression
   */
  async trackImpression(req: Request, res: Response): Promise<Response> {
    try {
      const { impressionToken } = req.params;
      const { ad_id, campaign_id, user_id, metadata } = req.body;

      if (!impressionToken || !ad_id || !campaign_id || !user_id) {
        return res.status(400).json({
          success: false,
          message: 'Impression token, ad ID, campaign ID, and user ID are required',
        });
      }

      // Add request metadata
      const enrichedMetadata = {
        ...metadata,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip || req.socket.remoteAddress,
      };

      const impression = await trackingService.trackImpression(
        impressionToken,
        ad_id,
        campaign_id,
        user_id,
        enrichedMetadata
      );

      return res.status(200).json({ success: true, data: impression });
    } catch (error: any) {
      logger.error('Track impression error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to track impression',
      });
    }
  }

  /**
   * Track ad click
   */
  async trackClick(req: Request, res: Response): Promise<Response> {
    try {
      const { impressionToken } = req.params;
      const { ad_id, campaign_id, user_id, metadata } = req.body;

      if (!impressionToken || !ad_id || !campaign_id || !user_id) {
        return res.status(400).json({
          success: false,
          message: 'Impression token, ad ID, campaign ID, and user ID are required',
        });
      }

      // Add request metadata
      const enrichedMetadata = {
        ...metadata,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip || req.socket.remoteAddress,
        referrer: req.headers['referer'] || req.headers['referrer'],
      };

      const click = await trackingService.trackClick(
        impressionToken,
        ad_id,
        campaign_id,
        user_id,
        enrichedMetadata
      );

      return res.status(200).json({ success: true, data: click });
    } catch (error: any) {
      logger.error('Track click error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to track click',
      });
    }
  }

  /**
   * Track conversion
   */
  async trackConversion(req: Request, res: Response): Promise<Response> {
    try {
      const { clickToken } = req.params;
      const { ad_id, campaign_id, user_id, conversion_type, conversion_value, metadata } = req.body;

      if (!clickToken || !ad_id || !campaign_id || !user_id || !conversion_type) {
        return res.status(400).json({
          success: false,
          message: 'Click token, ad ID, campaign ID, user ID, and conversion type are required',
        });
      }

      const conversion = await trackingService.trackConversion(
        clickToken,
        ad_id,
        campaign_id,
        user_id,
        conversion_type,
        conversion_value,
        metadata
      );

      return res.status(200).json({ success: true, data: conversion });
    } catch (error: any) {
      logger.error('Track conversion error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to track conversion',
      });
    }
  }

  /**
   * Get ad statistics
   */
  async getAdStats(req: Request, res: Response): Promise<Response> {
    try {
      const { adId } = req.params;
      const { start_date, end_date } = req.query;

      if (!adId) {
        return res.status(400).json({
          success: false,
          message: 'Ad ID is required',
        });
      }

      const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      const stats = await trackingService.getAdStats(adId, startDate, endDate);
      return res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      logger.error('Get ad stats error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get ad stats',
      });
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;
      const { start_date, end_date } = req.query;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
        });
      }

      const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      const stats = await trackingService.getCampaignStats(campaignId, startDate, endDate);
      return res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      logger.error('Get campaign stats error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get campaign stats',
      });
    }
  }

  /**
   * Get hourly breakdown
   */
  async getHourlyBreakdown(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;
      const { date } = req.query;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
        });
      }

      const targetDate = date ? new Date(date as string) : new Date();
      const breakdown = await trackingService.getHourlyBreakdown(campaignId, targetDate);

      return res.status(200).json({ success: true, data: breakdown });
    } catch (error: any) {
      logger.error('Get hourly breakdown error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get hourly breakdown',
      });
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const metrics = await trackingService.getUserEngagementMetrics(userId);
      return res.status(200).json({ success: true, data: metrics });
    } catch (error: any) {
      logger.error('Get user engagement metrics error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user engagement metrics',
      });
    }
  }

  /**
   * Detect fraud
   */
  async detectFraud(req: Request, res: Response): Promise<Response> {
    try {
      const { ad_id, user_id } = req.body;

      if (!ad_id || !user_id) {
        return res.status(400).json({
          success: false,
          message: 'Ad ID and user ID are required',
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const fraudCheck = await trackingService.detectFraud(ad_id, user_id, ipAddress, userAgent);
      return res.status(200).json({ success: true, data: fraudCheck });
    } catch (error: any) {
      logger.error('Detect fraud error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to detect fraud',
      });
    }
  }
}

export const trackingController = new TrackingController();
