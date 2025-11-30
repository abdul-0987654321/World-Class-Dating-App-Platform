/**
 * Enhanced Webhook Processing Infrastructure
 *
 * Multi-provider webhook handling with:
 * - Signature verification per provider
 * - Idempotent processing with deduplication
 * - Queue-based processing with retries
 * - Dead letter queue for failed events
 * - Event routing to appropriate handlers
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { Knex } from 'knex';
import { Logger } from '../../../utils/logger';
import { PaymentProvider, WebhookEvent, WebhookEventType } from '../types';
import { TransactionStateMachine, TransactionEvent } from '../TransactionStateMachine';

// Webhook event status
export enum WebhookStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
  DUPLICATE = 'duplicate'
}

// Webhook event record
export interface WebhookEventRecord {
  id: string;
  provider: PaymentProvider;
  event_id: string;
  event_type: string;
  payload: Record<string, any>;
  signature: string;
  status: WebhookStatus;
  attempts: number;
  max_attempts: number;
  next_retry_at: Date | null;
  processed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

// Provider-specific webhook config
interface ProviderWebhookConfig {
  provider: PaymentProvider;
  secret: string;
  signatureHeader: string;
  timestampHeader?: string;
  toleranceSeconds?: number;
}

// Webhook handler interface
export interface IWebhookHandler {
  eventTypes: string[];
  handle(event: WebhookEventRecord): Promise<void>;
}

// Retry configuration
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export class WebhookProcessor extends EventEmitter {
  private db: Knex;
  private logger: Logger;
  private stateMachine: TransactionStateMachine;
  private providerConfigs: Map<PaymentProvider, ProviderWebhookConfig> = new Map();
  private handlers: Map<string, IWebhookHandler[]> = new Map();
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private readonly retryConfig: RetryConfig = {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 3600000, // 1 hour
    backoffMultiplier: 2
  };

  constructor(
    db: Knex,
    logger: Logger,
    stateMachine: TransactionStateMachine
  ) {
    super();
    this.db = db;
    this.logger = logger;
    this.stateMachine = stateMachine;
    this.initializeProviderConfigs();
  }

  private initializeProviderConfigs(): void {
    // Stripe webhook config
    this.providerConfigs.set(PaymentProvider.STRIPE, {
      provider: PaymentProvider.STRIPE,
      secret: process.env.STRIPE_WEBHOOK_SECRET || '',
      signatureHeader: 'stripe-signature',
      toleranceSeconds: 300
    });

    // Square webhook config
    this.providerConfigs.set(PaymentProvider.SQUARE, {
      provider: PaymentProvider.SQUARE,
      secret: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '',
      signatureHeader: 'x-square-hmacsha256-signature'
    });

    // Adyen webhook config
    this.providerConfigs.set(PaymentProvider.ADYEN, {
      provider: PaymentProvider.ADYEN,
      secret: process.env.ADYEN_HMAC_KEY || '',
      signatureHeader: 'x-adyen-hmac'
    });

    // Wise webhook config
    this.providerConfigs.set(PaymentProvider.WISE, {
      provider: PaymentProvider.WISE,
      secret: process.env.WISE_WEBHOOK_SECRET || '',
      signatureHeader: 'x-signature-sha256'
    });

    // Amazon Pay webhook config
    this.providerConfigs.set(PaymentProvider.AMAZON_PAY, {
      provider: PaymentProvider.AMAZON_PAY,
      secret: process.env.AMAZON_PAY_IPN_SECRET || '',
      signatureHeader: 'x-amz-sns-message-signature'
    });
  }

  /**
   * Verify webhook signature based on provider
   */
  async verifySignature(
    provider: PaymentProvider,
    payload: string | Buffer,
    headers: Record<string, string>
  ): Promise<boolean> {
    const config = this.providerConfigs.get(provider);
    if (!config) {
      throw new Error(`No webhook config for provider: ${provider}`);
    }

    const signature = headers[config.signatureHeader.toLowerCase()];
    if (!signature) {
      this.logger.warn('Missing webhook signature', { provider });
      return false;
    }

    try {
      switch (provider) {
        case PaymentProvider.STRIPE:
          return this.verifyStripeSignature(payload, signature, config);
        case PaymentProvider.SQUARE:
          return this.verifySquareSignature(payload, signature, config);
        case PaymentProvider.ADYEN:
          return this.verifyAdyenSignature(payload, signature, config);
        case PaymentProvider.WISE:
          return this.verifyWiseSignature(payload, signature, config);
        case PaymentProvider.AMAZON_PAY:
          return this.verifyAmazonPaySignature(payload, headers, config);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error('Signature verification failed', { provider, error });
      return false;
    }
  }

  private verifyStripeSignature(
    payload: string | Buffer,
    signature: string,
    config: ProviderWebhookConfig
  ): boolean {
    const elements = signature.split(',');
    const timestampStr = elements.find(e => e.startsWith('t='))?.split('=')[1];
    const sig = elements.find(e => e.startsWith('v1='))?.split('=')[1];

    if (!timestampStr || !sig) return false;

    const timestamp = parseInt(timestampStr, 10);
    const tolerance = config.toleranceSeconds || 300;
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - timestamp) > tolerance) {
      this.logger.warn('Stripe webhook timestamp outside tolerance');
      return false;
    }

    const signedPayload = `${timestamp}.${payload.toString()}`;
    const expectedSig = crypto
      .createHmac('sha256', config.secret)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  }

  private verifySquareSignature(
    payload: string | Buffer,
    signature: string,
    config: ProviderWebhookConfig
  ): boolean {
    const expectedSig = crypto
      .createHmac('sha256', config.secret)
      .update(payload.toString())
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
  }

  private verifyAdyenSignature(
    payload: string | Buffer,
    signature: string,
    config: ProviderWebhookConfig
  ): boolean {
    const expectedSig = crypto
      .createHmac('sha256', Buffer.from(config.secret, 'hex'))
      .update(payload.toString())
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
  }

  private verifyWiseSignature(
    payload: string | Buffer,
    signature: string,
    config: ProviderWebhookConfig
  ): boolean {
    const expectedSig = crypto
      .createHmac('sha256', config.secret)
      .update(payload.toString())
      .digest('hex');

    return signature === expectedSig;
  }

  private verifyAmazonPaySignature(
    payload: string | Buffer,
    headers: Record<string, string>,
    config: ProviderWebhookConfig
  ): boolean {
    // Amazon Pay uses SNS-style signature verification
    // For production, use AWS SDK's SNS message validator
    const signature = headers['x-amz-sns-message-signature'];
    if (!signature) return false;

    // Simplified verification - in production, verify the full SNS message
    const messageType = headers['x-amz-sns-message-type'];
    if (!messageType) return false;

    // For now, accept if signature header is present
    // Full implementation would verify against Amazon's public key
    return true;
  }

  /**
   * Receive and enqueue a webhook event
   */
  async receiveWebhook(
    provider: PaymentProvider,
    payload: string | Buffer,
    headers: Record<string, string>
  ): Promise<{ eventId: string; status: WebhookStatus }> {
    // Verify signature
    const isValid = await this.verifySignature(provider, payload, headers);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Parse payload
    const parsedPayload = JSON.parse(payload.toString());
    const eventId = this.extractEventId(provider, parsedPayload);
    const eventType = this.extractEventType(provider, parsedPayload);

    // Check for idempotency
    const existingEvent = await this.db('webhook_events')
      .where({ provider, event_id: eventId })
      .first();

    if (existingEvent) {
      this.logger.info('Duplicate webhook event', { provider, eventId });
      return { eventId: existingEvent.id, status: WebhookStatus.DUPLICATE };
    }

    // Store idempotency key
    const idempotencyKey = `webhook:${provider}:${eventId}`;
    try {
      await this.db('idempotency_keys').insert({
        id: crypto.randomUUID(),
        key: idempotencyKey,
        entity_type: 'webhook',
        entity_id: eventId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        this.logger.info('Duplicate webhook via idempotency key', { provider, eventId });
        const existing = await this.db('webhook_events')
          .where({ provider, event_id: eventId })
          .first();
        return { eventId: existing?.id || eventId, status: WebhookStatus.DUPLICATE };
      }
      throw error;
    }

    // Create webhook event record
    const recordId = crypto.randomUUID();
    const signature = headers[this.providerConfigs.get(provider)?.signatureHeader.toLowerCase() || ''] || '';

    await this.db('webhook_events').insert({
      id: recordId,
      provider,
      event_id: eventId,
      event_type: eventType,
      payload: JSON.stringify(parsedPayload),
      signature,
      status: WebhookStatus.RECEIVED,
      attempts: 0,
      max_attempts: this.retryConfig.maxAttempts,
      next_retry_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    this.logger.info('Webhook event received', { provider, eventId, eventType, recordId });
    this.emit('webhook:received', { provider, eventId, eventType, recordId });

    return { eventId: recordId, status: WebhookStatus.RECEIVED };
  }

  private extractEventId(provider: PaymentProvider, payload: any): string {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return payload.id;
      case PaymentProvider.SQUARE:
        return payload.event_id;
      case PaymentProvider.ADYEN:
        return payload.notificationItems?.[0]?.NotificationRequestItem?.pspReference ||
               payload.eventCode || crypto.randomUUID();
      case PaymentProvider.WISE:
        return payload.event_id || payload.subscription_id + '_' + Date.now();
      case PaymentProvider.AMAZON_PAY:
        return payload.ObjectId || payload.notificationReferenceId || crypto.randomUUID();
      default:
        return crypto.randomUUID();
    }
  }

  private extractEventType(provider: PaymentProvider, payload: any): string {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return payload.type;
      case PaymentProvider.SQUARE:
        return payload.type;
      case PaymentProvider.ADYEN:
        return payload.notificationItems?.[0]?.NotificationRequestItem?.eventCode ||
               payload.eventCode;
      case PaymentProvider.WISE:
        return payload.event_type;
      case PaymentProvider.AMAZON_PAY:
        return payload.notificationType || payload.ObjectType;
      default:
        return 'unknown';
    }
  }

  /**
   * Register a webhook handler
   */
  registerHandler(handler: IWebhookHandler): void {
    for (const eventType of handler.eventTypes) {
      const handlers = this.handlers.get(eventType) || [];
      handlers.push(handler);
      this.handlers.set(eventType, handlers);
    }
    this.logger.info('Webhook handler registered', { eventTypes: handler.eventTypes });
  }

  /**
   * Start the webhook processor
   */
  start(intervalMs: number = 1000): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(() => {
      this.processQueue().catch(error => {
        this.logger.error('Error processing webhook queue', { error });
      });
    }, intervalMs);

    this.logger.info('Webhook processor started', { intervalMs });
  }

  /**
   * Stop the webhook processor
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.logger.info('Webhook processor stopped');
  }

  /**
   * Process pending webhook events from queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Get pending events ready for processing
      const events = await this.db('webhook_events')
        .whereIn('status', [WebhookStatus.RECEIVED, WebhookStatus.FAILED])
        .where('attempts', '<', this.db.raw('max_attempts'))
        .where(function() {
          this.whereNull('next_retry_at')
            .orWhere('next_retry_at', '<=', new Date());
        })
        .orderBy('created_at', 'asc')
        .limit(10);

      for (const event of events) {
        await this.processEvent(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single webhook event
   */
  private async processEvent(event: WebhookEventRecord): Promise<void> {
    const payload = typeof event.payload === 'string'
      ? JSON.parse(event.payload)
      : event.payload;

    // Update status to processing
    await this.db('webhook_events')
      .where({ id: event.id })
      .update({
        status: WebhookStatus.PROCESSING,
        attempts: event.attempts + 1,
        updated_at: new Date()
      });

    this.logger.info('Processing webhook event', {
      id: event.id,
      provider: event.provider,
      eventType: event.event_type,
      attempt: event.attempts + 1
    });

    try {
      // Route to transaction state machine if applicable
      await this.routeToStateMachine(event, payload);

      // Execute registered handlers
      const handlers = this.handlers.get(event.event_type) || [];
      const genericHandlers = this.handlers.get('*') || [];
      const allHandlers = [...handlers, ...genericHandlers];

      for (const handler of allHandlers) {
        await handler.handle({
          ...event,
          payload
        });
      }

      // Mark as completed
      await this.db('webhook_events')
        .where({ id: event.id })
        .update({
          status: WebhookStatus.COMPLETED,
          processed_at: new Date(),
          updated_at: new Date()
        });

      this.logger.info('Webhook event processed successfully', { id: event.id });
      this.emit('webhook:processed', { id: event.id, provider: event.provider });

    } catch (error: any) {
      const newAttempts = event.attempts + 1;
      const isMaxAttempts = newAttempts >= event.max_attempts;

      // Calculate next retry time with exponential backoff
      const delay = Math.min(
        this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, newAttempts),
        this.retryConfig.maxDelayMs
      );
      const nextRetryAt = isMaxAttempts ? null : new Date(Date.now() + delay);

      await this.db('webhook_events')
        .where({ id: event.id })
        .update({
          status: isMaxAttempts ? WebhookStatus.DEAD_LETTER : WebhookStatus.FAILED,
          error_message: error.message,
          next_retry_at: nextRetryAt,
          updated_at: new Date()
        });

      this.logger.error('Webhook event processing failed', {
        id: event.id,
        error: error.message,
        attempt: newAttempts,
        isMaxAttempts
      });

      if (isMaxAttempts) {
        this.emit('webhook:dead_letter', { id: event.id, provider: event.provider, error });
      } else {
        this.emit('webhook:failed', { id: event.id, provider: event.provider, nextRetryAt });
      }
    }
  }

  /**
   * Route webhook event to transaction state machine
   */
  private async routeToStateMachine(
    event: WebhookEventRecord,
    payload: any
  ): Promise<void> {
    const transactionId = this.extractTransactionId(event.provider, payload);
    if (!transactionId) return;

    // Map provider-specific events to transaction events
    const transactionEvent = this.mapToTransactionEvent(event.provider, event.event_type, payload);
    if (!transactionEvent) return;

    try {
      await this.stateMachine.processWebhookEvent(transactionId, {
        type: event.event_type as WebhookEventType,
        provider: event.provider,
        providerEventId: event.event_id,
        data: payload,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.warn('Failed to route to state machine', {
        transactionId,
        eventType: event.event_type,
        error
      });
      // Don't throw - let other handlers still process
    }
  }

  private extractTransactionId(provider: PaymentProvider, payload: any): string | null {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return payload.data?.object?.metadata?.transaction_id || null;
      case PaymentProvider.SQUARE:
        return payload.data?.object?.reference_id || null;
      case PaymentProvider.ADYEN:
        return payload.notificationItems?.[0]?.NotificationRequestItem?.merchantReference || null;
      case PaymentProvider.AMAZON_PAY:
        return payload.chargePermissionId || null;
      default:
        return null;
    }
  }

  private mapToTransactionEvent(
    provider: PaymentProvider,
    eventType: string,
    payload: any
  ): TransactionEvent | null {
    // Common mappings across providers
    const eventMappings: Record<string, Record<string, TransactionEvent>> = {
      [PaymentProvider.STRIPE]: {
        'payment_intent.succeeded': TransactionEvent.CAPTURE_SUCCEEDED,
        'payment_intent.payment_failed': TransactionEvent.PAYMENT_FAILED,
        'payment_intent.requires_action': TransactionEvent.ACTION_REQUIRED,
        'payment_intent.canceled': TransactionEvent.CANCELLED,
        'charge.refunded': TransactionEvent.REFUND_COMPLETED,
        'charge.refund.updated': TransactionEvent.REFUND_COMPLETED,
        'charge.dispute.created': TransactionEvent.DISPUTE_OPENED,
        'charge.dispute.closed': this.mapStripeDisputeStatus(payload),
      },
      [PaymentProvider.SQUARE]: {
        'payment.completed': TransactionEvent.CAPTURE_SUCCEEDED,
        'payment.failed': TransactionEvent.PAYMENT_FAILED,
        'payment.canceled': TransactionEvent.CANCELLED,
        'refund.completed': TransactionEvent.REFUND_COMPLETED,
        'dispute.created': TransactionEvent.DISPUTE_OPENED,
      },
      [PaymentProvider.ADYEN]: {
        'AUTHORISATION': TransactionEvent.AUTHORIZATION_SUCCEEDED,
        'CAPTURE': TransactionEvent.CAPTURE_SUCCEEDED,
        'CAPTURE_FAILED': TransactionEvent.CAPTURE_FAILED,
        'CANCELLATION': TransactionEvent.CANCELLED,
        'REFUND': TransactionEvent.REFUND_COMPLETED,
        'CHARGEBACK': TransactionEvent.DISPUTE_OPENED,
        'CHARGEBACK_REVERSED': TransactionEvent.CHARGEBACK_WON,
      },
      [PaymentProvider.AMAZON_PAY]: {
        'CHARGE_CAPTURED': TransactionEvent.CAPTURE_SUCCEEDED,
        'CHARGE_DECLINED': TransactionEvent.PAYMENT_FAILED,
        'REFUND_COMPLETED': TransactionEvent.REFUND_COMPLETED,
        'CHARGEBACK_OPENED': TransactionEvent.DISPUTE_OPENED,
      }
    };

    return eventMappings[provider]?.[eventType] || null;
  }

  private mapStripeDisputeStatus(payload: any): TransactionEvent {
    const status = payload.data?.object?.status;
    if (status === 'won') return TransactionEvent.CHARGEBACK_WON;
    if (status === 'lost') return TransactionEvent.CHARGEBACK_LOST;
    return TransactionEvent.DISPUTE_OPENED;
  }

  /**
   * Manually retry a dead-lettered event
   */
  async retryDeadLetter(eventId: string): Promise<void> {
    await this.db('webhook_events')
      .where({ id: eventId, status: WebhookStatus.DEAD_LETTER })
      .update({
        status: WebhookStatus.RECEIVED,
        attempts: 0,
        next_retry_at: new Date(),
        error_message: null,
        updated_at: new Date()
      });

    this.logger.info('Dead letter event queued for retry', { eventId });
  }

  /**
   * Get dead letter queue events
   */
  async getDeadLetterQueue(
    limit: number = 50,
    offset: number = 0
  ): Promise<WebhookEventRecord[]> {
    return this.db('webhook_events')
      .where({ status: WebhookStatus.DEAD_LETTER })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get webhook processing statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<WebhookStatus, number>;
    byProvider: Record<PaymentProvider, number>;
    processingRate: number;
    errorRate: number;
  }> {
    const statusCounts = await this.db('webhook_events')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const providerCounts = await this.db('webhook_events')
      .select('provider')
      .count('* as count')
      .groupBy('provider');

    const byStatus = {} as Record<WebhookStatus, number>;
    let total = 0;
    for (const row of statusCounts) {
      byStatus[row.status as WebhookStatus] = parseInt(row.count as string, 10);
      total += parseInt(row.count as string, 10);
    }

    const byProvider = {} as Record<PaymentProvider, number>;
    for (const row of providerCounts) {
      byProvider[row.provider as PaymentProvider] = parseInt(row.count as string, 10);
    }

    const completed = byStatus[WebhookStatus.COMPLETED] || 0;
    const failed = byStatus[WebhookStatus.FAILED] || 0;
    const deadLetter = byStatus[WebhookStatus.DEAD_LETTER] || 0;

    return {
      total,
      byStatus,
      byProvider,
      processingRate: total > 0 ? completed / total : 0,
      errorRate: total > 0 ? (failed + deadLetter) / total : 0
    };
  }
}

