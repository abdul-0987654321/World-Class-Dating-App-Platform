/**
 * Payment Flow Integration Tests
 *
 * End-to-end integration tests for complete payment flows
 * These tests verify the interaction between components
 */

import { PaymentRouter, PaymentContext } from '../../PaymentRouter';
import { TransactionStateMachine, TransactionState, TransactionEvent } from '../../TransactionStateMachine';
import { WebhookProcessor, WebhookStatus } from '../../webhooks/WebhookProcessor';
import { PaymentProvider, WebhookEventType } from '../../types';
import { Knex } from 'knex';

// Mock all dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// In-memory database mock for integration testing
class InMemoryDatabase {
  private tables: Map<string, any[]> = new Map();

  constructor() {
    this.tables.set('transactions', []);
    this.tables.set('transaction_state_history', []);
    this.tables.set('webhook_events', []);
    this.tables.set('idempotency_keys', []);
    this.tables.set('processor_configs', [
      {
        provider: PaymentProvider.STRIPE,
        is_healthy: true,
        health_score: 100,
        success_rate: 0.99,
        avg_response_time_ms: 150
      }
    ]);
    this.tables.set('routing_rules', []);
    this.tables.set('payment_audit_log', []);
  }

  getTable(name: string): any[] {
    return this.tables.get(name) || [];
  }

  insert(table: string, data: any): void {
    const tableData = this.tables.get(table) || [];
    tableData.push(data);
    this.tables.set(table, tableData);
  }

  update(table: string, id: string, data: any): void {
    const tableData = this.tables.get(table) || [];
    const index = tableData.findIndex(row => row.id === id);
    if (index !== -1) {
      tableData[index] = { ...tableData[index], ...data };
    }
  }

  find(table: string, query: any): any | null {
    const tableData = this.tables.get(table) || [];
    return tableData.find(row => {
      return Object.entries(query).every(([key, value]) => row[key] === value);
    }) || null;
  }

  filter(table: string, query: any): any[] {
    const tableData = this.tables.get(table) || [];
    return tableData.filter(row => {
      return Object.entries(query).every(([key, value]) => row[key] === value);
    });
  }
}

// Create mock Knex instance that uses in-memory database
function createTestDb(memDb: InMemoryDatabase): jest.Mocked<Knex> {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    groupBy: jest.fn()
  };

  let currentTable = '';

  const mockDb = jest.fn((tableName: string) => {
    currentTable = tableName;

    mockQueryBuilder.first = jest.fn().mockImplementation(() => {
      const whereClause = mockQueryBuilder.where.mock.calls[mockQueryBuilder.where.mock.calls.length - 1]?.[0];
      if (whereClause) {
        return Promise.resolve(memDb.find(currentTable, whereClause));
      }
      return Promise.resolve(null);
    });

    mockQueryBuilder.insert = jest.fn().mockImplementation((data) => {
      memDb.insert(currentTable, data);
      return Promise.resolve([1]);
    });

    mockQueryBuilder.update = jest.fn().mockImplementation((data) => {
      const whereClause = mockQueryBuilder.where.mock.calls[mockQueryBuilder.where.mock.calls.length - 1]?.[0];
      if (whereClause?.id) {
        memDb.update(currentTable, whereClause.id, data);
      }
      return Promise.resolve(1);
    });

    mockQueryBuilder.groupBy = jest.fn().mockResolvedValue([]);
    mockQueryBuilder.limit = jest.fn().mockResolvedValue(memDb.getTable(currentTable));

    return mockQueryBuilder;
  }) as any;

  mockDb.raw = jest.fn();
  return mockDb;
}

// Mock payment provider
const createMockProvider = (provider: PaymentProvider) => ({
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
    status: 'requires_confirmation',
    clientSecret: 'secret_123'
  }),
  confirmPaymentIntent: jest.fn().mockResolvedValue({
    id: 'pi_123',
    status: 'succeeded',
    amount: 1000,
    currency: 'USD'
  }),
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
  refund: jest.fn().mockResolvedValue({ id: 'ref_123', status: 'succeeded', amount: 1000, currency: 'USD' }),
  handleWebhook: jest.fn().mockResolvedValue({ type: 'test', data: {} })
});

