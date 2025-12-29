import { createLogger } from '../../utils/logger';
const logger = createLogger('ReportService');

import { ReportRepository } from '../repositories/report.repository';
import { ReportCategoryRepository } from '../repositories/report-category.repository';
import {
  Report,
  ReportCreateInput,
  REPORT_STATUS,
  ACTION_TAKEN,
  validateReport,
  getPriorityScore
} from '../entities/Report.entity';
import { requiresImmediateAction } from '../entities/ReportCategory.entity';

export class ReportService {
  private reportRepository: ReportRepository;
  private reportCategoryRepository: ReportCategoryRepository;

  constructor(
    reportRepository?: ReportRepository,
    reportCategoryRepository?: ReportCategoryRepository
  ) {
    this.reportRepository = reportRepository || new ReportRepository();
    this.reportCategoryRepository = reportCategoryRepository || new ReportCategoryRepository();
  }

  /**
   * Submit a new report
   */
  async createReport(input: ReportCreateInput): Promise<Report> {
    // Validate report
    validateReport(input);

    // Check if user has already reported this person
    const existingReports = await this.reportRepository.findByReporterId(input.reporterId);
    const alreadyReported = existingReports.some(
      report => report.reportedId === input.reportedId && report.status === REPORT_STATUS.PENDING
    );

    if (alreadyReported) {
      throw new Error('You have already reported this user');
    }

    // Get category to determine auto-action
    const category = await this.reportCategoryRepository.findByCode(input.reportType);
    const severity = category ? category.severity : input.severity || 'medium';

    // Create report
    const report = await this.reportRepository.create({
      ...input,
      severity,
    });

    // Check if requires immediate action
    if (category && requiresImmediateAction(category)) {
      // Trigger immediate action (suspend/ban)
      await this.takeAutoAction(report, category.autoAction);
    }

    return report;
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<Report | null> {
    return await this.reportRepository.findById(reportId);
  }

  /**
   * Get reports by status
   */
  async getReportsByStatus(
    status: Report['status'],
    options?: { limit?: number; offset?: number; severity?: string }
  ): Promise<Report[]> {
    return await this.reportRepository.findByStatus(status, options);
  }

  /**
   * Get reports against a specific user
   */
  async getReportsAgainstUser(
    reportedId: string,
    options?: { limit?: number; offset?: number; status?: string }
  ): Promise<Report[]> {
    return await this.reportRepository.findByReportedId(reportedId, options);
  }

  /**
   * Get reports submitted by a user
   */
  async getReportsByUser(
    reporterId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Report[]> {
    return await this.reportRepository.findByReporterId(reporterId, options);
  }

  /**
   * Get pending reports sorted by priority
   */
  async getPendingReportsByPriority(limit: number = 50): Promise<Report[]> {
    const pending = await this.reportRepository.findByStatus(REPORT_STATUS.PENDING, { limit });

    // Sort by priority score
    return pending.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string,
    status: Report['status']
  ): Promise<Report> {
    return await this.reportRepository.update(reportId, { status });
  }

  /**
   * Resolve a report
   */
  async resolveReport(
    reportId: string,
    resolution: string,
    actionTaken: Report['actionTaken'],
    moderatorId: string
  ): Promise<Report> {
    return await this.reportRepository.resolveReport(
      reportId,
      resolution,
      actionTaken,
      moderatorId
    );
  }

  /**
   * Dismiss a report
   */
  async dismissReport(
    reportId: string,
    moderatorId: string,
    reason: string
  ): Promise<Report> {
    return await this.reportRepository.dismissReport(reportId, moderatorId, reason);
  }

  /**
   * Get count of reports against a user
   */
  async getReportCount(reportedId: string): Promise<number> {
    return await this.reportRepository.countByReportedId(reportedId);
  }

  /**
   * Get report statistics
   */
  async getReportStats() {
    return await this.reportRepository.getReportStats();
  }

  /**
   * Check if user should be flagged based on report count
   */
  async shouldFlagUser(reportedId: string): Promise<{
    shouldFlag: boolean;
    reportCount: number;
    threshold: number;
  }> {
    const reportCount = await this.reportRepository.countByReportedId(reportedId);
    const threshold = 3; // Flag after 3 reports

    return {
      shouldFlag: reportCount >= threshold,
      reportCount,
      threshold,
    };
  }

  /**
   * Get all report categories
   */
  async getReportCategories() {
    return await this.reportCategoryRepository.findAllActive();
  }

  /**
   * Get critical reports requiring immediate attention
   */
  async getCriticalReports(): Promise<Report[]> {
    return await this.reportRepository.findBySeverity('critical', { limit: 100 });
  }

  /**
   * Take automatic action based on report category
   */
  private async takeAutoAction(
    report: Report,
    action: string
  ): Promise<void> {
    // This would integrate with user suspension/ban system
    // For now, just update report to investigating status
    await this.reportRepository.update(report.id, {
      status: REPORT_STATUS.INVESTIGATING,
    });

    // In a real implementation, this would:
    // - Send notification to moderators
    // - Auto-suspend user if action is 'suspend'
    // - Auto-ban user if action is 'ban'
    // - Add warning flag if action is 'warn'
  }

  /**
   * Get moderation queue with priority sorting
   */
  async getModerationQueue(limit: number = 50): Promise<Report[]> {
    const pending = await this.reportRepository.findByStatus(REPORT_STATUS.PENDING, {
      limit: limit * 2, // Get more to sort
    });
    const investigating = await this.reportRepository.findByStatus(REPORT_STATUS.INVESTIGATING, {
      limit: limit,
    });

    // Combine and sort by priority
    const combined = [...pending, ...investigating];
    const sorted = combined.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

    return sorted.slice(0, limit);
  }

  /**
   * Get reports summary for a user (for profile moderation)
   */
  async getUserReportsSummary(reportedId: string): Promise<{
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    actionsTaken: number;
    mostCommonTypes: Array<{ type: string; count: number }>;
  }> {
    const reports = await this.reportRepository.findByReportedId(reportedId);

    const summary = {
      totalReports: reports.length,
      pendingReports: reports.filter(r => r.status === REPORT_STATUS.PENDING).length,
      resolvedReports: reports.filter(r =>
        r.status === REPORT_STATUS.RESOLVED || r.status === REPORT_STATUS.ACTION_TAKEN || r.status === REPORT_STATUS.DISMISSED
      ).length,
      actionsTaken: reports.filter(r => r.actionTaken && r.actionTaken !== ACTION_TAKEN.NONE).length,
      mostCommonTypes: this.getMostCommonTypes(reports),
    };

    return summary;
  }

  /**
   * Helper to get most common report types
   */
  private getMostCommonTypes(reports: Report[]): Array<{ type: string; count: number }> {
    const typeCounts: Record<string, number> = {};

    reports.forEach(report => {
      typeCounts[report.reportType] = (typeCounts[report.reportType] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Bulk resolve reports (for admin)
   */
  async bulkResolveReports(
    reportIds: string[],
    resolution: string,
    actionTaken: Report['actionTaken'],
    moderatorId: string
  ): Promise<number> {
    let resolved = 0;

    for (const reportId of reportIds) {
      try {
        await this.resolveReport(reportId, resolution, actionTaken, moderatorId);
        resolved++;
      } catch (error) {
        // Continue with other reports
        logger.error(`Failed to resolve report ${reportId}:`, error);
      }
    }

    return resolved;
  }
}

export default new ReportService();
