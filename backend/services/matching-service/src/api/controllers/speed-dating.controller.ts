/**
 * Speed Dating Controller
 * Handles HTTP requests for speed dating events
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import { SpeedDatingEventStatus } from '../../domain/entities/SpeedDatingEvent.entity';
import speedDatingService from '../../domain/services/speed-dating.service';

const logger = createLogger('speed-dating-controller');

export class SpeedDatingController {
  /**
   * Get upcoming speed dating events
   * GET /api/v1/speed-dating/events
   */
  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const { status, theme, location, fromDate, toDate, limit, offset } = req.query;

      const filters = {
        status: status as SpeedDatingEventStatus | undefined,
        theme: theme as string | undefined,
        location: location as string | undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      };

      const result = await speedDatingService.getUpcomingEvents(
        filters,
        parseInt(limit as string) || 20,
        parseInt(offset as string) || 0
      );

      res.status(200).json({
        success: true,
        data: {
          events: result.events,
          count: result.events.length,
          total: result.total,
        },
      });
    } catch (error) {
      logger.error('Failed to get events', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve events',
      });
    }
  }

  /**
   * Get a specific event
   * GET /api/v1/speed-dating/events/:eventId
   */
  async getEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { userId } = (req as any).user;

      const event = await speedDatingService.getEvent(eventId);

      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      // Check if user is registered
      const userEvents = await speedDatingService.getUserRegisteredEvents(userId);
      const isRegistered = userEvents.some((e) => e.id === eventId);

      res.status(200).json({
        success: true,
        data: {
          ...event,
          isRegistered,
        },
      });
    } catch (error) {
      logger.error('Failed to get event', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve event',
      });
    }
  }

  /**
   * Get user's registered events
   * GET /api/v1/speed-dating/my-events
   */
  async getMyEvents(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const events = await speedDatingService.getUserRegisteredEvents(userId);

      res.status(200).json({
        success: true,
        data: {
          events,
          count: events.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get user events', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve your events',
      });
    }
  }

  /**
   * Join an event
   * POST /api/v1/speed-dating/join
   */
  async joinEvent(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { eventId } = req.body;

      const result = await speedDatingService.joinEvent(userId, eventId);

      res.status(200).json({
        success: true,
        message: 'Successfully registered for event',
        data: {
          participant: result.participant,
          position: result.position,
          event: result.event,
        },
      });
    } catch (error) {
      logger.error('Failed to join event', error);

      if (error.message === 'Event not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (
        error.message === 'Event is not accepting registrations' ||
        error.message === 'Event is full' ||
        error.message === 'Already registered for this event'
      ) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to join event',
      });
    }
  }

  /**
   * Leave an event
   * DELETE /api/v1/speed-dating/leave
   */
  async leaveEvent(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { eventId } = req.body;

      await speedDatingService.leaveEvent(userId, eventId);

      res.status(200).json({
        success: true,
        message: 'Successfully left the event',
      });
    } catch (error) {
      logger.error('Failed to leave event', error);

      if (error.message === 'Event not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (
        error.message === 'Cannot leave an active or completed event' ||
        error.message === 'Not registered for this event'
      ) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to leave event',
      });
    }
  }

  /**
   * Check in to an event
   * POST /api/v1/speed-dating/check-in
   */
  async checkIn(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { eventId } = req.body;

      const participant = await speedDatingService.checkIn(userId, eventId);

      res.status(200).json({
        success: true,
        message: 'Successfully checked in',
        data: {
          participant,
        },
      });
    } catch (error) {
      logger.error('Failed to check in', error);

      if (
        error.message === 'Event not found' ||
        error.message === 'Not registered for this event'
      ) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message === 'Check-in not yet available') {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to check in',
      });
    }
  }

  /**
   * Get current round info
   * GET /api/v1/speed-dating/events/:eventId/current-round
   */
  async getCurrentRound(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { eventId } = req.params;

      const roundInfo = await speedDatingService.getCurrentRound(userId, eventId);

      if (!roundInfo) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'No active round',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: roundInfo,
      });
    } catch (error) {
      logger.error('Failed to get current round', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get current round',
      });
    }
  }

  /**
   * Record interest in a participant
   * POST /api/v1/speed-dating/interest
   */
  async recordInterest(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { eventId, targetUserId, interested } = req.body;

      const result = await speedDatingService.recordInterest(
        userId,
        eventId,
        targetUserId,
        interested
      );

      res.status(200).json({
        success: true,
        data: {
          mutual: result.mutual,
          match: result.match,
        },
        message: result.mutual ? "It's a match!" : 'Interest recorded',
      });
    } catch (error) {
      logger.error('Failed to record interest', error);

      if (error.message === 'Event not found' || error.message === 'Participant not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to record interest',
      });
    }
  }

  /**
   * Get matches from an event
   * GET /api/v1/speed-dating/matches
   */
  async getMatches(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { eventId } = req.query;

      if (eventId) {
        const matches = await speedDatingService.getMatches(userId, eventId as string);

        res.status(200).json({
          success: true,
          data: {
            matches,
            count: matches.length,
          },
        });
      } else {
        // Get matches from all events
        const userEvents = await speedDatingService.getUserRegisteredEvents(userId);
        const allMatches = [];

        for (const event of userEvents) {
          const matches = await speedDatingService.getMatches(userId, event.id);
          allMatches.push(...matches.map((m) => ({ ...m, eventName: event.name })));
        }

        res.status(200).json({
          success: true,
          data: {
            matches: allMatches,
            count: allMatches.length,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to get matches', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve matches',
      });
    }
  }

  /**
   * Get event statistics
   * GET /api/v1/speed-dating/events/:eventId/stats
   */
  async getEventStats(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;

      const stats = await speedDatingService.getEventStats(eventId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get event stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve event statistics',
      });
    }
  }

  /**
   * Get icebreaker suggestions
   * GET /api/v1/speed-dating/icebreakers
   */
  async getIcebreakers(_req: Request, res: Response): Promise<void> {
    try {
      // Static list of icebreaker questions
      const icebreakers = [
        "What's the most spontaneous thing you've ever done?",
        'If you could travel anywhere tomorrow, where would you go?',
        "What's your go-to comfort food?",
        'What are you currently binge-watching?',
        "What's your hidden talent?",
        'If you could have dinner with anyone, dead or alive, who would it be?',
        "What's the best concert you've ever been to?",
        "What's on your bucket list?",
        'What hobby have you always wanted to try?',
        "What's your favorite way to spend a lazy Sunday?",
        "If you won the lottery, what's the first thing you'd do?",
        "What's your most controversial food opinion?",
        'What song always gets you on the dance floor?',
        "What's the best piece of advice you've ever received?",
        'If you could learn any skill instantly, what would it be?',
      ];

      // Return a random selection
      const shuffled = icebreakers.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5);

      res.status(200).json({
        success: true,
        data: {
          icebreakers: selected,
        },
      });
    } catch (error) {
      logger.error('Failed to get icebreakers', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve icebreakers',
      });
    }
  }
}

export default new SpeedDatingController();
