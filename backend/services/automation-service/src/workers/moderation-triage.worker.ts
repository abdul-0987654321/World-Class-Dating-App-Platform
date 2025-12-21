/**
 * Moderation Triage Worker
 * Auto-triages incoming reports
 * Prioritizes by severity
 * Creates moderation cases
 */

import { Job } from 'bull';
import { createLogger } from '@flamoral/shared';
import axios from 'axios';
import {
  BaseWorker,
  WorkerQueueName,
  BaseJobData,
  JobResult,
  JobPriority,
} from './base-worker';

const logger = createLogger('moderation-triage-worker');

// Service URLs
const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://localhost:3008';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3010';

// Report categories
export enum ReportCategory {
  HARASSMENT = 'harassment',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  FAKE_PROFILE = 'fake_profile',
  UNDERAGE = 'underage',
  VIOLENCE = 'violence',
  HATE_SPEECH = 'hate_speech',
  ILLEGAL_ACTIVITY = 'illegal_activity',
  SCAM = 'scam',
  IMPERSONATION = 'impersonation',
  OTHER = 'other',
}

// Case priority
export enum CasePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Case status
export enum CaseStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  ACTION_TAKEN = 'action_taken',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated',
}

// Auto-action types
export enum AutoAction {
  NONE = 'none',
  WARN_USER = 'warn_user',
  HIDE_CONTENT = 'hide_content',
  SUSPEND_USER = 'suspend_user',
  BAN_USER = 'ban_user',
  ESCALATE = 'escalate',
}

// Job data interfaces
export interface ModerationTriageJobData extends BaseJobData {
  type: 'triage_report' | 'batch_triage' | 'auto_moderate_content' | 'escalate_case' | 'review_queue_health';
  reportId?: string;
  reportedUserId?: string;
  reporterUserId?: string;
  category?: ReportCategory;
  contentType?: 'profile' | 'photo' | 'message' | 'bio' | 'other';
  contentId?: string;
  contentUrl?: string;
  contentText?: string;
  reportReason?: string;
  caseId?: string;
  reportIds?: string[];
}

export interface ModerationTriageResult {
  reportId?: string;
  caseId?: string;
  priority: CasePriority;
  autoAction: AutoAction;
  riskScore: number;
  assignedTo?: string;
  escalated: boolean;
  reportsProcessed?: number;
}

/**
 * Moderation Triage Worker
 */
export class ModerationTriageWorker extends BaseWorker<ModerationTriageJobData, ModerationTriageResult> {
  // Risk score thresholds for auto-actions
  private readonly criticalThreshold = 0.9;
  private readonly highThreshold = 0.7;
  private readonly mediumThreshold = 0.4;

  // Categories that require immediate escalation
  private readonly criticalCategories: ReportCategory[] = [
    ReportCategory.UNDERAGE,
    ReportCategory.ILLEGAL_ACTIVITY,
    ReportCategory.VIOLENCE,
  ];

  constructor() {
    super(WorkerQueueName.MODERATION_TRIAGE, 8);
  }

