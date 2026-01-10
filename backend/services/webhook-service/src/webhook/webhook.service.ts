import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Subscription status enum
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  GRACE_PERIOD = 'grace_period',
}

// Plan type enum
export type PlanType = 'free' | 'premium' | 'elite' | 'platinum';

// Subscription record interface
export interface SubscriptionRecord {
  userId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  provider: 'stripe' | 'apple' | 'google';
  providerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Stripe webhook event interface
 */
export interface StripeWebhookEvent {
  id: string;
  object: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
  api_version?: string;
}

/**
 * Apple webhook event interface (App Store Server Notifications V2)
 */
export interface AppleWebhookEvent {
  signedPayload: string;
  notificationType: string;
  subtype?: string;
  data?: {
    bundleId: string;
    environment: string;
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
}

/**
 * Google webhook event interface (Real-time Developer Notifications)
 */
export interface GoogleWebhookEvent {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

/**
 * Webhook processing result
 */
export interface WebhookResult {
  success: boolean;
  eventId?: string;
  eventType?: string;
  message?: string;
  error?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  // In-memory store for subscriptions (replace with database in production)
  private subscriptions: Map<string, SubscriptionRecord> = new Map();
  // Store mapping of provider subscription IDs to user IDs
  private providerToUserMap: Map<string, string> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Handle Stripe webhook events
   * @param event - The Stripe webhook event
   * @returns Processing result
   */
  async handleStripeWebhook(event: StripeWebhookEvent): Promise<WebhookResult> {
    this.logger.log(`Processing Stripe webhook: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleStripeCheckoutCompleted(event);
          break;

        case 'customer.subscription.created':
          await this.handleStripeSubscriptionCreated(event);
          break;

        case 'customer.subscription.updated':
          await this.handleStripeSubscriptionUpdated(event);
          break;

        case 'customer.subscription.deleted':
          await this.handleStripeSubscriptionDeleted(event);
          break;

        case 'invoice.paid':
          await this.handleStripeInvoicePaid(event);
          break;

        case 'invoice.payment_failed':
          await this.handleStripeInvoicePaymentFailed(event);
          break;

        case 'payment_intent.succeeded':
          await this.handleStripePaymentSucceeded(event);
          break;

        case 'payment_intent.payment_failed':
          await this.handleStripePaymentFailed(event);
          break;

        default:
          this.logger.warn(`Unhandled Stripe event type: ${event.type}`);
      }

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        message: `Successfully processed ${event.type}`,
      };
    } catch (error) {
      this.logger.error(`Error processing Stripe webhook ${event.id}:`, error);
      return {
        success: false,
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle Apple App Store webhook events
   * @param event - The Apple webhook event
   * @returns Processing result
   */
  async handleAppleWebhook(event: AppleWebhookEvent): Promise<WebhookResult> {
    this.logger.log(`Processing Apple webhook: ${event.notificationType}`);

    try {
      switch (event.notificationType) {
        case 'SUBSCRIBED':
          await this.handleAppleSubscribed(event);
          break;

        case 'DID_RENEW':
          await this.handleAppleDidRenew(event);
          break;

        case 'DID_FAIL_TO_RENEW':
          await this.handleAppleDidFailToRenew(event);
          break;

        case 'DID_CHANGE_RENEWAL_STATUS':
          await this.handleAppleRenewalStatusChanged(event);
          break;

        case 'EXPIRED':
          await this.handleAppleExpired(event);
          break;

        case 'GRACE_PERIOD_EXPIRED':
          await this.handleAppleGracePeriodExpired(event);
          break;

        case 'REFUND':
          await this.handleAppleRefund(event);
          break;

        case 'REVOKE':
          await this.handleAppleRevoke(event);
          break;

        default:
          this.logger.warn(`Unhandled Apple notification type: ${event.notificationType}`);
      }

      return {
        success: true,
        eventType: event.notificationType,
        message: `Successfully processed ${event.notificationType}`,
      };
    } catch (error) {
      this.logger.error(`Error processing Apple webhook:`, error);
      return {
        success: false,
        eventType: event.notificationType,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle Google Play webhook events (Real-time Developer Notifications)
   * @param event - The Google webhook event
   * @returns Processing result
   */
  async handleGoogleWebhook(event: GoogleWebhookEvent): Promise<WebhookResult> {
    this.logger.log(`Processing Google webhook: ${event.message.messageId}`);

    try {
      // Decode the base64 data from the Pub/Sub message
      const decodedData = Buffer.from(event.message.data, 'base64').toString('utf-8');
      const notification = JSON.parse(decodedData);

      if (notification.subscriptionNotification) {
        await this.handleGoogleSubscriptionNotification(notification.subscriptionNotification);
      } else if (notification.oneTimeProductNotification) {
        await this.handleGoogleOneTimeProductNotification(notification.oneTimeProductNotification);
      } else if (notification.voidedPurchaseNotification) {
        await this.handleGoogleVoidedPurchaseNotification(notification.voidedPurchaseNotification);
      } else {
        this.logger.warn('Unknown Google notification type');
      }

      return {
        success: true,
        eventId: event.message.messageId,
        message: 'Successfully processed Google notification',
      };
    } catch (error) {
      this.logger.error(`Error processing Google webhook:`, error);
      return {
        success: false,
        eventId: event.message.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature for security
   * @param payload - The raw webhook payload
   * @param signature - The signature header from the webhook request
   * @param secret - The webhook signing secret
   * @returns Whether the signature is valid
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean {
    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString('utf-8');

      // Handle Stripe-style signatures (t=timestamp,v1=signature)
      if (signature.includes(',')) {
        const signatureParts = signature.split(',');
        const timestampPart = signatureParts.find(part => part.startsWith('t='));
        const signaturePart = signatureParts.find(part => part.startsWith('v1='));

        if (!timestampPart || !signaturePart) {
          this.logger.warn('Invalid Stripe signature format');
          return false;
        }

        const timestamp = timestampPart.split('=')[1];
        const expectedSignature = signaturePart.split('=')[1];

        // Verify timestamp is within acceptable range (5 minutes)
        const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
        if (timestampAge > 300) {
          this.logger.warn('Webhook timestamp too old');
          return false;
        }

        // Compute expected signature
        const signedPayload = `${timestamp}.${payloadString}`;
        const computedSignature = crypto
          .createHmac('sha256', secret)
          .update(signedPayload)
          .digest('hex');

        return crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(computedSignature)
        );
      }

      // Handle simple HMAC signatures
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Private Stripe handlers
  private async handleStripeCheckoutCompleted(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling checkout.session.completed');
    const session = event.data.object as Record<string, any>;

    const userId = session.client_reference_id || session.metadata?.userId;
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!userId) {
      this.logger.warn('Checkout completed without user ID');
      return;
    }

    // Determine plan from metadata or line items
    const planType = (session.metadata?.plan || 'premium') as PlanType;

    // Create subscription record
    const subscription: SubscriptionRecord = {
      userId,
      plan: planType,
      status: SubscriptionStatus.ACTIVE,
      provider: 'stripe',
      providerId: subscriptionId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, subscription);
    this.providerToUserMap.set(subscriptionId, userId);

    // Send confirmation notification
    await this.sendNotification(userId, 'subscription_created', {
      title: 'Welcome to Premium!',
      body: `Your ${planType} subscription is now active. Enjoy your new features!`,
      plan: planType,
    });

    this.logger.log(`Subscription created for user ${userId}: ${planType}`);
  }

  private async handleStripeSubscriptionCreated(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling customer.subscription.created');
    const subscription = event.data.object as Record<string, any>;

    const userId = subscription.metadata?.userId || this.providerToUserMap.get(subscription.id);
    if (!userId) {
      this.logger.warn('Subscription created without user ID mapping');
      return;
    }

    const planType = this.getPlanFromStripePrice(subscription.items?.data?.[0]?.price?.id);

    const record: SubscriptionRecord = {
      userId,
      plan: planType,
      status: SubscriptionStatus.ACTIVE,
      provider: 'stripe',
      providerId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    };

    this.subscriptions.set(userId, record);
    this.providerToUserMap.set(subscription.id, userId);

    this.logger.log(`Subscription record created for user ${userId}`);
  }

  private async handleStripeSubscriptionUpdated(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling customer.subscription.updated');
    const subscription = event.data.object as Record<string, any>;

    const userId = this.providerToUserMap.get(subscription.id);
    if (!userId) {
      this.logger.warn(`No user found for subscription ${subscription.id}`);
      return;
    }

    const existingRecord = this.subscriptions.get(userId);
    const newPlan = this.getPlanFromStripePrice(subscription.items?.data?.[0]?.price?.id);
    const newStatus = this.mapStripeStatus(subscription.status);

    // Check if plan changed
    if (existingRecord && existingRecord.plan !== newPlan) {
      await this.sendNotification(userId, 'plan_changed', {
        title: 'Plan Updated',
        body: `Your subscription has been updated to ${newPlan}.`,
        oldPlan: existingRecord.plan,
        newPlan,
      });
    }

    const record: SubscriptionRecord = {
      userId,
      plan: newPlan,
      status: newStatus,
      provider: 'stripe',
      providerId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    };

    this.subscriptions.set(userId, record);
    this.logger.log(`Subscription updated for user ${userId}: ${newPlan} (${newStatus})`);
  }

  private async handleStripeSubscriptionDeleted(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling customer.subscription.deleted');
    const subscription = event.data.object as Record<string, any>;

    const userId = this.providerToUserMap.get(subscription.id);
    if (!userId) {
      this.logger.warn(`No user found for deleted subscription ${subscription.id}`);
      return;
    }

    // Downgrade user to free tier
    const record: SubscriptionRecord = {
      userId,
      plan: 'free',
      status: SubscriptionStatus.EXPIRED,
      provider: 'stripe',
      providerId: subscription.id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, record);

    // Send notification
    await this.sendNotification(userId, 'subscription_cancelled', {
      title: 'Subscription Ended',
      body: 'Your premium subscription has ended. You have been downgraded to the free plan.',
    });

    this.logger.log(`Subscription deleted, user ${userId} downgraded to free`);
  }

  private async handleStripeInvoicePaid(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling invoice.paid');
    const invoice = event.data.object as Record<string, any>;

    const subscriptionId = invoice.subscription as string;
    const userId = this.providerToUserMap.get(subscriptionId);

    if (!userId) {
      this.logger.warn(`No user found for invoice subscription ${subscriptionId}`);
      return;
    }

    const existingRecord = this.subscriptions.get(userId);
    if (existingRecord) {
      // Extend subscription period
      existingRecord.status = SubscriptionStatus.ACTIVE;
      existingRecord.currentPeriodEnd = new Date(invoice.lines?.data?.[0]?.period?.end * 1000 || Date.now() + 30 * 24 * 60 * 60 * 1000);
      this.subscriptions.set(userId, existingRecord);
    }

    // Record payment (in production, save to database)
    this.logger.log(`Invoice paid for user ${userId}: $${(invoice.amount_paid / 100).toFixed(2)}`);

    // Send receipt notification
    await this.sendNotification(userId, 'payment_received', {
      title: 'Payment Received',
      body: `We've received your payment of $${(invoice.amount_paid / 100).toFixed(2)}. Thank you!`,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
    });
  }

