import { Request, Response, NextFunction } from 'express';

import { MentalHealthService } from '../../domain/services/MentalHealth.service';
import {
  CheckInType,
  ResourceCategory,
  AffirmationCategory,
  ReflectionPromptType,
  BreakType,
  CreateCheckInRequest,
  UpdateWellnessSettingsRequest,
} from '../../domain/types/mental-health.types';
import { getDbConnection } from '../../infrastructure/database/connection';
import logger from '../../utils/logger';

/**
 * Wellness Controller
 *
 * REST API endpoints for mental health check-ins and wellness features.
 * All endpoints require authentication and respect user privacy settings.
 */
export class WellnessController {
  private service: MentalHealthService;

  constructor() {
    const db = getDbConnection();
    this.service = new MentalHealthService(db);
  }

  // ==================== Check-ins ====================

  /**
   * Create a new check-in
   * POST /api/v1/wellness/check-ins
   */
  createCheckIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const request: CreateCheckInRequest = {
        moodScore: req.body.moodScore,
        energyLevel: req.body.energyLevel,
        anxietyLevel: req.body.anxietyLevel,
        stressLevel: req.body.stressLevel,
        datingConfidence: req.body.datingConfidence,
        socialSatisfaction: req.body.socialSatisfaction,
        feelings: req.body.feelings,
        datingExperiences: req.body.datingExperiences,
        reflectionNotes: req.body.reflectionNotes,
        checkInType: req.body.checkInType || CheckInType.MANUAL,
        triggerContext: req.body.triggerContext,
      };

      // Validate mood score
      if (!request.moodScore || request.moodScore < 1 || request.moodScore > 10) {
        res.status(400).json({
          success: false,
          message: 'Mood score is required and must be between 1 and 10',
        });
        return;
      }

      const checkIn = await this.service.createCheckIn(userId, request);

      // Check for distress and include resources if needed
      const distress = await this.service.detectDistressSignals(userId);
      let crisisResources;
      if (distress.crisisResourcesNeeded) {
        crisisResources = await this.service.getCrisisResources();
      }

      // Get personalized affirmation
      const affirmation = await this.service.getPersonalizedAffirmation(userId);

