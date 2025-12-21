/**
 * Mock Stripe for Payment Tests
 * Simulates Stripe API behavior for testing
 */

import { v4 as uuidv4 } from 'uuid';

// Types
interface MockCustomer {
  id: string;
  email: string;
  name: string;
  metadata: Record<string, string>;
  default_source: string | null;
  created: number;
}

interface MockPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer: string | null;
  payment_method: string | null;
  metadata: Record<string, string>;
  created: number;
  client_secret: string;
}

interface MockSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  plan: {
    id: string;
    amount: number;
    currency: string;
    interval: string;
    product: string;
  };
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        unit_amount: number;
      };
    }>;
  };
  metadata: Record<string, string>;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
}

interface MockPaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  customer: string | null;
}

interface MockInvoice {
  id: string;
  customer: string;
  subscription: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  payment_intent: string | null;
  hosted_invoice_url: string;
}

// Mock data storage
const mockCustomers: Map<string, MockCustomer> = new Map();
const mockPaymentIntents: Map<string, MockPaymentIntent> = new Map();
const mockSubscriptions: Map<string, MockSubscription> = new Map();
const mockPaymentMethods: Map<string, MockPaymentMethod> = new Map();
const mockInvoices: Map<string, MockInvoice> = new Map();

// Test card numbers
export const TEST_CARDS = {
  SUCCESS: '4242424242424242',
  DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  EXPIRED: '4000000000000069',
  INCORRECT_CVC: '4000000000000127',
  PROCESSING_ERROR: '4000000000000119',
  REQUIRES_AUTHENTICATION: '4000002500003155',
};

/**
 * Mock Stripe Client
 */