  private async handleStripeInvoicePaymentFailed(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling invoice.payment_failed');
    const invoice = event.data.object as Record<string, any>;

    const subscriptionId = invoice.subscription as string;
    const userId = this.providerToUserMap.get(subscriptionId);

    if (!userId) {
      this.logger.warn(`No user found for failed invoice subscription ${subscriptionId}`);
      return;
    }

    // Update subscription status to past_due
    const existingRecord = this.subscriptions.get(userId);
    if (existingRecord) {
      existingRecord.status = SubscriptionStatus.PAST_DUE;
      this.subscriptions.set(userId, existingRecord);
    }

    // Send payment failure notification
    await this.sendNotification(userId, 'payment_failed', {
      title: 'Payment Failed',
      body: 'We were unable to process your payment. Please update your payment method to avoid service interruption.',
      nextRetry: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
    });

    this.logger.log(`Payment failed for user ${userId}, status set to past_due`);
  }

  private async handleStripePaymentSucceeded(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling payment_intent.succeeded');
    const paymentIntent = event.data.object as Record<string, any>;

    const userId = paymentIntent.metadata?.userId;
    const purchaseType = paymentIntent.metadata?.type; // 'coins', 'boost', 'superlike', etc.

    if (!userId) {
      this.logger.warn('Payment succeeded without user ID');
      return;
    }

    // Handle one-time purchases based on type
    switch (purchaseType) {
      case 'coins':
        const coinAmount = parseInt(paymentIntent.metadata?.amount || '0', 10);
        await this.creditUserCoins(userId, coinAmount);
        await this.sendNotification(userId, 'coins_purchased', {
          title: 'Coins Added!',
          body: `${coinAmount} coins have been added to your account.`,
          amount: coinAmount,
        });
        break;

      case 'boost':
        await this.creditUserBoost(userId);
        await this.sendNotification(userId, 'boost_purchased', {
          title: 'Boost Activated!',
          body: 'Your profile boost is now active. Get more visibility!',
        });
        break;

      case 'superlike':
        const superlikeCount = parseInt(paymentIntent.metadata?.count || '5', 10);
        await this.creditUserSuperlikes(userId, superlikeCount);
        await this.sendNotification(userId, 'superlikes_purchased', {
          title: 'Super Likes Added!',
          body: `${superlikeCount} Super Likes have been added to your account.`,
          count: superlikeCount,
        });
        break;

      default:
        this.logger.log(`One-time payment succeeded for user ${userId}: $${(paymentIntent.amount / 100).toFixed(2)}`);
    }
  }

