import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ReferralService } from '../../domain/services/referral.service';
import logger from '../../utils/logger';

export class ReferralController {
  private referralService: ReferralService;

  constructor(referralService?: ReferralService) {
    this.referralService = referralService || new ReferralService();
  }

  /**
   * Generate a referral code for the authenticated user
   * POST /api/v1/referrals/generate
   */
  async generateCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const result = await this.referralService.generateCode(userId);

      return res.status(200).json({
        success: true,
        message: 'Referral code generated successfully',
        data: {
          code: result.code.code,
          maxUses: result.code.maxUses,
          currentUses: result.code.currentUses,
          expiresAt: result.code.expiresAt,
          shareUrl: result.shareUrl,
        },
      });
    } catch (error: any) {
      logger.error('Generate referral code error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate referral code',
      });
    }
  }

  /**
   * Apply a referral code during signup
   * POST /api/v1/referrals/apply
   */
  async applyCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Referral code is required',
        });
      }

      const result = await this.referralService.applyCode(code, userId);

      return res.status(200).json({
        success: true,
        message: 'Referral code applied successfully',
        data: {
          referralId: result.referral.id,
          rewards: result.referredReward,
        },
      });
    } catch (error: any) {
      logger.error('Apply referral code error:', error);

      const statusCode = error.message.includes('Invalid') || error.message.includes('already')
        ? 400
        : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to apply referral code',
      });
    }
  }

  /**
   * Get referral statistics for the authenticated user
   * GET /api/v1/referrals/stats
   */
  async getStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const stats = await this.referralService.getStats(userId);

      return res.status(200).json({
        success: true,
        data: {
          totalReferrals: stats.totalReferrals,
          pendingReferrals: stats.pendingReferrals,
          completedReferrals: stats.completedReferrals,
          rewardedReferrals: stats.rewardedReferrals,
          totalCoinsEarned: stats.totalCoinsEarned,
          totalPremiumDaysEarned: stats.totalPremiumDaysEarned,
          activeCode: stats.activeCode
            ? {
                code: stats.activeCode.code,
                maxUses: stats.activeCode.maxUses,
                currentUses: stats.activeCode.currentUses,
                expiresAt: stats.activeCode.expiresAt,
              }
            : null,
          shareUrl: stats.shareUrl || null,
        },
      });
    } catch (error: any) {
      logger.error('Get referral stats error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get referral statistics',
      });
    }
  }

  /**
   * Validate a referral code without applying it
   * POST /api/v1/referrals/validate
   */
  async validateCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Referral code is required',
        });
      }

      const result = await this.referralService.validateCode(code);

      return res.status(200).json({
        success: true,
        data: {
          valid: result.valid,
          message: result.message,
        },
      });
    } catch (error: any) {
      logger.error('Validate referral code error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to validate referral code',
      });
    }
  }

  /**
   * Get all referrals made by the authenticated user
   * GET /api/v1/referrals
   */
  async getReferrals(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const referrals = await this.referralService.getReferralsByUser(userId);

      return res.status(200).json({
        success: true,
        data: referrals.map((referral) => ({
          id: referral.id,
          referredId: referral.referredId,
          code: referral.code,
          status: referral.status,
          createdAt: referral.createdAt,
          completedAt: referral.completedAt,
        })),
      });
    } catch (error: any) {
      logger.error('Get referrals error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get referrals',
      });
    }
  }

  /**
   * Check if the authenticated user was referred
   * GET /api/v1/referrals/my-referral
   */
  async getMyReferral(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const referral = await this.referralService.getReferralForUser(userId);

      if (!referral) {
        return res.status(200).json({
          success: true,
          data: {
            wasReferred: false,
            referral: null,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          wasReferred: true,
          referral: {
            id: referral.id,
            referrerId: referral.referrerId,
            code: referral.code,
            status: referral.status,
            createdAt: referral.createdAt,
            completedAt: referral.completedAt,
          },
        },
      });
    } catch (error: any) {
      logger.error('Get my referral error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get referral information',
      });
    }
  }
}

export default new ReferralController();
