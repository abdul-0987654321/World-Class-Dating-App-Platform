/**
 * Stripe Provider Tests
 *
 * Unit tests for Stripe payment provider integration
 */

import { StripeProvider } from '../../providers/StripeProvider';
import { PaymentProvider } from '../../types';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_123',
        email: 'test@example.com',
        metadata: {}
      }),
      update: jest.fn().mockResolvedValue({ id: 'cus_123' }),
      del: jest.fn().mockResolvedValue({ id: 'cus_123', deleted: true }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_123', email: 'test@example.com' })
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_123_secret'
      }),
      confirm: jest.fn().mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded'
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'pi_123',
        status: 'canceled'
      }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_123' }),
      capture: jest.fn().mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded'
      })
    },
    paymentMethods: {
      create: jest.fn().mockResolvedValue({
        id: 'pm_123',
        type: 'card',
        card: { brand: 'visa', last4: '4242' }
      }),
      attach: jest.fn().mockResolvedValue({ id: 'pm_123' }),
      detach: jest.fn().mockResolvedValue({ id: 'pm_123' }),
      list: jest.fn().mockResolvedValue({
        data: [{ id: 'pm_123', type: 'card' }]
      })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at_period_end: false
      }),
      update: jest.fn().mockResolvedValue({ id: 'sub_123' }),
      cancel: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'canceled' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'active' })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 'ref_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded'
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_123',
          url: 'https://checkout.stripe.com/pay/cs_123'
        })
      }
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } }
      })
    }
  }));
});

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

describe('StripeProvider', () => {
  let provider: StripeProvider;

  beforeEach(async () => {
    provider = new StripeProvider({
      secretKey: 'sk_test_123',
      webhookSecret: 'whsec_test123'
    }, mockLogger as any);

    await provider.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct provider name', () => {
      expect(provider.provider).toBe(PaymentProvider.STRIPE);
    });
  });

  describe('createCustomer', () => {
    it('should create a customer with email', async () => {
      const customer = await provider.createCustomer({
        email: 'test@example.com',
        metadata: { user_id: 'user_123' }
      });

      expect(customer.id).toBe('cus_123');
      expect(customer.email).toBe('test@example.com');
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with correct amount', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 1000,
        currency: 'USD',
        customerId: 'cus_123',
        metadata: { order_id: 'order_123' }
      });

      expect(intent.id).toBe('pi_123');
      expect(intent.amount).toBe(1000);
      expect(intent.clientSecret).toBe('pi_123_secret');
    });

    it('should handle manual capture method', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 5000,
        currency: 'USD',
        customerId: 'cus_123',
        captureMethod: 'manual'
      });

      expect(intent).toBeDefined();
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm payment intent', async () => {
      const result = await provider.confirmPaymentIntent('pi_123', 'pm_123');

      expect(result.status).toBe('succeeded');
    });
  });

  describe('cancelPaymentIntent', () => {
    it('should cancel payment intent', async () => {
      const result = await provider.cancelPaymentIntent('pi_123');

      expect(result.status).toBe('canceled');
    });
  });

  describe('createSubscription', () => {
    it('should create subscription', async () => {
      const subscription = await provider.createSubscription({
        customerId: 'cus_123',
        priceId: 'price_123'
      });

      expect(subscription.id).toBe('sub_123');
      expect(subscription.status).toBe('active');
    });

    it('should create subscription with trial period', async () => {
      const subscription = await provider.createSubscription({
        customerId: 'cus_123',
        priceId: 'price_123',
        trialPeriodDays: 14
      });

      expect(subscription).toBeDefined();
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const result = await provider.cancelSubscription('sub_123', true);

      expect(result.status).toBe('canceled');
    });

    it('should cancel subscription at period end', async () => {
      const result = await provider.cancelSubscription('sub_123', false);

      expect(result).toBeDefined();
    });
  });

  describe('refund', () => {
    it('should create full refund', async () => {
      const refund = await provider.refund({
        paymentIntentId: 'pi_123'
      });

      expect(refund.id).toBe('ref_123');
      expect(refund.status).toBe('succeeded');
    });

    it('should create partial refund', async () => {
      const refund = await provider.refund({
        paymentIntentId: 'pi_123',
        amount: 500,
        reason: 'requested_by_customer'
      });

      expect(refund).toBeDefined();
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach payment method to customer', async () => {
      const result = await provider.attachPaymentMethod('pm_123', 'cus_123');

      expect(result.id).toBe('pm_123');
    });
  });

  describe('detachPaymentMethod', () => {
    it('should detach payment method', async () => {
      const result = await provider.detachPaymentMethod('pm_123');

      expect(result.id).toBe('pm_123');
    });
  });

  describe('listPaymentMethods', () => {
    it('should list customer payment methods', async () => {
      const methods = await provider.listPaymentMethods('cus_123', 'card');

      expect(methods).toHaveLength(1);
      expect(methods[0].id).toBe('pm_123');
    });
  });

  describe('handleWebhook', () => {
    it('should verify and parse webhook payload', async () => {
      const event = await provider.handleWebhook(
        JSON.stringify({ id: 'evt_123' }),
        'test_signature'
      );

      expect(event.type).toBe('payment_intent.succeeded');
    });
  });
});

describe('StripeProvider error handling', () => {
  let provider: StripeProvider;

  beforeEach(async () => {
    provider = new StripeProvider({
      secretKey: 'sk_test_123',
      webhookSecret: 'whsec_test123'
    }, mockLogger as any);

    await provider.initialize();
  });

  it('should handle API errors gracefully', async () => {
    // Mock Stripe to throw error
    const Stripe = require('stripe');
    Stripe.mockImplementation(() => ({
      customers: {
        create: jest.fn().mockRejectedValue(new Error('API Error'))
      },
      paymentIntents: {},
      paymentMethods: {},
      subscriptions: {},
      refunds: {},
      checkout: { sessions: {} },
      webhooks: {}
    }));

    const errorProvider = new StripeProvider({
      secretKey: 'sk_test_123',
      webhookSecret: 'whsec_test123'
    }, mockLogger as any);

    await errorProvider.initialize();

    await expect(errorProvider.createCustomer({ email: 'test@example.com' }))
      .rejects.toThrow('API Error');
  });
});
