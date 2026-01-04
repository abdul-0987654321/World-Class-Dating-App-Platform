import express, { Request, Response } from 'express';
import { DatePlannerService } from '../../domain/services/date-planner.service';
import { createLogger } from '@flamoral/backend-shared';

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

/**
 * Generate date plan suggestions
 * POST /api/v1/partnerships/date-plans/generate
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
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
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: latitude, longitude, date',
      });
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
  } catch (error: any) {
    logger.error('Generate date plans failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get saved date plan suggestions for user
 * GET /api/v1/partnerships/date-plans
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
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
  } catch (error: any) {
    logger.error('Get date plans failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Quick date ideas (no auth required)
 * GET /api/v1/partnerships/date-plans/quick-ideas
 */
router.get('/quick-ideas', async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, budget, vibe } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: latitude, longitude',
      });
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
  } catch (error: any) {
    logger.error('Quick date ideas failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
