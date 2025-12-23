import { Request, Response } from 'express';

// Mock the payment service before importing controller
jest.mock('../../../src/domain/services/payment.service');
jest.mock('../../../user-service/src/utils/logger', () => ({
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

import { PaymentController } from '../../../src/api/controllers/payment.controller';
import { PaymentService } from '../../../src/domain/services/payment.service';

describe('PaymentController', () => {
  let paymentController: PaymentController;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPaymentService = new PaymentService() as jest.Mocked<PaymentService>;
    paymentController = new PaymentController(mockPaymentService);

    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      body: {},
      params: {},
      headers: {},
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };
  });

  describe('createPaymentIntent', () => {
    it('should return 200 with payment intent on success', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
      };

      mockRequest.body = {
        amount: 10.00,
        customerId: 'cus_test123',
        currency: 'usd',
        metadata: { type: 'coin_purchase' },
      };

      mockPaymentService.createPaymentIntent = jest.fn().mockResolvedValue(mockPaymentIntent);

      await paymentController.createPaymentIntent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: {
          clientSecret: 'pi_test123_secret',
          paymentIntentId: 'pi_test123',
        },
      });
    });

    it('should return 400 if amount is missing', async () => {
      mockRequest.body = {
        customerId: 'cus_test123',
      };

      await paymentController.createPaymentIntent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Amount and customer ID are required',
      });
    });

    it('should return 400 if customerId is missing', async () => {
      mockRequest.body = {
        amount: 10.00,
      };

      await paymentController.createPaymentIntent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Amount and customer ID are required',
      });
    });

    it('should return 400 on service error', async () => {
      mockRequest.body = {
        amount: 10.00,
        customerId: 'cus_test123',
      };

      mockPaymentService.createPaymentIntent = jest.fn().mockRejectedValue(
        new Error('Stripe API error')
      );

      await paymentController.createPaymentIntent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Stripe API error',
      });
    });

    it('should use default currency if not provided', async () => {
      const mockPaymentIntent = { id: 'pi_test', client_secret: 'secret' };

      mockRequest.body = {
        amount: 10.00,
        customerId: 'cus_test123',
      };

      mockPaymentService.createPaymentIntent = jest.fn().mockResolvedValue(mockPaymentIntent);

      await paymentController.createPaymentIntent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        10.00,
        'usd',
        'cus_test123',
        {}
      );
    });
  });

  describe('purchaseSubscription', () => {
    const validSubscriptionData = {
      userId: 'user-123',
      tier: 'premium',
      priceId: 'price_test123',
      email: 'test@example.com',
      paymentMethodId: 'pm_test123',
    };

    it('should return 200 on successful subscription purchase', async () => {
      const mockResult = {
        subscription: { id: 'sub_test123', status: 'active' },
        customer: { id: 'cus_test123' },
      };

      mockRequest.body = validSubscriptionData;
      mockPaymentService.purchaseSubscription = jest.fn().mockResolvedValue(mockResult);

      await paymentController.purchaseSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Subscription created successfully',
        data: mockResult,
      });
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.body = {
        ...validSubscriptionData,
        userId: undefined,
      };

      await paymentController.purchaseSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'User ID, tier, price ID, email, and payment method are required',
      });
    });

    it('should return 400 if tier is missing', async () => {
      mockRequest.body = {
        ...validSubscriptionData,
        tier: undefined,
      };

      await paymentController.purchaseSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 if priceId is missing', async () => {
      mockRequest.body = {
        ...validSubscriptionData,
        priceId: undefined,
      };

      await paymentController.purchaseSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = {
        ...validSubscriptionData,
        email: undefined,
      };

      await paymentController.purchaseSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 if paymentMethodId is missing', async () => {
      mockRequest.body = {
        ...validSubscriptionData,
        paymentMethodId: undefined,
      };

      await paymentController.purchaseSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should include trial days if provided', async () => {
      const mockResult = { subscription: { id: 'sub_test' }, customer: { id: 'cus_test' } };

      mockRequest.body = {
        ...validSubscriptionData,
        trialDays: 7,
      };

      mockPaymentService.purchaseSubscription = jest.fn().mockResolvedValue(mockResult);

      await paymentController.purchaseSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentService.purchaseSubscription).toHaveBeenCalledWith(
        { userId: 'user-123', tier: 'premium', priceId: 'price_test123', trialDays: 7 },
        'test@example.com',
        'pm_test123'
      );
    });

    it('should return 400 on service error', async () => {
      mockRequest.body = validSubscriptionData;
      mockPaymentService.purchaseSubscription = jest.fn().mockRejectedValue(
        new Error('Payment method declined')
      );

      await paymentController.purchaseSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Payment method declined',
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should return 200 on successful cancellation', async () => {
      const mockSubscription = { id: 'sub_test', cancel_at_period_end: true };

      mockRequest.body = { subscriptionId: 'sub_test' };
      mockPaymentService.cancelSubscription = jest.fn().mockResolvedValue(mockSubscription);

      await paymentController.cancelSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Subscription canceled successfully',
        data: mockSubscription,
      });
    });

    it('should return 400 if subscriptionId is missing', async () => {
      mockRequest.body = {};

      await paymentController.cancelSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Subscription ID is required',
      });
    });

    it('should cancel immediately if flag is set', async () => {
      const mockSubscription = { id: 'sub_test', status: 'canceled' };

      mockRequest.body = { subscriptionId: 'sub_test', immediately: true };
      mockPaymentService.cancelSubscription = jest.fn().mockResolvedValue(mockSubscription);

      await paymentController.cancelSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentService.cancelSubscription).toHaveBeenCalledWith('sub_test', true);
    });

    it('should cancel at period end by default', async () => {
      const mockSubscription = { id: 'sub_test' };

      mockRequest.body = { subscriptionId: 'sub_test' };
      mockPaymentService.cancelSubscription = jest.fn().mockResolvedValue(mockSubscription);

      await paymentController.cancelSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentService.cancelSubscription).toHaveBeenCalledWith('sub_test', false);
    });

    it('should return 400 on service error', async () => {
      mockRequest.body = { subscriptionId: 'sub_test' };
      mockPaymentService.cancelSubscription = jest.fn().mockRejectedValue(
        new Error('Subscription not found')
      );

      await paymentController.cancelSubscription(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Subscription not found',
      });
    });
  });

  describe('handleWebhook', () => {
    it('should return 200 on successful webhook processing', async () => {
      const mockEvent = { id: 'evt_test', type: 'payment_intent.succeeded' };

      mockRequest.body = 'raw_body_string';
      mockRequest.headers = { 'stripe-signature': 'sig_test' };

      mockPaymentService.handleWebhook = jest.fn().mockResolvedValue(mockEvent);
      mockPaymentService.processWebhookEvent = jest.fn().mockResolvedValue(undefined);

      await paymentController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Webhook processed successfully',
      });
    });

    it('should return 400 if stripe signature is missing', async () => {
      mockRequest.body = 'raw_body';
      mockRequest.headers = {};

      await paymentController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Stripe signature missing',
      });
    });

    it('should return 400 on webhook verification failure', async () => {
      mockRequest.body = 'raw_body';
      mockRequest.headers = { 'stripe-signature': 'invalid_sig' };

      mockPaymentService.handleWebhook = jest.fn().mockRejectedValue(
        new Error('Invalid signature')
      );

      await paymentController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid signature',
      });
    });
  });

  describe('getPaymentMethods', () => {
    it('should return 200 with payment methods list', async () => {
      const mockPaymentMethods = [
        { id: 'pm_1', card: { brand: 'visa', last4: '4242' } },
        { id: 'pm_2', card: { brand: 'mastercard', last4: '5555' } },
      ];

      mockRequest.params = { customerId: 'cus_test123' };
      mockPaymentService.getPaymentMethods = jest.fn().mockResolvedValue(mockPaymentMethods);

      await paymentController.getPaymentMethods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockPaymentMethods,
      });
    });

    it('should return 400 if customerId is missing', async () => {
      mockRequest.params = {};

      await paymentController.getPaymentMethods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Customer ID is required',
      });
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { customerId: 'cus_test' };
      mockPaymentService.getPaymentMethods = jest.fn().mockRejectedValue(
        new Error('Stripe API error')
      );

      await paymentController.getPaymentMethods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Stripe API error',
      });
    });
  });

  describe('addPaymentMethod', () => {
    it('should return 200 on successful payment method addition', async () => {
      const mockPaymentMethod = { id: 'pm_test', customer: 'cus_test' };

      mockRequest.body = {
        customerId: 'cus_test',
        paymentMethodId: 'pm_test',
      };

      mockPaymentService.addPaymentMethod = jest.fn().mockResolvedValue(mockPaymentMethod);

      await paymentController.addPaymentMethod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Payment method added successfully',
        data: mockPaymentMethod,
      });
    });

    it('should return 400 if customerId is missing', async () => {
      mockRequest.body = { paymentMethodId: 'pm_test' };

      await paymentController.addPaymentMethod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Customer ID and payment method ID are required',
      });
    });

    it('should return 400 if paymentMethodId is missing', async () => {
      mockRequest.body = { customerId: 'cus_test' };

      await paymentController.addPaymentMethod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 on service error', async () => {
      mockRequest.body = { customerId: 'cus_test', paymentMethodId: 'pm_test' };
      mockPaymentService.addPaymentMethod = jest.fn().mockRejectedValue(
        new Error('Payment method already attached')
      );

      await paymentController.addPaymentMethod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Payment method already attached',
      });
    });
  });

  describe('processRefund', () => {
    it('should return 200 on successful refund', async () => {
      const mockRefund = { id: 're_test', status: 'succeeded' };

      mockRequest.body = { paymentIntentId: 'pi_test' };
      mockPaymentService.processRefund = jest.fn().mockResolvedValue(mockRefund);

      await paymentController.processRefund(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Refund processed successfully',
        data: mockRefund,
      });
    });

    it('should return 400 if paymentIntentId is missing', async () => {
      mockRequest.body = {};

      await paymentController.processRefund(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Payment intent ID is required',
      });
    });

    it('should process partial refund with amount', async () => {
      const mockRefund = { id: 're_test', amount: 500 };

      mockRequest.body = {
        paymentIntentId: 'pi_test',
        amount: 5.00,
        reason: 'requested_by_customer',
      };

      mockPaymentService.processRefund = jest.fn().mockResolvedValue(mockRefund);

      await paymentController.processRefund(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentService.processRefund).toHaveBeenCalledWith(
        'pi_test',
        5.00,
        'requested_by_customer'
      );
    });

    it('should return 400 on service error', async () => {
      mockRequest.body = { paymentIntentId: 'pi_test' };
      mockPaymentService.processRefund = jest.fn().mockRejectedValue(
        new Error('Refund amount exceeds charge')
      );

      await paymentController.processRefund(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Refund amount exceeds charge',
      });
    });
  });
});
