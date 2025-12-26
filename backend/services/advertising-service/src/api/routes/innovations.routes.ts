import { Router } from 'express';
import { innovationsController } from '../controllers/innovations.controller';
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
// These are used by advertisers to create innovative ad campaigns
// ============================================================================

// Feature 2: First Date Sponsor Integration
router.post('/first-date-sponsors', authenticateJWT, requireAdvertiser, (req, res) => innovationsController.getFirstDateSponsors(req, res));

// Feature 3: Compatibility-Triggered Promotions
router.post('/compatibility-promotion', authenticateJWT, requireAdvertiser, (req, res) => innovationsController.triggerCompatibilityPromotion(req, res));

// Feature 7: Singles Event Discovery Ads
router.post('/singles-events', authenticateJWT, requireAdvertiser, (req, res) => innovationsController.discoverSinglesEvents(req, res));

// ============================================================================
// Admin Routes - Require admin role
// These are used for platform-wide advertising management
// ============================================================================

// Feature 1: "Ready to Mingle" Status Ads (admin audience management)
router.get('/ready-to-mingle', authenticateJWT, requireAdmin, (req, res) => innovationsController.getReadyToMingleAudience(req, res));

// ============================================================================
// Internal Service Routes - Require service API key
// These are used by other services for real-time ad serving
// ============================================================================

// Feature 6: Relationship Milestone Advertising (used by notification/matching services)
router.get('/milestone-ads/:userId', authenticateService, (req, res) => innovationsController.getMilestoneAds(req, res));

// Feature 8: Premium Feature Upsell Moments (used by subscription/billing services)
router.post('/upsell-moment', authenticateService, (req, res) => innovationsController.detectUpsellMoment(req, res));

// ============================================================================
// Public Routes - Rate-limited, no authentication required
// These are used to serve ads to end users
// ============================================================================

// Feature 4: Profile Boost Marketplace Ads (public ad serving)
router.get('/boost-marketplace', rateLimiter, (req, res) => innovationsController.getBoostMarketplace(req, res));

// Feature 5: Dating Event Sponsorship Platform (public ad serving)
router.get('/event-sponsorships', rateLimiter, (req, res) => innovationsController.getEventSponsorships(req, res));

// Feature 9: Date Night Planning Partner Ads (public ad serving)
router.get('/date-night-planning', rateLimiter, (req, res) => innovationsController.getDateNightPlanning(req, res));

// Feature 10: Influencer Dating Tips Integration (public content serving)
router.get('/influencer-content', rateLimiter, (req, res) => innovationsController.getInfluencerContent(req, res));

export default router;
