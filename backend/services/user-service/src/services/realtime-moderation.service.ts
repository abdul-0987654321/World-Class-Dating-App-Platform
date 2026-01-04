/**
 * Real-time Content Moderation Service
 * Provides instant content moderation for messages and content updates
 * Integrates with harassment detection and moderation queue
 */

import { db } from '../infrastructure/database';
import { harassmentDetectionService, HarassmentDetectionResult } from './harassment-detection.service';
import { enhancedBlockService } from './enhanced-block.service';
import logger from '../utils/logger';

export interface ModerationDecision {
  allow: boolean;
  action: 'allow' | 'warn' | 'block' | 'queue' | 'reject';
  reason?: string;
  riskScore: number;
  flaggedCategories: string[];
  requiresReview: boolean;
  autoBlockTriggered: boolean;
  detectionId?: string;
}

export interface ContentToModerate {
  contentId: string;
  contentType: 'message' | 'photo' | 'bio' | 'prompt_response' | 'profile_update';
  senderId: string;
  recipientId?: string;
  content: string;
  contentUrl?: string;
  conversationId?: string;
}

export interface ModerationQueueItem {
  id: string;
  userId: string;
  contentId: string;
  contentType: string;
  contentPreview?: string;
  contentUrl?: string;
  isUrgent: boolean;
  isAutoFlagged: boolean;
  riskScore: number;
  flaggedCategories: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated';
  assignedTo?: string;
  assignedAt?: Date;
  processedBy?: string;
  processedAt?: Date;
  processingNotes?: string;
  actionTaken?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Moderation thresholds
const THRESHOLDS = {
  allowWithWarning: 0.3,
  queueForReview: 0.5,
  blockContent: 0.7,
  autoBlockUser: 0.85,
};

class RealtimeModerationService {
  /**
   * Moderate content in real-time
   * Returns immediately with moderation decision
   */
  async moderateContent(content: ContentToModerate): Promise<ModerationDecision> {
    const startTime = Date.now();

    try {
      // Analyze content for harassment and violations
      const detectionResult = await harassmentDetectionService.analyzeContent(
        content.content,
        content.senderId,
        {
          recipientId: content.recipientId,
          messageId: content.contentId,
          conversationId: content.conversationId,
          contentType: content.contentType === 'message' ? 'message' : 'profile_bio',
          saveResult: true,
        }
      );

      // Make moderation decision based on risk score
      const decision = this.makeDecision(detectionResult, content);

      // If needs review, add to moderation queue
      if (decision.action === 'queue') {
        await this.addToModerationQueue(content, detectionResult, decision);
      }

      // If auto-block triggered, block the user
      if (decision.autoBlockTriggered && content.recipientId) {
        await enhancedBlockService.autoBlockForHarassment(
          content.senderId,
          content.recipientId,
          detectionResult.id || 'unknown',
          decision.riskScore
        );
      }

      // Log moderation decision
      const processingTime = Date.now() - startTime;
      logger.info(`Content moderated in ${processingTime}ms`, {
        contentId: content.contentId,
        contentType: content.contentType,
        decision: decision.action,
        riskScore: decision.riskScore,
        processingTime,
      });

      return decision;
    } catch (error) {
      logger.error('Real-time moderation failed:', error);

      // Return allow decision on error to not block legitimate content
      // but log for manual review
      return {
        allow: true,
        action: 'allow',
        reason: 'Moderation service error - content allowed pending manual review',
        riskScore: 0,
        flaggedCategories: [],
        requiresReview: true,
        autoBlockTriggered: false,
      };
    }
  }

  /**
   * Moderate a message before sending
   */
  async moderateMessage(
    senderId: string,
    recipientId: string,
    messageContent: string,
    conversationId: string,
    messageId: string
  ): Promise<ModerationDecision> {
    return this.moderateContent({
      contentId: messageId,
      contentType: 'message',
      senderId,
      recipientId,
      content: messageContent,
      conversationId,
    });
  }

  /**
   * Moderate profile update
   */
  async moderateProfileUpdate(
    userId: string,
    field: 'bio' | 'prompt_response',
    content: string,
    contentId: string
  ): Promise<ModerationDecision> {
    return this.moderateContent({
      contentId,
      contentType: field,
      senderId: userId,
      content,
    });
  }

