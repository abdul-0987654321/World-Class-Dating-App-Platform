import { Router } from 'express';
import { adServingController } from '../controllers/ad-serving.controller';

const router = Router();

// Ad Serving
router.post('/serve', (req, res) => adServingController.serveAds(req, res));

// Campaign Management
router.get('/campaigns', (req, res) => adServingController.getActiveCampaigns(req, res));
router.post('/campaigns', (req, res) => adServingController.createCampaign(req, res));
router.put('/campaigns/:campaignId', (req, res) => adServingController.updateCampaign(req, res));

// Ad Management
router.get('/ads/:adId', (req, res) => adServingController.getAdById(req, res));
router.post('/ads', (req, res) => adServingController.createAd(req, res));
router.put('/ads/:adId', (req, res) => adServingController.updateAd(req, res));

export default router;
