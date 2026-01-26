/**
 * Wellness Service
 * Client-side service for dating wellness, mental health tracking, and readiness assessment
 */

import apiClient, { ApiError } from './api.client';

// ============================================================================
// Types
// ============================================================================

export interface WellnessMetrics {
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
  dimensions: {
    emotionalHealth: number;
    engagementQuality: number;
    boundaryRespect: number;
    positiveInteractions: number;
    rejectionResilience: number;
  };
  streaks: {
    positiveDays: number;
    activeEngagement: number;
  };
  lastUpdated: string;
}

export interface WellnessDashboardData {
  metrics: WellnessMetrics;
  recentMoodCheckins: MoodCheckin[];
  activeSabbatical: DatingSabbatical | null;
  alerts: HealthAlert[];
  recommendations: WellnessRecommendation[];
}

export interface MoodCheckin {
  id: string;
  mood: 'great' | 'good' | 'okay' | 'low' | 'struggling';
  energyLevel: number;
  notes?: string;
  triggers?: string[];
  timestamp: string;
}

export interface DatingSabbatical {
  id: string;
  startDate: string;
  plannedEndDate: string;
  reason: string;
  notificationsDisabled: boolean;
  status: 'active' | 'completed' | 'cancelled';
}

export interface HealthAlert {
  id: string;
  type: 'burnout_risk' | 'low_engagement' | 'negative_pattern' | 'boundary_concern';
  severity: 'low' | 'medium' | 'high';
  message: string;
  actionSuggestion: string;
  createdAt: string;
  dismissed: boolean;
}

export interface WellnessRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ReadinessAssessment {
  id: string;
  overallScore: number;
  readinessLevel: 'ready' | 'almost_ready' | 'needs_work' | 'not_ready';
  dimensions: {
    emotionalAvailability: { score: number; feedback: string };
    pastRelationshipClosure: { score: number; feedback: string };
    selfAwareness: { score: number; feedback: string };
    communicationSkills: { score: number; feedback: string };
    lifestyleStability: { score: number; feedback: string };
    intentionClarity: { score: number; feedback: string };
  };
  growthAreas: string[];
  strengths: string[];
  recommendedActions: string[];
  completedAt: string;
}

export interface ReadinessQuestion {
  id: string;
  dimension: string;
  question: string;
  type: 'scale' | 'choice' | 'multi_choice';
  options?: { value: string; label: string }[];
}

export interface RejectionEvent {
  type: 'unmatched' | 'no_response' | 'conversation_ended' | 'date_declined';
  context?: string;
}

export interface RejectionRecovery {
  impactScore: number;
  recoveryTips: string[];
  affirmations: string[];
  suggestedBreakMinutes: number;
}

// ============================================================================
// Service
// ============================================================================

class WellnessService {
  private readonly isMock = !import.meta.env.VITE_API_URL;

  /**
   * Get user's wellness dashboard data
   */
  async getDashboard(): Promise<WellnessDashboardData> {
    if (this.isMock) {
      return this.mockDashboard();
    }

    const response = await apiClient.get<{ success: boolean; data: WellnessDashboardData }>(
      '/api/v1/wellness/dashboard'
    );
    return response.data;
  }

  /**
   * Get current wellness metrics
   */
  async getMetrics(): Promise<WellnessMetrics> {
    if (this.isMock) {
      return this.mockMetrics();
    }

    const response = await apiClient.get<{ success: boolean; data: WellnessMetrics }>(
      '/api/v1/wellness/metrics'
    );
    return response.data;
  }

  /**
   * Record a mood check-in
   */
  async recordMoodCheckin(checkin: Omit<MoodCheckin, 'id' | 'timestamp'>): Promise<MoodCheckin> {
    if (this.isMock) {
      return {
        id: `mood-${Date.now()}`,
        ...checkin,
        timestamp: new Date().toISOString(),
      };
    }

    const response = await apiClient.post<{ success: boolean; data: MoodCheckin }>(
      '/api/v1/wellness/mood-checkin',
      checkin
    );
    return response.data;
  }

