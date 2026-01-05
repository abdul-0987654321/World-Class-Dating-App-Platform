import logger from '../../utils/logger';
import {
  CoachingSession,
  CoachingSessionCreateInput,
  CoachingSessionType,
  CoachWithDetails,
  CoachingSessionWithCoach,
} from '../entities/CoachingSession.entity';
import { CoachingRepository } from '../repositories/coaching.repository';

export interface ScheduleSessionInput {
  date: Date;
  topic?: string;
  type?: CoachingSessionType;
  duration?: number;
}

export interface SessionFeedbackInput {
  rating: number; // 1-5
  feedback?: string;
}

export class EliteCoachService {
  private repository: CoachingRepository;

  constructor() {
    this.repository = new CoachingRepository();
  }

  /**
   * Get the dedicated coach assigned to a user
   * If no coach is assigned, auto-assign one
   */
  async getAssignedCoach(userId: string): Promise<CoachWithDetails | null> {
    try {
      // Check for existing assignment
      let coach = await this.repository.getAssignedCoach(userId);

      // If no coach assigned, auto-assign one
      if (!coach) {
        coach = await this.repository.assignCoachToUser(userId);
        if (coach) {
          logger.info(`Auto-assigned coach ${coach.id} to user ${userId}`);
        }
      }

      return coach;
    } catch (error) {
      logger.error('Error getting assigned coach:', error);
      throw error;
    }
  }

  /**
   * Schedule a coaching session
   */
  async scheduleSession(
    userId: string,
    input: ScheduleSessionInput
  ): Promise<{ success: boolean; session?: CoachingSessionWithCoach; error?: string }> {
    try {
      // Get assigned coach
      const coach = await this.getAssignedCoach(userId);
      if (!coach) {
        return { success: false, error: 'No coach available. Please try again later.' };
      }

      // Validate date is in the future
      const sessionDate = new Date(input.date);
      if (sessionDate <= new Date()) {
        return { success: false, error: 'Session must be scheduled for a future date' };
      }

      // Check for conflicting sessions (within 1 hour of requested time)
      const userSessions = await this.repository.getUserSessions(userId, false);
      const hasConflict = userSessions.some((session) => {
        const existingDate = new Date(session.scheduled_at);
        const timeDiff = Math.abs(existingDate.getTime() - sessionDate.getTime());
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        return hoursDiff < 1 && session.status === 'scheduled';
      });

      if (hasConflict) {
        return { success: false, error: 'You already have a session scheduled around this time' };
      }

      // Create the session
      const sessionData: CoachingSessionCreateInput = {
        user_id: userId,
        coach_id: coach.id,
        scheduled_at: sessionDate,
        duration: input.duration || 60,
        type: input.type || 'follow_up',
        topic: input.topic,
      };

      const session = await this.repository.createSession(sessionData);

      // Get session with coach details
      const sessionWithCoach = await this.repository.findSessionWithCoach(session.id);

      logger.info(
        `Coaching session scheduled: ${session.id} for user ${userId} with coach ${coach.id}`
      );
      return { success: true, session: sessionWithCoach };
    } catch (error) {
      logger.error('Error scheduling coaching session:', error);
      throw error;
    }
  }

  /**
   * Get session history for a user
   */
  async getSessionHistory(
    userId: string,
    includeUpcoming = true
  ): Promise<CoachingSessionWithCoach[]> {
    try {
      const sessions = await this.repository.getUserSessions(userId, true);

      if (!includeUpcoming) {
        return sessions.filter(
          (s) => new Date(s.scheduled_at) < new Date() || s.status === 'completed'
        );
      }

      return sessions;
    } catch (error) {
      logger.error('Error getting session history:', error);
      throw error;
    }
  }

  /**
   * Get upcoming session for a user
   */
  async getUpcomingSession(userId: string): Promise<CoachingSessionWithCoach | null> {
    try {
      return this.repository.getUpcomingSession(userId);
    } catch (error) {
      logger.error('Error getting upcoming session:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled session
   */
  async cancelSession(
    userId: string,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await this.repository.findSessionById(sessionId);

      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.user_id !== userId) {
        return { success: false, error: 'Not authorized to cancel this session' };
      }

      if (session.status !== 'scheduled') {
        return { success: false, error: 'Can only cancel scheduled sessions' };
      }

      // Check cancellation window (24 hours minimum)
      const sessionDate = new Date(session.scheduled_at);
      const now = new Date();
      const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSession < 24) {
        return {
          success: false,
          error: 'Sessions must be cancelled at least 24 hours in advance',
        };
      }

      await this.repository.updateSession(sessionId, { status: 'cancelled' });

      logger.info(`Coaching session ${sessionId} cancelled by user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error cancelling coaching session:', error);
      throw error;
    }
  }

  /**
   * Reschedule a session
   */
  async rescheduleSession(
    userId: string,
    sessionId: string,
    newDate: Date
  ): Promise<{ success: boolean; session?: CoachingSession; error?: string }> {
    try {
      const session = await this.repository.findSessionById(sessionId);

      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.user_id !== userId) {
        return { success: false, error: 'Not authorized to reschedule this session' };
      }

      if (session.status !== 'scheduled') {
        return { success: false, error: 'Can only reschedule scheduled sessions' };
      }

      // Validate new date is in the future
      if (newDate <= new Date()) {
        return { success: false, error: 'New date must be in the future' };
      }

      const updated = await this.repository.updateSession(sessionId, {
        scheduled_at: newDate,
      });

      logger.info(`Coaching session ${sessionId} rescheduled by user ${userId}`);
      return { success: true, session: updated };
    } catch (error) {
      logger.error('Error rescheduling coaching session:', error);
      throw error;
    }
  }

  /**
   * Submit feedback for a completed session
   */
  async submitFeedback(
    userId: string,
    sessionId: string,
    input: SessionFeedbackInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await this.repository.findSessionById(sessionId);

      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.user_id !== userId) {
        return { success: false, error: 'Not authorized to submit feedback for this session' };
      }

      if (session.status !== 'completed') {
        return { success: false, error: 'Can only submit feedback for completed sessions' };
      }

      if (session.rating !== undefined && session.rating !== null) {
        return { success: false, error: 'Feedback already submitted for this session' };
      }

      // Validate rating
      if (input.rating < 1 || input.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }

      await this.repository.updateSession(sessionId, {
        rating: input.rating,
        feedback: input.feedback,
      });

      // Update coach stats
      await this.repository.updateCoachStats(session.coach_id, input.rating);

      logger.info(`Feedback submitted for session ${sessionId} by user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error submitting session feedback:', error);
      throw error;
    }
  }

  /**
   * Get available session types
   */
  getSessionTypes(): { type: CoachingSessionType; name: string; description: string }[] {
    return [
      {
        type: 'initial_consultation',
        name: 'Initial Consultation',
        description: 'First meeting to understand your dating goals and create a personalized plan',
      },
      {
        type: 'profile_review',
        name: 'Profile Review',
        description: 'Expert feedback on your dating profile to maximize matches',
      },
      {
        type: 'date_prep',
        name: 'Date Preparation',
        description: 'Coaching before an important date to boost confidence',
      },
      {
        type: 'post_date_debrief',
        name: 'Post-Date Debrief',
        description: 'Analyze how your date went and plan next steps',
      },
      {
        type: 'follow_up',
        name: 'Follow-up Session',
        description: 'Regular check-in to track progress and adjust strategies',
      },
    ];
  }
}
