import Stripe from 'stripe';
import logger from '../utils/logger';

/**
 * Payment Service Configuration
 * Centralized configuration for Stripe and payment processing
 */

export interface PaymentConfig {
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    apiVersion: string;
    maxNetworkRetries: number;
    timeout: number;
  };
  currency: string;
  trialPeriodDays: number;
  gracePeriodDays: number;
  features: {
    coinPurchases: boolean;
    boostPurchases: boolean;
    subscriptions: boolean;
    refunds: boolean;
    proratedRefunds: boolean;
  };
  webhook: {
    maxRetries: number;
    retryDelays: number[];
    eventRetentionDays: number;
    batchProcessing: boolean;
    batchSize: number;
    batchIntervalMs: number;
  };
  rateLimit: {
    windowMs: number;
    paymentMaxRequests: number;
    standardMaxRequests: number;
  };
}

class PaymentConfigService {
  private config: PaymentConfig | null = null;
  private stripe: Stripe | null = null;

  /**
   * Initialize and validate configuration
   */
  initialize(): PaymentConfig {
    if (this.config) {
      return this.config;
    }

    const errors: string[] = [];

    // Validate required Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey) {
      errors.push('STRIPE_SECRET_KEY is required');
    } else if (!stripeSecretKey.startsWith('sk_')) {
      errors.push('STRIPE_SECRET_KEY must start with sk_');
    }

    if (!stripeWebhookSecret) {
      errors.push('STRIPE_WEBHOOK_SECRET is required');
    } else if (!stripeWebhookSecret.startsWith('whsec_')) {
      errors.push('STRIPE_WEBHOOK_SECRET must start with whsec_');
    }

    // Check for test vs live mode mismatch
    const isTestKey = stripeSecretKey?.includes('_test_');
    const isLiveKey = stripeSecretKey?.includes('_live_');
    const nodeEnv = process.env.NODE_ENV;

    if (nodeEnv === 'production' && isTestKey) {
      errors.push('Cannot use test Stripe keys in production');
    }

    if (nodeEnv !== 'production' && isLiveKey) {
      logger.warn('Using LIVE Stripe keys in non-production environment!');
    }

    // Throw errors if in production
    if (errors.length > 0 && nodeEnv === 'production') {
      throw new Error(
        `Payment configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`
      );
    }

    // Log warnings in development
    if (errors.length > 0 && nodeEnv !== 'production') {
      logger.warn('Payment configuration warnings:');
      errors.forEach((error) => logger.warn(`  - ${error}`));
    }

    // Parse webhook retry delays
    const retryDelaysStr = process.env.WEBHOOK_RETRY_DELAYS || '60,300,900,3600,7200';
    const retryDelays = retryDelaysStr.split(',').map((delay) => parseInt(delay.trim(), 10));

