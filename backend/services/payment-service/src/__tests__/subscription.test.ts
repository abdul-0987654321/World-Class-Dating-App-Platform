/**
 * Subscription Service Tests
 *
 * Tests for subscription management including:
 * - Free tier initialization
 * - Premium upgrade flow
 * - Elite upgrade flow
 * - Subscription cancellation
 * - Renewal handling
 * - Grace period management
 */

import Stripe from 'stripe';
import { PaymentService, SubscriptionTier, BillingCycle } from '../domain/services/payment.service';

// Mock Stripe
jest.mock('stripe');

// Mock logger
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock service clients
jest.mock('../infrastructure/clients/user-service.client', () => ({
  UserServiceClient: jest.fn().mockImplementation(() => ({
    addCoins: jest.fn().mockResolvedValue({}),
    activateBoost: jest.fn().mockResolvedValue({}),
    updateSubscription: jest.fn().mockResolvedValue({}),
    mapTierName: jest.fn((tier: string) => tier),
  })),
}));

jest.mock('../infrastructure/clients/notification-service.client', () => ({
  NotificationServiceClient: jest.fn().mockImplementation(() => ({
    sendNotification: jest.fn().mockResolvedValue({}),
  })),
}));

describe('PaymentService - Subscription Tests', () => {
  let paymentService: PaymentService;
  let mockStripe: jest.Mocked<Stripe>;
  let mockUserServiceClient: any;
  let mockNotificationServiceClient: any;

  // Mock Stripe responses
  const mockCustomer: Partial<Stripe.Customer> = {
    id: 'cus_test123',
    email: 'test@example.com',
    metadata: { userId: 'user-123' },
  };

  const mockPaymentMethod: Partial<Stripe.PaymentMethod> = {
    id: 'pm_test123',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2030,
    } as Stripe.PaymentMethod.Card,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Stripe instance
    mockStripe = {
      customers: {
        create: jest.fn().mockResolvedValue(mockCustomer),
        list: jest.fn().mockResolvedValue({ data: [] }),
        update: jest.fn().mockResolvedValue(mockCustomer),
        retrieve: jest.fn().mockResolvedValue(mockCustomer),
      },
      subscriptions: {
        create: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
        retrieve: jest.fn(),
      },
      paymentMethods: {
        attach: jest.fn().mockResolvedValue(mockPaymentMethod),
        list: jest.fn().mockResolvedValue({ data: [mockPaymentMethod] }),
        detach: jest.fn().mockResolvedValue(mockPaymentMethod),
      },
      paymentIntents: {
        create: jest.fn(),
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
    } as unknown as jest.Mocked<Stripe>;

    // Mock Stripe constructor
    (Stripe as unknown as jest.Mock).mockImplementation(() => mockStripe);

    // Setup mock service clients
    mockUserServiceClient = {
      addCoins: jest.fn().mockResolvedValue({}),
      activateBoost: jest.fn().mockResolvedValue({}),
      updateSubscription: jest.fn().mockResolvedValue({}),
      mapTierName: jest.fn((tier: string) => tier),
    };

    mockNotificationServiceClient = {
      sendNotification: jest.fn().mockResolvedValue({}),
    };

    // Create service instance
    paymentService = new PaymentService(mockUserServiceClient, mockNotificationServiceClient);

    // Access private stripe instance and replace with mock
    (paymentService as any).stripe = mockStripe;
  });

  describe('Free Tier Initialization', () => {
    it('should create a new customer for free tier user', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const name = 'Test User';

      const result = await paymentService.createCustomer(userId, email, name);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email,
        name,
        metadata: { userId },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should get existing customer if already exists', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      mockStripe.customers.list = jest.fn().mockResolvedValue({
        data: [mockCustomer],
      });

      const result = await paymentService.getOrCreateCustomer(userId, email);

      expect(mockStripe.customers.list).toHaveBeenCalledWith({
        email,
        limit: 1,
      });
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockCustomer);
    });

    it('should create new customer if not exists', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      mockStripe.customers.list = jest.fn().mockResolvedValue({ data: [] });

      const result = await paymentService.getOrCreateCustomer(userId, email);

      expect(mockStripe.customers.list).toHaveBeenCalled();
      expect(mockStripe.customers.create).toHaveBeenCalled();
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('Premium Upgrade Flow', () => {
    const mockPremiumSubscription: Partial<Stripe.Subscription> = {
      id: 'sub_premium123',
      customer: 'cus_test123',
      status: 'active',
      items: {
        data: [{ id: 'si_test', price: { id: 'price_premium_monthly' } as Stripe.Price }],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      metadata: {
        userId: 'user-123',
        tier: 'premium',
        billingCycle: 'monthly',
      },
      latest_invoice: {
        payment_intent: { status: 'succeeded' },
      },
    };

    it('should upgrade user to premium subscription', async () => {
      mockStripe.subscriptions.create = jest.fn().mockResolvedValue(mockPremiumSubscription);

      const purchase = {
        userId: 'user-123',
        tier: 'premium' as SubscriptionTier,
        priceId: 'price_premium_monthly',
        billingCycle: 'monthly' as BillingCycle,
      };

      const result = await paymentService.purchaseSubscription(
        purchase,
        'test@example.com',
        'pm_test123'
      );

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test123', {
        customer: mockCustomer.id,
      });
      expect(mockStripe.customers.update).toHaveBeenCalledWith(mockCustomer.id, {
        invoice_settings: {
          default_payment_method: 'pm_test123',
        },
      });
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: mockCustomer.id,
          items: [{ price: 'price_premium_monthly' }],
          metadata: {
            userId: 'user-123',
            tier: 'premium',
            billingCycle: 'monthly',
          },
        })
      );
      expect(result.subscription).toEqual(mockPremiumSubscription);
    });

    it('should create premium subscription with trial period', async () => {
      const subscriptionWithTrial = {
        ...mockPremiumSubscription,
        trial_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };
      mockStripe.subscriptions.create = jest.fn().mockResolvedValue(subscriptionWithTrial);

      const purchase = {
        userId: 'user-123',
        tier: 'premium' as SubscriptionTier,
        priceId: 'price_premium_monthly',
        trialDays: 7,
      };

      const result = await paymentService.purchaseSubscription(
        purchase,
        'test@example.com',
        'pm_test123'
      );

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_period_days: 7,
        })
      );
      expect(result.subscription).toEqual(subscriptionWithTrial);
    });

    it('should update subscription from basic to premium tier', async () => {
      const existingSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_basic123',
        items: {
          data: [{ id: 'si_basic', price: { id: 'price_basic_monthly' } as Stripe.Price }],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      };

      const updatedSubscription = {
        ...existingSubscription,
        items: {
          data: [{ id: 'si_basic', price: { id: 'price_premium_monthly' } as Stripe.Price }],
        },
      };

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue(existingSubscription);
      mockStripe.subscriptions.update = jest.fn().mockResolvedValue(updatedSubscription);

      const result = await paymentService.updateSubscriptionTier(
        'sub_basic123',
        'price_premium_monthly'
      );

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_basic123', {
        items: [
          {
            id: 'si_basic',
            price: 'price_premium_monthly',
          },
        ],
        proration_behavior: 'always_invoice',
      });
      expect(result).toEqual(updatedSubscription);
    });
  });

  describe('Elite Upgrade Flow', () => {
    const mockEliteSubscription: Partial<Stripe.Subscription> = {
      id: 'sub_elite123',
      customer: 'cus_test123',
      status: 'active',
      items: {
        data: [{ id: 'si_elite', price: { id: 'price_elite_monthly' } as Stripe.Price }],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      metadata: {
        userId: 'user-123',
        tier: 'elite',
        billingCycle: 'monthly',
      },
    };

    it('should upgrade user to elite subscription', async () => {
      mockStripe.subscriptions.create = jest.fn().mockResolvedValue(mockEliteSubscription);

      const purchase = {
        userId: 'user-123',
        tier: 'elite' as SubscriptionTier,
        priceId: 'price_elite_monthly',
        billingCycle: 'monthly' as BillingCycle,
      };

      const result = await paymentService.purchaseSubscription(
        purchase,
        'test@example.com',
        'pm_test123'
      );

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ price: 'price_elite_monthly' }],
          metadata: expect.objectContaining({
            tier: 'elite',
          }),
        })
      );
      expect(result.subscription.metadata?.tier).toBe('elite');
    });

    it('should upgrade from premium to elite tier', async () => {
      const premiumSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_premium123',
        items: {
          data: [{ id: 'si_premium', price: { id: 'price_premium_monthly' } as Stripe.Price }],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      };

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue(premiumSubscription);
      mockStripe.subscriptions.update = jest.fn().mockResolvedValue(mockEliteSubscription);

      const result = await paymentService.updateSubscriptionTier(
        'sub_premium123',
        'price_elite_monthly'
      );

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_premium123', {
        items: [
          {
            id: 'si_premium',
            price: 'price_elite_monthly',
          },
        ],
        proration_behavior: 'always_invoice',
      });
      expect(result).toEqual(mockEliteSubscription);
    });

    it('should support yearly billing for elite tier', async () => {
      const eliteYearlySubscription = {
        ...mockEliteSubscription,
        metadata: {
          userId: 'user-123',
          tier: 'elite',
          billingCycle: 'yearly',
        },
      };
      mockStripe.subscriptions.create = jest.fn().mockResolvedValue(eliteYearlySubscription);

      const purchase = {
        userId: 'user-123',
        tier: 'elite' as SubscriptionTier,
        priceId: 'price_elite_yearly',
        billingCycle: 'yearly' as BillingCycle,
      };

      const result = await paymentService.purchaseSubscription(
        purchase,
        'test@example.com',
        'pm_test123'
      );

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            billingCycle: 'yearly',
          }),
        })
      );
      expect(result.subscription.metadata?.billingCycle).toBe('yearly');
    });
  });

  describe('Subscription Cancellation', () => {
    const activeSubscription: Partial<Stripe.Subscription> = {
      id: 'sub_test123',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      cancel_at_period_end: false,
    };

    it('should cancel subscription immediately', async () => {
      const canceledSubscription = {
        ...activeSubscription,
        status: 'canceled',
      };
      mockStripe.subscriptions.cancel = jest.fn().mockResolvedValue(canceledSubscription);

      const result = await paymentService.cancelSubscription('sub_test123', true);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
      expect(result.status).toBe('canceled');
    });

    it('should cancel subscription at period end', async () => {
      const cancelAtEndSubscription = {
        ...activeSubscription,
        cancel_at_period_end: true,
      };
      mockStripe.subscriptions.update = jest.fn().mockResolvedValue(cancelAtEndSubscription);

      const result = await paymentService.cancelSubscription('sub_test123', false);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });
      expect(result.cancel_at_period_end).toBe(true);
    });

    it('should reactivate a canceled subscription', async () => {
      const reactivatedSubscription = {
        ...activeSubscription,
        cancel_at_period_end: false,
      };
      mockStripe.subscriptions.update = jest.fn().mockResolvedValue(reactivatedSubscription);

      const result = await paymentService.reactivateSubscription('sub_test123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: false,
      });
      expect(result.cancel_at_period_end).toBe(false);
    });
  });

  describe('Renewal Handling', () => {
    it('should process successful invoice payment for renewal', async () => {
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_test123',
        subscription: 'sub_test123',
        billing_reason: 'subscription_cycle',
        status: 'paid',
      };

      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test123',
        metadata: {
          userId: 'user-123',
          tier: 'premium',
        },
      };

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue(mockSubscription);

      const mockEvent: Partial<Stripe.Event> = {
        type: 'invoice.payment_succeeded',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
      };

      await paymentService.processWebhookEvent(mockEvent as Stripe.Event);

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123');
      expect(mockNotificationServiceClient.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'subscription_renewed',
        })
      );
    });

    it('should handle subscription update events', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        metadata: {
          userId: 'user-123',
          tier: 'premium',
          billingCycle: 'monthly',
        },
      };

      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.updated',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      };

      await paymentService.processWebhookEvent(mockEvent as Stripe.Event);

      expect(mockUserServiceClient.updateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          stripeSubscriptionId: 'sub_test123',
          status: 'active',
        })
      );
    });

    it('should handle subscription deletion events', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test123',
        status: 'canceled',
        metadata: {
          userId: 'user-123',
          tier: 'premium',
        },
      };

      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.deleted',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      };

      await paymentService.processWebhookEvent(mockEvent as Stripe.Event);

      expect(mockUserServiceClient.updateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          tier: 'free',
          status: 'canceled',
        })
      );
      expect(mockNotificationServiceClient.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'subscription_canceled',
        })
      );
    });
  });

  describe('Grace Period Management', () => {
    it('should enter grace period on failed invoice payment', async () => {
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_failed123',
        subscription: 'sub_test123',
        status: 'open',
      };

      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test123',
        metadata: {
          userId: 'user-123',
          tier: 'premium',
        },
      };

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue(mockSubscription);

      const mockEvent: Partial<Stripe.Event> = {
        type: 'invoice.payment_failed',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
      };

      await paymentService.processWebhookEvent(mockEvent as Stripe.Event);

      expect(mockUserServiceClient.updateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          status: 'grace_period',
          gracePeriodEnd: expect.any(Date),
        })
      );
      expect(mockNotificationServiceClient.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'payment_failed',
          body: expect.stringContaining('3 days'),
        })
      );
    });

    it('should handle past_due subscription status', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test123',
        status: 'past_due',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        metadata: {
          userId: 'user-123',
          tier: 'premium',
          billingCycle: 'monthly',
        },
      };

      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.updated',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      };

      await paymentService.processWebhookEvent(mockEvent as Stripe.Event);

      expect(mockUserServiceClient.updateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          status: 'past_due',
        })
      );
    });

    it('should handle unpaid subscription status', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test123',
        status: 'unpaid',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
        metadata: {
          userId: 'user-123',
          tier: 'premium',
          billingCycle: 'monthly',
        },
      };

      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.updated',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      };

      await paymentService.processWebhookEvent(mockEvent as Stripe.Event);

      expect(mockUserServiceClient.updateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          status: 'unpaid',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error when customer creation fails', async () => {
      mockStripe.customers.create = jest.fn().mockRejectedValue(new Error('Stripe error'));

      await expect(
        paymentService.createCustomer('user-123', 'test@example.com')
      ).rejects.toThrow('Failed to create Stripe customer');
    });

    it('should throw error when subscription creation fails', async () => {
      mockStripe.subscriptions.create = jest.fn().mockRejectedValue(new Error('Card declined'));

      const purchase = {
        userId: 'user-123',
        tier: 'premium' as SubscriptionTier,
        priceId: 'price_premium_monthly',
      };

      await expect(
        paymentService.purchaseSubscription(purchase, 'test@example.com', 'pm_test123')
      ).rejects.toThrow('Failed to purchase subscription');
    });

    it('should throw error when cancellation fails', async () => {
      mockStripe.subscriptions.cancel = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(
        paymentService.cancelSubscription('sub_invalid', true)
      ).rejects.toThrow('Failed to cancel subscription');
    });

    it('should throw error when tier update fails', async () => {
      mockStripe.subscriptions.retrieve = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(
        paymentService.updateSubscriptionTier('sub_invalid', 'price_elite')
      ).rejects.toThrow('Failed to update subscription tier');
    });
  });

  describe('Payment Methods Management', () => {
    it('should get customer payment methods', async () => {
      const result = await paymentService.getPaymentMethods('cus_test123');

      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        type: 'card',
      });
      expect(result).toEqual([mockPaymentMethod]);
    });

    it('should add payment method to customer', async () => {
      const result = await paymentService.addPaymentMethod('cus_test123', 'pm_new123');

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_new123', {
        customer: 'cus_test123',
      });
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should remove payment method', async () => {
      const result = await paymentService.removePaymentMethod('pm_test123');

      expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_test123');
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should set default payment method', async () => {
      const result = await paymentService.setDefaultPaymentMethod('cus_test123', 'pm_test123');

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        invoice_settings: {
          default_payment_method: 'pm_test123',
        },
      });
      expect(result).toEqual(mockCustomer);
    });
  });
});
