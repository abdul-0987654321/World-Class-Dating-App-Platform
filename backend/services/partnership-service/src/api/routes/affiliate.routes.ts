import express, { Request, Response } from 'express';
import { AffiliateService } from '../../domain/services/affiliate.service';
import { createLogger } from '@flamoral/backend-shared';

const router = express.Router();
const logger = createLogger('affiliate-routes');
const affiliateService = new AffiliateService();

interface AdminRequest extends Request {
  admin?: {
    id: string;
    role: string;
  };
}

/**
 * Get commission statistics for a partner
 * GET /api/v1/partnerships/admin/affiliates/:partnerId/stats
 */
router.get('/:partnerId/stats', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;

    const stats = await affiliateService.getPartnerCommissionStats(partnerId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get commission stats failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get commissions for a partner
 * GET /api/v1/partnerships/admin/affiliates/:partnerId/commissions
 */
router.get('/:partnerId/commissions', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { status, orderType, startDate, endDate, page, limit } = req.query;

    const result = await affiliateService.getPartnerCommissions(partnerId, {
      status: status as string,
      orderType: orderType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.commissions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error: any) {
    logger.error('Get commissions failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get click analytics for a partner
 * GET /api/v1/partnerships/admin/affiliates/:partnerId/analytics
 */
router.get('/:partnerId/analytics', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: startDate, endDate',
      });
    }

    const analytics = await affiliateService.getClickAnalytics(
      partnerId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    logger.error('Get click analytics failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Generate payout report for a partner
 * GET /api/v1/partnerships/admin/affiliates/:partnerId/payout-report
 */
router.get('/:partnerId/payout-report', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;

    const report = await affiliateService.generatePayoutReport(partnerId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    logger.error('Generate payout report failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Mark commissions as paid
 * POST /api/v1/partnerships/admin/affiliates/commissions/pay
 */
router.post('/commissions/pay', async (req: AdminRequest, res: Response) => {
  try {
    const { commissionIds, paymentReference } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'commissionIds array is required',
      });
    }

    const count = await affiliateService.markCommissionsAsPaid(
      commissionIds,
      paymentReference
    );

    res.json({
      success: true,
      data: { markedAsPaid: count },
      message: `${count} commissions marked as paid`,
    });
  } catch (error: any) {
    logger.error('Mark commissions paid failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Approve eligible commissions (cron job endpoint)
 * POST /api/v1/partnerships/admin/affiliates/commissions/approve-eligible
 */
router.post('/commissions/approve-eligible', async (req: AdminRequest, res: Response) => {
  try {
    const count = await affiliateService.approveEligibleCommissions();

    res.json({
      success: true,
      data: { approved: count },
      message: `${count} commissions approved`,
    });
  } catch (error: any) {
    logger.error('Approve commissions failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Reject a commission (e.g., due to refund)
 * POST /api/v1/partnerships/admin/affiliates/commissions/reject
 */
router.post('/commissions/reject', async (req: AdminRequest, res: Response) => {
  try {
    const { orderId, orderType, reason } = req.body;

    if (!orderId || !orderType || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, orderType, reason',
      });
    }

    await affiliateService.rejectCommission(orderId, orderType, reason);

    res.json({
      success: true,
      message: 'Commission rejected',
    });
  } catch (error: any) {
    logger.error('Reject commission failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
