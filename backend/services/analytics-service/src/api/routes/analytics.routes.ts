/**
 * Analytics API Routes
 */

import { Router } from 'express';
import {
  getFunnelConversionRates,
  getAttributionSummary,
  getEventsBySource,
  getDropoffAnalysis,
  getAverageTimings,
} from '../controllers/analytics.controller';

const router = Router();

// Funnel analytics
router.get('/funnel/conversion-rates', getFunnelConversionRates);
router.get('/funnel/dropoff', getDropoffAnalysis);
router.get('/funnel/timings', getAverageTimings);

// Attribution analytics
router.get('/attribution/summary', getAttributionSummary);
router.get('/attribution/by-model/:model', getAttributionSummary); // first_touch or last_touch

// Event analytics
router.get('/events/by-source', getEventsBySource);

export default router;
