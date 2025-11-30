/**
 * Payment Controller
 *
 * Unified API controller for all payment operations
 * Handles requests and delegates to appropriate services
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Knex } from 'knex';
import { Logger } from '../../../utils/logger';
import { PaymentRouter } from '../PaymentRouter';
import { TransactionStateMachine, TransactionState, TransactionEvent } from '../TransactionStateMachine';
import {
  PaymentProvider,
  PaymentIntent,
  PaymentMethod,
  Subscription,
  CheckoutSession,
  IPaymentProvider,
  ICheckoutSessionProvider
} from '../types';
import { WiseProvider, WiseQuote, WiseRecipient, WiseTransfer } from '../providers/WiseProvider';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class PaymentController {
  private db: Knex;
  private logger: Logger;
  private paymentRouter: PaymentRouter;
  private stateMachine: TransactionStateMachine;
  private wiseProvider?: WiseProvider;

  constructor(
    db: Knex,
    logger: Logger,
    paymentRouter: PaymentRouter,
    stateMachine: TransactionStateMachine,
    wiseProvider?: WiseProvider
  ) {
    this.db = db;
    this.logger = logger;
    this.paymentRouter = paymentRouter;
    this.stateMachine = stateMachine;
    this.wiseProvider = wiseProvider;
  }

  /**
   * Create a payment intent with intelligent routing
   * POST /api/payments/intents
   */
  async createPaymentIntent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        amount,
        currency,
        paymentMethodId,
        description,
        metadata,
        preferredProvider
      } = req.body;

      if (!amount || !currency) {
        res.status(400).json({ error: 'Amount and currency are required' });
        return;
      }

      // Create transaction record
      const transactionId = crypto.randomUUID();
      await this.db('transactions').insert({
        id: transactionId,
        user_id: userId,
        type: 'payment',
        amount,
        currency: currency.toUpperCase(),
        status: 'pending',
        metadata: JSON.stringify(metadata || {}),
        created_at: new Date(),
        updated_at: new Date()
      });

      // Initialize state machine
      const transaction = await this.db('transactions').where({ id: transactionId }).first();
      await this.stateMachine.transition(transaction, TransactionEvent.CREATED);

      // Select processor and create payment intent
      const context = {
        amount,
        currency: currency.toUpperCase(),
        country: metadata?.country || 'US',
        paymentMethodType: metadata?.paymentMethodType || 'card',
        isRecurring: false,
        metadata: { ...metadata, transaction_id: transactionId }
      };

      const result = await this.paymentRouter.executeWithFailover(
        async (provider) => {
          // Get or create customer
          let customerId = await this.getProviderCustomerId(userId, provider.provider);
          if (!customerId) {
            const customer = await provider.createCustomer({
              email: req.user?.email || '',
              metadata: { user_id: userId }
            });
            customerId = customer.id;
            await this.saveProviderCustomerId(userId, provider.provider, customerId);
          }

          return provider.createPaymentIntent({
            amount,
            currency: currency.toUpperCase(),
            customerId,
            paymentMethodId,
            description,
            metadata: { ...metadata, transaction_id: transactionId },
            captureMethod: 'automatic'
          });
        },
        context
      );

      // Update transaction with provider info
      await this.db('transactions')
        .where({ id: transactionId })
        .update({
          provider: result.processor,
          provider_transaction_id: result.result.id,
          updated_at: new Date()
        });

      // Transition state based on result
      const updatedTransaction = await this.db('transactions').where({ id: transactionId }).first();
      if (result.result.status === 'requires_action') {
        await this.stateMachine.transition(updatedTransaction, TransactionEvent.ACTION_REQUIRED);
      } else if (result.result.status === 'processing') {
        await this.stateMachine.transition(updatedTransaction, TransactionEvent.SUBMITTED);
      }

      res.status(201).json({
        transactionId,
        paymentIntent: result.result,
        provider: result.processor,
        usedFallback: result.usedFallback
      });
    } catch (error: any) {
      this.logger.error('Create payment intent failed', { error: error.message });
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }

  /**
   * Confirm a payment intent
   * POST /api/payments/intents/:intentId/confirm
   */
  async confirmPaymentIntent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { intentId } = req.params;
      const { paymentMethodId } = req.body;

      const transaction = await this.db('transactions')
        .where({ provider_transaction_id: intentId })
        .first();

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      if (transaction.user_id !== req.user?.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const provider = await this.paymentRouter.getProvider(transaction.provider);
      const result = await provider.confirmPaymentIntent(intentId, paymentMethodId);

      // Update state
      if (result.status === 'succeeded') {
        await this.stateMachine.transition(transaction, TransactionEvent.CAPTURE_SUCCEEDED);
      } else if (result.status === 'requires_action') {
        await this.stateMachine.transition(transaction, TransactionEvent.ACTION_REQUIRED);
      }

      res.json({ paymentIntent: result });
    } catch (error: any) {
      this.logger.error('Confirm payment intent failed', { error: error.message });
      res.status(500).json({ error: 'Failed to confirm payment intent' });
    }
  }

  /**
   * Cancel a payment intent
   * POST /api/payments/intents/:intentId/cancel
   */
  async cancelPaymentIntent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { intentId } = req.params;

      const transaction = await this.db('transactions')
        .where({ provider_transaction_id: intentId })
        .first();

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      if (transaction.user_id !== req.user?.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const provider = await this.paymentRouter.getProvider(transaction.provider);
      const result = await provider.cancelPaymentIntent(intentId);

      await this.stateMachine.transition(transaction, TransactionEvent.CANCELLED);

      res.json({ paymentIntent: result });
    } catch (error: any) {
      this.logger.error('Cancel payment intent failed', { error: error.message });
      res.status(500).json({ error: 'Failed to cancel payment intent' });
    }
  }

  /**
   * Create a checkout session
   * POST /api/payments/checkout
   */
  async createCheckoutSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        lineItems,
        successUrl,
        cancelUrl,
        mode,
        metadata,
        preferredProvider
      } = req.body;

      if (!lineItems || !successUrl || !cancelUrl) {
        res.status(400).json({ error: 'lineItems, successUrl, and cancelUrl are required' });
        return;
      }

      // Calculate total amount
      const totalAmount = lineItems.reduce(
        (sum: number, item: any) => sum + item.amount * item.quantity,
        0
      );

      // Create transaction record
      const transactionId = crypto.randomUUID();
      await this.db('transactions').insert({
        id: transactionId,
        user_id: userId,
        type: mode === 'subscription' ? 'subscription' : 'payment',
        amount: totalAmount,
        currency: lineItems[0]?.currency?.toUpperCase() || 'USD',
        status: 'pending',
        metadata: JSON.stringify({ ...metadata, line_items: lineItems }),
        created_at: new Date(),
        updated_at: new Date()
      });

      // Select provider (checkout sessions need specific provider support)
      const providers = preferredProvider
        ? [preferredProvider]
        : [PaymentProvider.STRIPE, PaymentProvider.SQUARE, PaymentProvider.ADYEN, PaymentProvider.AMAZON_PAY];

      let checkoutSession: CheckoutSession | null = null;
      let usedProvider: PaymentProvider | null = null;

      for (const providerName of providers) {
        try {
          const provider = await this.paymentRouter.getProvider(providerName);
          if (!this.isCheckoutSessionProvider(provider)) continue;

          const customerId = await this.getProviderCustomerId(userId, providerName);

          checkoutSession = await provider.createCheckoutSession({
            lineItems,
            successUrl: `${successUrl}?transaction_id=${transactionId}`,
            cancelUrl,
            customerId: customerId || undefined,
            mode: mode || 'payment',
            metadata: { ...metadata, transaction_id: transactionId }
          });

          usedProvider = providerName;
          break;
        } catch (error) {
          this.logger.warn(`Checkout session failed with ${providerName}`, { error });
          continue;
        }
      }

      if (!checkoutSession || !usedProvider) {
        res.status(500).json({ error: 'No available provider for checkout session' });
        return;
      }

      // Update transaction
      await this.db('transactions')
        .where({ id: transactionId })
        .update({
          provider: usedProvider,
          provider_transaction_id: checkoutSession.id,
          updated_at: new Date()
        });

      res.status(201).json({
        transactionId,
        checkoutSession,
        provider: usedProvider
      });
    } catch (error: any) {
      this.logger.error('Create checkout session failed', { error: error.message });
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }

  /**
   * Create a subscription
   * POST /api/payments/subscriptions
   */
  async createSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        priceId,
        paymentMethodId,
        metadata,
        trialPeriodDays,
        preferredProvider
      } = req.body;

      if (!priceId) {
        res.status(400).json({ error: 'priceId is required' });
        return;
      }

      // Get price details
      const price = await this.db('prices').where({ id: priceId }).first();
      if (!price) {
        res.status(404).json({ error: 'Price not found' });
        return;
      }

      // Select provider
      const providerName = preferredProvider || PaymentProvider.STRIPE;
      const provider = await this.paymentRouter.getProvider(providerName);

      // Get or create customer
      let customerId = await this.getProviderCustomerId(userId, providerName);
      if (!customerId) {
        const customer = await provider.createCustomer({
          email: req.user?.email || '',
          metadata: { user_id: userId }
        });
        customerId = customer.id;
        await this.saveProviderCustomerId(userId, providerName, customerId);
      }

      // Create subscription
      const subscription = await provider.createSubscription({
        customerId,
        priceId: price.provider_price_id || priceId,
        paymentMethodId,
        metadata: { ...metadata, user_id: userId },
        trialPeriodDays
      });

      // Save subscription record
      await this.db('subscriptions').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        provider: providerName,
        provider_subscription_id: subscription.id,
        provider_customer_id: customerId,
        plan_id: price.plan_id,
        price_id: priceId,
        status: subscription.status,
        current_period_start: subscription.currentPeriodStart,
        current_period_end: subscription.currentPeriodEnd,
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        created_at: new Date(),
        updated_at: new Date()
      });

      res.status(201).json({
        subscription,
        provider: providerName
      });
    } catch (error: any) {
      this.logger.error('Create subscription failed', { error: error.message });
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }

  /**
   * Cancel a subscription
   * POST /api/payments/subscriptions/:subscriptionId/cancel
   */
  async cancelSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { immediately } = req.body;

      const subscription = await this.db('subscriptions')
        .where({ id: subscriptionId })
        .first();

      if (!subscription) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      if (subscription.user_id !== req.user?.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const provider = await this.paymentRouter.getProvider(subscription.provider);
      const result = await provider.cancelSubscription(
        subscription.provider_subscription_id,
        immediately
      );

      // Update local record
      await this.db('subscriptions')
        .where({ id: subscriptionId })
        .update({
          status: immediately ? 'canceled' : subscription.status,
          cancel_at_period_end: !immediately,
          canceled_at: immediately ? new Date() : null,
          updated_at: new Date()
        });

      res.json({ subscription: result });
    } catch (error: any) {
      this.logger.error('Cancel subscription failed', { error: error.message });
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }

  /**
   * Get user's subscriptions
   * GET /api/payments/subscriptions
   */
  async getSubscriptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const subscriptions = await this.db('subscriptions')
        .where({ user_id: userId })
        .whereNot({ status: 'canceled' })
        .orderBy('created_at', 'desc');

      res.json({ subscriptions });
    } catch (error: any) {
      this.logger.error('Get subscriptions failed', { error: error.message });
      res.status(500).json({ error: 'Failed to get subscriptions' });
    }
  }

  /**
   * Create a refund
   * POST /api/payments/refunds
   */
  async createRefund(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { transactionId, amount, reason } = req.body;

      if (!transactionId) {
        res.status(400).json({ error: 'transactionId is required' });
        return;
      }

      const transaction = await this.db('transactions')
        .where({ id: transactionId })
        .first();

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      // Only allow refunds on completed transactions
      if (transaction.status !== 'completed') {
        res.status(400).json({ error: 'Can only refund completed transactions' });
        return;
      }

      const provider = await this.paymentRouter.getProvider(transaction.provider);

      // Create refund
      const refund = await provider.refund({
        paymentIntentId: transaction.provider_transaction_id,
        amount: amount || transaction.amount,
        reason
      });

      // Save refund record
      const refundId = crypto.randomUUID();
      await this.db('refunds').insert({
        id: refundId,
        transaction_id: transactionId,
        provider: transaction.provider,
        provider_refund_id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        reason: reason || null,
        status: refund.status,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Update transaction state
      const refundAmount = amount || transaction.amount;
      const isFullRefund = refundAmount >= transaction.amount;

      await this.stateMachine.transition(
        transaction,
        TransactionEvent.REFUND_INITIATED,
        {
          metadata: {
            refund_id: refundId,
            refund_amount: refundAmount,
            is_full_refund: isFullRefund
          }
        }
      );

      res.status(201).json({ refund: { id: refundId, ...refund } });
    } catch (error: any) {
      this.logger.error('Create refund failed', { error: error.message });
      res.status(500).json({ error: 'Failed to create refund' });
    }
  }

  /**
   * Get transaction history
   * GET /api/payments/transactions
   */
  async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { limit = 50, offset = 0, status, type } = req.query;

      let query = this.db('transactions')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(Number(limit))
        .offset(Number(offset));

      if (status) {
        query = query.where({ status });
      }

      if (type) {
        query = query.where({ type });
      }

      const transactions = await query;
      const total = await this.db('transactions')
        .where({ user_id: userId })
        .count('* as count')
        .first();

      res.json({
        transactions,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: Number(total?.count || 0)
        }
      });
    } catch (error: any) {
      this.logger.error('Get transactions failed', { error: error.message });
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  }

  /**
   * Get a specific transaction
   * GET /api/payments/transactions/:transactionId
   */
  async getTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const userId = req.user?.id;

      const transaction = await this.db('transactions')
        .where({ id: transactionId })
        .first();

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      if (transaction.user_id !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Get state history
      const stateHistory = await this.db('transaction_state_history')
        .where({ transaction_id: transactionId })
        .orderBy('transitioned_at', 'asc');

      // Get refunds
      const refunds = await this.db('refunds')
        .where({ transaction_id: transactionId });

      res.json({
        transaction,
        stateHistory,
        refunds
      });
    } catch (error: any) {
      this.logger.error('Get transaction failed', { error: error.message });
      res.status(500).json({ error: 'Failed to get transaction' });
    }
  }

  /**
   * Attach a payment method to customer
   * POST /api/payments/methods
   */
  async attachPaymentMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { paymentMethodId, provider = PaymentProvider.STRIPE, setAsDefault } = req.body;

      if (!paymentMethodId) {
        res.status(400).json({ error: 'paymentMethodId is required' });
        return;
      }

      const paymentProvider = await this.paymentRouter.getProvider(provider);

      // Get or create customer
      let customerId = await this.getProviderCustomerId(userId, provider);
      if (!customerId) {
        const customer = await paymentProvider.createCustomer({
          email: req.user?.email || '',
          metadata: { user_id: userId }
        });
        customerId = customer.id;
        await this.saveProviderCustomerId(userId, provider, customerId);
      }

      // Attach payment method
      const paymentMethod = await paymentProvider.attachPaymentMethod(paymentMethodId, customerId);

      // Set as default if requested
      if (setAsDefault) {
        await paymentProvider.updateCustomer(customerId, {
          defaultPaymentMethodId: paymentMethodId
        });
      }

      // Save payment method record
      await this.db('payment_methods').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        provider,
        provider_payment_method_id: paymentMethodId,
        type: paymentMethod.type,
        card_brand: paymentMethod.card?.brand,
        card_last4: paymentMethod.card?.last4,
        card_exp_month: paymentMethod.card?.expMonth,
        card_exp_year: paymentMethod.card?.expYear,
        is_default: setAsDefault || false,
        created_at: new Date(),
        updated_at: new Date()
      });

      res.status(201).json({ paymentMethod });
    } catch (error: any) {
      this.logger.error('Attach payment method failed', { error: error.message });
      res.status(500).json({ error: 'Failed to attach payment method' });
    }
  }

  /**
   * Get user's payment methods
   * GET /api/payments/methods
   */
  async getPaymentMethods(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const paymentMethods = await this.db('payment_methods')
        .where({ user_id: userId })
        .orderBy('is_default', 'desc')
        .orderBy('created_at', 'desc');

      res.json({ paymentMethods });
    } catch (error: any) {
      this.logger.error('Get payment methods failed', { error: error.message });
      res.status(500).json({ error: 'Failed to get payment methods' });
    }
  }

  /**
   * Delete a payment method
   * DELETE /api/payments/methods/:methodId
   */
  async deletePaymentMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { methodId } = req.params;
      const userId = req.user?.id;

      const paymentMethod = await this.db('payment_methods')
        .where({ id: methodId })
        .first();

      if (!paymentMethod) {
        res.status(404).json({ error: 'Payment method not found' });
        return;
      }

      if (paymentMethod.user_id !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const provider = await this.paymentRouter.getProvider(paymentMethod.provider);
      await provider.detachPaymentMethod(paymentMethod.provider_payment_method_id);

      await this.db('payment_methods').where({ id: methodId }).delete();

      res.json({ success: true });
    } catch (error: any) {
      this.logger.error('Delete payment method failed', { error: error.message });
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  }

  // ============== Wise Payout Endpoints ==============

  /**
   * Create a payout quote
   * POST /api/payments/payouts/quote
   */
  async createPayoutQuote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!this.wiseProvider) {
        res.status(503).json({ error: 'Payout service not available' });
        return;
      }

      const { sourceCurrency, targetCurrency, sourceAmount, targetAmount } = req.body;

      if (!sourceCurrency || !targetCurrency || (!sourceAmount && !targetAmount)) {
        res.status(400).json({
          error: 'sourceCurrency, targetCurrency, and either sourceAmount or targetAmount are required'
        });
        return;
      }

      const quote = await this.wiseProvider.createQuote({
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        targetAmount
      });

      res.json({ quote });
    } catch (error: any) {
      this.logger.error('Create payout quote failed', { error: error.message });
      res.status(500).json({ error: 'Failed to create quote' });
    }
  }

  /**
   * Create a payout recipient
   * POST /api/payments/payouts/recipients
   */
  async createPayoutRecipient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!this.wiseProvider) {
        res.status(503).json({ error: 'Payout service not available' });
        return;
      }

      const {
        currency,
        type,
        accountHolderName,
        details,
        email
      } = req.body;

      if (!currency || !type || !accountHolderName || !details) {
        res.status(400).json({
          error: 'currency, type, accountHolderName, and details are required'
        });
        return;
      }

      const recipient = await this.wiseProvider.createRecipient({
        currency,
        type,
        accountHolderName,
        details,
        email
      });

      // Save recipient record
      await this.db('payout_recipients').insert({
        id: crypto.randomUUID(),
        user_id: req.user?.id,
        provider: PaymentProvider.WISE,
        provider_recipient_id: recipient.id,
        name: accountHolderName,
        currency,
        type,
        details: JSON.stringify(details),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });

      res.status(201).json({ recipient });
    } catch (error: any) {
      this.logger.error('Create payout recipient failed', { error: error.message });
      res.status(500).json({ error: 'Failed to create recipient' });
    }
  }

  /**
   * Create a payout transfer
   * POST /api/payments/payouts/transfers
   */
  async createPayoutTransfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!this.wiseProvider) {
        res.status(503).json({ error: 'Payout service not available' });
        return;
      }

      const { quoteId, recipientId, reference } = req.body;

      if (!quoteId || !recipientId) {
        res.status(400).json({ error: 'quoteId and recipientId are required' });
        return;
      }

      const transfer = await this.wiseProvider.createTransfer({
        quoteId,
        recipientId,
        reference
      });

      // Save payout record
      const payoutId = crypto.randomUUID();
      await this.db('payouts').insert({
        id: payoutId,
        user_id: req.user?.id,
        provider: PaymentProvider.WISE,
        provider_transfer_id: transfer.id,
        recipient_id: recipientId,
        amount: transfer.sourceValue,
        currency: transfer.sourceCurrency,
        target_amount: transfer.targetValue,
        target_currency: transfer.targetCurrency,
        status: transfer.status,
        reference,
        created_at: new Date(),
        updated_at: new Date()
      });

      res.status(201).json({ transfer, payoutId });
    } catch (error: any) {
      this.logger.error('Create payout transfer failed', { error: error.message });
      res.status(500).json({ error: 'Failed to create transfer' });
    }
  }

  /**
   * Fund a payout transfer
   * POST /api/payments/payouts/transfers/:transferId/fund
   */
  async fundPayoutTransfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!this.wiseProvider) {
        res.status(503).json({ error: 'Payout service not available' });
        return;
      }

      const { transferId } = req.params;

      const transfer = await this.wiseProvider.fundTransfer(transferId);

      // Update payout status
      await this.db('payouts')
        .where({ provider_transfer_id: transferId })
        .update({
          status: transfer.status,
          updated_at: new Date()
        });

      res.json({ transfer });
    } catch (error: any) {
      this.logger.error('Fund payout transfer failed', { error: error.message });
      res.status(500).json({ error: 'Failed to fund transfer' });
    }
  }

  // ============== Helper Methods ==============

  private async getProviderCustomerId(
    userId: string,
    provider: PaymentProvider
  ): Promise<string | null> {
    const record = await this.db('customer_provider_mappings')
      .where({ user_id: userId, provider })
      .first();
    return record?.provider_customer_id || null;
  }

  private async saveProviderCustomerId(
    userId: string,
    provider: PaymentProvider,
    customerId: string
  ): Promise<void> {
    await this.db('customer_provider_mappings').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      provider,
      provider_customer_id: customerId,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  private isCheckoutSessionProvider(provider: IPaymentProvider): provider is ICheckoutSessionProvider {
    return 'createCheckoutSession' in provider;
  }
}

export default PaymentController;
