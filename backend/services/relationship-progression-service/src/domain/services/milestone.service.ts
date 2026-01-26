/**
 * Milestone Service
 * Business logic for relationship milestones and celebrations
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../infrastructure/database/db-client';
import {
  Milestone,
  MilestoneType,
  MilestoneMemory,
  MilestoneTemplate,
  CelebrationPrompt,
  CelebrationSuggestion,
  CreateMilestoneRequest,
  AddMemoryRequest,
} from '../types/progression.types';
import { config } from '../../config';

// ============================================================================
// Milestone Templates
// ============================================================================

const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
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
  {
    type: 'first_photo_shared',
    title: 'First Photo Shared',
    description: 'Getting more personal',
    celebrationSuggestion: 'A picture is worth a thousand words',
    iconEmoji: '📸',
    autoDetectable: true,
  },
  {
    type: 'first_voice_note',
    title: 'First Voice Note',
    description: 'Hearing each other for the first time',
    celebrationSuggestion: 'Nothing beats hearing their voice!',
    iconEmoji: '🎤',
    autoDetectable: true,
  },
  {
    type: 'first_video_call',
    title: 'First Video Call',
    description: 'Face to face (virtually)',
    celebrationSuggestion: 'Now you know the chemistry is real!',
    iconEmoji: '📹',
    autoDetectable: false,
  },
  {
    type: 'met_friends',
    title: 'Met the Friends',
    description: 'Introducing them to your world',
    celebrationSuggestion: 'This is a big step!',
    iconEmoji: '👥',
    autoDetectable: false,
  },
  {
    type: 'week_anniversary',
    title: 'One Week Together',
    description: 'Seven days of connection',
    celebrationSuggestion: 'Celebrate with a thoughtful message',
    iconEmoji: '📆',
    autoDetectable: true,
  },
  {
    type: 'month_anniversary',
    title: 'One Month Together',
    description: 'A whole month of getting to know each other',
    celebrationSuggestion: 'Plan something special!',
    iconEmoji: '🎉',
    autoDetectable: true,
  },
  {
    type: 'became_exclusive',
    title: 'Became Exclusive',
    description: "It's official!",
    celebrationSuggestion: 'This calls for a celebration!',
    iconEmoji: '💕',
    autoDetectable: false,
  },
  {
    type: 'custom',
    title: 'Special Moment',
    description: 'A moment worth remembering',
    celebrationSuggestion: 'Every moment matters',
    iconEmoji: '✨',
    autoDetectable: false,
  },
];

// ============================================================================
// Service
// ============================================================================

class MilestoneService {
  /**
   * Get milestone templates
   */
  getTemplates(): MilestoneTemplate[] {
    return MILESTONE_TEMPLATES;
  }

  /**
   * Get template by type
   */
  getTemplate(type: MilestoneType): MilestoneTemplate | undefined {
    return MILESTONE_TEMPLATES.find((t) => t.type === type);
  }

  /**
   * Get all milestones for a relationship
   */
  async getMilestones(relationshipId: string): Promise<Milestone[]> {
    const rows = await db('milestones')
      .where({ relationship_id: relationshipId })
      .orderBy('achieved_at', 'asc');

    return Promise.all(rows.map((row) => this.enrichMilestone(row)));
  }

  /**
   * Get a specific milestone
   */
  async getMilestone(milestoneId: string): Promise<Milestone | null> {
    const row = await db('milestones').where({ id: milestoneId }).first();

    if (!row) return null;
    return this.enrichMilestone(row);
  }

  /**
   * Create a new milestone
   */
  async createMilestone(
    relationshipId: string,
    userId: string,
    request: CreateMilestoneRequest
  ): Promise<Milestone> {
    const template = this.getTemplate(request.type);
    const id = uuidv4();

    const milestone = {
      id,
      relationship_id: relationshipId,
      type: request.type,
      title: request.title || template?.title || 'Special Moment',
      description: request.description || template?.description,
      achieved_at: new Date().toISOString(),
      celebrated_by: JSON.stringify([]),
      is_shared: true,
      custom_data: request.customData ? JSON.stringify(request.customData) : null,
      created_by: userId,
    };

    await db('milestones').insert(milestone);

    return this.getMilestone(id) as Promise<Milestone>;
  }

  /**
   * Auto-detect and create milestones based on activity
   */
  async checkAutoMilestones(
    relationshipId: string,
    activityType: string,
    metadata?: Record<string, unknown>
  ): Promise<Milestone | null> {
    const existing = await db('milestones')
      .where({ relationship_id: relationshipId })
      .select('type');

    const existingTypes = new Set(existing.map((m) => m.type));

    let milestoneType: MilestoneType | null = null;

    switch (activityType) {
      case 'message_sent':
        if (!existingTypes.has('first_message')) {
          milestoneType = 'first_message';
        }
        break;
      case 'conversation_duration':
        if (
          !existingTypes.has('first_conversation_hour') &&
          ((metadata?.minutes as number) ?? 0) >= 60
        ) {
          milestoneType = 'first_conversation_hour';
        }
        break;
      case 'photo_shared':
        if (!existingTypes.has('first_photo_shared')) {
          milestoneType = 'first_photo_shared';
        }
        break;
      case 'voice_note_sent':
        if (!existingTypes.has('first_voice_note')) {
          milestoneType = 'first_voice_note';
        }
        break;
      case 'relationship_age':
        if (!existingTypes.has('week_anniversary') && ((metadata?.days as number) ?? 0) >= 7) {
          milestoneType = 'week_anniversary';
        } else if (
          !existingTypes.has('month_anniversary') &&
          ((metadata?.days as number) ?? 0) >= 30
        ) {
          milestoneType = 'month_anniversary';
        }
        break;
    }

    if (milestoneType) {
      return this.createMilestone(relationshipId, 'system', { type: milestoneType });
    }

    return null;
  }

  /**
   * Add memory to milestone
   */
  async addMemory(
    milestoneId: string,
    userId: string,
    request: AddMemoryRequest
  ): Promise<MilestoneMemory> {
    const id = uuidv4();

    const memory = {
      id,
      milestone_id: milestoneId,
      type: request.type,
      content: request.content,
      added_by: userId,
      added_at: new Date().toISOString(),
    };

    await db('milestone_memories').insert(memory);

    return {
      id,
      milestoneId,
      type: request.type,
      content: request.content,
      addedBy: userId,
      addedAt: memory.added_at,
    };
  }

  /**
   * Get memories for a milestone
   */
  async getMemories(milestoneId: string): Promise<MilestoneMemory[]> {
    const rows = await db('milestone_memories')
      .where({ milestone_id: milestoneId })
      .orderBy('added_at', 'asc');

    return rows.map((row) => ({
      id: row.id,
      milestoneId: row.milestone_id,
      type: row.type,
      content: row.content,
      addedBy: row.added_by,
      addedAt: row.added_at,
    }));
  }

  /**
   * Celebrate a milestone
   */
  async celebrate(milestoneId: string, userId: string): Promise<Milestone> {
    const milestone = await db('milestones').where({ id: milestoneId }).first();

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    const celebratedBy = JSON.parse(milestone.celebrated_by || '[]');
    if (!celebratedBy.includes(userId)) {
      celebratedBy.push(userId);
      await db('milestones')
        .where({ id: milestoneId })
        .update({ celebrated_by: JSON.stringify(celebratedBy) });
    }

    return this.getMilestone(milestoneId) as Promise<Milestone>;
  }

  /**
   * Get celebration prompts for uncelebrated milestones
   */
  async getCelebrationPrompts(
    relationshipId: string,
    userId: string
  ): Promise<CelebrationPrompt[]> {
    const milestones = await this.getMilestones(relationshipId);
    const prompts: CelebrationPrompt[] = [];

    for (const milestone of milestones) {
      if (!milestone.celebratedBy.includes(userId)) {
        const suggestions = this.generateCelebrationSuggestions(milestone);
        prompts.push({
          milestoneId: milestone.id,
          milestone,
          suggestions,
          expiresAt: new Date(
            Date.now() + config.milestones.celebrationCooldownHours * 60 * 60 * 1000
          ).toISOString(),
        });
      }
    }

    return prompts;
  }

  /**
   * Generate celebration suggestions based on milestone type
   */
  private generateCelebrationSuggestions(milestone: Milestone): CelebrationSuggestion[] {
    const suggestions: CelebrationSuggestion[] = [
      {
        type: 'message',
        title: 'Send a Sweet Message',
        description: 'Express how you feel about this moment',
        difficulty: 'easy',
        estimatedCost: 'free',
      },
    ];

    switch (milestone.type) {
      case 'first_date_completed':
        suggestions.push(
          {
            type: 'activity',
            title: 'Plan Your Second Date',
            description: "Strike while the iron's hot!",
            difficulty: 'medium',
            estimatedCost: '$$',
          },
          {
            type: 'gift',
            title: 'Send a Small Gift',
            description: 'Something that reminded you of them',
            difficulty: 'medium',
            estimatedCost: '$',
          }
        );
        break;

      case 'month_anniversary':
        suggestions.push(
          {
            type: 'activity',
            title: 'Recreate Your First Date',
            description: 'Go back to where it all started',
            difficulty: 'elaborate',
            estimatedCost: '$$',
          },
          {
            type: 'surprise',
            title: 'Create a Memory Book',
            description: 'Compile your favorite moments together',
            difficulty: 'elaborate',
            estimatedCost: '$',
          }
        );
        break;

      case 'became_exclusive':
        suggestions.push(
          {
            type: 'activity',
            title: 'Take a Trip Together',
            description: 'Celebrate with an adventure',
            difficulty: 'elaborate',
            estimatedCost: '$$$',
          },
          {
            type: 'gift',
            title: 'Matching Something',
            description: 'A subtle symbol of your connection',
            difficulty: 'medium',
            estimatedCost: '$$',
          }
        );
        break;

      default:
        suggestions.push({
          type: 'activity',
          title: 'Do Something Special',
          description: 'Create another memory together',
          difficulty: 'medium',
          estimatedCost: '$',
        });
    }

    return suggestions;
  }

  /**
   * Enrich milestone row with memories
   */
  private async enrichMilestone(row: Record<string, unknown>): Promise<Milestone> {
    const memories = await this.getMemories(row.id as string);

    return {
      id: row.id as string,
      relationshipId: row.relationship_id as string,
      type: row.type as MilestoneType,
      title: row.title as string,
      description: row.description as string | undefined,
      achievedAt: row.achieved_at as string,
      celebratedBy: JSON.parse((row.celebrated_by as string) || '[]'),
      memories,
      isShared: row.is_shared as boolean,
      customData: row.custom_data ? JSON.parse(row.custom_data as string) : undefined,
    };
  }
}

export const milestoneService = new MilestoneService();
export default milestoneService;
