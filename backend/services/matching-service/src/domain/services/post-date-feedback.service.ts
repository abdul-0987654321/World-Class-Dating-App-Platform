/**
 * Post-Date Feedback Service
 *
 * Manages the complete post-date feedback lifecycle including:
 * - Creating feedback requests after scheduled dates
 * - Collecting and storing user feedback
 * - Analyzing feedback to improve matching weights
 * - Handling safety concerns confidentially
 * - Aggregating feedback statistics
 */

import db from '../../infrastructure/database/connection';
import { createLogger } from '@flamoral/backend-shared';
import notificationServiceClient from '../../infrastructure/clients/notification-service.client';
import {
  ScheduledDate,
  ScheduledDateStatus,
  FeedbackRequest,
  FeedbackRequestStatus,
  PostDateFeedback,
  SafetyIssue,
  SafetyIssueStatus,
  SafetyIssueSeverity,
  UserMatchingWeights,
  DateFeedbackSummary,
  FeedbackStats,
  DateSuccessRateResponse,
  SubmitFeedbackRequest,
  ScheduleDateRequest,
  WouldDateAgain,
  WeightUpdateResult,
  FeedbackRequestWithDate,
} from '../../types/post-date-feedback.types';

const logger = createLogger('post-date-feedback-service');

// Constants
const FEEDBACK_REQUEST_DELAY_HOURS = 24; // Send feedback request 24 hours after date
const FEEDBACK_EXPIRY_DAYS = 7; // Feedback request expires after 7 days
const MIN_FEEDBACK_FOR_WEIGHT_UPDATE = 5; // Minimum feedback needed to update weights
const REMINDER_INTERVALS_HOURS = [48, 96]; // Send reminders at 48h and 96h after initial request

export class PostDateFeedbackService {
  // ==========================================
  // SCHEDULED DATE MANAGEMENT
  // ==========================================

  /**
   * Schedule a date between two matched users
   */
  async scheduleDate(userId: string, request: ScheduleDateRequest): Promise<ScheduledDate> {
    try {
      logger.info(`User ${userId} scheduling date for match ${request.matchId}`);

      // Verify the match exists and user is part of it
      const match = await db('matches')
        .where('id', request.matchId)
        .andWhere(function() {
          this.where('user1_id', userId).orWhere('user2_id', userId);
        })
        .first();

      if (!match) {
        throw new Error('Match not found or access denied');
      }

      // Verify partner is also part of the match
      const isUser1 = match.user1_id === userId;
      const expectedPartnerId = isUser1 ? match.user2_id : match.user1_id;

      if (request.partnerId !== expectedPartnerId) {
        throw new Error('Invalid partner ID for this match');
      }

      // Create the scheduled date
      const [scheduledDate] = await db('scheduled_dates')
        .insert({
          user1_id: userId,
          user2_id: request.partnerId,
          match_id: request.matchId,
          scheduled_time: request.scheduledTime,
          location_name: request.locationName || null,
          location_type: request.locationType || null,
          location_coordinates: request.locationCoordinates ? JSON.stringify(request.locationCoordinates) : null,
          notes: request.notes || null,
          status: ScheduledDateStatus.SCHEDULED,
          created_by: userId,
        })
        .returning('*');

      logger.info(`Scheduled date ${scheduledDate.id} created for match ${request.matchId}`);

      // Send notification to partner
      await notificationServiceClient.sendNotification({
        userId: request.partnerId,
        type: 'reminder',
        title: 'Date Scheduled!',
        body: 'Your match has scheduled a date with you. Tap to view details.',
        data: {
          scheduledDateId: scheduledDate.id,
          matchId: request.matchId,
          action: 'view_scheduled_date',
        },
        channel: 'push',
      });

      return this.mapScheduledDateFromDb(scheduledDate);
    } catch (error) {
      logger.error('Failed to schedule date', error);
      throw error;
    }
  }

  /**
   * Confirm a scheduled date
   */
  async confirmDate(userId: string, scheduledDateId: string): Promise<ScheduledDate> {
    try {
      const scheduledDate = await db('scheduled_dates')
        .where('id', scheduledDateId)
        .andWhere('user2_id', userId) // Only the other user can confirm
        .andWhere('status', ScheduledDateStatus.SCHEDULED)
        .first();

      if (!scheduledDate) {
        throw new Error('Scheduled date not found or already confirmed');
      }

      const [updated] = await db('scheduled_dates')
        .where('id', scheduledDateId)
        .update({
          status: ScheduledDateStatus.CONFIRMED,
          confirmed_by: userId,
          confirmed_at: new Date(),
        })
        .returning('*');

      logger.info(`Scheduled date ${scheduledDateId} confirmed by user ${userId}`);

      // Notify the creator
      await notificationServiceClient.sendNotification({
        userId: scheduledDate.user1_id,
        type: 'reminder',
        title: 'Date Confirmed!',
        body: 'Your date has been confirmed. Have a great time!',
        data: {
          scheduledDateId,
          action: 'view_scheduled_date',
        },
        channel: 'push',
      });

      return this.mapScheduledDateFromDb(updated);
    } catch (error) {
      logger.error('Failed to confirm date', error);
      throw error;
    }
  }

