/**
 * Billing Service
 * Handles billing, payments, and invoicing for ad campaigns
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BillingAccount,
  BillingTransaction,
  AdSpend,
  Invoice,
  BillingReport,
  InvoiceLineItem,
  CampaignSpendBreakdown,
  DailySpend,
} from '../types/billing.types';

export class BillingService {
  /**
   * Get billing account by advertiser ID
   */
  async getBillingAccount(advertiserId: string): Promise<BillingAccount> {
    // Mock implementation - would query database
    return {
      id: uuidv4(),
      advertiser_id: advertiserId,
      payment_method_id: 'pm_12345',
      billing_type: 'prepaid',
      balance: 5000.00,
      currency: 'USD',
      credit_limit: 10000.00,
      auto_recharge: {
        enabled: true,
        threshold: 1000.00,
        recharge_amount: 5000.00,
        payment_method_id: 'pm_12345',
      },
      status: 'active',
      created_at: new Date('2025-01-01'),
      updated_at: new Date(),
    };
  }

  /**
   * Create billing account
   */
  async createBillingAccount(
    advertiserId: string,
    billingType: BillingAccount['billing_type'],
    initialBalance?: number
  ): Promise<BillingAccount> {
    const now = new Date();

    const account: BillingAccount = {
      id: uuidv4(),
      advertiser_id: advertiserId,
      billing_type: billingType,
      balance: initialBalance || 0,
      currency: 'USD',
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    // Mock implementation - would save to database
    return account;
  }

  /**
   * Update billing account balance
   */
  async updateBalance(
    billingAccountId: string,
    amount: number,
    transactionType: BillingTransaction['transaction_type'],
    description: string
  ): Promise<BillingTransaction> {
    const transaction: BillingTransaction = {
      id: uuidv4(),
      billing_account_id: billingAccountId,
      transaction_type: transactionType,
      amount,
      currency: 'USD',
      description,
      status: 'completed',
      created_at: new Date(),
      processed_at: new Date(),
    };

    // Mock implementation - would:
    // 1. Create transaction record
    // 2. Update account balance
    // 3. Trigger auto-recharge if needed

    return transaction;
  }

  /**
   * Record ad spend
   */
  async recordAdSpend(
    campaignId: string,
    adId: string,
    billingAccountId: string,
    spendType: AdSpend['spend_type'],
    quantity: number,
    unitPrice: number
  ): Promise<AdSpend> {
    const amount = quantity * unitPrice;
    const now = new Date();

    const spend: AdSpend = {
      id: uuidv4(),
      campaign_id: campaignId,
      ad_id: adId,
      billing_account_id: billingAccountId,
      spend_type: spendType,
      amount,
      currency: 'USD',
      quantity,
      unit_price: unitPrice,
      timestamp: now,
      billing_period: this.getCurrentBillingPeriod(now),
    };

    // Mock implementation - would:
    // 1. Save spend record
    // 2. Deduct from account balance
    // 3. Check if budget limits are exceeded

    // Update account balance
    await this.updateBalance(
      billingAccountId,
      -amount,
      'charge',
      `Ad spend - ${spendType}: ${quantity} x $${unitPrice}`
    );

    return spend;
  }

  /**
   * Calculate campaign spend
   */
  async calculateCampaignSpend(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Mock implementation - would query database and sum spend
    const mockSpend = 4567.89;
    return mockSpend;
  }

  /**
   * Generate invoice
   */
  async generateInvoice(
    billingAccountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Invoice> {
    // Get all campaigns for this billing account
    const lineItems: InvoiceLineItem[] = [
      {
        id: uuidv4(),
        campaign_id: 'campaign_001',
        description: 'Valentine\'s Day Promotion - Ad Spend',
        quantity: 45000,
        unit_price: 0.10,
        amount: 4500.00,
        period: { start: startDate, end: endDate },
      },
      {
        id: uuidv4(),
        campaign_id: 'campaign_002',
        description: 'New User Acquisition - Ad Spend',
        quantity: 35000,
        unit_price: 0.08,
        amount: 2800.00,
        period: { start: startDate, end: endDate },
      },
    ];

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const invoice: Invoice = {
      id: uuidv4(),
      billing_account_id: billingAccountId,
      invoice_number: `INV-${Date.now()}`,
      billing_period: { start: startDate, end: endDate },
      line_items: lineItems,
      subtotal,
      tax,
      total,
      currency: 'USD',
      status: 'issued',
      issued_at: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    // Mock implementation - would save to database
    return invoice;
  }

  /**
   * Get billing report
   */
  async getBillingReport(
    billingAccountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BillingReport> {
    // Mock implementation - would aggregate from database
    const campaignBreakdown: CampaignSpendBreakdown[] = [
      {
        campaign_id: 'campaign_001',
        campaign_name: 'Valentine\'s Day Promotion',
        spend: 4500.00,
        impressions: 45000,
        clicks: 3600,
        conversions: 240,
        ctr: 0.08,
        cvr: 0.067,
      },
      {
        campaign_id: 'campaign_002',
        campaign_name: 'New User Acquisition',
        spend: 2800.00,
        impressions: 35000,
        clicks: 2800,
        conversions: 180,
        ctr: 0.08,
        cvr: 0.064,
      },
    ];

    const dailySpend: DailySpend[] = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      dailySpend.push({
        date,
        spend: 300 + Math.random() * 200,
        impressions: 3000 + Math.floor(Math.random() * 1000),
        clicks: 240 + Math.floor(Math.random() * 80),
        conversions: 15 + Math.floor(Math.random() * 10),
      });
    }

    const totalSpend = campaignBreakdown.reduce((sum, c) => sum + c.spend, 0);
    const totalImpressions = campaignBreakdown.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = campaignBreakdown.reduce((sum, c) => sum + c.clicks, 0);
    const totalConversions = campaignBreakdown.reduce((sum, c) => sum + c.conversions, 0);

    return {
      billing_account_id: billingAccountId,
      period: { start: startDate, end: endDate },
      summary: {
        total_spend: totalSpend,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_conversions: totalConversions,
        avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        avg_cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        avg_cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
      },
      campaign_breakdown: campaignBreakdown,
      daily_spend: dailySpend,
    };
  }

  /**
   * Process payment
   */
  async processPayment(
    billingAccountId: string,
    amount: number,
    paymentMethodId: string
  ): Promise<BillingTransaction> {
    // Mock implementation - would integrate with payment processor (Stripe, etc.)
    const transaction: BillingTransaction = {
      id: uuidv4(),
      billing_account_id: billingAccountId,
      transaction_type: 'deposit',
      amount,
      currency: 'USD',
      description: `Payment via ${paymentMethodId}`,
      reference_id: `pay_${uuidv4()}`,
      status: 'completed',
      created_at: new Date(),
      processed_at: new Date(),
      metadata: {
        payment_method_id: paymentMethodId,
        processor: 'stripe',
      },
    };

    // Update account balance
    await this.updateBalance(
      billingAccountId,
      amount,
      'deposit',
      `Payment received: $${amount}`
    );

    return transaction;
  }

  /**
   * Check if campaign has sufficient budget
   */
  async checkBudgetAvailability(
    campaignId: string,
    billingAccountId: string,
    requiredAmount: number
  ): Promise<{
    has_budget: boolean;
    available_balance: number;
    required_amount: number;
    deficit?: number;
  }> {
    const account = await this.getBillingAccount(billingAccountId);

    const hasBudget = account.balance >= requiredAmount;

    return {
      has_budget: hasBudget,
      available_balance: account.balance,
      required_amount: requiredAmount,
      deficit: hasBudget ? undefined : requiredAmount - account.balance,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    billingAccountId: string,
    limit: number = 50
  ): Promise<BillingTransaction[]> {
    // Mock implementation - would query database
    const transactions: BillingTransaction[] = [
      {
        id: uuidv4(),
        billing_account_id: billingAccountId,
        transaction_type: 'deposit',
        amount: 5000.00,
        currency: 'USD',
        description: 'Initial deposit',
        status: 'completed',
        created_at: new Date('2025-01-01'),
        processed_at: new Date('2025-01-01'),
      },
      {
        id: uuidv4(),
        billing_account_id: billingAccountId,
        transaction_type: 'charge',
        amount: -150.00,
        currency: 'USD',
        description: 'Ad spend - impression: 1500 x $0.10',
        status: 'completed',
        created_at: new Date('2025-01-15'),
        processed_at: new Date('2025-01-15'),
      },
    ];

    return transactions.slice(0, limit);
  }

  /**
   * Get current billing period
   */
  private getCurrentBillingPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Trigger auto-recharge if needed
   */
  async checkAndTriggerAutoRecharge(billingAccountId: string): Promise<void> {
    const account = await this.getBillingAccount(billingAccountId);

    if (!account.auto_recharge?.enabled) return;

    if (account.balance < account.auto_recharge.threshold) {
      await this.processPayment(
        billingAccountId,
        account.auto_recharge.recharge_amount,
        account.auto_recharge.payment_method_id
      );
    }
  }
}

export const billingService = new BillingService();
