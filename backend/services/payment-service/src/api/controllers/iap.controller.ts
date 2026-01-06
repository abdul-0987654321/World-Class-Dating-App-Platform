/**
 * In-App Purchase (IAP) Controller
 * Handles Apple and Google Play purchase validation
 */

import { Request, Response } from 'express';

import AppleIAPService from '../../domain/services/apple-iap.service';
import GooglePlayService from '../../domain/services/google-play.service';
import { NotificationServiceClient } from '../../infrastructure/clients/notification-service.client';
import { UserServiceClient } from '../../infrastructure/clients/user-service.client';
import logger from '../../utils/logger';

export class IAPController {
  private appleIAPService: typeof AppleIAPService;
  private googlePlayService: typeof GooglePlayService;
  private userServiceClient: UserServiceClient;
  private notificationServiceClient: NotificationServiceClient;

  constructor() {
    this.appleIAPService = AppleIAPService;
    this.googlePlayService = GooglePlayService;
    this.userServiceClient = new UserServiceClient();
    this.notificationServiceClient = new NotificationServiceClient();
  }

  /**
   * Validate IAP receipt (Apple or Google Play)
   */
  async validateReceipt(req: Request, res: Response): Promise<Response> {
    try {
      const { provider, receipt, productId, transactionId, purchaseToken, packageName } = req.body;
      const userId = (req as any).userId; // From auth middleware

      if (!provider || !receipt) {
        return res.status(400).json({
          success: false,
          message: 'Provider and receipt are required',
        });
      }

      let validationResult: any;
      let tier: string | null = null;
      let consumableProduct: any = null;

      // Validate based on provider
      if (provider === 'apple_iap') {
        validationResult = await this.appleIAPService.validateReceipt(receipt);

        if (validationResult.isValid) {
          // Check if it's a subscription or consumable
          if (validationResult.expiresDate) {
            // Subscription
            tier = this.appleIAPService.mapProductIdToTier(validationResult.productId);
            await this.updateUserSubscription(
              userId,
              tier,
              provider,
              validationResult.transactionId,
              validationResult.expiresDate,
              validationResult.autoRenewStatus || false
            );
          } else {
            // Consumable
            consumableProduct = this.appleIAPService.parseConsumableProduct(
              validationResult.productId
            );
            await this.addConsumableToUser(
              userId,
              consumableProduct.type,
              consumableProduct.amount,
              validationResult.transactionId,
              provider
            );
          }
        }
      } else if (provider === 'google_play') {
        if (!productId || !purchaseToken) {
          return res.status(400).json({
            success: false,
            message: 'Product ID and purchase token are required for Google Play',
          });
        }

        // Try as subscription first
        validationResult = await this.googlePlayService.validateSubscription(
          productId,
          purchaseToken
        );

        if (validationResult.isValid && validationResult.expiryTime) {
          // It's a subscription
          tier = this.googlePlayService.mapProductIdToTier(productId);

          // Acknowledge subscription if needed
          await this.googlePlayService.acknowledgeSubscription(productId, purchaseToken);

          await this.updateUserSubscription(
            userId,
            tier,
            provider,
            validationResult.orderId,
            validationResult.expiryTime,
            validationResult.autoRenewing || false
          );
        } else {
          // Try as product (consumable)
          validationResult = await this.googlePlayService.validateProduct(productId, purchaseToken);

          if (validationResult.isValid) {
            // Acknowledge purchase
            await this.googlePlayService.acknowledgePurchase(productId, purchaseToken);

            consumableProduct = this.googlePlayService.parseConsumableProduct(productId);
            await this.addConsumableToUser(
              userId,
              consumableProduct.type,
              consumableProduct.amount,
              validationResult.orderId,
              provider
            );
          }
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid provider. Must be apple_iap or google_play',
        });
      }

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Receipt validation failed',
          data: validationResult,
        });
      }

      logger.info(`IAP receipt validated successfully for user ${userId}`, {
        provider,
        tier,
        consumableProduct,
      });

      return res.status(200).json({
        success: true,
        isValid: true,
        message: 'Receipt validated successfully',
        data: {
          tier,
          consumableProduct,
          validationResult,
        },
      });
    } catch (error) {
      logger.error('IAP validation error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to validate receipt',
      });
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(req: Request, res: Response): Promise<Response> {
    try {
      const { provider, receipt, packageName } = req.body;
      const userId = (req as any).userId;

      if (!provider || !receipt) {
        return res.status(400).json({
          success: false,
          message: 'Provider and receipt are required',
        });
      }

      let restoredSubscription: any = null;

      if (provider === 'apple_iap') {
        const subscription = await this.appleIAPService.getActiveSubscription(receipt);

        if (subscription) {
          const tier = this.appleIAPService.mapProductIdToTier(subscription.productId);

          await this.updateUserSubscription(
            userId,
            tier,
            provider,
            subscription.transactionId,
            subscription.expiresDate,
            subscription.willAutoRenew
          );

          restoredSubscription = {
            tier,
            expiresDate: subscription.expiresDate,
            willAutoRenew: subscription.willAutoRenew,
          };
        }
      } else if (provider === 'google_play') {
        // Google Play restore is handled differently
        // Typically, the app would query for all purchases and validate each one
        logger.info(
          'Google Play restore requested - app should query purchases from Google Play SDK'
        );
      }

      return res.status(200).json({
        success: true,
        message: restoredSubscription
          ? 'Purchases restored successfully'
          : 'No active purchases found',
        data: {
          subscription: restoredSubscription,
        },
      });
    } catch (error) {
      logger.error('Restore purchases error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to restore purchases',
      });
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).userId;

      // Get subscription from user service
      const subscription = await this.userServiceClient.getSubscription(userId);

      return res.status(200).json({
        success: true,
        hasSubscription: subscription.tier !== 'free',
        data: {
          subscription,
        },
      });
    } catch (error) {
      logger.error('Get subscription status error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription status',
      });
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // This would query from a transactions table
      // For now, return placeholder
      const transactions: any[] = [];

      return res.status(200).json({
        success: true,
        data: {
          transactions,
          total: transactions.length,
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Get transaction history error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get transaction history',
      });
    }
  }

  /**
   * Get wallet balance
   */
  async getWallet(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).userId;

      const wallet = await this.userServiceClient.getWallet(userId);

      return res.status(200).json({
        success: true,
        data: {
          wallet,
        },
      });
    } catch (error) {
      logger.error('Get wallet error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get wallet',
      });
    }
  }

  /**
   * Helper: Update user subscription
   */
  private async updateUserSubscription(
    userId: string,
    tier: string,
    provider: string,
    transactionId: string,
    expiresDate: Date,
    autoRenew: boolean
  ): Promise<void> {
    try {
      await this.userServiceClient.updateSubscription({
        userId,
        tier: this.userServiceClient.mapTierName(tier),
        status: 'active',
        currentPeriodEnd: expiresDate,
        provider,
        providerSubscriptionId: transactionId,
      });

      await this.notificationServiceClient.sendNotification({
        userId,
        type: 'subscription_updated',
        title: 'Subscription Activated',
        body: `Your ${tier} subscription has been activated!`,
      });

      logger.info(`Updated subscription for user ${userId}: ${tier}`);
    } catch (error) {
      logger.error('Failed to update user subscription:', error);
      throw error;
    }
  }

  /**
   * Helper: Add consumable to user
   */
  private async addConsumableToUser(
    userId: string,
    type: string,
    amount: number,
    transactionId: string,
    provider: string
  ): Promise<void> {
    try {
      if (type === 'coins') {
        await this.userServiceClient.addCoins({
          userId,
          amount,
          transactionType: 'iap_purchase',
          iapTransactionId: transactionId,
          provider,
        });

        await this.notificationServiceClient.sendNotification({
          userId,
          type: 'payment_success',
          title: 'Coins Added',
          body: `${amount} coins have been added to your account!`,
        });
      } else if (type === 'boost') {
        await this.userServiceClient.addBoosts({
          userId,
          amount,
          transactionId,
          provider,
        });

        await this.notificationServiceClient.sendNotification({
          userId,
          type: 'payment_success',
          title: 'Boosts Added',
          body: `${amount} boost(s) have been added to your account!`,
        });
      } else if (type === 'superlike') {
        await this.userServiceClient.addSuperLikes({
          userId,
          amount,
          transactionId,
          provider,
        });

        await this.notificationServiceClient.sendNotification({
          userId,
          type: 'payment_success',
          title: 'Super Likes Added',
          body: `${amount} super like(s) have been added to your account!`,
        });
      }

      logger.info(`Added ${amount} ${type} to user ${userId}`);
    } catch (error) {
      logger.error('Failed to add consumable to user:', error);
      throw error;
    }
  }
}

export default new IAPController();
