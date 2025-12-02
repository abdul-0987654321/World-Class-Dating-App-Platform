import Stripe from 'stripe';
import { db } from '../../infrastructure/database/connection';
import { UserServiceClient } from '../../infrastructure/clients/user-service.client';
import { NotificationServiceClient } from '../../infrastructure/clients/notification-service.client';
import logger from '../../utils/logger';
import {
  PaymentIntentMetadata,
  SubscriptionMetadata,
  CoinPackage,
  BoostProduct,
} from '../../types/stripe-events.types';

const userServiceClient = new UserServiceClient();
const notificationServiceClient = new NotificationServiceClient();

export class WebhookService {
  /**
   * Check if an event has already been processed (idempotency)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const event = await db('stripe_webhook_events')
      .where({ stripe_event_id: eventId, status: 'processed' })
      .first();
    return !!event;
  }

  /**
   * Store webhook event for processing
   */
  async storeEvent(event: Stripe.Event): Promise<void> {
    await db('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: JSON.stringify(event),
      status: 'pending',
    });
  }

  /**
   * Mark event as processed
   */
  async markEventProcessed(eventId: string): Promise<void> {
    await db('stripe_webhook_events')
      .where({ stripe_event_id: eventId })
      .update({ status: 'processed', processed_at: new Date() });
  }

  /**
   * Mark event as failed
   */
  async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    await db('stripe_webhook_events')
      .where({ stripe_event_id: eventId })
      .update({
        status: 'failed',
        error_message: errorMessage,
        retry_count: db.raw('retry_count + 1'),
      });
  }

  // Subscription Handlers

  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Processing subscription created: ${subscription.id}`);

    const metadata = subscription.metadata as SubscriptionMetadata;
    const userId = metadata?.user_id;

    if (!userId) {
      throw new Error('User ID not found in subscription metadata');
    }

    const planId = await this.getPlanIdFromStripePriceId(
      subscription.items.data[0]?.price.id
    );

    const planName = await this.getPlanName(planId);

    await db('user_subscriptions').insert({
      user_id: userId,
      plan_id: planId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      billing_cycle: this.getBillingCycle(subscription),
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      metadata: JSON.stringify(subscription.metadata),
    });

    // Update user's subscription status in user service
    await userServiceClient.updateUserSubscription(userId, {
      subscription_tier: planName,
      subscription_status: subscription.status,
    });

    // Send notification to user
    await notificationServiceClient.notifySubscriptionUpdated(userId, planName, subscription.status);

    logger.info(`Subscription created for user ${userId}: ${planName} (${subscription.status})`);
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Processing subscription updated: ${subscription.id}`);

    const existingSub = await db('user_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .first();

    if (!existingSub) {
      logger.warn(`Subscription ${subscription.id} not found in database`);
      return;
    }

    const planId = await this.getPlanIdFromStripePriceId(
      subscription.items.data[0]?.price.id
    );

    const planName = await this.getPlanName(planId);

    await db('user_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .update({
        plan_id: planId,
        status: subscription.status,
        billing_cycle: this.getBillingCycle(subscription),
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null,
        updated_at: new Date(),
      });

    // Update user service
    await userServiceClient.updateUserSubscription(existingSub.user_id, {
      subscription_tier: planName,
      subscription_status: subscription.status,
    });

    // Send notification to user
    await notificationServiceClient.notifySubscriptionUpdated(existingSub.user_id, planName, subscription.status);

    logger.info(`Subscription updated for user ${existingSub.user_id}: ${planName} (${subscription.status})`);
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Processing subscription deleted: ${subscription.id}`);

    const existingSub = await db('user_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .first();

    if (!existingSub) {
      logger.warn(`Subscription ${subscription.id} not found in database`);
      return;
    }

    const planName = await this.getPlanName(existingSub.plan_id);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    await db('user_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .update({
        status: 'canceled',
        canceled_at: new Date(),
        updated_at: new Date(),
      });

    // Downgrade user to free tier
    await userServiceClient.updateUserSubscription(existingSub.user_id, {
      subscription_tier: 'free',
      subscription_status: 'canceled',
    });

    // Notify user about cancellation
    await notificationServiceClient.notifySubscriptionCanceled(existingSub.user_id, planName, periodEnd);

    logger.info(`Subscription canceled for user ${existingSub.user_id}: ${planName}`);
  }

  async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Trial ending soon for subscription: ${subscription.id}`);

    const existingSub = await db('user_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .first();

    if (existingSub && subscription.trial_end) {
      const trialEndDate = new Date(subscription.trial_end * 1000);
      const daysRemaining = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const planName = await this.getPlanName(existingSub.plan_id);

      // Trigger notification to user about trial ending
      await notificationServiceClient.notifyTrialEnding(
        existingSub.user_id,
        planName,
        trialEndDate,
        daysRemaining
      );

      logger.info(`Trial ending notification sent to user ${existingSub.user_id} (${daysRemaining} days remaining)`);
    }
  }

  // Invoice Handlers

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing invoice payment succeeded: ${invoice.id}`);

    const userId = invoice.metadata?.user_id || (await this.getUserIdFromCustomer(invoice.customer as string));
    if (!userId) {
      logger.warn('User ID not found for invoice');
      return;
    }

    const subscriptionId = await this.getSubscriptionIdFromStripe(
      invoice.subscription as string
    );

    const amount = (invoice.amount_paid || 0) / 100;
    const description = invoice.lines.data[0]?.description || 'Subscription';

    await db('transactions').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      type: 'subscription',
      status: 'succeeded',
      amount,
      currency: invoice.currency.toUpperCase(),
      description: `Subscription payment - ${description}`,
      processed_at: new Date(),
    });

    // Get subscription details for notification
    if (subscriptionId) {
      const subscription = await db('user_subscriptions')
        .where({ id: subscriptionId })
        .first();

      if (subscription) {
        const planName = await this.getPlanName(subscription.plan_id);
        const nextBillingDate = new Date(subscription.current_period_end);

        // Notify user about successful renewal
        await notificationServiceClient.notifySubscriptionRenewed(
          userId,
          planName,
          amount,
          nextBillingDate
        );
      }
    }

    logger.info(`Invoice payment succeeded for user ${userId}: $${amount}`);
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing invoice payment failed: ${invoice.id}`);

    const userId = invoice.metadata?.user_id || (await this.getUserIdFromCustomer(invoice.customer as string));
    if (!userId) {
      logger.warn('User ID not found for failed invoice');
      return;
    }

    const amount = (invoice.amount_due || 0) / 100;

    await db('transactions').insert({
      user_id: userId,
      stripe_invoice_id: invoice.id,
      type: 'subscription',
      status: 'failed',
      amount,
      currency: invoice.currency.toUpperCase(),
      description: 'Subscription payment failed',
      failure_message: 'Payment method declined',
    });

    // Update subscription status to past_due
    if (invoice.subscription) {
      await db('user_subscriptions')
        .where({ stripe_subscription_id: invoice.subscription as string })
        .update({ status: 'past_due', updated_at: new Date() });

      // Update user service
      const subscription = await db('user_subscriptions')
        .where({ stripe_subscription_id: invoice.subscription as string })
        .first();

      if (subscription) {
        await userServiceClient.updateUserSubscription(userId, {
          subscription_tier: await this.getPlanName(subscription.plan_id),
          subscription_status: 'past_due',
        });
      }
    }

    // Notify user
    await notificationServiceClient.notifyPaymentFailed(
      userId,
      'Your subscription payment failed. Please update your payment method to continue your subscription.'
    );

    logger.info(`Invoice payment failed for user ${userId}: $${amount}`);
  }

  async handleInvoiceUpcoming(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing upcoming invoice: ${invoice.id}`);

    const userId = await this.getUserIdFromCustomer(invoice.customer as string);
    if (!userId) {
      logger.warn('User ID not found for upcoming invoice');
      return;
    }

    const amount = (invoice.amount_due || 0) / 100;
    const billingDate = new Date((invoice.next_payment_attempt || invoice.period_end || 0) * 1000);

    await notificationServiceClient.notifyUpcomingPayment(userId, amount, billingDate);

    logger.info(`Upcoming payment notification sent to user ${userId}: $${amount} on ${billingDate.toLocaleDateString()}`);
  }

  // Payment Intent Handlers

  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment intent succeeded: ${paymentIntent.id}`);

    const metadata = paymentIntent.metadata as PaymentIntentMetadata;
    const userId = metadata?.user_id;

    if (!userId) {
      logger.warn(`Payment intent ${paymentIntent.id} missing user_id in metadata`);
      return;
    }

    const purchaseType = metadata?.type || 'one_time';

    try {
      // Handle different purchase types
      switch (purchaseType) {
        case 'coin_purchase':
          await this.processCoinPurchase(userId, metadata, paymentIntent);
          break;

        case 'boost_purchase':
          await this.processBoostPurchase(userId, metadata, paymentIntent);
          break;

        case 'subscription':
          // Subscriptions are handled via subscription events
          logger.info(`Payment for subscription ${paymentIntent.id} - handled by subscription webhook`);
          break;

        default:
          logger.info(`One-time payment succeeded: ${paymentIntent.id}`);
          await this.recordTransaction(userId, paymentIntent, 'one_time', 'succeeded');
      }
    } catch (error: any) {
      logger.error(`Error processing payment intent ${paymentIntent.id}:`, error);
      throw error;
    }
  }

  async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment intent failed: ${paymentIntent.id}`);

    const metadata = paymentIntent.metadata as PaymentIntentMetadata;
    const userId = metadata?.user_id;

    if (!userId) {
      logger.warn(`Failed payment intent ${paymentIntent.id} missing user_id in metadata`);
      return;
    }

    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';

    // Record failed transaction
    await db('transactions').insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      type: metadata?.type || 'one_time',
      status: 'failed',
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      description: metadata?.product_name || 'Purchase',
      failure_code: paymentIntent.last_payment_error?.code || null,
      failure_message: failureReason,
      metadata: JSON.stringify(metadata),
    });

    // Notify user about payment failure
    await notificationServiceClient.notifyPaymentFailed(userId, failureReason);

    logger.info(`Payment failed for user ${userId}: ${failureReason}`);
  }

  // Charge Handlers

  async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    logger.info(`Processing charge refunded: ${charge.id}`);

    await db('transactions')
      .where({ stripe_charge_id: charge.id })
      .update({ status: 'refunded', updated_at: new Date() });
  }

  async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    logger.error(`Dispute created: ${dispute.id}`);
    // Log for manual review
    // In production, integrate with dispute management system
  }

  // Customer Handlers

  async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    logger.info(`Customer created: ${customer.id}`);
    // Customer is typically created during checkout, already linked to user
  }

  async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    logger.info(`Customer updated: ${customer.id}`);
    // Update payment methods if needed
  }

  // Payment Method Handlers

  async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    logger.info(`Payment method attached: ${paymentMethod.id}`);

    const customerId = paymentMethod.customer as string;
    const userId = await this.getUserIdFromCustomer(customerId);
    if (!userId) return;

    const card = paymentMethod.card;
    await db('payment_methods').insert({
      user_id: userId,
      stripe_payment_method_id: paymentMethod.id,
      stripe_customer_id: customerId,
      type: paymentMethod.type,
      card_brand: card?.brand || null,
      card_last4: card?.last4 || null,
      card_exp_month: card?.exp_month || null,
      card_exp_year: card?.exp_year || null,
      card_funding: card?.funding || null,
      billing_name: paymentMethod.billing_details?.name || null,
      billing_email: paymentMethod.billing_details?.email || null,
      billing_address: JSON.stringify(paymentMethod.billing_details?.address || {}),
    });
  }

  async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    logger.info(`Payment method detached: ${paymentMethod.id}`);

    await db('payment_methods')
      .where({ stripe_payment_method_id: paymentMethod.id })
      .delete();
  }

  // Helper Methods

  private async getPlanIdFromStripePriceId(priceId: string): Promise<string> {
    const plan = await db('subscription_plans')
      .where({ stripe_price_id_monthly: priceId })
      .orWhere({ stripe_price_id_yearly: priceId })
      .first();

    if (!plan) {
      throw new Error(`Plan not found for price ID: ${priceId}`);
    }

    return plan.id;
  }

  private async getPlanName(planId: string): Promise<string> {
    const plan = await db('subscription_plans').where({ id: planId }).first();
    return plan?.name || 'free';
  }

  private getBillingCycle(subscription: Stripe.Subscription): 'monthly' | 'yearly' {
    const interval = subscription.items.data[0]?.price.recurring?.interval;
    return interval === 'year' ? 'yearly' : 'monthly';
  }

  private async getUserIdFromCustomer(customerId: string): Promise<string | null> {
    const sub = await db('user_subscriptions')
      .where({ stripe_customer_id: customerId })
      .first();
    return sub?.user_id || null;
  }

  private async getSubscriptionIdFromStripe(stripeSubId: string): Promise<string | null> {
    const sub = await db('user_subscriptions')
      .where({ stripe_subscription_id: stripeSubId })
      .first();
    return sub?.id || null;
  }

  /**
   * Process coin purchase from payment intent
   */
  private async processCoinPurchase(
    userId: string,
    metadata: PaymentIntentMetadata,
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const packageId = metadata.package_id;
    const productSku = metadata.product_sku || 'UNKNOWN';

    if (!packageId) {
      throw new Error(`Coin package ID not found in payment intent metadata`);
    }

    const coinPackage = await db('coin_packages').where({ id: packageId }).first();
    if (!coinPackage) {
      throw new Error(`Coin package not found: ${packageId}`);
    }

    const totalCoins = coinPackage.coin_amount + (coinPackage.bonus_coins || 0);
    const amount = paymentIntent.amount / 100;

    // Create transaction record
    const [transaction] = await db('transactions')
      .insert({
        user_id: userId,
        stripe_payment_intent_id: paymentIntent.id,
        type: 'coin_purchase',
        status: 'succeeded',
        amount,
        currency: paymentIntent.currency.toUpperCase(),
        description: `Purchased ${coinPackage.name}`,
        metadata: JSON.stringify(metadata),
        processed_at: new Date(),
      })
      .returning('id');

    // Get current balance
    const currentBalance = await this.getUserCoinBalance(userId);
    const newBalance = currentBalance + totalCoins;

    // Create coin transaction
    await db('coin_transactions').insert({
      user_id: userId,
      transaction_id: transaction.id,
      package_id: packageId,
      type: 'purchase',
      amount: totalCoins,
      balance_after: newBalance,
      description: `Purchased ${coinPackage.name} (${coinPackage.coin_amount} + ${coinPackage.bonus_coins || 0} bonus)`,
    });

    // Add coins to user via user service
    await userServiceClient.addCoins({
      userId,
      amount: totalCoins,
      transactionType: 'purchase',
      stripePaymentId: paymentIntent.id,
      productSku,
    });

    // Send success notification
    await notificationServiceClient.notifyPaymentSuccess(userId, amount, coinPackage.name);

    logger.info(`Coin purchase processed for user ${userId}: ${totalCoins} coins (${coinPackage.name})`);
  }

  /**
   * Process boost purchase from payment intent
   */
  private async processBoostPurchase(
    userId: string,
    metadata: PaymentIntentMetadata,
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const productSku = metadata.product_sku;

    if (!productSku) {
      throw new Error(`Product SKU not found in payment intent metadata`);
    }

    // Parse duration from SKU (e.g., BOOST_30MIN, BOOST_1HR, BOOST_3HR)
    const durationMap: Record<string, number> = {
      'BOOST_30MIN': 30,
      'BOOST_1HR': 60,
      'BOOST_3HR': 180,
    };

    const durationMinutes = durationMap[productSku] || 60; // Default to 1 hour
    const amount = paymentIntent.amount / 100;
    const productName = metadata.product_name || `Boost (${durationMinutes} minutes)`;

    // Create transaction record
    await db('transactions').insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      type: 'boost_purchase',
      status: 'succeeded',
      amount,
      currency: paymentIntent.currency.toUpperCase(),
      description: `Purchased ${productName}`,
      metadata: JSON.stringify(metadata),
      processed_at: new Date(),
    });

    // Activate boost via user service
    await userServiceClient.activateBoost({
      userId,
      productSku,
      durationMinutes,
      stripePaymentId: paymentIntent.id,
    });

    // Send success notification
    await notificationServiceClient.notifyPaymentSuccess(userId, amount, productName);

    logger.info(`Boost purchase processed for user ${userId}: ${productName} (${durationMinutes} minutes)`);
  }

  /**
   * Record a generic transaction
   */
  private async recordTransaction(
    userId: string,
    paymentIntent: Stripe.PaymentIntent,
    type: 'subscription' | 'one_time' | 'coin_purchase' | 'boost_purchase' | 'refund',
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded'
  ): Promise<void> {
    await db('transactions').insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      type,
      status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      description: paymentIntent.description || 'Payment',
      metadata: JSON.stringify(paymentIntent.metadata),
      processed_at: status === 'succeeded' ? new Date() : null,
    });
  }

  /**
   * Get user's current coin balance
   */
  private async getUserCoinBalance(userId: string): Promise<number> {
    const lastTransaction = await db('coin_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first();
    return lastTransaction?.balance_after || 0;
  }
}
