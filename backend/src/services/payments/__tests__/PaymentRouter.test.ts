/**
 * Payment Router Tests
 *
 * Unit tests for intelligent payment routing and failover
 */

import { PaymentRouter, PaymentContext, HealthStatus } from '../PaymentRouter';
import { PaymentProvider, IPaymentProvider, PaymentIntent, Customer } from '../types';
import { Knex } from 'knex';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock provider
const createMockProvider = (
  provider: PaymentProvider,
  isHealthy: boolean = true
): jest.Mocked<IPaymentProvider> => ({
  provider,
  initialize: jest.fn().mockResolvedValue(undefined),
  createCustomer: jest.fn().mockResolvedValue({ id: 'cust_123', email: 'test@example.com' }),
  updateCustomer: jest.fn().mockResolvedValue({ id: 'cust_123' }),
  deleteCustomer: jest.fn().mockResolvedValue(undefined),
  getCustomer: jest.fn().mockResolvedValue({ id: 'cust_123' }),
  createPaymentIntent: jest.fn().mockResolvedValue({
    id: 'pi_123',
    amount: 1000,
    currency: 'USD',
    status: 'succeeded',
    clientSecret: 'secret'
  }),
  confirmPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_123', status: 'succeeded' }),
  cancelPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_123', status: 'canceled' }),
  getPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_123' }),
  createPaymentMethod: jest.fn().mockResolvedValue({ id: 'pm_123', type: 'card' }),
  attachPaymentMethod: jest.fn().mockResolvedValue({ id: 'pm_123' }),
  detachPaymentMethod: jest.fn().mockResolvedValue({ id: 'pm_123' }),
  listPaymentMethods: jest.fn().mockResolvedValue([]),
  createSubscription: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'active' }),
  updateSubscription: jest.fn().mockResolvedValue({ id: 'sub_123' }),
  cancelSubscription: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'canceled' }),
  getSubscription: jest.fn().mockResolvedValue({ id: 'sub_123' }),
  refund: jest.fn().mockResolvedValue({ id: 'ref_123', status: 'succeeded' }),
  handleWebhook: jest.fn().mockResolvedValue({ type: 'test', data: {} })
});

// Mock database
const createMockDb = (): jest.Mocked<Knex> => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue(1),
    increment: jest.fn().mockResolvedValue(1)
  };

  const mockDb = jest.fn(() => mockQueryBuilder) as any;
  mockDb.raw = jest.fn();
  return mockDb;
};

