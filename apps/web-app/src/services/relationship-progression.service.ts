/**
 * Relationship Progression Service
 * Client-side service for relationship milestones, stages, and shared experiences
 */

import apiClient, { ApiError } from './api.client';

// ============================================================================
// Types
// ============================================================================

export type RelationshipStage =
  | 'matched'
  | 'chatting'
  | 'vibing'
  | 'planning_date'
  | 'first_date'
  | 'dating'
  | 'exclusive'
  | 'committed';

export interface StageInfo {
  stage: RelationshipStage;
  title: string;
  description: string;
  emoji: string;
}

export interface StageTransition {
  fromStage: RelationshipStage | null;
  toStage: RelationshipStage;
  timestamp: string;
  triggeredBy: 'system' | 'user' | 'mutual';
  reason?: string;
}

export interface RelationshipProgression {
  id: string;
  userId: string;
  partnerId: string;
  conversationId: string;
  currentStage: RelationshipStage;
  stageHistory: StageTransition[];
  startedAt: string;
  lastActivityAt: string;
  healthScore: number;
  mutualEngagement: number;
}

export type MilestoneType =
  | 'first_message'
  | 'first_conversation_hour'
  | 'exchanged_numbers'
  | 'first_date_planned'
  | 'first_date_completed'
  | 'first_photo_shared'
  | 'first_voice_note'
  | 'first_video_call'
  | 'met_friends'
  | 'week_anniversary'
  | 'month_anniversary'
  | 'became_exclusive'
  | 'custom';

export interface MilestoneTemplate {
  type: MilestoneType;
  title: string;
  description: string;
  celebrationSuggestion: string;
  iconEmoji: string;
  autoDetectable: boolean;
}

export interface MilestoneMemory {
  id: string;
  milestoneId: string;
  type: 'text' | 'photo' | 'voice' | 'location';
  content: string;
  addedBy: string;
  addedAt: string;
}

export interface Milestone {
  id: string;
  relationshipId: string;
  type: MilestoneType;
  title: string;
  description?: string;
  achievedAt: string;
  celebratedBy: string[];
  memories: MilestoneMemory[];
  isShared: boolean;
  customData?: Record<string, unknown>;
}

export interface CelebrationSuggestion {
  type: 'message' | 'gift' | 'activity' | 'surprise';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'elaborate';
  estimatedCost?: 'free' | '$' | '$$' | '$$$';
}

export interface CelebrationPrompt {
  milestoneId: string;
  milestone: Milestone;
  suggestions: CelebrationSuggestion[];
  expiresAt: string;
}

export type ExperienceType =
  | 'date'
  | 'activity'
  | 'travel'
  | 'event'
  | 'milestone_celebration'
  | 'gift'
  | 'surprise'
  | 'first_time';

export interface ExperienceLocation {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface SharedExperience {
  id: string;
  relationshipId: string;
  type: ExperienceType;
  title: string;
  description?: string;
  date: string;
  location?: ExperienceLocation;
  photos: string[];
  rating?: number;
  moods: { userId: string; mood: string }[];
  tags: string[];
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  type: 'milestone' | 'stage_change' | 'experience' | 'memory';
  timestamp: string;
  title: string;
  description?: string;
  iconEmoji: string;
  relatedId?: string;
}

export interface RelationshipTimeline {
  relationshipId: string;
  events: TimelineEvent[];
  totalDays: number;
  highlights: TimelineEvent[];
}

export interface CompatibilityInsight {
  relationshipId: string;
  overallScore: number;
  dimensions: {
    communicationStyle: number;
    sharedInterests: number;
    valueAlignment: number;
    emotionalConnection: number;
    futureGoals: number;
  };
  strengths: string[];
  growthAreas: string[];
  tips: string[];
  lastUpdated: string;
}

// ============================================================================
// Service
// ============================================================================

class RelationshipProgressionService {
  private readonly isMock = import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true';

  // ============================================================================
  // Stage Methods
  // ============================================================================

  async getStages(): Promise<StageInfo[]> {
    if (this.isMock) {
      return this.mockStages();
    }

    const response = await apiClient.get<{ success: boolean; data: StageInfo[] }>(
      '/api/v1/progression/stages'
    );
    return response.data;
  }

  // ============================================================================
  // Progression Methods
  // ============================================================================

  async createProgression(
    partnerId: string,
    conversationId: string
  ): Promise<RelationshipProgression> {
    if (this.isMock) {
      return this.mockProgression(conversationId);
    }

    const response = await apiClient.post<{ success: boolean; data: RelationshipProgression }>(
      '/api/v1/progression',
      { partnerId, conversationId }
    );
    return response.data;
  }

