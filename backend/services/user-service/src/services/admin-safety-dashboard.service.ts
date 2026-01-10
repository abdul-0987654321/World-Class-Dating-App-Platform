/**
 * Admin Safety Dashboard Service
 * Provides comprehensive safety management for moderators and administrators:
 * - Report queue management
 * - User safety profiles
 * - Harassment detection review
 * - Panic event monitoring
 * - Safety statistics and analytics
 */

import { db } from '../infrastructure/database';
import logger from '../utils/logger';

import { enhancedBlockService } from './enhanced-block.service';
import { harassmentDetectionService } from './harassment-detection.service';
import { panicButtonService } from './panic-button.service';

export interface ReportQueueItem {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reportedId: string;
  reportedName: string;
  reportedEmail: string;
  reportType: string;
  description?: string;
  severity: string;
  status: string;
  evidenceUrls?: string[];
  createdAt: Date;
  priorityScore: number;
  aiAnalysis?: {
    suggestedCategory: string;
    categoryConfidence: number;
    suggestedSeverity: string;
    urgencyScore: number;
    requiresImmediateAction: boolean;
  };
}

export interface UserSafetyProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName?: string;
  createdAt: Date;
  safetyScore: number;
  harassmentRiskScore: number;
  totalReportsReceived: number;
  confirmedReports: number;
  totalBlocksReceived: number;
  harassmentDetections: number;
  warningsReceived: number;
  suspensionsCount: number;
  isFlagged: boolean;
  isUnderReview: boolean;
  isRestricted: boolean;
  restrictionReason?: string;
  isIdVerified: boolean;
  isPhotoVerified: boolean;
  hasCleanBackgroundCheck: boolean;
  recentActivity: {
    lastLogin?: Date;
    messagesLast7Days: number;
    reportsLast30Days: number;
  };
}

export interface SafetyDashboardStats {
  reports: {
    total: number;
    pending: number;
    inReview: number;
    resolved: number;
    dismissed: number;
    criticalPending: number;
    averageResolutionTimeHours: number;
  };
  blocks: {
    total: number;
    today: number;
    thisWeek: number;
    autoBlocks: number;
  };
  harassment: {
    totalDetections: number;
    pendingReview: number;
    confirmedCases: number;
    autoBlocked: number;
    averageRiskScore: number;
  };
  panic: {
    totalEvents: number;
    activeEvents: number;
    today: number;
    emergencyServicesContacted: number;
    falseAlarms: number;
  };
  users: {
    totalFlagged: number;
    underReview: number;
    restricted: number;
    suspended: number;
    banned: number;
  };
}

export interface ModeratorAction {
  actionType: string;
  targetUserId?: string;
  reportId?: string;
  details: Record<string, any>;
  timestamp: Date;
}

class AdminSafetyDashboardService {
  /**
   * Get comprehensive safety dashboard statistics
   */
  async getDashboardStats(): Promise<SafetyDashboardStats> {
    // Report stats
    const [reportStats] = (await db('reports').select(
      db.raw('COUNT(*) as total'),
      db.raw("COUNT(*) FILTER (WHERE status = 'pending') as pending"),
      db.raw("COUNT(*) FILTER (WHERE status = 'investigating') as in_review"),
      db.raw("COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'action_taken') as resolved"),
      db.raw("COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed"),
      db.raw(
        "COUNT(*) FILTER (WHERE status = 'pending' AND severity = 'critical') as critical_pending"
      )
    )) as {
      total: string;
      pending: string;
      in_review: string;
      resolved: string;
      dismissed: string;
      critical_pending: string;
    }[];

    // Calculate average resolution time
    const resolvedReports = await db('reports')
      .whereNotNull('resolved_at')
      .select('created_at', 'resolved_at');

    let averageResolutionTimeHours = 0;
    if (resolvedReports.length > 0) {
      const totalHours = resolvedReports.reduce((sum, report) => {
        const created = new Date(report.created_at).getTime();
        const resolved = new Date(report.resolved_at).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60);
      }, 0);
      averageResolutionTimeHours = Math.round(totalHours / resolvedReports.length);
    }

