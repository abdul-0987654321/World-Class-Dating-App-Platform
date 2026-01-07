import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ReportReason {
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  FAKE_PROFILE = 'fake_profile',
  SCAM = 'scam',
  UNDERAGE = 'underage',
  THREATENING_BEHAVIOR = 'threatening_behavior',
  OTHER = 'other',
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  escalatedAt?: Date;
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportDto {
  reporterId: string;
  reportedId: string;
  reason: ReportReason;
  details: string;
}

export interface ResolveReportDto {
  resolution: string;
}

@Injectable()
export class ReportService {
  // In-memory storage for demo purposes
  // In production, this would use a database
  private reports: Map<string, Report> = new Map();

  /**
   * Create a new report
   */
  async createReport(
    reporterId: string,
    reportedId: string,
    reason: ReportReason,
    details: string
  ): Promise<Report> {
    if (!reporterId || !reportedId) {
      throw new BadRequestException('Reporter ID and Reported ID are required');
    }

    if (reporterId === reportedId) {
      throw new BadRequestException('Cannot report yourself');
    }

    if (!Object.values(ReportReason).includes(reason)) {
      throw new BadRequestException('Invalid report reason');
    }

    const now = new Date();
    const report: Report = {
      id: uuidv4(),
      reporterId,
      reportedId,
      reason,
      details: details || '',
      status: ReportStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    this.reports.set(report.id, report);

    return report;
  }

  /**
   * Get report status by report ID
   */
  async getReportStatus(reportId: string): Promise<{ id: string; status: ReportStatus }> {
    const report = this.reports.get(reportId);

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return {
      id: report.id,
      status: report.status,
    };
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<Report> {
    const report = this.reports.get(reportId);

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report;
  }

  /**
   * Get all reports filed by or against a user
   */
  async getUserReports(
    userId: string,
    type: 'filed' | 'received' = 'filed'
  ): Promise<Report[]> {
    const reports: Report[] = [];

    this.reports.forEach((report) => {
      if (type === 'filed' && report.reporterId === userId) {
        reports.push(report);
      } else if (type === 'received' && report.reportedId === userId) {
        reports.push(report);
      }
    });

    // Sort by creation date, newest first
    return reports.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Escalate a report for priority review
   */
  async escalateReport(reportId: string): Promise<Report> {
    const report = this.reports.get(reportId);

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
      throw new BadRequestException('Cannot escalate a closed report');
    }

    if (report.status === ReportStatus.ESCALATED) {
      throw new BadRequestException('Report is already escalated');
    }

    const now = new Date();
    report.status = ReportStatus.ESCALATED;
    report.escalatedAt = now;
    report.updatedAt = now;

    this.reports.set(reportId, report);

    return report;
  }

  /**
   * Resolve a report with a resolution message
   */
  async resolveReport(reportId: string, resolution: string): Promise<Report> {
    const report = this.reports.get(reportId);

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
      throw new BadRequestException('Report is already closed');
    }

    if (!resolution || resolution.trim().length === 0) {
      throw new BadRequestException('Resolution message is required');
    }

    const now = new Date();
    report.status = ReportStatus.RESOLVED;
    report.resolution = resolution.trim();
    report.resolvedAt = now;
    report.updatedAt = now;

    this.reports.set(reportId, report);

    return report;
  }

  /**
   * Dismiss a report (mark as invalid or unfounded)
   */
  async dismissReport(reportId: string, reason: string): Promise<Report> {
    const report = this.reports.get(reportId);

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
      throw new BadRequestException('Report is already closed');
    }

    const now = new Date();
    report.status = ReportStatus.DISMISSED;
    report.resolution = reason || 'Report dismissed';
    report.resolvedAt = now;
    report.updatedAt = now;

    this.reports.set(reportId, report);

    return report;
  }

  /**
   * Get all pending reports (for moderation dashboard)
   */
  async getPendingReports(): Promise<Report[]> {
    const reports: Report[] = [];

    this.reports.forEach((report) => {
      if (
        report.status === ReportStatus.PENDING ||
        report.status === ReportStatus.UNDER_REVIEW ||
        report.status === ReportStatus.ESCALATED
      ) {
        reports.push(report);
      }
    });

    // Sort: escalated first, then by creation date
    return reports.sort((a, b) => {
      if (a.status === ReportStatus.ESCALATED && b.status !== ReportStatus.ESCALATED) {
        return -1;
      }
      if (b.status === ReportStatus.ESCALATED && a.status !== ReportStatus.ESCALATED) {
        return 1;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Mark a report as under review
   */
  async markUnderReview(reportId: string): Promise<Report> {
    const report = this.reports.get(reportId);

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Only pending reports can be marked as under review');
    }

    const now = new Date();
    report.status = ReportStatus.UNDER_REVIEW;
    report.updatedAt = now;

    this.reports.set(reportId, report);

    return report;
  }
}
