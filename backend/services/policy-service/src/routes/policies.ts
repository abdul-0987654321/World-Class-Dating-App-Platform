/**
 * Policy Service API Routes
 *
 * Handles all policy-related API endpoints including retrieval,
 * version management, and policy comparison.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

import { PolicyController } from '../controllers/policyController';
import { UpdateController } from '../controllers/updateController';
import { VersionController } from '../controllers/versionController';
import {
  authMiddleware,
  apiKeyMiddleware,
  authenticateJWT,
  internalApiKeyAuth,
  requireAdmin,
  optionalAuth,
  AuthenticatedRequest,
} from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { logger } from '../utils/logger';

const router = Router();
const policyController = new PolicyController();
const versionController = new VersionController();
const updateController = new UpdateController();

/**
 * Validation middleware
 */
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Error handler wrapper
 */
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * PUBLIC ENDPOINTS - Policy Retrieval
 */

/**
 * GET /api/policies/:region/:policyType
 *
 * Retrieve the current policy for a specific region and type
 *
 * @param region - Region code (e.g., 'us/california', 'eu', 'uk')
 * @param policyType - Type of policy ('privacy', 'terms', 'cookie', 'community-guidelines')
 * @query language - Language code (default: 'en')
 * @query format - Response format ('json', 'markdown', 'html')
 * @query version - Specific version to retrieve (optional)
 */
