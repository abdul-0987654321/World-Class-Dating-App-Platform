import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

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
    // TODO: Implement checkout completion logic
    // - Create subscription record
    // - Update user tier
    // - Send confirmation notification
  }

  private async handleStripeSubscriptionCreated(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling customer.subscription.created');
    // TODO: Implement subscription creation logic
  }

  private async handleStripeSubscriptionUpdated(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling customer.subscription.updated');
    // TODO: Implement subscription update logic
    // - Handle plan changes
    // - Update billing period
  }

  private async handleStripeSubscriptionDeleted(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling customer.subscription.deleted');
    // TODO: Implement subscription deletion logic
    // - Downgrade user to free tier
    // - Clean up subscription record
  }

  private async handleStripeInvoicePaid(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling invoice.paid');
    // TODO: Implement invoice payment logic
    // - Record payment
    // - Extend subscription period
  }

  private async handleStripeInvoicePaymentFailed(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling invoice.payment_failed');
    // TODO: Implement payment failure logic
    // - Send payment failure notification
    // - Start grace period
  }

  private async handleStripePaymentSucceeded(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling payment_intent.succeeded');
    // TODO: Implement successful payment logic
    // - Handle one-time purchases (coins, boosts)
    // - Credit user account
  }

  private async handleStripePaymentFailed(event: StripeWebhookEvent): Promise<void> {
    this.logger.log('Handling payment_intent.payment_failed');
    // TODO: Implement payment failure logic
  }

  // Private Apple handlers
  private async handleAppleSubscribed(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling SUBSCRIBED notification');
    // TODO: Implement Apple subscription creation
  }

  private async handleAppleDidRenew(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling DID_RENEW notification');
    // TODO: Implement subscription renewal
  }

  private async handleAppleDidFailToRenew(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling DID_FAIL_TO_RENEW notification');
    // TODO: Implement renewal failure handling
  }

  private async handleAppleRenewalStatusChanged(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling DID_CHANGE_RENEWAL_STATUS notification');
    // TODO: Implement renewal status change
  }

  private async handleAppleExpired(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling EXPIRED notification');
    // TODO: Implement subscription expiration
  }

  private async handleAppleGracePeriodExpired(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling GRACE_PERIOD_EXPIRED notification');
    // TODO: Implement grace period expiration
  }

  private async handleAppleRefund(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling REFUND notification');
    // TODO: Implement refund processing
  }

  private async handleAppleRevoke(event: AppleWebhookEvent): Promise<void> {
    this.logger.log('Handling REVOKE notification');
    // TODO: Implement purchase revocation
  }

  // Private Google handlers
  private async handleGoogleSubscriptionNotification(notification: any): Promise<void> {
    this.logger.log(`Handling Google subscription notification type: ${notification.notificationType}`);
    // Notification types: 1=RECOVERED, 2=RENEWED, 3=CANCELED, 4=PURCHASED, etc.
    // TODO: Implement based on notificationType
  }

  private async handleGoogleOneTimeProductNotification(notification: any): Promise<void> {
    this.logger.log('Handling Google one-time product notification');
    // TODO: Implement one-time purchase handling
  }

  private async handleGoogleVoidedPurchaseNotification(notification: any): Promise<void> {
    this.logger.log('Handling Google voided purchase notification');
    // TODO: Implement voided purchase handling
  }
}
