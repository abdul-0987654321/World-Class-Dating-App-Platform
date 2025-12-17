import { v4 as uuidv4 } from 'uuid';

export const createMockUser = (overrides?: any) => ({
  id: uuidv4(),
  email: 'test@example.com',
  stripe_customer_id: null,
  ...overrides,
});

export const createMockSubscription = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  tier: 'mid',
  status: 'active',
  start_date: new Date(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  stripe_subscription_id: 'sub_' + uuidv4(),
  stripe_customer_id: 'cus_' + uuidv4(),
  cancel_at_period_end: false,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockPayment = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  amount: 9.99,
  currency: 'USD',
  status: 'succeeded',
  payment_method: 'card',
  stripe_payment_intent_id: 'pi_' + uuidv4(),
  description: 'Test payment',
  metadata: {},
  created_at: new Date(),
  ...overrides,
});

export const createMockCoinPack = (overrides?: any) => ({
  id: uuidv4(),
  sku: 'COIN_PACK_MID',
  name: 'Mid Coin Pack',
  coins: 500,
  bonus_coins: 50,
  price: 19.99,
  currency: 'USD',
  stripe_price_id: 'price_' + uuidv4(),
  is_active: true,
  ...overrides,
});

export const createMockWebhookEvent = (type: string, overrides?: any) => ({
  id: 'evt_' + uuidv4(),
  type,
  data: {
    object: {},
  },
  created: Math.floor(Date.now() / 1000),
  ...overrides,
});

export const createMockStripeCustomer = (email: string) => ({
  id: 'cus_' + uuidv4(),
  email,
  created: Math.floor(Date.now() / 1000),
  metadata: {},
});

export const createMockStripeSubscription = (customerId: string) => ({
  id: 'sub_' + uuidv4(),
  customer: customerId,
  status: 'active',
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
  cancel_at_period_end: false,
});
