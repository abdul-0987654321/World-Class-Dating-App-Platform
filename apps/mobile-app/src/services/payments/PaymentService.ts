/**
 * Mobile Payment Service
 * Handles payments for iOS (Apple IAP) and Android (Google Play Billing)
 * Falls back to Stripe/PayPal for web-based payments
 */

import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
import { api } from '../api';
import logger from '../../utils/logger';

// Product SKUs - these must match your App Store Connect / Google Play Console
export const SUBSCRIPTION_SKUS = {
  ios: [
    'com.flamoral.gold.monthly',
    'com.flamoral.gold.yearly',
    'com.flamoral.platinum.monthly',
    'com.flamoral.platinum.yearly',
    'com.flamoral.diamond.monthly',
    'com.flamoral.diamond.yearly',
  ],
  android: [
    'gold_monthly',
    'gold_yearly',
    'platinum_monthly',
    'platinum_yearly',
    'diamond_monthly',
    'diamond_yearly',
  ],
};

export const CONSUMABLE_SKUS = {
  ios: [
    'com.flamoral.coins.100',
    'com.flamoral.coins.500',
    'com.flamoral.coins.1000',
    'com.flamoral.boost.1',
    'com.flamoral.boost.5',
    'com.flamoral.superlike.5',
    'com.flamoral.superlike.25',
  ],
  android: [
    'coins_100',
    'coins_500',
    'coins_1000',
    'boost_1',
    'boost_5',
    'superlike_5',
    'superlike_25',
  ],
};

export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
  type: 'subscription' | 'consumable';
}

export interface Purchase {
  productId: string;
  transactionId: string;
  transactionReceipt: string;
  purchaseToken?: string; // Android only
  originalTransactionId?: string; // iOS only
}

export interface SubscriptionStatus {
  isActive: boolean;
  tier: string;
  expiresAt?: Date;
  willRenew: boolean;
  provider: 'apple_iap' | 'google_play' | 'stripe' | 'paystack' | 'flutterwave';
}

