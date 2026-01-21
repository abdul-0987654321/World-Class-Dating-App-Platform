/**
 * AI Conversation Coach Client Service
 * TypeScript client for the Dating Coach AI service
 *
 * This service provides easy integration with the Python AI coaching service
 * and handles caching, feature flags, and fallbacks.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('ai-conversation-coach');

// Configuration
const DATING_COACH_SERVICE_URL = process.env.DATING_COACH_SERVICE_URL || 'http://localhost:3030';
const CACHE_TTL_SECONDS = 60; // Cache coaching results for 1 minute

// Types
export interface ConversationMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  is_match: boolean;
}

export interface UserProfile {
  userId: string;
  firstName?: string;
  interests?: string[];
  bio?: string;
  occupation?: string;
}

export interface CoachingTip {
  id: string;
  type: string;
  title: string;
  message: string;
  example?: string;
  action_text?: string;
  priority: number;
  dismissable: boolean;
}

export interface ConversationHealthStatus {
  status: 'thriving' | 'healthy' | 'needs_attention' | 'at_risk' | 'critical';
  stage: 'opening' | 'getting_to_know' | 'building_rapport' | 'ready_for_date' | 'stalled' | 'fading';
  score: number;
  strengths: string[];
  areas_to_improve: string[];
}

export interface GhostingRisk {
  risk_level: 'low' | 'medium' | 'high';
  signals: string[];
  recommendation: string;
}

export interface TopicSuggestion {
  topic: string;
  type: 'shared_interest' | 'learn_about_them' | 'general';
  prompt: string;
}

export interface RealTimeCoachingResult {
  tips: CoachingTip[];
  health: ConversationHealthStatus;
  suggested_topics: TopicSuggestion[];
  ghosting_risk: GhostingRisk;
  metrics: Record<string, any>;
  ready_to_ask_out: boolean;
}

export interface NextMessageAdvice {
  advice: string;
  why: string;
  do: string[];
  dont: string[];
  example_responses: string[];
  tone_suggestion: string;
}

export interface DateAskCoaching {
  ready: boolean;
  readiness_score: number;
  timing_advice?: string;
  why_not_yet?: string[];
  what_to_do_first?: string[];
  estimated_messages_until_ready?: number;
  approach_suggestions?: string[];
  venue_ideas?: string[];
  example_messages?: string[];
  what_to_avoid?: string[];
}

// Valid user segments for AI conversation coach
const ALLOWED_USER_SEGMENTS = ['premium', 'elite'];

// User segment type
export type UserSegment = 'free' | 'basic' | 'premium' | 'elite';

// Feature flag check (simplified - integrate with actual feature flag service)
function isFeatureEnabled(userId: string, feature: string, userSegment?: UserSegment): boolean {
  // In production: return featureFlags.isEnabled('engagementFeatures', feature, { userId, userSegment });

  // Check user segment first - must be 'premium' or 'elite'
  if (userSegment && !ALLOWED_USER_SEGMENTS.includes(userSegment)) {
    return false;
  }

  // If no segment provided, deny access (segment is required for this feature)
  if (!userSegment) {
    return false;
  }

  // Check rollout percentage (25%)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  // 25% rollout for AI coach, only for premium/elite users
  return Math.abs(hash) % 100 < 25;
}

// Simple in-memory cache
const coachingCache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(userId: string, conversationId: string, type: string): string {
  return userId + ':' + conversationId + ':' + type;
}

function getFromCache<T>(key: string): T | null {
  const cached = coachingCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_SECONDS * 1000) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  coachingCache.set(key, { data, timestamp: Date.now() });
}

export class AIConversationCoachService {
  private readonly serviceUrl: string;
  private readonly timeout: number;

  constructor(serviceUrl?: string, timeout?: number) {
    this.serviceUrl = serviceUrl || DATING_COACH_SERVICE_URL;
    this.timeout = timeout || 10000;
  }

  /**
   * Check if AI coaching is enabled for a user
   * @param userId - The user's ID
   * @param userSegment - The user's subscription segment (premium/elite required)
   */
  isEnabled(userId: string, userSegment?: UserSegment): boolean {
    return isFeatureEnabled(userId, 'aiConversationCoach', userSegment);
  }

  /**
   * Get real-time coaching for a conversation
   * @param userId - The user's ID
   * @param conversationId - The conversation ID
   * @param messages - Conversation message history
   * @param userProfile - The requesting user's profile
   * @param matchProfile - The match's profile
   * @param accessToken - Auth token for the AI service
   * @param userSegment - The user's subscription segment (premium/elite required)
   * @param lastTipIds - IDs of previously shown tips to avoid repetition
   */
  async getRealTimeCoaching(
    userId: string,
    conversationId: string,
    messages: ConversationMessage[],
    userProfile: UserProfile,
    matchProfile: UserProfile,
    accessToken: string,
    userSegment?: UserSegment,
    lastTipIds?: string[]
  ): Promise<RealTimeCoachingResult | null> {
    // Check feature flag (requires premium/elite segment AND 25% rollout)
    if (!this.isEnabled(userId, userSegment)) {
      logger.debug('AI coaching disabled for user', { userId, userSegment, reason: 'feature_flag_check_failed' });
      return null;
    }

    // Check cache
    const cacheKey = getCacheKey(userId, conversationId, 'realtime');
    const cached = getFromCache<RealTimeCoachingResult>(cacheKey);
    if (cached) {
      logger.debug('Returning cached coaching', { userId, conversationId });
      return cached;
    }

    try {
      const response = await this.makeRequest('/coach/real-time', {
        user_id: userId,
        conversation_history: messages.map(m => ({
          id: m.id,
          text: m.text,
          is_match: m.is_match,
          timestamp: m.timestamp,
        })),
        user_profile: {
          userId: userProfile.userId,
          first_name: userProfile.firstName,
          interests: userProfile.interests,
          bio: userProfile.bio,
        },
        match_profile: {
          userId: matchProfile.userId,
          first_name: matchProfile.firstName,
          interests: matchProfile.interests,
          bio: matchProfile.bio,
        },
        last_coaching_tips: lastTipIds,
      }, accessToken);

      if (response) {
        setCache(cacheKey, response);
      }

      return response as RealTimeCoachingResult;
    } catch (error) {
      logger.error('Failed to get real-time coaching', { error, userId });
      return this.getFallbackCoaching(messages);
    }
  }

  /**
   * Get advice for the next message to send
   * @param userId - The user's ID
   * @param messages - Conversation message history
   * @param userProfile - The requesting user's profile
   * @param matchProfile - The match's profile
   * @param accessToken - Auth token for the AI service
   * @param userSegment - The user's subscription segment (premium/elite required)
   */
  async getNextMessageAdvice(
    userId: string,
    messages: ConversationMessage[],
    userProfile: UserProfile,
    matchProfile: UserProfile,
    accessToken: string,
    userSegment?: UserSegment
  ): Promise<NextMessageAdvice | null> {
    // Check feature flag (requires premium/elite segment AND 25% rollout)
    if (!this.isEnabled(userId, userSegment)) {
      logger.debug('AI coaching disabled for user', { userId, userSegment, reason: 'feature_flag_check_failed' });
      return null;
    }

    try {
      const response = await this.makeRequest('/coach/next-message', {
        user_id: userId,
        conversation_history: messages.map(m => ({
          id: m.id,
          text: m.text,
          is_match: m.is_match,
          timestamp: m.timestamp,
        })),
        user_profile: {
          userId: userProfile.userId,
          first_name: userProfile.firstName,
          interests: userProfile.interests,
        },
        match_profile: {
          userId: matchProfile.userId,
          first_name: matchProfile.firstName,
          interests: matchProfile.interests,
        },
      }, accessToken);

      return response as NextMessageAdvice;
    } catch (error) {
      logger.error('Failed to get next message advice', { error, userId });
      return this.getFallbackNextMessageAdvice(messages);
    }
  }

  /**
   * Get coaching for asking match on a date
   * @param userId - The user's ID
   * @param messages - Conversation message history
   * @param userProfile - The requesting user's profile
   * @param matchProfile - The match's profile
   * @param accessToken - Auth token for the AI service
   * @param userSegment - The user's subscription segment (premium/elite required)
   */
  async getDateAskCoaching(
    userId: string,
    messages: ConversationMessage[],
    userProfile: UserProfile,
    matchProfile: UserProfile,
    accessToken: string,
    userSegment?: UserSegment
  ): Promise<DateAskCoaching | null> {
    // Check feature flag (requires premium/elite segment AND 25% rollout)
    if (!this.isEnabled(userId, userSegment)) {
      logger.debug('AI coaching disabled for user', { userId, userSegment, reason: 'feature_flag_check_failed' });
      return null;
    }

    try {
      const response = await this.makeRequest('/coach/date-ask', {
        user_id: userId,
        conversation_history: messages.map(m => ({
          id: m.id,
          text: m.text,
          is_match: m.is_match,
          timestamp: m.timestamp,
        })),
        user_profile: {
          userId: userProfile.userId,
          interests: userProfile.interests,
        },
        match_profile: {
          userId: matchProfile.userId,
          interests: matchProfile.interests,
        },
      }, accessToken);

      return response as DateAskCoaching;
    } catch (error) {
      logger.error('Failed to get date ask coaching', { error, userId });
      return this.getFallbackDateCoaching(messages.length);
    }
  }

  /**
   * Dismiss a coaching tip (record that user saw it)
   */
  async dismissTip(userId: string, tipId: string): Promise<void> {
    // In production, store dismissed tips to avoid repetition
    logger.info('Tip dismissed', { userId, tipId });
  }

  /**
   * Make HTTP request to the coaching service
   */
  private async makeRequest(
    endpoint: string,
    body: Record<string, any>,
    accessToken: string
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.serviceUrl + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          logger.warn('Rate limited by coaching service');
          return null;
        }
        throw new Error('Coaching service error: ' + response.status);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        logger.warn('Coaching request timed out');
      }
      throw error;
    }
  }

  /**
   * Fallback coaching when service is unavailable
   */
  private getFallbackCoaching(messages: ConversationMessage[]): RealTimeCoachingResult {
    const messageCount = messages.length;
    const stage = messageCount < 5 ? 'opening' :
                  messageCount < 15 ? 'getting_to_know' :
                  messageCount < 25 ? 'building_rapport' : 'ready_for_date';

    const tips: CoachingTip[] = [];

    if (messageCount < 5) {
      tips.push({
        id: 'fallback_opening',
        type: 'conversation_starter',
        title: 'Start with curiosity',
        message: 'Ask about something specific from their profile!',
        priority: 1,
        dismissable: true,
      });
    } else if (messageCount >= 20) {
      tips.push({
        id: 'fallback_date',
        type: 'date_timing',
        title: 'Ready to meet?',
        message: 'You\'ve built good rapport. Consider suggesting a casual meetup!',
        priority: 1,
        dismissable: true,
      });
    }

    return {
      tips,
      health: {
        status: 'healthy',
        stage: stage as any,
        score: 70,
        strengths: [],
        areas_to_improve: [],
      },
      suggested_topics: [
        { topic: 'Weekend plans', type: 'general', prompt: 'Ask about their weekend!' },
      ],
      ghosting_risk: {
        risk_level: 'low',
        signals: [],
        recommendation: 'Keep being yourself!',
      },
      metrics: { message_count: messageCount },
      ready_to_ask_out: messageCount >= 20,
    };
  }

  /**
   * Fallback next message advice
   */
  private getFallbackNextMessageAdvice(messages: ConversationMessage[]): NextMessageAdvice {
    const lastMessage = messages[messages.length - 1];
    const isTheirTurn = lastMessage?.is_match;

    if (!isTheirTurn) {
      return {
        advice: 'Wait for their response before sending another message.',
        why: 'Sending multiple messages in a row can come across as too eager.',
        do: ['Be patient', 'Use this time to think of topics'],
        dont: ['Double text', 'Ask if they got your message'],
        example_responses: [],
        tone_suggestion: 'patient',
      };
    }

    return {
      advice: 'Respond to what they shared and ask a follow-up question.',
      why: 'This shows you\'re genuinely interested in getting to know them.',
      do: ['Reference something they said', 'Ask an open-ended question', 'Share something about yourself'],
      dont: ['Give one-word answers', 'Only talk about yourself', 'Be overly formal'],
      example_responses: [
        'That sounds really cool! How did you get into that?',
        'I love that! I\'ve always wanted to try something like that.',
      ],
      tone_suggestion: 'friendly',
    };
  }

  /**
   * Fallback date coaching
   */
  private getFallbackDateCoaching(messageCount: number): DateAskCoaching {
    if (messageCount < 15) {
      return {
        ready: false,
        readiness_score: messageCount / 30,
        why_not_yet: ['Not enough conversation history yet'],
        what_to_do_first: ['Exchange a few more messages', 'Find common interests'],
        estimated_messages_until_ready: 15 - messageCount,
      };
    }

    return {
      ready: true,
      readiness_score: 0.7,
      timing_advice: 'If the conversation is flowing well, now is a good time!',
      approach_suggestions: [
        'Casual: Suggest grabbing coffee',
        'Activity-based: Suggest doing something you both enjoy',
      ],
      venue_ideas: [
        'Coffee shop - low pressure',
        'Walk in the park - casual and relaxed',
      ],
      example_messages: [
        'I\'ve really enjoyed chatting! Would you want to grab coffee sometime?',
      ],
      what_to_avoid: [
        'Don\'t be vague - suggest something specific',
        'Don\'t pressure them',
      ],
    };
  }
}

// Export singleton instance
export const aiConversationCoachService = new AIConversationCoachService();
export default aiConversationCoachService;
