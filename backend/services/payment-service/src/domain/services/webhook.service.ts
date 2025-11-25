import Stripe from 'stripe';
import { db } from '../../infrastructure/database/connection';
import { UserServiceClient } from '../../infrastructure/clients/user-service.client';
import logger from '../../utils/logger';

const userServiceClient = new UserServiceClient();

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

    const userId = subscription.metadata?.user_id;
    if (!userId) {
      throw new Error('User ID not found in subscription metadata');
    }

    const planId = await this.getPlanIdFromStripePriceId(
      subscription.items.data[0]?.price.id
    );

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
      subscription_tier: await this.getPlanName(planId),
      subscription_status: subscription.status,
    });
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
      subscription_tier: await this.getPlanName(planId),
      subscription_status: subscription.status,
    });
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
  }

  async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Trial ending soon for subscription: ${subscription.id}`);

    const existingSub = await db('user_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .first();

    if (existingSub) {
      // Trigger notification to user about trial ending
      await userServiceClient.sendNotification(existingSub.user_id, {
        type: 'trial_ending',
        title: 'Your trial is ending soon',
        body: 'Your trial will end in 3 days. Upgrade now to keep your premium features!',
      });
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

    await db('transactions').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      type: 'subscription',
      status: 'succeeded',
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      description: `Subscription payment - ${invoice.lines.data[0]?.description || 'Premium'}`,
      processed_at: new Date(),
    });
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing invoice payment failed: ${invoice.id}`);

    const userId = invoice.metadata?.user_id || (await this.getUserIdFromCustomer(invoice.customer as string));
    if (!userId) return;

    await db('transactions').insert({
      user_id: userId,
      stripe_invoice_id: invoice.id,
      type: 'subscription',
      status: 'failed',
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      description: 'Subscription payment failed',
      failure_message: 'Payment method declined',
    });

    // Notify user
    await userServiceClient.sendNotification(userId, {
      type: 'payment_failed',
      title: 'Payment Failed',
      body: 'Your subscription payment failed. Please update your payment method.',
    });
  }

  async handleInvoiceUpcoming(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing upcoming invoice: ${invoice.id}`);

    const userId = await this.getUserIdFromCustomer(invoice.customer as string);
    if (userId) {
      await userServiceClient.sendNotification(userId, {
        type: 'upcoming_payment',
        title: 'Upcoming Payment',
        body: `Your subscription will renew on ${new Date(
          (invoice.next_payment_attempt || 0) * 1000
        ).toLocaleDateString()}`,
      });
    }
  }

  // Payment Intent Handlers

  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment intent succeeded: ${paymentIntent.id}`);

    const userId = paymentIntent.metadata?.user_id;
    if (!userId) return;

    // Check if this is a coin purchase
    if (paymentIntent.metadata?.type === 'coin_purchase') {
      const packageId = paymentIntent.metadata?.package_id;
      await this.processCoinPurchase(userId, packageId, paymentIntent);
    }
  }

  async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment intent failed: ${paymentIntent.id}`);

    const userId = paymentIntent.metadata?.user_id;
    if (!userId) return;

    await db('transactions').insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      type: paymentIntent.metadata?.type || 'one_time',
      status: 'failed',
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      failure_code: paymentIntent.last_payment_error?.code || null,
      failure_message: paymentIntent.last_payment_error?.message || null,
    });
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

  private async processCoinPurchase(
    userId: string,
    packageId: string,
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const coinPackage = await db('coin_packages').where({ id: packageId }).first();
    if (!coinPackage) {
      throw new Error(`Coin package not found: ${packageId}`);
    }

    const totalCoins = coinPackage.coin_amount + coinPackage.bonus_coins;

    // Create transaction record
    const [transaction] = await db('transactions')
      .insert({
        user_id: userId,
        stripe_payment_intent_id: paymentIntent.id,
        type: 'coin_purchase',
        status: 'succeeded',
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        description: `Purchased ${coinPackage.name}`,
        processed_at: new Date(),
      })
      .returning('id');

    // Get current balance
    const currentBalance = await this.getUserCoinBalance(userId);

    // Create coin transaction
    await db('coin_transactions').insert({
      user_id: userId,
      transaction_id: transaction.id,
      package_id: packageId,
      type: 'purchase',
      amount: totalCoins,
      balance_after: currentBalance + totalCoins,
      description: `Purchased ${coinPackage.name} (${coinPackage.coin_amount} + ${coinPackage.bonus_coins} bonus)`,
    });

    // Update user's coin balance in user service
    await userServiceClient.updateCoinBalance(userId, currentBalance + totalCoins);
  }

  private async getUserCoinBalance(userId: string): Promise<number> {
    const lastTransaction = await db('coin_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first();
    return lastTransaction?.balance_after || 0;
  }
}
