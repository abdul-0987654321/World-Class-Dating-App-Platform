/**
 * Progression Service
 * Business logic for relationship stages and timeline
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../infrastructure/database/db-client';
import {
  RelationshipProgression,
  RelationshipStage,
  StageTransition,
  SharedExperience,
  ExperienceType,
  TimelineEvent,
  RelationshipTimeline,
  CompatibilityInsight,
  CreateProgressionRequest,
  UpdateStageRequest,
  CreateExperienceRequest,
  RecordMoodRequest,
} from '../types/progression.types';
import { milestoneService } from './milestone.service';

// ============================================================================
// Stage Definitions
// ============================================================================

const STAGE_ORDER: RelationshipStage[] = [
  'matched',
  'chatting',
  'vibing',
  'planning_date',
  'first_date',
  'dating',
  'exclusive',
  'committed',
];

const STAGE_INFO: Record<RelationshipStage, { title: string; description: string; emoji: string }> =
  {
    matched: {
      title: 'Just Matched',
      description: "You've connected! Time to break the ice.",
      emoji: '🎯',
    },
    chatting: {
      title: 'Chatting',
      description: 'Getting to know each other through messages.',
      emoji: '💬',
    },
    vibing: {
      title: 'Vibing',
      description: 'Great chemistry! The conversation is flowing.',
      emoji: '✨',
    },
    planning_date: {
      title: 'Planning a Date',
      description: "You're making plans to meet!",
      emoji: '📅',
    },
    first_date: {
      title: 'First Date',
      description: "You've met in person!",
      emoji: '🌟',
    },
    dating: {
      title: 'Dating',
      description: 'Regularly seeing each other.',
      emoji: '💫',
    },
    exclusive: {
      title: 'Exclusive',
      description: "You're only seeing each other.",
      emoji: '💕',
    },
    committed: {
      title: 'In a Relationship',
      description: "It's official!",
      emoji: '❤️',
    },
  };

// ============================================================================
// Service
// ============================================================================

class ProgressionService {
  /**
   * Get stage information
   */
  getStageInfo(stage: RelationshipStage) {
    return STAGE_INFO[stage];
  }

  /**
   * Get all stages in order
   */
  getStages() {
    return STAGE_ORDER.map((stage) => ({
      stage,
      ...STAGE_INFO[stage],
    }));
  }

  /**
   * Create a new relationship progression
   */
  async createProgression(
    userId: string,
    request: CreateProgressionRequest
  ): Promise<RelationshipProgression> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const initialTransition: StageTransition = {
      fromStage: null,
      toStage: 'matched',
      timestamp: now,
      triggeredBy: 'system',
      reason: 'Initial match',
    };

    const progression = {
      id,
      user_id: userId,
      partner_id: request.partnerId,
      conversation_id: request.conversationId,
      current_stage: 'matched',
      stage_history: JSON.stringify([initialTransition]),
      started_at: now,
      last_activity_at: now,
      health_score: 100,
      mutual_engagement: 50,
    };

    await db('relationship_progressions').insert(progression);

    return this.getProgression(id) as Promise<RelationshipProgression>;
  }

  /**
   * Get a relationship progression
   */
  async getProgression(progressionId: string): Promise<RelationshipProgression | null> {
    const row = await db('relationship_progressions').where({ id: progressionId }).first();

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      partnerId: row.partner_id,
      conversationId: row.conversation_id,
      currentStage: row.current_stage,
      stageHistory: JSON.parse(row.stage_history || '[]'),
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      healthScore: row.health_score,
      mutualEngagement: row.mutual_engagement,
    };
  }

  /**
   * Get progression by conversation
   */
  async getProgressionByConversation(
    conversationId: string
  ): Promise<RelationshipProgression | null> {
    const row = await db('relationship_progressions')
      .where({ conversation_id: conversationId })
      .first();

    if (!row) return null;

    return this.getProgression(row.id);
  }

  /**
   * Get all progressions for a user
   */
  async getUserProgressions(userId: string): Promise<RelationshipProgression[]> {
    const rows = await db('relationship_progressions')
      .where({ user_id: userId })
      .orderBy('last_activity_at', 'desc');

    return Promise.all(
      rows.map((row) => this.getProgression(row.id) as Promise<RelationshipProgression>)
    );
  }

  /**
   * Update relationship stage
   */
  async updateStage(
    progressionId: string,
    userId: string,
    request: UpdateStageRequest
  ): Promise<RelationshipProgression> {
    const progression = await this.getProgression(progressionId);

    if (!progression) {
      throw new Error('Progression not found');
    }

    const transition: StageTransition = {
      fromStage: progression.currentStage,
      toStage: request.newStage,
      timestamp: new Date().toISOString(),
      triggeredBy: 'user',
      reason: request.reason,
    };

    const updatedHistory = [...progression.stageHistory, transition];

    await db('relationship_progressions')
      .where({ id: progressionId })
      .update({
        current_stage: request.newStage,
        stage_history: JSON.stringify(updatedHistory),
        last_activity_at: new Date().toISOString(),
      });

    // Check for stage-related milestones
    await this.checkStageMilestones(progressionId, request.newStage);

    return this.getProgression(progressionId) as Promise<RelationshipProgression>;
  }

  /**
   * Check and create stage-related milestones
   */
  private async checkStageMilestones(
    progressionId: string,
    newStage: RelationshipStage
  ): Promise<void> {
    const stageToMilestone: Partial<Record<RelationshipStage, string>> = {
      planning_date: 'first_date_planned',
      first_date: 'first_date_completed',
      exclusive: 'became_exclusive',
    };

    const milestoneType = stageToMilestone[newStage];
    if (milestoneType) {
      await milestoneService.createMilestone(progressionId, 'system', {
        type: milestoneType as any,
      });
    }
  }

  /**
   * Update engagement metrics
   */
  async updateEngagement(
    progressionId: string,
    metrics: { healthScore?: number; mutualEngagement?: number }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      last_activity_at: new Date().toISOString(),
    };

    if (metrics.healthScore !== undefined) {
      updates.health_score = Math.max(0, Math.min(100, metrics.healthScore));
    }
    if (metrics.mutualEngagement !== undefined) {
      updates.mutual_engagement = Math.max(0, Math.min(100, metrics.mutualEngagement));
    }

    await db('relationship_progressions').where({ id: progressionId }).update(updates);
  }

  // ============================================================================
  // Shared Experiences
  // ============================================================================

  /**
   * Create a shared experience
   */
  async createExperience(
    progressionId: string,
    userId: string,
    request: CreateExperienceRequest
  ): Promise<SharedExperience> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const experience = {
      id,
      relationship_id: progressionId,
      type: request.type,
      title: request.title,
      description: request.description,
      date: request.date,
      location: request.location ? JSON.stringify(request.location) : null,
      photos: JSON.stringify([]),
      moods: JSON.stringify([]),
      tags: JSON.stringify(request.tags || []),
      is_private: request.isPrivate ?? false,
      created_by: userId,
      created_at: now,
    };

    await db('shared_experiences').insert(experience);

    return this.getExperience(id) as Promise<SharedExperience>;
  }

  /**
   * Get a shared experience
   */
  async getExperience(experienceId: string): Promise<SharedExperience | null> {
    const row = await db('shared_experiences').where({ id: experienceId }).first();

    if (!row) return null;

    const moods = JSON.parse(row.moods || '[]');

    return {
      id: row.id,
      relationshipId: row.relationship_id,
      type: row.type as ExperienceType,
      title: row.title,
      description: row.description,
      date: row.date,
      location: row.location ? JSON.parse(row.location) : undefined,
      photos: JSON.parse(row.photos || '[]'),
      rating: moods.length > 0 ? this.calculateAverageRating(moods) : undefined,
      moods,
      tags: JSON.parse(row.tags || '[]'),
      isPrivate: row.is_private,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }

  /**
   * Get experiences for a relationship
   */
  async getExperiences(progressionId: string): Promise<SharedExperience[]> {
    const rows = await db('shared_experiences')
      .where({ relationship_id: progressionId })
      .orderBy('date', 'desc');

    return Promise.all(rows.map((row) => this.getExperience(row.id) as Promise<SharedExperience>));
  }

  /**
   * Record mood for an experience
   */
  async recordMood(userId: string, request: RecordMoodRequest): Promise<SharedExperience> {
    const row = await db('shared_experiences').where({ id: request.experienceId }).first();

    if (!row) {
      throw new Error('Experience not found');
    }

    const moods = JSON.parse(row.moods || '[]');
    const existingIndex = moods.findIndex((m: { userId: string }) => m.userId === userId);

    if (existingIndex >= 0) {
      moods[existingIndex].mood = request.mood;
    } else {
      moods.push({ userId, mood: request.mood });
    }

    await db('shared_experiences')
      .where({ id: request.experienceId })
      .update({ moods: JSON.stringify(moods) });

    return this.getExperience(request.experienceId) as Promise<SharedExperience>;
  }

  /**
   * Calculate average rating from moods
   */
  private calculateAverageRating(moods: { mood: string }[]): number {
    const moodValues: Record<string, number> = {
      amazing: 5,
      great: 4,
      good: 3,
      okay: 2,
      not_great: 1,
    };

    const total = moods.reduce((sum, m) => sum + (moodValues[m.mood] || 3), 0);
    return Math.round((total / moods.length) * 10) / 10;
  }

  // ============================================================================
  // Timeline
  // ============================================================================

  /**
   * Get relationship timeline
   */
  async getTimeline(progressionId: string): Promise<RelationshipTimeline> {
    const progression = await this.getProgression(progressionId);
    if (!progression) {
      throw new Error('Progression not found');
    }

    const milestones = await milestoneService.getMilestones(progressionId);
    const experiences = await this.getExperiences(progressionId);

    const events: TimelineEvent[] = [];

    // Add stage transitions
    for (const transition of progression.stageHistory) {
      const stageInfo = STAGE_INFO[transition.toStage];
      events.push({
        id: `stage-${transition.timestamp}`,
        type: 'stage_change',
        timestamp: transition.timestamp,
        title: `Reached: ${stageInfo.title}`,
        description: transition.reason,
        iconEmoji: stageInfo.emoji,
      });
    }

    // Add milestones
    for (const milestone of milestones) {
      const template = milestoneService.getTemplate(milestone.type);
      events.push({
        id: `milestone-${milestone.id}`,
        type: 'milestone',
        timestamp: milestone.achievedAt,
        title: milestone.title,
        description: milestone.description,
        iconEmoji: template?.iconEmoji || '✨',
        relatedId: milestone.id,
      });
    }

    // Add experiences
    for (const experience of experiences) {
      events.push({
        id: `experience-${experience.id}`,
        type: 'experience',
        timestamp: experience.date,
        title: experience.title,
        description: experience.description,
        iconEmoji: this.getExperienceEmoji(experience.type),
        relatedId: experience.id,
      });
    }

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate total days
    const startDate = new Date(progression.startedAt);
    const totalDays = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get highlights (milestones and significant events)
    const highlights = events.filter(
      (e) => e.type === 'milestone' || (e.type === 'stage_change' && e.title.includes('Exclusive'))
    );

    return {
      relationshipId: progressionId,
      events,
      totalDays,
      highlights,
    };
  }

  /**
   * Get emoji for experience type
   */
  private getExperienceEmoji(type: ExperienceType): string {
    const emojis: Record<ExperienceType, string> = {
      date: '🍽️',
      activity: '🎮',
      travel: '✈️',
      event: '🎭',
      milestone_celebration: '🎉',
      gift: '🎁',
      surprise: '🎊',
      first_time: '⭐',
    };
    return emojis[type] || '📝';
  }

  // ============================================================================
  // Compatibility Insights
  // ============================================================================

  /**
   * Get compatibility insights
   */
  async getCompatibilityInsights(progressionId: string): Promise<CompatibilityInsight> {
    const progression = await this.getProgression(progressionId);
    if (!progression) {
      throw new Error('Progression not found');
    }

    // In a real implementation, this would analyze conversation patterns,
    // shared interests, and behavioral data
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

export const progressionService = new ProgressionService();
export default progressionService;
