import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';

const router = Router();

// Billing Account Management
router.get('/account/:advertiserId', (req, res) => billingController.getBillingAccount(req, res));
router.post('/account', (req, res) => billingController.createBillingAccount(req, res));

// Balance Management
router.post('/balance/update', (req, res) => billingController.updateBalance(req, res));
router.post('/budget/check', (req, res) => billingController.checkBudgetAvailability(req, res));

// Spend Tracking
router.post('/spend/record', (req, res) => billingController.recordAdSpend(req, res));
router.get('/spend/campaign/:campaignId', (req, res) => billingController.calculateCampaignSpend(req, res));

// Invoicing
router.post('/invoice/generate', (req, res) => billingController.generateInvoice(req, res));

// Reports
router.get('/report/:billingAccountId', (req, res) => billingController.getBillingReport(req, res));

// Payments
router.post('/payment/process', (req, res) => billingController.processPayment(req, res));

// Transaction History
router.get('/transactions/:billingAccountId', (req, res) => billingController.getTransactionHistory(req, res));

export default router;
