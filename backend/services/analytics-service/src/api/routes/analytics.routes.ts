/**
 * Analytics API Routes
 *
 * These endpoints provide aggregated analytics data.
 * All endpoints require admin authentication (JWT with admin role)
 * or internal service authentication.
 */

import { Router } from 'express';
import {
  getFunnelConversionRates,
  getAttributionSummary,
  getEventsBySource,
  getDropoffAnalysis,
  getAverageTimings,
} from '../controllers/analytics.controller';
import {
  authenticate,
  requireAdmin,
  authenticateInternal,
} from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * Middleware that allows either admin JWT or internal service authentication
 * Analytics data is sensitive - only admins or internal services should access it
 */
const adminOrInternal = async (req: Request, res: Response, next: NextFunction) => {
  // Check for internal service key first
  const serviceKey = req.headers['x-service-key'] as string;
  if (serviceKey) {
    return authenticateInternal(req, res, next);
  }

  // Fall back to JWT + admin role check
  await authenticate(req, res, async () => {
    await requireAdmin(req, res, next);
  });
};

// Funnel analytics - Admin or internal service access only
router.get('/funnel/conversion-rates', adminOrInternal, getFunnelConversionRates);
router.get('/funnel/dropoff', adminOrInternal, getDropoffAnalysis);
router.get('/funnel/timings', adminOrInternal, getAverageTimings);

// Attribution analytics - Admin or internal service access only
router.get('/attribution/summary', adminOrInternal, getAttributionSummary);
router.get('/attribution/by-model/:model', adminOrInternal, getAttributionSummary); // first_touch or last_touch

// Event analytics - Admin or internal service access only
router.get('/events/by-source', adminOrInternal, getEventsBySource);

export default router;