    this.config = {
      stripe: {
        secretKey: stripeSecretKey || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: stripeWebhookSecret || '',
        apiVersion: process.env.STRIPE_API_VERSION || '2024-12-18.acacia',
        maxNetworkRetries: parseInt(process.env.STRIPE_MAX_NETWORK_RETRIES || '3', 10),
        timeout: parseInt(process.env.STRIPE_TIMEOUT || '30000', 10),
      },
      currency: process.env.PAYMENT_CURRENCY || 'usd',
      trialPeriodDays: parseInt(process.env.TRIAL_PERIOD_DAYS || '7', 10),
      gracePeriodDays: parseInt(process.env.PAYMENT_GRACE_PERIOD_DAYS || '3', 10),
      features: {
        coinPurchases: process.env.ENABLE_COIN_PURCHASES !== 'false',
        boostPurchases: process.env.ENABLE_BOOST_PURCHASES !== 'false',
        subscriptions: process.env.ENABLE_SUBSCRIPTIONS !== 'false',
        refunds: process.env.ENABLE_REFUNDS !== 'false',
        proratedRefunds: process.env.ENABLE_PRORATED_REFUNDS !== 'false',
      },
      webhook: {
        maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '5', 10),
        retryDelays,
        eventRetentionDays: parseInt(process.env.WEBHOOK_EVENT_RETENTION_DAYS || '30', 10),
        batchProcessing: process.env.WEBHOOK_BATCH_PROCESSING === 'true',
        batchSize: parseInt(process.env.WEBHOOK_BATCH_SIZE || '50', 10),
        batchIntervalMs: parseInt(process.env.WEBHOOK_BATCH_INTERVAL_MS || '2000', 10),
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        paymentMaxRequests: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX_REQUESTS || '10', 10),
        standardMaxRequests: parseInt(process.env.RATE_LIMIT_STANDARD_MAX_REQUESTS || '60', 10),
      },
    };

    return this.config;
  }

  /**
   * Get configuration object
   */
  getConfig(): PaymentConfig {
    if (!this.config) {
      return this.initialize();
    }
    return this.config;
  }

  /**
   * Get Stripe client instance (singleton)
   */
  getStripeClient(): Stripe {
    if (this.stripe) {
      return this.stripe;
    }

    const config = this.getConfig();

    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: config.stripe.apiVersion as Stripe.LatestApiVersion,
      maxNetworkRetries: config.stripe.maxNetworkRetries,
      timeout: config.stripe.timeout,
      typescript: true,
    });

    return this.stripe;
  }

  /**
   * Validate Stripe configuration
   */
  validateStripeConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getConfig();

    if (!config.stripe.secretKey) {
      errors.push('STRIPE_SECRET_KEY is not configured');
    } else if (!config.stripe.secretKey.startsWith('sk_')) {
      errors.push('STRIPE_SECRET_KEY appears to be invalid (should start with sk_)');
    }

    if (!config.stripe.webhookSecret) {
      errors.push('STRIPE_WEBHOOK_SECRET is not configured');
    } else if (!config.stripe.webhookSecret.startsWith('whsec_')) {
      errors.push('STRIPE_WEBHOOK_SECRET appears to be invalid (should start with whsec_)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get Stripe configuration status
   */
  getStripeStatus(): {
    configured: boolean;
    mode: 'test' | 'live' | 'unknown';
    apiVersion: string;
    environment: string;
  } {
    const config = this.getConfig();
    const secretKey = config.stripe.secretKey;

    return {
      configured: !!secretKey,
      mode: secretKey.includes('_test_')
        ? 'test'
        : secretKey.includes('_live_')
        ? 'live'
        : 'unknown',
      apiVersion: config.stripe.apiVersion,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof PaymentConfig['features']): boolean {
    const config = this.getConfig();
    return config.features[feature];
  }

  /**
   * Get webhook retry delay for attempt number
   */
  getWebhookRetryDelay(attemptNumber: number): number {
    const config = this.getConfig();
    const delays = config.webhook.retryDelays;

    if (attemptNumber >= delays.length) {
      return delays[delays.length - 1];
    }

    return delays[attemptNumber];
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string
  ): { valid: boolean; event?: Stripe.Event; error?: string } {
    const config = this.getConfig();
    const stripe = this.getStripeClient();

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.stripe.webhookSecret
      );

      return { valid: true, event };
    } catch (error: any) {
      logger.error('Webhook signature verification failed:', error.message);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get sanitized config for logging (without secrets)
   */
  getSanitizedConfig(): Partial<PaymentConfig> {
    const config = this.getConfig();

    return {
      stripe: {
        secretKey: config.stripe.secretKey ? `sk_***...${config.stripe.secretKey.slice(-4)}` : 'NOT_SET',
        publishableKey: config.stripe.publishableKey || 'NOT_SET',
        webhookSecret: config.stripe.webhookSecret ? `whsec_***...${config.stripe.webhookSecret.slice(-4)}` : 'NOT_SET',
        apiVersion: config.stripe.apiVersion,
        maxNetworkRetries: config.stripe.maxNetworkRetries,
        timeout: config.stripe.timeout,
      },
      currency: config.currency,
      trialPeriodDays: config.trialPeriodDays,
      gracePeriodDays: config.gracePeriodDays,
      features: config.features,
      webhook: config.webhook,
      rateLimit: config.rateLimit,
    };
  }
}

// Export singleton instance
export const paymentConfig = new PaymentConfigService();
export default paymentConfig;