      res.status(201).json({
        success: true,
        message: 'Check-in recorded successfully',
        data: {
          checkIn,
          affirmation,
          distressDetected: distress.hasIndicators,
          crisisResources: distress.crisisResourcesNeeded ? crisisResources : undefined,
          breakSuggested: distress.recommendedAction === 'break_suggested',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get check-in history
   * GET /api/v1/wellness/check-ins
   */
  getCheckInHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const checkInType = req.query.type as CheckInType | undefined;
      const includeReflections = req.query.includeReflections === 'true';

      // Date range
      let dateRange;
      if (req.query.startDate && req.query.endDate) {
        dateRange = {
          start: new Date(req.query.startDate as string),
          end: new Date(req.query.endDate as string),
        };
      }

      const checkIns = await this.service.getCheckInHistory(userId, {
        limit,
        offset,
        checkInType,
        dateRange,
        includeReflections,
      });

      res.status(200).json({
        success: true,
        data: {
          checkIns,
          pagination: {
            limit,
            offset,
            hasMore: checkIns.length === limit,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Dashboard & Insights ====================

  /**
   * Get wellness dashboard with all key metrics
   * GET /api/v1/wellness/dashboard
   */
  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Fetch all data in parallel
      const [wellnessScore, moodTrend, settings, affirmation, breakSuggestion] = await Promise.all([
        this.service.getWellnessScore(userId),
        this.service.getMoodTrend(userId, 14),
        this.service.getOrCreateSettings(userId),
        this.service.getPersonalizedAffirmation(userId),
        this.service.suggestBreak(userId),
      ]);

      // Get recent check-ins
      const recentCheckIns = await this.service.getCheckInHistory(userId, { limit: 5 });

      res.status(200).json({
        success: true,
        data: {
          wellnessScore,
          moodTrend,
          recentCheckIns,
          settings: {
            isOnBreak: settings.isOnBreak,
            breakEndsAt: settings.breakEndsAt,
            dailyCheckinEnabled: settings.dailyCheckinEnabled,
            weeklyCheckinEnabled: settings.weeklyCheckinEnabled,
          },
          affirmation,
          breakSuggestion: breakSuggestion.suggested ? breakSuggestion : null,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get mood trend analysis
   * GET /api/v1/wellness/mood-trend
   */
  getMoodTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      const moodTrend = await this.service.getMoodTrend(userId, days);

      res.status(200).json({
        success: true,
        data: moodTrend,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get wellness score
   * GET /api/v1/wellness/score
   */
  getWellnessScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const score = await this.service.getWellnessScore(userId);

      res.status(200).json({
        success: true,
        data: score,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Breaks ====================

  /**
   * Enable mental health break
   * POST /api/v1/wellness/breaks
   */
  enableBreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { duration, breakType, reason } = req.body;

      if (!duration || duration < 1 || duration > 90) {
        res.status(400).json({
          success: false,
          message: 'Duration must be between 1 and 90 days',
        });
        return;
      }

      const break_ = await this.service.enableMentalHealthPause(
        userId,
        duration,
        breakType || BreakType.MENTAL_HEALTH,
        reason
      );

      logger.info('Mental health break enabled via API', { userId, duration });

      res.status(201).json({
        success: true,
        message: 'Mental health break enabled. Your profile will be hidden during this time.',
        data: break_,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * End mental health break early
   * DELETE /api/v1/wellness/breaks
   */
  endBreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      await this.service.endMentalHealthPause(userId);

      res.status(200).json({
        success: true,
        message: 'Break ended. Your profile is now visible again.',
      });
    } catch (error: any) {
      if (error.message.includes('not currently on a break')) {
        res.status(400).json({
          success: false,
          message: 'You are not currently on a break',
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Extend current break
   * PUT /api/v1/wellness/breaks/extend
   */
  extendBreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { additionalDays } = req.body;

      if (!additionalDays || additionalDays < 1 || additionalDays > 30) {
        res.status(400).json({
          success: false,
          message: 'Additional days must be between 1 and 30',
        });
        return;
      }

      const break_ = await this.service.extendBreak(userId, additionalDays);

      res.status(200).json({
        success: true,
        message: `Break extended by ${additionalDays} days`,
        data: break_,
      });
    } catch (error: any) {
      if (error.message.includes('not currently on a break')) {
        res.status(400).json({
          success: false,
          message: 'You are not currently on a break',
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Get break suggestion
   * GET /api/v1/wellness/breaks/suggestion
   */
  getBreakSuggestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const suggestion = await this.service.suggestBreak(userId);

      res.status(200).json({
        success: true,
        data: suggestion,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Resources ====================

  /**
   * Get wellness resources
   * GET /api/v1/wellness/resources
   */
  getResources = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = req.query.category as ResourceCategory | undefined;
      const country = req.query.country as string | undefined;
      const isCrisis = req.query.crisis === 'true';

      const resources = await this.service.getResources(category, country, isCrisis);

      res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get crisis resources
   * GET /api/v1/wellness/resources/crisis
   */
  getCrisisResources = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const country = req.query.country as string | undefined;
      const resources = await this.service.getCrisisResources(country);

      res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Affirmations ====================

  /**
   * Get affirmations
   * GET /api/v1/wellness/affirmations
   */
  getAffirmations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = req.query.category as AffirmationCategory | undefined;
      const moodTag = req.query.mood as string | undefined;
      const limit = parseInt(req.query.limit as string) || 5;

      const affirmations = await this.service.getAffirmations(category, moodTag, limit);

      res.status(200).json({
        success: true,
        data: affirmations,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get personalized affirmation based on recent mood
   * GET /api/v1/wellness/affirmations/personalized
   */
  getPersonalizedAffirmation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const affirmation = await this.service.getPersonalizedAffirmation(userId);

      res.status(200).json({
        success: true,
        data: affirmation,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Reflection Prompts ====================

  /**
   * Get reflection prompts
   * GET /api/v1/wellness/prompts
   */
  getReflectionPrompts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const type = req.query.type as ReflectionPromptType | undefined;
      const category = req.query.category as string | undefined;

      const prompts = await this.service.getReflectionPrompts(type, category);

      res.status(200).json({
        success: true,
        data: prompts,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get today's reflection prompt
   * GET /api/v1/wellness/prompts/today
   */
  getTodaysPrompt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Determine prompt type based on day of week
      const dayOfWeek = new Date().getDay();
      const type = dayOfWeek === 0 ? ReflectionPromptType.WEEKLY : ReflectionPromptType.DAILY;

      const prompt = await this.service.getRandomReflectionPrompt(type);

      res.status(200).json({
        success: true,
        data: prompt,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Save reflection response
   * POST /api/v1/wellness/prompts/:promptId/response
   */
  saveReflectionResponse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { promptId } = req.params;
      const { response, checkInId } = req.body;

      if (!response || response.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Response is required',
        });
        return;
      }

      await this.service.saveReflectionResponse(userId, promptId, response, checkInId);

      res.status(201).json({
        success: true,
        message: 'Reflection saved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Settings ====================

  /**
   * Get wellness settings
   * GET /api/v1/wellness/settings
   */
  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const settings = await this.service.getOrCreateSettings(userId);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update wellness settings
   * PUT /api/v1/wellness/settings
   */
  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const updates: UpdateWellnessSettingsRequest = req.body;

      // Validate data retention days if provided
      if (updates.dataRetentionDays !== undefined) {
        if (updates.dataRetentionDays < 7 || updates.dataRetentionDays > 365) {
          res.status(400).json({
            success: false,
            message: 'Data retention must be between 7 and 365 days',
          });
          return;
        }
      }

      const settings = await this.service.updateSettings(userId, updates);

      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Distress Detection ====================

  /**
   * Check for distress signals
   * GET /api/v1/wellness/distress-check
   */
  checkDistress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const indicators = await this.service.detectDistressSignals(userId);

      // Include crisis resources if needed
      let crisisResources;
      if (indicators.crisisResourcesNeeded) {
        crisisResources = await this.service.getCrisisResources();
      }

      res.status(200).json({
        success: true,
        data: {
          ...indicators,
          crisisResources,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Privacy / GDPR ====================

  /**
   * Export all wellness data
   * GET /api/v1/wellness/export
   */
  exportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const data = await this.service.exportUserData(userId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete all wellness data
   * DELETE /api/v1/wellness/data
   */
  deleteAllData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Require confirmation
      const { confirm } = req.body;
      if (confirm !== 'DELETE_ALL_WELLNESS_DATA') {
        res.status(400).json({
          success: false,
          message: 'Please confirm deletion by sending { "confirm": "DELETE_ALL_WELLNESS_DATA" }',
        });
        return;
      }

      await this.service.deleteAllUserData(userId);

      logger.info('All wellness data deleted for user', { userId });

      res.status(200).json({
        success: true,
        message: 'All wellness data has been permanently deleted',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Usage Tracking (Internal) ====================

  /**
   * Record usage metrics for wellness analysis
   * POST /api/v1/wellness/track-usage
   */
  trackUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const metrics = req.body;
      await this.service.recordUsageMetrics(userId, metrics);

      res.status(200).json({
        success: true,
        message: 'Usage metrics recorded',
      });
    } catch (error) {
      next(error);
    }
  };
}
