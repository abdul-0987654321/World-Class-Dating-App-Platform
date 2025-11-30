/**
 * Transaction State Machine
 *
 * Manages the lifecycle of payment transactions with:
 * - Valid state transitions
 * - State history tracking
 * - Event emission for downstream processing
 * - Audit logging
 */

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import {
  TransactionStatus,
  PaymentError,
  PaymentProvider,
} from './types';

/**
 * Extended transaction states for detailed tracking
 */
export enum TransactionState {
  CREATED = 'created',
  PENDING = 'pending',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUND_PENDING = 'refund_pending',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
  CHARGEBACK_PENDING = 'chargeback_pending',
  CHARGEBACK_WON = 'chargeback_won',
  CHARGEBACK_LOST = 'chargeback_lost',
}

/**
 * Events that can trigger state transitions
 */
export enum TransactionEvent {
  // Payment flow
  INITIATE = 'initiate',
  REQUIRE_ACTION = 'require_action',
  ACTION_COMPLETED = 'action_completed',
  AUTHORIZE = 'authorize',
  CAPTURE = 'capture',
  COMPLETE = 'complete',
  FAIL = 'fail',
  CANCEL = 'cancel',

  // Refund flow
  INITIATE_REFUND = 'initiate_refund',
  PARTIAL_REFUND = 'partial_refund',
  FULL_REFUND = 'full_refund',
  REFUND_FAILED = 'refund_failed',

  // Dispute flow
  DISPUTE_OPENED = 'dispute_opened',
  CHARGEBACK_INITIATED = 'chargeback_initiated',
  DISPUTE_WON = 'dispute_won',
  DISPUTE_LOST = 'dispute_lost',
  DISPUTE_CLOSED = 'dispute_closed',

  // Expiry
  EXPIRE = 'expire',
}

/**
 * Actor types for audit tracking
 */
export enum ActorType {
  SYSTEM = 'system',
  USER = 'user',
  WEBHOOK = 'webhook',
  ADMIN = 'admin',
  SCHEDULER = 'scheduler',
}

/**
 * State transition definition
 */
interface StateTransition {
  from: TransactionState | TransactionState[];
  to: TransactionState;
  event: TransactionEvent;
}

/**
 * Transaction state history entry
 */
interface StateHistoryEntry {
  id: string;
  transactionId: string;
  fromState: TransactionState | null;
  toState: TransactionState;
  event: TransactionEvent;
  actorType: ActorType;
  actorId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Transaction entity for state machine operations
 */
interface Transaction {
  id: string;
  userId: string;
  provider: PaymentProvider;
  providerTransactionId: string;
  state: TransactionState;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

/**
 * Valid state transitions
 */
const STATE_TRANSITIONS: StateTransition[] = [
  // Initial payment flow
  { from: [TransactionState.CREATED], to: TransactionState.PENDING, event: TransactionEvent.INITIATE },
  { from: [TransactionState.PENDING], to: TransactionState.REQUIRES_ACTION, event: TransactionEvent.REQUIRE_ACTION },
  { from: [TransactionState.REQUIRES_ACTION], to: TransactionState.PROCESSING, event: TransactionEvent.ACTION_COMPLETED },
  { from: [TransactionState.PENDING], to: TransactionState.PROCESSING, event: TransactionEvent.AUTHORIZE },
  { from: [TransactionState.PROCESSING], to: TransactionState.AUTHORIZED, event: TransactionEvent.AUTHORIZE },
  { from: [TransactionState.AUTHORIZED], to: TransactionState.CAPTURED, event: TransactionEvent.CAPTURE },
  { from: [TransactionState.CAPTURED, TransactionState.PROCESSING], to: TransactionState.COMPLETED, event: TransactionEvent.COMPLETE },
  { from: [TransactionState.AUTHORIZED], to: TransactionState.COMPLETED, event: TransactionEvent.COMPLETE },

  // Failure and cancellation
  { from: [TransactionState.CREATED, TransactionState.PENDING, TransactionState.REQUIRES_ACTION, TransactionState.PROCESSING], to: TransactionState.FAILED, event: TransactionEvent.FAIL },
  { from: [TransactionState.CREATED, TransactionState.PENDING, TransactionState.REQUIRES_ACTION, TransactionState.AUTHORIZED], to: TransactionState.CANCELLED, event: TransactionEvent.CANCEL },

  // Refund flow
  { from: [TransactionState.COMPLETED], to: TransactionState.REFUND_PENDING, event: TransactionEvent.INITIATE_REFUND },
  { from: [TransactionState.REFUND_PENDING, TransactionState.COMPLETED], to: TransactionState.PARTIALLY_REFUNDED, event: TransactionEvent.PARTIAL_REFUND },
  { from: [TransactionState.REFUND_PENDING, TransactionState.PARTIALLY_REFUNDED, TransactionState.COMPLETED], to: TransactionState.REFUNDED, event: TransactionEvent.FULL_REFUND },
  { from: [TransactionState.REFUND_PENDING], to: TransactionState.COMPLETED, event: TransactionEvent.REFUND_FAILED },
  { from: [TransactionState.REFUND_PENDING], to: TransactionState.PARTIALLY_REFUNDED, event: TransactionEvent.REFUND_FAILED },

  // Dispute flow
  { from: [TransactionState.COMPLETED, TransactionState.PARTIALLY_REFUNDED], to: TransactionState.DISPUTED, event: TransactionEvent.DISPUTE_OPENED },
  { from: [TransactionState.DISPUTED], to: TransactionState.CHARGEBACK_PENDING, event: TransactionEvent.CHARGEBACK_INITIATED },
  { from: [TransactionState.DISPUTED, TransactionState.CHARGEBACK_PENDING], to: TransactionState.CHARGEBACK_WON, event: TransactionEvent.DISPUTE_WON },
  { from: [TransactionState.DISPUTED, TransactionState.CHARGEBACK_PENDING], to: TransactionState.CHARGEBACK_LOST, event: TransactionEvent.DISPUTE_LOST },
  { from: [TransactionState.DISPUTED], to: TransactionState.COMPLETED, event: TransactionEvent.DISPUTE_CLOSED },

  // Expiry
  { from: [TransactionState.CREATED, TransactionState.PENDING, TransactionState.REQUIRES_ACTION], to: TransactionState.CANCELLED, event: TransactionEvent.EXPIRE },
];

/**
 * Transaction State Machine
 */
export class TransactionStateMachine extends EventEmitter {
  private pool: Pool;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
  }