  async getProgression(progressionId: string): Promise<RelationshipProgression | null> {
    if (this.isMock) {
      return this.mockProgression(progressionId);
    }

    try {
      const response = await apiClient.get<{ success: boolean; data: RelationshipProgression }>(
        `/api/v1/progression/${progressionId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getProgressionByConversation(
    conversationId: string
  ): Promise<RelationshipProgression | null> {
    if (this.isMock) {
      return this.mockProgression(conversationId);
    }

    try {
      const response = await apiClient.get<{ success: boolean; data: RelationshipProgression }>(
        `/api/v1/progression/conversation/${conversationId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getUserProgressions(): Promise<RelationshipProgression[]> {
    if (this.isMock) {
      return [this.mockProgression('mock-1'), this.mockProgression('mock-2')];
    }

    const response = await apiClient.get<{ success: boolean; data: RelationshipProgression[] }>(
      '/api/v1/progression/mine'
    );
    return response.data;
  }

  async updateStage(
    progressionId: string,
    newStage: RelationshipStage,
    reason?: string
  ): Promise<RelationshipProgression> {
    if (this.isMock) {
      const progression = this.mockProgression(progressionId);
      progression.currentStage = newStage;
      return progression;
    }

    const response = await apiClient.put<{ success: boolean; data: RelationshipProgression }>(
      `/api/v1/progression/${progressionId}/stage`,
      { newStage, reason }
    );
    return response.data;
  }

  // ============================================================================
  // Timeline Methods
  // ============================================================================

  async getTimeline(progressionId: string): Promise<RelationshipTimeline> {
    if (this.isMock) {
      return this.mockTimeline(progressionId);
    }

    const response = await apiClient.get<{ success: boolean; data: RelationshipTimeline }>(
      `/api/v1/progression/${progressionId}/timeline`
    );
    return response.data;
  }

  async getCompatibility(progressionId: string): Promise<CompatibilityInsight> {
    if (this.isMock) {
      return this.mockCompatibility(progressionId);
    }

    const response = await apiClient.get<{ success: boolean; data: CompatibilityInsight }>(
      `/api/v1/progression/${progressionId}/compatibility`
    );
    return response.data;
  }

  // ============================================================================
  // Milestone Methods
  // ============================================================================

  async getMilestoneTemplates(): Promise<MilestoneTemplate[]> {
    if (this.isMock) {
      return this.mockMilestoneTemplates();
    }

    const response = await apiClient.get<{ success: boolean; data: MilestoneTemplate[] }>(
      '/api/v1/progression/milestones/templates'
    );
    return response.data;
  }

  async getMilestones(progressionId: string): Promise<Milestone[]> {
    if (this.isMock) {
      return this.mockMilestones();
    }

    const response = await apiClient.get<{ success: boolean; data: Milestone[] }>(
      `/api/v1/progression/${progressionId}/milestones`
    );
    return response.data;
  }

  async createMilestone(
    progressionId: string,
    type: MilestoneType,
    title?: string,
    description?: string
  ): Promise<Milestone> {
    if (this.isMock) {
      return this.mockMilestones()[0];
    }

    const response = await apiClient.post<{ success: boolean; data: Milestone }>(
      `/api/v1/progression/${progressionId}/milestones`,
      { type, title, description }
    );
    return response.data;
  }

  async celebrateMilestone(milestoneId: string): Promise<Milestone> {
    if (this.isMock) {
      const milestone = this.mockMilestones()[0];
      milestone.celebratedBy.push('current-user');
      return milestone;
    }

    const response = await apiClient.post<{ success: boolean; data: Milestone }>(
      `/api/v1/progression/milestones/${milestoneId}/celebrate`
    );
    return response.data;
  }

  async getCelebrationPrompts(progressionId: string): Promise<CelebrationPrompt[]> {
    if (this.isMock) {
      return this.mockCelebrationPrompts();
    }

    const response = await apiClient.get<{ success: boolean; data: CelebrationPrompt[] }>(
      `/api/v1/progression/${progressionId}/celebrations`
    );
    return response.data;
  }

  async addMilestoneMemory(
    milestoneId: string,
    type: MilestoneMemory['type'],
    content: string
  ): Promise<MilestoneMemory> {
    if (this.isMock) {
      return {
        id: `memory-${Date.now()}`,
        milestoneId,
        type,
        content,
        addedBy: 'current-user',
        addedAt: new Date().toISOString(),
      };
    }

    const response = await apiClient.post<{ success: boolean; data: MilestoneMemory }>(
      `/api/v1/progression/milestones/${milestoneId}/memory`,
      { type, content }
    );
    return response.data;
  }

  // ============================================================================
  // Experience Methods
  // ============================================================================

  async getExperiences(progressionId: string): Promise<SharedExperience[]> {
    if (this.isMock) {
      return this.mockExperiences();
    }

    const response = await apiClient.get<{ success: boolean; data: SharedExperience[] }>(
      `/api/v1/progression/${progressionId}/experiences`
    );
    return response.data;
  }

  async createExperience(
    progressionId: string,
    experience: {
      type: ExperienceType;
      title: string;
      description?: string;
      date: string;
      location?: ExperienceLocation;
      tags?: string[];
      isPrivate?: boolean;
    }
  ): Promise<SharedExperience> {
    if (this.isMock) {
      return {
        id: `experience-${Date.now()}`,
        relationshipId: progressionId,
        ...experience,
        photos: [],
        moods: [],
        tags: experience.tags || [],
        isPrivate: experience.isPrivate ?? false,
        createdBy: 'current-user',
        createdAt: new Date().toISOString(),
      };
    }

    const response = await apiClient.post<{ success: boolean; data: SharedExperience }>(
      `/api/v1/progression/${progressionId}/experiences`,
      experience
    );
    return response.data;
  }

  async recordExperienceMood(
    experienceId: string,
    mood: 'amazing' | 'great' | 'good' | 'okay' | 'not_great'
  ): Promise<SharedExperience> {
    if (this.isMock) {
      const experience = this.mockExperiences()[0];
      experience.moods.push({ userId: 'current-user', mood });
      return experience;
    }

    const response = await apiClient.post<{ success: boolean; data: SharedExperience }>(
      `/api/v1/progression/experiences/${experienceId}/mood`,
      { mood }
    );
    return response.data;
  }

  // ============================================================================
  // Mock Data
  // ============================================================================

  private mockStages(): StageInfo[] {
    return [
      {
        stage: 'matched',
        title: 'Just Matched',
        description: "You've connected! Time to break the ice.",
        emoji: '🎯',
      },
      {
        stage: 'chatting',
        title: 'Chatting',
        description: 'Getting to know each other through messages.',
        emoji: '💬',
      },
      {
        stage: 'vibing',
        title: 'Vibing',
        description: 'Great chemistry! The conversation is flowing.',
        emoji: '✨',
      },
      {
        stage: 'planning_date',
        title: 'Planning a Date',
        description: "You're making plans to meet!",
        emoji: '📅',
      },
      {
        stage: 'first_date',
        title: 'First Date',
        description: "You've met in person!",
        emoji: '🌟',
      },
      {
        stage: 'dating',
        title: 'Dating',
        description: 'Regularly seeing each other.',
        emoji: '💫',
      },
      {
        stage: 'exclusive',
        title: 'Exclusive',
        description: "You're only seeing each other.",
        emoji: '💕',
      },
      {
        stage: 'committed',
        title: 'In a Relationship',
        description: "It's official!",
        emoji: '❤️',
      },
    ];
  }

  private mockProgression(id: string): RelationshipProgression {
    return {
      id,
      userId: 'current-user',
      partnerId: 'partner-user',
      conversationId: `conv-${id}`,
      currentStage: 'vibing',
      stageHistory: [
        {
          fromStage: null,
          toStage: 'matched',
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          triggeredBy: 'system',
        },
        {
          fromStage: 'matched',
          toStage: 'chatting',
          timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          triggeredBy: 'system',
        },
        {
          fromStage: 'chatting',
          toStage: 'vibing',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          triggeredBy: 'system',
        },
      ],
      startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date().toISOString(),
      healthScore: 85,
      mutualEngagement: 78,
    };
  }

  private mockMilestoneTemplates(): MilestoneTemplate[] {
    return [
      {
        type: 'first_message',
        title: 'First Message',
        description: 'The beginning of your story',
        celebrationSuggestion: 'Screenshot this moment!',
        iconEmoji: '💬',
        autoDetectable: true,
      },
      {
        type: 'first_conversation_hour',
        title: 'First Hour Together',
        description: 'An hour of great conversation',
        celebrationSuggestion: 'You two really hit it off!',
        iconEmoji: '⏰',
        autoDetectable: true,
      },
      {
        type: 'exchanged_numbers',
        title: 'Exchanged Numbers',
        description: 'Taking it off the app',
        celebrationSuggestion: 'Things are getting real!',
        iconEmoji: '📱',
        autoDetectable: false,
      },
      {
        type: 'first_date_planned',
        title: 'First Date Planned',
        description: "It's official - you have plans!",
        celebrationSuggestion: 'Time to pick the perfect outfit!',
        iconEmoji: '📅',
        autoDetectable: false,
      },
      {
        type: 'first_date_completed',
        title: 'First Date',
        description: 'Your first real-world adventure',
        celebrationSuggestion: 'Add a photo to remember this day!',
        iconEmoji: '🌟',
        autoDetectable: false,
      },
    ];
  }

  private mockMilestones(): Milestone[] {
    return [
      {
        id: 'milestone-1',
        relationshipId: 'progression-1',
        type: 'first_message',
        title: 'First Message',
        description: 'The beginning of your story',
        achievedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        celebratedBy: ['current-user'],
        memories: [],
        isShared: true,
      },
      {
        id: 'milestone-2',
        relationshipId: 'progression-1',
        type: 'first_conversation_hour',
        title: 'First Hour Together',
        description: 'An hour of great conversation',
        achievedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        celebratedBy: [],
        memories: [],
        isShared: true,
      },
    ];
  }

  private mockCelebrationPrompts(): CelebrationPrompt[] {
    const milestones = this.mockMilestones();
    return [
      {
        milestoneId: milestones[1].id,
        milestone: milestones[1],
        suggestions: [
          {
            type: 'message',
            title: 'Send a Sweet Message',
            description: 'Express how you feel about this moment',
            difficulty: 'easy',
            estimatedCost: 'free',
          },
          {
            type: 'activity',
            title: 'Plan Something Special',
            description: 'Create another memory together',
            difficulty: 'medium',
            estimatedCost: '$',
          },
        ],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  private mockExperiences(): SharedExperience[] {
    return [
      {
        id: 'experience-1',
        relationshipId: 'progression-1',
        type: 'date',
        title: 'Coffee at Blue Bottle',
        description: 'Our first time meeting in person!',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        location: { name: 'Blue Bottle Coffee', address: '123 Main St' },
        photos: [],
        rating: 4.5,
        moods: [
          { userId: 'current-user', mood: 'great' },
          { userId: 'partner-user', mood: 'amazing' },
        ],
        tags: ['coffee', 'first date'],
        isPrivate: false,
        createdBy: 'current-user',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  private mockTimeline(progressionId: string): RelationshipTimeline {
    return {
      relationshipId: progressionId,
      events: [
        {
          id: 'event-1',
          type: 'stage_change',
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'Reached: Just Matched',
          iconEmoji: '🎯',
        },
        {
          id: 'event-2',
          type: 'milestone',
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'First Message',
          description: 'The beginning of your story',
          iconEmoji: '💬',
        },
        {
          id: 'event-3',
          type: 'stage_change',
          timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'Reached: Chatting',
          iconEmoji: '💬',
        },
        {
          id: 'event-4',
          type: 'milestone',
          timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'First Hour Together',
          iconEmoji: '⏰',
        },
        {
          id: 'event-5',
          type: 'stage_change',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'Reached: Vibing',
          iconEmoji: '✨',
        },
        {
          id: 'event-6',
          type: 'experience',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'Coffee at Blue Bottle',
          description: 'Our first time meeting in person!',
          iconEmoji: '🍽️',
        },
      ],
      totalDays: 14,
      highlights: [
        {
          id: 'event-2',
          type: 'milestone',
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'First Message',
          iconEmoji: '💬',
        },
        {
          id: 'event-6',
          type: 'experience',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'Coffee at Blue Bottle',
          iconEmoji: '🍽️',
        },
      ],
    };
  }

  private mockCompatibility(progressionId: string): CompatibilityInsight {
    return {
      relationshipId: progressionId,
      overallScore: 78,
      dimensions: {
        communicationStyle: 82,
        sharedInterests: 75,
        valueAlignment: 80,
        emotionalConnection: 85,
        futureGoals: 68,
      },
      strengths: ['Great conversation flow', 'Similar sense of humor', 'Respectful communication'],
      growthAreas: ['Discuss long-term goals', 'Share more about personal values'],
      tips: [
        'Try asking about their dreams and aspirations',
        'Share something vulnerable to deepen connection',
      ],
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const relationshipProgressionService = new RelationshipProgressionService();
export default relationshipProgressionService;
