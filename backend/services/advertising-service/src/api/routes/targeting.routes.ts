import { Router } from 'express';

import { targetingController } from '../controllers/targeting.controller';
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
// ============================================================================

// Feature 1: Dating Behavior Segmentation
router.post('/behavior-segment', authenticateJWT, requireAdvertiser, (req, res) =>
  targetingController.createBehaviorSegment(req, res)
);

// Feature 6: Geographic Dating Market Targeting
router.post('/geo-market', authenticateJWT, requireAdvertiser, (req, res) =>
  targetingController.analyzeGeoDatingMarket(req, res)
);

// Feature 10: Lookalike Audience Builder
router.post('/lookalike', authenticateJWT, requireAdvertiser, (req, res) =>
  targetingController.buildLookalikeAudience(req, res)
);

// Feature 3: Compatibility-Based Ad Matching
router.post('/compatibility-match', authenticateJWT, requireAdvertiser, (req, res) =>
  targetingController.matchAdToUser(req, res)
);

// ============================================================================
// Internal Service Routes - Require service API key
// These are used by other services (matching, user-service) to get user data
// ============================================================================

// Feature 1: Analyze user dating behavior (internal service use)
router.get('/behavior/:userId', authenticateService, (req, res) =>
  targetingController.analyzeDatingBehavior(req, res)
);

// Feature 2: Relationship Intent Targeting (internal service use)
router.get('/intent/:userId', authenticateService, (req, res) =>
  targetingController.detectRelationshipIntent(req, res)
);

// Feature 4: Life Stage Segmentation (internal service use)
router.get('/life-stage/:userId', authenticateService, (req, res) =>
  targetingController.classifyLifeStage(req, res)
);

// Feature 5: Profile Quality Scoring for Ad Tiers (internal service use)
router.get('/profile-tier/:userId', authenticateService, (req, res) =>
  targetingController.calculateProfileQualityTier(req, res)
);

// Feature 7: Activity Time Window Targeting (internal service use)
router.get('/activity-windows/:userId', authenticateService, (req, res) =>
  targetingController.analyzeActivityPatterns(req, res)
);

// Feature 9: Interest Graph for Cross-Category Targeting (internal service use)
router.get('/interest-graph/:userId', authenticateService, (req, res) =>
  targetingController.buildInterestGraph(req, res)
);

// ============================================================================
// Public Routes - Rate-limited, no authentication required
// ============================================================================

// Feature 8: Subscription Tier Targeting (public reference data)
router.get('/subscription-tier/:tier', rateLimiter, (req, res) =>
  targetingController.getSubscriptionTierTargeting(req, res)
);

export default router;
