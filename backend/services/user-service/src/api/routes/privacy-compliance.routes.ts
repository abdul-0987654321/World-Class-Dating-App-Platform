import { Router, Request, Response } from 'express';
import Joi from 'joi';

import db from '../../infrastructure/database/connection';
import { CCPAComplianceService } from '../../services/ccpa-compliance.service';
import { ConsentManagementService } from '../../services/consent-management.service';
import { GDPRComplianceService } from '../../services/gdpr-compliance.service';
import logger from '../../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Initialize services
const gdprService = new GDPRComplianceService(db);
const consentService = new ConsentManagementService(db);
const ccpaService = new CCPAComplianceService(db);

// Validation schemas
const consentSchema = Joi.object({
  consentType: Joi.string().required(),
  consentGiven: Joi.boolean().required(),
});

const bulkConsentSchema = Joi.object({
  consents: Joi.object().pattern(Joi.string(), Joi.boolean()).required(),
});

const optOutSchema = Joi.object({
  optOutType: Joi.string().valid('do_not_sell', 'do_not_share', 'limit_sensitive_data').required(),
});

const deletionCancellationSchema = Joi.object({
  cancellationToken: Joi.string().required(),
});

/**
 * @swagger
 * /api/privacy/dashboard:
 *   get:
 *     summary: Get user's privacy dashboard
 *     tags: [Privacy & Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Privacy dashboard data
 */
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    // Get consents
    const consents = await consentService.getUserConsents(userId);

    // Get CCPA opt-outs
    const ccpaOptOuts = await ccpaService.getUserOptOuts(userId);

    // Get data export requests
    const dataExports = await db('data_export_requests')
      .where({ user_id: userId })
      .orderBy('requested_at', 'desc')
      .limit(5);

    // Get deletion request
    const deletionRequest = await db('deletion_requests')
      .where({ user_id: userId })
      .whereIn('status', ['pending', 'processing'])
      .first();

    res.json({
      success: true,
      data: {
        consents,
        ccpaOptOuts,
        dataExports,
        deletionRequest,
      },
    });
  } catch (error) {
    logger.error(`Failed to get privacy dashboard: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve privacy dashboard',
    });
  }
});

/**
 * @swagger
 * /api/privacy/consents:
 *   get:
 *     summary: Get all consent types and user's status
 *     tags: [Privacy & Compliance]
 *     security:
 *       - bearerAuth: []
 */
router.get('/consents', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const consentTypes = await consentService.getAllConsentTypes(userId);

    res.json({
      success: true,
      data: consentTypes,
    });
  } catch (error) {
    logger.error(`Failed to get consents: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consents',
    });
  }
});

/**
 * @swagger
 * /api/privacy/consents/record:
 *   post:
 *     summary: Record user consent
 *     tags: [Privacy & Compliance]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/consents/record',
  authenticate,
  validate(consentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { consentType, consentGiven } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const consent = await consentService.recordConsent(
        userId,
        consentType,
        consentGiven,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: consent,
      });
    } catch (error) {
      logger.error(`Failed to record consent: ${error}`);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to record consent',
      });
    }
  }
);

/**
 * @swagger
 * /api/privacy/consents/bulk:
 *   post:
 *     summary: Record multiple consents
 *     tags: [Privacy & Compliance]
 */
router.post(
  '/consents/bulk',
  authenticate,
  validate(bulkConsentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { consents } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const results = await consentService.recordBulkConsents(
        userId,
        consents,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error(`Failed to record bulk consents: ${error}`);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to record consents',
      });
    }
  }
);

/**
 * @swagger
 * /api/privacy/consents/history:
 *   get:
 *     summary: Get consent history
 *     tags: [Privacy & Compliance]
 */
