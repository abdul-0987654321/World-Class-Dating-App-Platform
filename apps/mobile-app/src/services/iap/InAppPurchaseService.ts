/**
 * In-App Purchase Service
 * Handles iOS App Store and Google Play Store purchases
 */

import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  acknowledgePurchaseAndroid,
  getAvailablePurchases,
  Product,
  Subscription,
  Purchase,
  PurchaseError,
  ProductPurchase,
  SubscriptionPurchase,
} from 'react-native-iap';
import { Platform, Alert } from 'react-native';
import { EventEmitter } from 'events';

// Product IDs for consumable items
export const CONSUMABLE_SKUS = {
  SUPER_LIKES_5: Platform.OS === 'ios' ? 'com.flamoral.superlikes.5' : 'superlikes_5',
  SUPER_LIKES_25: Platform.OS === 'ios' ? 'com.flamoral.superlikes.25' : 'superlikes_25',
  SUPER_LIKES_60: Platform.OS === 'ios' ? 'com.flamoral.superlikes.60' : 'superlikes_60',
  BOOSTS_1: Platform.OS === 'ios' ? 'com.flamoral.boosts.1' : 'boosts_1',
  BOOSTS_5: Platform.OS === 'ios' ? 'com.flamoral.boosts.5' : 'boosts_5',
  BOOSTS_10: Platform.OS === 'ios' ? 'com.flamoral.boosts.10' : 'boosts_10',
  REWINDS_5: Platform.OS === 'ios' ? 'com.flamoral.rewinds.5' : 'rewinds_5',
  REWINDS_25: Platform.OS === 'ios' ? 'com.flamoral.rewinds.25' : 'rewinds_25',
};

// Subscription SKUs
export const SUBSCRIPTION_SKUS = {
  PREMIUM_MONTHLY: Platform.OS === 'ios' ? 'com.flamoral.premium.monthly' : 'premium_monthly',
  PREMIUM_6_MONTHS: Platform.OS === 'ios' ? 'com.flamoral.premium.6months' : 'premium_6months',
  PREMIUM_YEARLY: Platform.OS === 'ios' ? 'com.flamoral.premium.yearly' : 'premium_yearly',
  PLATINUM_MONTHLY: Platform.OS === 'ios' ? 'com.flamoral.platinum.monthly' : 'platinum_monthly',
  PLATINUM_6_MONTHS: Platform.OS === 'ios' ? 'com.flamoral.platinum.6months' : 'platinum_6months',
  PLATINUM_YEARLY: Platform.OS === 'ios' ? 'com.flamoral.platinum.yearly' : 'platinum_yearly',
};

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  receipt?: string;
  error?: string;
}

class InAppPurchaseServiceClass extends EventEmitter {
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;
  private isInitialized: boolean = false;

  /**
   * Initialize IAP connection
   */
  async initialize(): Promise<boolean> {
    try {
      const result = await initConnection();
      console.log('IAP connection initialized:', result);

      // Set up purchase listeners
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          console.log('Purchase updated:', purchase);
          const receipt = purchase.transactionReceipt;

          if (receipt) {
            try {
              // Verify purchase with backend
              await this.verifyPurchaseWithBackend(purchase);

              // Finish the transaction
              if (Platform.OS === 'android') {
                await acknowledgePurchaseAndroid({
                  token: purchase.purchaseToken!,
                  developerPayload: purchase.developerPayloadAndroid,
                });
              }
              await finishTransaction({ purchase, isConsumable: this.isConsumable(purchase.productId) });

              this.emit('purchaseSuccess', purchase);
            } catch (error) {
              console.error('Error finishing transaction:', error);
              this.emit('purchaseError', error);
            }
          }
        }
      );

