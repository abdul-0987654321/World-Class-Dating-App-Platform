/**
 * Tracking API Routes
 *
 * These routes are primarily for internal service-to-service communication.
 * All endpoints require internal service authentication (X-Service-Key header).
 */

import { Router } from 'express';
import {
  trackEvent,
  trackEventBatch,
  createOrUpdateAttribution,
  createSession,
  updateSession,
  updateFunnelStep,
} from '../controllers/tracking.controller';
import { authenticateInternal } from '../middleware/auth.middleware';

const router = Router();

// Apply internal service authentication to all tracking routes
// These endpoints are called by other Flamoral services (user-service, matching-service, etc.)

// Event tracking
router.post('/event', authenticateInternal, trackEvent);
router.post('/events', authenticateInternal, trackEventBatch);

// Attribution tracking
router.post('/attribution', authenticateInternal, createOrUpdateAttribution);
router.post('/attribution/registration', authenticateInternal, createOrUpdateAttribution); // Alias for registration

// Session tracking
router.post('/session', authenticateInternal, createSession);
router.put('/session/:sessionId', authenticateInternal, updateSession);

// Funnel tracking
router.post('/funnel/step', authenticateInternal, updateFunnelStep);

export default router;