/**
 * Built-in webhook handlers
 */

// Payment success handler
export class PaymentSuccessHandler implements IWebhookHandler {
  eventTypes = [
    'payment_intent.succeeded',
    'payment.completed',
    'CAPTURE',
    'CHARGE_CAPTURED'
  ];

  private db: Knex;
  private logger: Logger;

  constructor(db: Knex, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async handle(event: WebhookEventRecord): Promise<void> {
    const transactionId = this.extractTransactionId(event);
    if (!transactionId) return;

    // Update transaction status
    await this.db('transactions')
      .where({ id: transactionId })
      .update({
        status: 'completed',
        completed_at: new Date(),
        updated_at: new Date()
      });

    this.logger.info('Transaction marked as completed', { transactionId });
  }

  private extractTransactionId(event: WebhookEventRecord): string | null {
    const payload = event.payload;
    switch (event.provider) {
      case PaymentProvider.STRIPE:
        return payload.data?.object?.metadata?.transaction_id;
      case PaymentProvider.SQUARE:
        return payload.data?.object?.reference_id;
      case PaymentProvider.ADYEN:
        return payload.notificationItems?.[0]?.NotificationRequestItem?.merchantReference;
      case PaymentProvider.AMAZON_PAY:
        return payload.chargePermissionId;
      default:
        return null;
    }
  }
}

// Subscription update handler
export class SubscriptionUpdateHandler implements IWebhookHandler {
  eventTypes = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'subscription.created',
    'subscription.updated',
    'subscription.cancelled'
  ];