router.get('/consents/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { consentType } = req.query;

    const history = await consentService.getConsentHistory(
      userId,
      consentType as string | undefined
    );

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error(`Failed to get consent history: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consent history',
    });
  }
});

/**
 * @swagger
 * /api/privacy/data-export/request:
 *   post:
 *     summary: Request data export (GDPR Article 15)
 *     tags: [Privacy & Compliance]
 */
router.post('/data-export/request', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const exportRequest = await gdprService.requestDataExport(userId);

    res.json({
      success: true,
      message: 'Data export request submitted. You will receive an email when your data is ready.',
      data: exportRequest,
    });
  } catch (error) {
    logger.error(`Failed to request data export: ${error}`);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to request data export',
    });
  }
});

/**
 * @swagger
 * /api/privacy/data-export/status/{requestId}:
 *   get:
 *     summary: Check data export status
 *     tags: [Privacy & Compliance]
 */
router.get('/data-export/status/:requestId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const exportRequest = await gdprService.getExportRequestStatus(requestId, userId);

    if (!exportRequest) {
      return res.status(404).json({
        success: false,
        message: 'Export request not found',
      });
    }

    res.json({
      success: true,
      data: exportRequest,
    });
  } catch (error) {
    logger.error(`Failed to get export status: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve export status',
    });
  }
});

/**
 * @swagger
 * /api/privacy/data-export/download/{requestId}:
 *   get:
 *     summary: Download data export
 *     tags: [Privacy & Compliance]
 */
router.get(
  '/data-export/download/:requestId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { requestId } = req.params;

      const exportRequest = await gdprService.getExportRequestStatus(requestId, userId);

      if (!exportRequest) {
        return res.status(404).json({
          success: false,
          message: 'Export request not found',
        });
      }

      if (exportRequest.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Export is not ready yet',
        });
      }

      if (!exportRequest.file_path) {
        return res.status(404).json({
          success: false,
          message: 'Export file not found',
        });
      }

      // Check if expired
      if (exportRequest.expires_at && new Date() > new Date(exportRequest.expires_at)) {
        return res.status(410).json({
          success: false,
          message: 'Export has expired',
        });
      }

      // Log data access
      await ccpaService.logDataAccess(
        userId,
        'export',
        'all_categories',
        userId,
        'User data export download',
        req.ip
      );

      res.download(exportRequest.file_path);
    } catch (error) {
      logger.error(`Failed to download export: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Failed to download export',
      });
    }
  }
);

/**
 * @swagger
 * /api/privacy/account-deletion/request:
 *   post:
 *     summary: Request account deletion (GDPR Article 17)
 *     tags: [Privacy & Compliance]
 */
router.post('/account-deletion/request', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const deletionRequest = await gdprService.requestAccountDeletion(userId, ipAddress, userAgent);

    res.json({
      success: true,
      message: `Account deletion scheduled for ${deletionRequest.scheduled_deletion_at}. You can cancel this within the grace period.`,
      data: {
        deletionRequest,
        cancellationToken: deletionRequest.cancellation_token,
      },
    });
  } catch (error) {
    logger.error(`Failed to request account deletion: ${error}`);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to request account deletion',
    });
  }
});

/**
 * @swagger
 * /api/privacy/account-deletion/cancel:
 *   post:
 *     summary: Cancel account deletion
 *     tags: [Privacy & Compliance]
 */
router.post(
  '/account-deletion/cancel',
  authenticate,
  validate(deletionCancellationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { cancellationToken } = req.body;

      const cancelled = await gdprService.cancelAccountDeletion(userId, cancellationToken);

      res.json({
        success: true,
        message: 'Account deletion cancelled successfully',
      });
    } catch (error) {
      logger.error(`Failed to cancel account deletion: ${error}`);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel account deletion',
      });
    }
  }
);

/**
 * @swagger
 * /api/privacy/ccpa/opt-out:
 *   post:
 *     summary: Opt-out of data sale/sharing (CCPA)
 *     tags: [Privacy & Compliance]
 */
router.post(
  '/ccpa/opt-out',
  authenticate,
  validate(optOutSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { optOutType } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      let optOut;
      switch (optOutType) {
        case 'do_not_sell':
          optOut = await ccpaService.optOutOfSale(userId, ipAddress, userAgent);
          break;
        case 'do_not_share':
          optOut = await ccpaService.optOutOfSharing(userId, ipAddress, userAgent);
          break;
        case 'limit_sensitive_data':
          optOut = await ccpaService.limitSensitiveDataUse(userId, ipAddress, userAgent);
          break;
      }

      res.json({
        success: true,
        message: 'Opt-out preference recorded',
        data: optOut,
      });
    } catch (error) {
      logger.error(`Failed to record opt-out: ${error}`);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to record opt-out',
      });
    }
  }
);

/**
 * @swagger
 * /api/privacy/ccpa/opt-in:
 *   post:
 *     summary: Opt back in to data sale/sharing
 *     tags: [Privacy & Compliance]
 */
router.post(
  '/ccpa/opt-in',
  authenticate,
  validate(optOutSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { optOutType } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const optOut = await ccpaService.optInToDataUse(userId, optOutType, ipAddress, userAgent);

      res.json({
        success: true,
        message: 'Opt-in preference recorded',
        data: optOut,
      });
    } catch (error) {
      logger.error(`Failed to record opt-in: ${error}`);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to record opt-in',
      });
    }
  }
);

/**
 * @swagger
 * /api/privacy/ccpa/data-disclosure:
 *   get:
 *     summary: Get CCPA data disclosure
 *     tags: [Privacy & Compliance]
 */
router.get('/ccpa/data-disclosure', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const disclosure = await ccpaService.getDataDisclosure(userId);

    res.json({
      success: true,
      data: disclosure,
    });
  } catch (error) {
    logger.error(`Failed to get data disclosure: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve data disclosure',
    });
  }
});

