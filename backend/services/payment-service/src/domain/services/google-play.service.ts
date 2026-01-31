/**
 * Google Play Billing Service
 * Handles Google Play Store receipt validation and subscription management
 */

import { google } from 'googleapis';

import logger from '../../utils/logger';

export interface GooglePlayReceipt {
  packageName: string;
  productId: string;
  purchaseToken: string;
}

export interface GooglePlaySubscription {
  kind: string;
  startTimeMillis: string;
  expiryTimeMillis: string;
  autoRenewing: boolean;
  priceCurrencyCode: string;
  priceAmountMicros: string;
  countryCode: string;
  paymentState: number;
  cancelReason?: number;
  userCancellationTimeMillis?: string;
  orderId: string;
  linkedPurchaseToken?: string;
  purchaseType?: number;
  acknowledgementState: number;
}

export interface GooglePlayProduct {
  kind: string;
  purchaseTimeMillis: string;
  purchaseState: number;
  consumptionState: number;
  orderId: string;
  acknowledgementState: number;
  purchaseType?: number;
}

export interface GooglePlayValidationResult {
  isValid: boolean;
  productId?: string;
  purchaseToken?: string;
  purchaseTime?: Date;
  expiryTime?: Date;
  autoRenewing?: boolean;
  isActive?: boolean;
  paymentState?: 'pending' | 'received' | 'free_trial' | 'pending_deferred';
  cancelReason?: 'user' | 'system' | 'replaced' | 'developer';
  orderId?: string;
  rawResponse?: any;
}

export class GooglePlayService {
  private androidPublisher: any;
  private packageName: string;
  private isInitialized: boolean = false;

  constructor() {
    this.packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.flamoral.app';
  }

  /**
   * Initialize Google Play API client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load service account credentials
      const serviceAccountKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;

      if (!serviceAccountKey) {
        logger.warn('Google Play service account key not configured');
        return;
      }

      // Parse service account key
      let credentials;
      try {
        credentials = JSON.parse(serviceAccountKey);
      } catch (error) {
        // If not JSON, assume it's a file path
        const { readFileSync } = await import('fs');
        credentials = JSON.parse(readFileSync(serviceAccountKey, 'utf-8'));
      }

      // Create JWT client
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      const authClient = await auth.getClient();

      // Initialize Android Publisher API
      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth: authClient as any,
      });

      this.isInitialized = true;
      logger.info('Google Play service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Play service:', error);
      throw new Error(`Google Play initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate subscription purchase
   */
  async validateSubscription(
    productId: string,
    purchaseToken: string
  ): Promise<GooglePlayValidationResult> {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        return { isValid: false };
      }

      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const subscription: GooglePlaySubscription = response.data;

      // Parse dates
      const expiryTime = new Date(parseInt(subscription.expiryTimeMillis));
      const startTime = new Date(parseInt(subscription.startTimeMillis));
      const now = new Date();

      // Check if subscription is active
      const isActive = expiryTime > now && subscription.paymentState === 1;

      // Map payment state
      let paymentState: 'pending' | 'received' | 'free_trial' | 'pending_deferred' = 'received';
      if (subscription.paymentState === 0) {
        paymentState = 'pending';
      } else if (subscription.paymentState === 2) {
        paymentState = 'free_trial';
      } else if (subscription.paymentState === 3) {
        paymentState = 'pending_deferred';
      }

      // Map cancel reason
      let cancelReason: 'user' | 'system' | 'replaced' | 'developer' | undefined;
      if (subscription.cancelReason === 0) {
        cancelReason = 'user';
      } else if (subscription.cancelReason === 1) {
        cancelReason = 'system';
      } else if (subscription.cancelReason === 2) {
        cancelReason = 'replaced';
      } else if (subscription.cancelReason === 3) {
        cancelReason = 'developer';
      }