  private async handleStripePaymentFailed(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling payment_intent.payment_failed');
    const paymentIntent = event.data.object as Record<string, any>;

    const userId = paymentIntent.metadata?.userId;
    if (!userId) {
      this.logger.warn('Payment failed without user ID');
      return;
    }

    const lastError = paymentIntent.last_payment_error;
    const errorMessage = lastError?.message || 'Payment could not be processed';

    await this.sendNotification(userId, 'payment_failed', {
      title: 'Payment Failed',
      body: errorMessage,
      declineCode: lastError?.decline_code,
    });

    this.logger.log(`Payment failed for user ${userId}: ${errorMessage}`);
  }

  // Private Apple handlers
  private async handleAppleSubscribed(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling SUBSCRIBED notification');
    const transactionInfo = await this.decodeAppleTransaction(event.data?.signedTransactionInfo);
    if (!transactionInfo) return;

    const userId = transactionInfo.appAccountToken; // App account token should be the user ID
    const originalTransactionId = transactionInfo.originalTransactionId;
    const productId = transactionInfo.productId;

    if (!userId) {
      this.logger.warn('Apple subscription without user ID (appAccountToken)');
      return;
    }

    const planType = this.getPlanFromAppleProduct(productId);

    const subscription: SubscriptionRecord = {
      userId,
      plan: planType,
      status: SubscriptionStatus.ACTIVE,
      provider: 'apple',
      providerId: originalTransactionId,
      currentPeriodStart: new Date(transactionInfo.purchaseDate),
      currentPeriodEnd: new Date(transactionInfo.expiresDate),
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, subscription);
    this.providerToUserMap.set(originalTransactionId, userId);

    await this.sendNotification(userId, 'subscription_created', {
      title: 'Welcome to Premium!',
      body: `Your ${planType} subscription is now active via App Store.`,
      plan: planType,
    });

    this.logger.log(`Apple subscription created for user ${userId}: ${planType}`);
  }

