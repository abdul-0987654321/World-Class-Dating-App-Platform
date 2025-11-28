import Stripe from 'stripe';

// Mock Stripe before importing the service
jest.mock('stripe', () => {
  const mockStripe = {
    customers: {
      create: jest.fn(),
      list: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
    },
    paymentMethods: {
      attach: jest.fn(),
      detach: jest.fn(),
      list: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    setupIntents: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  return jest.fn(() => mockStripe);
});

// Mock the user service client
jest.mock('../../../src/infrastructure/clients/user-service.client', () => ({
  UserServiceClient: jest.fn().mockImplementation(() => ({
    addCoins: jest.fn().mockResolvedValue(undefined),
    activateBoost: jest.fn().mockResolvedValue(undefined),
    updateSubscription: jest.fn().mockResolvedValue(undefined),
    sendNotification: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { PaymentService } from '../../../src/domain/services/payment.service';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockStripeInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService();
    mockStripeInstance = (Stripe as unknown as jest.Mock)();
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'John Doe',
        metadata: { userId: 'user-123' },
      };

      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);

      const result = await paymentService.createCustomer('user-123', 'test@example.com', 'John Doe');

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe',
        metadata: { userId: 'user-123' },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw error on Stripe API failure', async () => {
      mockStripeInstance.customers.create.mockRejectedValue(new Error('Stripe API error'));

      await expect(
        paymentService.createCustomer('user-123', 'test@example.com')
      ).rejects.toThrow('Failed to create Stripe customer');
    });
  });

  describe('getOrCreateCustomer', () => {
    it('should return existing customer if found', async () => {
      const mockCustomer = {
        id: 'cus_existing',
        email: 'test@example.com',
      };

      mockStripeInstance.customers.list.mockResolvedValue({
        data: [mockCustomer],
      });

      const result = await paymentService.getOrCreateCustomer('user-123', 'test@example.com');

      expect(mockStripeInstance.customers.list).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1,
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should create new customer if not found', async () => {
      const mockNewCustomer = {
        id: 'cus_new',
        email: 'new@example.com',
      };

      mockStripeInstance.customers.list.mockResolvedValue({ data: [] });
      mockStripeInstance.customers.create.mockResolvedValue(mockNewCustomer);

      const result = await paymentService.getOrCreateCustomer('user-123', 'new@example.com');

      expect(mockStripeInstance.customers.create).toHaveBeenCalled();
      expect(result).toEqual(mockNewCustomer);
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.createPaymentIntent(
        10.00,
        'usd',
        'cus_test',
        { userId: 'user-123', type: 'coin_purchase' }
      );

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1000, // Converted to cents
        currency: 'usd',
        customer: 'cus_test',
        metadata: { userId: 'user-123', type: 'coin_purchase' },
        automatic_payment_methods: { enabled: true },
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should handle decimal amounts correctly', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_test' });

      await paymentService.createPaymentIntent(9.99, 'usd', 'cus_test', {});

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 999 })
      );
    });
  });

  describe('purchaseSubscription', () => {
    it('should create a subscription', async () => {
      const mockCustomer = { id: 'cus_test' };
      const mockSubscription = {
        id: 'sub_test',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      };

      mockStripeInstance.customers.list.mockResolvedValue({ data: [mockCustomer] });
      mockStripeInstance.paymentMethods.attach.mockResolvedValue({});
      mockStripeInstance.customers.update.mockResolvedValue(mockCustomer);
      mockStripeInstance.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await paymentService.purchaseSubscription(
        { userId: 'user-123', tier: 'basic', priceId: 'price_test' },
        'test@example.com',
        'pm_test'
      );

      expect(result.subscription).toEqual(mockSubscription);
      expect(result.customer).toEqual(mockCustomer);
    });

    it('should include trial period if specified', async () => {
      const mockCustomer = { id: 'cus_test' };

      mockStripeInstance.customers.list.mockResolvedValue({ data: [mockCustomer] });
      mockStripeInstance.paymentMethods.attach.mockResolvedValue({});
      mockStripeInstance.customers.update.mockResolvedValue(mockCustomer);
      mockStripeInstance.subscriptions.create.mockResolvedValue({ id: 'sub_test' });

      await paymentService.purchaseSubscription(
        { userId: 'user-123', tier: 'basic', priceId: 'price_test', trialDays: 7 },
        'test@example.com',
        'pm_test'
      );

      expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ trial_period_days: 7 })
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const mockSubscription = { id: 'sub_test', cancel_at_period_end: true };

      mockStripeInstance.subscriptions.update.mockResolvedValue(mockSubscription);

      const result = await paymentService.cancelSubscription('sub_test', false);

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_test', {
        cancel_at_period_end: true,
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should cancel subscription immediately', async () => {
      const mockSubscription = { id: 'sub_test', status: 'canceled' };

      mockStripeInstance.subscriptions.cancel.mockResolvedValue(mockSubscription);

      const result = await paymentService.cancelSubscription('sub_test', true);

      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_test');
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a canceled subscription', async () => {
      const mockSubscription = { id: 'sub_test', cancel_at_period_end: false };

      mockStripeInstance.subscriptions.update.mockResolvedValue(mockSubscription);

      const result = await paymentService.reactivateSubscription('sub_test');

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_test', {
        cancel_at_period_end: false,
      });
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('updateSubscriptionTier', () => {
    it('should update subscription to new tier', async () => {
      const mockExistingSubscription = {
        id: 'sub_test',
        items: { data: [{ id: 'si_test' }] },
      };

      const mockUpdatedSubscription = {
        id: 'sub_test',
        items: { data: [{ id: 'si_test', price: { id: 'price_new' } }] },
      };

      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockExistingSubscription);
      mockStripeInstance.subscriptions.update.mockResolvedValue(mockUpdatedSubscription);

      const result = await paymentService.updateSubscriptionTier('sub_test', 'price_new');

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_test', {
        items: [{ id: 'si_test', price: 'price_new' }],
        proration_behavior: 'always_invoice',
      });
      expect(result).toEqual(mockUpdatedSubscription);
    });
  });

  describe('purchaseCoins', () => {
    it('should create payment intent for coin purchase', async () => {
      const mockCustomer = { id: 'cus_test' };
      const mockPaymentIntent = { id: 'pi_test', amount: 999 };

      mockStripeInstance.customers.list.mockResolvedValue({ data: [mockCustomer] });
      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.purchaseCoins(
        { userId: 'user-123', productSku: 'COIN_PACK_SMALL', priceId: 'price_test' },
        'test@example.com',
        9.99
      );

      expect(result.customer).toEqual(mockCustomer);
      expect(result.paymentIntent).toEqual(mockPaymentIntent);
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'coin_purchase',
            productSku: 'COIN_PACK_SMALL',
          }),
        })
      );
    });
  });

  describe('purchaseBoost', () => {
    it('should create payment intent for boost purchase', async () => {
      const mockCustomer = { id: 'cus_test' };
      const mockPaymentIntent = { id: 'pi_test', amount: 299 };

      mockStripeInstance.customers.list.mockResolvedValue({ data: [mockCustomer] });
      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.purchaseBoost(
        { userId: 'user-123', productSku: 'BOOST_30MIN', priceId: 'price_test' },
        'test@example.com',
        2.99
      );

      expect(result.customer).toEqual(mockCustomer);
      expect(result.paymentIntent).toEqual(mockPaymentIntent);
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'boost_purchase',
            productSku: 'BOOST_30MIN',
          }),
        })
      );
    });
  });

  describe('processRefund', () => {
    it('should process full refund', async () => {
      const mockRefund = { id: 're_test', status: 'succeeded' };

      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      const result = await paymentService.processRefund('pi_test');

      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test',
      });
      expect(result).toEqual(mockRefund);
    });

    it('should process partial refund', async () => {
      const mockRefund = { id: 're_test', amount: 500 };

      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      await paymentService.processRefund('pi_test', 5.00, 'requested_by_customer');

      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test',
        amount: 500,
        reason: 'requested_by_customer',
      });
    });
  });

  describe('getPaymentMethods', () => {
    it('should list customer payment methods', async () => {
      const mockPaymentMethods = [
        { id: 'pm_1', type: 'card', card: { brand: 'visa' } },
        { id: 'pm_2', type: 'card', card: { brand: 'mastercard' } },
      ];

      mockStripeInstance.paymentMethods.list.mockResolvedValue({
        data: mockPaymentMethods,
      });

      const result = await paymentService.getPaymentMethods('cus_test');

      expect(mockStripeInstance.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_test',
        type: 'card',
      });
      expect(result).toEqual(mockPaymentMethods);
    });
  });

  describe('addPaymentMethod', () => {
    it('should attach payment method to customer', async () => {
      const mockPaymentMethod = { id: 'pm_test', customer: 'cus_test' };

      mockStripeInstance.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);

      const result = await paymentService.addPaymentMethod('cus_test', 'pm_test');

      expect(mockStripeInstance.paymentMethods.attach).toHaveBeenCalledWith('pm_test', {
        customer: 'cus_test',
      });
      expect(result).toEqual(mockPaymentMethod);
    });
  });

  describe('removePaymentMethod', () => {
    it('should detach payment method', async () => {
      const mockPaymentMethod = { id: 'pm_test', customer: null };

      mockStripeInstance.paymentMethods.detach.mockResolvedValue(mockPaymentMethod);

      const result = await paymentService.removePaymentMethod('pm_test');

      expect(mockStripeInstance.paymentMethods.detach).toHaveBeenCalledWith('pm_test');
      expect(result).toEqual(mockPaymentMethod);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set default payment method for customer', async () => {
      const mockCustomer = {
        id: 'cus_test',
        invoice_settings: { default_payment_method: 'pm_test' },
      };

      mockStripeInstance.customers.update.mockResolvedValue(mockCustomer);

      const result = await paymentService.setDefaultPaymentMethod('cus_test', 'pm_test');

      expect(mockStripeInstance.customers.update).toHaveBeenCalledWith('cus_test', {
        invoice_settings: { default_payment_method: 'pm_test' },
      });
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('createSetupIntent', () => {
    it('should create a setup intent', async () => {
      const mockSetupIntent = {
        id: 'seti_test',
        client_secret: 'seti_test_secret',
      };

      mockStripeInstance.setupIntents.create.mockResolvedValue(mockSetupIntent);

      const result = await paymentService.createSetupIntent('cus_test');

      expect(mockStripeInstance.setupIntents.create).toHaveBeenCalledWith({
        customer: 'cus_test',
        payment_method_types: ['card'],
      });
      expect(result).toEqual(mockSetupIntent);
    });
  });

  describe('handleWebhook', () => {
    it('should verify webhook signature and return event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = await paymentService.handleWebhook('raw_body', 'sig_test');

      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalled();
      expect(result).toEqual(mockEvent);
    });

    it('should throw error on invalid signature', async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        paymentService.handleWebhook('raw_body', 'invalid_sig')
      ).rejects.toThrow('Webhook signature verification failed');
    });
  });
});