describe('Payment Flow Integration Tests', () => {
  let memDb: InMemoryDatabase;
  let db: jest.Mocked<Knex>;
  let router: PaymentRouter;
  let stateMachine: TransactionStateMachine;
  let webhookProcessor: WebhookProcessor;
  let stripeProvider: any;

  beforeEach(() => {
    memDb = new InMemoryDatabase();
    db = createTestDb(memDb);
    stripeProvider = createMockProvider(PaymentProvider.STRIPE);

    router = new PaymentRouter(db, mockLogger as any, [stripeProvider]);
    stateMachine = new TransactionStateMachine(db, mockLogger as any);
    webhookProcessor = new WebhookProcessor(db, mockLogger as any, stateMachine);
  });

  afterEach(() => {
    jest.clearAllMocks();
    webhookProcessor.stop();
  });

  describe('Complete Payment Flow', () => {
    it('should process a complete successful payment', async () => {
      // Step 1: Create transaction
      const transactionId = 'txn_integration_123';
      const transaction = {
        id: transactionId,
        user_id: 'user_123',
        type: 'payment',
        amount: 1000,
        currency: 'USD',
        status: TransactionState.CREATED,
        created_at: new Date(),
        updated_at: new Date()
      };
      memDb.insert('transactions', transaction);

      // Step 2: Transition to pending
      const pendingTxn = await stateMachine.transition(
        transaction,
        TransactionEvent.SUBMITTED
      );
      expect(pendingTxn.status).toBe(TransactionState.PENDING);

      // Step 3: Create payment intent via router
      const context: PaymentContext = {
        amount: 1000,
        currency: 'USD',
        country: 'US',
        paymentMethodType: 'card',
        isRecurring: false
      };

      const result = await router.executeWithFailover(
        async (provider) => provider.createPaymentIntent({
          amount: 1000,
          currency: 'USD',
          customerId: 'cust_123'
        }),
        context
      );

      expect(result.result.id).toBe('pi_123');
      expect(result.processor).toBe(PaymentProvider.STRIPE);

      // Step 4: Confirm payment
      const confirmedIntent = await stripeProvider.confirmPaymentIntent('pi_123', 'pm_123');
      expect(confirmedIntent.status).toBe('succeeded');

      // Step 5: Transition to completed via webhook
      const completedTxn = await stateMachine.processWebhookEvent(transactionId, {
        type: WebhookEventType.PAYMENT_SUCCEEDED,
        provider: PaymentProvider.STRIPE,
        providerEventId: 'evt_123',
        data: { amount: 1000 },
        timestamp: new Date()
      });

      expect(completedTxn.status).toBe(TransactionState.CAPTURED);
    });

    it('should handle failed payment with proper state transitions', async () => {
      // Create transaction
      const transactionId = 'txn_failed_123';
      const transaction = {
        id: transactionId,
        user_id: 'user_123',
        type: 'payment',
        amount: 1000,
        currency: 'USD',
        status: TransactionState.CREATED,
        created_at: new Date(),
        updated_at: new Date()
      };
      memDb.insert('transactions', transaction);

      // Submit payment
      const pendingTxn = await stateMachine.transition(
        transaction,
        TransactionEvent.SUBMITTED
      );

      // Process failed payment webhook
      const failedTxn = await stateMachine.processWebhookEvent(transactionId, {
        type: WebhookEventType.PAYMENT_FAILED,
        provider: PaymentProvider.STRIPE,
        providerEventId: 'evt_failed_123',
        data: { error: { code: 'card_declined' } },
        timestamp: new Date()
      });

      expect(failedTxn.status).toBe(TransactionState.FAILED);
    });

    it('should process 3DS authentication flow', async () => {
      // Create transaction
      const transactionId = 'txn_3ds_123';
      const transaction = {
        id: transactionId,
        user_id: 'user_123',
        type: 'payment',
        amount: 5000, // Higher amount triggers 3DS
        currency: 'USD',
        status: TransactionState.CREATED,
        created_at: new Date(),
        updated_at: new Date()
      };
      memDb.insert('transactions', transaction);

      // Submit payment
      await stateMachine.transition(transaction, TransactionEvent.SUBMITTED);

      // Requires 3DS action
      const updatedTxn = memDb.find('transactions', { id: transactionId });
      updatedTxn.status = TransactionState.PENDING;

      const requiresActionTxn = await stateMachine.transition(
        updatedTxn,
        TransactionEvent.ACTION_REQUIRED
      );
      expect(requiresActionTxn.status).toBe(TransactionState.REQUIRES_ACTION);

      // Complete 3DS
      const actionCompletedTxn = await stateMachine.transition(
        { ...requiresActionTxn, status: TransactionState.REQUIRES_ACTION },
        TransactionEvent.ACTION_COMPLETED
      );
      expect(actionCompletedTxn.status).toBe(TransactionState.PROCESSING);
    });
  });

  describe('Refund Flow', () => {
    it('should process full refund', async () => {
      // Create completed transaction
      const transactionId = 'txn_refund_123';
      const transaction = {
        id: transactionId,
        user_id: 'user_123',
        type: 'payment',
        amount: 1000,
        currency: 'USD',
        status: TransactionState.COMPLETED,
        created_at: new Date(),
        updated_at: new Date()
      };
      memDb.insert('transactions', transaction);

      // Initiate refund
      const refundPendingTxn = await stateMachine.transition(
        transaction,
        TransactionEvent.REFUND_INITIATED
      );
      expect(refundPendingTxn.status).toBe(TransactionState.REFUND_PENDING);

      // Create refund via provider
      const refund = await stripeProvider.refund({
        paymentIntentId: 'pi_123',
        amount: 1000
      });
      expect(refund.status).toBe('succeeded');

      // Complete refund via webhook
      const refundedTxn = await stateMachine.processWebhookEvent(transactionId, {
        type: WebhookEventType.REFUND_COMPLETED,
        provider: PaymentProvider.STRIPE,
        providerEventId: 'evt_refund_123',
        data: { amount: 1000 },
        timestamp: new Date()
      });

      expect(refundedTxn.status).toBe(TransactionState.REFUNDED);
    });

    it('should process partial refund', async () => {
      // Create completed transaction
      const transactionId = 'txn_partial_refund_123';
      const transaction = {
        id: transactionId,
        user_id: 'user_123',
        type: 'payment',
        amount: 1000,
        currency: 'USD',
        status: TransactionState.COMPLETED,
        created_at: new Date(),
        updated_at: new Date()
      };
      memDb.insert('transactions', transaction);

      // Initiate partial refund
      const refundPendingTxn = await stateMachine.transition(
        transaction,
        TransactionEvent.REFUND_INITIATED
      );

      // Complete partial refund
      const updatedTxn = memDb.find('transactions', { id: transactionId });
      updatedTxn.status = TransactionState.REFUND_PENDING;

      const partialRefundedTxn = await stateMachine.transition(
        updatedTxn,
        TransactionEvent.PARTIAL_REFUND_COMPLETED
      );

      expect(partialRefundedTxn.status).toBe(TransactionState.PARTIALLY_REFUNDED);

      // Can initiate another refund
      const secondRefundPendingTxn = await stateMachine.transition(
        { ...partialRefundedTxn, status: TransactionState.PARTIALLY_REFUNDED },
        TransactionEvent.REFUND_INITIATED
      );
      expect(secondRefundPendingTxn.status).toBe(TransactionState.REFUND_PENDING);
    });
  });

  describe('Dispute Flow', () => {
    it('should handle dispute and chargeback', async () => {
      // Create completed transaction
      const transactionId = 'txn_dispute_123';
      const transaction = {
        id: transactionId,
        user_id: 'user_123',
        type: 'payment',
        amount: 1000,
        currency: 'USD',
        status: TransactionState.COMPLETED,
        created_at: new Date(),
        updated_at: new Date()
      };
      memDb.insert('transactions', transaction);

      // Dispute opened
      const disputedTxn = await stateMachine.transition(
        transaction,
        TransactionEvent.DISPUTE_OPENED
      );
      expect(disputedTxn.status).toBe(TransactionState.DISPUTED);

      // Chargeback initiated
      const chargebackTxn = await stateMachine.transition(
        { ...disputedTxn, status: TransactionState.DISPUTED },
        TransactionEvent.CHARGEBACK_INITIATED
      );
      expect(chargebackTxn.status).toBe(TransactionState.CHARGEBACK_PENDING);

      // Chargeback lost
      const lostTxn = await stateMachine.transition(
        { ...chargebackTxn, status: TransactionState.CHARGEBACK_PENDING },
        TransactionEvent.CHARGEBACK_LOST
      );
      expect(lostTxn.status).toBe(TransactionState.CHARGEBACK_LOST);
    });
  });

  describe('Router Failover', () => {
    it('should failover to backup provider on error', async () => {
      // Add second provider
      const squareProvider = createMockProvider(PaymentProvider.SQUARE);
      const multiRouter = new PaymentRouter(
        db,
        mockLogger as any,
        [stripeProvider, squareProvider]
      );

      // Make Stripe fail
      stripeProvider.createPaymentIntent.mockRejectedValueOnce(new Error('Stripe down'));

      const context: PaymentContext = {
        amount: 1000,
        currency: 'USD',
        country: 'US',
        paymentMethodType: 'card',
        isRecurring: false
      };

      const result = await multiRouter.executeWithFailover(
        async (provider) => provider.createPaymentIntent({
          amount: 1000,
          currency: 'USD'
        }),
        context,
        2
      );

      expect(result.usedFallback).toBe(true);
      expect(result.processor).toBe(PaymentProvider.SQUARE);
    });
  });
});