  private async handleAppleDidRenew(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling DID_RENEW notification');
    const transactionInfo = await this.decodeAppleTransaction(event.data?.signedTransactionInfo);
    if (!transactionInfo) return;

    const userId = this.providerToUserMap.get(transactionInfo.originalTransactionId);
    if (!userId) {
      this.logger.warn(`No user found for Apple renewal: ${transactionInfo.originalTransactionId}`);
      return;
    }

    const existingRecord = this.subscriptions.get(userId);
    if (existingRecord) {
      existingRecord.status = SubscriptionStatus.ACTIVE;
      existingRecord.currentPeriodEnd = new Date(transactionInfo.expiresDate);
      this.subscriptions.set(userId, existingRecord);
    }

    await this.sendNotification(userId, 'subscription_renewed', {
      title: 'Subscription Renewed',
      body: 'Your subscription has been successfully renewed.',
      expiresDate: new Date(transactionInfo.expiresDate).toISOString(),
    });

    this.logger.log(`Apple subscription renewed for user ${userId}`);
  }

  private async handleAppleDidFailToRenew(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling DID_FAIL_TO_RENEW notification');
    const transactionInfo = await this.decodeAppleTransaction(event.data?.signedTransactionInfo);
    if (!transactionInfo) return;

    const userId = this.providerToUserMap.get(transactionInfo.originalTransactionId);
    if (!userId) {
      this.logger.warn(`No user found for Apple renewal failure: ${transactionInfo.originalTransactionId}`);
      return;
    }

    const existingRecord = this.subscriptions.get(userId);
    if (existingRecord) {
      existingRecord.status = SubscriptionStatus.GRACE_PERIOD;
      this.subscriptions.set(userId, existingRecord);
    }

    await this.sendNotification(userId, 'renewal_failed', {
      title: 'Renewal Issue',
      body: 'We couldn\'t renew your subscription. Please check your payment method in the App Store.',
    });

    this.logger.log(`Apple renewal failed for user ${userId}, entering grace period`);
  }

