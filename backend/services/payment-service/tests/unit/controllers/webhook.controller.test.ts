import { Request, Response } from 'express';

// Create mock instances that will be used by the controller
const mockWebhookServiceInstance = {
  isEventProcessed: jest.fn(),
  storeEvent: jest.fn(),
  markEventProcessed: jest.fn(),
  markEventFailed: jest.fn(),
  handleSubscriptionCreated: jest.fn(),
  handleSubscriptionUpdated: jest.fn(),
  handleSubscriptionDeleted: jest.fn(),
  handleTrialWillEnd: jest.fn(),
  handleSubscriptionPendingUpdateApplied: jest.fn(),
  handleSubscriptionPendingUpdateExpired: jest.fn(),
  handleInvoicePaymentSucceeded: jest.fn(),
  handleInvoicePaymentFailed: jest.fn(),
  handleInvoicePaymentActionRequired: jest.fn(),
  handleInvoiceUpcoming: jest.fn(),
  handleInvoiceFinalized: jest.fn(),
  handlePaymentIntentSucceeded: jest.fn(),
  handlePaymentIntentFailed: jest.fn(),
  handlePaymentIntentCanceled: jest.fn(),
  handlePaymentIntentRequiresAction: jest.fn(),
  handleCheckoutSessionCompleted: jest.fn(),
  handleCheckoutSessionExpired: jest.fn(),
  handleChargeSucceeded: jest.fn(),
  handleChargeFailed: jest.fn(),
  handleChargeRefunded: jest.fn(),
  handleDisputeCreated: jest.fn(),
  handleRefundCreated: jest.fn(),
  handleRefundUpdated: jest.fn(),
  handleCustomerCreated: jest.fn(),
  handleCustomerUpdated: jest.fn(),
  handleCustomerDeleted: jest.fn(),
  handlePaymentMethodAttached: jest.fn(),
  handlePaymentMethodDetached: jest.fn(),
};

const mockConstructEvent = jest.fn();

// Mock Stripe before importing the controller
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
});

// Mock the webhook service - must return the same instance
jest.mock('../../../src/domain/services/webhook.service', () => ({
  WebhookService: jest.fn().mockImplementation(() => mockWebhookServiceInstance),
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Now import the controller after mocks are set up
import { WebhookController } from '../../../src/api/controllers/webhook.controller';

describe('WebhookController', () => {
  let webhookController: WebhookController;
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
      mockConstructEvent.mockImplementation(() => {
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

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(true);

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

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleSubscriptionCreated.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleSubscriptionCreated).toHaveBeenCalledWith({ id: 'sub_test' });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({ received: true });
    });

    it('should process customer.subscription.updated event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_test', status: 'active' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleSubscriptionUpdated.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleSubscriptionUpdated).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should process customer.subscription.deleted event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_test' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleSubscriptionDeleted.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleSubscriptionDeleted).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should process payment_intent.succeeded event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test', amount: 1000 } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handlePaymentIntentSucceeded.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handlePaymentIntentSucceeded).toHaveBeenCalled();
    });

    it('should process payment_intent.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handlePaymentIntentFailed.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handlePaymentIntentFailed).toHaveBeenCalled();
    });

    it('should process invoice.payment_succeeded event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.payment_succeeded',
        data: { object: { id: 'inv_test' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleInvoicePaymentSucceeded.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleInvoicePaymentSucceeded).toHaveBeenCalled();
    });

    it('should process invoice.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.payment_failed',
        data: { object: { id: 'inv_test' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleInvoicePaymentFailed.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleInvoicePaymentFailed).toHaveBeenCalled();
    });

    it('should process charge.refunded event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'charge.refunded',
        data: { object: { id: 'ch_test' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleChargeRefunded.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleChargeRefunded).toHaveBeenCalled();
    });

    it('should process charge.dispute.created event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'charge.dispute.created',
        data: { object: { id: 'dp_test' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleDisputeCreated.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleDisputeCreated).toHaveBeenCalled();
    });

    it('should log unhandled event types', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'unhandled.event.type',
        data: { object: {} },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

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

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handlePaymentIntentSucceeded.mockRejectedValue(
        new Error('Processing error')
      );
      mockWebhookServiceInstance.markEventFailed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.markEventFailed).toHaveBeenCalledWith('evt_test', 'Processing error');
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

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleTrialWillEnd.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleTrialWillEnd).toHaveBeenCalled();
    });

    it('should process customer.created event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.created',
        data: { object: { id: 'cus_test', email: 'test@example.com' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handleCustomerCreated.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handleCustomerCreated).toHaveBeenCalled();
    });

    it('should process payment_method.attached event', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_method.attached',
        data: { object: { id: 'pm_test', customer: 'cus_test' } },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockWebhookServiceInstance.isEventProcessed.mockResolvedValue(false);
      mockWebhookServiceInstance.storeEvent.mockResolvedValue(undefined);
      mockWebhookServiceInstance.handlePaymentMethodAttached.mockResolvedValue(undefined);
      mockWebhookServiceInstance.markEventProcessed.mockResolvedValue(undefined);

      await webhookController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWebhookServiceInstance.handlePaymentMethodAttached).toHaveBeenCalled();
    });
  });
});