router.get(
  '/policies/:region/:policyType',
  [
    param('region').isString().notEmpty().withMessage('Region is required'),
    param('policyType')
      .isIn(['privacy', 'terms', 'cookie', 'community-guidelines', 'content', 'dpa'])
      .withMessage('Invalid policy type'),
    query('language').optional().isString().isLength({ min: 2, max: 2 }),
    query('format').optional().isIn(['json', 'markdown', 'html']),
    query('version')
      .optional()
      .isString()
      .matches(/^\d+\.\d+\.\d+$/),
  ],
  validateRequest,
  rateLimitMiddleware({ windowMs: 60000, max: 100 }), // 100 requests per minute
  cacheMiddleware({ ttl: 300 }), // Cache for 5 minutes
  asyncHandler(async (req: Request, res: Response) => {
    const { region, policyType } = req.params;
    const { language = 'en', format = 'json', version } = req.query;

    logger.info('Policy retrieval request', {
      region,
      policyType,
      language,
      format,
      version,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const policy = await policyController.getPolicy({
      region: region,
      policyType: policyType,
      language: language as string,
      format: format as string,
      version: version as string | undefined,
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        message: `No policy found for region '${region}' and type '${policyType}'`,
      });
    }

    res.status(200).json({
      success: true,
      data: policy,
    });
  })
);

/**
 * GET /api/policies/:region/:policyType/summary
 *
 * Get executive summary of a policy
 */
router.get(
  '/policies/:region/:policyType/summary',
  [
    param('region').isString().notEmpty(),
    param('policyType').isIn([
      'privacy',
      'terms',
      'cookie',
      'community-guidelines',
      'content',
      'dpa',
    ]),
    query('language').optional().isString().isLength({ min: 2, max: 2 }),
  ],
  validateRequest,
  rateLimitMiddleware({ windowMs: 60000, max: 100 }),
  cacheMiddleware({ ttl: 600 }), // Cache for 10 minutes
  asyncHandler(async (req: Request, res: Response) => {
    const { region, policyType } = req.params;
    const { language = 'en' } = req.query;

    const summary = await policyController.getPolicySummary({
      region: region,
      policyType: policyType,
      language: language as string,
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    res.status(200).json({
      success: true,
      data: summary,
    });
  })
);

/**
 * GET /api/policies/:region/:policyType/versions
 *
 * Get version history for a policy
 */
router.get(
  '/policies/:region/:policyType/versions',
  [
    param('region').isString().notEmpty(),
    param('policyType').isIn([
      'privacy',
      'terms',
      'cookie',
      'community-guidelines',
      'content',
      'dpa',
    ]),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  rateLimitMiddleware({ windowMs: 60000, max: 50 }),
  cacheMiddleware({ ttl: 600 }),
  asyncHandler(async (req: Request, res: Response) => {
    const { region, policyType } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const versions = await versionController.getVersionHistory({
      region: region,
      policyType: policyType,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.status(200).json({
      success: true,
      data: versions,
    });
  })
);

/**
 * GET /api/policies/:region/:policyType/diff/:v1/:v2
 *
 * Compare two versions of a policy
 */
router.get(
  '/policies/:region/:policyType/diff/:v1/:v2',
  [
    param('region').isString().notEmpty(),
    param('policyType').isIn([
      'privacy',
      'terms',
      'cookie',
      'community-guidelines',
      'content',
      'dpa',
    ]),
    param('v1')
      .matches(/^\d+\.\d+\.\d+$/)
      .withMessage('Invalid version format for v1'),
    param('v2')
      .matches(/^\d+\.\d+\.\d+$/)
      .withMessage('Invalid version format for v2'),
    query('format').optional().isIn(['json', 'unified', 'split']),
  ],
  validateRequest,
  rateLimitMiddleware({ windowMs: 60000, max: 30 }),
  cacheMiddleware({ ttl: 3600 }), // Cache for 1 hour
  asyncHandler(async (req: Request, res: Response) => {
    const { region, policyType, v1, v2 } = req.params;
    const { format = 'json' } = req.query;

    const diff = await versionController.compareVersions({
      region: region,
      policyType: policyType,
      version1: v1,
      version2: v2,
      format: format as string,
    });

    if (!diff) {
      return res.status(404).json({
        success: false,
        error: 'One or both versions not found',
      });
    }

    res.status(200).json({
      success: true,
      data: diff,
    });
  })
);

/**
 * GET /api/policies/regions
 *
 * Get list of all supported regions
 */
router.get(
  '/policies/regions',
  rateLimitMiddleware({ windowMs: 60000, max: 100 }),
  cacheMiddleware({ ttl: 3600 }),
  asyncHandler(async (req: Request, res: Response) => {
    const regions = await policyController.getSupportedRegions();

    res.status(200).json({
      success: true,
      data: regions,
    });
  })
);

/**
 * GET /api/policies/types
 *
 * Get list of all policy types
 */
router.get(
  '/policies/types',
  rateLimitMiddleware({ windowMs: 60000, max: 100 }),
  cacheMiddleware({ ttl: 3600 }),
  asyncHandler(async (req: Request, res: Response) => {
    const types = await policyController.getPolicyTypes();

    res.status(200).json({
      success: true,
      data: types,
    });
  })
);

/**
 * ADMINISTRATIVE ENDPOINTS
 * Require API key authentication for internal services
 * or JWT authentication with admin role for admin users
 */

/**
 * POST /api/policies/update
 *
 * Trigger a policy update (manual or automated)
 * Requires internal API key authentication
 */
router.post(
  '/policies/update',
  internalApiKeyAuth,
  [
    body('source').isIn(['manual', 'automated']).withMessage('Invalid source'),
    body('legalChange').optional().isObject(),
    body('legalChange.jurisdiction').optional().isString(),
    body('legalChange.law').optional().isString(),
    body('legalChange.changeType')
      .optional()
      .isIn(['enactment', 'amendment', 'repeal', 'guidance']),
    body('legalChange.effectiveDate').optional().isISO8601(),
    body('legalChange.description').optional().isString(),
    body('legalChange.sourceUrl').optional().isURL(),
    body('affectedPolicies').isArray().notEmpty(),
    body('updateInstructions').optional().isString(),
    body('region').isString().notEmpty(),
    body('policyType').isIn([
      'privacy',
      'terms',
      'cookie',
      'community-guidelines',
      'content',
      'dpa',
    ]),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Policy update triggered', {
      source: req.body.source,
      region: req.body.region,
      policyType: req.body.policyType,
      apiKey: req.headers['x-api-key'],
    });

    const result = await updateController.triggerUpdate(req.body);

    res.status(202).json({
      success: true,
      message: 'Update initiated',
      data: result,
    });
  })
);

/**
 * GET /api/policies/monitoring/status
 *
 * Get monitoring status for all legal sources
 * Requires internal API key authentication
 */
router.get(
  '/policies/monitoring/status',
  internalApiKeyAuth,
  rateLimitMiddleware({ windowMs: 60000, max: 30 }),
  asyncHandler(async (req: Request, res: Response) => {
    const status = await updateController.getMonitoringStatus();

    res.status(200).json({
      success: true,
      data: status,
    });
  })
);

/**
 * POST /api/policies/validate
 *
 * Validate policy content against schema
 * Requires internal API key authentication
 */
router.post(
  '/policies/validate',
  internalApiKeyAuth,
  [
    body('content').isString().notEmpty(),
    body('region').isString().notEmpty(),
    body('policyType').isIn([
      'privacy',
      'terms',
      'cookie',
      'community-guidelines',
      'content',
      'dpa',
    ]),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const validation = await policyController.validatePolicy(req.body);

    res.status(200).json({
      success: true,
      data: validation,
    });
  })
);

/**
 * POST /api/policies/publish
 *
 * Publish a reviewed and approved policy update
 * Requires JWT authentication with admin role
 */
router.post(
  '/policies/publish',
  authenticateJWT,
  requireAdmin,
  [
    body('policyId').isString().notEmpty(),
    body('version').matches(/^\d+\.\d+\.\d+$/),
    body('effectiveDate').isISO8601(),
    body('notifyUsers').isBoolean(),
    body('requireConsent').isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Policy publication request', {
      policyId: req.body.policyId,
      version: req.body.version,
      user: req.user?.id,
    });

    const result = await updateController.publishPolicy(req.body);

    res.status(200).json({
      success: true,
      message: 'Policy published successfully',
      data: result,
    });
  })
);

