import { v4 as uuidv4 } from 'uuid';
import awsRekognitionService from './aws-rekognition.service';
import azureContentModeratorService from './azure-content-moderator.service';
import db from '../infrastructure/database/connection';
import config from '../config';
import { createLogger } from '../utils/logger';
import notificationClient from '../infrastructure/clients/notification-service.client';
import {
  ModerationResult,
  ModerationStatus,
  ModerationAction,
  ContentType,
  ViolationType,
  ModerateImageRequest,
  ModerateTextRequest,
  ModerationLog,
  UserViolation,
  UserModerationRecord,
  ModerationQueueItem,
  UserModerationStatus,
} from '../types';

const logger = createLogger('moderation-service');

export class ModerationService {
  /**
   * Moderate an image
   */
  async moderateImage(request: ModerateImageRequest): Promise<ModerationResult> {
    try {
      logger.info(`Moderating image for user ${request.userId}, content ${request.contentId}`);

      // Call AWS Rekognition
      const imageModerationResult = await awsRekognitionService.moderateImage(request.imageUrl);

      // Determine status and action based on risk score
      const { status, action } = this.determineStatusAndAction(
        imageModerationResult.overallRiskScore,
        imageModerationResult.detectedViolations
      );

      // Create moderation result
      const moderationResult: ModerationResult = {
        contentId: request.contentId,
        contentType: request.contentType || ContentType.IMAGE,
        userId: request.userId,
        status,
        action,
        overallRiskScore: imageModerationResult.overallRiskScore,
        imageModerationResult,
        detectedViolations: imageModerationResult.detectedViolations,
        recommendations: imageModerationResult.recommendations,
        moderatedAt: new Date(),
      };

      // Save to database
      await this.saveModerationLog(moderationResult, request.imageUrl, null);

      // Handle user violations
      if (status === ModerationStatus.REJECTED) {
        await this.handleViolations(request.userId, moderationResult);
        // Notify user of content rejection
        await this.notifyContentRejected(
          request.userId,
          'image',
          moderationResult.detectedViolations,
          moderationResult.recommendations
        );
      }

      // Add to moderation queue if flagged
      if (status === ModerationStatus.FLAGGED) {
        await this.addToModerationQueue(moderationResult, request.imageUrl, null, request.userId);
        // Notify user of content flagged for review
        await this.notifyContentFlagged(request.userId, 'image', 'Manual review required');
      }

      logger.info(
        `Image moderation complete: ${status} (${action}), risk: ${imageModerationResult.overallRiskScore.toFixed(2)}`
      );

      return moderationResult;
    } catch (error: any) {
      logger.error('Image moderation failed:', error);
      throw error;
    }
  }

  /**
   * Moderate text content
   */
  async moderateText(request: ModerateTextRequest): Promise<ModerationResult> {
    try {
      logger.info(`Moderating text for user ${request.userId}, content ${request.contentId}`);

      // Call Azure Content Moderator
      const textModerationResult = await azureContentModeratorService.moderateText(request.text);

      // Determine status and action
      const { status, action } = this.determineStatusAndAction(
        textModerationResult.overallRiskScore,
        textModerationResult.detectedViolations
      );

      // Create moderation result
      const moderationResult: ModerationResult = {
        contentId: request.contentId,
        contentType: request.contentType || ContentType.TEXT,
        userId: request.userId,
        status,
        action,
        overallRiskScore: textModerationResult.overallRiskScore,
        textModerationResult,
        detectedViolations: textModerationResult.detectedViolations,
        recommendations: textModerationResult.recommendations,
        moderatedAt: new Date(),
      };

      // Save to database
      await this.saveModerationLog(moderationResult, null, request.text);

      // Handle user violations
      if (status === ModerationStatus.REJECTED) {
        await this.handleViolations(request.userId, moderationResult);
        // Notify user of content rejection
        await this.notifyContentRejected(
          request.userId,
          'text',
          moderationResult.detectedViolations,
          moderationResult.recommendations
        );
      }

      // Add to moderation queue if flagged
      if (status === ModerationStatus.FLAGGED) {
        await this.addToModerationQueue(moderationResult, null, request.text, request.userId);
        // Notify user of content flagged for review
        await this.notifyContentFlagged(request.userId, 'text', 'Manual review required');
      }

      logger.info(
        `Text moderation complete: ${status} (${action}), risk: ${textModerationResult.overallRiskScore.toFixed(2)}`
      );

      return moderationResult;
    } catch (error: any) {
      logger.error('Text moderation failed:', error);
      throw error;
    }
  }

