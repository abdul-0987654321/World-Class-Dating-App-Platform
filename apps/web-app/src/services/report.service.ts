/**
 * Report Service
 * Handles user reports and content moderation
 */

import { authTokenService } from './auth-token.service';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed' | 'action_taken';

export type ReportCategory =
  | 'fake_profile'
  | 'harassment'
  | 'inappropriate_content'
  | 'spam'
  | 'scam'
  | 'underage'
  | 'impersonation'
  | 'hate_speech'
  | 'violence'
  | 'other';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportedUser?: {
    id: string;
    name: string;
    photoUrl?: string;
    profilePhoto?: string; // Alias for photoUrl
    firstName?: string; // Alias for name (first part)
    lastName?: string; // Alias for name (last part)
  };
  category: ReportCategory;
  reportType?: ReportCategory; // Alias for category
  description: string;
  evidence?: string[];
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  resolution?: string;
  actionTaken?: string; // Alias for resolution
  resolvedAt?: string;
}

export interface CreateReportRequest {
  reportedUserId: string;
  category: ReportCategory;
  description: string;
  evidence?: string[];
}

export interface ReportCategoryInfo {
  id: ReportCategory;
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ReportService {
  private isMock = !import.meta.env.VITE_API_URL;

  getCategories(): ReportCategoryInfo[] {
    return [
      {
        id: 'fake_profile',
        label: 'Fake Profile',
        description: 'This profile appears to be fake or using stolen photos',
        severity: 'high',
      },
      {
        id: 'harassment',
        label: 'Harassment',
        description: 'This user is harassing or bullying others',
        severity: 'high',
      },
      {
        id: 'inappropriate_content',
        label: 'Inappropriate Content',
        description: 'Profile contains inappropriate photos or text',
        severity: 'medium',
      },
      {
        id: 'spam',
        label: 'Spam',
        description: 'This user is sending spam messages',
        severity: 'low',
      },
      {
        id: 'scam',
        label: 'Scam',
        description: 'This user appears to be running a scam',
        severity: 'critical',
      },
      {
        id: 'underage',
        label: 'Underage User',
        description: 'This user appears to be under 18',
        severity: 'critical',
      },
      {
        id: 'impersonation',
        label: 'Impersonation',
        description: 'This user is pretending to be someone else',
        severity: 'high',
      },
      {
        id: 'hate_speech',
        label: 'Hate Speech',
        description: 'Profile contains discriminatory or hateful content',
        severity: 'high',
      },
      {
        id: 'violence',
        label: 'Violence/Threats',
        description: 'This user has made violent threats',
        severity: 'critical',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other violation not listed above',
        severity: 'medium',
      },
    ];
  }

  async createReport(request: CreateReportRequest): Promise<Report> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        id: `report-${Date.now()}`,
        reporterId: 'current-user',
        reportedUserId: request.reportedUserId,
        category: request.category,
        description: request.description,
        evidence: request.evidence,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to create report');
    }

    return response.json();
  }

  async getMyReports(options?: {
    limit?: number;
    offset?: number;
    status?: ReportStatus;
  }): Promise<{ reports: Report[]; totalCount: number; total: number }> {
    if (this.isMock) {
      const mockData = {
        reports: [
          {
            id: 'report-1',
            reporterId: 'current-user',
            reportedUserId: 'user-123',
            reportedUser: {
              id: 'user-123',
              name: 'John Doe',
              firstName: 'John',
              lastName: 'Doe',
              photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
              profilePhoto: 'https://randomuser.me/api/portraits/men/1.jpg',
            },
            category: 'spam',
            reportType: 'spam',
            description: 'Sending promotional messages',
            status: 'resolved',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            resolution: 'User has been warned',
            actionTaken: 'User has been warned',
            resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ] as Report[],
        totalCount: 1,
        total: 1,
      };
      return mockData;
    }

    const response = await fetch('/api/reports/my', {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }

    return response.json();
  }

  async getReportStatus(reportId: string): Promise<Report> {
    if (this.isMock) {
      return {
        id: reportId,
        reporterId: 'current-user',
        reportedUserId: 'user-123',
        category: 'spam',
        description: 'Test report',
        status: 'investigating',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const response = await fetch(`/api/reports/${reportId}`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch report status');
    }

    return response.json();
  }
}

export const reportService = new ReportService();
export default reportService;

// Type alias for backward compatibility
export type ReportType = ReportCategory;
