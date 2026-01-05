import Stripe from 'stripe';

/**
 * Type definitions for Stripe webhook events
 */

export interface PaymentIntentMetadata {
  user_id: string;
  type: 'coin_purchase' | 'boost_purchase' | 'subscription' | 'one_time';
  package_id?: string;
  product_sku?: string;
  product_name?: string;
}

export interface SubscriptionMetadata {
  user_id: string;
  tier?: string;
  plan_name?: string;
}

export interface InvoiceMetadata {
  user_id?: string;
  subscription_id?: string;
}

export type StripeWebhookEvent =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.created'
  | 'payment_intent.canceled'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'invoice.upcoming'
  | 'invoice.finalized'
  | 'charge.refunded'
  | 'charge.dispute.created'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'payment_method.attached'
  | 'payment_method.detached'
  | 'payment_method.updated';

export interface WebhookEventRecord {
  id: string;
  stripe_event_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'processed' | 'failed';
  error_message?: string;
  retry_count: number;
  processed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CoinPackage {
  id: string;
  name: string;
  coin_amount: number;
  bonus_coins: number;
  price: number;
  currency: string;
  stripe_price_id?: string;
  is_active: boolean;
}

export interface BoostProduct {
  id: string;
  name: string;
  sku: string;
  duration_minutes: number;
  price: number;
  currency: string;
  stripe_price_id?: string;
  is_active: boolean;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  subscription_id?: string;
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  stripe_charge_id?: string;
  type: 'subscription' | 'one_time' | 'coin_purchase' | 'boost_purchase' | 'refund';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  amount: number;
  currency: string;
  description?: string;
  metadata?: any;
  failure_code?: string;
  failure_message?: string;
  processed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CoinTransactionRecord {
  id: string;
  user_id: string;
  transaction_id?: string;
  package_id?: string;
  type: 'purchase' | 'spent' | 'earned' | 'refund' | 'bonus' | 'gift';
  amount: number;
  balance_after: number;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  stripe_product_id?: string;
  features: string[];
  daily_swipes: number;
  daily_super_likes: number;
  daily_boosts: number;
  unlimited_likes: boolean;
  see_who_likes_you: boolean;
  rewind_enabled: boolean;
  incognito_mode: boolean;
  passport_enabled: boolean;
  priority_likes: boolean;
  read_receipts: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  status:
    | 'active'
    | 'canceled'
    | 'past_due'
    | 'unpaid'
    | 'trialing'
    | 'incomplete'
    | 'incomplete_expired';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start?: Date;
  current_period_end?: Date;
  canceled_at?: Date;
  cancel_at?: Date;
  cancel_at_period_end: boolean;
  trial_start?: Date;
  trial_end?: Date;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}
