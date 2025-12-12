/**
 * CSAM Detection API Routes
 *
 * Provides endpoints for CSAM detection, quarantine management, and reporting.
 * These endpoints are used by other services (media, etc.) for CSAM detection.
 */

import { Router, Request, Response } from 'express';
import { createLogger } from '@flamoral/shared';
import csamDetectionService from '../services/csam-detection.service';
import csamQuarantineService from '../services/csam-quarantine.service';
import ncmecReportingService from '../services/ncmec-reporting.service';
import csamAuditService from '../services/csam-audit.service';
import { serviceAuthMiddleware } from '../middleware/service-auth.middleware';

const logger = createLogger('csam-routes');
const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isEnabled = csamDetectionService.isEnabled();

    res.json({
      success: true,
      enabled: isEnabled,
      service: 'csam-detection',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Health check failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Detect CSAM in image
 * POST /api/csam/detect
 */
router.post('/detect', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { contentId, userId, imageData, fileName, contentType } = req.body;

    // Validate request
    if (!contentId || !userId || !imageData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contentId, userId, imageData',
      });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');

    // Generate temporary URL (in production, this would be a secure temporary URL)
    const imageUrl = `temp://${contentId}`;

    // Perform CSAM detection
    const detectionResult = await csamDetectionService.detectCSAM(
      imageUrl,
      imageBuffer,
      contentId,
      userId,
      contentType || 'user_upload'
    );

    // Return result
    res.json({
      success: true,
      detectionId: detectionResult.detectionId,
      isCSAM: detectionResult.isCSAM,
      confidenceScore: detectionResult.confidenceScore,
      severity: detectionResult.severity,
      status: detectionResult.status,
      quarantined: detectionResult.isCSAM,
      processingTimeMs: detectionResult.processingTimeMs,
    });

  } catch (error: any) {
    logger.error('CSAM detection endpoint failed', error);

    res.status(500).json({
      success: false,
      error: 'CSAM detection failed',
      message: error.message,
    });
  }
});

/**
 * Quarantine content for manual review (fallback for detection failures)
 * POST /api/csam/quarantine-for-review
 */
router.post('/quarantine-for-review', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { contentId, userId, imageData, reason, error } = req.body;

    if (!contentId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contentId, userId',
      });
    }

    // Generate temporary URL
    const imageUrl = `temp://${contentId}`;

    // Quarantine for review
    const quarantineRecord = await csamQuarantineService.quarantineContentForReview({
      contentId,
      userId,
      imageUrl,
      reason: reason || 'manual_review',
      error,
    });

    res.json({
      success: true,
      quarantineId: quarantineRecord.id,
      message: 'Content quarantined for manual review',
    });

  } catch (error: any) {
    logger.error('Quarantine for review failed', error);

    res.status(500).json({
      success: false,
      error: 'Failed to quarantine content',
      message: error.message,
    });
  }
});

/**
 * Get detection statistics
 * GET /api/csam/statistics
 */
router.get('/statistics', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as 'day' | 'week' | 'month') || 'day';

    const [detectionStats, quarantineStats, reportStats, auditStats] = await Promise.all([
      csamDetectionService.getDetectionStatistics(timeRange),
      csamQuarantineService.getQuarantineStatistics(),
      ncmecReportingService.getReportStatistics(timeRange),
      csamAuditService.getAuditStatistics(timeRange),
    ]);

    res.json({
      success: true,
      timeRange,
      detection: detectionStats,
      quarantine: quarantineStats,
      reports: reportStats,
      audit: auditStats,
    });

  } catch (error: any) {
    logger.error('Failed to get CSAM statistics', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      message: error.message,
    });
  }
});

/**
 * Get quarantine record
 * GET /api/csam/quarantine/:quarantineId
 */
