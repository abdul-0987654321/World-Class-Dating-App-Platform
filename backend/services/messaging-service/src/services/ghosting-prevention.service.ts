/**
 * Ghosting Prevention Service
 * Proactive re-engagement system for fading conversations
 *
 * Features:
 * - Risk assessment for conversations at risk of ghosting
 * - Signal detection for early warning signs
 * - Re-engagement suggestion generation
 * - Scheduled nudge system with notification integration
 * - Respects user preferences (quiet hours, nudge frequency)
 * - Feature-flagged for gradual rollout (starts at 0%)
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('ghosting-prevention-service');

// =============================================================================
// Types and Interfaces
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GhostingSignal {
  type: GhostingSignalType;
  weight: number;
  description: string;
  value?: number;
  threshold?: number;
}

export enum GhostingSignalType {
  TIME_SINCE_LAST_MESSAGE = 'time_since_last_message',
  MESSAGE_LENGTH_DECLINING = 'message_length_declining',
  RESPONSE_TIME_INCREASING = 'response_time_increasing',
  ONE_SIDED_CONVERSATION = 'one_sided_conversation',
  QUESTION_AVOIDANCE = 'question_avoidance',
  GENERIC_RESPONSES = 'generic_responses',
  ENGAGEMENT_DROP = 'engagement_drop',
  READ_BUT_NO_REPLY = 'read_but_no_reply',
}

export interface GhostingRiskAssessment {
  conversationId: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  signals: GhostingSignal[];
  daysSinceLastMessage: number;
  lastActiveUser: 'self' | 'match';
  assessedAt: Date;
  recommendedAction?: ReengagementSuggestion;
}

export type ReengagementType =
  | 'callback_shared_interest'
  | 'interesting_question'
  | 'gentle_checkin'
  | 'share_something'
  | 'suggest_activity';

export interface ReengagementSuggestion {
  id: string;
  type: ReengagementType;
  message: string;
  timing: ReengagementTiming;
  confidence: number; // 0-1
  context?: string;
  alternateMessages?: string[];
}

export interface ReengagementTiming {
  optimalSendTime: Date;
  urgency: 'low' | 'medium' | 'high';
  daysUntilCritical: number;
}

export type PreventionActionType =
  | 'nudge_to_reply'
  | 'suggestion_prompt'
  | 'conversation_tip'
  | 'activity_reminder';

export interface PreventionAction {
  id: string;
  conversationId: string;
  userId: string;
  actionType: PreventionActionType;
  content: string;
  suggestion?: ReengagementSuggestion;
  scheduledFor: Date;
  createdAt: Date;
  status: 'pending' | 'sent' | 'cancelled' | 'expired';
  metadata?: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  readAt?: Date;
  messageLength: number;
}

export interface UserProfile {
  userId: string;
  firstName?: string;
  interests?: string[];
  bio?: string;
  occupation?: string;
  lastActive?: Date;
}

export interface ConversationData {
  conversationId: string;
  userId: string;
  matchId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  lastMessageAt?: Date;
}

export interface UserNotificationPreferences {
  userId: string;
  reengagementNudgesEnabled: boolean;
  maxNudgesPerDay: number;
  maxNudgesPerConversation: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface AtRiskConversation {
  conversationId: string;
  matchId: string;
  matchName?: string;
  assessment: GhostingRiskAssessment;
  suggestedAction?: ReengagementSuggestion;
}

// =============================================================================
// Feature Flag
// =============================================================================

// Feature flag check - starts at 0% rollout
function isFeatureEnabled(userId: string): boolean {
  // In production: return featureFlags.isEnabled('engagementFeatures', 'ghostingPrevention', { userId });
  // 0% rollout - disabled for all users until ready
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  // 0% rollout - change this to gradually increase
  return Math.abs(hash) % 100 < 0;
}

// =============================================================================
// Constants
// =============================================================================

const RISK_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 90,
};

const SIGNAL_WEIGHTS = {
  [GhostingSignalType.TIME_SINCE_LAST_MESSAGE]: 25,
  [GhostingSignalType.MESSAGE_LENGTH_DECLINING]: 15,
  [GhostingSignalType.RESPONSE_TIME_INCREASING]: 15,
  [GhostingSignalType.ONE_SIDED_CONVERSATION]: 20,
  [GhostingSignalType.QUESTION_AVOIDANCE]: 10,
  [GhostingSignalType.GENERIC_RESPONSES]: 10,
  [GhostingSignalType.ENGAGEMENT_DROP]: 10,
  [GhostingSignalType.READ_BUT_NO_REPLY]: 15,
};

const TIME_THRESHOLDS = {
  DAYS_FOR_MEDIUM_RISK: 2,
  DAYS_FOR_HIGH_RISK: 4,
  DAYS_FOR_CRITICAL_RISK: 7,
};

const GENERIC_RESPONSES = [
  'ok',
  'k',
  'cool',
  'nice',
  'lol',
  'haha',
  'yeah',
  'yea',
  'yep',
  'sure',
  'sounds good',
  'maybe',
  'idk',
  'i guess',
  'mhm',
  'hmm',
];

const MAX_NUDGES_PER_DAY_DEFAULT = 3;
const MAX_NUDGES_PER_CONVERSATION_DEFAULT = 1;
const MIN_HOURS_BETWEEN_NUDGES = 12;

// =============================================================================
// Ghosting Prevention Service Class
// =============================================================================

export class GhostingPreventionService {
  private scheduledActions: Map<string, PreventionAction> = new Map();
  private nudgeHistory: Map<string, Date[]> = new Map(); // userId -> nudge timestamps

  constructor() {
    logger.info('GhostingPreventionService initialized');
  }

  /**
   * Check if ghosting prevention is enabled for a user
   */
  isEnabled(userId: string): boolean {
    return isFeatureEnabled(userId);
  }

  /**
   * Assess the ghosting risk for a conversation
   */
  async assessGhostingRisk(
    conversation: ConversationData,
    userId: string
  ): Promise<GhostingRiskAssessment> {
    logger.info('Assessing ghosting risk', {
      conversationId: conversation.conversationId,
      userId,
    });

    // Detect risk signals
    const signals = this.detectRiskSignals(conversation.messages, userId);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(signals);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Calculate days since last message
    const daysSinceLastMessage = this.calculateDaysSinceLastMessage(
      conversation.lastMessageAt
    );

    // Determine who sent the last message
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const lastActiveUser: 'self' | 'match' =
      lastMessage?.senderId === userId ? 'self' : 'match';

    const assessment: GhostingRiskAssessment = {
      conversationId: conversation.conversationId,
      riskLevel,
      riskScore,
      signals,
      daysSinceLastMessage,
      lastActiveUser,
      assessedAt: new Date(),
    };

    logger.debug('Risk assessment completed', {
      conversationId: conversation.conversationId,
      riskLevel,
      riskScore,
      signalCount: signals.length,
    });

    return assessment;
  }

  /**
   * Detect risk signals from message history
   */
  detectRiskSignals(
    messages: ConversationMessage[],
    userId: string
  ): GhostingSignal[] {
    const signals: GhostingSignal[] = [];

    if (messages.length === 0) {
      return signals;
    }

    // Time since last message
    const timeSinceLastSignal = this.detectTimeSinceLastMessage(messages);
    if (timeSinceLastSignal) {
      signals.push(timeSinceLastSignal);
    }

    // Message length declining
    const lengthDeclineSignal = this.detectMessageLengthDecline(
      messages,
      userId
    );
    if (lengthDeclineSignal) {
      signals.push(lengthDeclineSignal);
    }

    // Response time increasing
    const responseTimeSignal = this.detectResponseTimeIncrease(messages, userId);
    if (responseTimeSignal) {
      signals.push(responseTimeSignal);
    }

    // One-sided conversation
    const oneSidedSignal = this.detectOneSidedConversation(messages, userId);
    if (oneSidedSignal) {
      signals.push(oneSidedSignal);
    }

    // Question avoidance
    const questionAvoidanceSignal = this.detectQuestionAvoidance(
      messages,
      userId
    );
    if (questionAvoidanceSignal) {
      signals.push(questionAvoidanceSignal);
    }

    // Generic responses
    const genericResponseSignal = this.detectGenericResponses(messages, userId);
    if (genericResponseSignal) {
      signals.push(genericResponseSignal);
    }

    // Read but no reply
    const readNoReplySignal = this.detectReadButNoReply(messages, userId);
    if (readNoReplySignal) {
      signals.push(readNoReplySignal);
    }

    return signals;
  }

  /**
   * Generate re-engagement suggestions based on conversation and profiles
   */
  async generateReengagementSuggestions(
    conversation: ConversationData,
    userProfile: UserProfile,
    matchProfile: UserProfile,
    assessment: GhostingRiskAssessment
  ): Promise<ReengagementSuggestion[]> {
    logger.info('Generating re-engagement suggestions', {
      conversationId: conversation.conversationId,
      riskLevel: assessment.riskLevel,
    });

    const suggestions: ReengagementSuggestion[] = [];

    // Find shared interests
    const sharedInterests = this.findSharedInterests(
      userProfile.interests || [],
      matchProfile.interests || []
    );

    // Calculate optimal timing
    const timing = this.calculateOptimalTiming(assessment);

    // 1. Callback to shared interest (if available)
    if (sharedInterests.length > 0) {
      const interest = sharedInterests[0];
      suggestions.push({
        id: this.generateId(),
        type: 'callback_shared_interest',
        message: this.generateSharedInterestMessage(interest, matchProfile),
        timing,
        confidence: 0.85,
        context: `Shared interest: ${interest}`,
        alternateMessages: this.generateAlternateSharedInterestMessages(
          interest,
          matchProfile
        ),
      });
    }

    // 2. Interesting question prompt
    suggestions.push({
      id: this.generateId(),
      type: 'interesting_question',
      message: this.generateInterestingQuestion(matchProfile, conversation),
      timing,
      confidence: 0.8,
      alternateMessages: this.generateAlternateQuestions(matchProfile),
    });

    // 3. Gentle check-in message
    suggestions.push({
      id: this.generateId(),
      type: 'gentle_checkin',
      message: this.generateGentleCheckin(matchProfile),
      timing,
      confidence: 0.75,
      alternateMessages: [
        `Hey ${matchProfile.firstName || 'there'}! How's your week going?`,
        `Hi! I was just thinking about our chat. How have you been?`,
        `Hey! Hope things are going well on your end!`,
      ],
    });

    // 4. Share something relevant
    if (matchProfile.interests && matchProfile.interests.length > 0) {
      suggestions.push({
        id: this.generateId(),
        type: 'share_something',
        message: this.generateShareSomething(matchProfile),
        timing,
        confidence: 0.7,
        context: `Related to their interest in ${matchProfile.interests[0]}`,
      });
    }

    // 5. Suggest activity/date (for high-risk established conversations)
    if (
      assessment.riskLevel === 'high' ||
      assessment.riskLevel === 'critical'
    ) {
      if (conversation.messages.length >= 10) {
        suggestions.push({
          id: this.generateId(),
          type: 'suggest_activity',
          message: this.generateActivitySuggestion(
            matchProfile,
            sharedInterests
          ),
          timing: {
            ...timing,
            urgency: 'high',
          },
          confidence: 0.65,
          alternateMessages: this.generateAlternateActivitySuggestions(
            matchProfile,
            sharedInterests
          ),
        });
      }
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    logger.debug('Generated suggestions', {
      conversationId: conversation.conversationId,
      suggestionCount: suggestions.length,
    });

    return suggestions;
  }

  /**
   * Schedule a re-engagement nudge for a conversation
   */
  async scheduleReengagementNudge(
    conversationId: string,
    userId: string,
    suggestion: ReengagementSuggestion,
    preferences?: UserNotificationPreferences
  ): Promise<PreventionAction | null> {
    logger.info('Scheduling re-engagement nudge', {
      conversationId,
      userId,
      suggestionType: suggestion.type,
    });

    // Check if nudges are enabled for user
    if (preferences && !preferences.reengagementNudgesEnabled) {
      logger.debug('Nudges disabled for user', { userId });
      return null;
    }

    // Check nudge frequency limits
    if (!this.canSendNudge(userId, conversationId, preferences)) {
      logger.debug('Nudge frequency limit reached', { userId, conversationId });
      return null;
    }

    // Calculate scheduled time (respecting quiet hours)
    const scheduledFor = await this.calculateScheduledTime(
      suggestion.timing.optimalSendTime,
      preferences
    );

    const action: PreventionAction = {
      id: this.generateId(),
      conversationId,
      userId,
      actionType: 'suggestion_prompt',
      content: suggestion.message,
      suggestion,
      scheduledFor,
      createdAt: new Date(),
      status: 'pending',
      metadata: {
        suggestionType: suggestion.type,
        confidence: suggestion.confidence,
        urgency: suggestion.timing.urgency,
      },
    };

    // Store the scheduled action
    this.scheduledActions.set(action.id, action);

    // Record nudge in history
    this.recordNudge(userId);

    logger.info('Nudge scheduled', {
      actionId: action.id,
      conversationId,
      scheduledFor,
    });

    return action;
  }

  /**
   * Get all conversations at risk for a user
   */
  async getAtRiskConversations(
    userId: string,
    conversations: ConversationData[],
    matchProfiles: Map<string, UserProfile>
  ): Promise<AtRiskConversation[]> {
    logger.info('Getting at-risk conversations', {
      userId,
      conversationCount: conversations.length,
    });

    const atRiskConversations: AtRiskConversation[] = [];

    for (const conversation of conversations) {
      const assessment = await this.assessGhostingRisk(conversation, userId);

      // Only include medium risk and above
      if (
        assessment.riskLevel === 'medium' ||
        assessment.riskLevel === 'high' ||
        assessment.riskLevel === 'critical'
      ) {
        const matchProfile = matchProfiles.get(conversation.matchId);

        const atRiskConvo: AtRiskConversation = {
          conversationId: conversation.conversationId,
          matchId: conversation.matchId,
          matchName: matchProfile?.firstName,
          assessment,
        };

        // Generate top suggestion for high-risk conversations
        if (
          assessment.riskLevel === 'high' ||
          assessment.riskLevel === 'critical'
        ) {
          const userProfile: UserProfile = { userId };
          const suggestions = await this.generateReengagementSuggestions(
            conversation,
            userProfile,
            matchProfile || { userId: conversation.matchId },
            assessment
          );

          if (suggestions.length > 0) {
            atRiskConvo.suggestedAction = suggestions[0];
          }
        }

        atRiskConversations.push(atRiskConvo);
      }
    }

    // Sort by risk score (highest first)
    atRiskConversations.sort(
      (a, b) => b.assessment.riskScore - a.assessment.riskScore
    );

    logger.info('At-risk conversations identified', {
      userId,
      atRiskCount: atRiskConversations.length,
    });

    return atRiskConversations;
  }

  /**
   * Cancel a scheduled action
   */
  cancelScheduledAction(actionId: string): boolean {
    const action = this.scheduledActions.get(actionId);
    if (action && action.status === 'pending') {
      action.status = 'cancelled';
      this.scheduledActions.set(actionId, action);
      logger.info('Action cancelled', { actionId });
      return true;
    }
    return false;
  }

  /**
   * Get pending actions for a user
   */
  getPendingActions(userId: string): PreventionAction[] {
    const pending: PreventionAction[] = [];
    for (const action of this.scheduledActions.values()) {
      if (action.userId === userId && action.status === 'pending') {
        pending.push(action);
      }
    }
    return pending.sort(
      (a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()
    );
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private detectTimeSinceLastMessage(
    messages: ConversationMessage[]
  ): GhostingSignal | null {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return null;

    const daysSince = this.calculateDaysSinceLastMessage(lastMessage.timestamp);

    if (daysSince >= TIME_THRESHOLDS.DAYS_FOR_MEDIUM_RISK) {
      const weight =
        daysSince >= TIME_THRESHOLDS.DAYS_FOR_CRITICAL_RISK
          ? SIGNAL_WEIGHTS[GhostingSignalType.TIME_SINCE_LAST_MESSAGE]
          : daysSince >= TIME_THRESHOLDS.DAYS_FOR_HIGH_RISK
            ? SIGNAL_WEIGHTS[GhostingSignalType.TIME_SINCE_LAST_MESSAGE] * 0.75
            : SIGNAL_WEIGHTS[GhostingSignalType.TIME_SINCE_LAST_MESSAGE] * 0.5;

      return {
        type: GhostingSignalType.TIME_SINCE_LAST_MESSAGE,
        weight,
        description: `No messages for ${daysSince} day${daysSince !== 1 ? 's' : ''}`,
        value: daysSince,
        threshold: TIME_THRESHOLDS.DAYS_FOR_MEDIUM_RISK,
      };
    }

    return null;
  }

  private detectMessageLengthDecline(
    messages: ConversationMessage[],
    matchId: string
  ): GhostingSignal | null {
    // Get match's messages
    const matchMessages = messages.filter((m) => m.senderId === matchId);
    if (matchMessages.length < 5) return null;

    // Compare first half vs second half average length
    const halfIndex = Math.floor(matchMessages.length / 2);
    const firstHalf = matchMessages.slice(0, halfIndex);
    const secondHalf = matchMessages.slice(halfIndex);

    const firstHalfAvg =
      firstHalf.reduce((sum, m) => sum + m.messageLength, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, m) => sum + m.messageLength, 0) /
      secondHalf.length;

    const declinePercent = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;

    if (declinePercent > 30) {
      return {
        type: GhostingSignalType.MESSAGE_LENGTH_DECLINING,
        weight:
          SIGNAL_WEIGHTS[GhostingSignalType.MESSAGE_LENGTH_DECLINING] *
          Math.min(declinePercent / 50, 1),
        description: `Message length declined by ${Math.round(declinePercent)}%`,
        value: declinePercent,
        threshold: 30,
      };
    }

    return null;
  }

  private detectResponseTimeIncrease(
    messages: ConversationMessage[],
    userId: string
  ): GhostingSignal | null {
    const responseTimes: number[] = [];

    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1];
      const curr = messages[i];

      // If this is the match responding to user
      if (prev.senderId === userId && curr.senderId !== userId) {
        const responseTime =
          (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60); // minutes
        responseTimes.push(responseTime);
      }
    }

    if (responseTimes.length < 3) return null;

    // Compare first half vs second half
    const halfIndex = Math.floor(responseTimes.length / 2);
    const firstHalfAvg =
      responseTimes.slice(0, halfIndex).reduce((a, b) => a + b, 0) / halfIndex;
    const secondHalfAvg =
      responseTimes.slice(halfIndex).reduce((a, b) => a + b, 0) /
      (responseTimes.length - halfIndex);

    const increasePercent =
      ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    if (increasePercent > 50) {
      return {
        type: GhostingSignalType.RESPONSE_TIME_INCREASING,
        weight:
          SIGNAL_WEIGHTS[GhostingSignalType.RESPONSE_TIME_INCREASING] *
          Math.min(increasePercent / 100, 1),
        description: `Response time increased by ${Math.round(increasePercent)}%`,
        value: increasePercent,
        threshold: 50,
      };
    }

    return null;
  }

  private detectOneSidedConversation(
    messages: ConversationMessage[],
    userId: string
  ): GhostingSignal | null {
    const recentMessages = messages.slice(-10);
    if (recentMessages.length < 5) return null;

    const userMessages = recentMessages.filter((m) => m.senderId === userId);
    const ratio = userMessages.length / recentMessages.length;

    if (ratio > 0.7) {
      return {
        type: GhostingSignalType.ONE_SIDED_CONVERSATION,
        weight:
          SIGNAL_WEIGHTS[GhostingSignalType.ONE_SIDED_CONVERSATION] *
          ((ratio - 0.5) / 0.5),
        description: `Conversation is ${Math.round(ratio * 100)}% one-sided`,
        value: ratio * 100,
        threshold: 70,
      };
    }

    return null;
  }

  private detectQuestionAvoidance(
    messages: ConversationMessage[],
    userId: string
  ): GhostingSignal | null {
    // Find user's questions
    const userQuestions = messages.filter(
      (m) => m.senderId === userId && m.content.includes('?')
    );
    if (userQuestions.length < 2) return null;

    // Check if match responds with questions (engagement) or avoids
    let questionsAvoided = 0;
    for (const question of userQuestions) {
      const questionIndex = messages.indexOf(question);
      const nextMessage = messages[questionIndex + 1];

      if (nextMessage && nextMessage.senderId !== userId) {
        // Check if response is short or doesn't engage
        if (
          nextMessage.messageLength < 20 ||
          !nextMessage.content.includes('?')
        ) {
          questionsAvoided++;
        }
      }
    }

    const avoidanceRate = questionsAvoided / userQuestions.length;

    if (avoidanceRate > 0.5) {
      return {
        type: GhostingSignalType.QUESTION_AVOIDANCE,
        weight:
          SIGNAL_WEIGHTS[GhostingSignalType.QUESTION_AVOIDANCE] * avoidanceRate,
        description: `${Math.round(avoidanceRate * 100)}% of questions not fully engaged with`,
        value: avoidanceRate * 100,
        threshold: 50,
      };
    }

    return null;
  }

  private detectGenericResponses(
    messages: ConversationMessage[],
    userId: string
  ): GhostingSignal | null {
    const matchMessages = messages
      .filter((m) => m.senderId !== userId)
      .slice(-10);
    if (matchMessages.length < 3) return null;

    let genericCount = 0;
    for (const msg of matchMessages) {
      const lowerContent = msg.content.toLowerCase().trim();
      if (GENERIC_RESPONSES.includes(lowerContent) || lowerContent.length < 5) {
        genericCount++;
      }
    }

    const genericRate = genericCount / matchMessages.length;

    if (genericRate > 0.4) {
      return {
        type: GhostingSignalType.GENERIC_RESPONSES,
        weight:
          SIGNAL_WEIGHTS[GhostingSignalType.GENERIC_RESPONSES] * genericRate,
        description: `${Math.round(genericRate * 100)}% of recent responses are generic`,
        value: genericRate * 100,
        threshold: 40,
      };
    }

    return null;
  }

  private detectReadButNoReply(
    messages: ConversationMessage[],
    userId: string
  ): GhostingSignal | null {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.senderId !== userId) return null;

    // Check if message was read but not replied to
    if (lastMessage.readAt) {
      const hoursSinceRead =
        (Date.now() - lastMessage.readAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceRead > 24) {
        return {
          type: GhostingSignalType.READ_BUT_NO_REPLY,
          weight:
            SIGNAL_WEIGHTS[GhostingSignalType.READ_BUT_NO_REPLY] *
            Math.min(hoursSinceRead / 72, 1),
          description: `Message read ${Math.round(hoursSinceRead)} hours ago with no reply`,
          value: hoursSinceRead,
          threshold: 24,
        };
      }
    }

    return null;
  }

  private calculateRiskScore(signals: GhostingSignal[]): number {
    const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
    return Math.min(Math.round(totalWeight), 100);
  }

  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) return 'critical';
    if (riskScore >= RISK_THRESHOLDS.HIGH) return 'high';
    if (riskScore >= RISK_THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }

  private calculateDaysSinceLastMessage(lastMessageAt?: Date): number {
    if (!lastMessageAt) return 0;
    const now = new Date();
    const diffMs = now.getTime() - lastMessageAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private findSharedInterests(
    userInterests: string[],
    matchInterests: string[]
  ): string[] {
    const userSet = new Set(userInterests.map((i) => i.toLowerCase()));
    return matchInterests.filter((i) => userSet.has(i.toLowerCase()));
  }

  private calculateOptimalTiming(
    assessment: GhostingRiskAssessment
  ): ReengagementTiming {
    const now = new Date();
    let optimalSendTime = new Date(now);
    let urgency: 'low' | 'medium' | 'high' = 'low';
    let daysUntilCritical = 7;

    switch (assessment.riskLevel) {
      case 'critical':
        // Send within the hour
        optimalSendTime.setHours(optimalSendTime.getHours() + 1);
        urgency = 'high';
        daysUntilCritical = 0;
        break;
      case 'high':
        // Send within 4 hours
        optimalSendTime.setHours(optimalSendTime.getHours() + 4);
        urgency = 'high';
        daysUntilCritical = 2;
        break;
      case 'medium':
        // Send tomorrow at a good time (10am)
        optimalSendTime.setDate(optimalSendTime.getDate() + 1);
        optimalSendTime.setHours(10, 0, 0, 0);
        urgency = 'medium';
        daysUntilCritical = 5;
        break;
      default:
        // Send in 2 days
        optimalSendTime.setDate(optimalSendTime.getDate() + 2);
        optimalSendTime.setHours(10, 0, 0, 0);
        daysUntilCritical = 7;
    }

    return {
      optimalSendTime,
      urgency,
      daysUntilCritical,
    };
  }

  private generateSharedInterestMessage(
    interest: string,
    matchProfile: UserProfile
  ): string {
    const name = matchProfile.firstName || 'there';
    const templates = [
      `Hey ${name}! I just saw something about ${interest} and thought of our conversation. Have you tried anything new with it lately?`,
      `Hi ${name}! Random thought - since we both love ${interest}, have you discovered anything good recently?`,
      `Hey ${name}! Speaking of ${interest} - I'd love to hear what you've been up to with it!`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateAlternateSharedInterestMessages(
    interest: string,
    matchProfile: UserProfile
  ): string[] {
    const name = matchProfile.firstName || 'there';
    return [
      `Hey ${name}! Been thinking about ${interest} - would love to hear your take on it!`,
      `Hi ${name}! Curious - what got you into ${interest} in the first place?`,
      `Hey! As a fellow ${interest} fan, I'd love to hear about your favorites!`,
    ];
  }

  private generateInterestingQuestion(
    matchProfile: UserProfile,
    _conversation: ConversationData
  ): string {
    const name = matchProfile.firstName || 'there';
    const questions = [
      `Hey ${name}! Random question - what's the best thing that happened to you this week?`,
      `Hi ${name}! I'm curious - if you could learn any new skill instantly, what would it be?`,
      `Hey ${name}! What's something you're looking forward to right now?`,
      `Hi ${name}! I'd love to know - what's your go-to way to unwind after a long day?`,
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  private generateAlternateQuestions(matchProfile: UserProfile): string[] {
    const name = matchProfile.firstName || 'there';
    return [
      `Hey ${name}! What's been on your mind lately?`,
      `Hi ${name}! Anything exciting happening in your world?`,
      `Hey ${name}! What's something that made you smile recently?`,
    ];
  }

  private generateGentleCheckin(matchProfile: UserProfile): string {
    const name = matchProfile.firstName || 'there';
    const checkins = [
      `Hey ${name}! Just wanted to check in - how are you doing?`,
      `Hi ${name}! Been a little while - hope everything's going well!`,
      `Hey ${name}! How's life treating you?`,
    ];
    return checkins[Math.floor(Math.random() * checkins.length)];
  }

  private generateShareSomething(matchProfile: UserProfile): string {
    const name = matchProfile.firstName || 'there';
    const interest =
      matchProfile.interests && matchProfile.interests.length > 0
        ? matchProfile.interests[0]
        : 'something interesting';

    return `Hey ${name}! I just came across something about ${interest} that made me think of you - would love to share it with you!`;
  }

  private generateActivitySuggestion(
    matchProfile: UserProfile,
    sharedInterests: string[]
  ): string {
    const name = matchProfile.firstName || 'there';

    if (sharedInterests.length > 0) {
      const interest = sharedInterests[0];
      return `Hey ${name}! I've been thinking - since we're both into ${interest}, would you want to grab coffee sometime and chat about it in person?`;
    }

    return `Hey ${name}! I've really enjoyed our conversations. Would you be up for meeting for coffee sometime?`;
  }

  private generateAlternateActivitySuggestions(
    matchProfile: UserProfile,
    sharedInterests: string[]
  ): string[] {
    const name = matchProfile.firstName || 'there';
    const suggestions = [
      `Hey ${name}! Would you want to grab a drink sometime? I feel like our chats would be even better in person!`,
      `Hi ${name}! I've been meaning to ask - would you be interested in meeting up?`,
    ];

    if (sharedInterests.length > 0) {
      suggestions.push(
        `Hey ${name}! There's a great ${sharedInterests[0]} spot I know - would you want to check it out together?`
      );
    }

    return suggestions;
  }

  private canSendNudge(
    userId: string,
    conversationId: string,
    preferences?: UserNotificationPreferences
  ): boolean {
    const maxPerDay = preferences?.maxNudgesPerDay || MAX_NUDGES_PER_DAY_DEFAULT;
    const maxPerConvo =
      preferences?.maxNudgesPerConversation ||
      MAX_NUDGES_PER_CONVERSATION_DEFAULT;

    // Check daily limit
    const todayNudges = this.getNudgesToday(userId);
    if (todayNudges >= maxPerDay) {
      return false;
    }

    // Check per-conversation limit
    const convoNudges = this.getNudgesForConversation(userId, conversationId);
    if (convoNudges >= maxPerConvo) {
      return false;
    }

    // Check minimum time between nudges
    const lastNudge = this.getLastNudgeTime(userId);
    if (lastNudge) {
      const hoursSinceLastNudge =
        (Date.now() - lastNudge.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastNudge < MIN_HOURS_BETWEEN_NUDGES) {
        return false;
      }
    }

    return true;
  }

  private getNudgesToday(userId: string): number {
    const history = this.nudgeHistory.get(userId) || [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return history.filter((date) => date >= todayStart).length;
  }

  private getNudgesForConversation(
    _userId: string,
    _conversationId: string
  ): number {
    // In production, this would query the database
    // For now, return 0 to allow nudges
    return 0;
  }

  private getLastNudgeTime(userId: string): Date | null {
    const history = this.nudgeHistory.get(userId) || [];
    if (history.length === 0) return null;
    return history[history.length - 1];
  }

  private recordNudge(userId: string): void {
    const history = this.nudgeHistory.get(userId) || [];
    history.push(new Date());
    this.nudgeHistory.set(userId, history);
  }

  private async calculateScheduledTime(
    optimalTime: Date,
    preferences?: UserNotificationPreferences
  ): Promise<Date> {
    // In production, this would integrate with QuietHoursService
    // For now, return the optimal time or adjust for quiet hours

    if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
      return optimalTime;
    }

    const [startHour] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour] = preferences.quietHoursEnd.split(':').map(Number);
    const optimalHour = optimalTime.getHours();

    // Check if optimal time is during quiet hours
    const isQuietHours =
      startHour > endHour
        ? optimalHour >= startHour || optimalHour < endHour // Spans midnight
        : optimalHour >= startHour && optimalHour < endHour;

    if (isQuietHours) {
      // Schedule for end of quiet hours
      const adjustedTime = new Date(optimalTime);
      adjustedTime.setHours(endHour, 0, 0, 0);
      if (adjustedTime <= optimalTime) {
        adjustedTime.setDate(adjustedTime.getDate() + 1);
      }
      return adjustedTime;
    }

    return optimalTime;
  }

  private generateId(): string {
    return 'gp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }
}

// Export singleton instance
export const ghostingPreventionService = new GhostingPreventionService();
export default ghostingPreventionService;
