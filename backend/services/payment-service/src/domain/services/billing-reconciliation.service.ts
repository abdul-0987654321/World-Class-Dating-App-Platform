import Stripe from 'stripe';

import { NotificationServiceClient } from '../../infrastructure/clients/notification-service.client';
import { db } from '../../infrastructure/database/connection';
import logger from '../../utils/logger';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
});

// ============================================================================
// Types and Interfaces
// ============================================================================

export type DiscrepancyType =
  | 'missing_payment_in_app'
  | 'missing_payment_in_stripe'
  | 'status_mismatch'
  | 'amount_mismatch'
  | 'duplicate_charge'
  | 'failed_renewal_not_reflected'
  | 'subscription_status_mismatch'
  | 'missing_subscription_in_app'
  | 'missing_subscription_in_stripe'
  | 'period_end_mismatch'
  | 'customer_mismatch';

export type DiscrepancySeverity = 'critical' | 'high' | 'medium' | 'low';

export type DiscrepancyStatus = 'open' | 'auto_resolved' | 'manually_resolved' | 'ignored';

export type ResolutionType =
  | 'sync_from_stripe'
  | 'sync_to_stripe'
  | 'create_missing_record'
  | 'update_status'
  | 'refund_duplicate'
  | 'mark_as_failed'
  | 'ignore'
  | 'manual_review';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  status: DiscrepancyStatus;
  userId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  stripeChargeId?: string;
  appRecordId?: string;
  appTableName?: string;
  description: string;
  appData?: Record<string, any>;
  stripeData?: Record<string, any>;
  expectedData?: Record<string, any>;
  amountDifference?: number;
  resolution?: ResolutionType;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

export interface ReconciliationReport {
  id: string;
  runDate: Date;
  dateRange: DateRange;
  status: 'completed' | 'failed' | 'partial';
  summary: ReconciliationSummary;
  discrepancies: Discrepancy[];
  processingTimeMs: number;
  error?: string;
}

export interface ReconciliationSummary {
  totalRecordsChecked: number;
  subscriptionsChecked: number;
  paymentsChecked: number;
  invoicesChecked: number;
  discrepanciesFound: number;
  autoResolvedCount: number;
  manualReviewRequired: number;
  byType: Record<DiscrepancyType, number>;
  bySeverity: Record<DiscrepancySeverity, number>;
  totalAmountDiscrepancy: number;
}

export interface SubscriptionReconciliationResult {
  userId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  appSubscriptionId?: string;
  isReconciled: boolean;
  discrepancies: Discrepancy[];
  stripeData?: Stripe.Subscription;
  appData?: AppSubscriptionRecord;
  autoResolved: boolean;
  actions: string[];
}

export interface PaymentReconciliationResult {
  paymentId: string;
  stripePaymentIntentId?: string;
  isReconciled: boolean;
  discrepancies: Discrepancy[];
  stripeData?: Stripe.PaymentIntent | Stripe.Charge;
  appData?: AppTransactionRecord;
  autoResolved: boolean;
  actions: string[];
}

