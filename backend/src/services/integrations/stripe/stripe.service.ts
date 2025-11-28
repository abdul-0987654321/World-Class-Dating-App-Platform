/**
 * Stripe Payment Integration Service
 */

import Stripe from 'stripe';
import { logger } from '../../../utils/logger';

export class StripeService {
  private stripe: Stripe | null = null;
  private initialized: boolean = false;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (apiKey) {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });
      this.initialized = true;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.stripe) {
      throw new Error('Stripe not configured');
    }
  }

  async createCustomer(email: string, name: string): Promise<Stripe.Customer | null> {
    if (!this.initialized || !this.stripe) {
      logger.warn('Stripe not configured, skipping customer creation');
      return null;
    }
    try {
      return await this.stripe.customers.create({
        email,
        name,
      });
    } catch (error) {
      logger.error('Stripe create customer error:', error);
      throw error;
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string
  ): Promise<Stripe.Subscription | null> {
    if (!this.initialized || !this.stripe) {
      logger.warn('Stripe not configured, skipping subscription creation');
      return null;
    }
    try {
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
    } catch (error) {
      logger.error('Stripe create subscription error:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    if (!this.initialized || !this.stripe) {
      logger.warn('Stripe not configured, skipping subscription cancel');
      return null;
    }
    try {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      logger.error('Stripe cancel subscription error:', error);
      throw error;
    }
  }

  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<Stripe.PaymentIntent | null> {
    if (!this.initialized || !this.stripe) {
      logger.warn('Stripe not configured, skipping payment intent creation');
      return null;
    }
    try {
      return await this.stripe.paymentIntents.create({
        amount,
        currency,
      });
    } catch (error) {
      logger.error('Stripe create payment intent error:', error);
      throw error;
    }
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<Stripe.Event | null> {
    if (!this.initialized || !this.stripe) {
      logger.warn('Stripe not configured, cannot verify webhook');
      return null;
    }
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      logger.error('Stripe webhook verification error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