export const mockStripe = {
  customers: {
    create: jest.fn(async (params: any) => {
      const customer: MockCustomer = {
        id: `cus_${uuidv4().replace(/-/g, '').substring(0, 14)}`,
        email: params.email,
        name: params.name || '',
        metadata: params.metadata || {},
        default_source: null,
        created: Math.floor(Date.now() / 1000),
      };
      mockCustomers.set(customer.id, customer);
      return customer;
    }),

    retrieve: jest.fn(async (customerId: string) => {
      const customer = mockCustomers.get(customerId);
      if (!customer) {
        throw createStripeError('customer', customerId);
      }
      return customer;
    }),

    update: jest.fn(async (customerId: string, params: any) => {
      const customer = mockCustomers.get(customerId);
      if (!customer) {
        throw createStripeError('customer', customerId);
      }
      Object.assign(customer, params);
      return customer;
    }),

    del: jest.fn(async (customerId: string) => {
      mockCustomers.delete(customerId);
      return { id: customerId, deleted: true };
    }),
  },

  paymentIntents: {
    create: jest.fn(async (params: any) => {
      const paymentIntent: MockPaymentIntent = {
        id: `pi_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
        amount: params.amount,
        currency: params.currency || 'usd',
        status: 'requires_payment_method',
        customer: params.customer || null,
        payment_method: params.payment_method || null,
        metadata: params.metadata || {},
        created: Math.floor(Date.now() / 1000),
        client_secret: `pi_${uuidv4()}_secret_${uuidv4()}`,
      };
      mockPaymentIntents.set(paymentIntent.id, paymentIntent);
      return paymentIntent;
    }),

    retrieve: jest.fn(async (paymentIntentId: string) => {
      const pi = mockPaymentIntents.get(paymentIntentId);
      if (!pi) {
        throw createStripeError('payment_intent', paymentIntentId);
      }
      return pi;
    }),

    confirm: jest.fn(async (paymentIntentId: string, params?: any) => {
      const pi = mockPaymentIntents.get(paymentIntentId);
      if (!pi) {
        throw createStripeError('payment_intent', paymentIntentId);
      }

      // Simulate card behavior based on payment method
      const paymentMethod = params?.payment_method || pi.payment_method;
      const cardNumber = mockPaymentMethods.get(paymentMethod)?.card?.last4 || '4242';

      if (cardNumber === '0002') {
        pi.status = 'canceled';
        throw createCardError('Your card was declined.');
      } else if (cardNumber === '9995') {
        pi.status = 'canceled';
        throw createCardError('Your card has insufficient funds.');
      } else {
        pi.status = 'succeeded';
      }

      return pi;
    }),

    cancel: jest.fn(async (paymentIntentId: string) => {
      const pi = mockPaymentIntents.get(paymentIntentId);
      if (!pi) {
        throw createStripeError('payment_intent', paymentIntentId);
      }
      pi.status = 'canceled';
      return pi;
    }),
  },

  subscriptions: {
    create: jest.fn(async (params: any) => {
      const now = Math.floor(Date.now() / 1000);
      const subscription: MockSubscription = {
        id: `sub_${uuidv4().replace(/-/g, '').substring(0, 14)}`,
        customer: params.customer,
        status: 'active',
        current_period_start: now,
        current_period_end: now + 30 * 24 * 60 * 60, // 30 days
        plan: {
          id: params.items?.[0]?.price || 'price_test',
          amount: 2999,
          currency: 'usd',
          interval: 'month',
          product: 'prod_test',
        },
        items: {
          data: [{
            id: `si_${uuidv4().substring(0, 14)}`,
            price: {
              id: params.items?.[0]?.price || 'price_test',
              product: 'prod_test',
              unit_amount: 2999,
            },
          }],
        },
        metadata: params.metadata || {},
        cancel_at_period_end: false,
        canceled_at: null,
      };
      mockSubscriptions.set(subscription.id, subscription);
      return subscription;
    }),

    retrieve: jest.fn(async (subscriptionId: string) => {
      const sub = mockSubscriptions.get(subscriptionId);
      if (!sub) {
        throw createStripeError('subscription', subscriptionId);
      }
      return sub;
    }),

    update: jest.fn(async (subscriptionId: string, params: any) => {
      const sub = mockSubscriptions.get(subscriptionId);
      if (!sub) {
        throw createStripeError('subscription', subscriptionId);
      }

      if (params.cancel_at_period_end !== undefined) {
        sub.cancel_at_period_end = params.cancel_at_period_end;
      }
      if (params.metadata) {
        Object.assign(sub.metadata, params.metadata);
      }

      return sub;
    }),

    del: jest.fn(async (subscriptionId: string) => {
      const sub = mockSubscriptions.get(subscriptionId);
      if (!sub) {
        throw createStripeError('subscription', subscriptionId);
      }
      sub.status = 'canceled';
      sub.canceled_at = Math.floor(Date.now() / 1000);
      return sub;
    }),

    list: jest.fn(async (params: any) => {
      const subs = Array.from(mockSubscriptions.values())
        .filter(sub => !params.customer || sub.customer === params.customer)
        .filter(sub => !params.status || sub.status === params.status);
      return { data: subs };
    }),
  },

  paymentMethods: {
    create: jest.fn(async (params: any) => {
      const pm: MockPaymentMethod = {
        id: `pm_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
        type: 'card',
        card: {
          brand: 'visa',
          last4: params.card?.number?.slice(-4) || '4242',
          exp_month: params.card?.exp_month || 12,
          exp_year: params.card?.exp_year || 2030,
        },
        customer: null,
      };
      mockPaymentMethods.set(pm.id, pm);
      return pm;
    }),

    attach: jest.fn(async (paymentMethodId: string, params: any) => {
      const pm = mockPaymentMethods.get(paymentMethodId);
      if (!pm) {
        throw createStripeError('payment_method', paymentMethodId);
      }
      pm.customer = params.customer;
      return pm;
    }),

    detach: jest.fn(async (paymentMethodId: string) => {
      const pm = mockPaymentMethods.get(paymentMethodId);
      if (!pm) {
        throw createStripeError('payment_method', paymentMethodId);
      }
      pm.customer = null;
      return pm;
    }),

    list: jest.fn(async (params: any) => {
      const pms = Array.from(mockPaymentMethods.values())
        .filter(pm => pm.customer === params.customer);
      return { data: pms };
    }),
  },

  invoices: {
    retrieve: jest.fn(async (invoiceId: string) => {
      const invoice = mockInvoices.get(invoiceId);
      if (!invoice) {
        throw createStripeError('invoice', invoiceId);
      }
      return invoice;
    }),

    list: jest.fn(async (params: any) => {
      const invoices = Array.from(mockInvoices.values())
        .filter(inv => !params.customer || inv.customer === params.customer);
      return { data: invoices };
    }),

    pay: jest.fn(async (invoiceId: string) => {
      const invoice = mockInvoices.get(invoiceId);
      if (!invoice) {
        throw createStripeError('invoice', invoiceId);
      }
      invoice.status = 'paid';
      invoice.amount_paid = invoice.amount_due;
      return invoice;
    }),
  },

  refunds: {
    create: jest.fn(async (params: any) => {
      return {
        id: `re_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
        amount: params.amount,
        payment_intent: params.payment_intent,
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000),
      };
    }),
  },

  webhooks: {
    constructEvent: jest.fn((payload: string | Buffer, signature: string, secret: string) => {
      // In tests, just parse the payload directly
      return JSON.parse(payload.toString());
    }),
  },
};

// Helper to create Stripe-like errors
function createStripeError(type: string, id: string) {
  const error = new Error(`No such ${type}: ${id}`);
  (error as any).type = 'StripeInvalidRequestError';
  (error as any).statusCode = 404;
  return error;
}

function createCardError(message: string) {
  const error = new Error(message);
  (error as any).type = 'StripeCardError';
  (error as any).code = 'card_declined';
  (error as any).statusCode = 402;
  return error;
}

// Utility functions
export function resetMockStripe() {
  mockCustomers.clear();
  mockPaymentIntents.clear();
  mockSubscriptions.clear();
  mockPaymentMethods.clear();
  mockInvoices.clear();

  // Reset all mock implementations
  Object.values(mockStripe).forEach(resource => {
    Object.values(resource).forEach(method => {
      if (typeof method === 'function' && method.mockClear) {
        method.mockClear();
      }
    });
  });
}

export function createMockCustomer(overrides: Partial<MockCustomer> = {}): MockCustomer {
  const customer: MockCustomer = {
    id: `cus_${uuidv4().replace(/-/g, '').substring(0, 14)}`,
    email: 'test@example.com',
    name: 'Test User',
    metadata: {},
    default_source: null,
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  };
  mockCustomers.set(customer.id, customer);
  return customer;
}

export function createMockSubscription(customerId: string, overrides: Partial<MockSubscription> = {}): MockSubscription {
  const now = Math.floor(Date.now() / 1000);
  const subscription: MockSubscription = {
    id: `sub_${uuidv4().replace(/-/g, '').substring(0, 14)}`,
    customer: customerId,
    status: 'active',
    current_period_start: now,
    current_period_end: now + 30 * 24 * 60 * 60,
    plan: {
      id: 'price_premium',
      amount: 2999,
      currency: 'usd',
      interval: 'month',
      product: 'prod_premium',
    },
    items: {
      data: [{
        id: `si_${uuidv4().substring(0, 14)}`,
        price: {
          id: 'price_premium',
          product: 'prod_premium',
          unit_amount: 2999,
        },
      }],
    },
    metadata: {},
    cancel_at_period_end: false,
    canceled_at: null,
    ...overrides,
  };
  mockSubscriptions.set(subscription.id, subscription);
  return subscription;
}

export default mockStripe;