export interface AppSubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  billing_cycle: string;
  current_period_start: Date | null;
  current_period_end: Date | null;
  canceled_at: Date | null;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AppTransactionRecord {
  id: string;
  user_id: string;
  subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  stripe_charge_id: string | null;
  type: string;
  status: string;
  amount: number;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

interface AlertPayload {
  type: 'billing_reconciliation_alert';
  severity: DiscrepancySeverity;
  title: string;
  message: string;
  discrepancyCount: number;
  criticalCount: number;
  totalAmountAffected: number;
  reportId: string;
  timestamp: Date;
}

// ============================================================================
// Billing Reconciliation Service
// ============================================================================

export class BillingReconciliationService {
  private notificationClient: NotificationServiceClient;
  private alertThresholds = {
    criticalDiscrepancyCount: 5,
    highAmountThreshold: 1000, // $1000
    duplicateChargeThreshold: 3,
  };

  constructor(notificationClient?: NotificationServiceClient) {
    this.notificationClient = notificationClient || new NotificationServiceClient();
  }

  // ==========================================================================
  // Main Reconciliation Methods
  // ==========================================================================

  /**
   * Run daily reconciliation for the previous day
   */
  async runDailyReconciliation(): Promise<ReconciliationReport> {
    const startTime = Date.now();
    const reportId = this.generateReportId();

    // Default to yesterday's date range
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    const dateRange: DateRange = { startDate, endDate };

    logger.info('Starting daily billing reconciliation', {
      reportId,
      dateRange,
    });

    const discrepancies: Discrepancy[] = [];
    let status: 'completed' | 'failed' | 'partial' = 'completed';
    let error: string | undefined;

    const summary: ReconciliationSummary = {
      totalRecordsChecked: 0,
      subscriptionsChecked: 0,
      paymentsChecked: 0,
      invoicesChecked: 0,
      discrepanciesFound: 0,
      autoResolvedCount: 0,
      manualReviewRequired: 0,
      byType: {} as Record<DiscrepancyType, number>,
      bySeverity: {} as Record<DiscrepancySeverity, number>,
      totalAmountDiscrepancy: 0,
    };

    try {
      // 1. Reconcile subscriptions
      const subscriptionDiscrepancies = await this.reconcileAllSubscriptions(dateRange);
      discrepancies.push(...subscriptionDiscrepancies);
      summary.subscriptionsChecked = await this.countSubscriptionsInRange(dateRange);

      // 2. Reconcile payments/transactions
      const paymentDiscrepancies = await this.reconcileAllPayments(dateRange);
      discrepancies.push(...paymentDiscrepancies);
      summary.paymentsChecked = await this.countPaymentsInRange(dateRange);

      // 3. Check for duplicate charges
      const duplicateDiscrepancies = await this.detectDuplicateCharges(dateRange);
      discrepancies.push(...duplicateDiscrepancies);

      // 4. Check for failed renewals not reflected
      const failedRenewalDiscrepancies = await this.detectFailedRenewalsNotReflected(dateRange);
      discrepancies.push(...failedRenewalDiscrepancies);

      // 5. Attempt auto-resolution for applicable discrepancies
      for (const discrepancy of discrepancies) {
        const resolved = await this.attemptAutoResolution(discrepancy);
        if (resolved) {
          discrepancy.status = 'auto_resolved';
          summary.autoResolvedCount++;
        }
      }

      // Calculate summary statistics
      summary.totalRecordsChecked =
        summary.subscriptionsChecked + summary.paymentsChecked + summary.invoicesChecked;
      summary.discrepanciesFound = discrepancies.length;
      summary.manualReviewRequired = discrepancies.filter((d) => d.status === 'open').length;

      // Count by type and severity
      for (const d of discrepancies) {
        summary.byType[d.type] = (summary.byType[d.type] || 0) + 1;
        summary.bySeverity[d.severity] = (summary.bySeverity[d.severity] || 0) + 1;
        if (d.amountDifference) {
          summary.totalAmountDiscrepancy += Math.abs(d.amountDifference);
        }
      }
    } catch (err: any) {
      logger.error('Billing reconciliation failed', { error: err.message, reportId });
      status = 'failed';
      error = err.message;
    }

    const processingTimeMs = Date.now() - startTime;

    const report: ReconciliationReport = {
      id: reportId,
      runDate: new Date(),
      dateRange,
      status,
      summary,
      discrepancies,
      processingTimeMs,
      error,
    };

    // Store report in database
    await this.storeReconciliationReport(report);

    // Send alerts if necessary
    await this.sendAlertsIfNeeded(report);

    logger.info('Billing reconciliation completed', {
      reportId,
      status,
      discrepanciesFound: summary.discrepanciesFound,
      autoResolved: summary.autoResolvedCount,
      manualReview: summary.manualReviewRequired,
      processingTimeMs,
    });

    return report;
  }

  /**
   * Reconcile a specific user's subscription
   */
  async reconcileSubscription(userId: string): Promise<SubscriptionReconciliationResult> {
    logger.info('Reconciling subscription for user', { userId });

    const result: SubscriptionReconciliationResult = {
      userId,
      isReconciled: true,
      discrepancies: [],
      autoResolved: false,
      actions: [],
    };

    try {
      // Get app subscription record
      const appSubscription = await this.getAppSubscription(userId);
      result.appData = appSubscription || undefined;
      result.appSubscriptionId = appSubscription?.id;

      // Get Stripe subscription
      let stripeSubscription: Stripe.Subscription | null = null;

      if (appSubscription?.stripe_subscription_id) {
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(
            appSubscription.stripe_subscription_id
          );
          result.stripeData = stripeSubscription;
          result.stripeSubscriptionId = stripeSubscription.id;
        } catch (err: any) {
          if (err.code === 'resource_missing') {
            // Subscription exists in app but not in Stripe
            result.discrepancies.push(
              this.createDiscrepancy({
                type: 'missing_subscription_in_stripe',
                severity: 'high',
                userId,
                appRecordId: appSubscription.id,
                appTableName: 'user_subscriptions',
                description: `Subscription ${appSubscription.stripe_subscription_id} exists in app but not found in Stripe`,
                appData: appSubscription,
              })
            );
          } else {
            throw err;
          }
        }
      }

      // Check for Stripe subscription by customer ID if we have one
      if (!stripeSubscription && appSubscription?.stripe_customer_id) {
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: appSubscription.stripe_customer_id,
          status: 'all',
          limit: 10,
        });

        if (stripeSubscriptions.data.length > 0) {
          // Found subscription in Stripe but not linked in app
          stripeSubscription = stripeSubscriptions.data[0];
          result.stripeData = stripeSubscription;
          result.stripeSubscriptionId = stripeSubscription.id;

          if (appSubscription.stripe_subscription_id !== stripeSubscription.id) {
            result.discrepancies.push(
              this.createDiscrepancy({
                type: 'customer_mismatch',
                severity: 'medium',
                userId,
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId: appSubscription.stripe_customer_id,
                appRecordId: appSubscription.id,
                appTableName: 'user_subscriptions',
                description: `Stripe subscription ID mismatch. App: ${appSubscription.stripe_subscription_id}, Stripe: ${stripeSubscription.id}`,
                appData: appSubscription,
                stripeData: this.sanitizeStripeData(stripeSubscription),
              })
            );
          }
        }
      }

      // Compare statuses if both exist
      if (appSubscription && stripeSubscription) {
        const statusDiscrepancies = this.compareSubscriptionStatus(
          appSubscription,
          stripeSubscription,
          userId
        );
        result.discrepancies.push(...statusDiscrepancies);
      }

      // Check for missing subscription in app (search by userId in Stripe metadata)
      if (!appSubscription) {
        const customers = await stripe.customers.search({
          query: `metadata['userId']:'${userId}'`,
          limit: 1,
        });

        if (customers.data.length > 0) {
          const stripeSubscriptions = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: 'all',
            limit: 1,
          });

          if (stripeSubscriptions.data.length > 0) {
            stripeSubscription = stripeSubscriptions.data[0];
            result.stripeData = stripeSubscription;
            result.stripeSubscriptionId = stripeSubscription.id;
            result.stripeCustomerId = customers.data[0].id;

            result.discrepancies.push(
              this.createDiscrepancy({
                type: 'missing_subscription_in_app',
                severity: 'high',
                userId,
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId: customers.data[0].id,
                description: `Subscription ${stripeSubscription.id} exists in Stripe but not in app database`,
                stripeData: this.sanitizeStripeData(stripeSubscription),
              })
            );
          }
        }
      }

      // Attempt auto-resolution
      for (const discrepancy of result.discrepancies) {
        const resolved = await this.attemptAutoResolution(discrepancy);
        if (resolved) {
          discrepancy.status = 'auto_resolved';
          result.autoResolved = true;
          result.actions.push(`Auto-resolved: ${discrepancy.type}`);
        }
      }

      result.isReconciled = result.discrepancies.length === 0 || result.autoResolved;
    } catch (err: any) {
      logger.error('Error reconciling subscription', { userId, error: err.message });
      throw err;
    }

    return result;
  }

  /**
   * Reconcile a specific payment
   */
  async reconcilePayment(paymentId: string): Promise<PaymentReconciliationResult> {
    logger.info('Reconciling payment', { paymentId });

    const result: PaymentReconciliationResult = {
      paymentId,
      isReconciled: true,
      discrepancies: [],
      autoResolved: false,
      actions: [],
    };

    try {
      // First try to get app transaction record
      const appTransaction = await this.getAppTransaction(paymentId);
      result.appData = appTransaction || undefined;

      let stripePaymentIntent: Stripe.PaymentIntent | null = null;
      let stripeCharge: Stripe.Charge | null = null;

      // Try to get Stripe data
      if (appTransaction?.stripe_payment_intent_id) {
        try {
          stripePaymentIntent = await stripe.paymentIntents.retrieve(
            appTransaction.stripe_payment_intent_id
          );
          result.stripePaymentIntentId = stripePaymentIntent.id;
          result.stripeData = stripePaymentIntent;
        } catch (err: any) {
          if (err.code === 'resource_missing') {
            result.discrepancies.push(
              this.createDiscrepancy({
                type: 'missing_payment_in_stripe',
                severity: 'high',
                userId: appTransaction.user_id,
                stripePaymentIntentId: appTransaction.stripe_payment_intent_id,
                appRecordId: appTransaction.id,
                appTableName: 'transactions',
                description: `Payment intent ${appTransaction.stripe_payment_intent_id} not found in Stripe`,
                appData: appTransaction,
              })
            );
          } else {
            throw err;
          }
        }
      }

      // Also check by charge ID if available
      if (appTransaction?.stripe_charge_id) {
        try {
          stripeCharge = await stripe.charges.retrieve(appTransaction.stripe_charge_id);
          if (!result.stripeData) {
            result.stripeData = stripeCharge;
          }
        } catch (err: any) {
          logger.warn('Could not retrieve Stripe charge', {
            chargeId: appTransaction.stripe_charge_id,
          });
        }
      }

      // If paymentId looks like a Stripe ID, try direct lookup
      if (paymentId.startsWith('pi_')) {
        try {
          stripePaymentIntent = await stripe.paymentIntents.retrieve(paymentId);
          result.stripePaymentIntentId = stripePaymentIntent.id;
          result.stripeData = stripePaymentIntent;

          // Check if this payment exists in app
          if (!appTransaction) {
            const userId = stripePaymentIntent.metadata?.userId;
            result.discrepancies.push(
              this.createDiscrepancy({
                type: 'missing_payment_in_app',
                severity: 'critical',
                userId,
                stripePaymentIntentId: stripePaymentIntent.id,
                description: `Payment ${stripePaymentIntent.id} exists in Stripe but not in app database`,
                stripeData: this.sanitizeStripeData(stripePaymentIntent),
                amountDifference: stripePaymentIntent.amount / 100,
              })
            );
          }
        } catch (err: any) {
          if (err.code !== 'resource_missing') {
            throw err;
          }
        }
      }

      // Compare amounts and statuses
      if (appTransaction && stripePaymentIntent) {
        const amountDiscrepancies = this.comparePaymentAmounts(appTransaction, stripePaymentIntent);
        result.discrepancies.push(...amountDiscrepancies);

        const statusDiscrepancies = this.comparePaymentStatus(appTransaction, stripePaymentIntent);
        result.discrepancies.push(...statusDiscrepancies);
      }

      // Attempt auto-resolution
      for (const discrepancy of result.discrepancies) {
        const resolved = await this.attemptAutoResolution(discrepancy);
        if (resolved) {
          discrepancy.status = 'auto_resolved';
          result.autoResolved = true;
          result.actions.push(`Auto-resolved: ${discrepancy.type}`);
        }
      }

      result.isReconciled = result.discrepancies.length === 0 || result.autoResolved;
    } catch (err: any) {
      logger.error('Error reconciling payment', { paymentId, error: err.message });
      throw err;
    }

    return result;
  }

  /**
   * Get discrepancies within a date range
   */
  async getDiscrepancies(dateRange: DateRange): Promise<Discrepancy[]> {
    logger.info('Fetching discrepancies', { dateRange });

    try {
      const rows = await db('billing_discrepancies')
        .whereBetween('detected_at', [dateRange.startDate, dateRange.endDate])
        .orderBy('detected_at', 'desc');

      return rows.map((row: any) => ({
        id: row.id,
        type: row.type as DiscrepancyType,
        severity: row.severity as DiscrepancySeverity,
        status: row.status as DiscrepancyStatus,
        userId: row.user_id,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripePaymentIntentId: row.stripe_payment_intent_id,
        stripeInvoiceId: row.stripe_invoice_id,
        stripeChargeId: row.stripe_charge_id,
        appRecordId: row.app_record_id,
        appTableName: row.app_table_name,
        description: row.description,
        appData: row.app_data,
        stripeData: row.stripe_data,
        expectedData: row.expected_data,
        amountDifference: row.amount_difference ? parseFloat(row.amount_difference) : undefined,
        resolution: row.resolution as ResolutionType | undefined,
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        resolvedBy: row.resolved_by,
        resolutionNotes: row.resolution_notes,
        detectedAt: new Date(row.detected_at),
        metadata: row.metadata,
      }));
    } catch (err: any) {
      // If table doesn't exist, return empty array
      if (err.code === '42P01') {
        logger.warn('billing_discrepancies table does not exist yet');
        return [];
      }
      throw err;
    }
  }

  /**
   * Resolve a discrepancy manually
   */
  async resolveDiscrepancy(
    discrepancyId: string,
    resolution: ResolutionType,
    resolvedBy?: string,
    notes?: string
  ): Promise<void> {
    logger.info('Resolving discrepancy', { discrepancyId, resolution, resolvedBy });

    try {
      // Get the discrepancy
      const discrepancy = await db('billing_discrepancies').where({ id: discrepancyId }).first();

      if (!discrepancy) {
        throw new Error(`Discrepancy ${discrepancyId} not found`);
      }

      // Apply resolution based on type
      await this.applyResolution(discrepancy, resolution);

      // Update discrepancy status
      await db('billing_discrepancies').where({ id: discrepancyId }).update({
        status: 'manually_resolved',
        resolution,
        resolved_at: new Date(),
        resolved_by: resolvedBy || 'system',
        resolution_notes: notes,
        updated_at: new Date(),
      });

      logger.info('Discrepancy resolved', { discrepancyId, resolution });
    } catch (err: any) {
      logger.error('Error resolving discrepancy', { discrepancyId, error: err.message });
      throw err;
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private generateReportId(): string {
    return `recon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createDiscrepancy(params: Partial<Discrepancy>): Discrepancy {
    return {
      id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type || 'status_mismatch',
      severity: params.severity || 'medium',
      status: 'open',
      description: params.description || 'Unknown discrepancy',
      detectedAt: new Date(),
      ...params,
    } as Discrepancy;
  }

  private async getAppSubscription(userId: string): Promise<AppSubscriptionRecord | null> {
    const subscription = await db('user_subscriptions')
      .where({ user_id: userId })
      .whereNot({ status: 'incomplete_expired' })
      .orderBy('created_at', 'desc')
      .first();

    return subscription || null;
  }

  private async getAppTransaction(paymentId: string): Promise<AppTransactionRecord | null> {
    // Try different ID types
    let transaction = await db('transactions').where({ id: paymentId }).first();

    if (!transaction) {
      transaction = await db('transactions').where({ stripe_payment_intent_id: paymentId }).first();
    }

    if (!transaction) {
      transaction = await db('transactions').where({ stripe_charge_id: paymentId }).first();
    }

    return transaction || null;
  }

  private compareSubscriptionStatus(
    appSubscription: AppSubscriptionRecord,
    stripeSubscription: Stripe.Subscription,
    userId: string
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Map Stripe status to app status
    const stripeStatusMap: Record<string, string[]> = {
      active: ['active'],
      past_due: ['past_due', 'grace_period'],
      canceled: ['canceled'],
      unpaid: ['unpaid'],
      trialing: ['trialing', 'active'],
      incomplete: ['incomplete', 'pending'],
      incomplete_expired: ['incomplete_expired', 'canceled'],
      paused: ['paused', 'canceled'],
    };

    const expectedStatuses = stripeStatusMap[stripeSubscription.status] || [
      stripeSubscription.status,
    ];
    const appStatus = appSubscription.status.toLowerCase();

    if (!expectedStatuses.includes(appStatus)) {
      discrepancies.push(
        this.createDiscrepancy({
          type: 'subscription_status_mismatch',
          severity: this.getStatusMismatchSeverity(stripeSubscription.status, appStatus),
          userId,
          stripeSubscriptionId: stripeSubscription.id,
          appRecordId: appSubscription.id,
          appTableName: 'user_subscriptions',
          description: `Subscription status mismatch. Stripe: ${stripeSubscription.status}, App: ${appStatus}`,
          appData: { status: appStatus },
          stripeData: { status: stripeSubscription.status },
          expectedData: { status: expectedStatuses },
        })
      );
    }

    // Check period end date
    if (appSubscription.current_period_end && (stripeSubscription as any).current_period_end) {
      const appPeriodEnd = new Date(appSubscription.current_period_end).getTime();
      const stripePeriodEnd = (stripeSubscription as any).current_period_end * 1000;
      const timeDiff = Math.abs(appPeriodEnd - stripePeriodEnd);

      // Allow 1 hour tolerance
      if (timeDiff > 3600000) {
        discrepancies.push(
          this.createDiscrepancy({
            type: 'period_end_mismatch',
            severity: 'medium',
            userId,
            stripeSubscriptionId: stripeSubscription.id,
            appRecordId: appSubscription.id,
            appTableName: 'user_subscriptions',
            description: `Period end mismatch. Stripe: ${new Date(stripePeriodEnd).toISOString()}, App: ${new Date(appPeriodEnd).toISOString()}`,
            appData: { current_period_end: appSubscription.current_period_end },
            stripeData: {
              current_period_end: new Date(stripePeriodEnd).toISOString(),
            },
          })
        );
      }
    }

    // Check cancel_at_period_end flag
    if (appSubscription.cancel_at_period_end !== stripeSubscription.cancel_at_period_end) {
      discrepancies.push(
        this.createDiscrepancy({
          type: 'status_mismatch',
          severity: 'medium',
          userId,
          stripeSubscriptionId: stripeSubscription.id,
          appRecordId: appSubscription.id,
          appTableName: 'user_subscriptions',
          description: `Cancel at period end mismatch. Stripe: ${stripeSubscription.cancel_at_period_end}, App: ${appSubscription.cancel_at_period_end}`,
          appData: { cancel_at_period_end: appSubscription.cancel_at_period_end },
          stripeData: { cancel_at_period_end: stripeSubscription.cancel_at_period_end },
        })
      );
    }

    return discrepancies;
  }

  private comparePaymentAmounts(
    appTransaction: AppTransactionRecord,
    stripePaymentIntent: Stripe.PaymentIntent
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    const appAmount = parseFloat(appTransaction.amount.toString());
    const stripeAmount = stripePaymentIntent.amount / 100; // Convert from cents

    if (Math.abs(appAmount - stripeAmount) > 0.01) {
      discrepancies.push(
        this.createDiscrepancy({
          type: 'amount_mismatch',
          severity: 'critical',
          userId: appTransaction.user_id,
          stripePaymentIntentId: stripePaymentIntent.id,
          appRecordId: appTransaction.id,
          appTableName: 'transactions',
          description: `Payment amount mismatch. Stripe: $${stripeAmount.toFixed(2)}, App: $${appAmount.toFixed(2)}`,
          appData: { amount: appAmount },
          stripeData: { amount: stripeAmount },
          amountDifference: stripeAmount - appAmount,
        })
      );
    }

    return discrepancies;
  }

  private comparePaymentStatus(
    appTransaction: AppTransactionRecord,
    stripePaymentIntent: Stripe.PaymentIntent
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    const stripeStatusMap: Record<string, string[]> = {
      succeeded: ['succeeded', 'completed'],
      processing: ['processing', 'pending'],
      requires_payment_method: ['pending', 'failed'],
      requires_confirmation: ['pending'],
      requires_action: ['pending', 'processing'],
      canceled: ['canceled', 'failed'],
      requires_capture: ['processing'],
    };

    const expectedStatuses = stripeStatusMap[stripePaymentIntent.status] || [
      stripePaymentIntent.status,
    ];
    const appStatus = appTransaction.status.toLowerCase();

    if (!expectedStatuses.includes(appStatus)) {
      discrepancies.push(
        this.createDiscrepancy({
          type: 'status_mismatch',
          severity: 'high',
          userId: appTransaction.user_id,
          stripePaymentIntentId: stripePaymentIntent.id,
          appRecordId: appTransaction.id,
          appTableName: 'transactions',
          description: `Payment status mismatch. Stripe: ${stripePaymentIntent.status}, App: ${appStatus}`,
          appData: { status: appStatus },
          stripeData: { status: stripePaymentIntent.status },
          expectedData: { status: expectedStatuses },
        })
      );
    }

    return discrepancies;
  }

  private getStatusMismatchSeverity(
    stripeStatus: string,
    appStatus: string
  ): DiscrepancySeverity {
    // Critical: User might have access they shouldn't or vice versa
    if (
      (stripeStatus === 'active' && ['canceled', 'unpaid'].includes(appStatus)) ||
      (stripeStatus === 'canceled' && appStatus === 'active')
    ) {
      return 'critical';
    }

    // High: Payment issues not reflected
    if (stripeStatus === 'past_due' && appStatus === 'active') {
      return 'high';
    }

    return 'medium';
  }

  private async reconcileAllSubscriptions(dateRange: DateRange): Promise<Discrepancy[]> {
    const discrepancies: Discrepancy[] = [];

    try {
      // Get all subscriptions updated in the date range
      const appSubscriptions = await db('user_subscriptions')
        .whereBetween('updated_at', [dateRange.startDate, dateRange.endDate])
        .select('*');

      for (const appSub of appSubscriptions) {
        try {
          const result = await this.reconcileSubscription(appSub.user_id);
          discrepancies.push(...result.discrepancies);
        } catch (err: any) {
          logger.warn('Error reconciling subscription', {
            userId: appSub.user_id,
            error: err.message,
          });
        }
      }

      // Also check for Stripe subscriptions that might not be in app
      const stripeSubscriptions = await stripe.subscriptions.list({
        created: {
          gte: Math.floor(dateRange.startDate.getTime() / 1000),
          lte: Math.floor(dateRange.endDate.getTime() / 1000),
        },
        limit: 100,
      });

      for (const stripeSub of stripeSubscriptions.data) {
        const userId = stripeSub.metadata?.userId;
        if (userId) {
          const existsInApp = appSubscriptions.some(
            (app: any) => app.stripe_subscription_id === stripeSub.id
          );
          if (!existsInApp) {
            discrepancies.push(
              this.createDiscrepancy({
                type: 'missing_subscription_in_app',
                severity: 'high',
                userId,
                stripeSubscriptionId: stripeSub.id,
                stripeCustomerId: stripeSub.customer as string,
                description: `Subscription ${stripeSub.id} exists in Stripe but not in app`,
                stripeData: this.sanitizeStripeData(stripeSub),
              })
            );
          }
        }
      }
    } catch (err: any) {
      logger.error('Error in reconcileAllSubscriptions', { error: err.message });
    }

    return discrepancies;
  }

  private async reconcileAllPayments(dateRange: DateRange): Promise<Discrepancy[]> {
    const discrepancies: Discrepancy[] = [];

    try {
      // Get all transactions in the date range
      const appTransactions = await db('transactions')
        .whereBetween('created_at', [dateRange.startDate, dateRange.endDate])
        .whereNotNull('stripe_payment_intent_id')
        .select('*');

      for (const appTx of appTransactions) {
        try {
          const result = await this.reconcilePayment(appTx.stripe_payment_intent_id);
          discrepancies.push(...result.discrepancies);
        } catch (err: any) {
          logger.warn('Error reconciling payment', {
            paymentId: appTx.stripe_payment_intent_id,
            error: err.message,
          });
        }
      }

      // Check for Stripe payments not in app
      const stripePaymentIntents = await stripe.paymentIntents.list({
        created: {
          gte: Math.floor(dateRange.startDate.getTime() / 1000),
          lte: Math.floor(dateRange.endDate.getTime() / 1000),
        },
        limit: 100,
      });

      for (const pi of stripePaymentIntents.data) {
        if (pi.status === 'succeeded') {
          const existsInApp = appTransactions.some(
            (app: any) => app.stripe_payment_intent_id === pi.id
          );
          if (!existsInApp) {
            discrepancies.push(
              this.createDiscrepancy({
                type: 'missing_payment_in_app',
                severity: 'critical',
                userId: pi.metadata?.userId,
                stripePaymentIntentId: pi.id,
                stripeCustomerId: pi.customer as string,
                description: `Successful payment ${pi.id} exists in Stripe but not in app`,
                stripeData: this.sanitizeStripeData(pi),
                amountDifference: pi.amount / 100,
              })
            );
          }
        }
      }
    } catch (err: any) {
      logger.error('Error in reconcileAllPayments', { error: err.message });
    }

    return discrepancies;
  }

  private async detectDuplicateCharges(dateRange: DateRange): Promise<Discrepancy[]> {
    const discrepancies: Discrepancy[] = [];

    try {
      // Find potential duplicates in app database
      const duplicates = await db('transactions')
        .select('user_id', 'amount', 'type')
        .count('* as count')
        .whereBetween('created_at', [dateRange.startDate, dateRange.endDate])
        .where('status', 'succeeded')
        .groupBy('user_id', 'amount', 'type')
        .having(db.raw('count(*) > 1'));

      for (const dup of duplicates) {
        const transactions = await db('transactions')
          .where({
            user_id: dup.user_id,
            amount: dup.amount,
            type: dup.type,
            status: 'succeeded',
          })
          .whereBetween('created_at', [dateRange.startDate, dateRange.endDate])
          .orderBy('created_at', 'asc');

        // Check time difference - if within 5 minutes, likely duplicate
        for (let i = 1; i < transactions.length; i++) {
          const prev = new Date(transactions[i - 1].created_at).getTime();
          const curr = new Date(transactions[i].created_at).getTime();

          if (curr - prev < 300000) {
            // 5 minutes
            discrepancies.push(
              this.createDiscrepancy({
                type: 'duplicate_charge',
                severity: 'critical',
                userId: String(dup.user_id),
                appRecordId: String(transactions[i].id),
                appTableName: 'transactions',
                description: `Potential duplicate charge detected. Amount: $${dup.amount}, Time diff: ${Math.round((curr - prev) / 1000)}s`,
                appData: {
                  originalTransaction: transactions[i - 1],
                  duplicateTransaction: transactions[i],
                },
                amountDifference: parseFloat(String(dup.amount)),
              })
            );
          }
        }
      }
    } catch (err: any) {
      logger.error('Error detecting duplicate charges', { error: err.message });
    }

    return discrepancies;
  }

  private async detectFailedRenewalsNotReflected(dateRange: DateRange): Promise<Discrepancy[]> {
    const discrepancies: Discrepancy[] = [];

    try {
      // Get failed invoices from Stripe
      const failedInvoices = await stripe.invoices.list({
        created: {
          gte: Math.floor(dateRange.startDate.getTime() / 1000),
          lte: Math.floor(dateRange.endDate.getTime() / 1000),
        },
        status: 'uncollectible',
        limit: 100,
      });

      for (const invoice of failedInvoices.data) {
        if ((invoice as any).subscription) {
          const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
          const userId = subscription.metadata?.userId;

          if (userId) {
            // Check if app reflects the failed renewal
            const appSubscription = await this.getAppSubscription(userId);

            if (appSubscription && appSubscription.status === 'active') {
              discrepancies.push(
                this.createDiscrepancy({
                  type: 'failed_renewal_not_reflected',
                  severity: 'high',
                  userId,
                  stripeSubscriptionId: subscription.id,
                  stripeInvoiceId: invoice.id,
                  appRecordId: appSubscription.id,
                  appTableName: 'user_subscriptions',
                  description: `Failed renewal for invoice ${invoice.id} not reflected in app. App shows status: ${appSubscription.status}`,
                  appData: { status: appSubscription.status },
                  stripeData: {
                    invoiceStatus: invoice.status,
                    subscriptionStatus: subscription.status,
                  },
                  amountDifference: (invoice.amount_due || 0) / 100,
                })
              );
            }
          }
        }
      }
    } catch (err: any) {
      logger.error('Error detecting failed renewals', { error: err.message });
    }

    return discrepancies;
  }

  private async attemptAutoResolution(discrepancy: Discrepancy): Promise<boolean> {
    // Only auto-resolve certain types of discrepancies
    const autoResolvableTypes: DiscrepancyType[] = [
      'status_mismatch',
      'period_end_mismatch',
      'subscription_status_mismatch',
    ];

    if (!autoResolvableTypes.includes(discrepancy.type)) {
      return false;
    }

    // Don't auto-resolve critical issues
    if (discrepancy.severity === 'critical') {
      return false;
    }

    try {
      switch (discrepancy.type) {
        case 'status_mismatch':
        case 'subscription_status_mismatch':
          if (discrepancy.stripeSubscriptionId && discrepancy.appRecordId) {
            // Sync from Stripe (source of truth)
            const stripeSubscription = await stripe.subscriptions.retrieve(
              discrepancy.stripeSubscriptionId
            ) as Stripe.Subscription;

            await db('user_subscriptions')
              .where({ id: discrepancy.appRecordId })
              .update({
                status: this.mapStripeStatusToAppStatus(stripeSubscription.status),
                cancel_at_period_end: stripeSubscription.cancel_at_period_end,
                current_period_end: new Date(((stripeSubscription as any).current_period_end as number) * 1000),
                updated_at: new Date(),
              });

            discrepancy.resolution = 'sync_from_stripe';
            logger.info('Auto-resolved subscription status mismatch', {
              discrepancyId: discrepancy.id,
            });
            return true;
          }
          break;

        case 'period_end_mismatch':
          if (discrepancy.stripeSubscriptionId && discrepancy.appRecordId) {
            const stripeSubscription = await stripe.subscriptions.retrieve(
              discrepancy.stripeSubscriptionId
            ) as Stripe.Subscription;

            await db('user_subscriptions')
              .where({ id: discrepancy.appRecordId })
              .update({
                current_period_end: new Date(((stripeSubscription as any).current_period_end as number) * 1000),
                current_period_start: new Date(((stripeSubscription as any).current_period_start as number) * 1000),
                updated_at: new Date(),
              });

            discrepancy.resolution = 'sync_from_stripe';
            logger.info('Auto-resolved period end mismatch', { discrepancyId: discrepancy.id });
            return true;
          }
          break;
      }
    } catch (err: any) {
      logger.warn('Auto-resolution failed', {
        discrepancyId: discrepancy.id,
        error: err.message,
      });
    }

    return false;
  }

  private async applyResolution(discrepancy: any, resolution: ResolutionType): Promise<void> {
    switch (resolution) {
      case 'sync_from_stripe':
        if (discrepancy.stripe_subscription_id) {
          const stripeSub = await stripe.subscriptions.retrieve(discrepancy.stripe_subscription_id);
          await db('user_subscriptions')
            .where({ id: discrepancy.app_record_id })
            .update({
              status: this.mapStripeStatusToAppStatus(stripeSub.status),
              cancel_at_period_end: stripeSub.cancel_at_period_end,
              current_period_end: new Date((stripeSub as any).current_period_end * 1000),
              updated_at: new Date(),
            });
        }
        break;

      case 'create_missing_record':
        if (discrepancy.type === 'missing_payment_in_app' && discrepancy.stripe_data) {
          const stripeData = discrepancy.stripe_data;
          await db('transactions').insert({
            user_id: discrepancy.user_id,
            stripe_payment_intent_id: stripeData.id,
            type: stripeData.metadata?.type || 'one_time',
            status: 'succeeded',
            amount: stripeData.amount / 100,
            currency: stripeData.currency?.toUpperCase() || 'USD',
            description: 'Created from reconciliation',
            processed_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        break;

      case 'update_status':
        if (discrepancy.app_record_id && discrepancy.app_table_name) {
          await db(discrepancy.app_table_name)
            .where({ id: discrepancy.app_record_id })
            .update({
              status: discrepancy.expected_data?.status || 'canceled',
              updated_at: new Date(),
            });
        }
        break;

      case 'refund_duplicate':
        if (discrepancy.stripe_data?.id) {
          // Create refund in Stripe
          await stripe.refunds.create({
            payment_intent: discrepancy.stripe_data.id,
            reason: 'duplicate',
          });

          // Update app record
          if (discrepancy.app_record_id) {
            await db('transactions').where({ id: discrepancy.app_record_id }).update({
              status: 'refunded',
              updated_at: new Date(),
            });
          }
        }
        break;

      case 'ignore':
        // Just mark as ignored, no action needed
        break;

      case 'manual_review':
        // Flag for manual review
        logger.warn('Discrepancy requires manual review', {
          discrepancyId: discrepancy.id,
          type: discrepancy.type,
        });
        break;

      default:
        logger.warn('Unknown resolution type', { resolution });
    }
  }

  private mapStripeStatusToAppStatus(stripeStatus: string): string {
    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'unpaid',
      trialing: 'trialing',
      incomplete: 'incomplete',
      incomplete_expired: 'incomplete_expired',
      paused: 'canceled',
    };

    return statusMap[stripeStatus] || stripeStatus;
  }

  private sanitizeStripeData(data: any): Record<string, any> {
    // Remove sensitive fields before storing
    const sanitized = { ...data };
    delete sanitized.client_secret;
    delete sanitized.payment_method_details;
    return sanitized;
  }

  private async countSubscriptionsInRange(dateRange: DateRange): Promise<number> {
    const result = await db('user_subscriptions')
      .whereBetween('updated_at', [dateRange.startDate, dateRange.endDate])
      .count('* as count')
      .first();

    return parseInt(result?.count as string, 10) || 0;
  }

  private async countPaymentsInRange(dateRange: DateRange): Promise<number> {
    const result = await db('transactions')
      .whereBetween('created_at', [dateRange.startDate, dateRange.endDate])
      .count('* as count')
      .first();

    return parseInt(result?.count as string, 10) || 0;
  }

  private async storeReconciliationReport(report: ReconciliationReport): Promise<void> {
    try {
      // Store the report
      await db('reconciliation_reports').insert({
        id: report.id,
        run_date: report.runDate,
        date_range_start: report.dateRange.startDate,
        date_range_end: report.dateRange.endDate,
        status: report.status,
        summary: JSON.stringify(report.summary),
        processing_time_ms: report.processingTimeMs,
        error: report.error,
        created_at: new Date(),
      });

      // Store individual discrepancies
      for (const discrepancy of report.discrepancies) {
        await db('billing_discrepancies').insert({
          id: discrepancy.id,
          report_id: report.id,
          type: discrepancy.type,
          severity: discrepancy.severity,
          status: discrepancy.status,
          user_id: discrepancy.userId,
          stripe_customer_id: discrepancy.stripeCustomerId,
          stripe_subscription_id: discrepancy.stripeSubscriptionId,
          stripe_payment_intent_id: discrepancy.stripePaymentIntentId,
          stripe_invoice_id: discrepancy.stripeInvoiceId,
          stripe_charge_id: discrepancy.stripeChargeId,
          app_record_id: discrepancy.appRecordId,
          app_table_name: discrepancy.appTableName,
          description: discrepancy.description,
          app_data: JSON.stringify(discrepancy.appData),
          stripe_data: JSON.stringify(discrepancy.stripeData),
          expected_data: JSON.stringify(discrepancy.expectedData),
          amount_difference: discrepancy.amountDifference,
          resolution: discrepancy.resolution,
          resolved_at: discrepancy.resolvedAt,
          resolved_by: discrepancy.resolvedBy,
          resolution_notes: discrepancy.resolutionNotes,
          detected_at: discrepancy.detectedAt,
          metadata: JSON.stringify(discrepancy.metadata),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    } catch (err: any) {
      // Log but don't fail if storage fails (tables might not exist)
      logger.warn('Failed to store reconciliation report', { error: err.message });
    }
  }

  private async sendAlertsIfNeeded(report: ReconciliationReport): Promise<void> {
    const criticalCount = report.summary.bySeverity['critical'] || 0;
    const highCount = report.summary.bySeverity['high'] || 0;

    // Alert conditions
    const shouldAlert =
      criticalCount > 0 ||
      highCount >= this.alertThresholds.criticalDiscrepancyCount ||
      report.summary.totalAmountDiscrepancy >= this.alertThresholds.highAmountThreshold;

    if (!shouldAlert) {
      return;
    }

    const alertPayload: AlertPayload = {
      type: 'billing_reconciliation_alert',
      severity: criticalCount > 0 ? 'critical' : 'high',
      title: 'Billing Reconciliation Alert',
      message: this.buildAlertMessage(report),
      discrepancyCount: report.summary.discrepanciesFound,
      criticalCount,
      totalAmountAffected: report.summary.totalAmountDiscrepancy,
      reportId: report.id,
      timestamp: new Date(),
    };

    logger.warn('Sending billing reconciliation alert', alertPayload);

    // Send to admin notification endpoint
    try {
      // This would typically send to an admin notification system
      // For now, we log it and could extend to send emails, Slack, etc.
      await this.sendAdminAlert(alertPayload);
    } catch (err: any) {
      logger.error('Failed to send reconciliation alert', { error: err.message });
    }
  }

  private buildAlertMessage(report: ReconciliationReport): string {
    const lines = [
      `Billing Reconciliation Report: ${report.id}`,
      `Status: ${report.status}`,
      ``,
      `Summary:`,
      `- Total records checked: ${report.summary.totalRecordsChecked}`,
      `- Discrepancies found: ${report.summary.discrepanciesFound}`,
      `- Auto-resolved: ${report.summary.autoResolvedCount}`,
      `- Manual review required: ${report.summary.manualReviewRequired}`,
      `- Total amount affected: $${report.summary.totalAmountDiscrepancy.toFixed(2)}`,
      ``,
      `By Severity:`,
    ];

    for (const [severity, count] of Object.entries(report.summary.bySeverity)) {
      if (count > 0) {
        lines.push(`- ${severity}: ${count}`);
      }
    }

    lines.push(``, `By Type:`);

    for (const [type, count] of Object.entries(report.summary.byType)) {
      if (count > 0) {
        lines.push(`- ${type}: ${count}`);
      }
    }

    return lines.join('\n');
  }

  private async sendAdminAlert(payload: AlertPayload): Promise<void> {
    // In a production system, this would send to:
    // 1. Admin email addresses
    // 2. Slack/Teams webhook
    // 3. PagerDuty for critical alerts
    // 4. Internal monitoring system

    // For now, we just log it prominently
    if (payload.severity === 'critical') {
      logger.error('CRITICAL BILLING ALERT', payload);
    } else {
      logger.warn('BILLING ALERT', payload);
    }

    // Could also store in a dedicated alerts table
    try {
      await db('system_alerts').insert({
        type: payload.type,
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        metadata: JSON.stringify(payload),
        created_at: new Date(),
      });
    } catch (err: any) {
      // Ignore if alerts table doesn't exist
      logger.debug('Could not store alert', { error: err.message });
    }
  }
}

export default new BillingReconciliationService();