  /**
   * Transition a transaction to a new state
   */
  async transition(
    transaction: Transaction,
    event: TransactionEvent,
    options: {
      actorType?: ActorType;
      actorId?: string;
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<Transaction> {
    const {
      actorType = ActorType.SYSTEM,
      actorId,
      details = {},
      ipAddress,
      userAgent,
    } = options;

    // Find valid transition
    const validTransition = this.findValidTransition(transaction.state, event);

    if (!validTransition) {
      throw new PaymentError(
        `Invalid state transition: ${transaction.state} -> ${event}`,
        'INVALID_STATE_TRANSITION',
        undefined,
        { currentState: transaction.state, event }
      );
    }

    const newState = validTransition.to;

    // Execute transition in a database transaction
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update transaction state
      await client.query(`
        UPDATE payment_transactions
        SET state = $1,
            status = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [newState, this.mapStateToStatus(newState), transaction.id]);

      // Record state history
      await client.query(`
        INSERT INTO transaction_state_history
        (transaction_id, from_state, to_state, event, actor_type, actor_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        transaction.id,
        transaction.state,
        newState,
        event,
        actorType,
        actorId,
        JSON.stringify(details),
        ipAddress,
        userAgent,
      ]);

      // Record audit log
      await this.recordAuditLog(client, {
        userId: transaction.userId,
        provider: transaction.provider,
        action: `state_transition_${event}`,
        entityType: 'transaction',
        entityId: transaction.id,
        requestData: { fromState: transaction.state, event },
        responseData: { toState: newState },
        success: true,
        ipAddress,
        userAgent,
      });

      await client.query('COMMIT');

      // Update transaction object
      const updatedTransaction = { ...transaction, state: newState };

      // Emit event for downstream processing
      this.emit('stateChanged', {
        transaction: updatedTransaction,
        fromState: transaction.state,
        toState: newState,
        event,
        actorType,
        actorId,
        details,
      });

      // Emit specific state events
      this.emit(newState, {
        transaction: updatedTransaction,
        fromState: transaction.state,
        event,
      });

      return updatedTransaction;
    } catch (error: any) {
      await client.query('ROLLBACK');

      // Record failed audit log
      await this.recordAuditLog(client, {
        userId: transaction.userId,
        provider: transaction.provider,
        action: `state_transition_${event}`,
        entityType: 'transaction',
        entityId: transaction.id,
        requestData: { fromState: transaction.state, event },
        responseData: {},
        success: false,
        errorMessage: error.message,
        ipAddress,
        userAgent,
      }).catch(() => {});

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a transition is valid
   */
  canTransition(currentState: TransactionState, event: TransactionEvent): boolean {
    return this.findValidTransition(currentState, event) !== undefined;
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions(currentState: TransactionState): TransactionEvent[] {
    return STATE_TRANSITIONS
      .filter(t => {
        const fromStates = Array.isArray(t.from) ? t.from : [t.from];
        return fromStates.includes(currentState);
      })
      .map(t => t.event);
  }

  /**
   * Get next possible states from current state
   */
  getNextStates(currentState: TransactionState): TransactionState[] {
    const nextStates = new Set<TransactionState>();

    STATE_TRANSITIONS.forEach(t => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      if (fromStates.includes(currentState)) {
        nextStates.add(t.to);
      }
    });

    return Array.from(nextStates);
  }

  /**
   * Get state history for a transaction
   */
  async getStateHistory(transactionId: string): Promise<StateHistoryEntry[]> {
    const result = await this.pool.query(`
      SELECT id, transaction_id, from_state, to_state, event,
             actor_type, actor_id, details, ip_address, user_agent, created_at
      FROM transaction_state_history
      WHERE transaction_id = $1
      ORDER BY created_at ASC
    `, [transactionId]);

    return result.rows.map(row => ({
      id: row.id,
      transactionId: row.transaction_id,
      fromState: row.from_state as TransactionState | null,
      toState: row.to_state as TransactionState,
      event: row.event as TransactionEvent,
      actorType: row.actor_type as ActorType,
      actorId: row.actor_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get a transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const result = await this.pool.query(`
      SELECT id, user_id, provider, provider_transaction_id, state,
             amount, currency, metadata
      FROM payment_transactions
      WHERE id = $1
    `, [transactionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider as PaymentProvider,
      providerTransactionId: row.provider_transaction_id,
      state: row.state as TransactionState,
      amount: row.amount,
      currency: row.currency,
      metadata: row.metadata,
    };
  }

  /**
   * Create a new transaction in CREATED state
   */
  async createTransaction(params: {
    userId: string;
    provider: PaymentProvider;
    providerTransactionId: string;
    type: string;
    amount: number;
    currency: string;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<Transaction> {
    const result = await this.pool.query(`
      INSERT INTO payment_transactions
      (user_id, provider, provider_transaction_id, type, state, status,
       amount, currency, payment_method_id, metadata, idempotency_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, user_id, provider, provider_transaction_id, state,
                amount, currency, metadata
    `, [
      params.userId,
      params.provider,
      params.providerTransactionId,
      params.type,
      TransactionState.CREATED,
      'pending',
      params.amount,
      params.currency,
      params.paymentMethodId,
      JSON.stringify(params.metadata || {}),
      params.idempotencyKey,
    ]);

    const row = result.rows[0];
    const transaction: Transaction = {
      id: row.id,
      userId: row.user_id,
      provider: row.provider as PaymentProvider,
      providerTransactionId: row.provider_transaction_id,
      state: row.state as TransactionState,
      amount: row.amount,
      currency: row.currency,
      metadata: row.metadata,
    };

    // Record initial state
    await this.pool.query(`
      INSERT INTO transaction_state_history
      (transaction_id, from_state, to_state, event, actor_type, details)
      VALUES ($1, NULL, $2, $3, $4, $5)
    `, [
      transaction.id,
      TransactionState.CREATED,
      'create',
      ActorType.SYSTEM,
      JSON.stringify({}),
    ]);

    this.emit('created', { transaction });

    return transaction;
  }

  /**
   * Process a webhook event and transition accordingly
   */
  async processWebhookEvent(
    transactionId: string,
    webhookEvent: {
      type: string;
      data: Record<string, any>;
    }
  ): Promise<Transaction> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new PaymentError(
        `Transaction not found: ${transactionId}`,
        'TRANSACTION_NOT_FOUND'
      );
    }

    const event = this.mapWebhookTypeToEvent(webhookEvent.type);
    if (!event) {
      // Unknown event type, no transition needed
      return transaction;
    }

    if (!this.canTransition(transaction.state, event)) {
      // Invalid transition for current state, might be a duplicate webhook
      console.warn(`Invalid transition for webhook: ${transaction.state} -> ${event}`);
      return transaction;
    }

    return this.transition(transaction, event, {
      actorType: ActorType.WEBHOOK,
      details: webhookEvent.data,
    });
  }

  /**
   * Find valid transition for given state and event
   */
  private findValidTransition(
    currentState: TransactionState,
    event: TransactionEvent
  ): StateTransition | undefined {
    return STATE_TRANSITIONS.find(t => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      return fromStates.includes(currentState) && t.event === event;
    });
  }

  /**
   * Map TransactionState to TransactionStatus for backwards compatibility
   */
  private mapStateToStatus(state: TransactionState): TransactionStatus {
    const mapping: Record<TransactionState, TransactionStatus> = {
      [TransactionState.CREATED]: TransactionStatus.PENDING,
      [TransactionState.PENDING]: TransactionStatus.PENDING,
      [TransactionState.REQUIRES_ACTION]: TransactionStatus.REQUIRES_ACTION,
      [TransactionState.PROCESSING]: TransactionStatus.PROCESSING,
      [TransactionState.AUTHORIZED]: TransactionStatus.PROCESSING,
      [TransactionState.CAPTURED]: TransactionStatus.SUCCEEDED,
      [TransactionState.COMPLETED]: TransactionStatus.SUCCEEDED,
      [TransactionState.FAILED]: TransactionStatus.FAILED,
      [TransactionState.CANCELLED]: TransactionStatus.CANCELED,
      [TransactionState.REFUND_PENDING]: TransactionStatus.SUCCEEDED,
      [TransactionState.PARTIALLY_REFUNDED]: TransactionStatus.PARTIALLY_REFUNDED,
      [TransactionState.REFUNDED]: TransactionStatus.REFUNDED,
      [TransactionState.DISPUTED]: TransactionStatus.DISPUTED,
      [TransactionState.CHARGEBACK_PENDING]: TransactionStatus.DISPUTED,
      [TransactionState.CHARGEBACK_WON]: TransactionStatus.SUCCEEDED,
      [TransactionState.CHARGEBACK_LOST]: TransactionStatus.REFUNDED,
    };

    return mapping[state] || TransactionStatus.PENDING;
  }

  /**
   * Map webhook event type to TransactionEvent
   */
  private mapWebhookTypeToEvent(webhookType: string): TransactionEvent | null {
    const mapping: Record<string, TransactionEvent> = {
      // Stripe
      'payment_intent.processing': TransactionEvent.AUTHORIZE,
      'payment_intent.succeeded': TransactionEvent.COMPLETE,
      'payment_intent.payment_failed': TransactionEvent.FAIL,
      'payment_intent.canceled': TransactionEvent.CANCEL,
      'charge.captured': TransactionEvent.CAPTURE,
      'charge.refunded': TransactionEvent.FULL_REFUND,
      'charge.refund.updated': TransactionEvent.PARTIAL_REFUND,
      'charge.dispute.created': TransactionEvent.DISPUTE_OPENED,
      'charge.dispute.closed': TransactionEvent.DISPUTE_CLOSED,

      // Square
      'payment.completed': TransactionEvent.COMPLETE,
      'payment.failed': TransactionEvent.FAIL,
      'payment.canceled': TransactionEvent.CANCEL,
      'refund.created': TransactionEvent.INITIATE_REFUND,
      'refund.updated': TransactionEvent.FULL_REFUND,
      'dispute.created': TransactionEvent.DISPUTE_OPENED,

      // Adyen
      'AUTHORISATION': TransactionEvent.AUTHORIZE,
      'CAPTURE': TransactionEvent.CAPTURE,
      'CANCELLATION': TransactionEvent.CANCEL,
      'REFUND': TransactionEvent.FULL_REFUND,
      'CHARGEBACK': TransactionEvent.CHARGEBACK_INITIATED,
      'CHARGEBACK_REVERSED': TransactionEvent.DISPUTE_WON,

      // Generic
      'payment.authorized': TransactionEvent.AUTHORIZE,
      'payment.captured': TransactionEvent.CAPTURE,
      'payment.completed': TransactionEvent.COMPLETE,
      'payment.failed': TransactionEvent.FAIL,
      'payment.canceled': TransactionEvent.CANCEL,
      'refund.completed': TransactionEvent.FULL_REFUND,
      'dispute.opened': TransactionEvent.DISPUTE_OPENED,
      'dispute.won': TransactionEvent.DISPUTE_WON,
      'dispute.lost': TransactionEvent.DISPUTE_LOST,
    };

    return mapping[webhookType] || null;
  }

  /**
   * Record an audit log entry
   */
  private async recordAuditLog(
    client: PoolClient | Pool,
    params: {
      userId?: string;
      provider?: PaymentProvider;
      action: string;
      entityType: string;
      entityId: string;
      requestData: Record<string, any>;
      responseData: Record<string, any>;
      success: boolean;
      errorMessage?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    await client.query(`
      INSERT INTO payment_audit_log
      (user_id, provider, action, entity_type, entity_id,
       request_data, response_data, success, error_message,
       ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      params.userId,
      params.provider,
      params.action,
      params.entityType,
      params.entityId,
      JSON.stringify(params.requestData),
      JSON.stringify(params.responseData),
      params.success,
      params.errorMessage,
      params.ipAddress,
      params.userAgent,
    ]);
  }
}

// Export singleton factory
let stateMachineInstance: TransactionStateMachine | null = null;

export function getTransactionStateMachine(pool: Pool): TransactionStateMachine {
  if (!stateMachineInstance) {
    stateMachineInstance = new TransactionStateMachine(pool);
  }
  return stateMachineInstance;
}

export default TransactionStateMachine;
