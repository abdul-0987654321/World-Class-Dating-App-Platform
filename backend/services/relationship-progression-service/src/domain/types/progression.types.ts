/**
 * Relationship Progression Types
 * Types for milestones, stages, and shared experiences
 */

// ============================================================================
// Relationship Stages
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

export interface StageTransition {
  fromStage: RelationshipStage | null;
  toStage: RelationshipStage;
  timestamp: string;
  triggeredBy: 'system' | 'user' | 'mutual';
  reason?: string;
}

// ============================================================================
// Milestones
// ============================================================================

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

export interface MilestoneMemory {
  id: string;
  milestoneId: string;
  type: 'text' | 'photo' | 'voice' | 'location';
  content: string;
  addedBy: string;
  addedAt: string;
}

export interface MilestoneTemplate {
  type: MilestoneType;
  title: string;
  description: string;
  celebrationSuggestion: string;
  iconEmoji: string;
  autoDetectable: boolean;
}

// ============================================================================
// Shared Experiences
// ============================================================================

export type ExperienceType =
  | 'date'
  | 'activity'
  | 'travel'
  | 'event'
  | 'milestone_celebration'
  | 'gift'
  | 'surprise'
  | 'first_time';

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
  moods: {
    userId: string;
    mood: 'amazing' | 'great' | 'good' | 'okay' | 'not_great';
  }[];
  tags: string[];
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ExperienceLocation {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

// ============================================================================
// Relationship Timeline
// ============================================================================

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

// ============================================================================
// Compatibility Tracking
// ============================================================================

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
// Celebration & Notifications
// ============================================================================

export interface CelebrationPrompt {
  milestoneId: string;
  milestone: Milestone;
  suggestions: CelebrationSuggestion[];
  expiresAt: string;
}

export interface CelebrationSuggestion {
  type: 'message' | 'gift' | 'activity' | 'surprise';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'elaborate';
  estimatedCost?: 'free' | '$' | '$$' | '$$$';
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateProgressionRequest {
  partnerId: string;
  conversationId: string;
}

export interface UpdateStageRequest {
  newStage: RelationshipStage;
  reason?: string;
}

export interface CreateMilestoneRequest {
  type: MilestoneType;
  title?: string;
  description?: string;
  customData?: Record<string, unknown>;
}

export interface AddMemoryRequest {
  type: MilestoneMemory['type'];
  content: string;
}

export interface CreateExperienceRequest {
  type: ExperienceType;
  title: string;
  description?: string;
  date: string;
  location?: ExperienceLocation;
  tags?: string[];
  isPrivate?: boolean;
}

export interface RecordMoodRequest {
  experienceId: string;
  mood: 'amazing' | 'great' | 'good' | 'okay' | 'not_great';
}

export interface CelebrateRequest {
  milestoneId: string;
  celebrationType?: string;
  message?: string;
}
