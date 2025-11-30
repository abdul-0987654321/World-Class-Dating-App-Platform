/**
 * Webhook Processor Tests
 *
 * Unit tests for webhook handling and processing
 */

import {
  WebhookProcessor,
  WebhookStatus,
  IWebhookHandler,
  WebhookEventRecord
} from '../webhooks/WebhookProcessor';
import { TransactionStateMachine, TransactionState, TransactionEvent } from '../TransactionStateMachine';
import { PaymentProvider, WebhookEventType } from '../types';
import { Knex } from 'knex';
import crypto from 'crypto';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock database
const createMockDb = (): jest.Mocked<Knex> => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue(1),
    select: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue([]),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    offset: jest.fn().mockReturnThis()
  };

  const mockDb = jest.fn(() => mockQueryBuilder) as any;
  mockDb.raw = jest.fn();
  return mockDb;
};

// Mock state machine
const createMockStateMachine = (): jest.Mocked<TransactionStateMachine> => ({
  transition: jest.fn().mockResolvedValue({ id: 'txn_123', status: TransactionState.COMPLETED }),
  canTransition: jest.fn().mockReturnValue(true),
  getAvailableTransitions: jest.fn().mockReturnValue([]),
  processWebhookEvent: jest.fn().mockResolvedValue({ id: 'txn_123', status: TransactionState.COMPLETED }),
  getStateHistory: jest.fn().mockResolvedValue([]),
  on: jest.fn(),
  emit: jest.fn()
} as any);

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;
  let mockDb: jest.Mocked<Knex>;
  let mockStateMachine: jest.Mocked<TransactionStateMachine>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockStateMachine = createMockStateMachine();
    processor = new WebhookProcessor(mockDb, mockLogger as any, mockStateMachine);

    // Set up environment variables for webhook secrets
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'square_sig_key';
    process.env.ADYEN_HMAC_KEY = 'adyen_hmac_key';
  });

  afterEach(() => {
    jest.clearAllMocks();
    processor.stop();
  });

  describe('verifySignature', () => {
    it('should verify valid Stripe signature', async () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const secret = process.env.STRIPE_WEBHOOK_SECRET!;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      const headers = {
        'stripe-signature': `t=${timestamp},v1=${signature}`
      };

      const isValid = await processor.verifySignature(
        PaymentProvider.STRIPE,
        payload,
        headers
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid Stripe signature', async () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const headers = {
        'stripe-signature': 't=12345,v1=invalidsignature'
      };

      const isValid = await processor.verifySignature(
        PaymentProvider.STRIPE,
        payload,
        headers
      );

      expect(isValid).toBe(false);
    });

    it('should reject expired Stripe timestamp', async () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signedPayload = `${timestamp}.${payload}`;
      const secret = process.env.STRIPE_WEBHOOK_SECRET!;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      const headers = {
        'stripe-signature': `t=${timestamp},v1=${signature}`
      };

      const isValid = await processor.verifySignature(
        PaymentProvider.STRIPE,
        payload,
        headers
      );

      expect(isValid).toBe(false);
    });

    it('should return false for missing signature header', async () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const headers = {};

      const isValid = await processor.verifySignature(
        PaymentProvider.STRIPE,
        payload,
        headers
      );

      expect(isValid).toBe(false);
    });
  });

  describe('receiveWebhook', () => {
    it('should receive and store valid webhook event', async () => {
      const payload = JSON.stringify({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } }
      });

      // Mock signature verification
      jest.spyOn(processor, 'verifySignature').mockResolvedValue(true);

      // Mock no existing event
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue(null);
      (mockDb as any)().insert.mockResolvedValue([1]);

      const result = await processor.receiveWebhook(
        PaymentProvider.STRIPE,
        payload,
        { 'stripe-signature': 'test' }
      );

      expect(result.status).toBe(WebhookStatus.RECEIVED);
      expect((mockDb as any)().insert).toHaveBeenCalled();
    });

    it('should return duplicate status for existing event', async () => {
      const payload = JSON.stringify({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } }
      });

      jest.spyOn(processor, 'verifySignature').mockResolvedValue(true);

      // Mock existing event
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue({ id: 'existing_123' });

      const result = await processor.receiveWebhook(
        PaymentProvider.STRIPE,
        payload,
        { 'stripe-signature': 'test' }
      );

      expect(result.status).toBe(WebhookStatus.DUPLICATE);
    });

    it('should throw error for invalid signature', async () => {
      const payload = JSON.stringify({
        id: 'evt_123',
        type: 'payment_intent.succeeded'
      });

      jest.spyOn(processor, 'verifySignature').mockResolvedValue(false);

      await expect(
        processor.receiveWebhook(
          PaymentProvider.STRIPE,
          payload,
          { 'stripe-signature': 'invalid' }
        )
      ).rejects.toThrow('Invalid webhook signature');
    });
  });

  describe('registerHandler', () => {
    it('should register handler for event types', () => {
      const handler: IWebhookHandler = {
        eventTypes: ['payment_intent.succeeded', 'payment_intent.failed'],
        handle: jest.fn()
      };

      processor.registerHandler(handler);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Webhook handler registered',
        { eventTypes: handler.eventTypes }
      );
    });
  });

  describe('processQueue', () => {
    it('should process pending events from queue', async () => {
      const pendingEvent = {
        id: 'webhook_123',
        provider: PaymentProvider.STRIPE,
        event_id: 'evt_123',
        event_type: 'payment_intent.succeeded',
        payload: JSON.stringify({ data: { object: { id: 'pi_123' } } }),
        status: WebhookStatus.RECEIVED,
        attempts: 0,
        max_attempts: 5
      };

      (mockDb as any)().whereIn.mockReturnThis();
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().orWhere = jest.fn().mockReturnThis();
      (mockDb as any)().orderBy.mockReturnThis();
      (mockDb as any)().limit.mockResolvedValue([pendingEvent]);
      (mockDb as any)().update.mockResolvedValue(1);

      await processor.processQueue();

      // Should have updated status to processing then completed
      expect((mockDb as any)().update).toHaveBeenCalled();
    });

    it('should mark event as failed on error', async () => {
      const pendingEvent = {
        id: 'webhook_123',
        provider: PaymentProvider.STRIPE,
        event_id: 'evt_123',
        event_type: 'payment_intent.succeeded',
        payload: JSON.stringify({ data: { object: { id: 'pi_123' } } }),
        status: WebhookStatus.RECEIVED,
        attempts: 0,
        max_attempts: 5
      };

      (mockDb as any)().whereIn.mockReturnThis();
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().orWhere = jest.fn().mockReturnThis();
      (mockDb as any)().orderBy.mockReturnThis();
      (mockDb as any)().limit.mockResolvedValue([pendingEvent]);
      (mockDb as any)().update
        .mockResolvedValueOnce(1) // First update to processing
        .mockResolvedValueOnce(1); // Second update to failed

      // Mock state machine to throw error
      mockStateMachine.processWebhookEvent.mockRejectedValue(new Error('Processing error'));

      // Also need to handle the transaction lookup
      (mockDb as any)().first.mockResolvedValue(null);

      await processor.processQueue();

      // Should have marked as failed
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should move to dead letter after max attempts', async () => {
      const failedEvent = {
        id: 'webhook_123',
        provider: PaymentProvider.STRIPE,
        event_id: 'evt_123',
        event_type: 'payment_intent.succeeded',
        payload: JSON.stringify({ data: { object: { id: 'pi_123' } } }),
        status: WebhookStatus.FAILED,
        attempts: 4, // One less than max
        max_attempts: 5
      };

      (mockDb as any)().whereIn.mockReturnThis();
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().orWhere = jest.fn().mockReturnThis();
      (mockDb as any)().orderBy.mockReturnThis();
      (mockDb as any)().limit.mockResolvedValue([failedEvent]);
      (mockDb as any)().update.mockResolvedValue(1);
      (mockDb as any)().first.mockResolvedValue(null);

      // Mock handler that throws
      mockStateMachine.processWebhookEvent.mockRejectedValue(new Error('Still failing'));

      const deadLetterHandler = jest.fn();
      processor.on('webhook:dead_letter', deadLetterHandler);

      await processor.processQueue();

      // Should emit dead letter event
      expect(deadLetterHandler).toHaveBeenCalled();
    });
  });

  describe('retryDeadLetter', () => {
    it('should reset dead letter event for retry', async () => {
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().update.mockResolvedValue(1);

      await processor.retryDeadLetter('webhook_123');

      expect((mockDb as any)().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: WebhookStatus.RECEIVED,
          attempts: 0
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return processing statistics', async () => {
      (mockDb as any)().select.mockReturnThis();
      (mockDb as any)().count.mockReturnThis();
      (mockDb as any)().groupBy.mockResolvedValueOnce([
        { status: WebhookStatus.COMPLETED, count: '100' },
        { status: WebhookStatus.FAILED, count: '5' },
        { status: WebhookStatus.DEAD_LETTER, count: '2' }
      ]).mockResolvedValueOnce([
        { provider: PaymentProvider.STRIPE, count: '80' },
        { provider: PaymentProvider.SQUARE, count: '27' }
      ]);

      const stats = await processor.getStats();

      expect(stats.total).toBe(107);
      expect(stats.byStatus[WebhookStatus.COMPLETED]).toBe(100);
      expect(stats.processingRate).toBeCloseTo(0.935, 2);
      expect(stats.errorRate).toBeCloseTo(0.065, 2);
    });
  });

  describe('start/stop', () => {
    it('should start processing interval', () => {
      processor.start(1000);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Webhook processor started',
        { intervalMs: 1000 }
      );
    });

    it('should stop processing interval', () => {
      processor.start(1000);
      processor.stop();
      expect(mockLogger.info).toHaveBeenCalledWith('Webhook processor stopped');
    });

    it('should not start multiple times', () => {
      processor.start(1000);
      processor.start(1000);
      // Should only log once
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Event type extraction', () => {
  let processor: WebhookProcessor;
  let mockDb: jest.Mocked<Knex>;
  let mockStateMachine: jest.Mocked<TransactionStateMachine>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockStateMachine = createMockStateMachine();
    processor = new WebhookProcessor(mockDb, mockLogger as any, mockStateMachine);
  });

  afterEach(() => {
    processor.stop();
  });

  it('should extract Stripe event ID and type', async () => {
    const payload = JSON.stringify({
      id: 'evt_stripe_123',
      type: 'payment_intent.succeeded',
      data: { object: {} }
    });

    jest.spyOn(processor, 'verifySignature').mockResolvedValue(true);
    (mockDb as any)().where.mockReturnThis();
    (mockDb as any)().first.mockResolvedValue(null);
    (mockDb as any)().insert.mockResolvedValue([1]);

    await processor.receiveWebhook(
      PaymentProvider.STRIPE,
      payload,
      { 'stripe-signature': 'test' }
    );

    const insertCall = (mockDb as any)().insert.mock.calls[1]; // Second insert is webhook_events
    expect(insertCall[0].event_id).toBe('evt_stripe_123');
    expect(insertCall[0].event_type).toBe('payment_intent.succeeded');
  });

  it('should extract Square event ID and type', async () => {
    const payload = JSON.stringify({
      event_id: 'square_evt_456',
      type: 'payment.completed',
      data: {}
    });

    jest.spyOn(processor, 'verifySignature').mockResolvedValue(true);
    (mockDb as any)().where.mockReturnThis();
    (mockDb as any)().first.mockResolvedValue(null);
    (mockDb as any)().insert.mockResolvedValue([1]);

    await processor.receiveWebhook(
      PaymentProvider.SQUARE,
      payload,
      { 'x-square-hmacsha256-signature': 'test' }
    );

    const insertCall = (mockDb as any)().insert.mock.calls[1];
    expect(insertCall[0].event_id).toBe('square_evt_456');
    expect(insertCall[0].event_type).toBe('payment.completed');
  });

  it('should extract Adyen event from notification items', async () => {
    const payload = JSON.stringify({
      notificationItems: [{
        NotificationRequestItem: {
          pspReference: 'adyen_ref_789',
          eventCode: 'AUTHORISATION'
        }
      }]
    });

    jest.spyOn(processor, 'verifySignature').mockResolvedValue(true);
    (mockDb as any)().where.mockReturnThis();
    (mockDb as any)().first.mockResolvedValue(null);
    (mockDb as any)().insert.mockResolvedValue([1]);

    await processor.receiveWebhook(
      PaymentProvider.ADYEN,
      payload,
      { 'x-adyen-hmac': 'test' }
    );

    const insertCall = (mockDb as any)().insert.mock.calls[1];
    expect(insertCall[0].event_id).toBe('adyen_ref_789');
    expect(insertCall[0].event_type).toBe('AUTHORISATION');
  });
});