    // Block stats
    const blockStats = await enhancedBlockService.getBlockStatistics();

    // Harassment detection stats
    let harassmentStats = {
      totalDetections: 0,
      pendingReview: 0,
      confirmedCases: 0,
      autoBlocked: 0,
      averageRiskScore: 0,
    };

    try {
      const [hdStats] = (await db('harassment_detection_results').select(
        db.raw('COUNT(*) as total_detections'),
        db.raw("COUNT(*) FILTER (WHERE review_status = 'pending') as pending_review"),
        db.raw("COUNT(*) FILTER (WHERE review_status = 'confirmed') as confirmed_cases"),
        db.raw('COUNT(*) FILTER (WHERE auto_blocked = true) as auto_blocked'),
        db.raw('AVG(overall_risk_score) as average_risk_score')
      )) as {
        total_detections: string;
        pending_review: string;
        confirmed_cases: string;
        auto_blocked: string;
        average_risk_score: string;
      }[];

      harassmentStats = {
        totalDetections: parseInt(hdStats?.total_detections || '0', 10),
        pendingReview: parseInt(hdStats?.pending_review || '0', 10),
        confirmedCases: parseInt(hdStats?.confirmed_cases || '0', 10),
        autoBlocked: parseInt(hdStats?.auto_blocked || '0', 10),
        averageRiskScore: parseFloat(hdStats?.average_risk_score || '0'),
      };
    } catch (e) {
      // Table may not exist
    }

    // Panic stats
    const panicStats = await panicButtonService.getPanicStatistics();

    // User safety stats
    let userStats = {
      totalFlagged: 0,
      underReview: 0,
      restricted: 0,
      suspended: 0,
      banned: 0,
    };

    try {
      const [usStats] = (await db('user_safety_scores').select(
        db.raw('COUNT(*) FILTER (WHERE is_flagged = true) as total_flagged'),
        db.raw('COUNT(*) FILTER (WHERE is_under_review = true) as under_review'),
        db.raw('COUNT(*) FILTER (WHERE is_restricted = true) as restricted')
      )) as { total_flagged: string; under_review: string; restricted: string }[];

      const [modStats] = (await db('user_moderation_records').select(
        db.raw("COUNT(*) FILTER (WHERE status = 'suspended') as suspended"),
        db.raw("COUNT(*) FILTER (WHERE status = 'banned') as banned")
      )) as { suspended: string; banned: string }[];

      userStats = {
        totalFlagged: parseInt(usStats?.total_flagged || '0', 10),
        underReview: parseInt(usStats?.under_review || '0', 10),
        restricted: parseInt(usStats?.restricted || '0', 10),
        suspended: parseInt(modStats?.suspended || '0', 10),
        banned: parseInt(modStats?.banned || '0', 10),
      };
    } catch (e) {
      // Tables may not exist
    }

