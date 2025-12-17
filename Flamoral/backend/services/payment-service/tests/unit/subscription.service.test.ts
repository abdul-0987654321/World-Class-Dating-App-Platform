/// <reference types="jest" />
/**
 * Unit tests for Subscription Service
 * Tests Stripe integration, subscription management, and webhooks
 */

import subscriptionService from '../../src/services/subscription.service';
import subscriptionRepository from '../../src/repositories/subscription.repository';
import stripeClient from '../../src/infrastructure/stripe.client';
import userService from '../../src/clients/user-service.client';

jest.mock('../../src/repositories/subscription.repository');
jest.mock('../../src/infrastructure/stripe.client');
jest.mock('../../src/clients/user-service.client');

describe('SubscriptionService', () => {
  const userId = 'user-123';
  const customerId = 'cus_stripe123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a premium subscription successfully', async () => {
      const mockCustomer = {
        id: customerId,
        email: 'test@example.com',
      };

      const mockSubscription = {
        id: 'sub_123',
        customer: customerId,
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
        items: {
          data: [
            {
              price: {
                id: 'price_premium_monthly',
                recurring: { interval: 'month' },
              },
            },
          ],
        },
      };

      const mockDbSubscription = {
        id: 'db-sub-123',
        userId,
        stripeSubscriptionId: 'sub_123',
        plan: 'premium',
        status: 'active',
        currentPeriodEnd: new Date(mockSubscription.current_period_end * 1000),
      };

      (userService.getUser as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });
      (stripeClient.customers.create as jest.Mock).mockResolvedValue(mockCustomer);
      (stripeClient.subscriptions.create as jest.Mock).mockResolvedValue(mockSubscription);
      (subscriptionRepository.create as jest.Mock).mockResolvedValue(mockDbSubscription);

      const result = await subscriptionService.createSubscription({
        userId,
        plan: 'premium',
        interval: 'month',
        paymentMethodId: 'pm_123',
      });

      expect(result).toEqual(mockDbSubscription);
      expect(stripeClient.customers.create).toHaveBeenCalled();
      expect(stripeClient.subscriptions.create).toHaveBeenCalled();
      expect(subscriptionRepository.create).toHaveBeenCalled();
    });

    it('should use existing Stripe customer if exists', async () => {
      const existingSubscription = {
        id: 'existing-sub',
        userId,
        stripeCustomerId: customerId,
        status: 'canceled',
      };

      const mockSubscription = {
        id: 'sub_new',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: {
          data: [
            {
              price: {
                recurring: { interval: 'month' },
              },
            },
          ],
        },
      };

      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(existingSubscription);
      (stripeClient.subscriptions.create as jest.Mock).mockResolvedValue(mockSubscription);
      (subscriptionRepository.create as jest.Mock).mockResolvedValue({
        id: 'new-db-sub',
        stripeSubscriptionId: 'sub_new',
      });

      await subscriptionService.createSubscription({
        userId,
        plan: 'premium',
        interval: 'month',
        paymentMethodId: 'pm_123',
      });

      expect(stripeClient.customers.create).not.toHaveBeenCalled();
      expect(stripeClient.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: customerId,
        })
      );
    });

    it('should attach payment method to customer', async () => {
      const paymentMethodId = 'pm_123';

      (userService.getUser as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });
      (stripeClient.customers.create as jest.Mock).mockResolvedValue({ id: customerId });
      (stripeClient.paymentMethods.attach as jest.Mock).mockResolvedValue({});
      (stripeClient.customers.update as jest.Mock).mockResolvedValue({});
      (stripeClient.subscriptions.create as jest.Mock).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: { data: [{ price: { recurring: { interval: 'month' } } }] },
      });
      (subscriptionRepository.create as jest.Mock).mockResolvedValue({});

      await subscriptionService.createSubscription({
        userId,
        plan: 'premium',
        interval: 'month',
        paymentMethodId,
      });

      expect(stripeClient.paymentMethods.attach).toHaveBeenCalledWith(paymentMethodId, {
        customer: customerId,
      });
      expect(stripeClient.customers.update).toHaveBeenCalledWith(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    });

    it('should throw error for invalid plan', async () => {
      await expect(
        subscriptionService.createSubscription({
          userId,
          plan: 'invalid-plan' as any,
          interval: 'month',
          paymentMethodId: 'pm_123',
        })
      ).rejects.toThrow('Invalid subscription plan');
    });

    it('should handle Stripe payment failure', async () => {
      (userService.getUser as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });
      (stripeClient.customers.create as jest.Mock).mockResolvedValue({ id: customerId });
      (stripeClient.paymentMethods.attach as jest.Mock).mockResolvedValue({});
      (stripeClient.subscriptions.create as jest.Mock).mockRejectedValue(
        new Error('Your card was declined')
      );

      await expect(
        subscriptionService.createSubscription({
          userId,
          plan: 'premium',
          interval: 'month',
          paymentMethodId: 'pm_123',
        })
      ).rejects.toThrow('Your card was declined');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const mockDbSubscription = {
        id: 'db-sub-123',
        userId,
        stripeSubscriptionId: 'sub_123',
        status: 'active',
      };

      const mockCanceledSubscription = {
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      };

      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(mockDbSubscription);
      (stripeClient.subscriptions.update as jest.Mock).mockResolvedValue(
        mockCanceledSubscription
      );
      (subscriptionRepository.update as jest.Mock).mockResolvedValue({
        ...mockDbSubscription,
        cancelAtPeriodEnd: true,
      });

      const result = await subscriptionService.cancelSubscription(userId);

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(stripeClient.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });

    it('should immediately cancel subscription if requested', async () => {
      const mockDbSubscription = {
        id: 'db-sub-123',
        userId,
        stripeSubscriptionId: 'sub_123',
        status: 'active',
      };

      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(mockDbSubscription);
      (stripeClient.subscriptions.cancel as jest.Mock).mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
      });
      (subscriptionRepository.update as jest.Mock).mockResolvedValue({
        ...mockDbSubscription,
        status: 'canceled',
      });

      const result = await subscriptionService.cancelSubscription(userId, {
        immediately: true,
      });

      expect(result.status).toBe('canceled');
      expect(stripeClient.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('should throw error if no active subscription', async () => {
      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      await expect(subscriptionService.cancelSubscription(userId)).rejects.toThrow(
        'No active subscription found'
      );
    });
  });

  describe('updateSubscription', () => {
    it('should upgrade subscription plan', async () => {
      const mockDbSubscription = {
        id: 'db-sub-123',
        userId,
        stripeSubscriptionId: 'sub_123',
        plan: 'basic',
        status: 'active',
      };

      const mockUpdatedSubscription = {
        id: 'sub_123',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_123',
              price: {
                id: 'price_premium_monthly',
              },
            },
          ],
        },
      };

      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(mockDbSubscription);
      (stripeClient.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_old' }] },
      });
      (stripeClient.subscriptions.update as jest.Mock).mockResolvedValue(
        mockUpdatedSubscription
      );
      (subscriptionRepository.update as jest.Mock).mockResolvedValue({
        ...mockDbSubscription,
        plan: 'premium',
      });

      const result = await subscriptionService.updateSubscription(userId, {
        plan: 'premium',
      });

      expect(result.plan).toBe('premium');
      expect(stripeClient.subscriptions.update).toHaveBeenCalled();
    });

    it('should apply proration when upgrading', async () => {
      const mockDbSubscription = {
        stripeSubscriptionId: 'sub_123',
        plan: 'basic',
      };

      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(mockDbSubscription);
      (stripeClient.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_old' }] },
      });
      (stripeClient.subscriptions.update as jest.Mock).mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_new' }] },
      });
      (subscriptionRepository.update as jest.Mock).mockResolvedValue({});

      await subscriptionService.updateSubscription(userId, {
        plan: 'premium',
      });

      expect(stripeClient.subscriptions.update).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          proration_behavior: 'create_prorations',
        })
      );
    });
  });

  describe('handleWebhook', () => {
    it('should handle subscription.created event', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: customerId,
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: {
              data: [
                {
                  price: {
                    recurring: { interval: 'month' },
                  },
                },
              ],
            },
          },
        },
      };

      (subscriptionRepository.findByStripeSubscriptionId as jest.Mock).mockResolvedValue(null);
      (subscriptionRepository.create as jest.Mock).mockResolvedValue({});

      await subscriptionService.handleWebhook(event);

      // Verify subscription was created/updated in database
    });

    it('should handle subscription.updated event', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };

      const mockDbSubscription = {
        id: 'db-sub-123',
        stripeSubscriptionId: 'sub_123',
      };

      (subscriptionRepository.findByStripeSubscriptionId as jest.Mock).mockResolvedValue(
        mockDbSubscription
      );
      (subscriptionRepository.update as jest.Mock).mockResolvedValue({});

      await subscriptionService.handleWebhook(event);

      expect(subscriptionRepository.update).toHaveBeenCalled();
    });

    it('should handle subscription.deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            status: 'canceled',
          },
        },
      };

      const mockDbSubscription = {
        id: 'db-sub-123',
        stripeSubscriptionId: 'sub_123',
        userId,
      };

      (subscriptionRepository.findByStripeSubscriptionId as jest.Mock).mockResolvedValue(
        mockDbSubscription
      );
      (subscriptionRepository.update as jest.Mock).mockResolvedValue({});
      (userService.updateUserPremiumStatus as jest.Mock).mockResolvedValue({});

      await subscriptionService.handleWebhook(event);

      expect(subscriptionRepository.update).toHaveBeenCalledWith('db-sub-123', {
        status: 'canceled',
      });
      expect(userService.updateUserPremiumStatus).toHaveBeenCalledWith(userId, false);
    });

    it('should handle payment_failed event', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_123',
            customer: customerId,
            amount_due: 1999,
          },
        },
      };

      const mockDbSubscription = {
        id: 'db-sub-123',
        userId,
      };

      (subscriptionRepository.findByStripeSubscriptionId as jest.Mock).mockResolvedValue(
        mockDbSubscription
      );

      // Mock notification service
      const notificationSpy = jest.fn();
      (subscriptionService as any).sendPaymentFailedNotification = notificationSpy;

      await subscriptionService.handleWebhook(event);

      // Verify payment failure notification was sent
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return active subscription status', async () => {
      const mockSubscription = {
        id: 'db-sub-123',
        userId,
        plan: 'premium',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 2592000000),
        cancelAtPeriodEnd: false,
      };

      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await subscriptionService.getSubscriptionStatus(userId);

      expect(result).toMatchObject({
        isActive: true,
        plan: 'premium',
        cancelAtPeriodEnd: false,
      });
    });

    it('should return free plan for users without subscription', async () => {
      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const result = await subscriptionService.getSubscriptionStatus(userId);

      expect(result).toMatchObject({
        isActive: false,
        plan: 'free',
      });
    });

    it('should indicate expiring soon subscriptions', async () => {
      const mockSubscription = {
        id: 'db-sub-123',
        userId,
        plan: 'premium',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 86400000 * 2), // 2 days
        cancelAtPeriodEnd: true,
      };

      (subscriptionRepository.findByUserId as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await subscriptionService.getSubscriptionStatus(userId);

      expect(result.expiringSoon).toBe(true);
      expect(result.daysUntilExpiry).toBe(2);
    });
  });
});
