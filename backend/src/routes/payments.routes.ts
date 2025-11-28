/**
 * Payment Routes
 * Comprehensive API for multi-provider payment system
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PaymentService } from '../services/payments/PaymentService';
import { PaymentProvider } from '../services/payments/types';

const router = Router();

// Validation schemas
const CreateCheckoutSchema = z.object({
  provider: z.enum(['stripe', 'paypal', 'flutterwave', 'paystack']),
  productId: z.string(),
  productType: z.enum(['subscription', 'coins', 'boost', 'super_like']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.any()).optional(),
});

const ValidateReceiptSchema = z.object({
  provider: z.enum(['apple_iap', 'google_play']),
  receipt: z.string(), // Base64 for Apple, purchase token for Google
  productId: z.string(),
  transactionId: z.string().optional(),
  packageName: z.string().optional(), // Required for Google
});

const CreatePaymentIntentSchema = z.object({
  provider: z.enum(['stripe', 'paypal', 'flutterwave', 'paystack']),
  amount: z.number().positive(),
  currency: z.string().length(3),
  productId: z.string().optional(),
  productType: z.enum(['subscription', 'coins', 'boost', 'super_like']).optional(),
  paymentMethodId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const MobileMoneySchema = z.object({
  provider: z.enum(['flutterwave', 'paystack']),
  amount: z.number().positive(),
  currency: z.string().length(3),
  phoneNumber: z.string(),
  network: z.string().optional(), // MTN, VODAFONE, etc.
  productId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const BankTransferSchema = z.object({
  provider: z.enum(['flutterwave', 'paystack']),
  amount: z.number().positive(),
  currency: z.string().length(3),
  email: z.string().email(),
  productId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const CancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
  cancelImmediately: z.boolean().optional().default(false),
});

// Initialize payment service
let paymentService: PaymentService;

export function initializePaymentRoutes(pool: Pool): Router {
  paymentService = new PaymentService(pool);
  return router;
}

// ==================== Checkout Routes ====================

/**
 * Create a checkout session (hosted payment page)
 * POST /api/payments/checkout
 */
