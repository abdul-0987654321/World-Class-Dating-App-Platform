import logger from '../../utils/logger';
import { ServiceClient } from '@flamoral/shared';

interface SendNotificationDto {
  userId: string;
  type: 'payment_success' | 'payment_failed' | 'subscription_updated' | 'subscription_canceled' | 'subscription_renewed' | 'trial_ending' | 'upcoming_payment';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class NotificationServiceClient {
  private client: ServiceClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
    this.client = new ServiceClient({
      baseUrl: this.baseUrl,
      serviceName: 'payment-service',
      timeout: 5000,
    });
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(data: SendNotificationDto): Promise<void> {
    try {
      await this.client.post('/api/internal/notifications/send', data);
      logger.info(`Notification sent to user ${data.userId}: ${data.type}`);
    } catch (error: any) {
      // Don't throw - notifications are non-critical
      logger.warn(`Failed to send notification to user ${data.userId}: ${error.message}`);
    }
  }

  /**
   * Send payment success notification
   */
  async notifyPaymentSuccess(userId: string, amount: number, productName: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'payment_success',
      title: 'Payment Successful',
      body: `Your payment of $${amount.toFixed(2)} for ${productName} was successful.`,
      data: { amount, productName },
    });
  }

  /**
   * Send payment failure notification
   */
  async notifyPaymentFailed(userId: string, reason?: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'payment_failed',
      title: 'Payment Failed',
      body: reason || 'Your payment could not be processed. Please check your payment method and try again.',
      data: { reason },
    });
  }

  /**
   * Send subscription updated notification
   */
  async notifySubscriptionUpdated(userId: string, planName: string, status: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'subscription_updated',
      title: 'Subscription Updated',
      body: `Your ${planName} subscription has been updated. Status: ${status}`,
      data: { planName, status },
    });
  }

  /**
   * Send subscription canceled notification
   */
  async notifySubscriptionCanceled(userId: string, planName: string, endsAt: Date): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'subscription_canceled',
      title: 'Subscription Canceled',
      body: `Your ${planName} subscription has been canceled. You will have access until ${endsAt.toLocaleDateString()}.`,
      data: { planName, endsAt: endsAt.toISOString() },
    });
  }

  /**
   * Send subscription renewed notification
   */
  async notifySubscriptionRenewed(userId: string, planName: string, amount: number, nextBillingDate: Date): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'subscription_renewed',
      title: 'Subscription Renewed',
      body: `Your ${planName} subscription has been renewed for $${amount.toFixed(2)}. Next billing date: ${nextBillingDate.toLocaleDateString()}`,
      data: { planName, amount, nextBillingDate: nextBillingDate.toISOString() },
    });
  }

  /**
   * Send trial ending notification
   */
  async notifyTrialEnding(userId: string, planName: string, endsAt: Date, daysRemaining: number): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'trial_ending',
      title: 'Trial Ending Soon',
      body: `Your ${planName} trial ends in ${daysRemaining} day(s) on ${endsAt.toLocaleDateString()}. Upgrade now to keep your premium features!`,
      data: { planName, endsAt: endsAt.toISOString(), daysRemaining },
    });
  }

  /**
   * Send upcoming payment notification
   */
  async notifyUpcomingPayment(userId: string, amount: number, billingDate: Date): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'upcoming_payment',
      title: 'Upcoming Payment',
      body: `Your subscription will renew on ${billingDate.toLocaleDateString()} for $${amount.toFixed(2)}.`,
      data: { amount, billingDate: billingDate.toISOString() },
    });
  }
}

export default new NotificationServiceClient();
