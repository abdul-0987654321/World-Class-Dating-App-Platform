import { Router } from 'express';
import { targetingController } from '../controllers/targeting.controller';

const router = Router();

// Feature 1: Dating Behavior Segmentation
router.post('/behavior-segment', (req, res) => targetingController.createBehaviorSegment(req, res));
router.get('/behavior/:userId', (req, res) => targetingController.analyzeDatingBehavior(req, res));

// Feature 2: Relationship Intent Targeting
router.get('/intent/:userId', (req, res) => targetingController.detectRelationshipIntent(req, res));

// Feature 3: Compatibility-Based Ad Matching
router.post('/compatibility-match', (req, res) => targetingController.matchAdToUser(req, res));

// Feature 4: Life Stage Segmentation
router.get('/life-stage/:userId', (req, res) => targetingController.classifyLifeStage(req, res));

// Feature 5: Profile Quality Scoring for Ad Tiers
router.get('/profile-tier/:userId', (req, res) => targetingController.calculateProfileQualityTier(req, res));

// Feature 6: Geographic Dating Market Targeting
router.post('/geo-market', (req, res) => targetingController.analyzeGeoDatingMarket(req, res));

// Feature 7: Activity Time Window Targeting
router.get('/activity-windows/:userId', (req, res) => targetingController.analyzeActivityPatterns(req, res));

// Feature 8: Subscription Tier Targeting
router.get('/subscription-tier/:tier', (req, res) => targetingController.getSubscriptionTierTargeting(req, res));

// Feature 9: Interest Graph for Cross-Category Targeting
router.get('/interest-graph/:userId', (req, res) => targetingController.buildInterestGraph(req, res));

// Feature 10: Lookalike Audience Builder
router.post('/lookalike', (req, res) => targetingController.buildLookalikeAudience(req, res));

export default router;