  /**
   * Get moderation queue items
   */
  async getModerationQueue(options: {
    status?: string;
    isUrgent?: boolean;
    contentType?: string;
    limit?: number;
    offset?: number;
    assignedTo?: string;
  } = {}): Promise<{
    items: ModerationQueueItem[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      status = 'pending',
      isUrgent,
      contentType,
      limit = 50,
      offset = 0,
      assignedTo,
    } = options;

    try {
      let query = db('realtime_moderation_queue')
        .leftJoin('users', 'realtime_moderation_queue.user_id', 'users.id')
        .select('realtime_moderation_queue.*', 'users.email', 'users.first_name');

      if (status !== 'all') {
        query = query.where('realtime_moderation_queue.status', status);
      }

      if (isUrgent !== undefined) {
        query = query.where('realtime_moderation_queue.is_urgent', isUrgent);
      }

      if (contentType) {
        query = query.where('realtime_moderation_queue.content_type', contentType);
      }

      if (assignedTo) {
        query = query.where('realtime_moderation_queue.assigned_to', assignedTo);
      }

      // Count total
      const [{ count: total }] = await query.clone().count('realtime_moderation_queue.id as count');

      // Get items
      const items = await query
        .orderBy('is_urgent', 'desc')
        .orderBy('risk_score', 'desc')
        .orderBy('created_at', 'asc')
        .limit(limit)
        .offset(offset);

      return {
        items: items.map(this.mapToQueueItem),
        total: parseInt(total as string, 10),
        hasMore: offset + limit < parseInt(total as string, 10),
      };
    } catch (e) {
      return { items: [], total: 0, hasMore: false };
    }
  }

