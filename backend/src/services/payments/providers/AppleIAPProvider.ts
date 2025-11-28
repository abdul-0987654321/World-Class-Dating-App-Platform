/**
 * Apple In-App Purchase Provider
 * Handles iOS StoreKit purchases and App Store Server Notifications
 */

import axios from 'axios';
import * as jwt from 'jsonwebtoken';
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

interface AppleReceiptData {
  receipt: {
    bundle_id: string;
    in_app: AppleInAppPurchase[];
  };
  latest_receipt_info?: AppleInAppPurchase[];
  pending_renewal_info?: ApplePendingRenewal[];
  status: number;
  environment: string;
}

interface AppleInAppPurchase {
  product_id: string;
  transaction_id: string;
  original_transaction_id: string;
  purchase_date_ms: string;
  expires_date_ms?: string;
  is_trial_period: string;
  is_in_intro_offer_period?: string;
  cancellation_date_ms?: string;
  cancellation_reason?: string;
  quantity: string;
  web_order_line_item_id?: string;
}

interface ApplePendingRenewal {
  auto_renew_product_id: string;
  auto_renew_status: string;
  original_transaction_id: string;
  product_id: string;
  expiration_intent?: string;
  grace_period_expires_date_ms?: string;
  price_consent_status?: string;
}

export class AppleIAPProvider extends BasePaymentProvider implements IIAPProvider {
  readonly provider = PaymentProvider.APPLE_IAP;
  private sharedSecret: string | null = null;
  private bundleId: string | null = null;
  private isProduction: boolean = false;

  private readonly sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
  private readonly productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';

  // Apple App Store Server API (newer API)
  private readonly appStoreServerUrl = 'https://api.storekit.itunes.apple.com';
  private readonly sandboxAppStoreServerUrl = 'https://api.storekit-sandbox.itunes.apple.com';

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    this.sharedSecret = process.env.APPLE_SHARED_SECRET || null;
    this.bundleId = process.env.APPLE_BUNDLE_ID || null;
    this.isProduction = process.env.APPLE_IS_PRODUCTION === 'true';

    if (!this.sharedSecret || !this.bundleId) {
      this.log('warn', 'Apple IAP credentials not configured');
      this._isConfigured = false;
      return;
    }