  private async handleAppleRenewalStatusChanged(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling DID_CHANGE_RENEWAL_STATUS notification');
    const renewalInfo = await this.decodeAppleRenewal(event.data?.signedRenewalInfo);
    const transactionInfo = await this.decodeAppleTransaction(event.data?.signedTransactionInfo);
    if (!transactionInfo) return;

    const userId = this.providerToUserMap.get(transactionInfo.originalTransactionId);
    if (!userId) {
      this.logger.warn(`No user found for Apple renewal status change: ${transactionInfo.originalTransactionId}`);
      return;
    }

    const existingRecord = this.subscriptions.get(userId);
    if (existingRecord && renewalInfo) {
      existingRecord.cancelAtPeriodEnd = !renewalInfo.autoRenewStatus;
      this.subscriptions.set(userId, existingRecord);

      if (!renewalInfo.autoRenewStatus) {
        await this.sendNotification(userId, 'auto_renew_disabled', {
          title: 'Auto-Renewal Disabled',
          body: `Your subscription will expire on ${new Date(transactionInfo.expiresDate).toLocaleDateString()}.`,
          expiresDate: new Date(transactionInfo.expiresDate).toISOString(),
        });
      } else {
        await this.sendNotification(userId, 'auto_renew_enabled', {
          title: 'Auto-Renewal Enabled',
          body: 'Your subscription will automatically renew.',
        });
      }
    }

    this.logger.log(`Apple renewal status changed for user ${userId}`);
  }

  private async handleAppleExpired(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling EXPIRED notification');
    const transactionInfo = await this.decodeAppleTransaction(event.data?.signedTransactionInfo);
    if (!transactionInfo) return;

    const userId = this.providerToUserMap.get(transactionInfo.originalTransactionId);
    if (!userId) {
      this.logger.warn(`No user found for Apple expiration: ${transactionInfo.originalTransactionId}`);
      return;
    }

    // Downgrade to free
    const record: SubscriptionRecord = {
      userId,
      plan: 'free',
      status: SubscriptionStatus.EXPIRED,
      provider: 'apple',
      providerId: transactionInfo.originalTransactionId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, record);

    await this.sendNotification(userId, 'subscription_expired', {
      title: 'Subscription Expired',
      body: 'Your premium subscription has expired. Renew to continue enjoying premium features.',
    });

    this.logger.log(`Apple subscription expired for user ${userId}`);
  }

