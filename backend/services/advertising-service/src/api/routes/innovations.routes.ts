import { Router } from 'express';
import { innovationsController } from '../controllers/innovations.controller';

const router = Router();

// Feature 1: "Ready to Mingle" Status Ads
router.get('/ready-to-mingle', (req, res) => innovationsController.getReadyToMingleAudience(req, res));

// Feature 2: First Date Sponsor Integration
router.post('/first-date-sponsors', (req, res) => innovationsController.getFirstDateSponsors(req, res));

// Feature 3: Compatibility-Triggered Promotions
router.post('/compatibility-promotion', (req, res) => innovationsController.triggerCompatibilityPromotion(req, res));

// Feature 4: Profile Boost Marketplace Ads
router.get('/boost-marketplace', (req, res) => innovationsController.getBoostMarketplace(req, res));

// Feature 5: Dating Event Sponsorship Platform
router.get('/event-sponsorships', (req, res) => innovationsController.getEventSponsorships(req, res));

// Feature 6: Relationship Milestone Advertising
router.get('/milestone-ads/:userId', (req, res) => innovationsController.getMilestoneAds(req, res));

// Feature 7: Singles Event Discovery Ads
router.post('/singles-events', (req, res) => innovationsController.discoverSinglesEvents(req, res));

// Feature 8: Premium Feature Upsell Moments
router.post('/upsell-moment', (req, res) => innovationsController.detectUpsellMoment(req, res));

// Feature 9: Date Night Planning Partner Ads
router.get('/date-night-planning', (req, res) => innovationsController.getDateNightPlanning(req, res));

// Feature 10: Influencer Dating Tips Integration
router.get('/influencer-content', (req, res) => innovationsController.getInfluencerContent(req, res));

export default router;