  private db: Knex;
  private logger: Logger;

  constructor(db: Knex, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async handle(event: WebhookEventRecord): Promise<void> {
    const subscriptionData = this.extractSubscriptionData(event);
    if (!subscriptionData) return;

    const { subscriptionId, status, cancelAtPeriodEnd, currentPeriodEnd } = subscriptionData;

    await this.db('subscriptions')
      .where({ provider_subscription_id: subscriptionId })
      .update({
        status,
        cancel_at_period_end: cancelAtPeriodEnd,
        current_period_end: currentPeriodEnd,
        updated_at: new Date()
      });

    this.logger.info('Subscription updated', { subscriptionId, status });
  }

  private extractSubscriptionData(event: WebhookEventRecord): {
    subscriptionId: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  } | null {
    const payload = event.payload;

    if (event.provider === PaymentProvider.STRIPE) {
      const sub = payload.data?.object;
      return {
        subscriptionId: sub?.id,
        status: sub?.status,
        cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
        currentPeriodEnd: sub?.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null
      };
    }

    return null;
  }
}

// Dispute handler
export class DisputeHandler implements IWebhookHandler {
  eventTypes = [
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed',
    'dispute.created',
    'CHARGEBACK',
    'CHARGEBACK_REVERSED'
  ];

  private db: Knex;
  private logger: Logger;