class MobilePaymentService {
  private initialized = false;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  /**
   * Initialize IAP connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await RNIap.initConnection();
      this.initialized = true;
      logger.info('IAP connection initialized');

      // Set up purchase listeners
      this.setupPurchaseListeners();
    } catch (error) {
      logger.error('Failed to initialize IAP', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Set up listeners for purchase updates
   */
  private setupPurchaseListeners(): void {
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase: RNIap.Purchase) => {
        logger.info('Purchase update', { productId: purchase.productId });
        await this.handlePurchaseUpdate(purchase);
      }
    );

    this.purchaseErrorSubscription = RNIap.purchaseErrorListener((error: RNIap.PurchaseError) => {
      logger.error('Purchase error', error instanceof Error ? error : undefined);
    });
  }

  /**
   * Handle purchase updates (complete the transaction)
   */
  private async handlePurchaseUpdate(purchase: RNIap.Purchase): Promise<void> {
    const receipt = purchase.transactionReceipt;
    if (!receipt) return;

    try {
      // Validate receipt on server
      const isValid = await this.validateReceipt(purchase);

      if (isValid) {
        // Acknowledge/finish the purchase
        if (Platform.OS === 'android') {
          await RNIap.acknowledgePurchaseAndroid({
            token: purchase.purchaseToken!,
            developerPayload: purchase.developerPayloadAndroid,
          });
        }
        await RNIap.finishTransaction({
          purchase,
          isConsumable: this.isConsumable(purchase.productId),
        });
      }
    } catch (error) {
      logger.error('Failed to handle purchase', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Check if product is consumable
   */
  private isConsumable(productId: string): boolean {
    const consumables = Platform.OS === 'ios' ? CONSUMABLE_SKUS.ios : CONSUMABLE_SKUS.android;
    return consumables.includes(productId);
  }

  /**
   * Validate receipt with backend
   */
  private async validateReceipt(purchase: RNIap.Purchase): Promise<boolean> {
    try {
      const response = await api.post('/payments/iap/validate', {
        provider: Platform.OS === 'ios' ? 'apple_iap' : 'google_play',
        receipt: Platform.OS === 'ios' ? purchase.transactionReceipt : purchase.purchaseToken,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        packageName: Platform.OS === 'android' ? 'com.flamoral.app' : undefined,
      });

      return response.data.success && response.data.isValid;
    } catch (error) {
      logger.error('Receipt validation failed', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Get available subscription products
   */
  async getSubscriptions(): Promise<Product[]> {
    await this.initialize();

    const skus = Platform.OS === 'ios' ? SUBSCRIPTION_SKUS.ios : SUBSCRIPTION_SKUS.android;

    try {
      const products = await RNIap.getSubscriptions({ skus });

      return products.map((product) => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        currency: product.currency,
        localizedPrice: product.localizedPrice,
        type: 'subscription' as const,
      }));
    } catch (error) {
      logger.error('Failed to get subscriptions', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Get available consumable products (coins, boosts)
   */
  async getConsumables(): Promise<Product[]> {
    await this.initialize();

    const skus = Platform.OS === 'ios' ? CONSUMABLE_SKUS.ios : CONSUMABLE_SKUS.android;

    try {
      const products = await RNIap.getProducts({ skus });

      return products.map((product) => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        currency: product.currency,
        localizedPrice: product.localizedPrice,
        type: 'consumable' as const,
      }));
    } catch (error) {
      logger.error('Failed to get products', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(productId: string): Promise<Purchase | null> {
    await this.initialize();

    try {
      if (Platform.OS === 'ios') {
        const purchase = await RNIap.requestSubscription({ sku: productId });
        if (purchase) {
          return {
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            transactionReceipt: purchase.transactionReceipt,
            originalTransactionId: purchase.originalTransactionIdentifierIOS,
          };
        }
      } else {
        const purchase = await RNIap.requestSubscription({
          sku: productId,
          subscriptionOffers: [{ sku: productId, offerToken: '' }],
        });
        if (purchase) {
          return {
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            transactionReceipt: purchase.transactionReceipt,
            purchaseToken: purchase.purchaseToken,
          };
        }
      }
      return null;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        logger.info('User cancelled purchase');
        return null;
      }
      logger.error('Subscription purchase failed', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Purchase a consumable (coins, boosts)
   */
  async purchaseConsumable(productId: string): Promise<Purchase | null> {
    await this.initialize();

    try {
      const purchase = await RNIap.requestPurchase({ sku: productId });

      if (purchase) {
        // Consume the purchase immediately
        if (Platform.OS === 'android' && purchase.purchaseToken) {
          await RNIap.consumePurchaseAndroid(purchase.purchaseToken);
        }

        return {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          transactionReceipt: purchase.transactionReceipt,
          purchaseToken: purchase.purchaseToken,
        };
      }
      return null;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        logger.info('User cancelled purchase');
        return null;
      }
      logger.error('Consumable purchase failed', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const response = await api.get('/payments/subscription');

      if (response.data.success && response.data.hasSubscription) {
        return {
          isActive: response.data.subscription.status === 'active',
          tier: response.data.subscription.plan,
          expiresAt: response.data.subscription.currentPeriodEnd
            ? new Date(response.data.subscription.currentPeriodEnd)
            : undefined,
          willRenew: !response.data.subscription.cancelAtPeriodEnd,
          provider: response.data.subscription.provider,
        };
      }

      return {
        isActive: false,
        tier: 'free',
        willRenew: false,
        provider: Platform.OS === 'ios' ? 'apple_iap' : 'google_play',
      };
    } catch (error) {
      logger.error('Failed to get subscription status', error instanceof Error ? error : undefined);
      return {
        isActive: false,
        tier: 'free',
        willRenew: false,
        provider: Platform.OS === 'ios' ? 'apple_iap' : 'google_play',
      };
    }
  }

  /**
   * Restore purchases (required for iOS App Store guidelines)
   */
  async restorePurchases(): Promise<Purchase[]> {
    await this.initialize();

    try {
      const purchases = await RNIap.getAvailablePurchases();

      // Validate each purchase with server
      const validPurchases: Purchase[] = [];
      for (const purchase of purchases) {
        const isValid = await this.validateReceipt(purchase);
        if (isValid) {
          validPurchases.push({
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            transactionReceipt: purchase.transactionReceipt,
            purchaseToken: purchase.purchaseToken,
            originalTransactionId: purchase.originalTransactionIdentifierIOS,
          });
        }
      }

      // Also restore on server
      if (purchases.length > 0) {
        const latestPurchase = purchases[purchases.length - 1];
        await api.post('/payments/iap/restore', {
          provider: Platform.OS === 'ios' ? 'apple_iap' : 'google_play',
          receipt:
            Platform.OS === 'ios'
              ? latestPurchase.transactionReceipt
              : latestPurchase.purchaseToken,
          packageName: Platform.OS === 'android' ? 'com.flamoral.app' : undefined,
        });
      }

      return validPurchases;
    } catch (error) {
      logger.error('Restore purchases failed', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(): Promise<any[]> {
    try {
      const response = await api.get('/payments/transactions?limit=50');
      return response.data.transactions || [];
    } catch (error) {
      logger.error('Failed to get purchase history', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<{ coins: number; gems: number; bonusCoins: number }> {
    try {
      const response = await api.get('/payments/wallet');
      return response.data.wallet || { coins: 0, gems: 0, bonusCoins: 0 };
    } catch (error) {
      logger.error('Failed to get wallet balance', error instanceof Error ? error : undefined);
      return { coins: 0, gems: 0, bonusCoins: 0 };
    }
  }

  /**
   * Clean up subscriptions
   */
  cleanup(): void {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    RNIap.endConnection();
    this.initialized = false;
  }
}

export const paymentService = new MobilePaymentService();
export default paymentService;
