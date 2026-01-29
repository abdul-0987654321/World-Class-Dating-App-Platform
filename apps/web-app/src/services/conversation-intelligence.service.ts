/**
 * Conversation Intelligence Service
 * Client-side service for connection scoring, ghost prevention, and intent signaling
 */

import apiClient, { ApiError } from './api.client';

// ============================================================================
// Types
// ============================================================================

export interface ConnectionScore {
  conversationId: string;
  overallScore: number;
  trend: 'rising' | 'stable' | 'falling';
  dimensions: {
    depth: number;
    reciprocity: number;
    engagement: number;
    chemistry: number;
  };
  highlights: ConnectionHighlight[];
  lastAnalyzedAt: string;
}

export interface ConnectionHighlight {
  type: 'shared_interest' | 'humor_match' | 'deep_topic' | 'future_planning' | 'vulnerability';
  description: string;
  timestamp: string;
}

export interface ConversationAnalysis {
  connectionScore: ConnectionScore;
  topicsDiscussed: TopicAnalysis[];
  communicationStyle: {
    responseTime: 'fast' | 'moderate' | 'slow';
    messageLength: 'brief' | 'moderate' | 'detailed';
    questionAsking: 'frequent' | 'occasional' | 'rare';
    emojiUsage: 'heavy' | 'moderate' | 'minimal';
  };
  compatibility: {
    score: number;
    strengths: string[];
    opportunities: string[];
  };
}

export interface TopicAnalysis {
  topic: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  engagement: 'high' | 'medium' | 'low';
  count: number;
}

export interface ConversationSuggestion {
  id: string;
  type: 'topic' | 'question' | 'activity' | 'timing';
  title: string;
  description: string;
  reason: string;
  dismissed: boolean;
}

export interface GhostRiskAssessment {
  conversationId: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  factors: GhostRiskFactor[];
  interventions: GhostIntervention[];
  lastAssessedAt: string;
}

export interface GhostRiskFactor {
  factor: string;
  impact: 'positive' | 'negative';
  weight: number;
}

export interface GhostIntervention {
  type: 'nudge' | 'suggestion' | 'warning';
  message: string;
  actionLabel?: string;
  actionType?: string;
}

export interface GracefulExitRequest {
  reason:
    | 'not_feeling_connection'
    | 'found_someone'
    | 'taking_break'
    | 'different_intentions'
    | 'other';
  customMessage?: string;
  provideFeedback: boolean;
  feedbackCategories?: string[];
}

export interface GracefulExitResponse {
  success: boolean;
  message: string;
  suggestedMessage: string;
}

export interface ExitTemplate {
  reason: string;
  template: string;
  tone: 'kind' | 'direct' | 'encouraging';
}

export interface UserIntent {
  id: string;
  userId: string;
  intent: 'exploring' | 'getting_to_know' | 'open_to_meeting' | 'ready_to_meet';
  availableTimeframe?: string;
  preferredDateTypes?: string[];
  notes?: string;
  updatedAt: string;
}

export interface IntentMatch {
  compatible: boolean;
  compatibility: 'perfect' | 'good' | 'partial' | 'mismatch';
  yourIntent: UserIntent;
  theirIntent: UserIntent | null;
  suggestions: string[];
}

export interface IntentOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

export interface AggregatedFeedback {
  totalExits: number;
  categoryCounts: Record<string, number>;
  averageConversationLength: number;
  commonThemes: string[];
  improvementSuggestions: string[];
}

// ============================================================================
// Service
// ============================================================================

class ConversationIntelligenceService {
  private readonly isMock = import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true';

  // ============================================================================
  // Connection Score
  // ============================================================================

  /**
   * Get connection score for a conversation
   */
  async getConnectionScore(conversationId: string): Promise<ConnectionScore> {
    if (this.isMock) {
      return this.mockConnectionScore(conversationId);
    }

    const response = await apiClient.get<{ success: boolean; data: ConnectionScore }>(
      `/api/v1/conversation/${conversationId}/score`
    );
    return response.data;
  }