  /**
   * Process moderation triage job
   */
  protected async processJob(job: Job<ModerationTriageJobData>): Promise<JobResult<ModerationTriageResult>> {
    const { type, reportId } = job.data;
    const startTime = Date.now();

    try {
      let result: ModerationTriageResult;

      switch (type) {
        case 'triage_report':
          result = await this.triageReport(job.data);
          break;

        case 'batch_triage':
          result = await this.batchTriage(job.data);
          break;

        case 'auto_moderate_content':
          result = await this.autoModerateContent(job.data);
          break;

        case 'escalate_case':
          result = await this.escalateCase(job.data);
          break;

        case 'review_queue_health':
          result = await this.reviewQueueHealth();
          break;

        default:
          throw new Error(`Unknown triage type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Moderation triage completed`, {
        type,
        correlationId: job.data.correlationId,
        reportId,
        priority: result.priority,
        autoAction: result.autoAction,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Moderation triage failed`, {
        type,
        correlationId: job.data.correlationId,
        reportId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Triage a single report
   */
  private async triageReport(jobData: ModerationTriageJobData): Promise<ModerationTriageResult> {
    const {
      reportId,
      reportedUserId,
      reporterUserId,
      category,
      contentType,
      contentId,
      contentUrl,
      contentText,
      reportReason,
    } = jobData;

    try {
      // Step 1: Calculate risk score based on multiple factors
      const riskScore = await this.calculateRiskScore(jobData);

      // Step 2: Determine priority
      const priority = this.determinePriority(riskScore, category!);

      // Step 3: Determine auto-action
      const autoAction = await this.determineAutoAction(riskScore, category!, reportedUserId!);

      // Step 4: Check if immediate escalation is needed
      const needsEscalation = this.criticalCategories.includes(category!) || riskScore >= this.criticalThreshold;

      // Step 5: Create or update moderation case
      const caseId = await this.createModerationCase({
        reportId: reportId!,
        reportedUserId: reportedUserId!,
        reporterUserId: reporterUserId!,
        category: category!,
        contentType: contentType!,
        contentId,
        contentUrl,
        contentText,
        reportReason,
        priority,
        riskScore,
        autoAction,
      });

      // Step 6: Execute auto-action if applicable
      if (autoAction !== AutoAction.NONE) {
        await this.executeAutoAction(autoAction, reportedUserId!, contentId, caseId);
      }

      // Step 7: Escalate if needed
      if (needsEscalation) {
        await this.escalateCase({
          ...jobData,
          caseId,
          type: 'escalate_case',
        });
      }

      // Step 8: Assign to moderator if not auto-resolved
      let assignedTo: string | undefined;
      if (autoAction !== AutoAction.BAN_USER && autoAction !== AutoAction.SUSPEND_USER) {
        assignedTo = await this.assignToModerator(caseId, priority);
      }

      // Step 9: Send acknowledgment to reporter
      await this.sendReportAcknowledgment(reporterUserId!, reportId!);

      return {
        reportId,
        caseId,
        priority,
        autoAction,
        riskScore,
        assignedTo,
        escalated: needsEscalation,
      };
    } catch (error: any) {
      logger.error(`Failed to triage report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple reports in batch
   */
  private async batchTriage(jobData: ModerationTriageJobData): Promise<ModerationTriageResult> {
    const { reportIds } = jobData;
    let processedCount = 0;
    let highestPriority = CasePriority.LOW;

    if (!reportIds || reportIds.length === 0) {
      throw new Error('No report IDs provided for batch triage');
    }

    for (const reportId of reportIds) {
      try {
        // Get report details
        const report = await this.getReportDetails(reportId);

        if (report) {
          const result = await this.triageReport({
            ...jobData,
            reportId,
            reportedUserId: report.reportedUserId,
            reporterUserId: report.reporterUserId,
            category: report.category,
            contentType: report.contentType,
            contentId: report.contentId,
            contentUrl: report.contentUrl,
            contentText: report.contentText,
            reportReason: report.reason,
          });

          processedCount++;

          // Track highest priority
          if (this.comparePriority(result.priority, highestPriority) > 0) {
            highestPriority = result.priority;
          }
        }
      } catch (error: any) {
        logger.error(`Failed to triage report in batch: ${reportId}`, error);
      }
    }

    return {
      priority: highestPriority,
      autoAction: AutoAction.NONE,
      riskScore: 0,
      escalated: false,
      reportsProcessed: processedCount,
    };
  }

  /**
   * Auto-moderate content based on AI analysis
   */
  private async autoModerateContent(jobData: ModerationTriageJobData): Promise<ModerationTriageResult> {
    const { contentType, contentId, contentUrl, contentText, reportedUserId } = jobData;

    try {
      // Call moderation service for content analysis
      const analysisResult = await this.analyzeContent(contentType!, contentUrl, contentText);

      // Determine action based on analysis
      const autoAction = this.determineContentAction(analysisResult);

      // Execute action
      if (autoAction !== AutoAction.NONE && contentId) {
        await this.executeContentAction(autoAction, contentId, contentType!, reportedUserId!);
      }

      return {
        priority: this.determinePriority(analysisResult.riskScore, ReportCategory.INAPPROPRIATE_CONTENT),
        autoAction,
        riskScore: analysisResult.riskScore,
        escalated: analysisResult.riskScore >= this.criticalThreshold,
      };
    } catch (error: any) {
      logger.error(`Failed to auto-moderate content ${contentId}:`, error);
      throw error;
    }
  }

  /**
   * Escalate a case to senior moderators
   */
  private async escalateCase(jobData: ModerationTriageJobData): Promise<ModerationTriageResult> {
    const { caseId, category } = jobData;

    try {
      // Update case status to escalated
      await axios.patch(
        `${MODERATION_SERVICE_URL}/api/v1/internal/cases/${caseId}`,
        {
          status: CaseStatus.ESCALATED,
          escalatedAt: new Date().toISOString(),
          escalationReason: `Critical category: ${category}`,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      // Notify senior moderators
      await this.notifySeniorModerators(caseId!, category!);

      // For critical cases (underage, illegal), notify trust & safety team
      if (category && this.criticalCategories.includes(category)) {
        await this.notifyTrustAndSafety(caseId!, category);
      }

      return {
        caseId,
        priority: CasePriority.CRITICAL,
        autoAction: AutoAction.ESCALATE,
        riskScore: 1.0,
        escalated: true,
      };
    } catch (error: any) {
      logger.error(`Failed to escalate case ${caseId}:`, error);
      throw error;
    }
  }

  /**
   * Review moderation queue health
   */
  private async reviewQueueHealth(): Promise<ModerationTriageResult> {
    try {
      // Get queue statistics
      const queueStats = await this.getQueueStatistics();

      // Check for backlog
      if (queueStats.pendingCount > 100) {
        logger.warn(`Moderation queue backlog detected: ${queueStats.pendingCount} pending cases`);

        // Notify admin
        await this.notifyAdminQueueBacklog(queueStats);
      }

      // Check for stale cases (not reviewed in 24 hours)
      const staleCases = await this.getStaleCases();

      if (staleCases.length > 0) {
        logger.warn(`${staleCases.length} stale moderation cases detected`);

        // Re-prioritize stale cases
        for (const caseId of staleCases) {
          await this.reprioritizeCase(caseId);
        }
      }

      return {
        priority: CasePriority.LOW,
        autoAction: AutoAction.NONE,
        riskScore: 0,
        escalated: false,
        reportsProcessed: staleCases.length,
      };
    } catch (error: any) {
      logger.error('Failed to review queue health:', error);
      throw error;
    }
  }

  // Helper methods

  private async calculateRiskScore(jobData: ModerationTriageJobData): Promise<number> {
    const { category, reportedUserId, reporterUserId, contentUrl, contentText } = jobData;

    let score = 0;

    // Base score from category
    const categoryScores: Record<ReportCategory, number> = {
      [ReportCategory.UNDERAGE]: 1.0,
      [ReportCategory.ILLEGAL_ACTIVITY]: 1.0,
      [ReportCategory.VIOLENCE]: 0.9,
      [ReportCategory.HATE_SPEECH]: 0.85,
      [ReportCategory.HARASSMENT]: 0.7,
      [ReportCategory.INAPPROPRIATE_CONTENT]: 0.6,
      [ReportCategory.SCAM]: 0.7,
      [ReportCategory.FAKE_PROFILE]: 0.5,
      [ReportCategory.IMPERSONATION]: 0.6,
      [ReportCategory.SPAM]: 0.3,
      [ReportCategory.OTHER]: 0.4,
    };

    score += categoryScores[category!] || 0.4;

    // Check user history
    const userHistory = await this.getUserModerationHistory(reportedUserId!);
    if (userHistory.previousViolations > 0) {
      score += Math.min(0.3, userHistory.previousViolations * 0.1);
    }

    // Check reporter credibility
    const reporterCredibility = await this.getReporterCredibility(reporterUserId!);
    score = score * reporterCredibility;

    // Content analysis (if available)
    if (contentUrl || contentText) {
      const contentAnalysis = await this.analyzeContent(
        jobData.contentType!,
        contentUrl,
        contentText
      );
      score = (score + contentAnalysis.riskScore) / 2;
    }

    return Math.min(1.0, Math.max(0, score));
  }

  private determinePriority(riskScore: number, category: ReportCategory): CasePriority {
    if (this.criticalCategories.includes(category) || riskScore >= this.criticalThreshold) {
      return CasePriority.CRITICAL;
    }
    if (riskScore >= this.highThreshold) {
      return CasePriority.HIGH;
    }
    if (riskScore >= this.mediumThreshold) {
      return CasePriority.MEDIUM;
    }
    return CasePriority.LOW;
  }

  private async determineAutoAction(
    riskScore: number,
    category: ReportCategory,
    userId: string
  ): Promise<AutoAction> {
    // Critical categories always escalate
    if (this.criticalCategories.includes(category)) {
      return AutoAction.ESCALATE;
    }

    // Check user history for repeat offenders
    const userHistory = await this.getUserModerationHistory(userId);

    if (riskScore >= this.criticalThreshold) {
      if (userHistory.previousViolations >= 3) {
        return AutoAction.BAN_USER;
      }
      if (userHistory.previousViolations >= 1) {
        return AutoAction.SUSPEND_USER;
      }
      return AutoAction.HIDE_CONTENT;
    }

    if (riskScore >= this.highThreshold) {
      if (userHistory.previousViolations >= 2) {
        return AutoAction.SUSPEND_USER;
      }
      return AutoAction.WARN_USER;
    }

    if (riskScore >= this.mediumThreshold) {
      return AutoAction.WARN_USER;
    }

    return AutoAction.NONE;
  }

  private async createModerationCase(data: any): Promise<string> {
    try {
      const response = await axios.post(
        `${MODERATION_SERVICE_URL}/api/v1/internal/cases`,
        {
          ...data,
          status: CaseStatus.PENDING,
          createdAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.caseId || response.data.id;
    } catch (error: any) {
      logger.error('Failed to create moderation case:', error);
      throw error;
    }
  }

  private async executeAutoAction(
    action: AutoAction,
    userId: string,
    contentId?: string,
    caseId?: string
  ): Promise<void> {
    try {
      switch (action) {
        case AutoAction.WARN_USER:
          await this.warnUser(userId, caseId);
          break;

        case AutoAction.HIDE_CONTENT:
          if (contentId) {
            await this.hideContent(contentId);
          }
          break;

        case AutoAction.SUSPEND_USER:
          await this.suspendUser(userId, 7); // 7 day suspension
          break;

        case AutoAction.BAN_USER:
          await this.banUser(userId);
          break;

        case AutoAction.ESCALATE:
          // Already handled separately
          break;
      }

      // Log the action
      await this.logAutoAction(action, userId, contentId, caseId);
    } catch (error: any) {
      logger.error(`Failed to execute auto-action ${action}:`, error);
    }
  }

  private async warnUser(userId: string, caseId?: string): Promise<void> {
    await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
      {
        userId,
        type: 'moderation_warning',
        title: 'Community Guidelines Reminder',
        body: 'Your content or behavior has been flagged. Please review our community guidelines.',
        data: { caseId },
        channels: ['push', 'in_app', 'email'],
        priority: 'high',
      },
      {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );
  }

  private async hideContent(contentId: string): Promise<void> {
    await axios.patch(
      `${MODERATION_SERVICE_URL}/api/v1/internal/content/${contentId}/hide`,
      {},
      {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );
  }

  private async suspendUser(userId: string, days: number): Promise<void> {
    await axios.post(
      `${USER_SERVICE_URL}/api/v1/internal/users/${userId}/suspend`,
      {
        durationDays: days,
        reason: 'Automatic suspension due to policy violations',
      },
      {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );
  }

  private async banUser(userId: string): Promise<void> {
    await axios.post(
      `${USER_SERVICE_URL}/api/v1/internal/users/${userId}/ban`,
      {
        reason: 'Automatic ban due to severe policy violations',
      },
      {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );
  }

  private async getUserModerationHistory(userId: string): Promise<{
    previousViolations: number;
    lastViolationAt?: string;
    isSuspended: boolean;
    isBanned: boolean;
  }> {
    try {
      const response = await axios.get(
        `${MODERATION_SERVICE_URL}/api/v1/internal/users/${userId}/history`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      return {
        previousViolations: 0,
        isSuspended: false,
        isBanned: false,
      };
    }
  }

  private async getReporterCredibility(reporterId: string): Promise<number> {
    try {
      const response = await axios.get(
        `${MODERATION_SERVICE_URL}/api/v1/internal/reporters/${reporterId}/credibility`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.credibilityScore || 1.0;
    } catch (error) {
      return 1.0; // Default to full credibility
    }
  }

  private async analyzeContent(
    contentType: string,
    contentUrl?: string,
    contentText?: string
  ): Promise<{ riskScore: number; violations: string[] }> {
    try {
      const response = await axios.post(
        `${MODERATION_SERVICE_URL}/api/v1/internal/analyze`,
        {
          contentType,
          contentUrl,
          contentText,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error) {
      return { riskScore: 0.5, violations: [] };
    }
  }

  private determineContentAction(analysisResult: { riskScore: number; violations: string[] }): AutoAction {
    if (analysisResult.riskScore >= this.criticalThreshold) {
      return AutoAction.HIDE_CONTENT;
    }
    if (analysisResult.riskScore >= this.highThreshold) {
      return AutoAction.WARN_USER;
    }
    return AutoAction.NONE;
  }

  private async executeContentAction(
    action: AutoAction,
    contentId: string,
    contentType: string,
    userId: string
  ): Promise<void> {
    if (action === AutoAction.HIDE_CONTENT) {
      await this.hideContent(contentId);
    }
    if (action === AutoAction.WARN_USER) {
      await this.warnUser(userId);
    }
  }

  private async assignToModerator(caseId: string, priority: CasePriority): Promise<string | undefined> {
    try {
      const response = await axios.post(
        `${ADMIN_SERVICE_URL}/api/v1/internal/moderation/assign`,
        {
          caseId,
          priority,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.assignedTo;
    } catch (error) {
      return undefined;
    }
  }

  private async getReportDetails(reportId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${MODERATION_SERVICE_URL}/api/v1/internal/reports/${reportId}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }

  private async sendReportAcknowledgment(reporterId: string, reportId: string): Promise<void> {
    try {
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
        {
          userId: reporterId,
          type: 'report_received',
          title: 'Report Received',
          body: 'Thank you for your report. Our team will review it shortly.',
          data: { reportId },
          channels: ['in_app'],
          priority: 'normal',
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to send report acknowledgment:', error);
    }
  }

  private async notifySeniorModerators(caseId: string, category: ReportCategory): Promise<void> {
    try {
      await axios.post(
        `${ADMIN_SERVICE_URL}/api/v1/internal/notifications/senior-moderators`,
        {
          caseId,
          category,
          message: `Critical case requires immediate attention: ${category}`,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to notify senior moderators:', error);
    }
  }

  private async notifyTrustAndSafety(caseId: string, category: ReportCategory): Promise<void> {
    try {
      await axios.post(
        `${ADMIN_SERVICE_URL}/api/v1/internal/notifications/trust-safety`,
        {
          caseId,
          category,
          priority: 'critical',
          message: `CRITICAL: ${category} report requires T&S review`,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to notify trust & safety:', error);
    }
  }

  private async getQueueStatistics(): Promise<{
    pendingCount: number;
    inReviewCount: number;
    averageResolutionTimeHours: number;
  }> {
    try {
      const response = await axios.get(
        `${MODERATION_SERVICE_URL}/api/v1/internal/queue/stats`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      return { pendingCount: 0, inReviewCount: 0, averageResolutionTimeHours: 0 };
    }
  }

  private async getStaleCases(): Promise<string[]> {
    try {
      const response = await axios.get(
        `${MODERATION_SERVICE_URL}/api/v1/internal/cases/stale`,
        {
          params: { hoursThreshold: 24 },
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.caseIds || [];
    } catch (error) {
      return [];
    }
  }

  private async reprioritizeCase(caseId: string): Promise<void> {
    try {
      await axios.patch(
        `${MODERATION_SERVICE_URL}/api/v1/internal/cases/${caseId}/priority`,
        {
          priority: CasePriority.HIGH,
          reason: 'Auto-escalated due to response time SLA',
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to reprioritize case ${caseId}:`, error);
    }
  }

  private async notifyAdminQueueBacklog(stats: any): Promise<void> {
    try {
      await axios.post(
        `${ADMIN_SERVICE_URL}/api/v1/internal/notifications/admins`,
        {
          type: 'queue_backlog',
          message: `Moderation queue backlog: ${stats.pendingCount} pending cases`,
          data: stats,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to notify admin of queue backlog:', error);
    }
  }

  private async logAutoAction(
    action: AutoAction,
    userId: string,
    contentId?: string,
    caseId?: string
  ): Promise<void> {
    logger.info('Auto-action executed', {
      action,
      userId,
      contentId,
      caseId,
      timestamp: new Date().toISOString(),
    });
  }

  private comparePriority(a: CasePriority, b: CasePriority): number {
    const order = [CasePriority.LOW, CasePriority.MEDIUM, CasePriority.HIGH, CasePriority.CRITICAL];
    return order.indexOf(a) - order.indexOf(b);
  }

  // Public scheduling methods

  async scheduleReportTriage(
    reportId: string,
    reportedUserId: string,
    reporterUserId: string,
    category: ReportCategory,
    contentType: 'profile' | 'photo' | 'message' | 'bio' | 'other',
    contentId?: string,
    contentUrl?: string,
    contentText?: string,
    reportReason?: string
  ): Promise<void> {
    const priority = this.criticalCategories.includes(category)
      ? JobPriority.CRITICAL
      : JobPriority.HIGH;

    await this.addJob(
      {
        type: 'triage_report',
        reportId,
        reportedUserId,
        reporterUserId,
        category,
        contentType,
        contentId,
        contentUrl,
        contentText,
        reportReason,
      },
      {
        priority,
      }
    );
  }

  async scheduleBatchTriage(reportIds: string[]): Promise<void> {
    await this.addJob(
      {
        type: 'batch_triage',
        reportIds,
      },
      {
        priority: JobPriority.NORMAL,
      }
    );
  }

  async scheduleContentModeration(
    contentType: 'profile' | 'photo' | 'message' | 'bio' | 'other',
    contentId: string,
    contentUrl?: string,
    contentText?: string,
    reportedUserId?: string
  ): Promise<void> {
    await this.addJob(
      {
        type: 'auto_moderate_content',
        contentType,
        contentId,
        contentUrl,
        contentText,
        reportedUserId,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  async scheduleQueueHealthCheck(): Promise<void> {
    await this.addJob(
      {
        type: 'review_queue_health',
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }
}

// Export singleton instance
export const moderationTriageWorker = new ModerationTriageWorker();
export default moderationTriageWorker;