    this._isConfigured = true;
    this.log('info', `Apple IAP provider initialized (${this.isProduction ? 'production' : 'sandbox'})`);
  }

  private get verifyUrl(): string {
    return this.isProduction ? this.productionUrl : this.sandboxUrl;
  }

  // ============================================
  // IAP RECEIPT VALIDATION
  // ============================================

  async validateReceipt(
    receipt: string,
    productId: string,
    isSubscription: boolean
  ): Promise<IAPValidationResult> {
    this.ensureConfigured();

    try {
      // First try production URL
      let response = await this.verifyReceiptWithApple(receipt, this.productionUrl);

      // If status is 21007, the receipt is from sandbox - retry with sandbox
      if (response.status === 21007) {
        this.log('info', 'Receipt is from sandbox, retrying with sandbox URL');
        response = await this.verifyReceiptWithApple(receipt, this.sandboxUrl);
      }

      // Status 21008 means receipt is from production but we used sandbox
      if (response.status === 21008) {
        this.log('info', 'Receipt is from production, retrying with production URL');
        response = await this.verifyReceiptWithApple(receipt, this.productionUrl);
      }

      // Check receipt status
      if (response.status !== 0) {
        return {
          valid: false,
          productId,
          transactionId: '',
          originalTransactionId: '',
          purchaseDate: new Date(),
          isTrialPeriod: false,
          isRenewal: false,
          environment: response.environment === 'Production' ? 'production' : 'sandbox',
          rawResponse: response,
          error: this.getAppleErrorMessage(response.status),
        };
      }

      // Verify bundle ID
      if (response.receipt?.bundle_id !== this.bundleId) {
        return {
          valid: false,
          productId,
          transactionId: '',
          originalTransactionId: '',
          purchaseDate: new Date(),
          isTrialPeriod: false,
          isRenewal: false,
          environment: response.environment === 'Production' ? 'production' : 'sandbox',
          rawResponse: response,
          error: 'Bundle ID mismatch',
        };
      }

      // Find the relevant purchase
      const purchases = response.latest_receipt_info || response.receipt?.in_app || [];
      const purchase = purchases.find((p: AppleInAppPurchase) => p.product_id === productId);

      if (!purchase) {
        return {
          valid: false,
          productId,
          transactionId: '',
          originalTransactionId: '',
          purchaseDate: new Date(),
          isTrialPeriod: false,
          isRenewal: false,
          environment: response.environment === 'Production' ? 'production' : 'sandbox',
          rawResponse: response,
          error: 'Product not found in receipt',
        };
      }

      // Check if subscription is still valid
      if (isSubscription && purchase.expires_date_ms) {
        const expiresAt = new Date(parseInt(purchase.expires_date_ms, 10));
        if (expiresAt < new Date()) {
          // Check for grace period
          const pendingRenewal = response.pending_renewal_info?.find(
            (p: ApplePendingRenewal) => p.original_transaction_id === purchase.original_transaction_id
          );

          if (pendingRenewal?.grace_period_expires_date_ms) {
            const graceExpires = new Date(parseInt(pendingRenewal.grace_period_expires_date_ms, 10));
            if (graceExpires < new Date()) {
              return {
                valid: false,
                productId: purchase.product_id,
                transactionId: purchase.transaction_id,
                originalTransactionId: purchase.original_transaction_id,
                purchaseDate: new Date(parseInt(purchase.purchase_date_ms, 10)),
                expirationDate: expiresAt,
                isTrialPeriod: purchase.is_trial_period === 'true',
                isRenewal: purchase.transaction_id !== purchase.original_transaction_id,
                environment: response.environment === 'Production' ? 'production' : 'sandbox',
                rawResponse: response,
                error: 'Subscription expired',
              };
            }
          } else {
            return {
              valid: false,
              productId: purchase.product_id,
              transactionId: purchase.transaction_id,
              originalTransactionId: purchase.original_transaction_id,
              purchaseDate: new Date(parseInt(purchase.purchase_date_ms, 10)),
              expirationDate: expiresAt,
              isTrialPeriod: purchase.is_trial_period === 'true',
              isRenewal: purchase.transaction_id !== purchase.original_transaction_id,
              environment: response.environment === 'Production' ? 'production' : 'sandbox',
              rawResponse: response,
              error: 'Subscription expired',
            };
          }
        }
      }

      // Check for cancellation
      if (purchase.cancellation_date_ms) {
        return {
          valid: false,
          productId: purchase.product_id,
          transactionId: purchase.transaction_id,
          originalTransactionId: purchase.original_transaction_id,
          purchaseDate: new Date(parseInt(purchase.purchase_date_ms, 10)),
          expirationDate: purchase.expires_date_ms ? new Date(parseInt(purchase.expires_date_ms, 10)) : undefined,
          isTrialPeriod: purchase.is_trial_period === 'true',
          isRenewal: purchase.transaction_id !== purchase.original_transaction_id,
          cancellationDate: new Date(parseInt(purchase.cancellation_date_ms, 10)),
          cancellationReason: purchase.cancellation_reason,
          environment: response.environment === 'Production' ? 'production' : 'sandbox',
          rawResponse: response,
          error: 'Purchase was refunded/canceled',
        };
      }

      // Get auto-renew status
      const pendingRenewal = response.pending_renewal_info?.find(
        (p: ApplePendingRenewal) => p.original_transaction_id === purchase.original_transaction_id
      );

      this.log('info', 'Apple receipt validated successfully', {
        transactionId: purchase.transaction_id,
        productId: purchase.product_id,
      });

      return {
        valid: true,
        productId: purchase.product_id,
        transactionId: purchase.transaction_id,
        originalTransactionId: purchase.original_transaction_id,
        purchaseDate: new Date(parseInt(purchase.purchase_date_ms, 10)),
        expirationDate: purchase.expires_date_ms ? new Date(parseInt(purchase.expires_date_ms, 10)) : undefined,
        isTrialPeriod: purchase.is_trial_period === 'true',
        isIntroductoryPeriod: purchase.is_in_intro_offer_period === 'true',
        isRenewal: purchase.transaction_id !== purchase.original_transaction_id,
        autoRenewStatus: pendingRenewal?.auto_renew_status === '1',
        environment: response.environment === 'Production' ? 'production' : 'sandbox',
        rawResponse: response,
      };
    } catch (error: any) {
      this.log('error', 'Apple receipt validation failed', { error: error.message });
      return {
        valid: false,
        productId,
        transactionId: '',
        originalTransactionId: '',
        purchaseDate: new Date(),
        isTrialPeriod: false,
        isRenewal: false,
        environment: 'sandbox',
        rawResponse: null,
        error: error.message,
      };
    }
  }

  private async verifyReceiptWithApple(receipt: string, url: string): Promise<AppleReceiptData> {
    const response = await axios.post(url, {
      'receipt-data': receipt,
      password: this.sharedSecret,
      'exclude-old-transactions': true,
    });

    return response.data;
  }

  async getSubscriptionStatus(originalTransactionId: string): Promise<IAPSubscriptionStatus> {
    // This would use the App Store Server API for more detailed status
    // For now, we rely on the receipt validation which includes this info
    throw new PaymentError(
      'Use validateReceipt for subscription status',
      'NOT_IMPLEMENTED',
      this.provider
    );
  }

  // ============================================
  // SERVER NOTIFICATIONS (App Store Server Notifications V2)
  // ============================================

  async handleServerNotification(payload: any): Promise<IAPNotificationResult> {
    try {
      // V2 notifications are JWS (JSON Web Signature)
      // The payload is a signed JWT
      const signedPayload = payload.signedPayload;

      if (!signedPayload) {
        // V1 notification format
        return this.handleV1Notification(payload);
      }

      // Decode the JWT (in production, verify signature with Apple's certificate)
      const decoded = jwt.decode(signedPayload) as any;

      if (!decoded) {
        throw new PaymentError('Invalid notification payload', 'INVALID_PAYLOAD', this.provider);
      }

      const notificationType = decoded.notificationType;
      const data = decoded.data;

      // Decode the transaction info
      const transactionInfo = data?.signedTransactionInfo
        ? jwt.decode(data.signedTransactionInfo) as any
        : null;

      const renewalInfo = data?.signedRenewalInfo
        ? jwt.decode(data.signedRenewalInfo) as any
        : null;

      this.log('info', 'Processing Apple notification', { type: notificationType });

      // Map notification type to action
      const result: IAPNotificationResult = {
        notificationType,
        originalTransactionId: transactionInfo?.originalTransactionId,
        productId: transactionInfo?.productId,
        action: 'none',
        metadata: {
          environment: data?.environment,
          bundleId: data?.bundleId,
          transactionInfo,
          renewalInfo,
        },
      };

      switch (notificationType) {
        case 'SUBSCRIBED':
        case 'DID_RENEW':
          result.action = 'update_subscription';
          break;

        case 'DID_CHANGE_RENEWAL_STATUS':
          if (renewalInfo?.autoRenewStatus === 0) {
            result.action = 'cancel_subscription';
          } else {
            result.action = 'update_subscription';
          }
          break;

        case 'EXPIRED':
        case 'DID_FAIL_TO_RENEW':
          result.action = 'cancel_subscription';
          break;

        case 'REFUND':
        case 'REVOKE':
          result.action = 'refund';
          break;

        case 'GRACE_PERIOD_EXPIRED':
          result.action = 'cancel_subscription';
          break;

        case 'OFFER_REDEEMED':
        case 'RENEWAL_EXTENDED':
          result.action = 'update_subscription';
          break;

        default:
          result.action = 'none';
      }

      return result;
    } catch (error: any) {
      this.log('error', 'Failed to handle Apple notification', { error: error.message });
      throw error;
    }
  }

  private handleV1Notification(payload: any): IAPNotificationResult {
    const notificationType = payload.notification_type;
    const latestReceipt = payload.latest_receipt_info?.[0];

    return {
      notificationType,
      originalTransactionId: latestReceipt?.original_transaction_id,
      productId: latestReceipt?.product_id,
      action: this.mapV1NotificationType(notificationType),
      metadata: {
        environment: payload.environment,
        latestReceipt,
      },
    };
  }

  private mapV1NotificationType(type: string): 'update_subscription' | 'cancel_subscription' | 'refund' | 'none' {
    const actionMap: Record<string, 'update_subscription' | 'cancel_subscription' | 'refund' | 'none'> = {
      INITIAL_BUY: 'update_subscription',
      DID_RENEW: 'update_subscription',
      DID_CHANGE_RENEWAL_PREF: 'update_subscription',
      DID_CHANGE_RENEWAL_STATUS: 'update_subscription',
      DID_FAIL_TO_RENEW: 'cancel_subscription',
      CANCEL: 'cancel_subscription',
      REFUND: 'refund',
      REVOKE: 'refund',
    };
    return actionMap[type] || 'none';
  }

  private getAppleErrorMessage(status: number): string {
    const errorMessages: Record<number, string> = {
      21000: 'The App Store could not read the JSON object you provided.',
      21002: 'The data in the receipt-data property was malformed or missing.',
      21003: 'The receipt could not be authenticated.',
      21004: 'The shared secret you provided does not match the shared secret on file.',
      21005: 'The receipt server is not currently available.',
      21006: 'This receipt is valid but the subscription has expired.',
      21007: 'This receipt is from the test environment, but it was sent to the production environment.',
      21008: 'This receipt is from the production environment, but it was sent to the test environment.',
      21009: 'Internal data access error.',
      21010: 'The user account cannot be found or has been deleted.',
    };
    return errorMessages[status] || `Unknown error: ${status}`;
  }

  // ============================================
  // STANDARD PROVIDER METHODS (Limited for IAP)
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    // Apple doesn't have customer management - we track locally
    return {
      id: request.userId,
      providerCustomerId: `apple_${request.userId}`,
      provider: PaymentProvider.APPLE_IAP,
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
    throw new PaymentError('Apple IAP does not support customer management', 'NOT_SUPPORTED', this.provider);
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    // No-op
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    throw new PaymentError('Apple IAP does not support payment methods', 'NOT_SUPPORTED', this.provider);
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    throw new PaymentError('Apple IAP does not support payment methods', 'NOT_SUPPORTED', this.provider);
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    return [];
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    throw new PaymentError('Apple IAP does not support payment methods', 'NOT_SUPPORTED', this.provider);
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    return null;
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    throw new PaymentError(
      'Apple IAP payments are handled client-side through StoreKit',
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
    // Subscriptions are created client-side through StoreKit
    // Backend receives receipt for validation
    throw new PaymentError(
      'Apple subscriptions are created through StoreKit. Use validateReceipt after purchase.',
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
    throw new PaymentError('Subscription management is done through Apple', 'NOT_SUPPORTED', this.provider);
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    throw new PaymentError(
      'Apple subscriptions must be canceled through iOS Settings or App Store',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    throw new PaymentError(
      'Apple subscriptions must be reactivated through iOS Settings',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async createRefund(request: RefundRequest): Promise<Refund> {
    throw new PaymentError(
      'Apple refunds are handled through App Store or Request a Refund',
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
    // For V2 notifications, the payload is a JWS that needs certificate verification
    // In production, verify against Apple's certificate chain
    return true; // Simplified for now
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());

      return {
        id: `apple_${Date.now()}`,
        provider: PaymentProvider.APPLE_IAP,
        eventType: this.mapAppleEventType(data.notificationType || data.notification_type),
        eventId: data.notificationUUID || data.notification_uuid || '',
        data,
        timestamp: new Date(),
        rawPayload: typeof payload === 'string' ? payload : payload.toString(),
      };
    } catch (error: any) {
      this.log('error', 'Failed to parse Apple webhook', { error: error.message });
      return null;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    const result = await this.handleServerNotification(event.data);

    return {
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
      message: `Apple notification ${result.notificationType} processed with action: ${result.action}`,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getSupportedPaymentMethods(): PaymentMethodType[] {
    return [PaymentMethodType.APPLE_PAY];
  }

  getSupportedCurrencies(): string[] {
    // Apple supports all currencies available in the App Store
    return ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'NGN', 'ZAR', 'GHS', 'KES'];
  }

  mapTransactionStatus(appleStatus: string): TransactionStatus {
    return TransactionStatus.SUCCEEDED;
  }

  mapSubscriptionStatus(appleStatus: string): SubscriptionStatus {
    return SubscriptionStatus.ACTIVE;
  }

  private mapAppleEventType(notificationType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      SUBSCRIBED: WebhookEventType.SUBSCRIPTION_CREATED,
      DID_RENEW: WebhookEventType.SUBSCRIPTION_RENEWED,
      DID_CHANGE_RENEWAL_STATUS: WebhookEventType.SUBSCRIPTION_UPDATED,
      DID_FAIL_TO_RENEW: WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
      EXPIRED: WebhookEventType.SUBSCRIPTION_CANCELED,
      REFUND: WebhookEventType.PAYMENT_REFUNDED,
      REVOKE: WebhookEventType.PAYMENT_REFUNDED,
      GRACE_PERIOD_EXPIRED: WebhookEventType.SUBSCRIPTION_CANCELED,
      INITIAL_BUY: WebhookEventType.SUBSCRIPTION_CREATED,
      CANCEL: WebhookEventType.SUBSCRIPTION_CANCELED,
      // V2 types
      ONE_TIME_CHARGE: WebhookEventType.PAYMENT_SUCCEEDED,
      CONSUMPTION_REQUEST: WebhookEventType.PAYMENT_SUCCEEDED,
    };
    return eventMap[notificationType] || WebhookEventType.IAP_PURCHASE_VALIDATED;
  }
}

// Export singleton instance
export const appleIAPProvider = new AppleIAPProvider();
