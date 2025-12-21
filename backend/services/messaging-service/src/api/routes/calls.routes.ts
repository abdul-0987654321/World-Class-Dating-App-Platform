/**
 * Calls Routes
 * Routes for audio/video calling functionality
 */

import { Router } from 'express';
import { callsController } from '../controllers/calls.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All call routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/calls/request
 * Request a call with another user
 *
 * Body: { calleeId: string, callType: 'video' | 'audio' }
 */
router.post('/request', callsController.requestCall.bind(callsController));

/**
 * POST /api/v1/calls/accept
 * Accept an incoming call
 *
 * Body: { callId: string }
 */
router.post('/accept', callsController.acceptCall.bind(callsController));

/**
 * POST /api/v1/calls/reject
 * Reject an incoming call
 *
 * Body: { callId: string, reason?: string }
 */
router.post('/reject', callsController.rejectCall.bind(callsController));

/**
 * POST /api/v1/calls/end
 * End an active call
 *
 * Body: { callId: string, duration?: number }
 */
router.post('/end', callsController.endCall.bind(callsController));

/**
 * GET /api/v1/calls/history
 * Get call history for the authenticated user
 *
 * Query: limit?, offset?
 */
router.get('/history', callsController.getCallHistory.bind(callsController));

/**
 * GET /api/v1/calls/availability/:userId
 * Check if a user is available for a call
 */
router.get('/availability/:userId', callsController.checkAvailability.bind(callsController));

/**
 * GET /api/v1/calls/:callId
 * Get status of a specific call
 */
router.get('/:callId', callsController.getCallStatus.bind(callsController));

export default router;