  /**
   * Start a dating sabbatical
   */
  async startSabbatical(data: {
    reason: string;
    plannedDays: number;
    disableNotifications: boolean;
  }): Promise<DatingSabbatical> {
    if (this.isMock) {
      return {
        id: `sabbatical-${Date.now()}`,
        startDate: new Date().toISOString(),
        plannedEndDate: new Date(Date.now() + data.plannedDays * 24 * 60 * 60 * 1000).toISOString(),
        reason: data.reason,
        notificationsDisabled: data.disableNotifications,
        status: 'active',
      };
    }

    const response = await apiClient.post<{ success: boolean; data: DatingSabbatical }>(
      '/api/v1/wellness/sabbatical',
      data
    );
    return response.data;
  }

  /**
   * End current sabbatical
   */
  async endSabbatical(sabbaticalId: string): Promise<void> {
    if (this.isMock) {
      return;
    }

    await apiClient.post(`/api/v1/wellness/sabbatical/${sabbaticalId}/end`);
  }

  /**
   * Dismiss a health alert
   */
  async dismissAlert(alertId: string): Promise<void> {
    if (this.isMock) {
      return;
    }

    await apiClient.post(`/api/v1/wellness/alerts/${alertId}/dismiss`);
  }

  /**
   * Get readiness assessment questions
   */
  async getReadinessQuestions(): Promise<ReadinessQuestion[]> {
    if (this.isMock) {
      return this.mockReadinessQuestions();
    }

    const response = await apiClient.get<{ success: boolean; data: ReadinessQuestion[] }>(
      '/api/v1/wellness/readiness/questions'
    );
    return response.data;
  }

  /**
   * Submit readiness assessment
   */
  async submitReadinessAssessment(answers: Record<string, unknown>): Promise<ReadinessAssessment> {
    if (this.isMock) {
      return this.mockReadinessAssessment();
    }

    const response = await apiClient.post<{ success: boolean; data: ReadinessAssessment }>(
      '/api/v1/wellness/readiness/assess',
      { answers }
    );
    return response.data;
  }

