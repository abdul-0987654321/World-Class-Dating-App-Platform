import { Request, Response } from 'express';
import Stripe from 'stripe';

// Mock Stripe before importing
jest.mock('stripe', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  return jest.fn(() => mockStripe);
});

// Mock the webhook service
jest.mock('../../../src/domain/services/webhook.service', () => ({
  WebhookService: jest.fn().mockImplementation(() => ({
    isEventProcessed: jest.fn(),
    storeEvent: jest.fn(),
    markEventProcessed: jest.fn(),
    markEventFailed: jest.fn(),
    handleSubscriptionCreated: jest.fn(),
    handleSubscriptionUpdated: jest.fn(),
    handleSubscriptionDeleted: jest.fn(),
    handleTrialWillEnd: jest.fn(),
    handleInvoicePaymentSucceeded: jest.fn(),
    handleInvoicePaymentFailed: jest.fn(),
    handleInvoiceUpcoming: jest.fn(),
    handlePaymentIntentSucceeded: jest.fn(),
    handlePaymentIntentFailed: jest.fn(),
    handleChargeRefunded: jest.fn(),
    handleDisputeCreated: jest.fn(),
    handleCustomerCreated: jest.fn(),
    handleCustomerUpdated: jest.fn(),
    handlePaymentMethodAttached: jest.fn(),
    handlePaymentMethodDetached: jest.fn(),
  })),
}));

jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { WebhookController } from '../../../src/api/controllers/webhook.controller';
import { WebhookService } from '../../../src/domain/services/webhook.service';

describe('WebhookController', () => {
  let webhookController: WebhookController;
  let mockStripeInstance: any;
  let mockWebhookService: jest.Mocked<WebhookService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  const originalEnv = process.env;

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    webhookController = new WebhookController();
    mockStripeInstance = (Stripe as unknown as jest.Mock)();
    mockWebhookService = new WebhookService() as jest.Mocked<WebhookService>;

    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      body: Buffer.from('{}'),
      headers: {
        'stripe-signature': 'valid_signature',
      },
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };
  });

  describe('handleStripeWebhook', () => {
    it('should return 500 if webhook secret is not configured', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Webhook secret not configured' });

      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });

    it('should return 400 if signature verification fails', async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Webhook Error: Invalid signature',
      });
    });

    it('should return 200 for duplicate events', async () => {
      const mockEvent = { id: 'evt_duplicate', type: 'payment_intent.succeeded' };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(true);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({ received: true, duplicate: true });
    });

    it('should process customer.subscription.created event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleSubscriptionCreated.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleSubscriptionCreated).toHaveBeenCalledWith({ id: 'sub_test' });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({ received: true });
    });

    it('should process customer.subscription.updated event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_test', status: 'active' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleSubscriptionUpdated.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleSubscriptionUpdated).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should process customer.subscription.deleted event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleSubscriptionDeleted.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleSubscriptionDeleted).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should process payment_intent.succeeded event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test', amount: 1000 } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handlePaymentIntentSucceeded.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handlePaymentIntentSucceeded).toHaveBeenCalled();
    });

    it('should process payment_intent.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handlePaymentIntentFailed.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handlePaymentIntentFailed).toHaveBeenCalled();
    });

    it('should process invoice.payment_succeeded event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.payment_succeeded',
        data: { object: { id: 'inv_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleInvoicePaymentSucceeded.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleInvoicePaymentSucceeded).toHaveBeenCalled();
    });

    it('should process invoice.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.payment_failed',
        data: { object: { id: 'inv_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleInvoicePaymentFailed.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleInvoicePaymentFailed).toHaveBeenCalled();
    });

    it('should process charge.refunded event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'charge.refunded',
        data: { object: { id: 'ch_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleChargeRefunded.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleChargeRefunded).toHaveBeenCalled();
    });

    it('should process charge.dispute.created event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'charge.dispute.created',
        data: { object: { id: 'dp_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleDisputeCreated.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleDisputeCreated).toHaveBeenCalled();
    });

    it('should log unhandled event types', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'unhandled.event.type',
        data: { object: {} },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({ received: true });
    });

    it('should mark event as failed on processing error', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handlePaymentIntentSucceeded.mockRejectedValue(
        new Error('Processing error')
      );
      mockWebhookService.markEventFailed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.markEventFailed).toHaveBeenCalledWith('evt_test', 'Processing error');
      // Returns 200 to prevent Stripe retries (internal handling)
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        received: true,
        error: 'Processing error',
      });
    });

    it('should process customer.subscription.trial_will_end event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.trial_will_end',
        data: { object: { id: 'sub_test', trial_end: Date.now() / 1000 + 86400 * 3 } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleTrialWillEnd.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleTrialWillEnd).toHaveBeenCalled();
    });

    it('should process customer.created event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.created',
        data: { object: { id: 'cus_test', email: 'test@example.com' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handleCustomerCreated.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handleCustomerCreated).toHaveBeenCalled();
    });

    it('should process payment_method.attached event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_method.attached',
        data: { object: { id: 'pm_test', customer: 'cus_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockWebhookService.isEventProcessed.mockResolvedValue(false);
      mockWebhookService.storeEvent.mockResolvedValue(undefined);
      mockWebhookService.handlePaymentMethodAttached.mockResolvedValue(undefined);
      mockWebhookService.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookService.handlePaymentMethodAttached).toHaveBeenCalled();
    });
  });
});
