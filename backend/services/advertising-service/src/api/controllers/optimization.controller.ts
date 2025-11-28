import { Request, Response } from 'express';
import { optimizationService } from '../../domain/services/optimization.service';
import logger from '../../utils/logger';

export class OptimizationController {
  // Feature 1: Match Prediction for Ad Timing
  async predictMatchTiming(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const timing = await optimizationService.predictMatchTiming(userId);
      return res.status(200).json({ success: true, data: timing });
    } catch (error: any) {
      logger.error('Predict match timing error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to predict match timing',
      });
    }
  }

  // Feature 2: Engagement-Based Bid Optimization
  async optimizeBids(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
        });
      }

      const bids = await optimizationService.optimizeBids(campaignId);
      return res.status(200).json({ success: true, data: bids });
    } catch (error: any) {
      logger.error('Optimize bids error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to optimize bids',
      });
    }
  }

  // Feature 3: Cross-Platform Attribution for Dating Conversions
  async attributeConversion(req: Request, res: Response): Promise<Response> {
    try {
      const { conversionId } = req.params;

      if (!conversionId) {
        return res.status(400).json({
          success: false,
          message: 'Conversion ID is required',
        });
      }

      const attribution = await optimizationService.attributeConversion(conversionId);
      return res.status(200).json({ success: true, data: attribution });
    } catch (error: any) {
      logger.error('Attribute conversion error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to attribute conversion',
      });
    }
  }

  // Feature 4: Real-Time Budget Pacing
  async getBudgetPacing(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
        });
      }

      const pacing = await optimizationService.getBudgetPacing(campaignId);
      return res.status(200).json({ success: true, data: pacing });
    } catch (error: any) {
      logger.error('Get budget pacing error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get budget pacing',
      });
    }
  }

  // Feature 5: Seasonal Dating Trend Optimization
  async optimizeForSeasons(req: Request, res: Response): Promise<Response> {
    try {
      const trends = await optimizationService.optimizeForSeasons();
      return res.status(200).json({ success: true, data: trends });
    } catch (error: any) {
      logger.error('Optimize for seasons error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to optimize for seasons',
      });
    }
  }

  // Feature 6: Device-Specific Ad Optimization
  async optimizeForDevice(req: Request, res: Response): Promise<Response> {
    try {
      const { deviceType } = req.params;
      const validDevices = ['mobile', 'tablet', 'desktop'];

      if (!deviceType || !validDevices.includes(deviceType)) {
        return res.status(400).json({
          success: false,
          message: 'Valid device type (mobile, tablet, desktop) is required',
        });
      }

      const optimization = await optimizationService.optimizeForDevice(deviceType);
      return res.status(200).json({ success: true, data: optimization });
    } catch (error: any) {
      logger.error('Optimize for device error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to optimize for device',
      });
    }
  }

  // Feature 7: Frequency Capping Intelligence
  async manageFrequencyCapping(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
        });
      }

      const capping = await optimizationService.manageFrequencyCapping(campaignId);
      return res.status(200).json({ success: true, data: capping });
    } catch (error: any) {
      logger.error('Manage frequency capping error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to manage frequency capping',
      });
    }
  }

  // Feature 8: Conversion Path Analysis
  async analyzeConversionPaths(req: Request, res: Response): Promise<Response> {
    try {
      const paths = await optimizationService.analyzeConversionPaths();
      return res.status(200).json({ success: true, data: paths });
    } catch (error: any) {
      logger.error('Analyze conversion paths error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to analyze conversion paths',
      });
    }
  }

  // Feature 9: Predictive LTV Optimization
  async predictLTV(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const ltv = await optimizationService.predictLTV(userId);
      return res.status(200).json({ success: true, data: ltv });
    } catch (error: any) {
      logger.error('Predict LTV error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to predict LTV',
      });
    }
  }

  // Feature 10: Multi-Touch Attribution Modeling
  async calculateMultiTouchAttribution(req: Request, res: Response): Promise<Response> {
    try {
      const mta = await optimizationService.calculateMultiTouchAttribution();
      return res.status(200).json({ success: true, data: mta });
    } catch (error: any) {
      logger.error('Calculate multi-touch attribution error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate multi-touch attribution',
      });
    }
  }
}

export const optimizationController = new OptimizationController();
