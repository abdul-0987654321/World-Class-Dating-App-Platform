/**
 * Transaction State Machine Tests
 *
 * Unit tests for transaction lifecycle management
 */

import {
  TransactionStateMachine,
  TransactionState,
  TransactionEvent
} from '../TransactionStateMachine';
import { PaymentProvider, WebhookEventType } from '../types';
import { Knex } from 'knex';

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
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue(1),
    select: jest.fn().mockReturnThis()
  };

  const mockDb = jest.fn(() => mockQueryBuilder) as any;
  mockDb.raw = jest.fn();
  return mockDb;
};

describe('TransactionStateMachine', () => {
  let stateMachine: TransactionStateMachine;
  let mockDb: jest.Mocked<Knex>;

  beforeEach(() => {
    mockDb = createMockDb();
    stateMachine = new TransactionStateMachine(mockDb, mockLogger as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canTransition', () => {
    it('should allow valid transitions from CREATED state', () => {
      expect(stateMachine.canTransition(TransactionState.CREATED, TransactionEvent.SUBMITTED)).toBe(true);
      expect(stateMachine.canTransition(TransactionState.CREATED, TransactionEvent.CANCELLED)).toBe(true);
      expect(stateMachine.canTransition(TransactionState.CREATED, TransactionEvent.PAYMENT_FAILED)).toBe(true);
    });

    it('should reject invalid transitions from CREATED state', () => {
      expect(stateMachine.canTransition(TransactionState.CREATED, TransactionEvent.CAPTURE_SUCCEEDED)).toBe(false);
      expect(stateMachine.canTransition(TransactionState.CREATED, TransactionEvent.REFUND_INITIATED)).toBe(false);
    });

    it('should allow valid transitions from PENDING state', () => {
      expect(stateMachine.canTransition(TransactionState.PENDING, TransactionEvent.ACTION_REQUIRED)).toBe(true);
      expect(stateMachine.canTransition(TransactionState.PENDING, TransactionEvent.PROCESSING)).toBe(true);
      expect(stateMachine.canTransition(TransactionState.PENDING, TransactionEvent.PAYMENT_FAILED)).toBe(true);
    });

    it('should allow refund transitions from COMPLETED state', () => {
      expect(stateMachine.canTransition(TransactionState.COMPLETED, TransactionEvent.REFUND_INITIATED)).toBe(true);
      expect(stateMachine.canTransition(TransactionState.COMPLETED, TransactionEvent.DISPUTE_OPENED)).toBe(true);
    });

    it('should not allow transitions from terminal states', () => {
      expect(stateMachine.canTransition(TransactionState.CHARGEBACK_LOST, TransactionEvent.SUBMITTED)).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return valid events for CREATED state', () => {
      const events = stateMachine.getAvailableTransitions(TransactionState.CREATED);
      expect(events).toContain(TransactionEvent.SUBMITTED);
      expect(events).toContain(TransactionEvent.CANCELLED);
      expect(events).toContain(TransactionEvent.PAYMENT_FAILED);
    });

    it('should return valid events for COMPLETED state', () => {
      const events = stateMachine.getAvailableTransitions(TransactionState.COMPLETED);
      expect(events).toContain(TransactionEvent.REFUND_INITIATED);
      expect(events).toContain(TransactionEvent.DISPUTE_OPENED);
    });

    it('should return empty array for terminal states', () => {
      const events = stateMachine.getAvailableTransitions(TransactionState.CHARGEBACK_LOST);
      expect(events).toHaveLength(0);
    });
  });

  describe('transition', () => {
    it('should successfully transition from CREATED to PENDING', async () => {
      const transaction = {
        id: 'txn_123',
        status: TransactionState.CREATED,
        user_id: 'user_123',
        amount: 1000,
        currency: 'USD'
      };

      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue(transaction);
      (mockDb as any)().update.mockResolvedValue(1);
      (mockDb as any)().insert.mockResolvedValue([1]);

      const result = await stateMachine.transition(
        transaction,
        TransactionEvent.SUBMITTED
      );

      expect(result.status).toBe(TransactionState.PENDING);
      expect((mockDb as any)().update).toHaveBeenCalled();
      expect((mockDb as any)().insert).toHaveBeenCalled(); // State history
    });

    it('should throw error for invalid transition', async () => {
      const transaction = {
        id: 'txn_123',
        status: TransactionState.CREATED,
        user_id: 'user_123',
        amount: 1000,
        currency: 'USD'
      };

      await expect(
        stateMachine.transition(transaction, TransactionEvent.CAPTURE_SUCCEEDED)
      ).rejects.toThrow('Invalid state transition');
    });

    it('should emit event on successful transition', async () => {
      const transaction = {
        id: 'txn_123',
        status: TransactionState.AUTHORIZED,
        user_id: 'user_123',
        amount: 1000,
        currency: 'USD'
      };

      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue(transaction);
      (mockDb as any)().update.mockResolvedValue(1);
      (mockDb as any)().insert.mockResolvedValue([1]);

      const eventHandler = jest.fn();
      stateMachine.on('transition', eventHandler);

      await stateMachine.transition(
        transaction,
        TransactionEvent.CAPTURE_SUCCEEDED
      );

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should save metadata with transition', async () => {
      const transaction = {
        id: 'txn_123',
        status: TransactionState.COMPLETED,
        user_id: 'user_123',
        amount: 1000,
        currency: 'USD'
      };

      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue(transaction);
      (mockDb as any)().update.mockResolvedValue(1);
      (mockDb as any)().insert.mockResolvedValue([1]);

      await stateMachine.transition(
        transaction,
        TransactionEvent.REFUND_INITIATED,
        {
          metadata: {
            refund_amount: 500,
            reason: 'customer_request'
          }
        }
      );

      expect((mockDb as any)().insert).toHaveBeenCalled();
    });
  });

  describe('processWebhookEvent', () => {
    it('should process payment succeeded webhook', async () => {
      const transaction = {
        id: 'txn_123',
        status: TransactionState.AUTHORIZED,
        user_id: 'user_123',
        amount: 1000,
        currency: 'USD'
      };

      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue(transaction);
      (mockDb as any)().update.mockResolvedValue(1);
      (mockDb as any)().insert.mockResolvedValue([1]);

      const result = await stateMachine.processWebhookEvent('txn_123', {
        type: WebhookEventType.PAYMENT_SUCCEEDED,
        provider: PaymentProvider.STRIPE,
        providerEventId: 'evt_123',
        data: { amount: 1000 },
        timestamp: new Date()
      });

      expect(result.status).toBe(TransactionState.CAPTURED);
    });

    it('should process payment failed webhook', async () => {
      const transaction = {
        id: 'txn_123',
        status: TransactionState.PENDING,
        user_id: 'user_123',
        amount: 1000,
        currency: 'USD'
      };

      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue(transaction);
      (mockDb as any)().update.mockResolvedValue(1);
      (mockDb as any)().insert.mockResolvedValue([1]);

      const result = await stateMachine.processWebhookEvent('txn_123', {
        type: WebhookEventType.PAYMENT_FAILED,
        provider: PaymentProvider.STRIPE,
        providerEventId: 'evt_123',
        data: { error: 'insufficient_funds' },
        timestamp: new Date()
      });

      expect(result.status).toBe(TransactionState.FAILED);
    });

    it('should process refund webhook', async () => {
      const transaction = {
        id: 'txn_123',
        status: TransactionState.REFUND_PENDING,
        user_id: 'user_123',
        amount: 1000,
        currency: 'USD'
      };

      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue(transaction);
      (mockDb as any)().update.mockResolvedValue(1);
      (mockDb as any)().insert.mockResolvedValue([1]);

      const result = await stateMachine.processWebhookEvent('txn_123', {
        type: WebhookEventType.REFUND_COMPLETED,
        provider: PaymentProvider.STRIPE,
        providerEventId: 'evt_123',
        data: { amount: 1000 },
        timestamp: new Date()
      });

      expect(result.status).toBe(TransactionState.REFUNDED);
    });

    it('should throw error when transaction not found', async () => {
      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().first.mockResolvedValue(null);

      await expect(
        stateMachine.processWebhookEvent('invalid_id', {
          type: WebhookEventType.PAYMENT_SUCCEEDED,
          provider: PaymentProvider.STRIPE,
          providerEventId: 'evt_123',
          data: {},
          timestamp: new Date()
        })
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('getStateHistory', () => {
    it('should return state history for transaction', async () => {
      const history = [
        {
          from_state: TransactionState.CREATED,
          to_state: TransactionState.PENDING,
          event: TransactionEvent.SUBMITTED,
          transitioned_at: new Date()
        },
        {
          from_state: TransactionState.PENDING,
          to_state: TransactionState.AUTHORIZED,
          event: TransactionEvent.AUTHORIZATION_SUCCEEDED,
          transitioned_at: new Date()
        }
      ];

      (mockDb as any)().where.mockReturnThis();
      (mockDb as any)().select.mockReturnThis();
      (mockDb as any)().orderBy = jest.fn().mockResolvedValue(history);

      const result = await stateMachine.getStateHistory('txn_123');

      expect(result).toHaveLength(2);
      expect(result[0].from_state).toBe(TransactionState.CREATED);
    });
  });
});

describe('State transition flows', () => {
  let stateMachine: TransactionStateMachine;
  let mockDb: jest.Mocked<Knex>;

  beforeEach(() => {
    mockDb = createMockDb();
    stateMachine = new TransactionStateMachine(mockDb, mockLogger as any);
  });

  it('should support full successful payment flow', () => {
    // CREATED -> PENDING -> PROCESSING -> AUTHORIZED -> CAPTURED -> COMPLETED
    expect(stateMachine.canTransition(TransactionState.CREATED, TransactionEvent.SUBMITTED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.PENDING, TransactionEvent.PROCESSING)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.PROCESSING, TransactionEvent.AUTHORIZATION_SUCCEEDED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.AUTHORIZED, TransactionEvent.CAPTURE_SUCCEEDED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.CAPTURED, TransactionEvent.COMPLETED)).toBe(true);
  });

  it('should support 3DS authentication flow', () => {
    // CREATED -> PENDING -> REQUIRES_ACTION -> PROCESSING -> AUTHORIZED -> CAPTURED
    expect(stateMachine.canTransition(TransactionState.CREATED, TransactionEvent.SUBMITTED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.PENDING, TransactionEvent.ACTION_REQUIRED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.REQUIRES_ACTION, TransactionEvent.ACTION_COMPLETED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.PROCESSING, TransactionEvent.AUTHORIZATION_SUCCEEDED)).toBe(true);
  });

  it('should support full refund flow', () => {
    // COMPLETED -> REFUND_PENDING -> REFUNDED
    expect(stateMachine.canTransition(TransactionState.COMPLETED, TransactionEvent.REFUND_INITIATED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.REFUND_PENDING, TransactionEvent.REFUND_COMPLETED)).toBe(true);
  });

  it('should support partial refund flow', () => {
    // COMPLETED -> REFUND_PENDING -> PARTIALLY_REFUNDED -> REFUND_PENDING -> PARTIALLY_REFUNDED
    expect(stateMachine.canTransition(TransactionState.COMPLETED, TransactionEvent.REFUND_INITIATED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.REFUND_PENDING, TransactionEvent.PARTIAL_REFUND_COMPLETED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.PARTIALLY_REFUNDED, TransactionEvent.REFUND_INITIATED)).toBe(true);
  });

  it('should support dispute/chargeback flow', () => {
    // COMPLETED -> DISPUTED -> CHARGEBACK_PENDING -> CHARGEBACK_WON/LOST
    expect(stateMachine.canTransition(TransactionState.COMPLETED, TransactionEvent.DISPUTE_OPENED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.DISPUTED, TransactionEvent.CHARGEBACK_INITIATED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.CHARGEBACK_PENDING, TransactionEvent.CHARGEBACK_WON)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.CHARGEBACK_PENDING, TransactionEvent.CHARGEBACK_LOST)).toBe(true);
  });

  it('should support cancellation at various stages', () => {
    expect(stateMachine.canTransition(TransactionState.CREATED, TransactionEvent.CANCELLED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.PENDING, TransactionEvent.CANCELLED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.REQUIRES_ACTION, TransactionEvent.CANCELLED)).toBe(true);
    expect(stateMachine.canTransition(TransactionState.AUTHORIZED, TransactionEvent.CANCELLED)).toBe(true);
  });
});