  /**
   * Get full conversation analysis
   */
  async getConversationAnalysis(conversationId: string): Promise<ConversationAnalysis> {
    if (this.isMock) {
      return this.mockConversationAnalysis(conversationId);
    }

    const response = await apiClient.get<{ success: boolean; data: ConversationAnalysis }>(
      `/api/v1/conversation/${conversationId}/analysis`
    );
    return response.data;
  }

  /**
   * Get suggestions for a conversation
   */
  async getSuggestions(conversationId: string): Promise<ConversationSuggestion[]> {
    if (this.isMock) {
      return this.mockSuggestions();
    }

    const response = await apiClient.get<{ success: boolean; data: ConversationSuggestion[] }>(
      `/api/v1/conversation/${conversationId}/suggestions`
    );
    return response.data;
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    if (this.isMock) {
      return;
    }

    await apiClient.post(`/api/v1/conversation/suggestions/${suggestionId}/dismiss`);
  }

  // ============================================================================
  // Ghost Prevention
  // ============================================================================

  /**
   * Assess ghost risk for a conversation
   */
  async assessGhostRisk(conversationId: string): Promise<GhostRiskAssessment> {
    if (this.isMock) {
      return this.mockGhostRisk(conversationId);
    }

    const response = await apiClient.get<{ success: boolean; data: GhostRiskAssessment }>(
      `/api/v1/conversation/${conversationId}/ghost-risk`
    );
    return response.data;
  }

  /**
   * Initiate a graceful exit
   */
  async initiateGracefulExit(
    conversationId: string,
    request: GracefulExitRequest
  ): Promise<GracefulExitResponse> {
    if (this.isMock) {
      return this.mockGracefulExit(request);
    }

    const response = await apiClient.post<{ success: boolean; data: GracefulExitResponse }>(
      `/api/v1/conversation/${conversationId}/graceful-exit`,
      request
    );
    return response.data;
  }

  /**
   * Get graceful exit templates
   */
  async getExitTemplates(): Promise<ExitTemplate[]> {
    if (this.isMock) {
      return this.mockExitTemplates();
    }

    const response = await apiClient.get<{ success: boolean; data: ExitTemplate[] }>(
      '/api/v1/conversation/exit-templates'
    );
    return response.data;
  }

  /**
   * Get aggregated feedback from graceful exits
   */
  async getAggregatedFeedback(): Promise<AggregatedFeedback> {
    if (this.isMock) {
      return this.mockAggregatedFeedback();
    }

    const response = await apiClient.get<{ success: boolean; data: AggregatedFeedback }>(
      '/api/v1/conversation/feedback'
    );
    return response.data;
  }

  // ============================================================================
  // Intent Signaling
  // ============================================================================

