export interface SubscriptionModel {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  tier: 'free' | 'premium' | 'premium_plus';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionModel {
  id: string;
  user_id: string;
  type: 'subscription' | 'coin_purchase' | 'refund' | 'boost' | 'super_like';
  amount: number; // in cents
  currency: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CoinTransactionModel {
  id: string;
  user_id: string;
  amount: number; // Positive for addition, negative for spending
  type: 'purchase' | 'spend' | 'refund' | 'bonus';
  reason?: string;
  balance_after: number;
  created_at: Date;
}

export const SUBSCRIPTION_PRICES = {
  premium: {
    monthly: 1999, // $19.99 in cents
    yearly: 9999, // $99.99 in cents
  },
  premium_plus: {
    monthly: 2999, // $29.99 in cents
    yearly: 14999, // $149.99 in cents
  },
};

export const COIN_PACKAGES = [
  { coins: 10, price: 999 }, // $9.99
  { coins: 25, price: 1999 }, // $19.99
  { coins: 50, price: 2999 }, // $29.99
  { coins: 100, price: 4999 }, // $49.99
];

export const COIN_COSTS = {
  super_like: 1,
  boost: 5,
  rewind: 1,
  unlimited_likes_day: 10,
  see_who_likes: 3,
  read_receipts: 2,
};