/**
 * @swagger
 * /api/privacy/ccpa/access-logs:
 *   get:
 *     summary: Get data access logs (CCPA)
 *     tags: [Privacy & Compliance]
 */
router.get('/ccpa/access-logs', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const accessLogs = await ccpaService.getDataAccessLogs(userId, limit, offset);

    res.json({
      success: true,
      data: accessLogs,
    });
  } catch (error) {
    logger.error(`Failed to get access logs: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve access logs',
    });
  }
});

/**
 * @swagger
 * /api/privacy/ccpa/do-not-sell:
 *   get:
 *     summary: Do Not Sell My Personal Information page
 *     tags: [Privacy & Compliance]
 */
router.get('/ccpa/do-not-sell', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const info = await ccpaService.handleDoNotSellLink(userId);

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    logger.error(`Failed to handle do not sell link: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve information',
    });
  }
});

/**
 * @swagger
 * /api/privacy/ccpa/compliance-status:
 *   get:
 *     summary: Get CCPA compliance status
 *     tags: [Privacy & Compliance]
 */
router.get('/ccpa/compliance-status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const status = await ccpaService.getComplianceStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error(`Failed to get compliance status: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance status',
    });
  }
});


/**
 * GDPR Article 16 - Right to Rectification
 */
router.post("/rectification", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { corrections } = req.body;
    if (!corrections || typeof corrections !== "object") {
      return res.status(400).json({ success: false, message: "corrections object required" });
    }
    await db("gdpr_rectification_requests").insert({
      user_id: userId, corrections: JSON.stringify(corrections),
      status: "pending", requested_at: new Date(), ip_address: req.ip, user_agent: req.headers["user-agent"],
    });
    const allowedFields = ["first_name", "last_name", "email", "phone_number", "date_of_birth"];
    const profileFields = ["bio", "job_title", "company", "education", "city"];
    const userUpdates: Record<string, any> = {};
    const profileUpdates: Record<string, any> = {};
    for (const [field, value] of Object.entries(corrections)) {
      if (allowedFields.includes(field)) userUpdates[field] = value;
      else if (profileFields.includes(field)) profileUpdates[field] = value;
    }
    if (Object.keys(userUpdates).length > 0) await db("users").where({ id: userId }).update({ ...userUpdates, updated_at: new Date() });
    if (Object.keys(profileUpdates).length > 0) await db("profiles").where({ user_id: userId }).update({ ...profileUpdates, updated_at: new Date() });
    logger.info("GDPR rectification applied for user " + userId);
    res.json({ success: true, message: "Your data has been corrected (GDPR Article 16)." });
  } catch (error) {
    logger.error("Failed to process rectification: " + error);
    res.status(500).json({ success: false, message: "Failed to process rectification" });
  }
});

