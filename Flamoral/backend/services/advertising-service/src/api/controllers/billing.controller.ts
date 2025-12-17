import { Request, Response } from 'express';
import { billingService } from '../../domain/services/billing.service';
import logger from '../../utils/logger';

export class BillingController {
  /**
   * Get billing account
   */
  async getBillingAccount(req: Request, res: Response): Promise<Response> {
    try {
      const { advertiserId } = req.params;

      if (!advertiserId) {
        return res.status(400).json({
          success: false,
          message: 'Advertiser ID is required',
        });
      }

      const account = await billingService.getBillingAccount(advertiserId);
      return res.status(200).json({ success: true, data: account });
    } catch (error: any) {
      logger.error('Get billing account error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get billing account',
      });
    }
  }

  /**
   * Create billing account
   */
  async createBillingAccount(req: Request, res: Response): Promise<Response> {
    try {
      const { advertiser_id, billing_type, initial_balance } = req.body;

      if (!advertiser_id || !billing_type) {
        return res.status(400).json({
          success: false,
          message: 'Advertiser ID and billing type are required',
        });
      }

      const account = await billingService.createBillingAccount(
        advertiser_id,
        billing_type,
        initial_balance
      );

      return res.status(201).json({ success: true, data: account });
    } catch (error: any) {
      logger.error('Create billing account error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create billing account',
      });
    }
  }

  /**
   * Update balance
   */
  async updateBalance(req: Request, res: Response): Promise<Response> {
    try {
      const { billing_account_id, amount, transaction_type, description } = req.body;

      if (!billing_account_id || amount === undefined || !transaction_type || !description) {
        return res.status(400).json({
          success: false,
          message: 'Billing account ID, amount, transaction type, and description are required',
        });
      }

      const transaction = await billingService.updateBalance(
        billing_account_id,
        amount,
        transaction_type,
        description
      );

      return res.status(200).json({ success: true, data: transaction });
    } catch (error: any) {
      logger.error('Update balance error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update balance',
      });
    }
  }

  /**
   * Record ad spend
   */
  async recordAdSpend(req: Request, res: Response): Promise<Response> {
    try {
      const { campaign_id, ad_id, billing_account_id, spend_type, quantity, unit_price } = req.body;

      if (!campaign_id || !ad_id || !billing_account_id || !spend_type || !quantity || !unit_price) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID, ad ID, billing account ID, spend type, quantity, and unit price are required',
        });
      }

      const spend = await billingService.recordAdSpend(
        campaign_id,
        ad_id,
        billing_account_id,
        spend_type,
        quantity,
        unit_price
      );

      return res.status(201).json({ success: true, data: spend });
    } catch (error: any) {
      logger.error('Record ad spend error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to record ad spend',
      });
    }
  }

  /**
   * Calculate campaign spend
   */
  async calculateCampaignSpend(req: Request, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;
      const { start_date, end_date } = req.query;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
        });
      }

      const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      const spend = await billingService.calculateCampaignSpend(campaignId, startDate, endDate);

      return res.status(200).json({
        success: true,
        data: {
          campaign_id: campaignId,
          total_spend: spend,
          period: { start: startDate, end: endDate },
        },
      });
    } catch (error: any) {
      logger.error('Calculate campaign spend error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate campaign spend',
      });
    }
  }

  /**
   * Generate invoice
   */
  async generateInvoice(req: Request, res: Response): Promise<Response> {
    try {
      const { billing_account_id, start_date, end_date } = req.body;

      if (!billing_account_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Billing account ID, start date, and end date are required',
        });
      }

      const invoice = await billingService.generateInvoice(
        billing_account_id,
        new Date(start_date),
        new Date(end_date)
      );

      return res.status(201).json({ success: true, data: invoice });
    } catch (error: any) {
      logger.error('Generate invoice error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate invoice',
      });
    }
  }

  /**
   * Get billing report
   */
  async getBillingReport(req: Request, res: Response): Promise<Response> {
    try {
      const { billingAccountId } = req.params;
      const { start_date, end_date } = req.query;

      if (!billingAccountId) {
        return res.status(400).json({
          success: false,
          message: 'Billing account ID is required',
        });
      }

      const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      const report = await billingService.getBillingReport(billingAccountId, startDate, endDate);

      return res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      logger.error('Get billing report error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get billing report',
      });
    }
  }

  /**
   * Process payment
   */
  async processPayment(req: Request, res: Response): Promise<Response> {
    try {
      const { billing_account_id, amount, payment_method_id } = req.body;

      if (!billing_account_id || !amount || !payment_method_id) {
        return res.status(400).json({
          success: false,
          message: 'Billing account ID, amount, and payment method ID are required',
        });
      }

      const transaction = await billingService.processPayment(
        billing_account_id,
        amount,
        payment_method_id
      );

      return res.status(200).json({ success: true, data: transaction });
    } catch (error: any) {
      logger.error('Process payment error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to process payment',
      });
    }
  }

  /**
   * Check budget availability
   */
  async checkBudgetAvailability(req: Request, res: Response): Promise<Response> {
    try {
      const { campaign_id, billing_account_id, required_amount } = req.body;

      if (!campaign_id || !billing_account_id || required_amount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID, billing account ID, and required amount are required',
        });
      }

      const availability = await billingService.checkBudgetAvailability(
        campaign_id,
        billing_account_id,
        required_amount
      );

      return res.status(200).json({ success: true, data: availability });
    } catch (error: any) {
      logger.error('Check budget availability error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to check budget availability',
      });
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { billingAccountId } = req.params;
      const { limit } = req.query;

      if (!billingAccountId) {
        return res.status(400).json({
          success: false,
          message: 'Billing account ID is required',
        });
      }

      const transactions = await billingService.getTransactionHistory(
        billingAccountId,
        limit ? parseInt(limit as string) : 50
      );

      return res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
      logger.error('Get transaction history error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get transaction history',
      });
    }
  }
}

export const billingController = new BillingController();
