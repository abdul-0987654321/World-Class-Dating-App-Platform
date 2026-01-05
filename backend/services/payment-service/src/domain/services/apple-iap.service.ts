/**
 * Apple In-App Purchase (IAP) Service
 * Handles Apple App Store receipt validation and subscription management
 */

import axios from 'axios';

import logger from '../../utils/logger';

// Apple IAP receipt validation endpoints
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Receipt validation status codes
export enum AppleReceiptStatus {
  SUCCESS = 0,
  SANDBOX_RECEIPT_ON_PRODUCTION = 21007,
  PRODUCTION_RECEIPT_ON_SANDBOX = 21008,
}

export interface AppleReceipt {
  receipt: string; // Base64 encoded receipt data
  password?: string; // App-specific shared secret
}

export interface AppleReceiptValidationResult {
  isValid: boolean;
  environment: 'Production' | 'Sandbox';
  bundleId?: string;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: Date;
  expiresDate?: Date;
  cancellationDate?: Date;
  isTrialPeriod?: boolean;
  isInIntroOfferPeriod?: boolean;
  autoRenewStatus?: boolean;
  rawResponse?: any;
}

export interface AppleSubscriptionInfo {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: Date;
  expiresDate: Date;
  isActive: boolean;
  willAutoRenew: boolean;
  isTrialPeriod: boolean;
  cancellationDate?: Date;
}

export class AppleIAPService {
  private sharedSecret: string;
  private expectedBundleId: string;

  constructor() {
    this.sharedSecret = process.env.APPLE_IAP_SHARED_SECRET || '';
    this.expectedBundleId = process.env.APPLE_BUNDLE_ID || 'com.flamoral.app';

    if (!this.sharedSecret) {
      logger.warn('Apple IAP shared secret not configured');
    }
  }

  /**
   * Validate Apple IAP receipt
   */
  async validateReceipt(receipt: string): Promise<AppleReceiptValidationResult> {
    try {
      // Try production first
      let response = await this.makeValidationRequest(receipt, APPLE_PRODUCTION_URL);

      // If sandbox receipt was sent to production, retry with sandbox
      if (response.status === AppleReceiptStatus.SANDBOX_RECEIPT_ON_PRODUCTION) {
        logger.info('Receipt is from sandbox, retrying with sandbox endpoint');
        response = await this.makeValidationRequest(receipt, APPLE_SANDBOX_URL);
      }

      return this.parseValidationResponse(response);
    } catch (error: any) {
      logger.error('Apple receipt validation failed:', error);
      return {
        isValid: false,
        environment: 'Production',
      };
    }
  }

  /**
   * Make validation request to Apple
   */
  private async makeValidationRequest(receipt: string, url: string): Promise<any> {
    const payload: any = {
      'receipt-data': receipt,
    };

    // Include shared secret for auto-renewable subscriptions
    if (this.sharedSecret) {
      payload.password = this.sharedSecret;
    }

    // Request to exclude old transactions for better performance
    payload['exclude-old-transactions'] = true;

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    return response.data;
  }