  private async handleAppleGracePeriodExpired(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling GRACE_PERIOD_EXPIRED notification');
    const transactionInfo = await this.decodeAppleTransaction(event.data?.signedTransactionInfo);
    if (!transactionInfo) return;

    const userId = this.providerToUserMap.get(transactionInfo.originalTransactionId);
    if (!userId) {
      this.logger.warn(`No user found for Apple grace period expiration: ${transactionInfo.originalTransactionId}`);
      return;
    }

    // Downgrade to free after grace period
    const record: SubscriptionRecord = {
      userId,
      plan: 'free',
      status: SubscriptionStatus.EXPIRED,
      provider: 'apple',
      providerId: transactionInfo.originalTransactionId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, record);

    await this.sendNotification(userId, 'grace_period_expired', {
      title: 'Grace Period Ended',
      body: 'Your subscription grace period has ended. You have been downgraded to the free plan.',
    });

    this.logger.log(`Apple grace period expired for user ${userId}`);
  }

  private async handleAppleRefund(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling REFUND notification');
    const transactionInfo = await this.decodeAppleTransaction(event.data?.signedTransactionInfo);
    if (!transactionInfo) return;

    const userId = this.providerToUserMap.get(transactionInfo.originalTransactionId);
    if (!userId) {
      this.logger.warn(`No user found for Apple refund: ${transactionInfo.originalTransactionId}`);
      return;
    }

    // Revoke access on refund
    const record: SubscriptionRecord = {
      userId,
      plan: 'free',
      status: SubscriptionStatus.EXPIRED,
      provider: 'apple',
      providerId: transactionInfo.originalTransactionId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, record);

    await this.sendNotification(userId, 'subscription_refunded', {
      title: 'Refund Processed',
      body: 'Your subscription purchase has been refunded. Your premium access has been revoked.',
    });

    this.logger.log(`Apple refund processed for user ${userId}`);
  }

  private async handleAppleRevoke(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling REVOKE notification');
    const transactionInfo = await this.decodeAppleTransaction(event.data?.signedTransactionInfo);
    if (!transactionInfo) return;

    const userId = this.providerToUserMap.get(transactionInfo.originalTransactionId);
    if (!userId) {
      this.logger.warn(`No user found for Apple revocation: ${transactionInfo.originalTransactionId}`);
      return;
    }

    // Revoke access (e.g., Family Sharing revocation)
    const record: SubscriptionRecord = {
      userId,
      plan: 'free',
      status: SubscriptionStatus.EXPIRED,
      provider: 'apple',
      providerId: transactionInfo.originalTransactionId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, record);

    await this.sendNotification(userId, 'access_revoked', {
      title: 'Access Revoked',
      body: 'Your premium access has been revoked.',
    });

    this.logger.log(`Apple access revoked for user ${userId}`);
  }

