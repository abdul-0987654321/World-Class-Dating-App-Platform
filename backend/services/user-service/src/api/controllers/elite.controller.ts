import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { VipEventService } from '../../domain/services/vip-event.service';
import { EliteCoachService } from '../../domain/services/elite-coach.service';
import { ConciergeService } from '../../domain/services/concierge.service';
import logger from '../../utils/logger';

export class EliteController {
  private vipEventService: VipEventService;
  private eliteCoachService: EliteCoachService;
  private conciergeService: ConciergeService;

  constructor() {
    this.vipEventService = new VipEventService();
    this.eliteCoachService = new EliteCoachService();
    this.conciergeService = new ConciergeService();
  }

  // ============ VIP Events ============

  /**
   * GET /api/v1/elite/events
   * List all upcoming VIP events
   */
  async listEvents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { type, has_availability } = req.query;

      const events = await this.vipEventService.listUpcomingEvents(userId, {
        type: type as any,
        has_availability: has_availability === 'true',
      });

      return res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      logger.error('Error listing VIP events:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list events',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * GET /api/v1/elite/events/:id
   * Get a specific VIP event
   */
  async getEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const event = await this.vipEventService.getEvent(id, userId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
          correlationId: req.correlationId,
        });
      }

      return res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      logger.error('Error getting VIP event:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get event',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * POST /api/v1/elite/events/:id/register
   * Register for a VIP event
   */
  async registerForEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await this.vipEventService.registerForEvent(userId, id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Successfully registered for event',
        data: result.attendee,
      });
    } catch (error) {
      logger.error('Error registering for VIP event:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register for event',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * DELETE /api/v1/elite/events/:id/register
   * Cancel event registration
   */
  async cancelRegistration(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { reason } = req.body;

      const result = await this.vipEventService.cancelRegistration(userId, id, reason);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.json({
        success: true,
        message: 'Registration cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling event registration:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel registration',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * GET /api/v1/elite/events/my
   * Get user's registered events
   */
  async getMyEvents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { include_historical } = req.query;

      const events = await this.vipEventService.getMyEvents(
        userId,
        include_historical === 'true'
      );

      return res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      logger.error('Error getting user events:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get your events',
        correlationId: req.correlationId,
      });
    }
  }

  // ============ Dating Coach ============

  /**
   * GET /api/v1/elite/coach
   * Get assigned coach
   */
  async getAssignedCoach(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const coach = await this.eliteCoachService.getAssignedCoach(userId);

      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'No coach available at this time',
          correlationId: req.correlationId,
        });
      }

      // Also get upcoming session if any
      const upcomingSession = await this.eliteCoachService.getUpcomingSession(userId);

      return res.json({
        success: true,
        data: {
          coach,
          upcoming_session: upcomingSession,
        },
      });
    } catch (error) {
      logger.error('Error getting assigned coach:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get assigned coach',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * POST /api/v1/elite/coach/sessions
   * Schedule a coaching session
   */
  async scheduleSession(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { date, topic, type, duration } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date is required',
          correlationId: req.correlationId,
        });
      }

      const result = await this.eliteCoachService.scheduleSession(userId, {
        date: new Date(date),
        topic,
        type,
        duration,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Session scheduled successfully',
        data: result.session,
      });
    } catch (error) {
      logger.error('Error scheduling coaching session:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to schedule session',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * GET /api/v1/elite/coach/sessions
   * Get session history
   */
  async getSessionHistory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { include_upcoming } = req.query;

      const sessions = await this.eliteCoachService.getSessionHistory(
        userId,
        include_upcoming !== 'false'
      );

      return res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      logger.error('Error getting session history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get session history',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * DELETE /api/v1/elite/coach/sessions/:id
   * Cancel a scheduled session
   */
  async cancelSession(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await this.eliteCoachService.cancelSession(userId, id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.json({
        success: true,
        message: 'Session cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling session:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel session',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * PUT /api/v1/elite/coach/sessions/:id/reschedule
   * Reschedule a session
   */
  async rescheduleSession(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'New date is required',
          correlationId: req.correlationId,
        });
      }

      const result = await this.eliteCoachService.rescheduleSession(
        userId,
        id,
        new Date(date)
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.json({
        success: true,
        message: 'Session rescheduled successfully',
        data: result.session,
      });
    } catch (error) {
      logger.error('Error rescheduling session:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to reschedule session',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * POST /api/v1/elite/coach/sessions/:id/feedback
   * Submit feedback for a session
   */
  async submitSessionFeedback(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { rating, feedback } = req.body;

      if (rating === undefined || rating === null) {
        return res.status(400).json({
          success: false,
          message: 'Rating is required',
          correlationId: req.correlationId,
        });
      }

      const result = await this.eliteCoachService.submitFeedback(userId, id, {
        rating,
        feedback,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.json({
        success: true,
        message: 'Feedback submitted successfully',
      });
    } catch (error) {
      logger.error('Error submitting session feedback:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit feedback',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * GET /api/v1/elite/coach/session-types
   * Get available session types
   */
  async getSessionTypes(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const types = this.eliteCoachService.getSessionTypes();

      return res.json({
        success: true,
        data: types,
      });
    } catch (error) {
      logger.error('Error getting session types:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get session types',
      });
    }
  }

  // ============ Concierge Service ============

  /**
   * POST /api/v1/elite/concierge
   * Submit a concierge request
   */
  async submitConciergeRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { type, description, priority, budget_range, preferred_date, location_preference } =
        req.body;

      if (!type || !description) {
        return res.status(400).json({
          success: false,
          message: 'Type and description are required',
          correlationId: req.correlationId,
        });
      }

      const result = await this.conciergeService.submitRequest(userId, {
        type,
        description,
        priority,
        budget_range,
        preferred_date: preferred_date ? new Date(preferred_date) : undefined,
        location_preference,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Request submitted successfully',
        data: result.request,
      });
    } catch (error) {
      logger.error('Error submitting concierge request:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit request',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * GET /api/v1/elite/concierge
   * Get user's concierge requests
   */
  async getMyConciergeRequests(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { status, limit, offset } = req.query;

      const requests = await this.conciergeService.getMyRequests(userId, {
        status: status as any,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      return res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      logger.error('Error getting concierge requests:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get requests',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * GET /api/v1/elite/concierge/:id
   * Get a specific concierge request with messages
   */
  async getConciergeRequestStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const request = await this.conciergeService.getRequestStatus(userId, id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found',
          correlationId: req.correlationId,
        });
      }

      return res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      logger.error('Error getting concierge request status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get request status',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * POST /api/v1/elite/concierge/:id/messages
   * Add a message to a concierge request
   */
  async addConciergeMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required',
          correlationId: req.correlationId,
        });
      }

      const result = await this.conciergeService.addMessage(userId, id, { message });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Message added successfully',
        data: result.message,
      });
    } catch (error) {
      logger.error('Error adding concierge message:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add message',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * DELETE /api/v1/elite/concierge/:id
   * Cancel a concierge request
   */
  async cancelConciergeRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await this.conciergeService.cancelRequest(userId, id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          correlationId: req.correlationId,
        });
      }

      return res.json({
        success: true,
        message: 'Request cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling concierge request:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel request',
        correlationId: req.correlationId,
      });
    }
  }

  /**
   * GET /api/v1/elite/concierge/types
   * Get available request types
   */
  async getConciergeRequestTypes(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const types = this.conciergeService.getRequestTypes();
      const priorities = this.conciergeService.getPriorityOptions();

      return res.json({
        success: true,
        data: {
          request_types: types,
          priority_options: priorities,
        },
      });
    } catch (error) {
      logger.error('Error getting concierge request types:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get request types',
      });
    }
  }
}
