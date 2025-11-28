/**
 * Google Play Billing Provider
 * Handles Android in-app purchases and subscriptions via Google Play
 */

import { google, androidpublisher_v3 } from 'googleapis';
import { BasePaymentProvider } from './BaseProvider';
import {
  IIAPProvider,
  IAPValidationResult,
  IAPSubscriptionStatus,
  IAPNotificationResult,
} from './PaymentProvider.interface';
import {
  PaymentProvider,
  PaymentCustomer,
  PaymentMethod,
  PaymentIntent,
  Subscription,
  Refund,
  CreateCustomerRequest,
  CreatePaymentIntentRequest,
  CreateSubscriptionRequest,
  CancelSubscriptionRequest,
  RefundRequest,
  TransactionStatus,
  SubscriptionStatus,
  WebhookEvent,
  WebhookProcessingResult,
  WebhookEventType,
  PaymentMethodType,
  BillingPeriod,
  PaymentError,
  PaymentProviderError,
  SubscriptionTier,
} from '../types';

export class GooglePlayProvider extends BasePaymentProvider implements IIAPProvider {
  readonly provider = PaymentProvider.GOOGLE_PLAY;
  private androidPublisher: androidpublisher_v3.Androidpublisher | null = null;
  private packageName: string | null = null;

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    this.packageName = process.env.GOOGLE_PACKAGE_NAME || null;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!this.packageName || !serviceAccountKey) {
      this.log('warn', 'Google Play credentials not configured');
      this._isConfigured = false;
      return;
    }

    try {
      let credentials;

      // Parse service account key (can be JSON string or path)
      if (serviceAccountKey.startsWith('{')) {
        credentials = JSON.parse(serviceAccountKey);
      } else {
        // It's a path to the credentials file
        const fs = await import('fs');
        credentials = JSON.parse(fs.readFileSync(serviceAccountKey, 'utf8'));
      }

      // Create auth client
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      // Create Android Publisher client
      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth,
      });

      this._isConfigured = true;
      this.log('info', 'Google Play provider initialized successfully');
    } catch (error: any) {
      this.log('error', 'Failed to initialize Google Play', { error: error.message });
      this._isConfigured = false;
    }
  }

  // ============================================
  // PURCHASE VALIDATION
  // ============================================

  async validateReceipt(
    purchaseToken: string,
    productId: string,
    isSubscription: boolean
  ): Promise<IAPValidationResult> {
    this.ensureConfigured();

    try {
      if (isSubscription) {
        return await this.validateSubscriptionPurchase(purchaseToken, productId);
      } else {
        return await this.validateProductPurchase(purchaseToken, productId);
      }
    } catch (error: any) {
      this.log('error', 'Google Play purchase validation failed', { error: error.message });
      return {
        valid: false,
        productId,
        transactionId: '',
        originalTransactionId: '',
        purchaseDate: new Date(),
        isTrialPeriod: false,
        isRenewal: false,
        environment: 'production',
        rawResponse: null,
        error: error.message,
      };
    }
  }

  private async validateProductPurchase(
    purchaseToken: string,
    productId: string
  ): Promise<IAPValidationResult> {
    try {
      const response = await this.androidPublisher!.purchases.products.get({
        packageName: this.packageName!,
        productId,
        token: purchaseToken,
      });

      const purchase = response.data;

      // Check purchase state
      // 0 = Purchased, 1 = Canceled, 2 = Pending
      if (purchase.purchaseState !== 0) {
        return {
          valid: false,
          productId,
          transactionId: purchase.orderId || '',
          originalTransactionId: purchase.orderId || '',
          purchaseDate: new Date(parseInt(purchase.purchaseTimeMillis || '0', 10)),
          isTrialPeriod: false,
          isRenewal: false,
          environment: purchase.purchaseType === 0 ? 'sandbox' : 'production',
          rawResponse: purchase,
          error: purchase.purchaseState === 1 ? 'Purchase was canceled' : 'Purchase is pending',
        };
      }

      // Check acknowledgement state
      const isAcknowledged = purchase.acknowledgementState === 1;

      this.log('info', 'Google Play product purchase validated', {
        orderId: purchase.orderId,
        productId,
        acknowledged: isAcknowledged,
      });

      return {
        valid: true,
        productId,
        transactionId: purchase.orderId || '',
        originalTransactionId: purchase.orderId || '',
        purchaseDate: new Date(parseInt(purchase.purchaseTimeMillis || '0', 10)),
        isTrialPeriod: false,
        isRenewal: false,
        environment: purchase.purchaseType === 0 ? 'sandbox' : 'production',
        rawResponse: purchase,
      };
    } catch (error: any) {
      throw new PaymentProviderError(
        `Failed to validate product purchase: ${error.message}`,
        PaymentProvider.GOOGLE_PLAY,
        error.code,
        error
      );
    }
  }

  private async validateSubscriptionPurchase(
    purchaseToken: string,
    productId: string
  ): Promise<IAPValidationResult> {
    try {
      const response = await this.androidPublisher!.purchases.subscriptions.get({
        packageName: this.packageName!,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const subscription = response.data;

      // Check expiry time
      const expiryTime = new Date(parseInt(subscription.expiryTimeMillis || '0', 10));
      const isExpired = expiryTime < new Date();

      // Check for cancellation
      if (subscription.cancelReason !== undefined && subscription.cancelReason !== null) {
        const cancelReasons: Record<number, string> = {
          0: 'User canceled',
          1: 'System canceled',
          2: 'Replaced with a new subscription',
          3: 'Developer canceled',
        };

        return {
          valid: false,
          productId,
          transactionId: subscription.orderId || '',
          originalTransactionId: subscription.linkedPurchaseToken || subscription.orderId || '',
          purchaseDate: new Date(parseInt(subscription.startTimeMillis || '0', 10)),
          expirationDate: expiryTime,
          isTrialPeriod: subscription.paymentState === 2,
          isRenewal: !!subscription.linkedPurchaseToken,
          autoRenewStatus: subscription.autoRenewing,
          cancellationDate: subscription.userCancellationTimeMillis
            ? new Date(parseInt(subscription.userCancellationTimeMillis, 10))
            : undefined,
          cancellationReason: cancelReasons[subscription.cancelReason as number] || 'Unknown',
          environment: subscription.purchaseType === 0 ? 'sandbox' : 'production',
          rawResponse: subscription,
          error: 'Subscription was canceled',
        };
      }

      if (isExpired && !subscription.autoRenewing) {
        return {
          valid: false,
          productId,
          transactionId: subscription.orderId || '',
          originalTransactionId: subscription.linkedPurchaseToken || subscription.orderId || '',
          purchaseDate: new Date(parseInt(subscription.startTimeMillis || '0', 10)),
          expirationDate: expiryTime,
          isTrialPeriod: subscription.paymentState === 2,
          isRenewal: !!subscription.linkedPurchaseToken,
          autoRenewStatus: false,
          environment: subscription.purchaseType === 0 ? 'sandbox' : 'production',
          rawResponse: subscription,
          error: 'Subscription expired',
        };
      }

      // Check payment state
      // 0 = Payment pending, 1 = Payment received, 2 = Free trial, 3 = Pending deferred upgrade/downgrade
      const isValid = subscription.paymentState === 1 || subscription.paymentState === 2;

      this.log('info', 'Google Play subscription validated', {
        orderId: subscription.orderId,
        productId,
        expiryTime: expiryTime.toISOString(),
        autoRenewing: subscription.autoRenewing,
      });

      return {
        valid: isValid || !isExpired, // Valid if paid/trial or not yet expired
        productId,
        transactionId: subscription.orderId || '',
        originalTransactionId: subscription.linkedPurchaseToken || subscription.orderId || '',
        purchaseDate: new Date(parseInt(subscription.startTimeMillis || '0', 10)),
        expirationDate: expiryTime,
        isTrialPeriod: subscription.paymentState === 2,
        isIntroductoryPeriod: !!subscription.introductoryPriceInfo,
        isRenewal: !!subscription.linkedPurchaseToken,
        autoRenewStatus: subscription.autoRenewing,
        environment: subscription.purchaseType === 0 ? 'sandbox' : 'production',
        rawResponse: subscription,
      };
    } catch (error: any) {
      throw new PaymentProviderError(
        `Failed to validate subscription: ${error.message}`,
        PaymentProvider.GOOGLE_PLAY,
        error.code,
        error
      );
    }
  }

  // ============================================
  // PURCHASE ACKNOWLEDGEMENT
  // ============================================

  async acknowledgePurchase(purchaseToken: string, productId?: string, isSubscription: boolean = false): Promise<void> {
    this.ensureConfigured();

    try {
      if (isSubscription && productId) {
        await this.androidPublisher!.purchases.subscriptions.acknowledge({
          packageName: this.packageName!,
          subscriptionId: productId,
          token: purchaseToken,
        });
      } else if (productId) {
        await this.androidPublisher!.purchases.products.acknowledge({
          packageName: this.packageName!,
          productId,
          token: purchaseToken,
        });
      }

      this.log('info', 'Purchase acknowledged', { purchaseToken: purchaseToken.substring(0, 20) + '...' });
    } catch (error: any) {
      this.log('error', 'Failed to acknowledge purchase', { error: error.message });
      throw new PaymentProviderError(
        `Failed to acknowledge purchase: ${error.message}`,
        PaymentProvider.GOOGLE_PLAY,
        error.code,
        error
      );
    }
  }

  async getSubscriptionStatus(purchaseToken: string): Promise<IAPSubscriptionStatus> {
    this.ensureConfigured();

    throw new PaymentError(
      'Use validateReceipt with productId for subscription status',
      'NOT_IMPLEMENTED',
      this.provider
    );
  }

  // ============================================
  // REAL-TIME DEVELOPER NOTIFICATIONS (RTDN)
  // ============================================

  async handleServerNotification(payload: any): Promise<IAPNotificationResult> {
    try {
      // Google sends base64 encoded data
      let notification;

      if (typeof payload === 'string') {
        notification = JSON.parse(Buffer.from(payload, 'base64').toString());
      } else if (payload.message?.data) {
        // Pub/Sub format
        notification = JSON.parse(Buffer.from(payload.message.data, 'base64').toString());
      } else {
        notification = payload;
      }

      this.log('info', 'Processing Google Play notification', {
        type: notification.subscriptionNotification?.notificationType ||
              notification.oneTimeProductNotification?.notificationType,
      });

      // Handle subscription notification
      if (notification.subscriptionNotification) {
        return this.handleSubscriptionNotification(notification);
      }

      // Handle one-time product notification
      if (notification.oneTimeProductNotification) {
        return this.handleOneTimeProductNotification(notification);
      }

      // Handle voided purchase notification
      if (notification.voidedPurchaseNotification) {
        return {
          notificationType: 'VOIDED_PURCHASE',
          originalTransactionId: notification.voidedPurchaseNotification.orderId,
          productId: notification.voidedPurchaseNotification.productId,
          action: 'refund',
          metadata: notification,
        };
      }

      return {
        notificationType: 'UNKNOWN',
        action: 'none',
        metadata: notification,
      };
    } catch (error: any) {
      this.log('error', 'Failed to handle Google Play notification', { error: error.message });
      throw error;
    }
  }

  private handleSubscriptionNotification(notification: any): IAPNotificationResult {
    const subNotif = notification.subscriptionNotification;

    // Notification types
    // 1 = SUBSCRIPTION_RECOVERED (recovered from account hold)
    // 2 = SUBSCRIPTION_RENEWED
    // 3 = SUBSCRIPTION_CANCELED
    // 4 = SUBSCRIPTION_PURCHASED
    // 5 = SUBSCRIPTION_ON_HOLD
    // 6 = SUBSCRIPTION_IN_GRACE_PERIOD
    // 7 = SUBSCRIPTION_RESTARTED
    // 8 = SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
    // 9 = SUBSCRIPTION_DEFERRED
    // 10 = SUBSCRIPTION_PAUSED
    // 11 = SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
    // 12 = SUBSCRIPTION_REVOKED
    // 13 = SUBSCRIPTION_EXPIRED

    const notificationTypes: Record<number, string> = {
      1: 'SUBSCRIPTION_RECOVERED',
      2: 'SUBSCRIPTION_RENEWED',
      3: 'SUBSCRIPTION_CANCELED',
      4: 'SUBSCRIPTION_PURCHASED',
      5: 'SUBSCRIPTION_ON_HOLD',
      6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
      7: 'SUBSCRIPTION_RESTARTED',
      8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
      9: 'SUBSCRIPTION_DEFERRED',
      10: 'SUBSCRIPTION_PAUSED',
      11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
      12: 'SUBSCRIPTION_REVOKED',
      13: 'SUBSCRIPTION_EXPIRED',
    };

    const notificationType = notificationTypes[subNotif.notificationType] || 'UNKNOWN';
    let action: 'update_subscription' | 'cancel_subscription' | 'refund' | 'none' = 'none';

    switch (subNotif.notificationType) {
      case 1: // RECOVERED
      case 2: // RENEWED
      case 4: // PURCHASED
      case 7: // RESTARTED
      case 8: // PRICE_CHANGE_CONFIRMED
        action = 'update_subscription';
        break;

      case 3: // CANCELED
      case 5: // ON_HOLD
      case 10: // PAUSED
      case 13: // EXPIRED
        action = 'cancel_subscription';
        break;

      case 12: // REVOKED
        action = 'refund';
        break;

      case 6: // GRACE_PERIOD
      case 9: // DEFERRED
      case 11: // PAUSE_SCHEDULE_CHANGED
        action = 'update_subscription';
        break;
    }

    return {
      notificationType,
      originalTransactionId: subNotif.purchaseToken,
      productId: subNotif.subscriptionId,
      action,
      metadata: {
        packageName: notification.packageName,
        purchaseToken: subNotif.purchaseToken,
        subscriptionId: subNotif.subscriptionId,
        rawNotificationType: subNotif.notificationType,
      },
    };
  }

  private handleOneTimeProductNotification(notification: any): IAPNotificationResult {
    const productNotif = notification.oneTimeProductNotification;

    // 1 = ONE_TIME_PRODUCT_PURCHASED
    // 2 = ONE_TIME_PRODUCT_CANCELED

    const notificationType = productNotif.notificationType === 1
      ? 'ONE_TIME_PRODUCT_PURCHASED'
      : 'ONE_TIME_PRODUCT_CANCELED';

    return {
      notificationType,
      originalTransactionId: productNotif.purchaseToken,
      productId: productNotif.sku,
      action: productNotif.notificationType === 1 ? 'update_subscription' : 'refund',
      metadata: {
        packageName: notification.packageName,
        purchaseToken: productNotif.purchaseToken,
        sku: productNotif.sku,
      },
    };
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  async cancelSubscription(
    purchaseToken: string,
    subscriptionId: string
  ): Promise<void> {
    this.ensureConfigured();

    try {
      await this.androidPublisher!.purchases.subscriptions.cancel({
        packageName: this.packageName!,
        subscriptionId,
        token: purchaseToken,
      });

      this.log('info', 'Subscription canceled', { subscriptionId });
    } catch (error: any) {
      throw new PaymentProviderError(
        `Failed to cancel subscription: ${error.message}`,
        PaymentProvider.GOOGLE_PLAY,
        error.code,
        error
      );
    }
  }

  async refundSubscription(
    purchaseToken: string,
    subscriptionId: string
  ): Promise<void> {
    this.ensureConfigured();

    try {
      await this.androidPublisher!.purchases.subscriptions.refund({
        packageName: this.packageName!,
        subscriptionId,
        token: purchaseToken,
      });

      this.log('info', 'Subscription refunded', { subscriptionId });
    } catch (error: any) {
      throw new PaymentProviderError(
        `Failed to refund subscription: ${error.message}`,
        PaymentProvider.GOOGLE_PLAY,
        error.code,
        error
      );
    }
  }

  async deferSubscription(
    purchaseToken: string,
    subscriptionId: string,
    expectedExpiryTimeMillis: number,
    desiredExpiryTimeMillis: number
  ): Promise<number> {
    this.ensureConfigured();

    try {
      const response = await this.androidPublisher!.purchases.subscriptions.defer({
        packageName: this.packageName!,
        subscriptionId,
        token: purchaseToken,
        requestBody: {
          deferralInfo: {
            expectedExpiryTimeMillis: expectedExpiryTimeMillis.toString(),
            desiredExpiryTimeMillis: desiredExpiryTimeMillis.toString(),
          },
        },
      });

      const newExpiry = parseInt(response.data.newExpiryTimeMillis || '0', 10);
      this.log('info', 'Subscription deferred', { subscriptionId, newExpiry: new Date(newExpiry).toISOString() });

      return newExpiry;
    } catch (error: any) {
      throw new PaymentProviderError(
        `Failed to defer subscription: ${error.message}`,
        PaymentProvider.GOOGLE_PLAY,
        error.code,
        error
      );
    }
  }

  // ============================================
  // STANDARD PROVIDER METHODS (Limited for IAP)
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    return {
      id: request.userId,
      providerCustomerId: `google_${request.userId}`,
      provider: PaymentProvider.GOOGLE_PLAY,
      email: request.email,
      name: request.name,
      metadata: request.metadata,
      createdAt: new Date(),
    };
  }

  async getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null> {
    return null;
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer> {
    throw new PaymentError('Google Play does not support customer management', 'NOT_SUPPORTED', this.provider);
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    // No-op
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    throw new PaymentError('Google Play does not support payment methods', 'NOT_SUPPORTED', this.provider);
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    throw new PaymentError('Google Play does not support payment methods', 'NOT_SUPPORTED', this.provider);
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    return [];
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    throw new PaymentError('Google Play does not support payment methods', 'NOT_SUPPORTED', this.provider);
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    return null;
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    throw new PaymentError(
      'Google Play payments are handled client-side through Play Billing Library',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    throw new PaymentError('Use validateReceipt instead', 'NOT_SUPPORTED', this.provider);
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    throw new PaymentError('Not supported', 'NOT_SUPPORTED', this.provider);
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    return null;
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    throw new PaymentError(
      'Google Play subscriptions are created through Play Billing Library. Use validateReceipt after purchase.',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    return null;
  }

  async updateSubscription(
    providerSubscriptionId: string,
    updates: any
  ): Promise<Subscription> {
    throw new PaymentError('Subscription management is done through Google Play', 'NOT_SUPPORTED', this.provider);
  }

  // Implemented cancelSubscription with different signature above

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    throw new PaymentError(
      'Google Play subscriptions must be reactivated through Play Store app',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async createRefund(request: RefundRequest): Promise<Refund> {
    throw new PaymentError(
      'Google Play refunds are handled through Play Console or refundSubscription method',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    return null;
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    // Google uses Pub/Sub which has its own verification
    return true;
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    try {
      let data;

      if (typeof payload === 'string') {
        // Try to parse as JSON first
        try {
          data = JSON.parse(payload);
        } catch {
          // Might be base64 encoded
          data = JSON.parse(Buffer.from(payload, 'base64').toString());
        }
      } else {
        data = JSON.parse(payload.toString());
      }

      // Handle Pub/Sub format
      if (data.message?.data) {
        data = JSON.parse(Buffer.from(data.message.data, 'base64').toString());
      }

      const eventType = data.subscriptionNotification
        ? `subscription.${data.subscriptionNotification.notificationType}`
        : data.oneTimeProductNotification
          ? `product.${data.oneTimeProductNotification.notificationType}`
          : 'unknown';

      return {
        id: `google_${Date.now()}`,
        provider: PaymentProvider.GOOGLE_PLAY,
        eventType: this.mapGoogleEventType(eventType),
        eventId: data.subscriptionNotification?.purchaseToken || data.oneTimeProductNotification?.purchaseToken || '',
        data,
        timestamp: new Date(),
        rawPayload: typeof payload === 'string' ? payload : payload.toString(),
      };
    } catch (error: any) {
      this.log('error', 'Failed to parse Google Play webhook', { error: error.message });
      return null;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    const result = await this.handleServerNotification(event.data);

    return {
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
      message: `Google Play notification ${result.notificationType} processed with action: ${result.action}`,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getSupportedPaymentMethods(): PaymentMethodType[] {
    return [PaymentMethodType.GOOGLE_PAY];
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR', 'BRL', 'MXN', 'NGN', 'ZAR', 'GHS', 'KES'];
  }

  mapTransactionStatus(googleStatus: string): TransactionStatus {
    return TransactionStatus.SUCCEEDED;
  }

  mapSubscriptionStatus(googleStatus: string): SubscriptionStatus {
    return SubscriptionStatus.ACTIVE;
  }

  private mapGoogleEventType(eventType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'subscription.1': WebhookEventType.SUBSCRIPTION_RENEWED, // RECOVERED
      'subscription.2': WebhookEventType.SUBSCRIPTION_RENEWED,
      'subscription.3': WebhookEventType.SUBSCRIPTION_CANCELED,
      'subscription.4': WebhookEventType.SUBSCRIPTION_CREATED, // PURCHASED
      'subscription.5': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED, // ON_HOLD
      'subscription.6': WebhookEventType.SUBSCRIPTION_UPDATED, // GRACE_PERIOD
      'subscription.7': WebhookEventType.SUBSCRIPTION_CREATED, // RESTARTED
      'subscription.12': WebhookEventType.PAYMENT_REFUNDED, // REVOKED
      'subscription.13': WebhookEventType.SUBSCRIPTION_CANCELED, // EXPIRED
      'product.1': WebhookEventType.PAYMENT_SUCCEEDED,
      'product.2': WebhookEventType.PAYMENT_REFUNDED,
    };
    return eventMap[eventType] || WebhookEventType.IAP_PURCHASE_VALIDATED;
  }
}

// Export singleton instance
export const googlePlayProvider = new GooglePlayProvider();
