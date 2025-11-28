/**
 * Payment Service
 * Orchestrates all payment providers and provides a unified interface
 */

import { Pool } from 'pg';
import {
  PaymentProvider,
  PaymentMethodType,
  TransactionStatus,
  SubscriptionStatus,
  CoinTransactionType,
} from './types';
import { StripeProvider } from './providers/StripeProvider';
import { PayPalProvider } from './providers/PayPalProvider';
import { FlutterwaveProvider } from './providers/FlutterwaveProvider';
import { PaystackProvider } from './providers/PaystackProvider';
import { AppleIAPProvider } from './providers/AppleIAPProvider';
import { GooglePlayProvider } from './providers/GooglePlayProvider';

interface CheckoutSessionParams {
  userId: string;
  provider: PaymentProvider;
  productId: string;
  productType: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

interface PaymentIntentParams {
  userId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  productId?: string;
  productType?: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

interface IAPValidationParams {
  userId: string;
  provider: PaymentProvider;
  receipt: string;
  productId: string;
  transactionId?: string;
  packageName?: string;
}

interface MobileMoneyParams {
  userId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  phoneNumber: string;
  network?: string;
  productId?: string;
  metadata?: Record<string, any>;
}

interface BankTransferParams {
  userId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  email: string;
  productId?: string;
  metadata?: Record<string, any>;
}

export class PaymentService {
  private pool: Pool;
  private stripeProvider: StripeProvider;
  private paypalProvider: PayPalProvider;
  private flutterwaveProvider: FlutterwaveProvider;
  private paystackProvider: PaystackProvider;
  private appleProvider: AppleIAPProvider;
  private googleProvider: GooglePlayProvider;

  constructor(pool: Pool) {
    this.pool = pool;
    this.stripeProvider = StripeProvider.getInstance();
    this.paypalProvider = PayPalProvider.getInstance();
    this.flutterwaveProvider = FlutterwaveProvider.getInstance();
    this.paystackProvider = PaystackProvider.getInstance();
    this.appleProvider = AppleIAPProvider.getInstance();
    this.googleProvider = GooglePlayProvider.getInstance();
  }

  // ==================== Checkout ====================

  async createCheckoutSession(params: CheckoutSessionParams): Promise<any> {
    const { userId, provider, productId, productType, successUrl, cancelUrl, metadata } = params;

    // Get or create customer for this provider
    const customer = await this.getOrCreateCustomer(userId, provider);

    // Get product details
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const amount = product.price;
    const currency = product.currency || 'USD';

    switch (provider) {
      case PaymentProvider.STRIPE:
        return this.stripeProvider.createCheckoutSession({
          customerId: customer.providerCustomerId,
          priceId: product.stripePriceId || productId,
          successUrl,
          cancelUrl,
          metadata: {
            ...metadata,
            userId,
            productId,
            productType,
          },
        });

      case PaymentProvider.PAYPAL:
        const paypalOrder = await this.paypalProvider.createPaymentIntent({
          amount,
          currency,
          customerId: customer.providerCustomerId,
          metadata: {
            ...metadata,
            userId,
            productId,
            productType,
          },
        });
        return {
          id: paypalOrder.id,
          url: paypalOrder.approvalUrl,
        };

      case PaymentProvider.FLUTTERWAVE:
        return this.flutterwaveProvider.createCheckoutSession({
          customerId: customer.providerCustomerId,
          amount,
          currency,
          successUrl,
          cancelUrl,
          metadata: {
            ...metadata,
            userId,
            productId,
            productType,
          },
        });

      case PaymentProvider.PAYSTACK:
        return this.paystackProvider.createCheckoutSession({
          customerId: customer.providerCustomerId,
          amount,
          currency,
          successUrl,
          cancelUrl,
          metadata: {
            ...metadata,
            userId,
            productId,
            productType,
          },
        });

      default:
        throw new Error(`Unsupported provider for checkout: ${provider}`);
    }
  }

