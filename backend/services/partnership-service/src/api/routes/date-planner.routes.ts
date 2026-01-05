import { createLogger } from '@flamoral/backend-shared';
import express, { Request, Response, RequestHandler } from 'express';

import { DatePlannerService } from '../../domain/services/date-planner.service';

const router = express.Router();
const logger = createLogger('date-planner-routes');
const datePlannerService = new DatePlannerService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role?: 'user' | 'admin' | 'moderator' | 'support';
  };
}

// Helper to wrap async handlers
const asyncHandler = (fn: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthRequest, res)).catch(next);
  };
};

/**
 * Generate date plan suggestions
 * POST /api/v1/partnerships/date-plans/generate
 */
router.post('/generate', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const {
    latitude,
    longitude,
    date,
    matchId,
    budget,
    duration,
    vibe,
    includeFood,
    includeActivity,
    includeGift,
    specificInterests,
  } = req.body;

  if (!latitude || !longitude || !date) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: latitude, longitude, date',
    });
    return;
  }

  const suggestions = await datePlannerService.generateDatePlans(
    req.user.id,
    matchId,
    parseFloat(latitude),
    parseFloat(longitude),
    date,
    {
      budget: budget ? parseFloat(budget) : undefined,
      duration,
      vibe,
      includeFood,
      includeActivity,
      includeGift,
      specificInterests,
    }
  );

  res.json({
    success: true,
    data: suggestions,
  });
}));

/**
 * Get saved date plan suggestions for user
 * GET /api/v1/partnerships/date-plans
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { matchId } = req.query;

  const suggestions = await datePlannerService.getUserSuggestions(
    req.user.id,
    matchId as string | undefined
  );

  res.json({
    success: true,
    data: suggestions,
  });
}));

/**
 * Quick date ideas (no auth required)
 * GET /api/v1/partnerships/date-plans/quick-ideas
 */
router.get('/quick-ideas', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, budget, vibe } = req.query;

  if (!latitude || !longitude) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: latitude, longitude',
    });
    return;
  }

  const userId = req.user?.id || 'anonymous';
  const date = new Date().toISOString().split('T')[0];

  const suggestions = await datePlannerService.generateDatePlans(
    userId,
    undefined,
    parseFloat(latitude as string),
    parseFloat(longitude as string),
    date,
    {
      budget: budget ? parseFloat(budget as string) : 100,
      vibe: (vibe as any) || 'casual',
    }
  );

  // Return just the first suggestion for quick ideas
  res.json({
    success: true,
    data: suggestions.slice(0, 2),
  });
}));

export default router;
