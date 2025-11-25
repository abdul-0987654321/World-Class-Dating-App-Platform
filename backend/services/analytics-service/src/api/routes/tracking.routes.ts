/**
 * Tracking API Routes
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

const router = Router();

// Event tracking
router.post('/event', trackEvent);
router.post('/events', trackEventBatch);

// Attribution tracking
router.post('/attribution', createOrUpdateAttribution);
router.post('/attribution/registration', createOrUpdateAttribution); // Alias for registration

// Session tracking
router.post('/session', createSession);
router.put('/session/:sessionId', updateSession);

// Funnel tracking
router.post('/funnel/step', updateFunnelStep);

export default router;