  async createPaymentIntent(params: PaymentIntentParams): Promise<any> {
    const { userId, provider, amount, currency, productId, productType, paymentMethodId, metadata } = params;

    const customer = await this.getOrCreateCustomer(userId, provider);

    switch (provider) {
      case PaymentProvider.STRIPE:
        return this.stripeProvider.createPaymentIntent({
          amount,
          currency,
          customerId: customer.providerCustomerId,
          paymentMethodId,
          metadata: {
            ...metadata,
            userId,
            productId,
            productType,
          },
        });

      case PaymentProvider.PAYPAL:
        return this.paypalProvider.createPaymentIntent({
          amount,
          currency,
          customerId: customer.providerCustomerId,
          metadata: {
            ...metadata,
            userId,
            productId,
            productType,
          },
        });

      case PaymentProvider.FLUTTERWAVE:
        return this.flutterwaveProvider.createPaymentIntent({
          amount,
          currency,
          customerId: customer.providerCustomerId,
          metadata: {
            ...metadata,
            userId,
            productId,
            productType,
          },
        });

      case PaymentProvider.PAYSTACK:
        return this.paystackProvider.createPaymentIntent({
          amount,
          currency,
          customerId: customer.providerCustomerId,
          metadata: {
            ...metadata,
            userId,
            productId,
            productType,
          },
        });

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async confirmPayment(params: {
    provider: PaymentProvider;
    paymentIntentId: string;
    paymentMethodId?: string;
  }): Promise<any> {
    const { provider, paymentIntentId, paymentMethodId } = params;

    switch (provider) {
      case PaymentProvider.STRIPE:
        return this.stripeProvider.confirmPaymentIntent(paymentIntentId, paymentMethodId);

      case PaymentProvider.PAYPAL:
        return this.paypalProvider.captureOrder(paymentIntentId);

      default:
        throw new Error(`Unsupported provider for confirmation: ${provider}`);
    }
  }

  // ==================== IAP (Mobile) ====================

  async validateIAPReceipt(params: IAPValidationParams): Promise<any> {
    const { userId, provider, receipt, productId, transactionId, packageName } = params;

    let result: any;

    switch (provider) {
      case PaymentProvider.APPLE_IAP:
        result = await this.appleProvider.validateReceipt(receipt, false);
        break;

      case PaymentProvider.GOOGLE_PLAY:
        if (!packageName) {
          throw new Error('Package name required for Google Play validation');
        }
        // Try subscription first, then product
        try {
          result = await this.googleProvider.validateSubscription(
            packageName,
            productId,
            receipt
          );
        } catch {
          result = await this.googleProvider.validatePurchase(
            packageName,
            productId,
            receipt
          );
        }
        break;

      default:
        throw new Error(`Unsupported IAP provider: ${provider}`);
    }

    if (result.isValid) {
      // Store the receipt
      await this.storeIAPReceipt({
        userId,
        provider,
        receipt,
        productId,
        transactionId: result.transactionId || transactionId,
        validationResponse: result,
        packageName,
      });

      // Process the purchase (add coins, activate subscription, etc.)
      await this.processIAPPurchase(userId, productId, result);
    }

    return result;
  }

  async restorePurchases(params: {
    userId: string;
    provider: PaymentProvider;
    receipt: string;
    packageName?: string;
  }): Promise<any> {
    const { userId, provider, receipt, packageName } = params;

    let purchases: any[] = [];
    let activeSubscription: any = null;

    switch (provider) {
      case PaymentProvider.APPLE_IAP:
        const appleResult = await this.appleProvider.validateReceipt(receipt, true);
        if (appleResult.isValid && appleResult.latestReceiptInfo) {
          purchases = appleResult.latestReceiptInfo;
          const activeSub = purchases.find((p: any) =>
            new Date(p.expires_date_ms) > new Date()
          );
          if (activeSub) {
            activeSubscription = {
              productId: activeSub.product_id,
              expiresDate: new Date(parseInt(activeSub.expires_date_ms)),
              originalTransactionId: activeSub.original_transaction_id,
            };
          }
        }
        break;

      case PaymentProvider.GOOGLE_PLAY:
        // Google requires individual product validation
        // This would typically be called with purchase tokens from the client
        break;

      default:
        throw new Error(`Unsupported IAP provider: ${provider}`);
    }

    // Sync with database
    for (const purchase of purchases) {
      await this.syncIAPPurchase(userId, provider, purchase);
    }

    if (activeSubscription) {
      await this.activateSubscription(userId, provider, activeSubscription);
    }

    return { purchases, activeSubscription };
  }

  // ==================== African Payment Methods ====================

  async initiateMobileMoneyPayment(params: MobileMoneyParams): Promise<any> {
    const { userId, provider, amount, currency, phoneNumber, network, productId, metadata } = params;

    const customer = await this.getOrCreateCustomer(userId, provider);
    const user = await this.getUserById(userId);
    const txRef = `MM_${userId}_${Date.now()}`;

    switch (provider) {
      case PaymentProvider.FLUTTERWAVE:
        const flwResult = await this.flutterwaveProvider.initiateMobileMoneyPayment({
          amount,
          currency,
          phoneNumber,
          network: network || this.detectMobileNetwork(phoneNumber, currency),
          email: user.email,
          txRef,
          metadata: {
            ...metadata,
            userId,
            productId,
          },
        });

        await this.recordPendingTransaction({
          userId,
          provider,
          providerTransactionId: txRef,
          type: productId ? 'coin_purchase' : 'subscription',
          amount,
          currency,
          metadata: { ...metadata, productId },
        });

        return flwResult;

      case PaymentProvider.PAYSTACK:
        const psResult = await this.paystackProvider.initiateMobileMoneyPayment({
          amount,
          currency,
          phoneNumber,
          network: network || 'MTN',
          email: user.email,
          reference: txRef,
          metadata: {
            ...metadata,
            userId,
            productId,
          },
        });

        await this.recordPendingTransaction({
          userId,
          provider,
          providerTransactionId: txRef,
          type: productId ? 'coin_purchase' : 'subscription',
          amount,
          currency,
          metadata: { ...metadata, productId },
        });

        return psResult;

      default:
        throw new Error(`Unsupported provider for mobile money: ${provider}`);
    }
  }

  async initiateBankTransfer(params: BankTransferParams): Promise<any> {
    const { userId, provider, amount, currency, email, productId, metadata } = params;

    const txRef = `BT_${userId}_${Date.now()}`;

    switch (provider) {
      case PaymentProvider.FLUTTERWAVE:
        const flwResult = await this.flutterwaveProvider.createVirtualAccount({
          amount,
          currency,
          email,
          txRef,
          metadata: {
            ...metadata,
            userId,
            productId,
          },
        });

        await this.recordPendingTransaction({
          userId,
          provider,
          providerTransactionId: txRef,
          type: 'coin_purchase',
          amount,
          currency,
          metadata: { ...metadata, productId },
        });

        return flwResult;

      case PaymentProvider.PAYSTACK:
        // Paystack uses dedicated virtual accounts
        const customer = await this.getOrCreateCustomer(userId, provider);
        const psResult = await this.paystackProvider.createDedicatedVirtualAccount(
          customer.providerCustomerId
        );

        return {
          reference: txRef,
          accountNumber: psResult.accountNumber,
          bankName: psResult.bankName,
          accountName: psResult.accountName,
        };

      default:
        throw new Error(`Unsupported provider for bank transfer: ${provider}`);
    }
  }

  async initiateUSSDPayment(params: {
    userId: string;
    provider: PaymentProvider;
    amount: number;
    currency: string;
    accountBank: string;
    productId?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const { userId, provider, amount, currency, accountBank, productId, metadata } = params;

    if (provider !== PaymentProvider.FLUTTERWAVE) {
      throw new Error('USSD payments only supported via Flutterwave');
    }

    const user = await this.getUserById(userId);
    const txRef = `USSD_${userId}_${Date.now()}`;

    const result = await this.flutterwaveProvider.initiateUSSDPayment({
      amount,
      currency,
      email: user.email,
      phoneNumber: user.phone || '',
      accountBank,
      txRef,
      metadata: {
        ...metadata,
        userId,
        productId,
      },
    });

    await this.recordPendingTransaction({
      userId,
      provider,
      providerTransactionId: txRef,
      type: 'coin_purchase',
      amount,
      currency,
      metadata: { ...metadata, productId },
    });

    return result;
  }

  // ==================== Subscriptions ====================

  async getUserSubscription(userId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT us.*, sp.name as plan_name, sp.features, sp.daily_likes, sp.daily_super_likes
       FROM user_subscriptions us
       LEFT JOIN subscription_plans sp ON us.plan_id = sp.slug
       WHERE us.user_id = $1 AND us.status IN ('active', 'trialing', 'past_due')
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const sub = result.rows[0];
    return {
      id: sub.id,
      planId: sub.plan_id,
      planName: sub.plan_name,
      status: sub.status,
      provider: sub.provider,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialEnd: sub.trial_end,
      features: sub.features,
      dailyLikes: sub.daily_likes,
      dailySuperLikes: sub.daily_super_likes,
    };
  }

  async cancelSubscription(params: {
    userId: string;
    reason?: string;
    cancelImmediately?: boolean;
  }): Promise<any> {
    const { userId, reason, cancelImmediately } = params;

    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    switch (subscription.provider) {
      case PaymentProvider.STRIPE:
        await this.stripeProvider.cancelSubscription(
          subscription.providerSubscriptionId,
          cancelImmediately
        );
        break;

      case PaymentProvider.PAYPAL:
        await this.paypalProvider.cancelSubscription(
          subscription.providerSubscriptionId,
          reason || 'User requested cancellation'
        );
        break;

      case PaymentProvider.PAYSTACK:
        await this.paystackProvider.cancelSubscription(
          subscription.providerSubscriptionId
        );
        break;

      case PaymentProvider.APPLE_IAP:
      case PaymentProvider.GOOGLE_PLAY:
        // IAP cancellations happen through the App Store/Play Store
        // We just update our records
        break;

      default:
        throw new Error(`Unsupported provider: ${subscription.provider}`);
    }

    const now = new Date();
    const effectiveDate = cancelImmediately ? now : subscription.currentPeriodEnd;

    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = $1,
           cancel_at_period_end = $2,
           canceled_at = $3,
           cancellation_reason = $4,
           updated_at = NOW()
       WHERE user_id = $5 AND status IN ('active', 'trialing', 'past_due')`,
      [
        cancelImmediately ? 'cancelled' : 'active',
        !cancelImmediately,
        now,
        reason,
        userId,
      ]
    );

    return {
      canceledAt: now,
      effectiveDate,
      status: cancelImmediately ? 'cancelled' : 'active',
    };
  }

  async resumeSubscription(userId: string): Promise<any> {
    const subscription = await this.pool.query(
      `SELECT * FROM user_subscriptions
       WHERE user_id = $1 AND status = 'paused'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (subscription.rows.length === 0) {
      throw new Error('No paused subscription found');
    }

    const sub = subscription.rows[0];

    switch (sub.provider) {
      case PaymentProvider.STRIPE:
        await this.stripeProvider.resumeSubscription(sub.provider_subscription_id);
        break;

      default:
        throw new Error(`Resume not supported for provider: ${sub.provider}`);
    }

    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'active', updated_at = NOW()
       WHERE id = $1`,
      [sub.id]
    );

    return {
      status: 'active',
      nextBillingDate: sub.current_period_end,
    };
  }

  async updateSubscription(params: {
    userId: string;
    newPlanId: string;
    prorate?: boolean;
  }): Promise<any> {
    const { userId, newPlanId, prorate } = params;

    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = await this.pool.query(
      `SELECT * FROM subscription_plans WHERE slug = $1`,
      [newPlanId]
    );

    if (newPlan.rows.length === 0) {
      throw new Error('Plan not found');
    }

    const plan = newPlan.rows[0];

    switch (subscription.provider) {
      case PaymentProvider.STRIPE:
        await this.stripeProvider.updateSubscription(
          subscription.providerSubscriptionId,
          {
            priceId: plan.stripe_monthly_price_id,
            prorate: prorate !== false,
          }
        );
        break;

      default:
        throw new Error(`Update not supported for provider: ${subscription.provider}`);
    }

    await this.pool.query(
      `UPDATE user_subscriptions
       SET plan_id = $1, plan_name = $2, updated_at = NOW()
       WHERE user_id = $3 AND status IN ('active', 'trialing')`,
      [newPlanId, plan.name, userId]
    );

    return {
      planId: newPlanId,
      planName: plan.name,
    };
  }

  // ==================== Payment Methods ====================

  async getPaymentMethods(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM payment_methods
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async addPaymentMethod(params: {
    userId: string;
    provider: PaymentProvider;
    paymentMethodToken: string;
    setAsDefault?: boolean;
  }): Promise<any> {
    const { userId, provider, paymentMethodToken, setAsDefault } = params;

    const customer = await this.getOrCreateCustomer(userId, provider);
    let paymentMethod: any;

    switch (provider) {
      case PaymentProvider.STRIPE:
        paymentMethod = await this.stripeProvider.attachPaymentMethod(
          paymentMethodToken,
          customer.providerCustomerId
        );
        break;

      default:
        throw new Error(`Add payment method not supported for: ${provider}`);
    }

    // If setting as default, unset others first
    if (setAsDefault) {
      await this.pool.query(
        `UPDATE payment_methods SET is_default = false WHERE user_id = $1`,
        [userId]
      );
    }

    const result = await this.pool.query(
      `INSERT INTO payment_methods
       (user_id, payment_customer_id, provider, provider_payment_method_id, type,
        is_default, card_brand, card_last4, card_exp_month, card_exp_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        customer.id,
        provider,
        paymentMethod.id,
        paymentMethod.type || 'card',
        setAsDefault || false,
        paymentMethod.card?.brand,
        paymentMethod.card?.last4,
        paymentMethod.card?.exp_month,
        paymentMethod.card?.exp_year,
      ]
    );

    return result.rows[0];
  }

  async deletePaymentMethod(params: {
    userId: string;
    paymentMethodId: string;
  }): Promise<void> {
    const { userId, paymentMethodId } = params;

    const method = await this.pool.query(
      `SELECT * FROM payment_methods WHERE id = $1 AND user_id = $2`,
      [paymentMethodId, userId]
    );

    if (method.rows.length === 0) {
      throw new Error('Payment method not found');
    }

    const pm = method.rows[0];

    switch (pm.provider) {
      case PaymentProvider.STRIPE:
        await this.stripeProvider.detachPaymentMethod(pm.provider_payment_method_id);
        break;
    }

    await this.pool.query(
      `DELETE FROM payment_methods WHERE id = $1`,
      [paymentMethodId]
    );
  }

  async setDefaultPaymentMethod(params: {
    userId: string;
    paymentMethodId: string;
  }): Promise<void> {
    const { userId, paymentMethodId } = params;

    await this.pool.query(
      `UPDATE payment_methods SET is_default = false WHERE user_id = $1`,
      [userId]
    );

    await this.pool.query(
      `UPDATE payment_methods SET is_default = true WHERE id = $1 AND user_id = $2`,
      [paymentMethodId, userId]
    );
  }

  // ==================== Wallet ====================

  async getWallet(userId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT * FROM user_wallets WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create wallet if doesn't exist
      const newWallet = await this.pool.query(
        `INSERT INTO user_wallets (user_id, coins, gems, bonus_coins)
         VALUES ($1, 0, 0, 0)
         RETURNING *`,
        [userId]
      );
      return newWallet.rows[0];
    }

    return result.rows[0];
  }

  async getWalletTransactions(params: {
    userId: string;
    limit: number;
    offset: number;
    type?: string;
  }): Promise<any[]> {
    const { userId, limit, offset, type } = params;

    let query = `
      SELECT * FROM wallet_transactions
      WHERE user_id = $1
    `;
    const values: any[] = [userId];

    if (type) {
      query += ` AND type = $${values.length + 1}`;
      values.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  // ==================== Products ====================

  async getProducts(params: { type?: string; country?: string }): Promise<any[]> {
    const { type, country } = params;

    let query = `SELECT * FROM products WHERE is_active = true`;
    const values: any[] = [];

    if (type) {
      values.push(type);
      query += ` AND type = $${values.length}`;
    }

    query += ` ORDER BY sort_order ASC`;

    const result = await this.pool.query(query, values);

    // Apply regional pricing if country is provided
    if (country) {
      return result.rows.map((p: any) => {
        const regionalPrice = p.regional_prices?.[country];
        if (regionalPrice) {
          return {
            ...p,
            price: regionalPrice.amount,
            currency: regionalPrice.currency,
          };
        }
        return p;
      });
    }

    return result.rows;
  }

  async getProductById(productId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT * FROM products WHERE id = $1 OR sku = $1`,
      [productId]
    );
    return result.rows[0] || null;
  }

  async getSubscriptionPlans(params: { country?: string }): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC`
    );
    return result.rows;
  }

  // ==================== Transactions ====================

  async getTransactions(params: {
    userId: string;
    limit: number;
    offset: number;
    type?: string;
    status?: string;
    provider?: string;
  }): Promise<any[]> {
    const { userId, limit, offset, type, status, provider } = params;

    let query = `SELECT * FROM payment_transactions WHERE user_id = $1`;
    const values: any[] = [userId];

    if (type) {
      values.push(type);
      query += ` AND type = $${values.length}`;
    }

    if (status) {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }

    if (provider) {
      values.push(provider);
      query += ` AND provider = $${values.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getTransaction(params: {
    userId: string;
    transactionId: string;
  }): Promise<any> {
    const { userId, transactionId } = params;

    const result = await this.pool.query(
      `SELECT * FROM payment_transactions WHERE id = $1 AND user_id = $2`,
      [transactionId, userId]
    );

    return result.rows[0] || null;
  }

  // ==================== Providers ====================

  async getAvailableProviders(params: {
    country?: string;
    platform?: string;
  }): Promise<any[]> {
    const { country, platform } = params;

    const result = await this.pool.query(
      `SELECT * FROM payment_feature_flags WHERE enabled = true`
    );

    const flags = result.rows.reduce((acc: any, flag: any) => {
      acc[flag.key] = flag;
      return acc;
    }, {});

    const providers: any[] = [];

    // Stripe
    if (flags['stripe_enabled']?.enabled) {
      const stripeCountries = flags['stripe_enabled'].countries || [];
      if (!country || stripeCountries.length === 0 || stripeCountries.includes(country)) {
        providers.push({
          id: 'stripe',
          name: 'Stripe',
          supportedMethods: ['card', 'apple_pay', 'google_pay'],
          supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
          enabled: true,
        });
      }
    }

    // PayPal
    if (flags['paypal_enabled']?.enabled) {
      const paypalCountries = flags['paypal_enabled'].countries || [];
      if (!country || paypalCountries.length === 0 || paypalCountries.includes(country)) {
        providers.push({
          id: 'paypal',
          name: 'PayPal',
          supportedMethods: ['paypal_wallet', 'venmo'],
          supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
          enabled: true,
        });
      }
    }

    // Flutterwave (Africa)
    if (flags['flutterwave_enabled']?.enabled) {
      const flwCountries = flags['flutterwave_enabled'].countries || [];
      if (!country || flwCountries.includes(country)) {
        providers.push({
          id: 'flutterwave',
          name: 'Flutterwave',
          supportedMethods: ['card', 'mobile_money', 'bank_transfer', 'ussd'],
          supportedCurrencies: ['NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR', 'USD'],
          enabled: true,
        });
      }
    }

    // Paystack (Africa)
    if (flags['paystack_enabled']?.enabled) {
      const psCountries = flags['paystack_enabled'].countries || [];
      if (!country || psCountries.includes(country)) {
        providers.push({
          id: 'paystack',
          name: 'Paystack',
          supportedMethods: ['card', 'mobile_money', 'bank_transfer'],
          supportedCurrencies: ['NGN', 'GHS', 'ZAR', 'USD'],
          enabled: true,
        });
      }
    }

    // Apple IAP (iOS only)
    if (flags['apple_iap_enabled']?.enabled && (!platform || platform === 'ios')) {
      providers.push({
        id: 'apple_iap',
        name: 'Apple In-App Purchase',
        supportedMethods: ['iap'],
        supportedCurrencies: ['USD'],
        enabled: true,
      });
    }

    // Google Play (Android only)
    if (flags['google_play_enabled']?.enabled && (!platform || platform === 'android')) {
      providers.push({
        id: 'google_play',
        name: 'Google Play Billing',
        supportedMethods: ['iap'],
        supportedCurrencies: ['USD'],
        enabled: true,
      });
    }

    return providers;
  }

  // ==================== Refunds ====================

  async requestRefund(params: {
    userId: string;
    transactionId: string;
    reason?: string;
  }): Promise<any> {
    const { userId, transactionId, reason } = params;

    const transaction = await this.getTransaction({ userId, transactionId });
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only refund completed transactions');
    }

    let refund: any;

    switch (transaction.provider) {
      case PaymentProvider.STRIPE:
        refund = await this.stripeProvider.refundPayment(
          transaction.provider_transaction_id,
          undefined, // Full refund
          reason
        );
        break;

      case PaymentProvider.PAYPAL:
        refund = await this.paypalProvider.refundPayment(
          transaction.provider_transaction_id,
          transaction.amount,
          transaction.currency
        );
        break;

      default:
        throw new Error(`Refunds not supported for provider: ${transaction.provider}`);
    }

    // Update transaction status
    await this.pool.query(
      `UPDATE payment_transactions
       SET status = 'refunded', refunded_at = NOW(), amount_refunded = amount
       WHERE id = $1`,
      [transactionId]
    );

    return {
      refundId: refund.id,
      status: 'refunded',
      amount: transaction.amount,
    };
  }

  // ==================== Private Helpers ====================

  private async getOrCreateCustomer(
    userId: string,
    provider: PaymentProvider
  ): Promise<any> {
    // Check if customer exists
    const existing = await this.pool.query(
      `SELECT * FROM payment_customers
       WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Get user details
    const user = await this.getUserById(userId);

    // Create customer with provider
    let providerCustomerId: string;

    switch (provider) {
      case PaymentProvider.STRIPE:
        const stripeCustomer = await this.stripeProvider.createCustomer({
          email: user.email,
          name: user.name,
          metadata: { userId },
        });
        providerCustomerId = stripeCustomer.id;
        break;

      case PaymentProvider.PAYPAL:
        // PayPal doesn't have explicit customer creation
        providerCustomerId = `paypal_${userId}`;
        break;

      case PaymentProvider.FLUTTERWAVE:
        // Flutterwave uses email as customer identifier
        providerCustomerId = user.email;
        break;

      case PaymentProvider.PAYSTACK:
        const paystackCustomer = await this.paystackProvider.createCustomer({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          metadata: { userId },
        });
        providerCustomerId = paystackCustomer.id;
        break;

      default:
        providerCustomerId = `${provider}_${userId}`;
    }

    // Store customer
    const result = await this.pool.query(
      `INSERT INTO payment_customers
       (user_id, provider, provider_customer_id, email, name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, provider, providerCustomerId, user.email, user.name]
    );

    return result.rows[0];
  }

  private async getUserById(userId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  private async storeIAPReceipt(params: {
    userId: string;
    provider: PaymentProvider;
    receipt: string;
    productId: string;
    transactionId?: string;
    validationResponse: any;
    packageName?: string;
  }): Promise<void> {
    const { userId, provider, receipt, productId, transactionId, validationResponse, packageName } = params;

    await this.pool.query(
      `INSERT INTO iap_receipts
       (user_id, provider, receipt_data, product_id, transaction_id,
        original_transaction_id, purchase_token, package_name,
        product_type, is_valid, environment, validation_response, validated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (provider, original_transaction_id) DO UPDATE SET
         is_valid = $10,
         validation_response = $12,
         validated_at = NOW()`,
      [
        userId,
        provider,
        receipt,
        productId,
        transactionId,
        validationResponse.originalTransactionId,
        provider === PaymentProvider.GOOGLE_PLAY ? receipt : null,
        packageName,
        validationResponse.isSubscription ? 'subscription' : 'consumable',
        validationResponse.isValid,
        validationResponse.environment || 'production',
        JSON.stringify(validationResponse),
      ]
    );
  }

  private async processIAPPurchase(
    userId: string,
    productId: string,
    validationResult: any
  ): Promise<void> {
    const product = await this.getProductById(productId);

    if (product?.type === 'coins') {
      await this.creditWallet(userId, product.coinAmount, `Purchased ${product.name}`);
    } else if (product?.type === 'subscription' || validationResult.isSubscription) {
      // Activate subscription handled separately
    }
  }

  private async syncIAPPurchase(
    userId: string,
    provider: PaymentProvider,
    purchase: any
  ): Promise<void> {
    // Implementation for syncing individual purchases
  }

  private async activateSubscription(
    userId: string,
    provider: PaymentProvider,
    subscription: any
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_subscriptions
       (user_id, provider, provider_subscription_id, plan_id, status,
        current_period_end, original_transaction_id)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
         status = 'active',
         current_period_end = $5,
         updated_at = NOW()`,
      [
        userId,
        provider,
        subscription.originalTransactionId,
        subscription.productId,
        subscription.expiresDate,
        subscription.originalTransactionId,
      ]
    );
  }

  private async creditWallet(
    userId: string,
    amount: number,
    description: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Ensure wallet exists
      await client.query(
        `INSERT INTO user_wallets (user_id, coins, gems, bonus_coins)
         VALUES ($1, 0, 0, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      // Update balance
      const wallet = await client.query(
        `UPDATE user_wallets
         SET coins = coins + $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [amount, userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO wallet_transactions
         (user_id, wallet_id, currency_type, type, amount, balance_after, description)
         VALUES ($1, $2, 'coins', 'purchase', $3, $4, $5)`,
        [userId, wallet.rows[0].id, amount, wallet.rows[0].coins, description]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async recordPendingTransaction(params: {
    userId: string;
    provider: PaymentProvider;
    providerTransactionId: string;
    type: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO payment_transactions
       (user_id, provider, provider_transaction_id, type, amount, currency, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
      [
        params.userId,
        params.provider,
        params.providerTransactionId,
        params.type,
        params.amount,
        params.currency,
        JSON.stringify(params.metadata || {}),
      ]
    );
  }

  private detectMobileNetwork(phoneNumber: string, currency: string): string {
    // Simple network detection based on phone number prefix
    // This would be more sophisticated in production
    const number = phoneNumber.replace(/\D/g, '');

    if (currency === 'GHS') {
      // Ghana
      if (number.startsWith('233') || number.startsWith('0')) {
        const prefix = number.startsWith('233') ? number.substring(3, 5) : number.substring(1, 3);
        if (['24', '54', '55', '59'].includes(prefix)) return 'MTN';
        if (['20', '50'].includes(prefix)) return 'VODAFONE';
        if (['26', '56'].includes(prefix)) return 'AIRTELTIGO';
      }
    } else if (currency === 'KES') {
      // Kenya
      if (number.startsWith('254') || number.startsWith('0')) {
        const prefix = number.startsWith('254') ? number.substring(3, 5) : number.substring(1, 3);
        if (['07', '01'].some(p => prefix.startsWith(p))) return 'MPESA';
      }
    } else if (currency === 'UGX') {
      // Uganda
      return 'MTN';
    }

    return 'MTN'; // Default
  }
}

export default PaymentService;