  // Private Google handlers
  private async handleGoogleSubscriptionNotification(notification: any): Promise<void> {
    this.logger.log(`Handling Google subscription notification type: ${notification.notificationType}`);

    const purchaseToken = notification.purchaseToken;
    const subscriptionId = notification.subscriptionId;

    // Google notification types
    const NOTIFICATION_TYPE = {
      RECOVERED: 1,
      RENEWED: 2,
      CANCELED: 3,
      PURCHASED: 4,
      ON_HOLD: 5,
      IN_GRACE_PERIOD: 6,
      RESTARTED: 7,
      PRICE_CHANGE_CONFIRMED: 8,
      DEFERRED: 9,
      PAUSED: 10,
      PAUSE_SCHEDULE_CHANGED: 11,
      REVOKED: 12,
      EXPIRED: 13,
    };

    // Get user from purchase token mapping
    const userId = this.providerToUserMap.get(purchaseToken);

    switch (notification.notificationType) {
      case NOTIFICATION_TYPE.PURCHASED:
      case NOTIFICATION_TYPE.RESTARTED:
        // New subscription or restart
        if (userId) {
          const planType = this.getPlanFromGoogleProduct(subscriptionId);
          const subscription: SubscriptionRecord = {
            userId,
            plan: planType,
            status: SubscriptionStatus.ACTIVE,
            provider: 'google',
            providerId: purchaseToken,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
          };
          this.subscriptions.set(userId, subscription);

          await this.sendNotification(userId, 'subscription_created', {
            title: 'Welcome to Premium!',
            body: `Your ${planType} subscription is now active via Google Play.`,
            plan: planType,
          });
        }
        break;

      case NOTIFICATION_TYPE.RENEWED:
      case NOTIFICATION_TYPE.RECOVERED:
        if (userId) {
          const existingRecord = this.subscriptions.get(userId);
          if (existingRecord) {
            existingRecord.status = SubscriptionStatus.ACTIVE;
            existingRecord.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            this.subscriptions.set(userId, existingRecord);
          }

          await this.sendNotification(userId, 'subscription_renewed', {
            title: 'Subscription Renewed',
            body: 'Your subscription has been successfully renewed.',
          });
        }
        break;

      case NOTIFICATION_TYPE.CANCELED:
        if (userId) {
          const existingRecord = this.subscriptions.get(userId);
          if (existingRecord) {
            existingRecord.cancelAtPeriodEnd = true;
            existingRecord.status = SubscriptionStatus.CANCELLED;
            this.subscriptions.set(userId, existingRecord);
          }

          await this.sendNotification(userId, 'subscription_cancelled', {
            title: 'Subscription Cancelled',
            body: 'Your subscription will expire at the end of the current billing period.',
          });
        }
        break;

      case NOTIFICATION_TYPE.IN_GRACE_PERIOD:
        if (userId) {
          const existingRecord = this.subscriptions.get(userId);
          if (existingRecord) {
            existingRecord.status = SubscriptionStatus.GRACE_PERIOD;
            this.subscriptions.set(userId, existingRecord);
          }

          await this.sendNotification(userId, 'grace_period_started', {
            title: 'Payment Issue',
            body: 'We couldn\'t process your payment. Please update your payment method.',
          });
        }
        break;

      case NOTIFICATION_TYPE.ON_HOLD:
        if (userId) {
          const existingRecord = this.subscriptions.get(userId);
          if (existingRecord) {
            existingRecord.status = SubscriptionStatus.PAST_DUE;
            this.subscriptions.set(userId, existingRecord);
          }

          await this.sendNotification(userId, 'subscription_on_hold', {
            title: 'Subscription On Hold',
            body: 'Your subscription is on hold due to a payment issue.',
          });
        }
        break;

      case NOTIFICATION_TYPE.EXPIRED:
      case NOTIFICATION_TYPE.REVOKED:
        if (userId) {
          const record: SubscriptionRecord = {
            userId,
            plan: 'free',
            status: SubscriptionStatus.EXPIRED,
            provider: 'google',
            providerId: purchaseToken,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(),
            cancelAtPeriodEnd: false,
          };
          this.subscriptions.set(userId, record);

          await this.sendNotification(userId, 'subscription_expired', {
            title: 'Subscription Ended',
            body: 'Your premium subscription has ended. You have been downgraded to the free plan.',
          });
        }
        break;

      default:
        this.logger.log(`Unhandled Google notification type: ${notification.notificationType}`);
    }
  }

  private async handleGoogleOneTimeProductNotification(notification: any): Promise<void> {
    this.logger.log('Handling Google one-time product notification');

    const purchaseToken = notification.purchaseToken;
    const sku = notification.sku;

    // Get user from purchase token
    const userId = this.providerToUserMap.get(purchaseToken);
    if (!userId) {
      this.logger.warn(`No user found for Google one-time purchase: ${purchaseToken}`);
      return;
    }

    // Handle based on product type
    if (sku?.includes('coins')) {
      const amount = this.getCoinsFromGoogleSku(sku);
      await this.creditUserCoins(userId, amount);

      await this.sendNotification(userId, 'coins_purchased', {
        title: 'Coins Added!',
        body: `${amount} coins have been added to your account.`,
        amount,
      });
    } else if (sku?.includes('boost')) {
      await this.creditUserBoost(userId);

      await this.sendNotification(userId, 'boost_purchased', {
        title: 'Boost Activated!',
        body: 'Your profile boost is now active.',
      });
    }

    this.logger.log(`Google one-time purchase processed for user ${userId}: ${sku}`);
  }

