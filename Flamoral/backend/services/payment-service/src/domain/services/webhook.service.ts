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
    try {
      const event = await db('stripe_webhook_events')
        .where({ stripe_event_id: eventId, status: 'processed' })
        .first();
      return !!event;
    } catch (error: any) {
      logger.error('Error checking event processed status:', error);
      return false;
    }
  }

  /**
   * Store webhook event for processing
   */
  async storeEvent(event: Stripe.Event): Promise<void> {
    try {
      // Check if event already exists
      const existingEvent = await db('stripe_webhook_events')
        .where({ stripe_event_id: event.id })
        .first();

      if (existingEvent) {
        logger.info(`Event ${event.id} already exists in database`);
        return;
      }

      await db('stripe_webhook_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: JSON.stringify(event),
        status: 'pending',
        created_at: new Date(event.created * 1000),
        retry_count: 0,
      });
      logger.info(`Stored webhook event: ${event.id} (${event.type})`);
    } catch (error: any) {
      logger.error('Error storing webhook event:', error);
      throw error;
    }
  }

  /**
   * Mark event as processed
   */
  async markEventProcessed(eventId: string): Promise<void> {
    try {
      await db('stripe_webhook_events')
        .where({ stripe_event_id: eventId })
        .update({
          status: 'processed',
          processed_at: new Date(),
          updated_at: new Date(),
        });
      logger.info(`Marked event ${eventId} as processed`);
    } catch (error: any) {
      logger.error('Error marking event as processed:', error);
      throw error;
    }
  }

  /**
   * Mark event as failed
   */
  async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    try {
      await db('stripe_webhook_events')
        .where({ stripe_event_id: eventId })
        .update({
          status: 'failed',
          error_message: errorMessage.substring(0, 500), // Limit error message length
          retry_count: db.raw('retry_count + 1'),
          updated_at: new Date(),
        });
      logger.error(`Marked event ${eventId} as failed: ${errorMessage}`);
    } catch (error: any) {
      logger.error('Error marking event as failed:', error);
      throw error;
    }
  }

  /**
   * Get event processing statistics
   */
  async getEventStats(since?: Date): Promise<{
    total: number;
    processed: number;
    failed: number;
    pending: number;
  }> {
    try {
      const query = db('stripe_webhook_events');
      if (since) {
        query.where('created_at', '>=', since);
      }

      const stats = await query
        .select('status')
        .count('* as count')
        .groupBy('status');

      const result = {
        total: 0,
        processed: 0,
        failed: 0,
        pending: 0,
      };

      stats.forEach((stat: any) => {
        result.total += parseInt(stat.count, 10);
        if (stat.status === 'processed') result.processed = parseInt(stat.count, 10);
        if (stat.status === 'failed') result.failed = parseInt(stat.count, 10);
        if (stat.status === 'pending') result.pending = parseInt(stat.count, 10);
      });

      return result;
    } catch (error: any) {
      logger.error('Error getting event stats:', error);
      throw error;
    }
  }

  // Subscription Handlers

  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Processing subscription created: ${subscription.id}`);

    const metadata = subscription.metadata as unknown as SubscriptionMetadata;
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

  async handleSubscriptionPendingUpdateApplied(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Processing subscription pending update applied: ${subscription.id}`);

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

    // Update subscription with new plan
    await db('user_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .update({
        plan_id: planId,
        status: subscription.status,
        billing_cycle: this.getBillingCycle(subscription),
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        updated_at: new Date(),
      });

    // Update user service
    await userServiceClient.updateUserSubscription(existingSub.user_id, {
      subscription_tier: planName,
      subscription_status: subscription.status,
    });

    logger.info(`Subscription update applied for user ${existingSub.user_id}: ${planName}`);
  }

  async handleSubscriptionPendingUpdateExpired(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Processing subscription pending update expired: ${subscription.id}`);

    const existingSub = await db('user_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .first();

    if (existingSub) {
      // Notify user that the scheduled update didn't happen
      await notificationServiceClient.sendNotification({
        userId: existingSub.user_id,
        type: 'subscription_updated',
        title: 'Subscription Update Expired',
        body: 'Your scheduled subscription update has expired. Your current plan remains active.',
        data: {},
      });

      logger.info(`Subscription update expired notification sent to user ${existingSub.user_id}`);
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

      // Get subscription for grace period handling
      const subscription = await db('user_subscriptions')
        .where({ stripe_subscription_id: invoice.subscription as string })
        .first();

      if (subscription) {
        // Update user service
        await userServiceClient.updateUserSubscription(userId, {
          subscription_tier: await this.getPlanName(subscription.plan_id),
          subscription_status: 'past_due',
        });

        // Handle grace period
        await this.handlePaymentGracePeriod(subscription);
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

  async handleInvoicePaymentActionRequired(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing invoice payment action required: ${invoice.id}`);

    const userId = invoice.metadata?.user_id || (await this.getUserIdFromCustomer(invoice.customer as string));
    if (!userId) {
      logger.warn('User ID not found for invoice requiring action');
      return;
    }

    const amount = (invoice.amount_due || 0) / 100;

    // Notify user that action is required
    await notificationServiceClient.sendNotification({
      userId,
      type: 'payment_failed',
      title: 'Payment Action Required',
      body: `Action is required to complete your payment of $${amount.toFixed(2)}. Please update your payment method.`,
      data: {
        invoiceId: invoice.id,
        amount,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      },
    });

    logger.info(`Payment action required notification sent to user ${userId}`);
  }

  async handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing invoice finalized: ${invoice.id}`);

    const userId = invoice.metadata?.user_id || (await this.getUserIdFromCustomer(invoice.customer as string));
    if (!userId) {
      logger.warn('User ID not found for finalized invoice');
      return;
    }

    // Invoice is finalized and ready for payment
    // This can be used for internal tracking or notifications
    logger.info(`Invoice finalized for user ${userId}: ${invoice.id}`);
  }

  // Payment Intent Handlers

  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment intent succeeded: ${paymentIntent.id}`);

    const metadata = paymentIntent.metadata as unknown as PaymentIntentMetadata;
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

    const metadata = paymentIntent.metadata as unknown as PaymentIntentMetadata;
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

  async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment intent canceled: ${paymentIntent.id}`);

    const metadata = paymentIntent.metadata as unknown as PaymentIntentMetadata;
    const userId = metadata?.user_id;

    if (!userId) {
      logger.warn(`Canceled payment intent ${paymentIntent.id} missing user_id in metadata`);
      return;
    }

    // Record canceled transaction
    await db('transactions').insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      type: metadata?.type || 'one_time',
      status: 'canceled',
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      description: metadata?.product_name || 'Purchase canceled',
      metadata: JSON.stringify(metadata),
    });

    logger.info(`Payment canceled for user ${userId}`);
  }

  async handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment intent requires action: ${paymentIntent.id}`);

    const metadata = paymentIntent.metadata as unknown as PaymentIntentMetadata;
    const userId = metadata?.user_id;

    if (!userId) {
      logger.warn(`Payment intent ${paymentIntent.id} requiring action missing user_id in metadata`);
      return;
    }

    // Notify user that additional action is required (e.g., 3D Secure)
    await notificationServiceClient.sendNotification({
      userId,
      type: 'payment_failed',
      title: 'Payment Action Required',
      body: 'Additional verification is required to complete your payment. Please check your email or card provider.',
      data: {
        paymentIntentId: paymentIntent.id,
        nextAction: paymentIntent.next_action?.type,
      },
    });

    logger.info(`Payment action required notification sent to user ${userId}`);
  }

  // Checkout Session Handlers

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    logger.info(`Processing checkout session completed: ${session.id}`);

    const metadata = session.metadata as unknown as PaymentIntentMetadata;
    const userId = metadata?.user_id || session.client_reference_id;

    if (!userId) {
      logger.warn(`Checkout session ${session.id} missing user_id`);
      return;
    }

    const purchaseType = metadata?.type || 'one_time';

    // Handle different purchase types
    if (session.mode === 'subscription') {
      // Subscription checkout - will be handled by subscription.created event
      logger.info(`Subscription checkout completed for user ${userId}`);
    } else if (session.mode === 'payment') {
      // One-time payment checkout
      const paymentIntentId = session.payment_intent as string;

      if (paymentIntentId) {
        // Payment intent handler will process the actual fulfillment
        logger.info(`Payment checkout completed for user ${userId}: ${paymentIntentId}`);
      }
    }
  }

  async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
    logger.info(`Processing checkout session expired: ${session.id}`);

    const metadata = session.metadata as unknown as PaymentIntentMetadata;
    const userId = metadata?.user_id || session.client_reference_id;

    if (userId) {
      // Optionally notify user that their checkout session expired
      logger.info(`Checkout session expired for user ${userId}`);
    }
  }

  // Charge Handlers

  async handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
    logger.info(`Processing charge succeeded: ${charge.id}`);

    // Update transaction with charge ID if it exists
    if (charge.payment_intent) {
      await db('transactions')
        .where({ stripe_payment_intent_id: charge.payment_intent as string })
        .update({
          stripe_charge_id: charge.id,
          updated_at: new Date(),
        });
    }

    logger.info(`Charge succeeded: ${charge.id}`);
  }

  async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
    logger.info(`Processing charge failed: ${charge.id}`);

    // Update transaction with failure information
    if (charge.payment_intent) {
      await db('transactions')
        .where({ stripe_payment_intent_id: charge.payment_intent as string })
        .update({
          stripe_charge_id: charge.id,
          status: 'failed',
          failure_code: charge.failure_code || null,
          failure_message: charge.failure_message || null,
          updated_at: new Date(),
        });
    }

    logger.warn(`Charge failed: ${charge.id} - ${charge.failure_message}`);
  }

  async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    logger.info(`Processing charge refunded: ${charge.id}`);

    // Find the original transaction
    const transaction = await db('transactions')
      .where({ stripe_charge_id: charge.id })
      .orWhere({ stripe_payment_intent_id: charge.payment_intent as string })
      .first();

    if (!transaction) {
      logger.warn(`Transaction not found for refunded charge: ${charge.id}`);
      return;
    }

    const refundAmount = charge.amount_refunded / 100;
    const isPartialRefund = charge.amount_refunded < charge.amount;

    // Update original transaction status
    await db('transactions')
      .where({ id: transaction.id })
      .update({
        status: isPartialRefund ? 'partially_refunded' : 'refunded',
        updated_at: new Date(),
      });

    // Create refund transaction record
    await db('transactions').insert({
      user_id: transaction.user_id,
      stripe_charge_id: charge.id,
      stripe_payment_intent_id: charge.payment_intent as string,
      type: 'refund',
      status: 'succeeded',
      amount: -refundAmount, // Negative amount for refund
      currency: charge.currency.toUpperCase(),
      description: `Refund for ${transaction.description || 'purchase'}`,
      metadata: JSON.stringify({ original_transaction_id: transaction.id }),
      processed_at: new Date(),
    });

    // Handle refund logic based on purchase type
    await this.processRefundLogic(transaction, refundAmount, isPartialRefund);

    logger.info(`Charge refunded: ${charge.id} - Amount: $${refundAmount}`);
  }

  /**
   * Handle refund.created event
   */
  async handleRefundCreated(refund: Stripe.Refund): Promise<void> {
    logger.info(`Processing refund created: ${refund.id}`);

    try {
      // Find the original transaction by payment intent or charge
      const transaction = await db('transactions')
        .where({ stripe_payment_intent_id: refund.payment_intent as string })
        .orWhere({ stripe_charge_id: refund.charge as string })
        .first();

      if (!transaction) {
        logger.warn(`Transaction not found for refund: ${refund.id}`);
        return;
      }

      const refundAmount = refund.amount / 100;
      const totalAmount = transaction.amount;
      const isPartialRefund = refund.amount < (totalAmount * 100);

      // Log refund details
      logger.info(`Refund created for transaction ${transaction.id}: $${refundAmount} (${isPartialRefund ? 'partial' : 'full'})`);

      // Update original transaction if not already updated by charge.refunded
      const currentTransaction = await db('transactions')
        .where({ id: transaction.id })
        .first();

      if (currentTransaction.status !== 'refunded' && currentTransaction.status !== 'partially_refunded') {
        await db('transactions')
          .where({ id: transaction.id })
          .update({
            status: isPartialRefund ? 'partially_refunded' : 'refunded',
            updated_at: new Date(),
          });
      }

      // Check if refund record already exists
      const existingRefund = await db('transactions')
        .where({
          user_id: transaction.user_id,
          type: 'refund',
          stripe_charge_id: refund.charge as string,
        })
        .first();

      if (!existingRefund) {
        // Create refund transaction record
        await db('transactions').insert({
          user_id: transaction.user_id,
          stripe_charge_id: refund.charge as string,
          stripe_payment_intent_id: refund.payment_intent as string,
          type: 'refund',
          status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
          amount: -refundAmount,
          currency: refund.currency.toUpperCase(),
          description: `Refund: ${transaction.description || 'purchase'}`,
          metadata: JSON.stringify({
            original_transaction_id: transaction.id,
            refund_id: refund.id,
            reason: refund.reason,
          }),
          processed_at: refund.status === 'succeeded' ? new Date() : null,
        });
      }

      // Process refund logic only if refund succeeded
      if (refund.status === 'succeeded') {
        await this.processRefundLogic(transaction, refundAmount, isPartialRefund);
      }

      logger.info(`Refund processed: ${refund.id} - Status: ${refund.status}`);
    } catch (error: any) {
      logger.error(`Error processing refund.created for ${refund.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle refund.updated event
   */
  async handleRefundUpdated(refund: Stripe.Refund): Promise<void> {
    logger.info(`Processing refund updated: ${refund.id}`);

    try {
      // Find the refund transaction
      const refundTransaction = await db('transactions')
        .where({ type: 'refund' })
        .andWhere('metadata', 'like', `%"refund_id":"${refund.id}"%`)
        .first();

      if (!refundTransaction) {
        logger.warn(`Refund transaction not found for: ${refund.id}`);
        return;
      }

      // Update refund transaction status
      await db('transactions')
        .where({ id: refundTransaction.id })
        .update({
          status: refund.status === 'succeeded' ? 'succeeded' : refund.status === 'failed' ? 'failed' : 'pending',
          failure_message: refund.failure_reason || null,
          processed_at: refund.status === 'succeeded' ? new Date() : null,
          updated_at: new Date(),
        });

      // If refund just succeeded, process refund logic
      if (refund.status === 'succeeded' && refundTransaction.status !== 'succeeded') {
        const metadata = JSON.parse(refundTransaction.metadata || '{}');
        const originalTransaction = await db('transactions')
          .where({ id: metadata.original_transaction_id })
          .first();

        if (originalTransaction) {
          const refundAmount = Math.abs(refundTransaction.amount);
          const isPartialRefund = refundAmount < originalTransaction.amount;
          await this.processRefundLogic(originalTransaction, refundAmount, isPartialRefund);
        }
      }

      logger.info(`Refund updated: ${refund.id} - Status: ${refund.status}`);
    } catch (error: any) {
      logger.error(`Error processing refund.updated for ${refund.id}:`, error);
      throw error;
    }
  }

  async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    logger.error(`Dispute created: ${dispute.id} for charge: ${dispute.charge}`);

    // Find the transaction
    const transaction = await db('transactions')
      .where({ stripe_charge_id: dispute.charge as string })
      .first();

    if (transaction) {
      // Update transaction with dispute information
      await db('transactions')
        .where({ id: transaction.id })
        .update({
          status: 'disputed',
          failure_message: `Dispute: ${dispute.reason}`,
          updated_at: new Date(),
        });

      // Notify admin about dispute
      logger.error(`ADMIN ALERT: Dispute created for transaction ${transaction.id} - User: ${transaction.user_id}, Amount: $${transaction.amount}, Reason: ${dispute.reason}`);

      // In production, send notification to admin/support team
      // await notificationService.notifyAdminDispute(transaction, dispute);
    }

    logger.info(`Dispute logged for charge: ${dispute.charge}`);
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

  async handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
    logger.info(`Customer deleted: ${customer.id}`);

    // Clean up customer data in our database
    const subscription = await db('user_subscriptions')
      .where({ stripe_customer_id: customer.id })
      .first();

    if (subscription) {
      // Cancel any active subscriptions
      await db('user_subscriptions')
        .where({ stripe_customer_id: customer.id, status: 'active' })
        .update({
          status: 'canceled',
          canceled_at: new Date(),
          updated_at: new Date(),
        });

      // Update user service
      await userServiceClient.updateUserSubscription(subscription.user_id, {
        subscription_tier: 'free',
        subscription_status: 'canceled',
      });
    }

    // Delete payment methods
    await db('payment_methods')
      .where({ stripe_customer_id: customer.id })
      .delete();

    logger.info(`Customer data cleaned up for: ${customer.id}`);
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

  /**
   * Process refund logic - revoke features, deduct coins, etc.
   */
  private async processRefundLogic(
    transaction: any,
    refundAmount: number,
    isPartialRefund: boolean
  ): Promise<void> {
    const userId = transaction.user_id;

    switch (transaction.type) {
      case 'coin_purchase':
        await this.handleCoinPurchaseRefund(userId, transaction, refundAmount, isPartialRefund);
        break;

      case 'boost_purchase':
        await this.handleBoostPurchaseRefund(userId, transaction, refundAmount, isPartialRefund);
        break;

      case 'subscription':
        await this.handleSubscriptionRefund(userId, transaction, refundAmount, isPartialRefund);
        break;

      default:
        logger.info(`No specific refund logic for transaction type: ${transaction.type}`);
    }

    // Notify user about refund
    await notificationServiceClient.sendNotification({
      userId,
      type: 'payment_success',
      title: 'Refund Processed',
      body: `Your refund of $${refundAmount.toFixed(2)} has been processed successfully.`,
      data: {
        refundAmount,
        originalAmount: transaction.amount,
        isPartialRefund,
      },
    });
  }

  /**
   * Handle coin purchase refund - deduct coins from user balance
   */
  private async handleCoinPurchaseRefund(
    userId: string,
    transaction: any,
    refundAmount: number,
    isPartialRefund: boolean
  ): Promise<void> {
    // Find the original coin transaction
    const coinTransaction = await db('coin_transactions')
      .where({ transaction_id: transaction.id, type: 'purchase' })
      .first();

    if (!coinTransaction) {
      logger.warn(`Coin transaction not found for refund: ${transaction.id}`);
      return;
    }

    // Calculate coins to deduct
    const coinsToDeduct = isPartialRefund
      ? Math.floor((refundAmount / transaction.amount) * coinTransaction.amount)
      : coinTransaction.amount;

    // Get current balance
    const currentBalance = await this.getUserCoinBalance(userId);
    const newBalance = Math.max(0, currentBalance - coinsToDeduct);

    // Create refund coin transaction
    await db('coin_transactions').insert({
      user_id: userId,
      transaction_id: transaction.id,
      type: 'refund',
      amount: -coinsToDeduct,
      balance_after: newBalance,
      description: `Refund: ${coinsToDeduct} coins deducted`,
    });

    // Update user service
    await userServiceClient.subtractCoins(
      userId,
      coinsToDeduct,
      `Refund for transaction ${transaction.id}`
    );

    logger.info(`Refunded ${coinsToDeduct} coins from user ${userId}`);
  }

  /**
   * Handle boost purchase refund - deactivate boost if active
   */
  private async handleBoostPurchaseRefund(
    userId: string,
    transaction: any,
    refundAmount: number,
    isPartialRefund: boolean
  ): Promise<void> {
    // In production, check if boost is still active and deactivate it
    // For now, just log the refund
    logger.info(`Boost purchase refunded for user ${userId}: $${refundAmount}`);

    // Optionally deactivate active boost via user service
    // await userServiceClient.deactivateBoost(userId, transaction.stripe_payment_intent_id);
  }

  /**
   * Handle subscription refund - calculate prorated amount
   */
  private async handleSubscriptionRefund(
    userId: string,
    transaction: any,
    refundAmount: number,
    isPartialRefund: boolean
  ): Promise<void> {
    const subscription = await db('user_subscriptions')
      .where({ id: transaction.subscription_id })
      .first();

    if (!subscription) {
      logger.warn(`Subscription not found for refund: ${transaction.subscription_id}`);
      return;
    }

    // If full refund, downgrade user to free tier immediately
    if (!isPartialRefund) {
      await db('user_subscriptions')
        .where({ id: subscription.id })
        .update({
          status: 'canceled',
          canceled_at: new Date(),
          updated_at: new Date(),
        });

      await userServiceClient.updateUserSubscription(userId, {
        subscription_tier: 'free',
        subscription_status: 'canceled',
      });

      logger.info(`Subscription canceled due to full refund for user ${userId}`);
    } else {
      // Partial refund - log but keep subscription active
      logger.info(`Partial subscription refund processed for user ${userId}: $${refundAmount}`);
    }
  }

  /**
   * Calculate prorated refund amount for subscription
   */
  private calculateProratedRefund(
    subscriptionAmount: number,
    periodStart: Date,
    periodEnd: Date,
    canceledAt: Date = new Date()
  ): number {
    const totalDuration = periodEnd.getTime() - periodStart.getTime();
    const usedDuration = canceledAt.getTime() - periodStart.getTime();
    const remainingDuration = totalDuration - usedDuration;

    if (remainingDuration <= 0) {
      return 0;
    }

    const proratedAmount = (subscriptionAmount * remainingDuration) / totalDuration;
    return Math.max(0, Math.round(proratedAmount * 100) / 100); // Round to 2 decimals
  }

  /**
   * Handle grace period for failed subscription payments
   */
  async handlePaymentGracePeriod(subscription: any): Promise<void> {
    const GRACE_PERIOD_DAYS = 3; // 3 days grace period
    const now = new Date();
    const gracePeriodEnd = new Date(subscription.current_period_end);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    if (now <= gracePeriodEnd) {
      // Still within grace period - send reminder
      const daysRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      await notificationServiceClient.sendNotification({
        userId: subscription.user_id,
        type: 'payment_failed',
        title: 'Payment Failed - Grace Period',
        body: `Your payment failed, but you still have ${daysRemaining} day(s) to update your payment method before losing access to premium features.`,
        data: {
          gracePeriodEnds: gracePeriodEnd.toISOString(),
          daysRemaining,
        },
      });

      logger.info(`Grace period notification sent to user ${subscription.user_id} - ${daysRemaining} days remaining`);
    } else {
      // Grace period expired - downgrade to free
      await db('user_subscriptions')
        .where({ id: subscription.id })
        .update({
          status: 'canceled',
          canceled_at: new Date(),
          updated_at: new Date(),
        });

      await userServiceClient.updateUserSubscription(subscription.user_id, {
        subscription_tier: 'free',
        subscription_status: 'canceled',
      });

      await notificationServiceClient.sendNotification({
        userId: subscription.user_id,
        type: 'subscription_canceled',
        title: 'Subscription Canceled',
        body: 'Your subscription has been canceled due to payment failure. You have been downgraded to the free plan.',
        data: {},
      });

      logger.info(`Grace period expired for user ${subscription.user_id} - subscription canceled`);
    }
  }
}