describe('Webhook Processing Integration', () => {
  let memDb: InMemoryDatabase;
  let db: jest.Mocked<Knex>;
  let stateMachine: TransactionStateMachine;
  let webhookProcessor: WebhookProcessor;

  beforeEach(() => {
    memDb = new InMemoryDatabase();
    db = createTestDb(memDb);
    stateMachine = new TransactionStateMachine(db, mockLogger as any);
    webhookProcessor = new WebhookProcessor(db, mockLogger as any, stateMachine);
  });

  afterEach(() => {
    webhookProcessor.stop();
  });

  it('should process webhook and update transaction state', async () => {
    // Create transaction
    const transactionId = 'txn_webhook_123';
    const transaction = {
      id: transactionId,
      user_id: 'user_123',
      type: 'payment',
      amount: 1000,
      currency: 'USD',
      status: TransactionState.AUTHORIZED,
      created_at: new Date(),
      updated_at: new Date()
    };
    memDb.insert('transactions', transaction);

    // Simulate webhook reception
    const webhookPayload = JSON.stringify({
      id: 'evt_webhook_123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          metadata: { transaction_id: transactionId }
        }
      }
    });

    // Mock signature verification
    jest.spyOn(webhookProcessor, 'verifySignature').mockResolvedValue(true);

    const result = await webhookProcessor.receiveWebhook(
      PaymentProvider.STRIPE,
      webhookPayload,
      { 'stripe-signature': 'test_sig' }
    );

    expect(result.status).toBe(WebhookStatus.RECEIVED);
  });

  it('should handle duplicate webhooks idempotently', async () => {
    // Create existing webhook event
    memDb.insert('webhook_events', {
      id: 'existing_webhook_123',
      provider: PaymentProvider.STRIPE,
      event_id: 'evt_duplicate_123',
      event_type: 'payment_intent.succeeded',
      status: WebhookStatus.COMPLETED
    });

    const webhookPayload = JSON.stringify({
      id: 'evt_duplicate_123',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } }
    });

    jest.spyOn(webhookProcessor, 'verifySignature').mockResolvedValue(true);

    const result = await webhookProcessor.receiveWebhook(
      PaymentProvider.STRIPE,
      webhookPayload,
      { 'stripe-signature': 'test_sig' }
    );

    expect(result.status).toBe(WebhookStatus.DUPLICATE);
  });
});