  /**
   * Get user's current intent
   */
  async getIntent(conversationId?: string): Promise<UserIntent | null> {
    if (this.isMock) {
      return this.mockUserIntent();
    }

    try {
      const url = conversationId
        ? `/api/v1/conversation/intent?conversationId=${conversationId}`
        : '/api/v1/conversation/intent';

      const response = await apiClient.get<{ success: boolean; data: UserIntent }>(url);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update user's intent
   */
  async updateIntent(data: {
    conversationId?: string;
    intent: UserIntent['intent'];
    availableTimeframe?: string;
    preferredDateTypes?: string[];
    notes?: string;
  }): Promise<UserIntent> {
    if (this.isMock) {
      return {
        id: `intent-${Date.now()}`,
        userId: 'mock-user',
        ...data,
        updatedAt: new Date().toISOString(),
      };
    }

    const response = await apiClient.post<{ success: boolean; data: UserIntent }>(
      '/api/v1/conversation/intent',
      data
    );
    return response.data;
  }

  /**
   * Check intent match with another user
   */
  async checkIntentMatch(conversationId: string, otherUserId: string): Promise<IntentMatch> {
    if (this.isMock) {
      return this.mockIntentMatch();
    }

    const response = await apiClient.get<{ success: boolean; data: IntentMatch }>(
      `/api/v1/conversation/${conversationId}/intent-match?otherUserId=${otherUserId}`
    );
    return response.data;
  }

  /**
   * Get available intent options
   */
  async getIntentOptions(): Promise<IntentOption[]> {
    if (this.isMock) {
      return this.mockIntentOptions();
    }

    const response = await apiClient.get<{ success: boolean; data: IntentOption[] }>(
      '/api/v1/conversation/intent-options'
    );
    return response.data;
  }

  // ============================================================================
  // Mock Data
  // ============================================================================

  private mockConnectionScore(conversationId: string): ConnectionScore {
    return {
      conversationId,
      overallScore: 72,
      trend: 'rising',
      dimensions: {
        depth: 68,
        reciprocity: 85,
        engagement: 75,
        chemistry: 62,
      },
      highlights: [
        {
          type: 'shared_interest',
          description: 'You both enjoy hiking and outdoor activities',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          type: 'humor_match',
          description: 'Great back-and-forth banter detected',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          type: 'future_planning',
          description: 'Discussion about potential meetup',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        },
      ],
      lastAnalyzedAt: new Date().toISOString(),
    };
  }

  private mockConversationAnalysis(conversationId: string): ConversationAnalysis {
    return {
      connectionScore: this.mockConnectionScore(conversationId),
      topicsDiscussed: [
        { topic: 'Travel', sentiment: 'positive', engagement: 'high', count: 8 },
        { topic: 'Food & Dining', sentiment: 'positive', engagement: 'high', count: 6 },
        { topic: 'Work & Career', sentiment: 'neutral', engagement: 'medium', count: 4 },
        { topic: 'Hobbies', sentiment: 'positive', engagement: 'high', count: 5 },
      ],
      communicationStyle: {
        responseTime: 'moderate',
        messageLength: 'moderate',
        questionAsking: 'frequent',
        emojiUsage: 'moderate',
      },
      compatibility: {
        score: 78,
        strengths: [
          'Strong mutual interest in travel',
          'Similar sense of humor',
          'Both value meaningful conversations',
        ],
        opportunities: [
          "Explore more about each other's long-term goals",
          'Share more personal stories to build deeper connection',
        ],
      },
    };
  }

  private mockSuggestions(): ConversationSuggestion[] {
    return [
      {
        id: 'sug-1',
        type: 'topic',
        title: 'Ask about their travel bucket list',
        description: 'You both love travel. Ask about their dream destinations.',
        reason: 'Builds on shared interest detected in conversation',
        dismissed: false,
      },
      {
        id: 'sug-2',
        type: 'activity',
        title: 'Suggest a video call',
        description:
          'The conversation is going well. A video call could help build more connection.',
        reason: 'High engagement score suggests readiness for next step',
        dismissed: false,
      },
      {
        id: 'sug-3',
        type: 'timing',
        title: 'Best time to message',
        description: 'They typically respond fastest in the evening (7-9 PM)',
        reason: 'Based on their response patterns',
        dismissed: false,
      },
    ];
  }

  private mockGhostRisk(conversationId: string): GhostRiskAssessment {
    return {
      conversationId,
      riskLevel: 'low',
      riskScore: 25,
      factors: [
        { factor: 'Consistent response times', impact: 'positive', weight: 0.3 },
        { factor: 'Questions being asked', impact: 'positive', weight: 0.25 },
        { factor: 'Mutual engagement', impact: 'positive', weight: 0.25 },
        { factor: 'Recent message gap', impact: 'negative', weight: 0.2 },
      ],
      interventions: [
        {
          type: 'suggestion',
          message: 'Keep the momentum going! Consider sharing something personal.',
          actionLabel: 'Get conversation tip',
          actionType: 'getSuggestion',
        },
      ],
      lastAssessedAt: new Date().toISOString(),
    };
  }

  private mockGracefulExit(request: GracefulExitRequest): GracefulExitResponse {
    const templates: Record<string, string> = {
      not_feeling_connection:
        "Hey, I've really enjoyed getting to know you. I want to be honest though - I'm not feeling the romantic connection I'm looking for. I wish you the best in finding what you're looking for!",
      found_someone:
        "I wanted to let you know that I've started seeing someone and want to focus on that. I really appreciated our conversations. Best of luck to you!",
      taking_break:
        "I've decided to take a break from dating for a while to focus on myself. It's been nice talking with you, and I wish you all the best!",
      different_intentions:
        "I think we might be looking for different things right now, and I want to be upfront about that. Thank you for the conversations, and I hope you find what you're looking for!",
      other:
        "Thank you for the conversations we've had. I've decided to move on, but I wish you nothing but the best in your journey!",
    };

    return {
      success: true,
      message: 'Graceful exit prepared',
      suggestedMessage: request.customMessage || templates[request.reason] || templates['other'],
    };
  }

  private mockExitTemplates(): ExitTemplate[] {
    return [
      {
        reason: 'not_feeling_connection',
        template:
          "Hey, I've really enjoyed getting to know you. I want to be honest though - I'm not feeling the romantic connection I'm looking for. I wish you the best!",
        tone: 'kind',
      },
      {
        reason: 'found_someone',
        template:
          "I wanted to let you know that I've started seeing someone. It's been nice talking with you. Best of luck!",
        tone: 'direct',
      },
      {
        reason: 'taking_break',
        template:
          "I've decided to take a break from dating. It's been nice talking with you, and I wish you all the best!",
        tone: 'kind',
      },
      {
        reason: 'different_intentions',
        template:
          "I think we might be looking for different things. Thank you for the conversations, and I hope you find what you're looking for!",
        tone: 'direct',
      },
    ];
  }

  private mockAggregatedFeedback(): AggregatedFeedback {
    return {
      totalExits: 5,
      categoryCounts: {
        'Communication Style': 2,
        'Conversation Depth': 1,
        'Response Time': 1,
        'Profile Accuracy': 1,
      },
      averageConversationLength: 8.5,
      commonThemes: ['Responses could be more engaging', 'More questions would help'],
      improvementSuggestions: [
        'Try asking more follow-up questions to show interest',
        'Share personal stories to create deeper connections',
        'Consider responding within a reasonable timeframe',
      ],
    };
  }

  private mockUserIntent(): UserIntent {
    return {
      id: 'intent-1',
      userId: 'mock-user',
      intent: 'getting_to_know',
      availableTimeframe: 'This weekend',
      preferredDateTypes: ['Coffee', 'Walk'],
      notes: 'Looking for something casual to start',
      updatedAt: new Date().toISOString(),
    };
  }

  private mockIntentMatch(): IntentMatch {
    return {
      compatible: true,
      compatibility: 'good',
      yourIntent: this.mockUserIntent(),
      theirIntent: {
        id: 'intent-2',
        userId: 'other-user',
        intent: 'open_to_meeting',
        availableTimeframe: 'Next week',
        preferredDateTypes: ['Coffee', 'Dinner'],
        updatedAt: new Date().toISOString(),
      },
      suggestions: [
        "You're both open to meeting! Consider suggesting a specific date.",
        'Coffee is a shared preference - a great first date option.',
      ],
    };
  }

  private mockIntentOptions(): IntentOption[] {
    return [
      {
        value: 'exploring',
        label: 'Just Exploring',
        description: "Getting to know the platform and seeing who's out there",
        icon: 'compass',
      },
      {
        value: 'getting_to_know',
        label: 'Getting to Know',
        description: 'Enjoying conversations and seeing where things go',
        icon: 'chat',
      },
      {
        value: 'open_to_meeting',
        label: 'Open to Meeting',
        description: "Ready to meet in person if there's a connection",
        icon: 'calendar',
      },
      {
        value: 'ready_to_meet',
        label: 'Ready to Meet',
        description: 'Actively looking to meet up soon',
        icon: 'heart',
      },
    ];
  }
}

export const conversationIntelligenceService = new ConversationIntelligenceService();
export default conversationIntelligenceService;
