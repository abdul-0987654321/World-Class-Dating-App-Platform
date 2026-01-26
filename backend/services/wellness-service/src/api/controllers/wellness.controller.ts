/**
 * Wellness Controller
 * HTTP handlers for wellness tracking and monitoring
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import { wellnessService } from '../../domain/services/wellness.service';
import { readinessService } from '../../domain/services/readiness.service';

const logger = createLogger('wellness-controller');

/**
 * Get wellness metrics
 * GET /api/v1/wellness/metrics
 */
export async function getMetrics(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { startDate, endDate, granularity } = req.query;

    const metrics = await wellnessService.getMetrics(
      userId,
      startDate as string,
      endDate as string,
      (granularity as 'daily' | 'weekly' | 'monthly') || 'daily'
    );

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wellness metrics',
    });
  }
}

/**
 * Record wellness metrics
 * POST /api/v1/wellness/metrics
 */
export async function recordMetrics(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { date, ...metrics } = req.body;
    const recordDate = date || new Date().toISOString().split('T')[0];

    const result = await wellnessService.recordMetrics(userId, recordDate, metrics);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Record metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record wellness metrics',
    });
  }
}

/**
 * Get wellness trend
 * GET /api/v1/wellness/trend
 */
export async function getTrend(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { period } = req.query;

    const trend = await wellnessService.getTrend(
      userId,
      (period as 'daily' | 'weekly' | 'monthly') || 'weekly'
    );

    res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (error: any) {
    logger.error('Get trend error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wellness trend',
    });
  }
}

/**
 * Record mood check-in
 * POST /api/v1/wellness/mood
 */
export async function recordMood(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { sessionType, mood, anxiety, frustration, notes } = req.body;

    if (!sessionType || !mood) {
      return res.status(400).json({
        success: false,
        error: 'sessionType and mood are required',
      });
    }

    await wellnessService.recordMood({
      userId,
      sessionType,
      mood,
      anxiety,
      frustration,
      notes,
    });

    res.status(200).json({
      success: true,
      message: 'Mood recorded successfully',
    });
  } catch (error: any) {
    logger.error('Record mood error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record mood',
    });
  }
}

/**
 * Get Heart Health Dashboard
 * GET /api/v1/wellness/dashboard
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const dashboard = await wellnessService.getHeartHealthDashboard(userId);

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wellness dashboard',
    });
  }
}

/**
 * Dismiss an alert
 * POST /api/v1/wellness/alerts/:alertId/dismiss
 */
export async function dismissAlert(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { alertId } = req.params;

    await wellnessService.dismissAlert(alertId, userId);

    res.status(200).json({
      success: true,
      message: 'Alert dismissed',
    });
  } catch (error: any) {
    logger.error('Dismiss alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to dismiss alert',
    });
  }
}

// ============================================================================
// Readiness Assessment Endpoints
// ============================================================================

/**
 * Start readiness assessment
 * POST /api/v1/wellness/readiness/start
 */
export async function startReadinessAssessment(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { context } = req.body;

    const result = await readinessService.startAssessment(userId, context);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Start assessment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start assessment',
    });
  }
}

/**
 * Submit readiness assessment answers
 * POST /api/v1/wellness/readiness/submit
 */
export async function submitReadinessAssessment(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { assessmentId, answers } = req.body;

    if (!assessmentId || !answers) {
      return res.status(400).json({
        success: false,
        error: 'assessmentId and answers are required',
      });
    }

    const result = await readinessService.submitAssessment(userId, assessmentId, answers);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Submit assessment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit assessment',
    });
  }
}

/**
 * Get latest readiness assessment
 * GET /api/v1/wellness/readiness/latest
 */
export async function getLatestReadiness(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const assessment = await readinessService.getLatestAssessment(userId);

    res.status(200).json({
      success: true,
      data: assessment,
    });
  } catch (error: any) {
    logger.error('Get latest readiness error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get readiness assessment',
    });
  }
}

/**
 * Get readiness assessment history
 * GET /api/v1/wellness/readiness/history
 */
export async function getReadinessHistory(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { limit } = req.query;

    const history = await readinessService.getAssessmentHistory(
      userId,
      limit ? parseInt(limit as string, 10) : 10
    );

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    logger.error('Get readiness history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get readiness history',
    });
  }
}