router.post('/checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validation = CreateCheckoutSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const { provider, productId, productType, successUrl, cancelUrl, metadata } = validation.data;
    const userId = req.user!.id;

    const session = await paymentService.createCheckoutSession({
      userId,
      provider: provider as PaymentProvider,
      productId,
      productType,
      successUrl,
      cancelUrl,
      metadata,
    });

    return res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      provider,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Create a payment intent (for embedded checkout)
 * POST /api/payments/intent
 */
router.post('/intent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validation = CreatePaymentIntentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const { provider, amount, currency, productId, productType, paymentMethodId, metadata } = validation.data;
    const userId = req.user!.id;

    const intent = await paymentService.createPaymentIntent({
      userId,
      provider: provider as PaymentProvider,
      amount,
      currency,
      productId,
      productType,
      paymentMethodId,
      metadata,
    });

    return res.json({
      success: true,
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.id,
      provider,
    });
  } catch (error: any) {
    console.error('Payment intent error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Confirm a payment
 * POST /api/payments/confirm
 */
router.post('/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentIntentId, provider, paymentMethodId } = req.body;

    if (!paymentIntentId || !provider) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await paymentService.confirmPayment({
      provider: provider as PaymentProvider,
      paymentIntentId,
      paymentMethodId,
    });

    return res.json({
      success: true,
      status: result.status,
      transactionId: result.transactionId,
    });
  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== IAP Routes (Mobile) ====================

/**
 * Validate in-app purchase receipt (Apple/Google)
 * POST /api/payments/iap/validate
 */
router.post('/iap/validate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validation = ValidateReceiptSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const { provider, receipt, productId, transactionId, packageName } = validation.data;
    const userId = req.user!.id;

    const result = await paymentService.validateIAPReceipt({
      userId,
      provider: provider as PaymentProvider,
      receipt,
      productId,
      transactionId,
      packageName,
    });

    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid receipt',
        errorCode: result.errorCode,
      });
    }

    return res.json({
      success: true,
      isValid: result.isValid,
      productId: result.productId,
      transactionId: result.transactionId,
      expiresDate: result.expiresDate,
      isSubscription: result.isSubscription,
    });
  } catch (error: any) {
    console.error('IAP validation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Restore purchases (Mobile)
 * POST /api/payments/iap/restore
 */
router.post('/iap/restore', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { provider, receipt, packageName } = req.body;
    const userId = req.user!.id;

    if (!provider || !receipt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await paymentService.restorePurchases({
      userId,
      provider: provider as PaymentProvider,
      receipt,
      packageName,
    });

    return res.json({
      success: true,
      restoredPurchases: result.purchases,
      activeSubscription: result.activeSubscription,
    });
  } catch (error: any) {
    console.error('Restore purchases error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== African Payment Methods ====================

/**
 * Initiate mobile money payment
 * POST /api/payments/mobile-money
 */
router.post('/mobile-money', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validation = MobileMoneySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const { provider, amount, currency, phoneNumber, network, productId, metadata } = validation.data;
    const userId = req.user!.id;

    const result = await paymentService.initiateMobileMoneyPayment({
      userId,
      provider: provider as PaymentProvider,
      amount,
      currency,
      phoneNumber,
      network,
      productId,
      metadata,
    });

    return res.json({
      success: true,
      reference: result.reference,
      status: result.status,
      instructions: result.instructions,
      provider,
    });
  } catch (error: any) {
    console.error('Mobile money error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Initiate bank transfer
 * POST /api/payments/bank-transfer
 */
router.post('/bank-transfer', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validation = BankTransferSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const { provider, amount, currency, email, productId, metadata } = validation.data;
    const userId = req.user!.id;

    const result = await paymentService.initiateBankTransfer({
      userId,
      provider: provider as PaymentProvider,
      amount,
      currency,
      email,
      productId,
      metadata,
    });

    return res.json({
      success: true,
      reference: result.reference,
      accountNumber: result.accountNumber,
      bankName: result.bankName,
      accountName: result.accountName,
      expiresAt: result.expiresAt,
      provider,
    });
  } catch (error: any) {
    console.error('Bank transfer error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Initiate USSD payment (Nigeria)
 * POST /api/payments/ussd
 */
router.post('/ussd', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { provider, amount, currency, accountBank, productId, metadata } = req.body;
    const userId = req.user!.id;

    if (!provider || !amount || !currency || !accountBank) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await paymentService.initiateUSSDPayment({
      userId,
      provider: provider as PaymentProvider,
      amount,
      currency,
      accountBank,
      productId,
      metadata,
    });

    return res.json({
      success: true,
      reference: result.reference,
      ussdCode: result.ussdCode,
      paymentCode: result.paymentCode,
      provider,
    });
  } catch (error: any) {
    console.error('USSD payment error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== Subscription Routes ====================

/**
 * Get user's subscription status
 * GET /api/payments/subscription
 */
router.get('/subscription', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscription = await paymentService.getUserSubscription(userId);

    if (!subscription) {
      return res.json({
        success: true,
        hasSubscription: false,
        plan: 'free',
      });
    }

    return res.json({
      success: true,
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        plan: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        provider: subscription.provider,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialEnd: subscription.trialEnd,
      },
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel subscription
 * POST /api/payments/subscription/cancel
 */
router.post('/subscription/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validation = CancelSubscriptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const { reason, cancelImmediately } = validation.data;
    const userId = req.user!.id;

    const result = await paymentService.cancelSubscription({
      userId,
      reason,
      cancelImmediately,
    });

    return res.json({
      success: true,
      canceledAt: result.canceledAt,
      effectiveDate: result.effectiveDate,
      status: result.status,
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Resume paused subscription
 * POST /api/payments/subscription/resume
 */
router.post('/subscription/resume', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await paymentService.resumeSubscription(userId);

    return res.json({
      success: true,
      status: result.status,
      nextBillingDate: result.nextBillingDate,
    });
  } catch (error: any) {
    console.error('Resume subscription error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Update subscription (change plan)
 * POST /api/payments/subscription/update
 */
router.post('/subscription/update', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { newPlanId, prorate } = req.body;
    const userId = req.user!.id;

    if (!newPlanId) {
      return res.status(400).json({ error: 'Missing newPlanId' });
    }

    const result = await paymentService.updateSubscription({
      userId,
      newPlanId,
      prorate: prorate !== false,
    });

    return res.json({
      success: true,
      subscription: result,
    });
  } catch (error: any) {
    console.error('Update subscription error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== Payment Methods Routes ====================

/**
 * Get user's payment methods
 * GET /api/payments/methods
 */
router.get('/methods', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const methods = await paymentService.getPaymentMethods(userId);

    return res.json({
      success: true,
      paymentMethods: methods.map((m: any) => ({
        id: m.id,
        provider: m.provider,
        type: m.type,
        isDefault: m.isDefault,
        cardBrand: m.cardBrand,
        cardLast4: m.cardLast4,
        cardExpMonth: m.cardExpMonth,
        cardExpYear: m.cardExpYear,
        bankName: m.bankName,
        accountLast4: m.accountLast4,
      })),
    });
  } catch (error: any) {
    console.error('Get payment methods error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Add a payment method
 * POST /api/payments/methods
 */
router.post('/methods', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { provider, paymentMethodToken, setAsDefault } = req.body;
    const userId = req.user!.id;

    if (!provider || !paymentMethodToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const method = await paymentService.addPaymentMethod({
      userId,
      provider: provider as PaymentProvider,
      paymentMethodToken,
      setAsDefault: setAsDefault === true,
    });

    return res.json({
      success: true,
      paymentMethod: {
        id: method.id,
        provider: method.provider,
        type: method.type,
        isDefault: method.isDefault,
        cardBrand: method.cardBrand,
        cardLast4: method.cardLast4,
      },
    });
  } catch (error: any) {
    console.error('Add payment method error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a payment method
 * DELETE /api/payments/methods/:id
 */
router.delete('/methods/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await paymentService.deletePaymentMethod({
      userId,
      paymentMethodId: id,
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Delete payment method error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Set default payment method
 * PUT /api/payments/methods/:id/default
 */
router.put('/methods/:id/default', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await paymentService.setDefaultPaymentMethod({
      userId,
      paymentMethodId: id,
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Set default payment method error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== Wallet Routes ====================

/**
 * Get user's wallet balance
 * GET /api/payments/wallet
 */
router.get('/wallet', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wallet = await paymentService.getWallet(userId);

    return res.json({
      success: true,
      wallet: {
        coins: wallet.coins,
        gems: wallet.gems,
        bonusCoins: wallet.bonusCoins,
      },
    });
  } catch (error: any) {
    console.error('Get wallet error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get wallet transaction history
 * GET /api/payments/wallet/transactions
 */
router.get('/wallet/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, offset = 0, type } = req.query;

    const transactions = await paymentService.getWalletTransactions({
      userId,
      limit: Math.min(Number(limit), 100),
      offset: Number(offset),
      type: type as string,
    });

    return res.json({
      success: true,
      transactions: transactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        currencyType: t.currencyType,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Get wallet transactions error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== Product Routes ====================

/**
 * Get available products
 * GET /api/payments/products
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { type, country } = req.query;

    const products = await paymentService.getProducts({
      type: type as string,
      country: country as string,
    });

    return res.json({
      success: true,
      products: products.map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        type: p.type,
        price: p.price,
        currency: p.currency,
        coinAmount: p.coinAmount,
        boostCount: p.boostCount,
        boostDurationMinutes: p.boostDurationMinutes,
        isFeatured: p.isFeatured,
        regionalPrices: p.regionalPrices,
      })),
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get subscription plans
 * GET /api/payments/plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const { country } = req.query;

    const plans = await paymentService.getSubscriptionPlans({
      country: country as string,
    });

    return res.json({
      success: true,
      plans: plans.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        currency: p.currency,
        trialDays: p.trialDays,
        features: p.features,
        dailyLikes: p.dailyLikes,
        dailySuperLikes: p.dailySuperLikes,
        dailyBoosts: p.dailyBoosts,
        seeWhoLikesYou: p.seeWhoLikesYou,
        readReceipts: p.readReceipts,
        priorityLikes: p.priorityLikes,
        incognitoMode: p.incognitoMode,
        advancedFilters: p.advancedFilters,
        travelMode: p.travelMode,
        topPicks: p.topPicks,
        spotlight: p.spotlight,
      })),
    });
  } catch (error: any) {
    console.error('Get plans error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== Transaction History ====================

/**
 * Get user's transaction history
 * GET /api/payments/transactions
 */
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, offset = 0, type, status, provider } = req.query;

    const transactions = await paymentService.getTransactions({
      userId,
      limit: Math.min(Number(limit), 100),
      offset: Number(offset),
      type: type as string,
      status: status as string,
      provider: provider as string,
    });

    return res.json({
      success: true,
      transactions: transactions.map((t: any) => ({
        id: t.id,
        provider: t.provider,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get a single transaction
 * GET /api/payments/transactions/:id
 */
router.get('/transactions/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const transaction = await paymentService.getTransaction({
      userId,
      transactionId: id,
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json({
      success: true,
      transaction,
    });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== Provider Availability ====================

/**
 * Get available payment providers for a country
 * GET /api/payments/providers
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const { country, platform } = req.query;

    const providers = await paymentService.getAvailableProviders({
      country: country as string,
      platform: platform as string,
    });

    return res.json({
      success: true,
      providers: providers.map((p: any) => ({
        id: p.id,
        name: p.name,
        supportedMethods: p.supportedMethods,
        supportedCurrencies: p.supportedCurrencies,
        enabled: p.enabled,
      })),
    });
  } catch (error: any) {
    console.error('Get providers error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Request a refund
 * POST /api/payments/refund
 */
router.post('/refund', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, reason } = req.body;
    const userId = req.user!.id;

    if (!transactionId) {
      return res.status(400).json({ error: 'Missing transactionId' });
    }

    const result = await paymentService.requestRefund({
      userId,
      transactionId,
      reason,
    });

    return res.json({
      success: true,
      refundId: result.refundId,
      status: result.status,
      amount: result.amount,
    });
  } catch (error: any) {
    console.error('Refund error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