      this.purchaseErrorSubscription = purchaseErrorListener(
        (error: PurchaseError) => {
          console.error('Purchase error:', error);
          this.emit('purchaseError', error);

          if (error.code !== 'E_USER_CANCELLED') {
            Alert.alert('Purchase Error', error.message);
          }
        }
      );

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing IAP:', error);
      return false;
    }
  }

  /**
   * Clean up IAP connection
   */
  async cleanup(): Promise<void> {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }

    await endConnection();
    this.isInitialized = false;
  }

  /**
   * Get available consumable products
   */
  async getConsumableProducts(): Promise<Product[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const skus = Object.values(CONSUMABLE_SKUS);
      const products = await getProducts({ skus });

      console.log('Consumable products:', products);
      return products;
    } catch (error) {
      console.error('Error getting consumable products:', error);
      return [];
    }
  }

  /**
   * Get available subscriptions
   */
  async getSubscriptionProducts(): Promise<Subscription[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const skus = Object.values(SUBSCRIPTION_SKUS);
      const subscriptions = await getSubscriptions({ skus });

      console.log('Subscription products:', subscriptions);
      return subscriptions;
    } catch (error) {
      console.error('Error getting subscription products:', error);
      return [];
    }
  }

  /**
   * Purchase a consumable product
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const purchase = await requestPurchase({ skus: [productId] });

      return {
        success: true,
        productId: purchase[0]?.productId,
        transactionId: purchase[0]?.transactionId,
        receipt: purchase[0]?.transactionReceipt,
      };
    } catch (error: any) {
      console.error('Error purchasing product:', error);

      if (error.code === 'E_USER_CANCELLED') {
        return {
          success: false,
          error: 'Purchase was cancelled',
        };
      }

      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Subscribe to a subscription
   */
  async purchaseSubscription(subscriptionId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const purchase = await requestSubscription({ sku: subscriptionId });

      return {
        success: true,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        receipt: purchase.transactionReceipt,
      };
    } catch (error: any) {
      console.error('Error purchasing subscription:', error);

      if (error.code === 'E_USER_CANCELLED') {
        return {
          success: false,
          error: 'Subscription was cancelled',
        };
      }

      return {
        success: false,
        error: error.message || 'Subscription failed',
      };
    }
  }

  /**
   * Verify purchase with backend
   */
  private async verifyPurchaseWithBackend(purchase: Purchase): Promise<void> {
    try {
      // Send purchase receipt to backend for verification
      // This prevents fraud and ensures purchases are valid
      const response = await fetch(`${process.env.API_URL}/api/purchases/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: Platform.OS,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          receipt: purchase.transactionReceipt,
          purchaseToken: purchase.purchaseToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Purchase verification failed');
      }

      const data = await response.json();
      console.log('Purchase verified:', data);
    } catch (error) {
      console.error('Error verifying purchase:', error);
      throw error;
    }
  }

  /**
   * Check if product is consumable
   */
  private isConsumable(productId: string): boolean {
    return Object.values(CONSUMABLE_SKUS).includes(productId);
  }

  /**
   * Get available purchases (previously purchased items)
   */
  async getAvailablePurchases(): Promise<Purchase[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const purchases = await getAvailablePurchases();
      console.log('Available purchases:', purchases);
      return purchases;
    } catch (error) {
      console.error('Error getting available purchases:', error);
      return [];
    }
  }

  /**
   * Restore purchases (mainly for iOS)
   */
  async restorePurchases(): Promise<Purchase[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const availablePurchases = await getAvailablePurchases();
      console.log('Restoring purchases:', availablePurchases);

      if (availablePurchases.length === 0) {
        Alert.alert('No Purchases', 'No previous purchases found to restore.');
        return [];
      }

      // Process each restored purchase
      for (const purchase of availablePurchases) {
        try {
          // Verify each restored purchase with backend
          await this.verifyPurchaseWithBackend(purchase);
          this.emit('purchaseRestored', purchase);
        } catch (error) {
          console.error('Error verifying restored purchase:', error);
        }
      }

      Alert.alert('Success', `${availablePurchases.length} purchase(s) have been restored.`);
      return availablePurchases;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      return [];
    }
  }

  /**
   * Get formatted price string
   */
  getFormattedPrice(product: Product | Subscription): string {
    return product.localizedPrice || product.price;
  }

  /**
   * Get subscription period
   */
  getSubscriptionPeriod(subscription: Subscription): string {
    // Parse subscription period from subscription data
    if (subscription.productId.includes('monthly')) {
      return '1 month';
    } else if (subscription.productId.includes('6months')) {
      return '6 months';
    } else if (subscription.productId.includes('yearly')) {
      return '1 year';
    }
    return 'Unknown';
  }

  /**
   * Calculate savings percentage
   */
  calculateSavings(monthlyPrice: number, bundlePrice: number, months: number): number {
    const totalMonthlyPrice = monthlyPrice * months;
    const savings = ((totalMonthlyPrice - bundlePrice) / totalMonthlyPrice) * 100;
    return Math.round(savings);
  }
}

export const InAppPurchaseService = new InAppPurchaseServiceClass();
