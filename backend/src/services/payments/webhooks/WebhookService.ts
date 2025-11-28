/**
 * Unified Webhook Service
 * Handles webhooks from all payment providers with idempotency
 */

import { Pool } from 'pg';
import { EventEmitter } from 'events';
import {
  PaymentProvider,
  WebhookEventType,
  TransactionStatus,
  SubscriptionStatus,
  CoinTransactionType,
} from '../types';
import { StripeProvider } from '../providers/StripeProvider';
import { PayPalProvider } from '../providers/PayPalProvider';
import { FlutterwaveProvider } from '../providers/FlutterwaveProvider';
import { PaystackProvider } from '../providers/PaystackProvider';
import { AppleIAPProvider } from '../providers/AppleIAPProvider';
import { GooglePlayProvider } from '../providers/GooglePlayProvider';

// Webhook event record for idempotency
interface WebhookEvent {
  id: string;
  provider: PaymentProvider;
  eventType: string;
  eventId: string;
  payload: any;
  processedAt: Date | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  retryCount: number;
  createdAt: Date;
}

// Processed webhook result
interface WebhookResult {
  success: boolean;
  eventId: string;
  eventType: WebhookEventType;
  action?: string;
  userId?: string;
  error?: string;
}

// Subscription update data
interface SubscriptionUpdate {
  userId: string;
  subscriptionId: string;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
}

// Transaction record data
interface TransactionRecord {
  userId: string;
  provider: PaymentProvider;
  providerTransactionId: string;
  type: 'subscription' | 'coin_purchase' | 'boost_purchase' | 'refund';
  amount: number;
  currency: string;
  status: TransactionStatus;
  metadata?: Record<string, any>;
}

// Wallet update data
interface WalletUpdate {
  userId: string;
  type: CoinTransactionType;
  amount: number;
  description: string;
  referenceId: string;
}