  /**
   * Determine moderation status and action based on risk score
   */
  private determineStatusAndAction(
    riskScore: number,
    violations: ViolationType[]
  ): { status: ModerationStatus; action: ModerationAction } {
    // Auto-reject if risk score is very high or contains critical violations
    if (
      riskScore >= config.autoAction.autoRejectThreshold ||
      this.hasCriticalViolations(violations)
    ) {
      return {
        status: ModerationStatus.REJECTED,
        action: ModerationAction.AUTO_REJECTED,
      };
    }

    // Flag for manual review if risk score is medium
    if (riskScore >= config.autoAction.autoFlagThreshold) {
      return {
        status: ModerationStatus.FLAGGED,
        action: ModerationAction.AUTO_FLAGGED,
      };
    }

    // Auto-approve if risk score is low
    return {
      status: ModerationStatus.APPROVED,
      action: ModerationAction.AUTO_APPROVED,
    };
  }

  /**
   * Check if violations include critical types
   */
  private hasCriticalViolations(violations: ViolationType[]): boolean {
    const criticalViolations = [
      ViolationType.EXPLICIT_NUDITY,
      ViolationType.VIOLENCE,
      ViolationType.HATE_SPEECH,
      ViolationType.ILLEGAL_ACTIVITY,
      ViolationType.UNDERAGE,
    ];

    return violations.some((v) => criticalViolations.includes(v));
  }

  /**
   * Save moderation log to database
   */
  private async saveModerationLog(
    result: ModerationResult,
    contentUrl: string | null,
    contentText: string | null
  ): Promise<void> {
    const log: Partial<ModerationLog> = {
      id: uuidv4(),
      contentId: result.contentId,
      contentType: result.contentType,
      contentUrl,
      contentText,
      userId: result.userId,
      status: result.status,
      action: result.action,
      riskScore: result.overallRiskScore,
      violations: result.detectedViolations,
      imageModerationData: result.imageModerationResult,
      textModerationData: result.textModerationResult,
      recommendations: result.recommendations,
      moderatedAt: result.moderatedAt,
    };

    await db('moderation_logs').insert(log);
    logger.info(`Moderation log saved: ${log.id}`);
  }

  /**
   * Handle user violations
   */
  private async handleViolations(userId: string, result: ModerationResult): Promise<void> {
    // Create violation records
    for (const violationType of result.detectedViolations) {
      const severity = this.getViolationSeverity(violationType, result.overallRiskScore);

      const violation: Partial<UserViolation> = {
        id: uuidv4(),
        userId,
        moderationLogId: result.contentId, // Will be updated with actual log ID
        violationType,
        severity,
        contentId: result.contentId,
        contentType: result.contentType,
        action: result.action,
        createdAt: new Date(),
      };

      await db('user_violations').insert(violation);
    }

    // Update user moderation record
    await this.updateUserModerationRecord(userId);

    logger.info(`Violations handled for user ${userId}`);
  }