/**
 * GET /api/policies/pending
 *
 * Get all policies pending review
 * Requires JWT authentication with admin role
 */
router.get(
  '/policies/pending',
  authenticateJWT,
  requireAdmin,
  rateLimitMiddleware({ windowMs: 60000, max: 50 }),
  asyncHandler(async (req: Request, res: Response) => {
    const pending = await updateController.getPendingPolicies();

    res.status(200).json({
      success: true,
      data: pending,
    });
  })
);

/**
 * POST /api/policies/review
 *
 * Submit review for a policy update
 * Requires JWT authentication with admin role
 */
router.post(
  '/policies/review',
  authenticateJWT,
  requireAdmin,
  [
    body('policyId').isString().notEmpty(),
    body('version').matches(/^\d+\.\d+\.\d+$/),
    body('status').isIn(['approved', 'rejected', 'needs-revision']),
    body('comments').optional().isString(),
    body('reviewer').isString().notEmpty(),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Policy review submitted', {
      policyId: req.body.policyId,
      version: req.body.version,
      status: req.body.status,
      reviewer: req.body.reviewer,
    });

    const result = await updateController.submitReview(req.body);

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/policies/audit-log
 *
 * Get audit log of all policy changes
 * Requires JWT authentication with admin role
 */
router.get(
  '/policies/audit-log',
  authenticateJWT,
  requireAdmin,
  [
    query('region').optional().isString(),
    query('policyType').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  rateLimitMiddleware({ windowMs: 60000, max: 30 }),
  asyncHandler(async (req: Request, res: Response) => {
    const auditLog = await versionController.getAuditLog(req.query);

    res.status(200).json({
      success: true,
      data: auditLog,
    });
  })
);

/**
 * POST /api/policies/translation/request
 *
 * Request translation for a policy
 * Requires JWT authentication with admin role
 */
router.post(
  '/policies/translation/request',
  authenticateJWT,
  requireAdmin,
  [
    body('policyId').isString().notEmpty(),
    body('version').matches(/^\d+\.\d+\.\d+$/),
    body('targetLanguages').isArray().notEmpty(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Translation request', {
      policyId: req.body.policyId,
      version: req.body.version,
      targetLanguages: req.body.targetLanguages,
    });

    const result = await updateController.requestTranslation(req.body);

    res.status(202).json({
      success: true,
      message: 'Translation request submitted',
      data: result,
    });
  })
);

/**
 * GET /api/policies/translation/status
 *
 * Get status of translation requests
 * Requires JWT authentication with admin role
 */
router.get(
  '/policies/translation/status',
  authenticateJWT,
  requireAdmin,
  rateLimitMiddleware({ windowMs: 60000, max: 50 }),
  asyncHandler(async (req: Request, res: Response) => {
    const status = await updateController.getTranslationStatus();

    res.status(200).json({
      success: true,
      data: status,
    });
  })
);

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: 'policy-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error handling middleware
 */
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Route error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

export default router;