  /**
   * Parse Apple validation response
   */
  private parseValidationResponse(response: any): AppleReceiptValidationResult {
    const status = response.status;

    if (status !== AppleReceiptStatus.SUCCESS) {
      logger.warn(`Apple receipt validation failed with status: ${status}`);
      return {
        isValid: false,
        environment: response.environment || 'Production',
        rawResponse: response,
      };
    }

    const receipt = response.receipt;
    const latestReceiptInfo = response.latest_receipt_info;
    const pendingRenewalInfo = response.pending_renewal_info;

    // Validate bundle ID
    if (receipt.bundle_id !== this.expectedBundleId) {
      logger.warn(
        `Bundle ID mismatch: expected ${this.expectedBundleId}, got ${receipt.bundle_id}`
      );
      return {
        isValid: false,
        environment: response.environment,
      };
    }

    // For subscriptions, use latest_receipt_info
    let transaction: any;
    if (latestReceiptInfo && latestReceiptInfo.length > 0) {
      // Get the most recent transaction
      transaction = latestReceiptInfo[latestReceiptInfo.length - 1];
    } else if (receipt.in_app && receipt.in_app.length > 0) {
      // For non-subscriptions
      transaction = receipt.in_app[receipt.in_app.length - 1];
    }

    if (!transaction) {
      logger.warn('No transaction found in receipt');
      return {
        isValid: false,
        environment: response.environment,
      };
    }

    // Parse dates
    const purchaseDate = transaction.purchase_date_ms
      ? new Date(parseInt(transaction.purchase_date_ms))
      : undefined;
    const expiresDate = transaction.expires_date_ms
      ? new Date(parseInt(transaction.expires_date_ms))
      : undefined;
    const cancellationDate = transaction.cancellation_date_ms
      ? new Date(parseInt(transaction.cancellation_date_ms))
      : undefined;

    // Check auto-renew status
    let autoRenewStatus = true;
    if (pendingRenewalInfo && pendingRenewalInfo.length > 0) {
      const renewalInfo = pendingRenewalInfo[0];
      autoRenewStatus = renewalInfo.auto_renew_status === '1';
    }

    return {
      isValid: true,
      environment: response.environment,
      bundleId: receipt.bundle_id,
      productId: transaction.product_id,
      transactionId: transaction.transaction_id,
      originalTransactionId: transaction.original_transaction_id,
      purchaseDate,
      expiresDate,
      cancellationDate,
      isTrialPeriod: transaction.is_trial_period === 'true',
      isInIntroOfferPeriod: transaction.is_in_intro_offer_period === 'true',
      autoRenewStatus,
      rawResponse: response,
    };
  }

  /**
   * Get active subscription from receipt
   */
  async getActiveSubscription(receipt: string): Promise<AppleSubscriptionInfo | null> {
    const validation = await this.validateReceipt(receipt);

    if (!validation.isValid || !validation.expiresDate) {
      return null;
    }

    const now = new Date();
    const isActive = validation.expiresDate > now && !validation.cancellationDate;

    if (!isActive) {
      return null;
    }

    return {
      productId: validation.productId,
      transactionId: validation.transactionId,
      originalTransactionId: validation.originalTransactionId,
      purchaseDate: validation.purchaseDate,
      expiresDate: validation.expiresDate,
      isActive: true,
      willAutoRenew: validation.autoRenewStatus || false,
      isTrialPeriod: validation.isTrialPeriod || false,
      cancellationDate: validation.cancellationDate,
    };
  }

  /**
   * Verify subscription is still valid
   */
  async verifySubscription(receipt: string, productId: string): Promise<boolean> {
    const subscription = await this.getActiveSubscription(receipt);
    return subscription !== null && subscription.productId === productId;
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(receipt: string): Promise<{
    isActive: boolean;
    expiresDate?: Date;
    willAutoRenew: boolean;
    isTrialPeriod: boolean;
    productId?: string;
  }> {
    const subscription = await this.getActiveSubscription(receipt);

    if (!subscription) {
      return {
        isActive: false,
        willAutoRenew: false,
        isTrialPeriod: false,
      };
    }

    return {
      isActive: subscription.isActive,
      expiresDate: subscription.expiresDate,
      willAutoRenew: subscription.willAutoRenew,
      isTrialPeriod: subscription.isTrialPeriod,
      productId: subscription.productId,
    };
  }

  /**
   * Map Apple product ID to tier
   */
  mapProductIdToTier(productId: string): string {
    const tierMap: Record<string, string> = {
      'com.flamoral.gold.monthly': 'gold',
      'com.flamoral.gold.yearly': 'gold',
      'com.flamoral.platinum.monthly': 'platinum',
      'com.flamoral.platinum.yearly': 'platinum',
      'com.flamoral.diamond.monthly': 'diamond',
      'com.flamoral.diamond.yearly': 'diamond',
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
    if (productId.includes('coins.100')) {
      return { type: 'coins', amount: 100 };
    }
    if (productId.includes('coins.500')) {
      return { type: 'coins', amount: 500 };
    }
    if (productId.includes('coins.1000')) {
      return { type: 'coins', amount: 1000 };
    }

    // Boosts
    if (productId.includes('boost.1')) {
      return { type: 'boost', amount: 1 };
    }
    if (productId.includes('boost.5')) {
      return { type: 'boost', amount: 5 };
    }

    // Super Likes
    if (productId.includes('superlike.5')) {
      return { type: 'superlike', amount: 5 };
    }
    if (productId.includes('superlike.25')) {
      return { type: 'superlike', amount: 25 };
    }

    return { type: 'unknown', amount: 0 };
  }
}

export default new AppleIAPService();
