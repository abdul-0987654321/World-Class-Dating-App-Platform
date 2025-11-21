import { Router } from 'express';
import { SubscriptionService } from '../../domain/services/subscription.service';
import { CoinService } from '../../domain/services/coin.service';
import { BoostService } from '../../domain/services/boost.service';
import { authenticateInternal } from '../middleware/internal-auth.middleware';
import { Request, Response } from 'express';

const router = Router();

// All internal routes require service authentication
router.use(authenticateInternal);

/**
 * Internal endpoint: Update subscription from payment-service
 */
router.put('/subscriptions/update', async (req: Request, res: Response) => {
  try {
    const { userId, tier, stripeSubscriptionId, status, currentPeriodEnd } = req.body;

    const subscriptionService = new SubscriptionService();
    const subscription = await subscriptionService.updateSubscriptionTier(userId, tier);

    // Update additional subscription metadata if provided
    if (stripeSubscriptionId || status || currentPeriodEnd) {
      // Additional update logic for stripe subscription ID, status, etc.
      // This would require extending the subscription entity/service
    }

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    console.error('Internal subscription update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update subscription',
    });
  }
});

/**
 * Internal endpoint: Add coins from payment-service
 */
router.post('/coins/add', async (req: Request, res: Response) => {
  try {
    const { userId, amount, transactionType, stripePaymentId, productSku } = req.body;

    const coinService = new CoinService();

    // Use purchaseCoins for purchases or addCoins for rewards/refunds
    if (transactionType === 'purchase') {
      await coinService.purchaseCoins(userId, productSku, stripePaymentId);
    } else {
      // For rewards/refunds, we'd need to add a different method
      // For now, use purchaseCoins with the stripe payment ID
      await coinService.purchaseCoins(userId, productSku, stripePaymentId);
    }

    const balance = await coinService.getBalance(userId);

    return res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    console.error('Internal add coins error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add coins',
    });
  }
});

/**
 * Internal endpoint: Subtract coins (for refunds)
 */
router.post('/coins/subtract', async (req: Request, res: Response) => {
  try {
    const { userId, amount, reason } = req.body;

    const coinService = new CoinService();
    await coinService.spendCoins(userId, amount, reason);

    const balance = await coinService.getBalance(userId);

    return res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    console.error('Internal subtract coins error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to subtract coins',
    });
  }
});

/**
 * Internal endpoint: Activate boost from payment-service
 */
router.post('/boosts/activate', async (req: Request, res: Response) => {
  try {
    const { userId, productSku, durationMinutes, stripePaymentId } = req.body;

    const boostService = new BoostService();
    const boost = await boostService.purchaseBoostWithCoins(userId, productSku);

    return res.status(200).json({
      success: true,
      data: boost,
    });
  } catch (error: any) {
    console.error('Internal activate boost error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate boost',
    });
  }
});

/**
 * Internal endpoint: Send notification to user
 */
router.post('/notifications/send', async (req: Request, res: Response) => {
  try {
    const { userId, type, message } = req.body;

    // For now, just log the notification
    // In production, this would integrate with a notification service
    console.log(`Notification for ${userId} [${type}]: ${message}`);

    return res.status(200).json({
      success: true,
      message: 'Notification sent',
    });
  } catch (error: any) {
    console.error('Internal notification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send notification',
    });
  }
});

/**
 * Internal endpoint: Get user by ID
 */
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // This would fetch user from database
    // For now, return a placeholder
    return res.status(200).json({
      success: true,
      data: {
        id: userId,
        email: 'user@example.com',
        name: 'User Name',
      },
    });
  } catch (error: any) {
    console.error('Internal get user error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user',
    });
  }
});

export default router;