describe('PaymentRouter', () => {
  let router: PaymentRouter;
  let mockDb: jest.Mocked<Knex>;
  let stripeProvider: jest.Mocked<IPaymentProvider>;
  let squareProvider: jest.Mocked<IPaymentProvider>;

  beforeEach(() => {
    mockDb = createMockDb();
    stripeProvider = createMockProvider(PaymentProvider.STRIPE);
    squareProvider = createMockProvider(PaymentProvider.SQUARE);

    router = new PaymentRouter(
      mockDb,
      mockLogger as any,
      [stripeProvider, squareProvider]
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectProcessor', () => {
    it('should select default provider when no rules match', async () => {
      const context: PaymentContext = {
        amount: 1000,
        currency: 'USD',
        country: 'US',
        paymentMethodType: 'card',
        isRecurring: false
      };

      // Mock no routing rules
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().orderBy.mockResolvedValue([]);

      const provider = await router.selectProcessor(context);
      expect(provider.provider).toBe(PaymentProvider.STRIPE);
    });

    it('should respect routing rules priority', async () => {
      const context: PaymentContext = {
        amount: 1000,
        currency: 'USD',
        country: 'US',
        paymentMethodType: 'card',
        isRecurring: false
      };

      // Mock routing rule that prefers Square
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().orderBy.mockResolvedValue([
        {
          id: 'rule_1',
          name: 'US Card Payments',
          provider: PaymentProvider.SQUARE,
          priority: 100,
          conditions: JSON.stringify({
            currencies: ['USD'],
            countries: ['US'],
            payment_method_types: ['card']
          }),
          weight: 100,
          is_active: true
        }
      ]);

      const provider = await router.selectProcessor(context);
      expect(provider.provider).toBe(PaymentProvider.SQUARE);
    });
  });

  describe('executeWithFailover', () => {
    it('should succeed on first try with healthy provider', async () => {
      const context: PaymentContext = {
        amount: 1000,
        currency: 'USD',
        country: 'US',
        paymentMethodType: 'card',
        isRecurring: false
      };

      // Mock routing to select Stripe
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().orderBy.mockResolvedValue([]);

      const operation = jest.fn().mockResolvedValue({ id: 'pi_123' });

      const result = await router.executeWithFailover(operation, context);

      expect(result.result).toEqual({ id: 'pi_123' });
      expect(result.usedFallback).toBe(false);
      expect(result.processor).toBe(PaymentProvider.STRIPE);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should failover to next provider on error', async () => {
      const context: PaymentContext = {
        amount: 1000,
        currency: 'USD',
        country: 'US',
        paymentMethodType: 'card',
        isRecurring: false
      };

      // Mock routing
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().orderBy.mockResolvedValue([]);

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Provider unavailable'))
        .mockResolvedValueOnce({ id: 'pi_456' });

      const result = await router.executeWithFailover(operation, context, 2);

      expect(result.result).toEqual({ id: 'pi_456' });
      expect(result.usedFallback).toBe(true);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw error when all providers fail', async () => {
      const context: PaymentContext = {
        amount: 1000,
        currency: 'USD',
        country: 'US',
        paymentMethodType: 'card',
        isRecurring: false
      };

      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().orderBy.mockResolvedValue([]);

      const operation = jest.fn().mockRejectedValue(new Error('Provider unavailable'));

      await expect(router.executeWithFailover(operation, context, 3))
        .rejects.toThrow('All payment processors failed');
    });
  });

  describe('getProvider', () => {
    it('should return correct provider by name', async () => {
      const provider = await router.getProvider(PaymentProvider.STRIPE);
      expect(provider.provider).toBe(PaymentProvider.STRIPE);
    });

    it('should throw error for unknown provider', async () => {
      await expect(router.getProvider('unknown' as PaymentProvider))
        .rejects.toThrow('Provider not found');
    });
  });

  describe('updateProcessorHealth', () => {
    it('should update health status correctly', async () => {
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().update.mockResolvedValue(1);

      await router.updateProcessorHealth(PaymentProvider.STRIPE, true, 150);

      expect((mockDb as any)().where).toHaveBeenCalledWith({
        provider: PaymentProvider.STRIPE
      });
      expect((mockDb as any)().update).toHaveBeenCalled();
    });
  });

  describe('getProcessorHealth', () => {
    it('should return health status for all processors', async () => {
      (mockDb as any)().select.mockResolvedValue([
        {
          provider: PaymentProvider.STRIPE,
          is_healthy: true,
          success_rate: 0.99,
          avg_response_time_ms: 200,
          last_health_check: new Date()
        },
        {
          provider: PaymentProvider.SQUARE,
          is_healthy: true,
          success_rate: 0.98,
          avg_response_time_ms: 250,
          last_health_check: new Date()
        }
      ]);

      const health = await router.getProcessorHealth();

      expect(health.size).toBe(2);
      expect(health.get(PaymentProvider.STRIPE)?.isHealthy).toBe(true);
      expect(health.get(PaymentProvider.SQUARE)?.isHealthy).toBe(true);
    });
  });
});

describe('PaymentContext matching', () => {
  let router: PaymentRouter;
  let mockDb: jest.Mocked<Knex>;

  beforeEach(() => {
    mockDb = createMockDb();
    router = new PaymentRouter(
      mockDb,
      mockLogger as any,
      [createMockProvider(PaymentProvider.STRIPE)]
    );
  });

  it('should match currency conditions', async () => {
    const context: PaymentContext = {
      amount: 1000,
      currency: 'EUR',
      country: 'DE',
      paymentMethodType: 'card',
      isRecurring: false
    };

    (mockDb as any)().where.mockReturnThis();
    (mockDb as any)().orderBy.mockResolvedValue([
      {
        id: 'rule_1',
        provider: PaymentProvider.ADYEN,
        priority: 100,
        conditions: JSON.stringify({
          currencies: ['EUR', 'GBP']
        }),
        weight: 100,
        is_active: true
      }
    ]);

    // This should match because EUR is in the conditions
    const provider = await router.selectProcessor(context);
    // Falls back to Stripe since Adyen provider not registered
    expect(provider).toBeDefined();
  });

  it('should match amount range conditions', async () => {
    const context: PaymentContext = {
      amount: 50000, // $500
      currency: 'USD',
      country: 'US',
      paymentMethodType: 'card',
      isRecurring: false
    };

    (mockDb as any)().where.mockReturnThis();
    (mockDb as any)().orderBy.mockResolvedValue([
      {
        id: 'rule_1',
        provider: PaymentProvider.STRIPE,
        priority: 100,
        conditions: JSON.stringify({
          min_amount: 10000,
          max_amount: 100000
        }),
        weight: 100,
        is_active: true
      }
    ]);

    const provider = await router.selectProcessor(context);
    expect(provider.provider).toBe(PaymentProvider.STRIPE);
  });

  it('should not match when amount is out of range', async () => {
    const context: PaymentContext = {
      amount: 500000, // $5000 - above max
      currency: 'USD',
      country: 'US',
      paymentMethodType: 'card',
      isRecurring: false
    };

    (mockDb as any)().where.mockReturnThis();
    (mockDb as any)().orderBy.mockResolvedValue([
      {
        id: 'rule_1',
        provider: PaymentProvider.SQUARE,
        priority: 100,
        conditions: JSON.stringify({
          min_amount: 10000,
          max_amount: 100000
        }),
        weight: 100,
        is_active: true
      }
    ]);

    // Should fall back to default since condition doesn't match
    const provider = await router.selectProcessor(context);
    expect(provider.provider).toBe(PaymentProvider.STRIPE);
  });
});
