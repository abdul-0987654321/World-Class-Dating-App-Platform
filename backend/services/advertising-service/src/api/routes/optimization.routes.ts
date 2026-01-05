import { Router } from 'express';

import { optimizationController } from '../controllers/optimization.controller';
import {
  authenticateJWT,
  requireAdvertiser,
  requireAdmin,
  authenticateService,
  rateLimiter,
} from '../middleware/auth.middleware';

const router = Router();

// ============================================================================
// Advertiser Routes - Require authenticated advertiser
// These are used by advertisers to manage campaign optimization
// ============================================================================

// Feature 2: Engagement-Based Bid Optimization
router.get('/bids/:campaignId', authenticateJWT, requireAdvertiser, (req, res) =>
  optimizationController.optimizeBids(req, res)
);

// Feature 4: Real-Time Budget Pacing
router.get('/budget-pacing/:campaignId', authenticateJWT, requireAdvertiser, (req, res) =>
  optimizationController.getBudgetPacing(req, res)
);

// Feature 7: Frequency Capping Intelligence
router.get('/frequency-cap/:campaignId', authenticateJWT, requireAdvertiser, (req, res) =>
  optimizationController.manageFrequencyCapping(req, res)
);

// Feature 3: Cross-Platform Attribution for Dating Conversions
router.get('/attribution/:conversionId', authenticateJWT, requireAdvertiser, (req, res) =>
  optimizationController.attributeConversion(req, res)
);

// Feature 8: Conversion Path Analysis
router.get('/conversion-paths', authenticateJWT, requireAdvertiser, (req, res) =>
  optimizationController.analyzeConversionPaths(req, res)
);

// Feature 10: Multi-Touch Attribution Modeling
router.get('/mta', authenticateJWT, requireAdvertiser, (req, res) =>
  optimizationController.calculateMultiTouchAttribution(req, res)
);

// ============================================================================
// Admin Routes - Require admin role
// These are used for platform-wide optimization insights
// ============================================================================

// Feature 5: Seasonal Dating Trend Optimization (admin analytics)
router.get('/seasonal-trends', authenticateJWT, requireAdmin, (req, res) =>
  optimizationController.optimizeForSeasons(req, res)
);

// ============================================================================
// Internal Service Routes - Require service API key
// These are used by other services for real-time optimization
// ============================================================================

// Feature 1: Match Prediction for Ad Timing (used by ad-serving system)
router.get('/match-timing/:userId', authenticateService, (req, res) =>
  optimizationController.predictMatchTiming(req, res)
);

// Feature 9: Predictive LTV Optimization (used by billing/subscription services)
router.get('/ltv/:userId', authenticateService, (req, res) =>
  optimizationController.predictLTV(req, res)
);

// ============================================================================
// Public Routes - Rate-limited, no authentication required
// These provide reference data for external use
// ============================================================================

// Feature 6: Device-Specific Ad Optimization (public reference data)
router.get('/device/:deviceType', rateLimiter, (req, res) =>
  optimizationController.optimizeForDevice(req, res)
);

export default router;
