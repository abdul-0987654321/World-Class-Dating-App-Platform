import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SubscriptionService } from '../../domain/services/subscription.service';
import logger from '../../utils/logger';

export class SubscriptionController {
  private subscriptionService: SubscriptionService;

  constructor(subscriptionService?: SubscriptionService) {
    this.subscriptionService = subscriptionService || new SubscriptionService();
  }

  /**
   * Get current user's subscription
   */
  async getCurrentSubscription(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const subscription = await this.subscriptionService.getUserSubscription(userId);

      return res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error: any) {
      logger.error('Get subscription error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription',
      });
    }
  }

  /**
   * Get subscription features
   */
  async getSubscriptionFeatures(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const features = await this.subscriptionService.getUserFeatures(userId);

      return res.status(200).json({
        success: true,
        data: features,
      });
    } catch (error: any) {
      logger.error('Get features error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get features',
      });
    }
  }

  /**
   * Check access to a specific feature
   */
  async checkFeatureAccess(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { featureKey } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const access = await this.subscriptionService.checkFeatureAccess(userId, featureKey);

      return res.status(200).json({
        success: true,
        data: access,
      });
    } catch (error: any) {
      logger.error('Check feature access error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to check feature access',
      });
    }
  }

  /**
   * Update subscription tier
   */
  async updateTier(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { tier } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!tier || !['free', 'basic', 'mid', 'ultra'].includes(tier)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier specified',
        });
      }

      const subscription = await this.subscriptionService.updateSubscriptionTier(userId, tier);

      return res.status(200).json({
        success: true,
        message: 'Subscription tier updated successfully',
        data: subscription,
      });
    } catch (error: any) {
      logger.error('Update tier error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update subscription tier',
      });
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { immediately } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const subscription = await this.subscriptionService.cancelSubscription(
        userId,
        immediately === true
      );

      return res.status(200).json({
        success: true,
        message: immediately
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at the end of the billing period',
        data: subscription,
      });
    } catch (error: any) {
      logger.error('Cancel subscription error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel subscription',
      });
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const subscription = await this.subscriptionService.reactivateSubscription(userId);

      return res.status(200).json({
        success: true,
        message: 'Subscription reactivated successfully',
        data: subscription,
      });
    } catch (error: any) {
      logger.error('Reactivate subscription error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to reactivate subscription',
      });
    }
  }
}

export default new SubscriptionController();
