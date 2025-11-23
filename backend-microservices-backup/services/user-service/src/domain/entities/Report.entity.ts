export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reportType:
    | 'inappropriate_photos'
    | 'inappropriate_messages'
    | 'fake_profile'
    | 'spam'
    | 'harassment'
    | 'underage'
    | 'scam'
    | 'violence'
    | 'hate_speech'
    | 'other';
  description?: string;
  evidenceUrls?: string[]; // Screenshots, message IDs, etc.
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed' | 'action_taken';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution?: string;
  actionTaken?:
    | 'none'
    | 'warning_sent'
    | 'content_removed'
    | 'account_suspended'
    | 'account_banned';
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportCreateInput {
  reporterId: string;
  reportedId: string;
  reportType: Report['reportType'];
  description?: string;
  evidenceUrls?: string[];
  severity?: Report['severity'];
}

export interface ReportUpdateInput {
  status?: Report['status'];
  resolution?: string;
  actionTaken?: Report['actionTaken'];
  resolvedBy?: string;
  resolvedAt?: Date;
}

export const REPORT_TYPES = {
  INAPPROPRIATE_PHOTOS: 'inappropriate_photos',
  INAPPROPRIATE_MESSAGES: 'inappropriate_messages',
  FAKE_PROFILE: 'fake_profile',
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  UNDERAGE: 'underage',
  SCAM: 'scam',
  VIOLENCE: 'violence',
  HATE_SPEECH: 'hate_speech',
  OTHER: 'other',
} as const;

export const REPORT_STATUS = {
  PENDING: 'pending',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
  ACTION_TAKEN: 'action_taken',
} as const;

export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const ACTION_TAKEN = {
  NONE: 'none',
  WARNING_SENT: 'warning_sent',
  CONTENT_REMOVED: 'content_removed',
  ACCOUNT_SUSPENDED: 'account_suspended',
  ACCOUNT_BANNED: 'account_banned',
} as const;

// Validation helpers
export function validateReport(input: ReportCreateInput): void {
  if (input.reporterId === input.reportedId) {
    throw new Error('Cannot report yourself');
  }

  if (!input.reporterId || !input.reportedId) {
    throw new Error('Both reporter and reported user IDs are required');
  }

  if (!input.reportType) {
    throw new Error('Report type is required');
  }
}

// Check if report is actionable
export function isActionable(report: Report): boolean {
  return report.status === 'pending' || report.status === 'investigating';
}

// Check if report is resolved
export function isResolved(report: Report): boolean {
  return report.status === 'resolved' || report.status === 'dismissed' || report.status === 'action_taken';
}

// Get severity-based priority score (for sorting)
export function getPriorityScore(report: Report): number {
  const severityScores = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
  };

  const ageInHours = (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60);
  const ageScore = Math.min(ageInHours * 2, 50); // Max 50 points for age

  return severityScores[report.severity] + ageScore;
}

// Get report statistics
export interface ReportStats {
  total: number;
  pending: number;
  investigating: number;
  resolved: number;
  bySeverity: Record<Report['severity'], number>;
  byType: Record<Report['reportType'], number>;
  averageResolutionTimeHours: number;
}

export function calculateReportStats(reports: Report[]): ReportStats {
  const stats: ReportStats = {
    total: reports.length,
    pending: 0,
    investigating: 0,
    resolved: 0,
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    byType: {
      inappropriate_photos: 0,
      inappropriate_messages: 0,
      fake_profile: 0,
      spam: 0,
      harassment: 0,
      underage: 0,
      scam: 0,
      violence: 0,
      hate_speech: 0,
      other: 0,
    },
    averageResolutionTimeHours: 0,
  };

  let totalResolutionTime = 0;
  let resolvedCount = 0;

  reports.forEach(report => {
    // Status counts
    if (report.status === 'pending') stats.pending++;
    if (report.status === 'investigating') stats.investigating++;
    if (isResolved(report)) {
      stats.resolved++;
      if (report.resolvedAt) {
        const resolutionTime =
          new Date(report.resolvedAt).getTime() - new Date(report.createdAt).getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    // Severity counts
    stats.bySeverity[report.severity]++;

    // Type counts
    stats.byType[report.reportType]++;
  });

  if (resolvedCount > 0) {
    stats.averageResolutionTimeHours = totalResolutionTime / resolvedCount / (1000 * 60 * 60);
  }

  return stats;
}
