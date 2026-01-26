/**
 * Intent Service
 * Manages user dating intents and intent matching
 */

import { createLogger } from '@flamoral/backend-shared';
import { v4 as uuidv4 } from 'uuid';

import { dbClient } from '../../infrastructure/database/db-client';
import {
  UserIntent,
  IntentLevel,
  IntentMatch,
  IntentCompatibility,
  UpdateIntentRequest,
} from '../types/conversation.types';

const logger = createLogger('intent-service');

// Intent compatibility matrix
const INTENT_COMPATIBILITY: Record<IntentLevel, Record<IntentLevel, IntentCompatibility>> = {
  exploring: {
    exploring: 'aligned',
    getting_to_know: 'compatible',
    open_to_meeting: 'compatible',
    ready_to_meet: 'misaligned',
  },
  getting_to_know: {
    exploring: 'compatible',
    getting_to_know: 'aligned',
    open_to_meeting: 'compatible',
    ready_to_meet: 'compatible',
  },
  open_to_meeting: {
    exploring: 'compatible',
    getting_to_know: 'compatible',
    open_to_meeting: 'aligned',
    ready_to_meet: 'aligned',
  },
  ready_to_meet: {
    exploring: 'misaligned',
    getting_to_know: 'compatible',
    open_to_meeting: 'aligned',
    ready_to_meet: 'aligned',
  },
};

// Intent display info
const INTENT_INFO: Record<IntentLevel, { emoji: string; label: string; description: string }> = {
  exploring: {
    emoji: '🔵',
    label: 'Just Exploring',
    description: 'Enjoying conversations without pressure to meet right away',
  },
  getting_to_know: {
    emoji: '🟡',
    label: 'Getting to Know You',
    description: 'Want to build connection through conversation first',
  },
  open_to_meeting: {
    emoji: '🟠',
    label: 'Open to Meeting',
    description: 'Would consider meeting if the conversation feels right',
  },
  ready_to_meet: {
    emoji: '🟢',
    label: 'Ready to Meet',
    description: 'Actively interested in meeting in person soon',
  },
};

export class IntentService {
  /**
   * Update a user's intent
   */
  async updateIntent(request: UpdateIntentRequest): Promise<UserIntent> {
    const db = dbClient.getClient();

    try {
      const intentData = {
        user_id: request.userId,
        conversation_id: request.conversationId || null,
        intent: request.intent,
        available_timeframe: request.availableTimeframe || null,
        preferred_date_types: request.preferredDateTypes || [],
        notes: request.notes || null,
        updated_at: new Date(),
      };

      // Upsert the intent
      const existing = await db('user_intents')
        .where('user_id', request.userId)
        .where('conversation_id', request.conversationId || null)
        .first();

      let result;
      if (existing) {
        [result] = await db('user_intents')
          .where('id', existing.id)
          .update(intentData)
          .returning('*');
      } else {
        [result] = await db('user_intents')
          .insert({ id: uuidv4(), ...intentData })
          .returning('*');
      }

      return this.mapToUserIntent(result);
    } catch (error: any) {
      logger.error('Error updating intent:', error);
      throw error;
    }
  }

  /**
   * Get a user's intent for a specific conversation or global
   */
  async getIntent(userId: string, conversationId?: string): Promise<UserIntent | null> {
    const db = dbClient.getClient();

    try {
      // First try conversation-specific intent
      if (conversationId) {
        const specific = await db('user_intents')
          .where('user_id', userId)
          .where('conversation_id', conversationId)
          .first();

        if (specific) {
          return this.mapToUserIntent(specific);
        }
      }

      // Fall back to global intent
      const global = await db('user_intents')
        .where('user_id', userId)
        .whereNull('conversation_id')
        .first();

      if (global) {
        return this.mapToUserIntent(global);
      }

      return null;
    } catch (error: any) {
      logger.error('Error getting intent:', error);
      throw error;
    }
  }

  /**
   * Check intent compatibility between two users in a conversation
   */
  async checkIntentMatch(
    user1Id: string,
    user2Id: string,
    conversationId: string
  ): Promise<IntentMatch> {
    try {
      const [intent1, intent2] = await Promise.all([
        this.getIntent(user1Id, conversationId),
        this.getIntent(user2Id, conversationId),
      ]);

      // Default to 'exploring' if no intent set
      const level1: IntentLevel = intent1?.intent || 'exploring';
      const level2: IntentLevel = intent2?.intent || 'exploring';

      const compatibility = INTENT_COMPATIBILITY[level1][level2];
      const suggestion = this.generateSuggestion(level1, level2, compatibility);

      return {
        user1Intent: level1,
        user2Intent: level2,
        compatibility,
        suggestion,
      };
    } catch (error: any) {
      logger.error('Error checking intent match:', error);
      throw error;
    }
  }