export class WebhookService extends EventEmitter {
  private pool: Pool;
  private stripeProvider: StripeProvider;
  private paypalProvider: PayPalProvider;
  private flutterwaveProvider: FlutterwaveProvider;
  private paystackProvider: PaystackProvider;
  private appleProvider: AppleIAPProvider;
  private googleProvider: GooglePlayProvider;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
    this.stripeProvider = StripeProvider.getInstance();
    this.paypalProvider = PayPalProvider.getInstance();
    this.flutterwaveProvider = FlutterwaveProvider.getInstance();
    this.paystackProvider = PaystackProvider.getInstance();
    this.appleProvider = AppleIAPProvider.getInstance();
    this.googleProvider = GooglePlayProvider.getInstance();
  }

  /**
   * Process Stripe webhook
   */
  async processStripeWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<WebhookResult> {
    try {
      const event = await this.stripeProvider.handleWebhook(payload, signature);

      // Check idempotency
      const isDuplicate = await this.checkIdempotency(
        PaymentProvider.STRIPE,
        event.id
      );
      if (isDuplicate) {
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          action: 'skipped_duplicate',
        };
      }

      // Record webhook event
      await this.recordWebhookEvent(PaymentProvider.STRIPE, event.id, event.type, event);

      // Process based on event type
      const result = await this.processStripeEvent(event);

      // Mark as completed
      await this.markEventCompleted(PaymentProvider.STRIPE, event.id);

      return result;
    } catch (error: any) {
      console.error('Stripe webhook error:', error);
      return {
        success: false,
        eventId: 'unknown',
        eventType: WebhookEventType.UNKNOWN,
        error: error.message,
      };
    }
  }

  /**
   * Process PayPal webhook
   */
  async processPayPalWebhook(
    payload: any,
    headers: Record<string, string>
  ): Promise<WebhookResult> {
    try {
      const event = await this.paypalProvider.handleWebhook(payload, headers);

      const isDuplicate = await this.checkIdempotency(
        PaymentProvider.PAYPAL,
        event.id
      );
      if (isDuplicate) {
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          action: 'skipped_duplicate',
        };
      }

      await this.recordWebhookEvent(PaymentProvider.PAYPAL, event.id, event.type, event);
      const result = await this.processPayPalEvent(event);
      await this.markEventCompleted(PaymentProvider.PAYPAL, event.id);

      return result;
    } catch (error: any) {
      console.error('PayPal webhook error:', error);
      return {
        success: false,
        eventId: 'unknown',
        eventType: WebhookEventType.UNKNOWN,
        error: error.message,
      };
    }
  }

  /**
   * Process Flutterwave webhook
   */
  async processFlutterwaveWebhook(
    payload: any,
    signature: string
  ): Promise<WebhookResult> {
    try {
      const event = await this.flutterwaveProvider.handleWebhook(payload, signature);

      const eventId = payload.id?.toString() || payload.data?.id?.toString() || Date.now().toString();

      const isDuplicate = await this.checkIdempotency(
        PaymentProvider.FLUTTERWAVE,
        eventId
      );
      if (isDuplicate) {
        return {
          success: true,
          eventId,
          eventType: event.type,
          action: 'skipped_duplicate',
        };
      }

      await this.recordWebhookEvent(PaymentProvider.FLUTTERWAVE, eventId, event.type, event);
      const result = await this.processFlutterwaveEvent(event, payload);
      await this.markEventCompleted(PaymentProvider.FLUTTERWAVE, eventId);

      return result;
    } catch (error: any) {
      console.error('Flutterwave webhook error:', error);
      return {
        success: false,
        eventId: 'unknown',
        eventType: WebhookEventType.UNKNOWN,
        error: error.message,
      };
    }
  }

  /**
   * Process Paystack webhook
   */
  async processPaystackWebhook(
    payload: any,
    signature: string
  ): Promise<WebhookResult> {
    try {
      const event = await this.paystackProvider.handleWebhook(payload, signature);

      const eventId = payload.data?.reference || payload.data?.id?.toString() || Date.now().toString();

      const isDuplicate = await this.checkIdempotency(
        PaymentProvider.PAYSTACK,
        eventId
      );
      if (isDuplicate) {
        return {
          success: true,
          eventId,
          eventType: event.type,
          action: 'skipped_duplicate',
        };
      }

      await this.recordWebhookEvent(PaymentProvider.PAYSTACK, eventId, event.type, event);
      const result = await this.processPaystackEvent(event, payload);
      await this.markEventCompleted(PaymentProvider.PAYSTACK, eventId);

      return result;
    } catch (error: any) {
      console.error('Paystack webhook error:', error);
      return {
        success: false,
        eventId: 'unknown',
        eventType: WebhookEventType.UNKNOWN,
        error: error.message,
      };
    }
  }

  /**
   * Process Apple App Store Server Notification
   */
  async processAppleWebhook(payload: any): Promise<WebhookResult> {
    try {
      const event = await this.appleProvider.handleAppStoreNotification(payload);

      const eventId = event.notificationId || Date.now().toString();

      const isDuplicate = await this.checkIdempotency(
        PaymentProvider.APPLE_IAP,
        eventId
      );
      if (isDuplicate) {
        return {
          success: true,
          eventId,
          eventType: event.type,
          action: 'skipped_duplicate',
        };
      }

      await this.recordWebhookEvent(PaymentProvider.APPLE_IAP, eventId, event.type, event);
      const result = await this.processAppleEvent(event);
      await this.markEventCompleted(PaymentProvider.APPLE_IAP, eventId);

      return result;
    } catch (error: any) {
      console.error('Apple webhook error:', error);
      return {
        success: false,
        eventId: 'unknown',
        eventType: WebhookEventType.UNKNOWN,
        error: error.message,
      };
    }
  }

  /**
   * Process Google Play Real-Time Developer Notification
   */
  async processGoogleWebhook(payload: any): Promise<WebhookResult> {
    try {
      const event = await this.googleProvider.handleRTDN(payload);

      const eventId = payload.message?.messageId || Date.now().toString();

      const isDuplicate = await this.checkIdempotency(
        PaymentProvider.GOOGLE_PLAY,
        eventId
      );
      if (isDuplicate) {
        return {
          success: true,
          eventId,
          eventType: event.type,
          action: 'skipped_duplicate',
        };
      }

      await this.recordWebhookEvent(PaymentProvider.GOOGLE_PLAY, eventId, event.type, event);
      const result = await this.processGoogleEvent(event);
      await this.markEventCompleted(PaymentProvider.GOOGLE_PLAY, eventId);

      return result;
    } catch (error: any) {
      console.error('Google webhook error:', error);
      return {
        success: false,
        eventId: 'unknown',
        eventType: WebhookEventType.UNKNOWN,
        error: error.message,
      };
    }
  }

  // ==================== Event Processing ====================

  private async processStripeEvent(event: any): Promise<WebhookResult> {
    const eventType = this.mapStripeEventType(event.type);
    const data = event.data;

    switch (eventType) {
      case WebhookEventType.PAYMENT_SUCCEEDED:
        await this.handlePaymentSucceeded(
          PaymentProvider.STRIPE,
          data,
          event.id
        );
        break;

      case WebhookEventType.PAYMENT_FAILED:
        await this.handlePaymentFailed(
          PaymentProvider.STRIPE,
          data,
          event.id
        );
        break;

      case WebhookEventType.SUBSCRIPTION_CREATED:
      case WebhookEventType.SUBSCRIPTION_UPDATED:
        await this.handleSubscriptionUpdate(
          PaymentProvider.STRIPE,
          data,
          eventType
        );
        break;

      case WebhookEventType.SUBSCRIPTION_CANCELLED:
        await this.handleSubscriptionCancelled(
          PaymentProvider.STRIPE,
          data
        );
        break;

      case WebhookEventType.REFUND_CREATED:
        await this.handleRefund(PaymentProvider.STRIPE, data);
        break;

      case WebhookEventType.INVOICE_PAID:
        await this.handleInvoicePaid(PaymentProvider.STRIPE, data);
        break;

      case WebhookEventType.INVOICE_PAYMENT_FAILED:
        await this.handleInvoicePaymentFailed(PaymentProvider.STRIPE, data);
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return {
      success: true,
      eventId: event.id,
      eventType,
      action: 'processed',
    };
  }

  private async processPayPalEvent(event: any): Promise<WebhookResult> {
    const eventType = this.mapPayPalEventType(event.type);

    switch (eventType) {
      case WebhookEventType.PAYMENT_SUCCEEDED:
        await this.handlePaymentSucceeded(
          PaymentProvider.PAYPAL,
          event.data,
          event.id
        );
        break;

      case WebhookEventType.SUBSCRIPTION_CREATED:
      case WebhookEventType.SUBSCRIPTION_UPDATED:
        await this.handleSubscriptionUpdate(
          PaymentProvider.PAYPAL,
          event.data,
          eventType
        );
        break;

      case WebhookEventType.SUBSCRIPTION_CANCELLED:
        await this.handleSubscriptionCancelled(
          PaymentProvider.PAYPAL,
          event.data
        );
        break;

      case WebhookEventType.REFUND_CREATED:
        await this.handleRefund(PaymentProvider.PAYPAL, event.data);
        break;

      default:
        console.log(`Unhandled PayPal event type: ${event.type}`);
    }

    return {
      success: true,
      eventId: event.id,
      eventType,
      action: 'processed',
    };
  }

  private async processFlutterwaveEvent(
    event: any,
    rawPayload: any
  ): Promise<WebhookResult> {
    const eventType = event.type;
    const data = rawPayload.data || rawPayload;

    switch (eventType) {
      case WebhookEventType.PAYMENT_SUCCEEDED:
        await this.handlePaymentSucceeded(
          PaymentProvider.FLUTTERWAVE,
          data,
          data.tx_ref || data.id
        );
        break;

      case WebhookEventType.PAYMENT_FAILED:
        await this.handlePaymentFailed(
          PaymentProvider.FLUTTERWAVE,
          data,
          data.tx_ref || data.id
        );
        break;

      case WebhookEventType.SUBSCRIPTION_CREATED:
      case WebhookEventType.SUBSCRIPTION_UPDATED:
        await this.handleSubscriptionUpdate(
          PaymentProvider.FLUTTERWAVE,
          data,
          eventType
        );
        break;

      default:
        console.log(`Unhandled Flutterwave event type: ${event.type}`);
    }

    return {
      success: true,
      eventId: data.tx_ref || data.id?.toString(),
      eventType,
      action: 'processed',
    };
  }

  private async processPaystackEvent(
    event: any,
    rawPayload: any
  ): Promise<WebhookResult> {
    const eventType = event.type;
    const data = rawPayload.data;

    switch (eventType) {
      case WebhookEventType.PAYMENT_SUCCEEDED:
        await this.handlePaymentSucceeded(
          PaymentProvider.PAYSTACK,
          data,
          data.reference
        );
        break;

      case WebhookEventType.PAYMENT_FAILED:
        await this.handlePaymentFailed(
          PaymentProvider.PAYSTACK,
          data,
          data.reference
        );
        break;

      case WebhookEventType.SUBSCRIPTION_CREATED:
      case WebhookEventType.SUBSCRIPTION_UPDATED:
        await this.handleSubscriptionUpdate(
          PaymentProvider.PAYSTACK,
          data,
          eventType
        );
        break;

      case WebhookEventType.SUBSCRIPTION_CANCELLED:
        await this.handleSubscriptionCancelled(
          PaymentProvider.PAYSTACK,
          data
        );
        break;

      default:
        console.log(`Unhandled Paystack event type: ${event.type}`);
    }

    return {
      success: true,
      eventId: data.reference || data.id?.toString(),
      eventType,
      action: 'processed',
    };
  }

  private async processAppleEvent(event: any): Promise<WebhookResult> {
    const eventType = event.type;

    switch (eventType) {
      case WebhookEventType.SUBSCRIPTION_CREATED:
      case WebhookEventType.SUBSCRIPTION_RENEWED:
        await this.handleAppleSubscriptionRenewal(event);
        break;

      case WebhookEventType.SUBSCRIPTION_CANCELLED:
        await this.handleAppleSubscriptionCancelled(event);
        break;

      case WebhookEventType.SUBSCRIPTION_EXPIRED:
        await this.handleAppleSubscriptionExpired(event);
        break;

      case WebhookEventType.IAP_PURCHASED:
        await this.handleApplePurchase(event);
        break;

      case WebhookEventType.REFUND_CREATED:
        await this.handleAppleRefund(event);
        break;

      case WebhookEventType.SUBSCRIPTION_GRACE_PERIOD:
        await this.handleAppleGracePeriod(event);
        break;

      default:
        console.log(`Unhandled Apple event type: ${event.type}`);
    }

    return {
      success: true,
      eventId: event.notificationId,
      eventType,
      action: 'processed',
    };
  }

  private async processGoogleEvent(event: any): Promise<WebhookResult> {
    const eventType = event.type;

    switch (eventType) {
      case WebhookEventType.IAP_PURCHASED:
        await this.handleGooglePurchase(event);
        break;

      case WebhookEventType.SUBSCRIPTION_CREATED:
      case WebhookEventType.SUBSCRIPTION_RENEWED:
        await this.handleGoogleSubscriptionRenewal(event);
        break;

      case WebhookEventType.SUBSCRIPTION_CANCELLED:
        await this.handleGoogleSubscriptionCancelled(event);
        break;

      case WebhookEventType.SUBSCRIPTION_EXPIRED:
        await this.handleGoogleSubscriptionExpired(event);
        break;

      case WebhookEventType.SUBSCRIPTION_PAUSED:
        await this.handleGoogleSubscriptionPaused(event);
        break;

      case WebhookEventType.SUBSCRIPTION_GRACE_PERIOD:
        await this.handleGoogleGracePeriod(event);
        break;

      default:
        console.log(`Unhandled Google event type: ${event.type}`);
    }

    return {
      success: true,
      eventId: event.purchaseToken || 'unknown',
      eventType,
      action: 'processed',
    };
  }

  // ==================== Common Handlers ====================

  private async handlePaymentSucceeded(
    provider: PaymentProvider,
    data: any,
    transactionId: string
  ): Promise<void> {
    const userId = await this.getUserIdFromPayment(provider, data);
    if (!userId) {
      console.warn(`Could not find user for payment: ${transactionId}`);
      return;
    }

    const metadata = this.extractMetadata(provider, data);
    const amount = this.extractAmount(provider, data);
    const currency = this.extractCurrency(provider, data);

    // Record transaction
    await this.recordTransaction({
      userId,
      provider,
      providerTransactionId: transactionId,
      type: metadata.type || 'coin_purchase',
      amount,
      currency,
      status: TransactionStatus.COMPLETED,
      metadata,
    });

    // If it's a coin purchase, credit the wallet
    if (metadata.type === 'coin_purchase' && metadata.coinAmount) {
      await this.creditWallet({
        userId,
        type: CoinTransactionType.PURCHASE,
        amount: metadata.coinAmount,
        description: `Purchased ${metadata.coinAmount} coins`,
        referenceId: transactionId,
      });
    }

    // Emit event for other services
    this.emit('payment:succeeded', {
      userId,
      provider,
      transactionId,
      amount,
      currency,
      metadata,
    });
  }

  private async handlePaymentFailed(
    provider: PaymentProvider,
    data: any,
    transactionId: string
  ): Promise<void> {
    const userId = await this.getUserIdFromPayment(provider, data);

    await this.recordTransaction({
      userId: userId || 'unknown',
      provider,
      providerTransactionId: transactionId,
      type: 'coin_purchase',
      amount: this.extractAmount(provider, data),
      currency: this.extractCurrency(provider, data),
      status: TransactionStatus.FAILED,
      metadata: { failureReason: this.extractFailureReason(provider, data) },
    });

    this.emit('payment:failed', {
      userId,
      provider,
      transactionId,
      reason: this.extractFailureReason(provider, data),
    });
  }

  private async handleSubscriptionUpdate(
    provider: PaymentProvider,
    data: any,
    eventType: WebhookEventType
  ): Promise<void> {
    const subscriptionData = this.extractSubscriptionData(provider, data);
    if (!subscriptionData) {
      console.warn(`Could not extract subscription data for provider: ${provider}`);
      return;
    }

    await this.updateSubscription(subscriptionData);

    this.emit('subscription:updated', {
      ...subscriptionData,
      eventType,
    });
  }

  private async handleSubscriptionCancelled(
    provider: PaymentProvider,
    data: any
  ): Promise<void> {
    const subscriptionData = this.extractSubscriptionData(provider, data);
    if (!subscriptionData) return;

    subscriptionData.status = SubscriptionStatus.CANCELLED;
    subscriptionData.canceledAt = new Date();

    await this.updateSubscription(subscriptionData);

    this.emit('subscription:cancelled', subscriptionData);
  }

  private async handleRefund(
    provider: PaymentProvider,
    data: any
  ): Promise<void> {
    const refundData = this.extractRefundData(provider, data);
    if (!refundData) return;

    // Record refund transaction
    await this.recordTransaction({
      userId: refundData.userId,
      provider,
      providerTransactionId: refundData.refundId,
      type: 'refund',
      amount: -refundData.amount,
      currency: refundData.currency,
      status: TransactionStatus.COMPLETED,
      metadata: { originalTransactionId: refundData.originalTransactionId },
    });

    // If it was a coin purchase, debit the wallet
    if (refundData.coinAmount) {
      await this.debitWallet({
        userId: refundData.userId,
        type: CoinTransactionType.ADMIN_DEDUCTION,
        amount: refundData.coinAmount,
        description: `Refund - ${refundData.coinAmount} coins removed`,
        referenceId: refundData.refundId,
      });
    }

    this.emit('payment:refunded', refundData);
  }

  private async handleInvoicePaid(
    provider: PaymentProvider,
    data: any
  ): Promise<void> {
    // Stripe invoice.paid - subscription renewal successful
    const subscription = data.subscription;
    if (!subscription) return;

    const userId = await this.getUserIdFromCustomer(provider, data.customer);
    if (!userId) return;

    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'active',
           current_period_start = $1,
           current_period_end = $2,
           updated_at = NOW()
       WHERE provider = $3 AND provider_subscription_id = $4`,
      [
        new Date(data.period_start * 1000),
        new Date(data.period_end * 1000),
        provider,
        subscription,
      ]
    );

    this.emit('subscription:renewed', {
      userId,
      provider,
      subscriptionId: subscription,
    });
  }

  private async handleInvoicePaymentFailed(
    provider: PaymentProvider,
    data: any
  ): Promise<void> {
    const subscription = data.subscription;
    if (!subscription) return;

    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'past_due',
           updated_at = NOW()
       WHERE provider = $1 AND provider_subscription_id = $2`,
      [provider, subscription]
    );

    const userId = await this.getUserIdFromCustomer(provider, data.customer);
    this.emit('subscription:payment_failed', {
      userId,
      provider,
      subscriptionId: subscription,
      attemptCount: data.attempt_count,
    });
  }

  // ==================== Apple/Google Specific Handlers ====================

  private async handleAppleSubscriptionRenewal(event: any): Promise<void> {
    const userId = await this.getUserIdFromAppleReceipt(event.originalTransactionId);
    if (!userId) return;

    await this.updateSubscription({
      userId,
      subscriptionId: '', // Will be looked up
      provider: PaymentProvider.APPLE_IAP,
      providerSubscriptionId: event.originalTransactionId,
      planId: event.productId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: event.expiresDate,
    });
  }

  private async handleAppleSubscriptionCancelled(event: any): Promise<void> {
    const userId = await this.getUserIdFromAppleReceipt(event.originalTransactionId);
    if (!userId) return;

    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'cancelled',
           cancel_at_period_end = true,
           canceled_at = NOW(),
           updated_at = NOW()
       WHERE provider = 'apple_iap' AND provider_subscription_id = $1`,
      [event.originalTransactionId]
    );
  }

  private async handleAppleSubscriptionExpired(event: any): Promise<void> {
    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'expired',
           updated_at = NOW()
       WHERE provider = 'apple_iap' AND provider_subscription_id = $1`,
      [event.originalTransactionId]
    );
  }

  private async handleApplePurchase(event: any): Promise<void> {
    const userId = await this.getUserIdFromAppleReceipt(event.originalTransactionId);
    if (!userId) return;

    // Look up product to get coin amount
    const productInfo = await this.getProductInfo(event.productId);

    if (productInfo?.type === 'coins') {
      await this.creditWallet({
        userId,
        type: CoinTransactionType.PURCHASE,
        amount: productInfo.coinAmount,
        description: `Purchased ${productInfo.coinAmount} coins (Apple)`,
        referenceId: event.transactionId,
      });
    }

    await this.recordTransaction({
      userId,
      provider: PaymentProvider.APPLE_IAP,
      providerTransactionId: event.transactionId,
      type: 'coin_purchase',
      amount: productInfo?.price || 0,
      currency: 'USD',
      status: TransactionStatus.COMPLETED,
      metadata: { productId: event.productId },
    });
  }

  private async handleAppleRefund(event: any): Promise<void> {
    const userId = await this.getUserIdFromAppleReceipt(event.originalTransactionId);
    if (!userId) return;

    // Check if we need to revoke coins
    const transaction = await this.getTransactionByProviderId(
      PaymentProvider.APPLE_IAP,
      event.transactionId
    );

    if (transaction?.metadata?.coinAmount) {
      await this.debitWallet({
        userId,
        type: CoinTransactionType.ADMIN_DEDUCTION,
        amount: transaction.metadata.coinAmount,
        description: 'Apple refund - coins revoked',
        referenceId: `refund_${event.transactionId}`,
      });
    }
  }

  private async handleAppleGracePeriod(event: any): Promise<void> {
    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'past_due',
           updated_at = NOW()
       WHERE provider = 'apple_iap' AND provider_subscription_id = $1`,
      [event.originalTransactionId]
    );
  }

  private async handleGooglePurchase(event: any): Promise<void> {
    const userId = await this.getUserIdFromGooglePurchase(event.purchaseToken);
    if (!userId) return;

    const productInfo = await this.getProductInfo(event.productId);

    if (productInfo?.type === 'coins') {
      await this.creditWallet({
        userId,
        type: CoinTransactionType.PURCHASE,
        amount: productInfo.coinAmount,
        description: `Purchased ${productInfo.coinAmount} coins (Google Play)`,
        referenceId: event.purchaseToken,
      });
    }

    await this.recordTransaction({
      userId,
      provider: PaymentProvider.GOOGLE_PLAY,
      providerTransactionId: event.orderId || event.purchaseToken,
      type: 'coin_purchase',
      amount: productInfo?.price || 0,
      currency: 'USD',
      status: TransactionStatus.COMPLETED,
      metadata: { productId: event.productId },
    });
  }

  private async handleGoogleSubscriptionRenewal(event: any): Promise<void> {
    const userId = await this.getUserIdFromGooglePurchase(event.purchaseToken);
    if (!userId) return;

    await this.updateSubscription({
      userId,
      subscriptionId: '',
      provider: PaymentProvider.GOOGLE_PLAY,
      providerSubscriptionId: event.purchaseToken,
      planId: event.subscriptionId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: event.expiryTimeMillis
        ? new Date(parseInt(event.expiryTimeMillis))
        : undefined,
    });
  }

  private async handleGoogleSubscriptionCancelled(event: any): Promise<void> {
    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'cancelled',
           cancel_at_period_end = true,
           canceled_at = NOW(),
           updated_at = NOW()
       WHERE provider = 'google_play' AND provider_subscription_id = $1`,
      [event.purchaseToken]
    );
  }

  private async handleGoogleSubscriptionExpired(event: any): Promise<void> {
    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'expired',
           updated_at = NOW()
       WHERE provider = 'google_play' AND provider_subscription_id = $1`,
      [event.purchaseToken]
    );
  }

  private async handleGoogleSubscriptionPaused(event: any): Promise<void> {
    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'paused',
           updated_at = NOW()
       WHERE provider = 'google_play' AND provider_subscription_id = $1`,
      [event.purchaseToken]
    );
  }

  private async handleGoogleGracePeriod(event: any): Promise<void> {
    await this.pool.query(
      `UPDATE user_subscriptions
       SET status = 'past_due',
           updated_at = NOW()
       WHERE provider = 'google_play' AND provider_subscription_id = $1`,
      [event.purchaseToken]
    );
  }

  // ==================== Database Operations ====================

  private async checkIdempotency(
    provider: PaymentProvider,
    eventId: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT id FROM webhook_events
       WHERE provider = $1 AND event_id = $2 AND status = 'completed'`,
      [provider, eventId]
    );
    return result.rows.length > 0;
  }

  private async recordWebhookEvent(
    provider: PaymentProvider,
    eventId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO webhook_events (provider, event_id, event_type, payload, status, created_at)
       VALUES ($1, $2, $3, $4, 'processing', NOW())
       ON CONFLICT (provider, event_id) DO UPDATE SET
         status = 'processing',
         retry_count = webhook_events.retry_count + 1`,
      [provider, eventId, eventType, JSON.stringify(payload)]
    );
  }

  private async markEventCompleted(
    provider: PaymentProvider,
    eventId: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_events
       SET status = 'completed', processed_at = NOW()
       WHERE provider = $1 AND event_id = $2`,
      [provider, eventId]
    );
  }

  private async markEventFailed(
    provider: PaymentProvider,
    eventId: string,
    error: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_events
       SET status = 'failed', error = $3
       WHERE provider = $1 AND event_id = $2`,
      [provider, eventId, error]
    );
  }

  private async recordTransaction(data: TransactionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO transactions
       (user_id, provider, provider_transaction_id, type, amount, currency, status, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (provider, provider_transaction_id) DO UPDATE SET
         status = $7,
         metadata = $8,
         updated_at = NOW()`,
      [
        data.userId,
        data.provider,
        data.providerTransactionId,
        data.type,
        data.amount,
        data.currency,
        data.status,
        JSON.stringify(data.metadata || {}),
      ]
    );
  }

  private async updateSubscription(data: SubscriptionUpdate): Promise<void> {
    // First try to find existing subscription
    const existing = await this.pool.query(
      `SELECT id FROM user_subscriptions
       WHERE provider = $1 AND provider_subscription_id = $2`,
      [data.provider, data.providerSubscriptionId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await this.pool.query(
        `UPDATE user_subscriptions SET
           status = $1,
           plan_id = COALESCE($2, plan_id),
           current_period_start = COALESCE($3, current_period_start),
           current_period_end = COALESCE($4, current_period_end),
           cancel_at_period_end = COALESCE($5, cancel_at_period_end),
           canceled_at = COALESCE($6, canceled_at),
           updated_at = NOW()
         WHERE provider = $7 AND provider_subscription_id = $8`,
        [
          data.status,
          data.planId,
          data.currentPeriodStart,
          data.currentPeriodEnd,
          data.cancelAtPeriodEnd,
          data.canceledAt,
          data.provider,
          data.providerSubscriptionId,
        ]
      );
    } else {
      // Insert new
      await this.pool.query(
        `INSERT INTO user_subscriptions
         (user_id, provider, provider_subscription_id, plan_id, status,
          current_period_start, current_period_end, cancel_at_period_end, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          data.userId,
          data.provider,
          data.providerSubscriptionId,
          data.planId,
          data.status,
          data.currentPeriodStart || new Date(),
          data.currentPeriodEnd,
          data.cancelAtPeriodEnd || false,
        ]
      );
    }
  }

  private async creditWallet(data: WalletUpdate): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update wallet balance
      await client.query(
        `UPDATE user_wallets
         SET coins = coins + $1, updated_at = NOW()
         WHERE user_id = $2`,
        [data.amount, data.userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO wallet_transactions
         (user_id, type, amount, balance_after, description, reference_id, created_at)
         SELECT $1, $2, $3, coins, $4, $5, NOW()
         FROM user_wallets WHERE user_id = $1`,
        [data.userId, data.type, data.amount, data.description, data.referenceId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async debitWallet(data: WalletUpdate): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update wallet balance (ensure doesn't go negative)
      const result = await client.query(
        `UPDATE user_wallets
         SET coins = GREATEST(0, coins - $1), updated_at = NOW()
         WHERE user_id = $2
         RETURNING coins`,
        [data.amount, data.userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO wallet_transactions
         (user_id, type, amount, balance_after, description, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          data.userId,
          data.type,
          -data.amount,
          result.rows[0]?.coins || 0,
          data.description,
          data.referenceId,
        ]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== Helper Methods ====================

  private async getUserIdFromPayment(
    provider: PaymentProvider,
    data: any
  ): Promise<string | null> {
    let customerId: string | null = null;

    switch (provider) {
      case PaymentProvider.STRIPE:
        customerId = data.customer;
        break;
      case PaymentProvider.PAYPAL:
        customerId = data.payer?.payer_id;
        break;
      case PaymentProvider.FLUTTERWAVE:
        customerId = data.customer?.email;
        break;
      case PaymentProvider.PAYSTACK:
        customerId = data.customer?.email;
        break;
    }

    if (!customerId) {
      // Try to get from metadata
      const metadata = data.metadata || data.meta || {};
      if (metadata.userId) return metadata.userId;
    }

    return this.getUserIdFromCustomer(provider, customerId);
  }

  private async getUserIdFromCustomer(
    provider: PaymentProvider,
    customerId: string | null
  ): Promise<string | null> {
    if (!customerId) return null;

    // Check payment_customers table
    const result = await this.pool.query(
      `SELECT user_id FROM payment_customers
       WHERE provider = $1 AND provider_customer_id = $2`,
      [provider, customerId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].user_id;
    }

    // For email-based providers, look up by email
    if (provider === PaymentProvider.FLUTTERWAVE ||
        provider === PaymentProvider.PAYSTACK) {
      const emailResult = await this.pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [customerId]
      );
      if (emailResult.rows.length > 0) {
        return emailResult.rows[0].id;
      }
    }

    return null;
  }

  private async getUserIdFromAppleReceipt(
    originalTransactionId: string
  ): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT user_id FROM iap_receipts
       WHERE provider = 'apple_iap' AND original_transaction_id = $1`,
      [originalTransactionId]
    );
    return result.rows[0]?.user_id || null;
  }

  private async getUserIdFromGooglePurchase(
    purchaseToken: string
  ): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT user_id FROM iap_receipts
       WHERE provider = 'google_play' AND purchase_token = $1`,
      [purchaseToken]
    );
    return result.rows[0]?.user_id || null;
  }

  private async getProductInfo(productId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT * FROM products WHERE provider_product_id = $1`,
      [productId]
    );
    return result.rows[0] || null;
  }

  private async getTransactionByProviderId(
    provider: PaymentProvider,
    transactionId: string
  ): Promise<any> {
    const result = await this.pool.query(
      `SELECT * FROM transactions
       WHERE provider = $1 AND provider_transaction_id = $2`,
      [provider, transactionId]
    );
    return result.rows[0] || null;
  }

  private extractMetadata(provider: PaymentProvider, data: any): any {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return data.metadata || {};
      case PaymentProvider.PAYPAL:
        return data.custom_id ? JSON.parse(data.custom_id) : {};
      case PaymentProvider.FLUTTERWAVE:
        return data.meta || {};
      case PaymentProvider.PAYSTACK:
        return data.metadata || {};
      default:
        return {};
    }
  }

  private extractAmount(provider: PaymentProvider, data: any): number {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return data.amount || data.amount_total || 0;
      case PaymentProvider.PAYPAL:
        return parseFloat(data.amount?.value || '0') * 100;
      case PaymentProvider.FLUTTERWAVE:
        return (data.amount || 0) * 100;
      case PaymentProvider.PAYSTACK:
        return data.amount || 0; // Already in kobo
      default:
        return 0;
    }
  }

  private extractCurrency(provider: PaymentProvider, data: any): string {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return (data.currency || 'usd').toUpperCase();
      case PaymentProvider.PAYPAL:
        return data.amount?.currency_code || 'USD';
      case PaymentProvider.FLUTTERWAVE:
        return data.currency || 'NGN';
      case PaymentProvider.PAYSTACK:
        return data.currency || 'NGN';
      default:
        return 'USD';
    }
  }

  private extractFailureReason(provider: PaymentProvider, data: any): string {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return data.last_payment_error?.message || 'Payment failed';
      case PaymentProvider.PAYPAL:
        return data.details?.[0]?.description || 'Payment failed';
      case PaymentProvider.FLUTTERWAVE:
        return data.processor_response || 'Payment failed';
      case PaymentProvider.PAYSTACK:
        return data.gateway_response || 'Payment failed';
      default:
        return 'Payment failed';
    }
  }

  private extractSubscriptionData(
    provider: PaymentProvider,
    data: any
  ): SubscriptionUpdate | null {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return {
          userId: '', // Will be looked up
          subscriptionId: data.id,
          provider,
          providerSubscriptionId: data.id,
          planId: data.items?.data?.[0]?.price?.id || '',
          status: this.mapStripeSubscriptionStatus(data.status),
          currentPeriodStart: new Date(data.current_period_start * 1000),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end,
        };

      case PaymentProvider.PAYPAL:
        return {
          userId: '',
          subscriptionId: data.id,
          provider,
          providerSubscriptionId: data.id,
          planId: data.plan_id,
          status: this.mapPayPalSubscriptionStatus(data.status),
          currentPeriodStart: data.billing_info?.last_payment?.time
            ? new Date(data.billing_info.last_payment.time)
            : undefined,
          currentPeriodEnd: data.billing_info?.next_billing_time
            ? new Date(data.billing_info.next_billing_time)
            : undefined,
        };

      case PaymentProvider.PAYSTACK:
        return {
          userId: '',
          subscriptionId: data.subscription_code,
          provider,
          providerSubscriptionId: data.subscription_code,
          planId: data.plan?.plan_code || '',
          status: this.mapPaystackSubscriptionStatus(data.status),
          currentPeriodEnd: data.next_payment_date
            ? new Date(data.next_payment_date)
            : undefined,
        };

      default:
        return null;
    }
  }

  private extractRefundData(provider: PaymentProvider, data: any): any {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return {
          refundId: data.id,
          originalTransactionId: data.payment_intent || data.charge,
          amount: data.amount,
          currency: data.currency?.toUpperCase(),
          userId: '', // Will be looked up
        };

      case PaymentProvider.PAYPAL:
        return {
          refundId: data.id,
          originalTransactionId: data.links?.find(
            (l: any) => l.rel === 'up'
          )?.href?.split('/').pop(),
          amount: parseFloat(data.amount?.value || '0') * 100,
          currency: data.amount?.currency_code,
          userId: '',
        };

      default:
        return null;
    }
  }

  // ==================== Status Mappers ====================

  private mapStripeEventType(stripeType: string): WebhookEventType {
    const mapping: Record<string, WebhookEventType> = {
      'payment_intent.succeeded': WebhookEventType.PAYMENT_SUCCEEDED,
      'payment_intent.payment_failed': WebhookEventType.PAYMENT_FAILED,
      'checkout.session.completed': WebhookEventType.PAYMENT_SUCCEEDED,
      'customer.subscription.created': WebhookEventType.SUBSCRIPTION_CREATED,
      'customer.subscription.updated': WebhookEventType.SUBSCRIPTION_UPDATED,
      'customer.subscription.deleted': WebhookEventType.SUBSCRIPTION_CANCELLED,
      'invoice.paid': WebhookEventType.INVOICE_PAID,
      'invoice.payment_failed': WebhookEventType.INVOICE_PAYMENT_FAILED,
      'charge.refunded': WebhookEventType.REFUND_CREATED,
    };
    return mapping[stripeType] || WebhookEventType.UNKNOWN;
  }

  private mapPayPalEventType(paypalType: string): WebhookEventType {
    const mapping: Record<string, WebhookEventType> = {
      'CHECKOUT.ORDER.APPROVED': WebhookEventType.PAYMENT_SUCCEEDED,
      'PAYMENT.CAPTURE.COMPLETED': WebhookEventType.PAYMENT_SUCCEEDED,
      'BILLING.SUBSCRIPTION.CREATED': WebhookEventType.SUBSCRIPTION_CREATED,
      'BILLING.SUBSCRIPTION.UPDATED': WebhookEventType.SUBSCRIPTION_UPDATED,
      'BILLING.SUBSCRIPTION.CANCELLED': WebhookEventType.SUBSCRIPTION_CANCELLED,
      'PAYMENT.CAPTURE.REFUNDED': WebhookEventType.REFUND_CREATED,
    };
    return mapping[paypalType] || WebhookEventType.UNKNOWN;
  }

  private mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
    const mapping: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.PAST_DUE,
      trialing: SubscriptionStatus.TRIALING,
      paused: SubscriptionStatus.PAUSED,
    };
    return mapping[status] || SubscriptionStatus.CANCELLED;
  }

  private mapPayPalSubscriptionStatus(status: string): SubscriptionStatus {
    const mapping: Record<string, SubscriptionStatus> = {
      ACTIVE: SubscriptionStatus.ACTIVE,
      SUSPENDED: SubscriptionStatus.PAUSED,
      CANCELLED: SubscriptionStatus.CANCELLED,
      EXPIRED: SubscriptionStatus.EXPIRED,
    };
    return mapping[status] || SubscriptionStatus.CANCELLED;
  }

  private mapPaystackSubscriptionStatus(status: string): SubscriptionStatus {
    const mapping: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      'non-renewing': SubscriptionStatus.CANCELLED,
      attention: SubscriptionStatus.PAST_DUE,
      completed: SubscriptionStatus.EXPIRED,
    };
    return mapping[status] || SubscriptionStatus.CANCELLED;
  }
}

export default WebhookService;