    return {
      reports: {
        total: parseInt(reportStats.total || '0', 10),
        pending: parseInt(reportStats.pending || '0', 10),
        inReview: parseInt(reportStats.in_review || '0', 10),
        resolved: parseInt(reportStats.resolved || '0', 10),
        dismissed: parseInt(reportStats.dismissed || '0', 10),
        criticalPending: parseInt(reportStats.critical_pending || '0', 10),
        averageResolutionTimeHours,
      },
      blocks: {
        total: blockStats.totalBlocks,
        today: blockStats.blocksToday,
        thisWeek: blockStats.blocksThisWeek,
        autoBlocks: blockStats.autoBlocks,
      },
      harassment: harassmentStats,
      panic: {
        totalEvents: panicStats.totalEvents,
        activeEvents: panicStats.activeEvents,
        today: panicStats.eventsToday,
        emergencyServicesContacted: panicStats.emergencyServicesContacted,
        falseAlarms: panicStats.falseAlarms,
      },
      users: userStats,
    };
  }

  /**
   * Get report moderation queue with AI analysis
   */
  async getReportQueue(
    options: {
      status?: string;
      severity?: string;
      reportType?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'priority' | 'date' | 'severity';
    } = {}
  ): Promise<{
    reports: ReportQueueItem[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      status = 'pending',
      severity,
      reportType,
      limit = 50,
      offset = 0,
      sortBy = 'priority',
    } = options;

    let query = db('reports')
      .leftJoin('users as reporter', 'reports.reporter_id', 'reporter.id')
      .leftJoin('users as reported', 'reports.reported_id', 'reported.id')
      .leftJoin('report_ai_analysis', 'reports.id', 'report_ai_analysis.report_id')
      .select(
        'reports.*',
        'reporter.email as reporter_email',
        'reporter.first_name as reporter_first_name',
        'reporter.last_name as reporter_last_name',
        'reported.email as reported_email',
        'reported.first_name as reported_first_name',
        'reported.last_name as reported_last_name',
        'report_ai_analysis.suggested_category',
        'report_ai_analysis.category_confidence',
        'report_ai_analysis.suggested_severity',
        'report_ai_analysis.urgency_score',
        'report_ai_analysis.requires_immediate_action'
      );

    if (status !== 'all') {
      query = query.where('reports.status', status);
    }

    if (severity) {
      query = query.where('reports.severity', severity);
    }

    if (reportType) {
      query = query.where('reports.report_type', reportType);
    }

    // Count total
    const countQuery = query.clone();
    const [{ count: total }] = await countQuery.count('reports.id as count');

    // Apply sorting
    if (sortBy === 'priority') {
      query = query.orderByRaw(`
        CASE reports.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        reports.created_at ASC
      `);
    } else if (sortBy === 'date') {
      query = query.orderBy('reports.created_at', 'asc');
    } else if (sortBy === 'severity') {
      query = query.orderByRaw(`
        CASE reports.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
      `);
    }

    query = query.limit(limit).offset(offset);

    const reports = await query;

    const mappedReports: ReportQueueItem[] = reports.map((r: any) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: `${r.reporter_first_name || ''} ${r.reporter_last_name || ''}`.trim(),
      reporterEmail: r.reporter_email,
      reportedId: r.reported_id,
      reportedName: `${r.reported_first_name || ''} ${r.reported_last_name || ''}`.trim(),
      reportedEmail: r.reported_email,
      reportType: r.report_type,
      description: r.description,
      severity: r.severity,
      status: r.status,
      evidenceUrls: r.evidence_urls
        ? typeof r.evidence_urls === 'string'
          ? JSON.parse(r.evidence_urls)
          : r.evidence_urls
        : [],
      createdAt: r.created_at,
      priorityScore: this.calculatePriorityScore(r),
      aiAnalysis: r.suggested_category
        ? {
            suggestedCategory: r.suggested_category,
            categoryConfidence: r.category_confidence,
            suggestedSeverity: r.suggested_severity,
            urgencyScore: r.urgency_score,
            requiresImmediateAction: r.requires_immediate_action,
          }
        : undefined,
    }));

    return {
      reports: mappedReports,
      total: parseInt(total as string, 10),
      hasMore: offset + limit < parseInt(total as string, 10),
    };
  }

  /**
   * Get user safety profile for review
   */
  async getUserSafetyProfile(userId: string): Promise<UserSafetyProfile | null> {
    const user = await db('users')
      .where({ id: userId })
      .select('id', 'email', 'first_name', 'last_name', 'created_at')
      .first();

    if (!user) {
      return null;
    }

    // Get safety score
    const safetyScore = await db('user_safety_scores').where('user_id', userId).first();

    // Get recent activity
    const [{ count: messagesLast7Days }] = await db('messages')
      .where('sender_id', userId)
      .where('created_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .count('* as count');

    const [{ count: reportsLast30Days }] = await db('reports')
      .where('reported_id', userId)
      .where('created_at', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .count('* as count');

    // Get last login from sessions if available
    let lastLogin: Date | undefined;
    try {
      const lastSession = await db('user_sessions')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .first();
      lastLogin = lastSession?.created_at;
    } catch (e) {
      // Table may not exist
    }

    // Get verification status
    let isIdVerified = false;
    let isPhotoVerified = false;
    let hasCleanBackgroundCheck = false;

    try {
      const verification = await db('id_verifications')
        .where({ user_id: userId, status: 'verified' })
        .first();
      isIdVerified = !!verification;
    } catch (e) {}

    try {
      const photoVerification = await db('verification_requests')
        .where({ user_id: userId, type: 'photo', status: 'verified' })
        .first();
      isPhotoVerified = !!photoVerification;
    } catch (e) {}

    try {
      const backgroundCheck = await db('background_checks')
        .where({ user_id: userId, overall_status: 'passed' })
        .first();
      hasCleanBackgroundCheck = !!backgroundCheck;
    } catch (e) {}

    return {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at,
      safetyScore: safetyScore?.overall_safety_score || 100,
      harassmentRiskScore: safetyScore?.harassment_risk_score || 0,
      totalReportsReceived: safetyScore?.total_reports_received || 0,
      confirmedReports: safetyScore?.confirmed_reports || 0,
      totalBlocksReceived: safetyScore?.total_blocks_received || 0,
      harassmentDetections: safetyScore?.harassment_detections || 0,
      warningsReceived: safetyScore?.warnings_received || 0,
      suspensionsCount: safetyScore?.suspensions_count || 0,
      isFlagged: safetyScore?.is_flagged || false,
      isUnderReview: safetyScore?.is_under_review || false,
      isRestricted: safetyScore?.is_restricted || false,
      restrictionReason: safetyScore?.restriction_reason,
      isIdVerified,
      isPhotoVerified,
      hasCleanBackgroundCheck,
      recentActivity: {
        lastLogin,
        messagesLast7Days: parseInt(messagesLast7Days as string, 10),
        reportsLast30Days: parseInt(reportsLast30Days as string, 10),
      },
    };
  }

  /**
   * Get harassment detection review queue
   */
  async getHarassmentReviewQueue(
    options: {
      status?: string;
      minRiskScore?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    items: any[];
    total: number;
    hasMore: boolean;
  }> {
    const { status = 'pending', minRiskScore = 0.5, limit = 50, offset = 0 } = options;

    try {
      let query = db('harassment_detection_results')
        .leftJoin('users as sender', 'harassment_detection_results.sender_id', 'sender.id')
        .leftJoin('users as recipient', 'harassment_detection_results.recipient_id', 'recipient.id')
        .select(
          'harassment_detection_results.*',
          'sender.email as sender_email',
          'sender.first_name as sender_name',
          'recipient.email as recipient_email',
          'recipient.first_name as recipient_name'
        )
        .where('requires_review', true)
        .where('overall_risk_score', '>=', minRiskScore);

      if (status !== 'all') {
        query = query.where('review_status', status);
      }

      // Count total
      const [{ count: total }] = await query
        .clone()
        .count('harassment_detection_results.id as count');

      // Get results
      const items = await query
        .orderBy('overall_risk_score', 'desc')
        .orderBy('created_at', 'asc')
        .limit(limit)
        .offset(offset);

      return {
        items: items.map((item: any) => ({
          ...item,
          detected_patterns:
            typeof item.detected_patterns === 'string'
              ? JSON.parse(item.detected_patterns)
              : item.detected_patterns,
          confidence_scores:
            typeof item.confidence_scores === 'string'
              ? JSON.parse(item.confidence_scores)
              : item.confidence_scores,
        })),
        total: parseInt(total as string, 10),
        hasMore: offset + limit < parseInt(total as string, 10),
      };
    } catch (e) {
      return { items: [], total: 0, hasMore: false };
    }
  }

  /**
   * Review and resolve a report
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    decision: {
      status: 'resolved' | 'dismissed' | 'action_taken';
      actionTaken?: string;
      resolution?: string;
      notifyReporter?: boolean;
    }
  ): Promise<void> {
    const report = await db('reports').where({ id: reportId }).first();
    if (!report) {
      throw new Error('Report not found');
    }

    await db('reports').where({ id: reportId }).update({
      status: decision.status,
      action_taken: decision.actionTaken,
      resolution: decision.resolution,
      resolved_by: moderatorId,
      resolved_at: new Date(),
      updated_at: new Date(),
    });

    // Log moderator action
    await this.logModeratorAction(moderatorId, {
      actionType: 'report_resolved',
      reportId,
      targetUserId: report.reported_id,
      details: decision,
      timestamp: new Date(),
    });

    // Update reported user's safety score
    await this.updateUserSafetyScore(report.reported_id);

    logger.info(`Report ${reportId} resolved by moderator ${moderatorId}`, decision);
  }

  /**
   * Take action on a user (warn, suspend, ban)
   */
  async takeUserAction(
    targetUserId: string,
    moderatorId: string,
    action: {
      type: 'warn' | 'suspend' | 'ban' | 'unban' | 'restrict' | 'unrestrict';
      reason: string;
      duration?: number; // For suspension, in days
      notifyUser?: boolean;
    }
  ): Promise<void> {
    const user = await db('users').where({ id: targetUserId }).first();
    if (!user) {
      throw new Error('User not found');
    }

    switch (action.type) {
      case 'warn':
        await this.warnUser(targetUserId, action.reason);
        break;
      case 'suspend':
        await this.suspendUser(targetUserId, action.duration || 7, action.reason);
        break;
      case 'ban':
        await this.banUser(targetUserId, action.reason);
        break;
      case 'unban':
        await this.unbanUser(targetUserId);
        break;
      case 'restrict':
        await this.restrictUser(targetUserId, action.reason);
        break;
      case 'unrestrict':
        await this.unrestrictUser(targetUserId);
        break;
    }

    // Log moderator action
    await this.logModeratorAction(moderatorId, {
      actionType: `user_${action.type}${action.type === 'warn' ? 'ed' : action.type === 'ban' ? 'ned' : 'ed'}`,
      targetUserId,
      details: action,
      timestamp: new Date(),
    });

    logger.info(`User ${targetUserId} ${action.type} by moderator ${moderatorId}`, action);
  }

  /**
   * Get moderator action history
   */
  async getModeratorActionHistory(
    options: {
      moderatorId?: string;
      targetUserId?: string;
      actionType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    actions: any[];
    total: number;
  }> {
    const { moderatorId, targetUserId, actionType, limit = 100, offset = 0 } = options;

    let query = db('moderator_action_logs')
      .leftJoin('users as moderator', 'moderator_action_logs.moderator_id', 'moderator.id')
      .leftJoin('users as target', 'moderator_action_logs.target_user_id', 'target.id')
      .select(
        'moderator_action_logs.*',
        'moderator.email as moderator_email',
        'moderator.first_name as moderator_name',
        'target.email as target_email',
        'target.first_name as target_name'
      );

    if (moderatorId) {
      query = query.where('moderator_action_logs.moderator_id', moderatorId);
    }

    if (targetUserId) {
      query = query.where('moderator_action_logs.target_user_id', targetUserId);
    }

    if (actionType) {
      query = query.where('moderator_action_logs.action_type', actionType);
    }

    const [{ count: total }] = await query.clone().count('moderator_action_logs.id as count');

    const actions = await query
      .orderBy('moderator_action_logs.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      actions: actions.map((a: any) => ({
        ...a,
        action_details:
          typeof a.action_details === 'string' ? JSON.parse(a.action_details) : a.action_details,
      })),
      total: parseInt(total as string, 10),
    };
  }

  /**
   * Get flagged users for review
   */
  async getFlaggedUsers(
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    users: UserSafetyProfile[];
    total: number;
  }> {
    const { limit = 50, offset = 0 } = options;

    try {
      const [{ count: total }] = await db('user_safety_scores')
        .where('is_flagged', true)
        .count('* as count');

      const flaggedUsers = await db('user_safety_scores')
        .where('is_flagged', true)
        .orderBy('overall_safety_score', 'asc')
        .limit(limit)
        .offset(offset);

      const profiles: UserSafetyProfile[] = [];
      for (const flagged of flaggedUsers) {
        const profile = await this.getUserSafetyProfile(flagged.user_id);
        if (profile) {
          profiles.push(profile);
        }
      }

      return {
        users: profiles,
        total: parseInt(total as string, 10),
      };
    } catch (e) {
      return { users: [], total: 0 };
    }
  }

  // Private helper methods

  private calculatePriorityScore(report: any): number {
    let score = 0;

    // Severity weight
    const severityWeights: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };
    score += severityWeights[report.severity] || 0;

    // Age penalty (older reports get higher priority)
    const ageHours = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
    score += Math.min(ageHours, 48); // Max 48 points for age

    // AI urgency boost
    if (report.urgency_score) {
      score += report.urgency_score * 20;
    }

    // Immediate action flag
    if (report.requires_immediate_action) {
      score += 50;
    }

    return Math.round(score);
  }

  private async logModeratorAction(moderatorId: string, action: ModeratorAction): Promise<void> {
    try {
      await db('moderator_action_logs').insert({
        moderator_id: moderatorId,
        target_user_id: action.targetUserId,
        report_id: action.reportId,
        action_type: action.actionType,
        action_details: JSON.stringify(action.details),
        created_at: action.timestamp,
      });
    } catch (e) {
      logger.error('Failed to log moderator action:', e);
    }
  }

  private async updateUserSafetyScore(userId: string): Promise<void> {
    try {
      // Recalculate safety score based on all factors
      const [reportStats] = (await db('reports')
        .where('reported_id', userId)
        .select(
          db.raw('COUNT(*) as total_reports'),
          db.raw(
            "COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'action_taken') as confirmed_reports"
          )
        )) as { total_reports: string; confirmed_reports: string }[];

      const [blockStats] = (await db('blocked_users')
        .where('blocked_id', userId)
        .count('* as total_blocks')) as { total_blocks: string | number }[];

      const existing = await db('user_safety_scores').where('user_id', userId).first();

      const totalReports = parseInt(reportStats?.total_reports || '0', 10);
      const confirmedReports = parseInt(reportStats?.confirmed_reports || '0', 10);
      const totalBlocks = parseInt(String(blockStats?.total_blocks || '0'), 10);

      // Calculate new safety score
      const reportPenalty = confirmedReports * 15;
      const blockPenalty = Math.min(totalBlocks * 3, 30);
      const overallSafetyScore = Math.max(0, 100 - reportPenalty - blockPenalty);

      const updates = {
        total_reports_received: totalReports,
        confirmed_reports: confirmedReports,
        total_blocks_received: totalBlocks,
        overall_safety_score: overallSafetyScore,
        is_flagged: confirmedReports >= 2 || totalBlocks >= 5,
        is_under_review: confirmedReports >= 3 || totalBlocks >= 10,
        last_calculated_at: new Date(),
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
      logger.error('Failed to update user safety score:', e);
    }
  }

  private async warnUser(userId: string, reason: string): Promise<void> {
    const existing = await db('user_safety_scores').where('user_id', userId).first();

    const updates = {
      warnings_received: (existing?.warnings_received || 0) + 1,
      updated_at: new Date(),
    };

    if (existing) {
      await db('user_safety_scores').where('user_id', userId).update(updates);
    } else {
      await db('user_safety_scores').insert({
        user_id: userId,
        overall_safety_score: 90,
        ...updates,
        created_at: new Date(),
      });
    }

    // Send warning notification to user
    await this.sendUserNotification(userId, 'warning', {
      title: 'Account Warning',
      message: `Your account has received a warning. Reason: ${updates.restriction_reason || 'Policy violation'}. Please review our community guidelines to avoid further action.`,
      warningCount: updates.warnings_count || 1,
    });
  }

  private async sendUserNotification(
    userId: string,
    type: 'warning' | 'suspension' | 'ban',
    data: { title: string; message: string; [key: string]: any }
  ): Promise<void> {
    try {
      // Insert notification into database
      await db('notifications').insert({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        type: `moderation_${type}`,
        title: data.title,
        body: data.message,
        data: JSON.stringify(data),
        priority: type === 'ban' ? 'high' : 'normal',
        created_at: new Date(),
      });

      // Also send push notification and email for important moderation actions
      // In production, integrate with notification service
      logger.info(`Sent ${type} notification to user ${userId}`, { data });
    } catch (error) {
      logger.error(`Failed to send ${type} notification to user ${userId}`, error);
    }
  }

  private async suspendUser(userId: string, days: number, reason: string): Promise<void> {
    const suspensionEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db('user_moderation_records')
      .insert({
        user_id: userId,
        status: 'suspended',
        suspension_count: 1,
        current_suspension_ends_at: suspensionEndsAt,
        last_admin_action_reason: reason,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict('user_id')
      .merge({
        status: 'suspended',
        suspension_count: db.raw('suspension_count + 1'),
        current_suspension_ends_at: suspensionEndsAt,
        last_admin_action_reason: reason,
        updated_at: new Date(),
      });

    // Update safety scores
    await db('user_safety_scores')
      .where('user_id', userId)
      .update({
        is_restricted: true,
        restriction_reason: reason,
        suspensions_count: db.raw('suspensions_count + 1'),
        updated_at: new Date(),
      });

    // Send suspension notification to user
    await this.sendUserNotification(userId, 'suspension', {
      title: 'Account Suspended',
      message: `Your account has been suspended for ${days} day(s). Reason: ${reason}. Your suspension will be lifted on ${suspensionEndsAt.toLocaleDateString()}.`,
      suspensionDays: days,
      suspensionEndsAt: suspensionEndsAt.toISOString(),
      reason,
    });
  }

  private async banUser(userId: string, reason: string): Promise<void> {
    await db('user_moderation_records')
      .insert({
        user_id: userId,
        status: 'banned',
        permanently_banned: true,
        banned_at: new Date(),
        banned_reason: reason,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict('user_id')
      .merge({
        status: 'banned',
        permanently_banned: true,
        banned_at: new Date(),
        banned_reason: reason,
        updated_at: new Date(),
      });

    // Update safety scores
    await db('user_safety_scores').where('user_id', userId).update({
      is_restricted: true,
      restriction_reason: reason,
      overall_safety_score: 0,
      updated_at: new Date(),
    });

    // Send ban notification to user
    await this.sendUserNotification(userId, 'ban', {
      title: 'Account Permanently Banned',
      message: `Your account has been permanently banned. Reason: ${reason}. This action is final. If you believe this is an error, you may contact our appeals team.`,
      reason,
      appealEmail: 'appeals@flamoral.com',
    });
  }

  private async unbanUser(userId: string): Promise<void> {
    await db('user_moderation_records').where('user_id', userId).update({
      status: 'active',
      permanently_banned: false,
      banned_at: null,
      banned_reason: null,
      updated_at: new Date(),
    });

    await db('user_safety_scores').where('user_id', userId).update({
      is_restricted: false,
      restriction_reason: null,
      updated_at: new Date(),
    });
  }

  private async restrictUser(userId: string, reason: string): Promise<void> {
    await db('user_safety_scores').where('user_id', userId).update({
      is_restricted: true,
      restriction_reason: reason,
      updated_at: new Date(),
    });
  }

  private async unrestrictUser(userId: string): Promise<void> {
    await db('user_safety_scores').where('user_id', userId).update({
      is_restricted: false,
      restriction_reason: null,
      updated_at: new Date(),
    });
  }
}

export const adminSafetyDashboardService = new AdminSafetyDashboardService();
export default adminSafetyDashboardService;