      return {
        isValid: true,
        productId,
        purchaseToken,
        purchaseTime: startTime,
        expiryTime,
        autoRenewing: subscription.autoRenewing,
        isActive,
        paymentState,
        cancelReason,
        orderId: subscription.orderId,
        rawResponse: subscription,
      };
    } catch (error) {
      logger.error('Google Play subscription validation failed:', error);

      // Check if it's a 404 (purchase not found)
      if (error.code === 404) {
        return {
          isValid: false,
        };
      }

      throw new Error(`Failed to validate subscription: ${error.message}`);
    }
  }

  /**
   * Validate product purchase (consumable)
   */
  async validateProduct(
    productId: string,
    purchaseToken: string
  ): Promise<GooglePlayValidationResult> {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        return { isValid: false };
      }

      const response = await this.androidPublisher.purchases.products.get({
        packageName: this.packageName,
        productId,
        token: purchaseToken,
      });

      const product: GooglePlayProduct = response.data;

      // Parse purchase time
      const purchaseTime = new Date(parseInt(product.purchaseTimeMillis));

      // Check if purchase is valid (state 0 = purchased)
      const isValid = product.purchaseState === 0;

      return {
        isValid,
        productId,
        purchaseToken,
        purchaseTime,
        orderId: product.orderId,
        rawResponse: product,
      };
    } catch (error) {
      logger.error('Google Play product validation failed:', error);

      if (error.code === 404) {
        return {
          isValid: false,
        };
      }

      throw new Error(`Failed to validate product: ${error.message}`);
    }
  }

  /**
   * Acknowledge purchase (required by Google Play)
   */
  async acknowledgePurchase(productId: string, purchaseToken: string): Promise<void> {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        logger.warn('Cannot acknowledge purchase - Google Play not initialized');
        return;
      }

      await this.androidPublisher.purchases.products.acknowledge({
        packageName: this.packageName,
        productId,
        token: purchaseToken,
      });

      logger.info(`Purchase acknowledged: ${productId}`);
    } catch (error) {
      logger.error('Failed to acknowledge purchase:', error);
      throw new Error(`Failed to acknowledge purchase: ${error.message}`);
    }
  }

  /**
   * Acknowledge subscription
   */
  async acknowledgeSubscription(subscriptionId: string, purchaseToken: string): Promise<void> {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        logger.warn('Cannot acknowledge subscription - Google Play not initialized');
        return;
      }

      await this.androidPublisher.purchases.subscriptions.acknowledge({
        packageName: this.packageName,
        subscriptionId,
        token: purchaseToken,
      });

      logger.info(`Subscription acknowledged: ${subscriptionId}`);
    } catch (error) {
      logger.error('Failed to acknowledge subscription:', error);
      throw new Error(`Failed to acknowledge subscription: ${error.message}`);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, purchaseToken: string): Promise<void> {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        logger.error('Google Play billing service not initialized - check GOOGLE_PLAY_* environment variables');
        throw new Error('Google Play not initialized - missing configuration');
      }

      await this.androidPublisher.purchases.subscriptions.cancel({
        packageName: this.packageName,
        subscriptionId,
        token: purchaseToken,
      });

      logger.info(`Subscription canceled: ${subscriptionId}`);
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Refund subscription
   */
  async refundSubscription(subscriptionId: string, purchaseToken: string): Promise<void> {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        logger.error('Google Play billing service not initialized - check GOOGLE_PLAY_* environment variables');
        throw new Error('Google Play not initialized - missing configuration');
      }

      await this.androidPublisher.purchases.subscriptions.refund({
        packageName: this.packageName,
        subscriptionId,
        token: purchaseToken,
      });

      logger.info(`Subscription refunded: ${subscriptionId}`);
    } catch (error) {
      logger.error('Failed to refund subscription:', error);
      throw new Error(`Failed to refund subscription: ${error.message}`);
    }
  }

  /**
   * Revoke subscription
   */
  async revokeSubscription(subscriptionId: string, purchaseToken: string): Promise<void> {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        logger.error('Google Play billing service not initialized - check GOOGLE_PLAY_* environment variables');
        throw new Error('Google Play not initialized - missing configuration');
      }

      await this.androidPublisher.purchases.subscriptions.revoke({
        packageName: this.packageName,
        subscriptionId,
        token: purchaseToken,
      });

      logger.info(`Subscription revoked: ${subscriptionId}`);
    } catch (error) {
      logger.error('Failed to revoke subscription:', error);
      throw new Error(`Failed to revoke subscription: ${error.message}`);
    }
  }

  /**
   * Map Google Play product ID to tier
   */
  mapProductIdToTier(productId: string): string {
    const tierMap: Record<string, string> = {
      gold_monthly: 'gold',
      gold_yearly: 'gold',
      platinum_monthly: 'platinum',
      platinum_yearly: 'platinum',
      diamond_monthly: 'diamond',
      diamond_yearly: 'diamond',
    };

    return tierMap[productId] || 'free';
  }

  /**
   * Parse consumable product (coins, boosts, etc.)
   */
  parseConsumableProduct(productId: string): {
    type: 'coins' | 'boost' | 'superlike' | 'unknown';
    amount: number;
  } {
    // Coins
    if (productId === 'coins_100') {
      return { type: 'coins', amount: 100 };
    }
    if (productId === 'coins_500') {
      return { type: 'coins', amount: 500 };
    }
    if (productId === 'coins_1000') {
      return { type: 'coins', amount: 1000 };
    }

    // Boosts
    if (productId === 'boost_1') {
      return { type: 'boost', amount: 1 };
    }
    if (productId === 'boost_5') {
      return { type: 'boost', amount: 5 };
    }

    // Super Likes
    if (productId === 'superlike_5') {
      return { type: 'superlike', amount: 5 };
    }
    if (productId === 'superlike_25') {
      return { type: 'superlike', amount: 25 };
    }

    return { type: 'unknown', amount: 0 };
  }
}

export default new GooglePlayService();