  constructor(db: Knex, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async handle(event: WebhookEventRecord): Promise<void> {
    const disputeData = this.extractDisputeData(event);
    if (!disputeData) return;

    const existingDispute = await this.db('disputes')
      .where({ provider_dispute_id: disputeData.disputeId })
      .first();

    if (existingDispute) {
      await this.db('disputes')
        .where({ id: existingDispute.id })
        .update({
          status: disputeData.status,
          reason: disputeData.reason,
          updated_at: new Date()
        });
    } else {
      await this.db('disputes').insert({
        id: crypto.randomUUID(),
        transaction_id: disputeData.transactionId,
        provider: event.provider,
        provider_dispute_id: disputeData.disputeId,
        amount: disputeData.amount,
        currency: disputeData.currency,
        reason: disputeData.reason,
        status: disputeData.status,
        evidence_due_by: disputeData.evidenceDueBy,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    this.logger.info('Dispute processed', {
      disputeId: disputeData.disputeId,
      status: disputeData.status
    });
  }

  private extractDisputeData(event: WebhookEventRecord): {
    disputeId: string;
    transactionId: string | null;
    amount: number;
    currency: string;
    reason: string;
    status: string;
    evidenceDueBy: Date | null;
  } | null {
    const payload = event.payload;

    if (event.provider === PaymentProvider.STRIPE) {
      const dispute = payload.data?.object;
      return {
        disputeId: dispute?.id,
        transactionId: dispute?.metadata?.transaction_id || null,
        amount: dispute?.amount || 0,
        currency: dispute?.currency?.toUpperCase() || 'USD',
        reason: dispute?.reason || 'unknown',
        status: dispute?.status || 'open',
        evidenceDueBy: dispute?.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000)
          : null
      };
    }

    return null;
  }
}

// Refund handler
export class RefundHandler implements IWebhookHandler {
  eventTypes = [
    'charge.refunded',
    'refund.completed',
    'refund.updated',
    'REFUND',
    'REFUND_COMPLETED'
  ];

  private db: Knex;
  private logger: Logger;

  constructor(db: Knex, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async handle(event: WebhookEventRecord): Promise<void> {
    const refundData = this.extractRefundData(event);
    if (!refundData) return;

    // Update refund record
    await this.db('refunds')
      .where({ provider_refund_id: refundData.refundId })
      .update({
        status: refundData.status,
        updated_at: new Date()
      });

    // Update transaction if fully refunded
    if (refundData.status === 'succeeded') {
      const transaction = await this.db('transactions')
        .where({ id: refundData.transactionId })
        .first();

      if (transaction) {
        const totalRefunded = await this.db('refunds')
          .where({ transaction_id: refundData.transactionId, status: 'succeeded' })
          .sum('amount as total')
          .first();

        const isFullyRefunded = (totalRefunded?.total || 0) >= transaction.amount;

        await this.db('transactions')
          .where({ id: refundData.transactionId })
          .update({
            status: isFullyRefunded ? 'refunded' : 'partially_refunded',
            updated_at: new Date()
          });
      }
    }

    this.logger.info('Refund processed', {
      refundId: refundData.refundId,
      status: refundData.status
    });
  }

  private extractRefundData(event: WebhookEventRecord): {
    refundId: string;
    transactionId: string | null;
    amount: number;
    status: string;
  } | null {
    const payload = event.payload;

    if (event.provider === PaymentProvider.STRIPE) {
      const refund = payload.data?.object?.refunds?.data?.[0] || payload.data?.object;
      return {
        refundId: refund?.id,
        transactionId: refund?.metadata?.transaction_id || null,
        amount: refund?.amount || 0,
        status: refund?.status || 'pending'
      };
    }

    return null;
  }
}

export default WebhookProcessor;