  private async handleGoogleVoidedPurchaseNotification(notification: any): Promise<void> {
    this.logger.log('Handling Google voided purchase notification');

    const purchaseToken = notification.purchaseToken;
    const orderId = notification.orderId;

    const userId = this.providerToUserMap.get(purchaseToken);
    if (!userId) {
      this.logger.warn(`No user found for voided purchase: ${purchaseToken}`);
      return;
    }

    // Revoke access for voided purchase (chargeback, refund, etc.)
    const existingRecord = this.subscriptions.get(userId);
    if (existingRecord && existingRecord.provider === 'google') {
      const record: SubscriptionRecord = {
        userId,
        plan: 'free',
        status: SubscriptionStatus.EXPIRED,
        provider: 'google',
        providerId: purchaseToken,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
      };
      this.subscriptions.set(userId, record);
    }

    await this.sendNotification(userId, 'purchase_voided', {
      title: 'Purchase Voided',
      body: 'A purchase has been voided. Your access has been updated accordingly.',
      orderId,
    });

    this.logger.log(`Google voided purchase processed for user ${userId}`);
  }

  // Helper methods
  private async sendNotification(userId: string, type: string, data: Record<string, any>): Promise<void> {
    // In production, integrate with notification service
    this.logger.log(`Notification sent to ${userId}: ${type}`, data);
  }

  private getPlanFromStripePrice(priceId: string): PlanType {
    const priceMap: Record<string, PlanType> = {
      [this.configService.get('STRIPE_PRICE_PREMIUM') || 'price_premium']: 'premium',
      [this.configService.get('STRIPE_PRICE_ELITE') || 'price_elite']: 'elite',
      [this.configService.get('STRIPE_PRICE_PLATINUM') || 'price_platinum']: 'platinum',
    };
    return priceMap[priceId] || 'premium';
  }

  private getPlanFromAppleProduct(productId: string): PlanType {
    if (productId?.includes('platinum')) return 'platinum';
    if (productId?.includes('elite')) return 'elite';
    if (productId?.includes('premium')) return 'premium';
    return 'premium';
  }

  private getPlanFromGoogleProduct(subscriptionId: string): PlanType {
    if (subscriptionId?.includes('platinum')) return 'platinum';
    if (subscriptionId?.includes('elite')) return 'elite';
    if (subscriptionId?.includes('premium')) return 'premium';
    return 'premium';
  }

  private getCoinsFromGoogleSku(sku: string): number {
    // Extract coin amount from SKU (e.g., "coins_100" -> 100)
    const match = sku.match(/coins_(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private mapStripeStatus(status: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.PAST_DUE,
      incomplete: SubscriptionStatus.PAST_DUE,
      incomplete_expired: SubscriptionStatus.EXPIRED,
      trialing: SubscriptionStatus.ACTIVE,
    };
    return statusMap[status] || SubscriptionStatus.ACTIVE;
  }

  private async decodeAppleTransaction(signedTransaction?: string): Promise<any> {
    if (!signedTransaction) return null;
    try {
      // In production, verify and decode the JWS token
      // For now, decode the payload (middle part of JWT)
      const parts = signedTransaction.split('.');
      if (parts.length !== 3) return null;
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      return JSON.parse(payload);
    } catch (error) {
      this.logger.error('Failed to decode Apple transaction', error);
      return null;
    }
  }

  private async decodeAppleRenewal(signedRenewal?: string): Promise<any> {
    if (!signedRenewal) return null;
    try {
      const parts = signedRenewal.split('.');
      if (parts.length !== 3) return null;
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      return JSON.parse(payload);
    } catch (error) {
      this.logger.error('Failed to decode Apple renewal info', error);
      return null;
    }
  }

  private async creditUserCoins(userId: string, amount: number): Promise<void> {
    // In production, integrate with gems/coins service
    this.logger.log(`Credited ${amount} coins to user ${userId}`);
  }

  private async creditUserBoost(userId: string): Promise<void> {
    // In production, integrate with boost service
    this.logger.log(`Credited boost to user ${userId}`);
  }

  private async creditUserSuperlikes(userId: string, count: number): Promise<void> {
    // In production, integrate with superlikes service
    this.logger.log(`Credited ${count} superlikes to user ${userId}`);
  }
}
