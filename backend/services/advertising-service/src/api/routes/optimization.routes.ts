import { Router } from 'express';
import { optimizationController } from '../controllers/optimization.controller';

const router = Router();

// Feature 1: Match Prediction for Ad Timing
router.get('/match-timing/:userId', (req, res) => optimizationController.predictMatchTiming(req, res));

// Feature 2: Engagement-Based Bid Optimization
router.get('/bids/:campaignId', (req, res) => optimizationController.optimizeBids(req, res));

// Feature 3: Cross-Platform Attribution for Dating Conversions
router.get('/attribution/:conversionId', (req, res) => optimizationController.attributeConversion(req, res));

// Feature 4: Real-Time Budget Pacing
router.get('/budget-pacing/:campaignId', (req, res) => optimizationController.getBudgetPacing(req, res));

// Feature 5: Seasonal Dating Trend Optimization
router.get('/seasonal-trends', (req, res) => optimizationController.optimizeForSeasons(req, res));

// Feature 6: Device-Specific Ad Optimization
router.get('/device/:deviceType', (req, res) => optimizationController.optimizeForDevice(req, res));

// Feature 7: Frequency Capping Intelligence
router.get('/frequency-cap/:campaignId', (req, res) => optimizationController.manageFrequencyCapping(req, res));

// Feature 8: Conversion Path Analysis
router.get('/conversion-paths', (req, res) => optimizationController.analyzeConversionPaths(req, res));

// Feature 9: Predictive LTV Optimization
router.get('/ltv/:userId', (req, res) => optimizationController.predictLTV(req, res));

// Feature 10: Multi-Touch Attribution Modeling
router.get('/mta', (req, res) => optimizationController.calculateMultiTouchAttribution(req, res));

export default router;