  /**
   * Get violation severity
   */
  private getViolationSeverity(
    violationType: ViolationType,
    riskScore: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalTypes = [
      ViolationType.EXPLICIT_NUDITY,
      ViolationType.HATE_SPEECH,
      ViolationType.VIOLENCE,
      ViolationType.ILLEGAL_ACTIVITY,
      ViolationType.UNDERAGE,
    ];

    if (criticalTypes.includes(violationType)) {
      return 'critical';
    }

    if (riskScore >= 0.8) return 'high';
    if (riskScore >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Update user moderation record
   */
  private async updateUserModerationRecord(userId: string): Promise<void> {
    // Get user's violations
    const violations = await db('user_violations')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');

    const severeViolations = violations.filter(
      (v) => v.severity === 'critical' || v.severity === 'high'
    );

    // Get or create user moderation record
    let record = await db('user_moderation_records').where('user_id', userId).first();

    if (!record) {
      record = {
        user_id: userId,
        status: UserModerationStatus.ACTIVE,
        total_violations: 0,
        severe_violations: 0,
        warnings_issued: 0,
        suspension_count: 0,
        permanently_banned: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db('user_moderation_records').insert(record);
      record = await db('user_moderation_records').where('user_id', userId).first();
    }

    // Determine action based on violation count
    let newStatus = record.status;
    let action: ModerationAction | null = null;

    if (severeViolations.length >= config.autoAction.banViolationCount) {
      newStatus = UserModerationStatus.BANNED;
      action = ModerationAction.USER_BANNED;
    } else if (violations.length >= config.autoAction.suspensionViolationCount) {
      newStatus = UserModerationStatus.SUSPENDED;
      action = ModerationAction.USER_SUSPENDED;
    } else if (violations.length >= 1) {
      action = ModerationAction.USER_WARNED;
    }

    // Update record
    const updates: any = {
      total_violations: violations.length,
      severe_violations: severeViolations.length,
      last_violation_at: new Date(),
      updated_at: new Date(),
    };

    if (action === ModerationAction.USER_WARNED) {
      updates.warnings_issued = (record.warnings_issued || 0) + 1;
      // Send warning notification
      await this.notifyUserWarned(userId, violations.length);
    }

    if (action === ModerationAction.USER_SUSPENDED) {
      const suspensionDays = this.calculateSuspensionDays(record.suspension_count || 0);
      updates.status = UserModerationStatus.SUSPENDED;
      updates.suspension_count = (record.suspension_count || 0) + 1;
      updates.current_suspension_ends_at = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);
      // Send suspension notification
      await this.notifyUserSuspended(
        userId,
        new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000),
        `Automatic suspension due to ${violations.length} policy violations`
      );
    }

    if (action === ModerationAction.USER_BANNED) {
      updates.status = UserModerationStatus.BANNED;
      updates.permanently_banned = true;
      updates.banned_at = new Date();
      updates.banned_reason = `Severe violations: ${severeViolations.length}`;
      // Send ban notification
      await this.notifyUserBanned(userId, `Severe violations: ${severeViolations.length}`);
    }

    await db('user_moderation_records').where('user_id', userId).update(updates);

    logger.info(`User moderation record updated for ${userId}: ${newStatus}`);
  }

  /**
   * Calculate suspension duration
   */
  private calculateSuspensionDays(suspensionCount: number): number {
    // Progressive suspension: 1 day, 3 days, 7 days, 14 days, 30 days
    const suspensionDays = [1, 3, 7, 14, 30];
    return suspensionDays[Math.min(suspensionCount, suspensionDays.length - 1)];
  }

  /**
   * Add content to moderation queue for manual review
   */
  private async addToModerationQueue(
    result: ModerationResult,
    contentUrl: string | null,
    contentText: string | null,
    userId: string
  ): Promise<void> {
    const priority = this.determinePriority(result.overallRiskScore, result.detectedViolations);

    const queueItem: Partial<ModerationQueueItem> = {
      id: uuidv4(),
      contentId: result.contentId,
      contentType: result.contentType,
      contentUrl,
      contentText,
      userId,
      riskScore: result.overallRiskScore,
      violations: result.detectedViolations,
      status: ModerationStatus.FLAGGED,
      priority,
    };

    await db('moderation_queue').insert(queueItem);
    logger.info(`Content added to moderation queue: ${queueItem.id} (Priority: ${priority})`);
  }

  /**
   * Determine queue priority
   */
  private determinePriority(
    riskScore: number,
    violations: ViolationType[]
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (this.hasCriticalViolations(violations)) return 'urgent';
    if (riskScore >= 0.85) return 'high';
    if (riskScore >= 0.70) return 'medium';
    return 'low';
  }

  /**
   * Get user moderation status
   */
  async getUserModerationStatus(userId: string): Promise<UserModerationRecord | null> {
    return await db('user_moderation_records').where('user_id', userId).first();
  }

  /**
   * Check if user is banned or suspended
   */
  async isUserRestricted(userId: string): Promise<{
    restricted: boolean;
    reason?: string;
    endsAt?: Date;
  }> {
    const record = await this.getUserModerationStatus(userId);

    if (!record) {
      return { restricted: false };
    }

    if (record.permanentlyBanned) {
      return {
        restricted: true,
        reason: 'Your account has been permanently banned due to severe violations.',
      };
    }

    if (
      record.status === UserModerationStatus.SUSPENDED &&
      record.currentSuspensionEndsAt &&
      new Date(record.currentSuspensionEndsAt) > new Date()
    ) {
      return {
        restricted: true,
        reason: 'Your account is temporarily suspended.',
        endsAt: new Date(record.currentSuspensionEndsAt),
      };
    }

    // Clear suspension if expired
    if (
      record.status === UserModerationStatus.SUSPENDED &&
      record.currentSuspensionEndsAt &&
      new Date(record.currentSuspensionEndsAt) <= new Date()
    ) {
      await db('user_moderation_records')
        .where('user_id', userId)
        .update({
          status: UserModerationStatus.ACTIVE,
          current_suspension_ends_at: null,
          updated_at: new Date(),
        });
      return { restricted: false };
    }

    return { restricted: false };
  }

  /**
   * Admin: Manually suspend a user
   */
  async adminSuspendUser(
    userId: string,
    suspensionDays: number,
    reason: string,
    adminId: string
  ): Promise<void> {
    logger.info(`Admin ${adminId} suspending user ${userId} for ${suspensionDays} days`);

    // Get or create user moderation record
    let record = await db('user_moderation_records').where('user_id', userId).first();

    if (!record) {
      record = {
        user_id: userId,
        status: UserModerationStatus.ACTIVE,
        total_violations: 0,
        severe_violations: 0,
        warnings_issued: 0,
        suspension_count: 0,
        permanently_banned: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db('user_moderation_records').insert(record);
      record = await db('user_moderation_records').where('user_id', userId).first();
    }

    // Update record with suspension
    const suspensionEndsAt = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);

    await db('user_moderation_records')
      .where('user_id', userId)
      .update({
        status: UserModerationStatus.SUSPENDED,
        suspension_count: (record.suspension_count || 0) + 1,
        current_suspension_ends_at: suspensionEndsAt,
        last_admin_action: 'manual_suspension',
        last_admin_action_by: adminId,
        last_admin_action_at: new Date(),
        last_admin_action_reason: reason,
        updated_at: new Date(),
      });

    logger.info(`User ${userId} suspended until ${suspensionEndsAt.toISOString()}`);

    // Send notification to user
    await this.notifyUserSuspended(userId, suspensionEndsAt, reason);
  }

  /**
   * Admin: Manually unsuspend a user
   */
  async adminUnsuspendUser(userId: string, adminId: string, reason: string): Promise<void> {
    logger.info(`Admin ${adminId} unsuspending user ${userId}`);

    await db('user_moderation_records')
      .where('user_id', userId)
      .update({
        status: UserModerationStatus.ACTIVE,
        current_suspension_ends_at: null,
        last_admin_action: 'manual_unsuspension',
        last_admin_action_by: adminId,
        last_admin_action_at: new Date(),
        last_admin_action_reason: reason,
        updated_at: new Date(),
      });

    logger.info(`User ${userId} unsuspended by admin`);

    // Send notification to user
    await this.notifyUserUnsuspended(userId);
  }

  /**
   * Admin: Manually ban a user
   */
  async adminBanUser(userId: string, reason: string, adminId: string): Promise<void> {
    logger.info(`Admin ${adminId} permanently banning user ${userId}`);

    // Get or create user moderation record
    let record = await db('user_moderation_records').where('user_id', userId).first();

    if (!record) {
      record = {
        user_id: userId,
        status: UserModerationStatus.ACTIVE,
        total_violations: 0,
        severe_violations: 0,
        warnings_issued: 0,
        suspension_count: 0,
        permanently_banned: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db('user_moderation_records').insert(record);
    }

    await db('user_moderation_records')
      .where('user_id', userId)
      .update({
        status: UserModerationStatus.BANNED,
        permanently_banned: true,
        banned_at: new Date(),
        banned_reason: reason,
        last_admin_action: 'manual_ban',
        last_admin_action_by: adminId,
        last_admin_action_at: new Date(),
        last_admin_action_reason: reason,
        updated_at: new Date(),
      });

    logger.info(`User ${userId} permanently banned`);

    // Send notification to user
    await this.notifyUserBanned(userId, reason);
  }

  /**
   * Admin: Unban a user
   */
  async adminUnbanUser(userId: string, adminId: string, reason: string): Promise<void> {
    logger.info(`Admin ${adminId} unbanning user ${userId}`);

    await db('user_moderation_records')
      .where('user_id', userId)
      .update({
        status: UserModerationStatus.ACTIVE,
        permanently_banned: false,
        banned_at: null,
        banned_reason: null,
        last_admin_action: 'manual_unban',
        last_admin_action_by: adminId,
        last_admin_action_at: new Date(),
        last_admin_action_reason: reason,
        updated_at: new Date(),
      });

    logger.info(`User ${userId} unbanned by admin`);

    // Send notification to user
    await this.notifyUserUnbanned(userId);
  }

  /**
   * Get user violation history
   */
  async getUserViolationHistory(userId: string, limit = 50): Promise<UserViolation[]> {
    return await db('user_violations')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  /**
   * Create a new report
   */
  async createReport(input: {
    reporterId: string;
    reportedUserId?: string;
    contentId?: string;
    reportType: string;
    reason: string;
    description?: string;
  }): Promise<any> {
    const report = {
      id: uuidv4(),
      reporter_id: input.reporterId,
      reported_user_id: input.reportedUserId,
      content_id: input.contentId,
      report_type: input.reportType,
      reason: input.reason,
      description: input.description,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('reports').insert(report);

    logger.info(`Report created: ${report.id}`);

    return {
      id: report.id,
      reporterId: report.reporter_id,
      reportedUserId: report.reported_user_id,
      contentId: report.content_id,
      reportType: report.report_type,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };
  }

  /**
   * Get a report by ID
   */
  async getReport(reportId: string): Promise<any | null> {
    const report = await db('reports').where('id', reportId).first();

    if (!report) {
      return null;
    }

    return {
      id: report.id,
      reporterId: report.reporter_id,
      reportedUserId: report.reported_user_id,
      contentId: report.content_id,
      reportType: report.report_type,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      resolvedBy: report.resolved_by,
      resolvedAt: report.resolved_at,
      resolutionNotes: report.resolution_notes,
    };
  }

  /**
   * Get all reports with optional filtering and pagination
   */
  async getReports(params: {
    status?: string;
    reportType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: any[]; total: number }> {
    const { status, reportType, limit = 50, offset = 0 } = params;

    let query = db('reports');

    if (status) {
      query = query.where('status', status);
    }

    if (reportType) {
      query = query.where('report_type', reportType);
    }

    const reports = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db('reports');
    if (status) {
      countQuery = countQuery.where('status', status);
    }
    if (reportType) {
      countQuery = countQuery.where('report_type', reportType);
    }

    const totalResult = await countQuery.count('id as count').first();
    const total = parseInt(totalResult?.count as string) || 0;

    return {
      reports: reports.map((r: any) => ({
        id: r.id,
        reporterId: r.reporter_id,
        reportedUserId: r.reported_user_id,
        contentId: r.content_id,
        reportType: r.report_type,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        resolvedBy: r.resolved_by,
        resolvedAt: r.resolved_at,
        resolutionNotes: r.resolution_notes,
      })),
      total,
    };
  }

  /**
   * Resolve a report
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    action: string,
    notes?: string
  ): Promise<void> {
    await db('reports')
      .where('id', reportId)
      .update({
        status: 'resolved',
        resolved_by: adminId,
        resolved_at: new Date(),
        resolution_notes: notes,
        resolution_action: action,
        updated_at: new Date(),
      });

    logger.info(`Report ${reportId} resolved by admin ${adminId} with action: ${action}`);
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    // Check if block already exists
    const existing = await db('user_blocks')
      .where('user_id', userId)
      .where('blocked_user_id', blockedUserId)
      .first();

    if (existing) {
      logger.warn(`User ${userId} already blocked user ${blockedUserId}`);
      return;
    }

    await db('user_blocks').insert({
      id: uuidv4(),
      user_id: userId,
      blocked_user_id: blockedUserId,
      created_at: new Date(),
    });

    logger.info(`User ${userId} blocked user ${blockedUserId}`);
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await db('user_blocks')
      .where('user_id', userId)
      .where('blocked_user_id', blockedUserId)
      .delete();

    logger.info(`User ${userId} unblocked user ${blockedUserId}`);
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(userId: string): Promise<string[]> {
    const blocks = await db('user_blocks')
      .where('user_id', userId)
      .select('blocked_user_id');

    return blocks.map((b: any) => b.blocked_user_id);
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const block = await db('user_blocks')
      .where('user_id', userId)
      .where('blocked_user_id', targetUserId)
      .first();

    return !!block;
  }

  /**
   * Get moderation queue
   */
  async getModerationQueue(params: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: any[]; total: number }> {
    const { status, priority, limit = 50, offset = 0 } = params;

    let query = db('moderation_queue');

    if (status) {
      query = query.where('status', status);
    }

    if (priority) {
      query = query.where('priority', priority);
    }

    const items = await query
      .orderBy('priority', 'desc')
      .orderBy('flagged_at', 'asc')
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db('moderation_queue');
    if (status) {
      countQuery = countQuery.where('status', status);
    }
    if (priority) {
      countQuery = countQuery.where('priority', priority);
    }

    const totalResult = await countQuery.count('id as count').first();
    const total = parseInt(totalResult?.count as string) || 0;

    return {
      items: items.map((item: any) => ({
        id: item.id,
        contentId: item.content_id,
        contentType: item.content_type,
        contentUrl: item.content_url,
        contentText: item.content_text,
        userId: item.user_id,
        riskScore: parseFloat(item.risk_score),
        violations: item.violations || [],
        status: item.status,
        priority: item.priority,
        flaggedAt: item.flagged_at,
        assignedTo: item.assigned_to,
        assignedAt: item.assigned_at,
      })),
      total,
    };
  }

  /**
   * Review a queue item
   */
  async reviewQueueItem(
    queueId: string,
    moderatorId: string,
    action: string,
    notes?: string
  ): Promise<void> {
    const queueItem = await db('moderation_queue').where('id', queueId).first();

    if (!queueItem) {
      throw new Error('Queue item not found');
    }

    // Update the queue item
    await db('moderation_queue')
      .where('id', queueId)
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        assigned_to: moderatorId,
        assigned_at: new Date(),
        updated_at: new Date(),
      });

    // Create a moderation log entry
    await db('moderation_logs').insert({
      id: uuidv4(),
      content_id: queueItem.content_id,
      content_type: queueItem.content_type,
      content_url: queueItem.content_url,
      content_text: queueItem.content_text,
      user_id: queueItem.user_id,
      status: action === 'approve' ? 'approved' : 'rejected',
      action: action === 'approve' ? 'manual_approved' : 'manual_rejected',
      risk_score: queueItem.risk_score,
      violations: queueItem.violations || [],
      recommendations: [],
      moderated_at: new Date(),
      moderated_by: moderatorId,
      reviewed_at: new Date(),
      reviewed_by: moderatorId,
      review_notes: notes,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.info(`Queue item ${queueId} reviewed by ${moderatorId}: ${action}`);
  }

  /**
   * Notification: User suspended
   */
  private async notifyUserSuspended(
    userId: string,
    suspensionEndsAt: Date,
    reason: string
  ): Promise<void> {
    try {
      await notificationClient.notifyUserSuspended(userId, suspensionEndsAt, reason);
      logger.info(`Suspension notification sent to user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to send suspension notification to user ${userId}:`, error);
      // Don't throw - notification failures shouldn't block the moderation action
    }
  }

  /**
   * Notification: User unsuspended
   */
  private async notifyUserUnsuspended(userId: string): Promise<void> {
    try {
      await notificationClient.notifyUserUnsuspended(userId);
      logger.info(`Unsuspension notification sent to user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to send unsuspension notification to user ${userId}:`, error);
      // Don't throw - notification failures shouldn't block the moderation action
    }
  }

  /**
   * Notification: User banned
   */
  private async notifyUserBanned(userId: string, reason: string): Promise<void> {
    try {
      await notificationClient.notifyUserBanned(userId, reason);
      logger.info(`Ban notification sent to user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to send ban notification to user ${userId}:`, error);
      // Don't throw - notification failures shouldn't block the moderation action
    }
  }

  /**
   * Notification: User unbanned
   */
  private async notifyUserUnbanned(userId: string): Promise<void> {
    try {
      await notificationClient.notifyUserUnbanned(userId);
      logger.info(`Unban notification sent to user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to send unban notification to user ${userId}:`, error);
      // Don't throw - notification failures shouldn't block the moderation action
    }
  }

  /**
   * Notification: User warned
   */
  private async notifyUserWarned(userId: string, violationCount: number): Promise<void> {
    try {
      await notificationClient.notifyUserWarning(
        userId,
        violationCount,
        'You have violated our community guidelines. Please review our policies.'
      );
      logger.info(`Warning notification sent to user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to send warning notification to user ${userId}:`, error);
      // Don't throw - notification failures shouldn't block the moderation action
    }
  }

  /**
   * Notification: Content rejected
   */
  private async notifyContentRejected(
    userId: string,
    contentType: string,
    violations: string[],
    recommendations: string[]
  ): Promise<void> {
    try {
      const reason = violations.join(', ') || 'Policy violation detected';
      await notificationClient.notifyContentRejected(userId, contentType, reason, violations);
      logger.info(`Content rejection notification sent to user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to send content rejection notification to user ${userId}:`, error);
      // Don't throw - notification failures shouldn't block the moderation action
    }
  }

  /**
   * Notification: Content flagged for review
   */
  private async notifyContentFlagged(
    userId: string,
    contentType: string,
    reason: string
  ): Promise<void> {
    try {
      await notificationClient.notifyContentFlagged(userId, contentType, reason);
      logger.info(`Content flagged notification sent to user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to send content flagged notification to user ${userId}:`, error);
      // Don't throw - notification failures shouldn't block the moderation action
    }
  }
}

export default new ModerationService();
