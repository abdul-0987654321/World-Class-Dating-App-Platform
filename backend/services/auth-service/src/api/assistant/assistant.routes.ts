/**
 * FLAMORAL AI Assistant - Routes
 * Express routes with authentication and rate limiting
 */

import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { assistantController } from './assistant.controller';
import { authenticate as authMiddleware } from '../middleware/auth.middleware';
import { AssistantError } from './assistant.types';

const router = Router();

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * General rate limiter for assistant endpoints
 * More restrictive than general API to prevent abuse
 */
const assistantRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: {
      code: 'ASSISTANT_RATE_LIMIT',
      message: 'Too many requests. Please slow down.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).user?.id || req.ip || 'unknown';
  },
});

/**
 * Stricter rate limiter for message endpoints
 */
const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute
  message: {
    success: false,
    error: {
      code: 'ASSISTANT_RATE_LIMIT',
      message: 'Message limit reached. Please wait a moment.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip || 'unknown';
  },
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Assistant-specific error handler
 */
const assistantErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AssistantError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      },
    });
  }

  // Pass to global error handler
  next(err);
};

// ============================================================================
// ROUTES
// ============================================================================

// Apply general rate limiter to all assistant routes
router.use(assistantRateLimiter);

/**
 * @route   GET /api/v1/assistant/contexts
 * @desc    Get available assistant contexts
 * @access  Public (for UI display)
 */
router.get('/contexts', (req, res) => assistantController.getContexts(req as any, res));

/**
 * @route   POST /api/v1/assistant/message
 * @desc    Send a message and get AI response
 * @access  Private (requires authentication)
 */
router.post(
  '/message',
  authMiddleware,
  messageRateLimiter,
  (req, res, next) => assistantController.sendMessage(req as any, res, next)
);

/**
 * @route   POST /api/v1/assistant/stream
 * @desc    Send a message and stream AI response (SSE)
 * @access  Private (requires authentication)
 */
router.post(
  '/stream',
  authMiddleware,
  messageRateLimiter,
  (req, res, next) => assistantController.streamMessage(req as any, res, next)
);

/**
 * @route   GET /api/v1/assistant/history/:sessionId
 * @desc    Get conversation history for a session
 * @access  Private (requires authentication)
 */
router.get(
  '/history/:sessionId',
  authMiddleware,
  (req, res, next) => assistantController.getHistory(req as any, res, next)
);

/**
 * @route   DELETE /api/v1/assistant/history/:sessionId
 * @desc    Clear conversation history for a session
 * @access  Private (requires authentication)
 */
router.delete(
  '/history/:sessionId',
  authMiddleware,
  (req, res, next) => assistantController.clearHistory(req as any, res, next)
);

/**
 * @route   GET /api/v1/assistant/sessions
 * @desc    Get all sessions for current user
 * @access  Private (requires authentication)
 */
router.get(
  '/sessions',
  authMiddleware,
  (req, res, next) => assistantController.getSessions(req as any, res, next)
);

/**
 * @route   GET /api/v1/assistant/usage
 * @desc    Get usage statistics for current user
 * @access  Private (requires authentication)
 */
router.get(
  '/usage',
  authMiddleware,
  (req, res, next) => assistantController.getUsage(req as any, res, next)
);

/**
 * @route   POST /api/v1/assistant/feedback
 * @desc    Submit feedback for a message
 * @access  Private (requires authentication)
 */
router.post(
  '/feedback',
  authMiddleware,
  (req, res, next) => assistantController.submitFeedback(req as any, res, next)
);

// Apply error handler
router.use(assistantErrorHandler);

export default router;