  /**
   * Mark a date as completed and create feedback requests
   */
  async completeDate(scheduledDateId: string): Promise<void> {
    try {
      const scheduledDate = await db('scheduled_dates')
        .where('id', scheduledDateId)
        .andWhereIn('status', [ScheduledDateStatus.SCHEDULED, ScheduledDateStatus.CONFIRMED])
        .first();

      if (!scheduledDate) {
        throw new Error('Scheduled date not found or already completed');
      }

      // Update status to completed
      await db('scheduled_dates')
        .where('id', scheduledDateId)
        .update({
          status: ScheduledDateStatus.COMPLETED,
          completed_at: new Date(),
        });

      logger.info(`Scheduled date ${scheduledDateId} marked as completed`);

      // Create feedback requests for both users (to be sent 24h later)
      const sendAt = new Date(Date.now() + FEEDBACK_REQUEST_DELAY_HOURS * 60 * 60 * 1000);
      const expiresAt = new Date(sendAt.getTime() + FEEDBACK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await db('feedback_requests').insert([
        {
          scheduled_date_id: scheduledDateId,
          user_id: scheduledDate.user1_id,
          partner_id: scheduledDate.user2_id,
          status: FeedbackRequestStatus.PENDING,
          send_at: sendAt,
          expires_at: expiresAt,
        },
        {
          scheduled_date_id: scheduledDateId,
          user_id: scheduledDate.user2_id,
          partner_id: scheduledDate.user1_id,
          status: FeedbackRequestStatus.PENDING,
          send_at: sendAt,
          expires_at: expiresAt,
        },
      ]);

      logger.info(`Feedback requests created for date ${scheduledDateId}`);
    } catch (error) {
      logger.error('Failed to complete date', error);
      throw error;
    }
  }

  // ==========================================
  // FEEDBACK REQUEST MANAGEMENT
  // ==========================================

  /**
   * Request feedback for a scheduled date
   * This is called by the job scheduler when the send_at time has passed
   */
  async requestFeedback(scheduledDateId: string): Promise<FeedbackRequest[]> {
    try {
      logger.info(`Processing feedback requests for date ${scheduledDateId}`);

      // Get pending feedback requests for this date that are ready to send
      const requests = await db('feedback_requests')
        .where('scheduled_date_id', scheduledDateId)
        .andWhere('status', FeedbackRequestStatus.PENDING)
        .andWhere('send_at', '<=', new Date());

      const results: FeedbackRequest[] = [];

      for (const request of requests) {
        // Update status to sent
        const [updated] = await db('feedback_requests')
          .where('id', request.id)
          .update({
            status: FeedbackRequestStatus.SENT,
            sent_at: new Date(),
          })
          .returning('*');

        // Send notification
        await notificationServiceClient.sendNotification({
          userId: request.user_id,
          type: 'reminder',
          title: 'How was your date?',
          body: 'Share your feedback to help improve your matches. Your response is confidential.',
          data: {
            feedbackRequestId: request.id,
            scheduledDateId,
            action: 'provide_feedback',
          },
          channel: 'push',
        });

        results.push(this.mapFeedbackRequestFromDb(updated));
        logger.info(`Feedback request ${request.id} sent to user ${request.user_id}`);
      }

      return results;
    } catch (error) {
      logger.error('Failed to request feedback', error);
      throw error;
    }
  }

  /**
   * Get pending feedback requests for a user
   */
  async getPendingFeedbackRequests(userId: string): Promise<FeedbackRequestWithDate[]> {
    try {
      const requests = await db('feedback_requests as fr')
        .join('scheduled_dates as sd', 'fr.scheduled_date_id', 'sd.id')
        .where('fr.user_id', userId)
        .whereIn('fr.status', [FeedbackRequestStatus.SENT, FeedbackRequestStatus.OPENED])
        .andWhere('fr.expires_at', '>', new Date())
        .select('fr.*', 'sd.*', 'fr.id as request_id', 'sd.id as date_id')
        .orderBy('fr.sent_at', 'desc');

      return requests.map((r: any) => ({
        ...this.mapFeedbackRequestFromDb({ ...r, id: r.request_id }),
        scheduledDate: this.mapScheduledDateFromDb({ ...r, id: r.date_id }),
      }));
    } catch (error) {
      logger.error('Failed to get pending feedback requests', error);
      throw error;
    }
  }

  /**
   * Mark feedback request as opened
   */
  async markFeedbackOpened(requestId: string, userId: string): Promise<void> {
    try {
      await db('feedback_requests')
        .where('id', requestId)
        .andWhere('user_id', userId)
        .andWhere('status', FeedbackRequestStatus.SENT)
        .update({
          status: FeedbackRequestStatus.OPENED,
          opened_at: new Date(),
        });

      logger.info(`Feedback request ${requestId} opened by user ${userId}`);
    } catch (error) {
      logger.error('Failed to mark feedback as opened', error);
      throw error;
    }
  }

  // ==========================================
  // FEEDBACK SUBMISSION
  // ==========================================

  /**
   * Submit feedback for a date
   */
  async submitFeedback(requestId: string, userId: string, feedback: SubmitFeedbackRequest): Promise<void> {
    try {
      logger.info(`User ${userId} submitting feedback for request ${requestId}`);

      // Verify the request exists and belongs to this user
      const request = await db('feedback_requests')
        .where('id', requestId)
        .andWhere('user_id', userId)
        .whereIn('status', [FeedbackRequestStatus.SENT, FeedbackRequestStatus.OPENED])
        .first();

      if (!request) {
        throw new Error('Feedback request not found or already completed');
      }

      // Validate ratings are 1-5
      const ratings = [
        feedback.overallRating,
        feedback.conversationRating,
        feedback.chemistryRating,
        feedback.punctualityRating,
        feedback.appearanceAccuracyRating,
        feedback.respectfulnessRating,
      ];

      for (const rating of ratings) {
        if (rating < 1 || rating > 5) {
          throw new Error('All ratings must be between 1 and 5');
        }
      }

      // Start transaction
      await db.transaction(async (trx) => {
        // Insert feedback
        const [feedbackRecord] = await trx('post_date_feedback')
          .insert({
            feedback_request_id: requestId,
            scheduled_date_id: request.scheduled_date_id,
            user_id: userId,
            partner_id: request.partner_id,
            overall_rating: feedback.overallRating,
            conversation_rating: feedback.conversationRating,
            chemistry_rating: feedback.chemistryRating,
            punctuality_rating: feedback.punctualityRating,
            appearance_accuracy_rating: feedback.appearanceAccuracyRating,
            respectfulness_rating: feedback.respectfulnessRating,
            would_date_again: feedback.wouldDateAgain,
            positive_notes: feedback.positiveNotes || null,
            improvement_notes: feedback.improvementNotes || null,
            date_happened: feedback.dateHappened,
            no_show_user: feedback.noShowUser || null,
            has_safety_concerns: !!feedback.safetyIssue,
            match_quality: feedback.matchQuality || null,
            compatibility_feedback: feedback.compatibilityFeedback
              ? JSON.stringify(feedback.compatibilityFeedback)
              : null,
          })
          .returning('*');

        // If there's a safety issue, record it
        if (feedback.safetyIssue) {
          await trx('feedback_safety_issues').insert({
            feedback_id: feedbackRecord.id,
            reporter_id: userId,
            reported_user_id: request.partner_id,
            category: feedback.safetyIssue.category,
            severity: feedback.safetyIssue.severity,
            description: feedback.safetyIssue.description,
            additional_details: feedback.safetyIssue.additionalDetails
              ? JSON.stringify(feedback.safetyIssue.additionalDetails)
              : null,
            status: SafetyIssueStatus.NEW,
          });

          logger.warn(`Safety issue reported by user ${userId} about user ${request.partner_id}`);

          // If severity is high or critical, flag for immediate review
          if ([SafetyIssueSeverity.HIGH, SafetyIssueSeverity.CRITICAL].includes(feedback.safetyIssue.severity)) {
            logger.error(`URGENT: Critical safety issue reported - Feedback ${feedbackRecord.id}`);
          }
        }

        // Update feedback request status
        await trx('feedback_requests')
          .where('id', requestId)
          .update({
            status: FeedbackRequestStatus.COMPLETED,
            completed_at: new Date(),
          });

        // Update partner's feedback summary
        await this.updateFeedbackSummary(trx, request.partner_id);
      });

      logger.info(`Feedback submitted successfully for request ${requestId}`);

      // Check if we should update matching weights (async, non-blocking)
      this.checkAndUpdateMatchingWeights(request.partner_id).catch((err) => {
        logger.error('Failed to update matching weights', err);
      });
    } catch (error) {
      logger.error('Failed to submit feedback', error);
      throw error;
    }
  }

  /**
   * Skip providing feedback
   */
  async skipFeedback(requestId: string, userId: string): Promise<void> {
    try {
      await db('feedback_requests')
        .where('id', requestId)
        .andWhere('user_id', userId)
        .whereIn('status', [FeedbackRequestStatus.SENT, FeedbackRequestStatus.OPENED])
        .update({
          status: FeedbackRequestStatus.SKIPPED,
        });

      logger.info(`Feedback skipped for request ${requestId} by user ${userId}`);
    } catch (error) {
      logger.error('Failed to skip feedback', error);
      throw error;
    }
  }

  // ==========================================
  // STATISTICS & ANALYTICS
  // ==========================================

  /**
   * Get feedback statistics for a user
   */
  async getFeedbackStats(userId: string): Promise<FeedbackStats> {
    try {
      // Get total dates
      const totalDates = await db('scheduled_dates')
        .where(function() {
          this.where('user1_id', userId).orWhere('user2_id', userId);
        })
        .count('id as count')
        .first();

      // Get completed dates
      const completedDates = await db('scheduled_dates')
        .where(function() {
          this.where('user1_id', userId).orWhere('user2_id', userId);
        })
        .andWhere('status', ScheduledDateStatus.COMPLETED)
        .count('id as count')
        .first();

      // Get feedback provided by this user
      const feedbackProvided = await db('post_date_feedback')
        .where('user_id', userId)
        .count('id as count')
        .first();

      // Get pending feedback requests
      const feedbackPending = await db('feedback_requests')
        .where('user_id', userId)
        .whereIn('status', [FeedbackRequestStatus.SENT, FeedbackRequestStatus.OPENED])
        .andWhere('expires_at', '>', new Date())
        .count('id as count')
        .first();

      // Get average rating given
      const avgRatingGiven = await db('post_date_feedback')
        .where('user_id', userId)
        .avg('overall_rating as avg')
        .first();

      // Get average rating received (from summary table)
      const summary = await db('date_feedback_summary')
        .where('user_id', userId)
        .first();

      // Calculate date success rate
      const successfulDates = summary ? summary.would_date_again_yes_count : 0;
      const totalFeedback = summary ? summary.total_feedback_received : 0;
      const dateSuccessRate = totalFeedback > 0 ? (successfulDates / totalFeedback) * 100 : null;

      return {
        totalDates: parseInt(totalDates?.count as string || '0', 10),
        completedDates: parseInt(completedDates?.count as string || '0', 10),
        feedbackProvided: parseInt(feedbackProvided?.count as string || '0', 10),
        feedbackPending: parseInt(feedbackPending?.count as string || '0', 10),
        avgRatingGiven: avgRatingGiven?.avg ? parseFloat(avgRatingGiven.avg as string) : null,
        avgRatingReceived: summary?.avg_overall_rating ? parseFloat(summary.avg_overall_rating) : null,
        dateSuccessRate,
        categoryAverages: {
          conversation: summary?.avg_conversation_rating ? parseFloat(summary.avg_conversation_rating) : null,
          chemistry: summary?.avg_chemistry_rating ? parseFloat(summary.avg_chemistry_rating) : null,
          punctuality: summary?.avg_punctuality_rating ? parseFloat(summary.avg_punctuality_rating) : null,
          appearanceAccuracy: summary?.avg_appearance_accuracy_rating ? parseFloat(summary.avg_appearance_accuracy_rating) : null,
          respectfulness: summary?.avg_respectfulness_rating ? parseFloat(summary.avg_respectfulness_rating) : null,
        },
      };
    } catch (error) {
      logger.error('Failed to get feedback stats', error);
      throw error;
    }
  }

  /**
   * Get date success rate for a user
   */
  async getDateSuccessRate(userId: string): Promise<DateSuccessRateResponse> {
    try {
      const summary = await db('date_feedback_summary')
        .where('user_id', userId)
        .first();

      if (!summary || summary.total_feedback_received === 0) {
        return {
          successRate: null,
          totalDates: 0,
          successfulDates: 0,
          message: 'Not enough data to calculate success rate',
        };
      }

      const successRate = (summary.would_date_again_yes_count / summary.total_feedback_received) * 100;

      return {
        successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
        totalDates: summary.total_dates_completed,
        successfulDates: summary.would_date_again_yes_count,
        message: successRate >= 70
          ? 'Great job! Your dates love meeting you.'
          : successRate >= 50
            ? 'You\'re doing well! Keep being yourself.'
            : 'Room for improvement. Consider reading our dating tips.',
      };
    } catch (error) {
      logger.error('Failed to get date success rate', error);
      throw error;
    }
  }

  // ==========================================
  // MATCHING WEIGHT UPDATES
  // ==========================================

  /**
   * Update matching weights based on feedback data
   */
  async updateMatchingWeights(userId: string): Promise<WeightUpdateResult> {
    try {
      logger.info(`Updating matching weights for user ${userId}`);

      // Get all feedback provided by this user
      const feedback = await db('post_date_feedback')
        .where('user_id', userId)
        .orderBy('created_at', 'desc');

      if (feedback.length < MIN_FEEDBACK_FOR_WEIGHT_UPDATE) {
        throw new Error(`Need at least ${MIN_FEEDBACK_FOR_WEIGHT_UPDATE} feedback entries to update weights`);
      }

      // Get current weights (or create default)
      let currentWeights = await db('user_matching_weights')
        .where('user_id', userId)
        .first();

      const previousWeights = currentWeights ? { ...currentWeights } : null;

      // Analyze feedback patterns to determine what matters most to this user
      const analysisResult = this.analyzeFeedbackPatterns(feedback);

      // Calculate new weights based on analysis
      const newWeights = this.calculateNewWeights(analysisResult);

      // Calculate success stats
      const successfulDates = feedback.filter((f: any) => f.would_date_again === WouldDateAgain.YES).length;
      const avgRating = feedback.reduce((sum: number, f: any) => sum + f.overall_rating, 0) / feedback.length;

      // Upsert the weights
      if (currentWeights) {
        await db('user_matching_weights')
          .where('user_id', userId)
          .update({
            ...newWeights,
            total_dates: feedback.length,
            successful_dates: successfulDates,
            avg_rating_received: avgRating,
            date_success_rate: feedback.length > 0 ? successfulDates / feedback.length : null,
            last_calculated_at: new Date(),
            feedback_count_at_calculation: feedback.length,
          });
      } else {
        await db('user_matching_weights').insert({
          user_id: userId,
          ...newWeights,
          total_dates: feedback.length,
          successful_dates: successfulDates,
          avg_rating_received: avgRating,
          date_success_rate: feedback.length > 0 ? successfulDates / feedback.length : null,
          last_calculated_at: new Date(),
          feedback_count_at_calculation: feedback.length,
        });
      }

      // Determine significant changes
      const significantChanges = this.detectSignificantChanges(previousWeights, newWeights);

      logger.info(`Matching weights updated for user ${userId}. Changes: ${significantChanges.join(', ') || 'minor adjustments'}`);

      return {
        userId,
        previousWeights: previousWeights || {},
        newWeights,
        feedbackAnalyzed: feedback.length,
        significantChanges,
      };
    } catch (error) {
      logger.error('Failed to update matching weights', error);
      throw error;
    }
  }

  /**
   * Get user's matching weights for use in recommendation algorithm
   */
  async getUserMatchingWeights(userId: string): Promise<UserMatchingWeights | null> {
    try {
      const weights = await db('user_matching_weights')
        .where('user_id', userId)
        .first();

      return weights ? this.mapUserMatchingWeightsFromDb(weights) : null;
    } catch (error) {
      logger.error('Failed to get user matching weights', error);
      throw error;
    }
  }

  // ==========================================
  // SAFETY ISSUE MANAGEMENT
  // ==========================================

  /**
   * Flag a safety issue from existing feedback
   */
  async flagSafetyIssue(
    feedbackId: string,
    issue: {
      category: string;
      severity: SafetyIssueSeverity;
      description: string;
      additionalDetails?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const feedback = await db('post_date_feedback')
        .where('id', feedbackId)
        .first();

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      // Check if safety issue already exists for this feedback
      const existingIssue = await db('feedback_safety_issues')
        .where('feedback_id', feedbackId)
        .first();

      if (existingIssue) {
        throw new Error('Safety issue already reported for this feedback');
      }

      await db.transaction(async (trx) => {
        // Create safety issue
        await trx('feedback_safety_issues').insert({
          feedback_id: feedbackId,
          reporter_id: feedback.user_id,
          reported_user_id: feedback.partner_id,
          category: issue.category,
          severity: issue.severity,
          description: issue.description,
          additional_details: issue.additionalDetails ? JSON.stringify(issue.additionalDetails) : null,
          status: SafetyIssueStatus.NEW,
        });

        // Update feedback to mark it has safety concerns
        await trx('post_date_feedback')
          .where('id', feedbackId)
          .update({ has_safety_concerns: true });
      });

      logger.warn(`Safety issue flagged for feedback ${feedbackId}`);

      // If severity is high or critical, log urgently
      if ([SafetyIssueSeverity.HIGH, SafetyIssueSeverity.CRITICAL].includes(issue.severity)) {
        logger.error(`URGENT: Critical safety issue reported - Feedback ${feedbackId}`);
      }
    } catch (error) {
      logger.error('Failed to flag safety issue', error);
      throw error;
    }
  }

  /**
   * Get safety issues for admin review
   */
  async getSafetyIssues(status?: SafetyIssueStatus, limit = 50): Promise<SafetyIssue[]> {
    try {
      let query = db('feedback_safety_issues')
        .orderBy('created_at', 'desc')
        .limit(limit);

      if (status) {
        query = query.where('status', status);
      }

      const issues = await query;
      return issues.map((i: any) => this.mapSafetyIssueFromDb(i));
    } catch (error) {
      logger.error('Failed to get safety issues', error);
      throw error;
    }
  }

  // ==========================================
  // JOB HANDLERS
  // ==========================================

  /**
   * Process pending feedback requests that need to be sent
   * Called by cron job
   */
  async processPendingFeedbackRequests(): Promise<void> {
    try {
      logger.info('Processing pending feedback requests...');

      const pendingRequests = await db('feedback_requests')
        .where('status', FeedbackRequestStatus.PENDING)
        .andWhere('send_at', '<=', new Date())
        .limit(100);

      for (const request of pendingRequests) {
        try {
          await this.requestFeedback(request.scheduled_date_id);
        } catch (error) {
          logger.error(`Failed to process feedback request ${request.id}`, error);
        }
      }

      logger.info(`Processed ${pendingRequests.length} pending feedback requests`);
    } catch (error) {
      logger.error('Failed to process pending feedback requests', error);
      throw error;
    }
  }

  /**
   * Send reminders for unanswered feedback requests
   */
  async sendFeedbackReminders(): Promise<void> {
    try {
      logger.info('Sending feedback reminders...');

      const now = new Date();

      for (const hours of REMINDER_INTERVALS_HOURS) {
        const reminderThreshold = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const requestsToRemind = await db('feedback_requests')
          .whereIn('status', [FeedbackRequestStatus.SENT, FeedbackRequestStatus.OPENED])
          .andWhere('sent_at', '<=', reminderThreshold)
          .andWhere('expires_at', '>', now)
          .andWhere(function() {
            this.where('last_reminder_at', '<', reminderThreshold)
              .orWhereNull('last_reminder_at');
          })
          .andWhere('reminder_count', '<', REMINDER_INTERVALS_HOURS.length)
          .limit(100);

        for (const request of requestsToRemind) {
          try {
            await notificationServiceClient.sendNotification({
              userId: request.user_id,
              type: 'reminder',
              title: 'Feedback Reminder',
              body: 'We\'d love to hear about your recent date! Your feedback helps us improve your matches.',
              data: {
                feedbackRequestId: request.id,
                scheduledDateId: request.scheduled_date_id,
                action: 'provide_feedback',
              },
              channel: 'push',
            });

            await db('feedback_requests')
              .where('id', request.id)
              .update({
                reminder_count: request.reminder_count + 1,
                last_reminder_at: now,
              });

            logger.info(`Reminder sent for feedback request ${request.id}`);
          } catch (error) {
            logger.error(`Failed to send reminder for request ${request.id}`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to send feedback reminders', error);
      throw error;
    }
  }

  /**
   * Expire old feedback requests
   */
  async expireFeedbackRequests(): Promise<void> {
    try {
      logger.info('Expiring old feedback requests...');

      const result = await db('feedback_requests')
        .whereIn('status', [FeedbackRequestStatus.PENDING, FeedbackRequestStatus.SENT, FeedbackRequestStatus.OPENED])
        .andWhere('expires_at', '<=', new Date())
        .update({ status: FeedbackRequestStatus.EXPIRED });

      logger.info(`Expired ${result} feedback requests`);
    } catch (error) {
      logger.error('Failed to expire feedback requests', error);
      throw error;
    }
  }

  /**
   * Auto-complete dates that have passed their scheduled time
   */
  async autoCompletePastDates(): Promise<void> {
    try {
      logger.info('Auto-completing past dates...');

      const threshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours after scheduled time

      const pastDates = await db('scheduled_dates')
        .whereIn('status', [ScheduledDateStatus.SCHEDULED, ScheduledDateStatus.CONFIRMED])
        .andWhere('scheduled_time', '<', threshold)
        .limit(100);

      for (const date of pastDates) {
        try {
          await this.completeDate(date.id);
        } catch (error) {
          logger.error(`Failed to auto-complete date ${date.id}`, error);
        }
      }

      logger.info(`Auto-completed ${pastDates.length} past dates`);
    } catch (error) {
      logger.error('Failed to auto-complete past dates', error);
      throw error;
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  /**
   * Update feedback summary for a user
   */
  private async updateFeedbackSummary(trx: any, userId: string): Promise<void> {
    // Calculate aggregates from all feedback received
    const aggregates = await trx('post_date_feedback')
      .where('partner_id', userId)
      .select(
        trx.raw('AVG(overall_rating) as avg_overall'),
        trx.raw('AVG(conversation_rating) as avg_conversation'),
        trx.raw('AVG(chemistry_rating) as avg_chemistry'),
        trx.raw('AVG(punctuality_rating) as avg_punctuality'),
        trx.raw('AVG(appearance_accuracy_rating) as avg_appearance'),
        trx.raw('AVG(respectfulness_rating) as avg_respectfulness'),
        trx.raw('COUNT(*) as total_feedback'),
        trx.raw('SUM(CASE WHEN would_date_again = ? THEN 1 ELSE 0 END) as yes_count', [WouldDateAgain.YES]),
        trx.raw('SUM(CASE WHEN would_date_again = ? THEN 1 ELSE 0 END) as maybe_count', [WouldDateAgain.MAYBE]),
        trx.raw('SUM(CASE WHEN would_date_again = ? THEN 1 ELSE 0 END) as no_count', [WouldDateAgain.NO]),
        trx.raw('SUM(CASE WHEN date_happened = false THEN 1 ELSE 0 END) as no_show_count'),
        trx.raw('SUM(CASE WHEN has_safety_concerns = true THEN 1 ELSE 0 END) as safety_count')
      )
      .first();

    // Get total completed dates
    const datesCount = await trx('scheduled_dates')
      .where(function() {
        this.where('user1_id', userId).orWhere('user2_id', userId);
      })
      .andWhere('status', ScheduledDateStatus.COMPLETED)
      .count('id as count')
      .first();

    // Upsert summary
    await trx('date_feedback_summary')
      .insert({
        user_id: userId,
        avg_overall_rating: aggregates.avg_overall,
        avg_conversation_rating: aggregates.avg_conversation,
        avg_chemistry_rating: aggregates.avg_chemistry,
        avg_punctuality_rating: aggregates.avg_punctuality,
        avg_appearance_accuracy_rating: aggregates.avg_appearance,
        avg_respectfulness_rating: aggregates.avg_respectfulness,
        would_date_again_yes_count: parseInt(aggregates.yes_count || '0', 10),
        would_date_again_maybe_count: parseInt(aggregates.maybe_count || '0', 10),
        would_date_again_no_count: parseInt(aggregates.no_count || '0', 10),
        total_dates_completed: parseInt(datesCount?.count as string || '0', 10),
        total_feedback_received: parseInt(aggregates.total_feedback || '0', 10),
        no_show_count: parseInt(aggregates.no_show_count || '0', 10),
        safety_concerns_count: parseInt(aggregates.safety_count || '0', 10),
      })
      .onConflict('user_id')
      .merge();
  }

  /**
   * Check if we should update matching weights and do so if needed
   */
  private async checkAndUpdateMatchingWeights(userId: string): Promise<void> {
    const feedbackCount = await db('post_date_feedback')
      .where('user_id', userId)
      .count('id as count')
      .first();

    const count = parseInt(feedbackCount?.count as string || '0', 10);

    if (count >= MIN_FEEDBACK_FOR_WEIGHT_UPDATE) {
      const existingWeights = await db('user_matching_weights')
        .where('user_id', userId)
        .first();

      // Only update if we have new feedback since last calculation
      if (!existingWeights || count > existingWeights.feedback_count_at_calculation) {
        await this.updateMatchingWeights(userId);
      }
    }
  }

  /**
   * Analyze feedback patterns to understand user preferences
   */
  private analyzeFeedbackPatterns(feedback: any[]): {
    categoryCorrelations: Record<string, number>;
    successPatterns: Record<string, any>;
  } {
    // Calculate correlation between each category rating and "would_date_again = yes"
    const categories = ['conversation', 'chemistry', 'punctuality', 'appearance_accuracy', 'respectfulness'];
    const correlations: Record<string, number> = {};

    for (const category of categories) {
      const ratingKey = `${category}_rating`;
      const successfulDates = feedback.filter((f) => f.would_date_again === WouldDateAgain.YES);
      const unsuccessfulDates = feedback.filter((f) => f.would_date_again !== WouldDateAgain.YES);

      const avgSuccessRating = successfulDates.length > 0
        ? successfulDates.reduce((sum, f) => sum + f[ratingKey], 0) / successfulDates.length
        : 0;

      const avgFailRating = unsuccessfulDates.length > 0
        ? unsuccessfulDates.reduce((sum, f) => sum + f[ratingKey], 0) / unsuccessfulDates.length
        : 0;

      // Higher difference = more important factor
      correlations[category] = Math.max(0, avgSuccessRating - avgFailRating);
    }

    // Normalize correlations
    const totalCorrelation = Object.values(correlations).reduce((sum, v) => sum + v, 0);
    if (totalCorrelation > 0) {
      for (const category of categories) {
        correlations[category] = correlations[category] / totalCorrelation;
      }
    } else {
      // Default to equal weights if no pattern found
      for (const category of categories) {
        correlations[category] = 0.2;
      }
    }

    return {
      categoryCorrelations: correlations,
      successPatterns: {
        avgSuccessfulRating: feedback
          .filter((f) => f.would_date_again === WouldDateAgain.YES)
          .reduce((sum, f) => sum + f.overall_rating, 0) / Math.max(1, feedback.filter((f) => f.would_date_again === WouldDateAgain.YES).length),
      },
    };
  }

  /**
   * Calculate new weights based on feedback analysis
   */
  private calculateNewWeights(analysis: { categoryCorrelations: Record<string, number> }): Partial<UserMatchingWeights> {
    const { categoryCorrelations } = analysis;

    return {
      conversationImportance: categoryCorrelations.conversation || 0.2,
      chemistryImportance: categoryCorrelations.chemistry || 0.2,
      punctualityImportance: categoryCorrelations.punctuality || 0.15,
      appearanceAccuracyImportance: categoryCorrelations.appearance_accuracy || 0.2,
      respectfulnessImportance: categoryCorrelations.respectfulness || 0.25,
    };
  }

  /**
   * Detect significant changes in weights
   */
  private detectSignificantChanges(
    previous: Partial<UserMatchingWeights> | null,
    current: Partial<UserMatchingWeights>
  ): string[] {
    if (!previous) return ['Initial weight calculation'];

    const changes: string[] = [];
    const threshold = 0.1; // 10% change is significant

    const fields = [
      { key: 'conversationImportance', name: 'Conversation' },
      { key: 'chemistryImportance', name: 'Chemistry' },
      { key: 'punctualityImportance', name: 'Punctuality' },
      { key: 'appearanceAccuracyImportance', name: 'Appearance accuracy' },
      { key: 'respectfulnessImportance', name: 'Respectfulness' },
    ];

    for (const { key, name } of fields) {
      const prevVal = (previous as any)[key] || 0.2;
      const currVal = (current as any)[key] || 0.2;
      const diff = currVal - prevVal;

      if (Math.abs(diff) >= threshold) {
        changes.push(`${name} ${diff > 0 ? 'increased' : 'decreased'} by ${Math.round(Math.abs(diff) * 100)}%`);
      }
    }

    return changes;
  }

  // ==========================================
  // DATABASE MAPPERS
  // ==========================================

  private mapScheduledDateFromDb(row: any): ScheduledDate {
    return {
      id: row.id,
      user1Id: row.user1_id,
      user2Id: row.user2_id,
      matchId: row.match_id,
      scheduledTime: new Date(row.scheduled_time),
      locationName: row.location_name,
      locationType: row.location_type,
      locationCoordinates: row.location_coordinates ? JSON.parse(row.location_coordinates) : undefined,
      notes: row.notes,
      status: row.status,
      createdBy: row.created_by,
      confirmedBy: row.confirmed_by,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
      cancelledBy: row.cancelled_by,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
      cancellationReason: row.cancellation_reason,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapFeedbackRequestFromDb(row: any): FeedbackRequest {
    return {
      id: row.id,
      scheduledDateId: row.scheduled_date_id,
      userId: row.user_id,
      partnerId: row.partner_id,
      status: row.status,
      sendAt: new Date(row.send_at),
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      expiresAt: new Date(row.expires_at),
      reminderCount: row.reminder_count,
      lastReminderAt: row.last_reminder_at ? new Date(row.last_reminder_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapSafetyIssueFromDb(row: any): SafetyIssue {
    return {
      id: row.id,
      feedbackId: row.feedback_id,
      reporterId: row.reporter_id,
      reportedUserId: row.reported_user_id,
      category: row.category,
      severity: row.severity,
      description: row.description,
      additionalDetails: row.additional_details ? JSON.parse(row.additional_details) : undefined,
      status: row.status,
      actionNotes: row.action_notes,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapUserMatchingWeightsFromDb(row: any): UserMatchingWeights {
    return {
      id: row.id,
      userId: row.user_id,
      distanceWeight: parseFloat(row.distance_weight),
      interestsWeight: parseFloat(row.interests_weight),
      activityWeight: parseFloat(row.activity_weight),
      preferencesWeight: parseFloat(row.preferences_weight),
      conversationImportance: parseFloat(row.conversation_importance),
      chemistryImportance: parseFloat(row.chemistry_importance),
      punctualityImportance: parseFloat(row.punctuality_importance),
      appearanceAccuracyImportance: parseFloat(row.appearance_accuracy_importance),
      respectfulnessImportance: parseFloat(row.respectfulness_importance),
      totalDates: row.total_dates,
      successfulDates: row.successful_dates,
      avgRatingReceived: row.avg_rating_received ? parseFloat(row.avg_rating_received) : undefined,
      dateSuccessRate: row.date_success_rate ? parseFloat(row.date_success_rate) : undefined,
      lastCalculatedAt: row.last_calculated_at ? new Date(row.last_calculated_at) : undefined,
      feedbackCountAtCalculation: row.feedback_count_at_calculation,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new PostDateFeedbackService();
