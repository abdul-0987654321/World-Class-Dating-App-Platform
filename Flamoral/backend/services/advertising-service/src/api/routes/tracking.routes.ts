import { Router } from 'express';
import { trackingController } from '../controllers/tracking.controller';

const router = Router();

// Impression Tracking
router.post('/impression/:impressionToken', (req, res) => trackingController.trackImpression(req, res));

// Click Tracking
router.post('/click/:impressionToken', (req, res) => trackingController.trackClick(req, res));

// Conversion Tracking
router.post('/conversion/:clickToken', (req, res) => trackingController.trackConversion(req, res));

// Statistics
router.get('/stats/ad/:adId', (req, res) => trackingController.getAdStats(req, res));
router.get('/stats/campaign/:campaignId', (req, res) => trackingController.getCampaignStats(req, res));
router.get('/stats/campaign/:campaignId/hourly', (req, res) => trackingController.getHourlyBreakdown(req, res));

// User Engagement
router.get('/engagement/user/:userId', (req, res) => trackingController.getUserEngagementMetrics(req, res));

// Fraud Detection
router.post('/fraud/detect', (req, res) => trackingController.detectFraud(req, res));

export default router;