router.get('/quarantine/:quarantineId', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { quarantineId } = req.params;

    const record = await csamQuarantineService.getQuarantineRecord(quarantineId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Quarantine record not found',
      });
    }

    res.json({
      success: true,
      record,
    });

  } catch (error: any) {
    logger.error('Failed to get quarantine record', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quarantine record',
      message: error.message,
    });
  }
});

/**
 * List quarantined content (admin only)
 * GET /api/csam/quarantine/list
 */
router.get('/quarantine/list', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const filters: any = {};

    if (req.query.status) {
      filters.status = req.query.status as string;
    }

    if (req.query.userId) {
      filters.userId = req.query.userId as string;
    }

    if (req.query.reviewRequired !== undefined) {
      filters.reviewRequired = req.query.reviewRequired === 'true';
    }

    const limit = parseInt(req.query.limit as string) || 50;

    const records = await csamQuarantineService.listQuarantinedContent(filters, limit);

    res.json({
      success: true,
      count: records.length,
      records,
    });

  } catch (error: any) {
    logger.error('Failed to list quarantined content', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quarantined content',
      message: error.message,
    });
  }
});

/**
 * Get NCMEC report
 * GET /api/csam/reports/:reportId
 */
router.get('/reports/:reportId', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    const report = await ncmecReportingService.getReport(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    res.json({
      success: true,
      report,
    });

  } catch (error: any) {
    logger.error('Failed to get NCMEC report', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve report',
      message: error.message,
    });
  }
});

/**
 * Get audit logs
 * GET /api/csam/audit/logs
 */
router.get('/audit/logs', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const filters: any = {};

    if (req.query.eventType) {
      filters.eventType = req.query.eventType as string;
    }

    if (req.query.severity) {
      filters.severity = req.query.severity as string;
    }

    if (req.query.detectionId) {
      filters.detectionId = req.query.detectionId as string;
    }

    if (req.query.userId) {
      filters.userId = req.query.userId as string;
    }

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string);
    }

    const logs = await csamAuditService.getAuditLogs(filters);

    res.json({
      success: true,
      count: logs.length,
      logs,
    });

  } catch (error: any) {
    logger.error('Failed to get audit logs', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs',
      message: error.message,
    });
  }
});

/**
 * Verify audit chain integrity
 * POST /api/csam/audit/verify
 */
router.post('/audit/verify', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: startDate, endDate',
      });
    }

    const result = await csamAuditService.verifyAuditChainIntegrity(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      verification: result,
    });

  } catch (error: any) {
    logger.error('Audit chain verification failed', error);

    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message,
    });
  }
});

/**
 * Grant law enforcement access
 * POST /api/csam/quarantine/:quarantineId/grant-access
 */
router.post('/quarantine/:quarantineId/grant-access', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { quarantineId } = req.params;
    const { officerId, agency, caseNumber, warrant } = req.body;

    if (!officerId || !agency || !caseNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: officerId, agency, caseNumber',
      });
    }

    const access = await csamQuarantineService.grantLawEnforcementAccess(
      quarantineId,
      officerId,
      agency,
      caseNumber,
      warrant
    );

    // Log law enforcement access
    await csamAuditService.logLawEnforcementAccess({
      quarantineId,
      officerId,
      agency,
      caseNumber,
      accessType: 'granted',
    });

    res.json({
      success: true,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
    });

  } catch (error: any) {
    logger.error('Failed to grant law enforcement access', error);

    res.status(500).json({
      success: false,
      error: 'Failed to grant access',
      message: error.message,
    });
  }
});

/**
 * Configuration status
 * GET /api/csam/config/status
 */
router.get('/config/status', serviceAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const configValidation = ncmecReportingService.validateConfiguration();

    res.json({
      success: true,
      detection: {
        enabled: csamDetectionService.isEnabled(),
      },
      reporting: {
        enabled: ncmecReportingService.isEnabled(),
        configured: configValidation.valid,
        errors: configValidation.errors,
      },
    });

  } catch (error: any) {
    logger.error('Failed to get config status', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve config status',
      message: error.message,
    });
  }
});

export default router;