  /**
   * Get latest readiness assessment
   */
  async getLatestReadinessAssessment(): Promise<ReadinessAssessment | null> {
    if (this.isMock) {
      return this.mockReadinessAssessment();
    }

    try {
      const response = await apiClient.get<{ success: boolean; data: ReadinessAssessment }>(
        '/api/v1/wellness/readiness/latest'
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Record rejection event and get recovery support
   */
  async recordRejection(event: RejectionEvent): Promise<RejectionRecovery> {
    if (this.isMock) {
      return this.mockRejectionRecovery(event);
    }

    const response = await apiClient.post<{ success: boolean; data: RejectionRecovery }>(
      '/api/v1/wellness/rejection',
      event
    );
    return response.data;
  }

  // ============================================================================
  // Mock Data
  // ============================================================================

  private mockMetrics(): WellnessMetrics {
    return {
      overallScore: 78,
      trend: 'improving',
      dimensions: {
        emotionalHealth: 82,
        engagementQuality: 75,
        boundaryRespect: 88,
        positiveInteractions: 72,
        rejectionResilience: 70,
      },
      streaks: {
        positiveDays: 5,
        activeEngagement: 12,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  private mockDashboard(): WellnessDashboardData {
    return {
      metrics: this.mockMetrics(),
      recentMoodCheckins: [
        {
          id: 'mood-1',
          mood: 'good',
          energyLevel: 7,
          notes: 'Had a great conversation today',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'mood-2',
          mood: 'okay',
          energyLevel: 5,
          timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        },
      ],
      activeSabbatical: null,
      alerts: [
        {
          id: 'alert-1',
          type: 'burnout_risk',
          severity: 'low',
          message: "You've been very active lately. Consider taking short breaks between sessions.",
          actionSuggestion: 'Try the new mindful browsing mode',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          dismissed: false,
        },
      ],
      recommendations: [
        {
          category: 'Self-Care',
          title: 'Daily Mood Check-in',
          description:
            'Track your emotional state to identify patterns and improve your dating experience.',
          priority: 'high',
        },
        {
          category: 'Growth',
          title: 'Review Your Boundaries',
          description:
            'Revisit your deal-breakers and preferences to ensure they align with your current values.',
          priority: 'medium',
        },
      ],
    };
  }

  private mockReadinessQuestions(): ReadinessQuestion[] {
    return [
      {
        id: 'q1',
        dimension: 'emotionalAvailability',
        question: 'How would you rate your current emotional availability for a new relationship?',
        type: 'scale',
      },
      {
        id: 'q2',
        dimension: 'pastRelationshipClosure',
        question: 'How do you feel about your most recent relationship?',
        type: 'choice',
        options: [
          { value: 'fully_moved_on', label: 'Fully moved on and at peace' },
          { value: 'mostly_healed', label: 'Mostly healed, occasional thoughts' },
          { value: 'still_processing', label: 'Still processing emotions' },
          { value: 'actively_grieving', label: 'Still actively grieving' },
        ],
      },
      {
        id: 'q3',
        dimension: 'selfAwareness',
        question: 'What are you looking for in a relationship right now?',
        type: 'choice',
        options: [
          { value: 'serious', label: 'A serious, long-term relationship' },
          { value: 'casual', label: 'Something casual and fun' },
          { value: 'exploring', label: 'Still figuring it out' },
          { value: 'unsure', label: 'Not sure yet' },
        ],
      },
    ];
  }

  private mockReadinessAssessment(): ReadinessAssessment {
    return {
      id: 'assessment-1',
      overallScore: 75,
      readinessLevel: 'almost_ready',
      dimensions: {
        emotionalAvailability: {
          score: 80,
          feedback: 'You show strong emotional availability and openness to connection.',
        },
        pastRelationshipClosure: {
          score: 70,
          feedback: "You've made good progress processing past relationships.",
        },
        selfAwareness: {
          score: 85,
          feedback: 'You have clear self-understanding and know what you want.',
        },
        communicationSkills: {
          score: 75,
          feedback: 'Your communication style is healthy with room for growth.',
        },
        lifestyleStability: {
          score: 72,
          feedback: 'Your life has a good foundation for adding a relationship.',
        },
        intentionClarity: {
          score: 68,
          feedback: 'Consider clarifying your specific relationship goals.',
        },
      },
      growthAreas: [
        'Setting clearer boundaries early in conversations',
        'Being more direct about your relationship intentions',
      ],
      strengths: [
        'Strong emotional intelligence',
        'Clear sense of self',
        'Healthy past relationship processing',
      ],
      recommendedActions: [
        'Complete a self-reflection exercise on your ideal relationship',
        'Practice expressing your needs clearly in conversations',
        'Set specific dating goals for the next month',
      ],
      completedAt: new Date().toISOString(),
    };
  }

  private mockRejectionRecovery(event: RejectionEvent): RejectionRecovery {
    const tips: Record<string, string[]> = {
      unmatched: [
        'Remember, not every connection is meant to be. This is a natural part of dating.',
        "Focus on the quality matches you have, not the ones that didn't work out.",
        "Take a moment to appreciate what you're looking for in a partner.",
      ],
      no_response: [
        "No response doesn't reflect your worth—everyone has their own pace and priorities.",
        'This opens space for someone who will be excited to talk with you.',
        'Consider if your opening message could be more personalized next time.',
      ],
      conversation_ended: [
        "Every conversation teaches us something about what we're looking for.",
        'The right person will want to keep talking to you.',
        'Reflect on what you learned from this interaction.',
      ],
      date_declined: [
        'It takes courage to ask someone out. Be proud of putting yourself out there.',
        'A declined date is better than a lukewarm one.',
        "This person's unavailability makes room for someone who's excited about you.",
      ],
    };

    return {
      impactScore: event.type === 'date_declined' ? 6 : event.type === 'unmatched' ? 3 : 4,
      recoveryTips: tips[event.type] || tips['no_response'],
      affirmations: [
        'You are worthy of love and connection.',
        'The right match is out there, and each experience brings you closer.',
        "Your value isn't determined by one person's response.",
      ],
      suggestedBreakMinutes: event.type === 'date_declined' ? 30 : 10,
    };
  }
}

export const wellnessService = new WellnessService();
export default wellnessService;