  /**
   * Assign queue item to moderator
   */
  async assignQueueItem(
    queueItemId: string,
    moderatorId: string
  ): Promise<ModerationQueueItem | null> {
    try {
      const [updated] = await db('realtime_moderation_queue')
        .where({ id: queueItemId, status: 'pending' })
        .update({
          status: 'in_review',
          assigned_to: moderatorId,
          assigned_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      return updated ? this.mapToQueueItem(updated) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Process queue item (approve/reject)
   */
  async processQueueItem(
    queueItemId: string,
    moderatorId: string,
    decision: {
      status: 'approved' | 'rejected' | 'escalated';
      actionTaken?: 'approved' | 'hidden' | 'removed' | 'user_warned' | 'user_suspended' | 'user_banned';
      notes?: string;
    }
  ): Promise<ModerationQueueItem | null> {
    try {
      const queueItem = await db('realtime_moderation_queue')
        .where({ id: queueItemId })
        .first();

      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      const [updated] = await db('realtime_moderation_queue')
        .where({ id: queueItemId })
        .update({
          status: decision.status,
          processed_by: moderatorId,
          processed_at: new Date(),
          processing_notes: decision.notes,
          action_taken: decision.actionTaken,
          updated_at: new Date(),
        })
        .returning('*');

      // Log moderator action
      await db('moderator_action_logs').insert({
        moderator_id: moderatorId,
        target_user_id: queueItem.user_id,
        content_id: queueItem.content_id,
        action_type: decision.status === 'approved' ? 'content_approved' : 'content_removed',
        action_details: JSON.stringify(decision),
        created_at: new Date(),
      });

      // If action taken against user, update their safety score
      if (decision.actionTaken && decision.actionTaken !== 'approved') {
        await this.updateUserForViolation(queueItem.user_id, decision.actionTaken);
      }

      logger.info(`Queue item ${queueItemId} processed`, {
        status: decision.status,
        actionTaken: decision.actionTaken,
        moderatorId,
      });

      return updated ? this.mapToQueueItem(updated) : null;
    } catch (e) {
      logger.error('Failed to process queue item:', e);
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStatistics(): Promise<{
    pending: number;
    inReview: number;
    urgent: number;
    processedToday: number;
    averageWaitTimeMinutes: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [stats] = await db('realtime_moderation_queue')
        .select(
          db.raw("COUNT(*) FILTER (WHERE status = 'pending') as pending"),
          db.raw("COUNT(*) FILTER (WHERE status = 'in_review') as in_review"),
          db.raw("COUNT(*) FILTER (WHERE is_urgent = true AND status = 'pending') as urgent"),
          db.raw(`COUNT(*) FILTER (WHERE processed_at >= '${today.toISOString()}') as processed_today`)
        ) as { pending: string; in_review: string; urgent: string; processed_today: string }[];

      // Calculate average wait time for processed items
      const processedItems = await db('realtime_moderation_queue')
        .whereNotNull('processed_at')
        .select('created_at', 'processed_at')
        .limit(100)
        .orderBy('processed_at', 'desc');

      let averageWaitTimeMinutes = 0;
      if (processedItems.length > 0) {
        const totalMinutes = processedItems.reduce((sum, item) => {
          const created = new Date(item.created_at).getTime();
          const processed = new Date(item.processed_at).getTime();
          return sum + (processed - created) / (1000 * 60);
        }, 0);
        averageWaitTimeMinutes = Math.round(totalMinutes / processedItems.length);
      }

      return {
        pending: parseInt(stats.pending || '0', 10),
        inReview: parseInt(stats.in_review || '0', 10),
        urgent: parseInt(stats.urgent || '0', 10),
        processedToday: parseInt(stats.processed_today || '0', 10),
        averageWaitTimeMinutes,
      };
    } catch (e) {
      return {
        pending: 0,
        inReview: 0,
        urgent: 0,
        processedToday: 0,
        averageWaitTimeMinutes: 0,
      };
    }
  }

  /**
   * Get user's moderation history
   */
  async getUserModerationHistory(
    userId: string,
    limit: number = 50
  ): Promise<ModerationQueueItem[]> {
    try {
      const items = await db('realtime_moderation_queue')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(limit);

      return items.map(this.mapToQueueItem);
    } catch (e) {
      return [];
    }
  }

  // Private helper methods

  private makeDecision(
    detectionResult: HarassmentDetectionResult,
    content: ContentToModerate
  ): ModerationDecision {
    const riskScore = detectionResult.overallRiskScore;
    const flaggedCategories = detectionResult.detectedPatterns.map(p => p.category);

    // Determine action based on risk score
    if (riskScore >= THRESHOLDS.autoBlockUser) {
      return {
        allow: false,
        action: 'reject',
        reason: 'Content violates community guidelines and contains severe violations',
        riskScore,
        flaggedCategories,
        requiresReview: true,
        autoBlockTriggered: true,
        detectionId: detectionResult.id,
      };
    }

    if (riskScore >= THRESHOLDS.blockContent) {
      return {
        allow: false,
        action: 'reject',
        reason: 'Content violates community guidelines',
        riskScore,
        flaggedCategories,
        requiresReview: true,
        autoBlockTriggered: false,
        detectionId: detectionResult.id,
      };
    }

    if (riskScore >= THRESHOLDS.queueForReview) {
      return {
        allow: true, // Allow but queue for review
        action: 'queue',
        reason: 'Content flagged for manual review',
        riskScore,
        flaggedCategories,
        requiresReview: true,
        autoBlockTriggered: false,
        detectionId: detectionResult.id,
      };
    }

    if (riskScore >= THRESHOLDS.allowWithWarning) {
      return {
        allow: true,
        action: 'warn',
        reason: 'Content allowed with warning',
        riskScore,
        flaggedCategories,
        requiresReview: false,
        autoBlockTriggered: false,
        detectionId: detectionResult.id,
      };
    }

    return {
      allow: true,
      action: 'allow',
      riskScore,
      flaggedCategories: [],
      requiresReview: false,
      autoBlockTriggered: false,
    };
  }

  private async addToModerationQueue(
    content: ContentToModerate,
    detectionResult: HarassmentDetectionResult,
    decision: ModerationDecision
  ): Promise<void> {
    try {
      await db('realtime_moderation_queue').insert({
        user_id: content.senderId,
        content_id: content.contentId,
        content_type: content.contentType,
        content_preview: content.content.substring(0, 500),
        content_url: content.contentUrl,
        is_urgent: decision.riskScore >= 0.8,
        is_auto_flagged: true,
        risk_score: decision.riskScore,
        flagged_categories: JSON.stringify(decision.flaggedCategories),
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (e) {
      logger.error('Failed to add to moderation queue:', e);
    }
  }

  private async updateUserForViolation(
    userId: string,
    actionTaken: string
  ): Promise<void> {
    try {
      const existing = await db('user_safety_scores').where('user_id', userId).first();

      const violationPenalty = {
        hidden: 5,
        removed: 10,
        user_warned: 15,
        user_suspended: 30,
        user_banned: 100,
      };

      const penalty = violationPenalty[actionTaken as keyof typeof violationPenalty] || 5;

      const updates = {
        overall_safety_score: Math.max(0, (existing?.overall_safety_score || 100) - penalty),
        is_flagged: penalty >= 10,
        is_under_review: penalty >= 20,
        updated_at: new Date(),
      };

      if (existing) {
        await db('user_safety_scores').where('user_id', userId).update(updates);
      } else {
        await db('user_safety_scores').insert({
          user_id: userId,
          ...updates,
          created_at: new Date(),
        });
      }
    } catch (e) {
      logger.error('Failed to update user safety score for violation:', e);
    }
  }

  private mapToQueueItem(record: any): ModerationQueueItem {
    return {
      id: record.id,
      userId: record.user_id,
      contentId: record.content_id,
      contentType: record.content_type,
      contentPreview: record.content_preview,
      contentUrl: record.content_url,
      isUrgent: record.is_urgent,
      isAutoFlagged: record.is_auto_flagged,
      riskScore: record.risk_score,
      flaggedCategories: record.flagged_categories
        ? (typeof record.flagged_categories === 'string'
          ? JSON.parse(record.flagged_categories)
          : record.flagged_categories)
        : [],
      status: record.status,
      assignedTo: record.assigned_to,
      assignedAt: record.assigned_at,
      processedBy: record.processed_by,
      processedAt: record.processed_at,
      processingNotes: record.processing_notes,
      actionTaken: record.action_taken,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}

export const realtimeModerationService = new RealtimeModerationService();
export default realtimeModerationService;
