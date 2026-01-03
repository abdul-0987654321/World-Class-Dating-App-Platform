/**
 * Date Planning Controller
 * Handles HTTP requests for luxury date planning features
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  DatePlanningService,
  CreateDatePlanDto,
  DatePreferencesDto,
  DateFeedbackDto,
  SearchVenuesDto,
} from '../../domain/services/date-planning.service';
import logger from '../../utils/logger';
import {
  searchVenuesSchema,
  datePreferencesSchema,
  createDatePlanSchema,
  updateDatePlanSchema,
  completeDatePlanSchema,
  listDatePlansSchema,
  suggestionsQuerySchema,
} from '../validators/date-planning.validator';

export class DatePlanningController {
  private datePlanningService: DatePlanningService;

  constructor(datePlanningService?: DatePlanningService) {
    this.datePlanningService = datePlanningService || new DatePlanningService();
  }

  /**
   * GET /api/v1/dates/suggestions
   * Get AI-powered date suggestions based on preferences
   */
  async getSuggestions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      // Validate query params
      const { error: queryError, value: queryParams } = suggestionsQuerySchema.validate(
        req.query
      );
      if (queryError) {
        return res.status(400).json({
          success: false,
          message: queryError.details[0].message,
        });
      }

      // Validate body for preferences
      const { error: bodyError, value: preferences } = datePreferencesSchema.validate(
        req.body || {}
      );
      if (bodyError) {
        return res.status(400).json({
          success: false,
          message: bodyError.details[0].message,
        });
      }

      const ideas = await this.datePlanningService.suggestDateIdeas(
        userId,
        queryParams.matchId,
        preferences as DatePreferencesDto
      );

      return res.status(200).json({
        success: true,
        data: ideas,
      });
    } catch (error: any) {
      logger.error('Get date suggestions error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get date suggestions',
      });
    }
  }

  /**
   * GET /api/v1/dates/venues
   * Search for venues based on location, type, and budget
   */
  async searchVenues(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { error, value } = searchVenuesSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const venues = await this.datePlanningService.searchVenues(value as SearchVenuesDto);

      return res.status(200).json({
        success: true,
        data: venues,
      });
    } catch (error: any) {
      logger.error('Search venues error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to search venues',
      });
    }
  }

  /**
   * GET /api/v1/dates/venues/:id
   * Get venue details by ID
   */
  async getVenueDetails(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const venue = await this.datePlanningService.getVenueDetails(id);

      if (!venue) {
        return res.status(404).json({
          success: false,
          message: 'Venue not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: venue,
      });
    } catch (error: any) {
      logger.error('Get venue details error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get venue details',
      });
    }
  }

  /**
   * POST /api/v1/dates
   * Create a new date plan
   */
  async createDatePlan(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const { error, value } = createDatePlanSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const datePlan = await this.datePlanningService.createDatePlan(
        userId,
        value as CreateDatePlanDto
      );

      return res.status(201).json({
        success: true,
        data: datePlan,
        message: 'Date plan created successfully',
      });
    } catch (error: any) {
      logger.error('Create date plan error:', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to create date plan',
      });
    }
  }

  /**
   * GET /api/v1/dates
   * List user's date plans
   */
  async getDatePlans(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const { error, value } = listDatePlansSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const datePlans = await this.datePlanningService.getMyDatePlans(userId, value.status);

      return res.status(200).json({
        success: true,
        data: datePlans,
      });
    } catch (error: any) {
      logger.error('Get date plans error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve date plans',
      });
    }
  }

  /**
   * GET /api/v1/dates/:id
   * Get a single date plan with venue details
   */
  async getDatePlanById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const datePlan = await this.datePlanningService.getDatePlanWithVenues(userId, id);

      if (!datePlan) {
        return res.status(404).json({
          success: false,
          message: 'Date plan not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: datePlan,
      });
    } catch (error: any) {
      logger.error('Get date plan error:', error);
      const status = error.message.includes('Access denied') ? 403 : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to retrieve date plan',
      });
    }
  }

  /**
   * PUT /api/v1/dates/:id
   * Update a date plan
   */
  async updateDatePlan(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const { error, value } = updateDatePlanSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const datePlan = await this.datePlanningService.updateDatePlan(userId, id, value);

      return res.status(200).json({
        success: true,
        data: datePlan,
        message: 'Date plan updated successfully',
      });
    } catch (error: any) {
      logger.error('Update date plan error:', error);
      const status = error.message.includes('not found')
        ? 404
        : error.message.includes('Access denied')
        ? 403
        : 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to update date plan',
      });
    }
  }

  /**
   * DELETE /api/v1/dates/:id
   * Delete a date plan
   */
  async deleteDatePlan(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await this.datePlanningService.deleteDatePlan(userId, id);

      return res.status(200).json({
        success: true,
        message: 'Date plan deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete date plan error:', error);
      const status = error.message.includes('not found')
        ? 404
        : error.message.includes('Access denied')
        ? 403
        : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to delete date plan',
      });
    }
  }

  /**
   * POST /api/v1/dates/:id/share
   * Share date plan with match
   */
  async sharePlanWithMatch(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await this.datePlanningService.sharePlanWithMatch(userId, id);

      return res.status(200).json({
        success: true,
        message: 'Date plan shared with your match',
      });
    } catch (error: any) {
      logger.error('Share date plan error:', error);
      const status = error.message.includes('not found')
        ? 404
        : error.message.includes('Access denied')
        ? 403
        : 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to share date plan',
      });
    }
  }

  /**
   * POST /api/v1/dates/:id/complete
   * Mark date plan as completed with feedback
   */
  async completeDatePlan(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const { error, value } = completeDatePlanSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      await this.datePlanningService.completeDatePlan(userId, id, value as DateFeedbackDto);

      return res.status(200).json({
        success: true,
        message: 'Date plan marked as completed',
      });
    } catch (error: any) {
      logger.error('Complete date plan error:', error);
      const status = error.message.includes('not found')
        ? 404
        : error.message.includes('Access denied')
        ? 403
        : 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to complete date plan',
      });
    }
  }
}