/**
 * GDPR Article 21 - Right to Object
 */
router.post("/object-processing", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { processingType, reason } = req.body;
    const validTypes = ["profiling", "marketing", "analytics", "third_party_sharing", "research"];
    if (!processingType || !validTypes.includes(processingType)) {
      return res.status(400).json({ success: false, message: "Invalid processingType" });
    }
    await db("gdpr_processing_objections").insert({
      user_id: userId, processing_type: processingType, reason: reason || null,
      status: "active", objected_at: new Date(), ip_address: req.ip, user_agent: req.headers["user-agent"],
    });
    if (processingType === "marketing") {
      await consentService.recordConsent(userId, "marketing_emails", false, req.ip, req.headers["user-agent"]);
      await consentService.recordConsent(userId, "personalized_ads", false, req.ip, req.headers["user-agent"]);
    } else if (processingType === "analytics") {
      await consentService.recordConsent(userId, "analytics", false, req.ip, req.headers["user-agent"]);
    } else if (processingType === "third_party_sharing") {
      await consentService.recordConsent(userId, "third_party_sharing", false, req.ip, req.headers["user-agent"]);
    }
    res.json({ success: true, message: "Objection recorded and applied (GDPR Article 21)." });
  } catch (error) {
    logger.error("Failed to process objection: " + error);
    res.status(500).json({ success: false, message: "Failed to process objection" });
  }
});

/**
 * GDPR Article 18 - Right to Restrict Processing
 */
router.post("/restrict-processing", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;
    const validReasons = ["accuracy_contested", "processing_unlawful", "data_needed_for_legal_claims", "objection_pending_verification"];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ success: false, message: "Invalid reason" });
    }
    await db("gdpr_processing_restrictions").insert({
      user_id: userId, reason, status: "active", restricted_at: new Date(), ip_address: req.ip, user_agent: req.headers["user-agent"],
    });
    await db("users").where({ id: userId }).update({
      processing_restricted: true, processing_restricted_at: new Date(), processing_restricted_reason: reason,
    });
    res.json({ success: true, message: "Processing restricted (GDPR Article 18)." });
  } catch (error) {
    logger.error("Failed to restrict processing: " + error);
    res.status(500).json({ success: false, message: "Failed to restrict processing" });
  }
});

router.delete("/restrict-processing", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    await db("gdpr_processing_restrictions").where({ user_id: userId, status: "active" }).update({ status: "lifted", lifted_at: new Date() });
    await db("users").where({ id: userId }).update({ processing_restricted: false, processing_restricted_at: null, processing_restricted_reason: null });
    res.json({ success: true, message: "Processing restriction lifted." });
  } catch (error) {
    logger.error("Failed to lift restriction: " + error);
    res.status(500).json({ success: false, message: "Failed to lift restriction" });
  }
});

/**
 * Global Privacy Control (GPC) signal detection - CCPA/CPRA
 */
router.get("/gpc-status", async (req: Request, res: Response) => {
  try {
    const gpcHeader = req.headers["sec-gpc"];
    const gpcEnabled = gpcHeader === "1";
    if (gpcEnabled && (req as any).user) {
      await ccpaService.optOutOfSale((req as any).user.id, req.ip, req.headers["user-agent"]);
      await ccpaService.optOutOfSharing((req as any).user.id, req.ip, req.headers["user-agent"]);
    }
    res.json({ success: true, data: { gpcDetected: gpcEnabled, message: gpcEnabled ? "GPC signal detected. Opt-out applied." : "No GPC signal." } });
  } catch (error) {
    logger.error("GPC check failed: " + error);
    res.status(500).json({ success: false, message: "Failed to process GPC" });
  }
});

export default router;

