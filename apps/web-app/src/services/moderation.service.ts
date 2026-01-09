/**
 * Moderation Service
 * Handles content moderation and violation tracking
 */

// Types for Admin moderation queue
export interface ModerationQueueItem {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  contentType: 'photo' | 'bio' | 'message' | 'prompt';
  content: string;
  contentUrl?: string;
  contentText?: string;
  reason: string;
  reportedAt: string;
  flaggedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  riskScore: number;
  violations: string[];
}

export interface ModerationStatus {
  userId: string;
  accountStatus: 'good_standing' | 'warned' | 'suspended' | 'banned';
  warningCount: number;
  violationCount: number;
  lastViolationAt?: string;
  suspensionEndsAt?: string;
}

export interface ModerationStatistics {
  pendingItems: number;
  reviewedToday: number;
  approvedToday: number;
  rejectedToday: number;
  avgReviewTimeMs: number;
  queueByPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface Violation {
  id: string;
  userId: string;
  type: 'content' | 'behavior' | 'safety' | 'spam' | 'harassment' | 'inappropriate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string[];
  status: 'pending' | 'reviewed' | 'resolved' | 'appealed' | 'dismissed';
  action?: 'warning' | 'temporary_ban' | 'permanent_ban' | 'content_removal' | 'none';
  actionTakenAt?: string;
  appealDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViolationHistoryResponse {
  violations: Violation[];
  totalCount: number;
  nextCursor?: string;
}

export interface AppealRequest {
  violationId: string;
  reason: string;
  additionalInfo?: string;
}

export interface AppealResponse {
  success: boolean;
  message: string;
  appealId?: string;
}

class ModerationService {
  private isMock = !import.meta.env.VITE_API_URL;

  async getViolationHistory(cursor?: string): Promise<ViolationHistoryResponse> {
    if (this.isMock) {
      return this.getMockViolationHistory();
    }

    const url = cursor
      ? `/api/moderation/violations?cursor=${cursor}`
      : '/api/moderation/violations';

    const response = await fetch(url, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch violation history');
    }

    return response.json();
  }

  async getViolationDetails(violationId: string): Promise<Violation> {
    if (this.isMock) {
      const history = this.getMockViolationHistory();
      const violation = history.violations.find(v => v.id === violationId);
      if (!violation) {
        throw new Error('Violation not found');
      }
      return violation;
    }

    const response = await fetch(`/api/moderation/violations/${violationId}`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch violation details');
    }

    return response.json();
  }

  async submitAppeal(request: AppealRequest): Promise<AppealResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'Your appeal has been submitted and will be reviewed within 48 hours.',
        appealId: `appeal-${Date.now()}`,
      };
    }

    const response = await fetch('/api/moderation/appeals', {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to submit appeal');
    }

    return response.json();
  }

  async getAppealStatus(appealId: string): Promise<{
    status: 'pending' | 'under_review' | 'approved' | 'denied';
    reviewNote?: string;
    reviewedAt?: string;
  }> {
    if (this.isMock) {
      return {
        status: 'pending',
      };
    }

    const response = await fetch(`/api/moderation/appeals/${appealId}`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appeal status');
    }

    return response.json();
  }

  // Admin methods
  async getModerationQueue(filter?: { status?: string; priority?: string }): Promise<ModerationQueueItem[]> {
    if (this.isMock) {
      return this.getMockModerationQueue();
    }

    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.priority) params.append('priority', filter.priority);
    const queryString = params.toString();
    const url = queryString ? `/api/admin/moderation/queue?${queryString}` : '/api/admin/moderation/queue';

    const response = await fetch(url, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch moderation queue');
    }

    return response.json();
  }

  async reviewContent(params: {
    moderationLogId: string;
    action: 'approve' | 'reject';
    notes?: string;
    moderatorId: string;
  }): Promise<void> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    }

    const response = await fetch(`/api/admin/moderation/review/${params.moderationLogId}`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: params.action,
        notes: params.notes,
        moderatorId: params.moderatorId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to review content');
    }
  }

  async getStatistics(startDate?: string, endDate?: string): Promise<ModerationStatistics> {
    if (this.isMock) {
      return this.getMockStatistics();
    }

    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    const url = queryString ? `/api/admin/moderation/statistics?${queryString}` : '/api/admin/moderation/statistics';

    const response = await fetch(url, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    return response.json();
  }

  async getUserStatus(userId: string): Promise<ModerationStatus> {
    if (this.isMock) {
      return {
        userId,
        accountStatus: 'good_standing',
        warningCount: 0,
        violationCount: 0,
      };
    }

    const response = await fetch(`/api/moderation/users/${userId}/status`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user status');
    }

    return response.json();
  }

  private getMockModerationQueue(): ModerationQueueItem[] {
    return [
      {
        id: 'mq1',
        userId: 'user1',
        userName: 'John Doe',
        userPhoto: 'https://example.com/avatar1.jpg',
        contentType: 'photo',
        content: 'https://example.com/photo1.jpg',
        contentUrl: 'https://example.com/photo1.jpg',
        contentText: undefined,
        reason: 'Automatic flag: potential policy violation',
        reportedAt: new Date().toISOString(),
        flaggedAt: new Date().toISOString(),
        status: 'pending',
        priority: 'medium',
        riskScore: 0.75,
        violations: ['inappropriate_content', 'nudity'],
      },
    ];
  }

  private getMockStatistics(): ModerationStatistics {
    return {
      pendingItems: 12,
      reviewedToday: 45,
      approvedToday: 38,
      rejectedToday: 7,
      avgReviewTimeMs: 15000,
      queueByPriority: {
        low: 5,
        medium: 4,
        high: 2,
        critical: 1,
      },
    };
  }

  private getMockViolationHistory(): ViolationHistoryResponse {
    return {
      violations: [
        {
          id: 'v1',
          userId: 'current-user',
          type: 'content',
          severity: 'low',
          description: 'Profile photo did not meet community guidelines',
          status: 'resolved',
          action: 'warning',
          actionTakenAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      totalCount: 1,
    };
  }
}

export const moderationService = new ModerationService();
export default moderationService;