  /**
   * Get all available intent options
   */
  getIntentOptions(): Array<{
    level: IntentLevel;
    emoji: string;
    label: string;
    description: string;
  }> {
    return Object.entries(INTENT_INFO).map(([level, info]) => ({
      level: level as IntentLevel,
      ...info,
    }));
  }

  /**
   * Infer intent from conversation behavior
   */
  async inferIntent(userId: string, conversationId: string): Promise<IntentLevel> {
    const db = dbClient.getClient();

    try {
      // Get conversation metrics
      const connectionScore = await db('connection_scores')
        .where('conversation_id', conversationId)
        .first();

      const messages = await db('message_analyses')
        .where('conversation_id', conversationId)
        .where('sender_id', userId)
        .orderBy('message_timestamp', 'desc')
        .limit(10);

      if (!connectionScore || messages.length === 0) {
        return 'exploring';
      }

      // Signals for each intent level
      let readyToMeetSignals = 0;
      let openToMeetingSignals = 0;
      let gettingToKnowSignals = 0;
      let exploringSignals = 0;

      // Check for meetup mentions
      if (connectionScore.has_discussed_meetup) {
        readyToMeetSignals += 3;
      }

      // Check message patterns
      const avgResponseTime =
        messages
          .filter((m) => m.response_time_minutes)
          .reduce((sum, m) => sum + parseFloat(m.response_time_minutes), 0) /
        (messages.filter((m) => m.response_time_minutes).length || 1);

      // Fast responders tend to be more eager
      if (avgResponseTime < 30) readyToMeetSignals += 1;
      else if (avgResponseTime < 60) openToMeetingSignals += 1;
      else if (avgResponseTime < 180) gettingToKnowSignals += 1;
      else exploringSignals += 1;

      // Message depth
      const avgDepth =
        messages.reduce((sum, m) => sum + parseFloat(m.depth_score), 0) / messages.length;
      if (avgDepth > 60) {
        openToMeetingSignals += 1;
        readyToMeetSignals += 1;
      } else if (avgDepth > 40) {
        gettingToKnowSignals += 1;
      } else {
        exploringSignals += 1;
      }

      // Personal info sharing
      if (connectionScore.has_exchanged_personal_info) {
        openToMeetingSignals += 2;
      }

      // Vulnerability sharing
      if (connectionScore.has_shared_vulnerability) {
        readyToMeetSignals += 1;
        openToMeetingSignals += 1;
      }

      // Determine highest signal
      const signals = {
        ready_to_meet: readyToMeetSignals,
        open_to_meeting: openToMeetingSignals,
        getting_to_know: gettingToKnowSignals,
        exploring: exploringSignals,
      };

      const maxSignal = Math.max(...Object.values(signals));
      const inferred = (Object.entries(signals).find(([_, v]) => v === maxSignal)?.[0] ||
        'exploring') as IntentLevel;

      return inferred;
    } catch (error: any) {
      logger.error('Error inferring intent:', error);
      return 'exploring';
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateSuggestion(
    intent1: IntentLevel,
    intent2: IntentLevel,
    compatibility: IntentCompatibility
  ): string {
    if (compatibility === 'aligned') {
      if (intent1 === 'ready_to_meet') {
        return "Great news! You're both ready to meet. Why not suggest a date?";
      }
      if (intent1 === 'exploring') {
        return "You're both in exploration mode. Enjoy getting to know each other!";
      }
      return 'Your intentions align well. Keep the conversation flowing naturally.';
    }

    if (compatibility === 'compatible') {
      if (intent1 === 'ready_to_meet' && intent2 === 'getting_to_know') {
        return 'They need a bit more time. Keep building connection through quality conversation.';
      }
      if (intent1 === 'exploring' && intent2 === 'open_to_meeting') {
        return "They're open to meeting - let them know if you feel the same way!";
      }
      return 'Your intentions are compatible. Continue building connection at a comfortable pace.';
    }

    // Misaligned
    if (intent1 === 'ready_to_meet' && intent2 === 'exploring') {
      return "They're in exploration mode. Patience will help - focus on great conversation first.";
    }
    if (intent1 === 'exploring' && intent2 === 'ready_to_meet') {
      return "They're ready to meet but you're still exploring. Be honest about where you're at.";
    }

    return 'Your intentions differ a bit. Open communication about expectations could help.';
  }

  private mapToUserIntent(row: any): UserIntent {
    return {
      userId: row.user_id,
      conversationId: row.conversation_id,
      intent: row.intent,
      updatedAt: row.updated_at,
      availableTimeframe: row.available_timeframe,
      preferredDateTypes: row.preferred_date_types || [],
      notes: row.notes,
    };
  }
}

export const intentService = new IntentService();
