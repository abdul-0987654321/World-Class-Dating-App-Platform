/**
 * Conversation Momentum Analyzer Service
 *
 * Tracks conversation momentum in real-time, alerting users when conversations
 * are gaining or losing steam, with tips to maintain momentum.
 *
 * Features:
 * - Real-time momentum scoring (0-100)
 * - Trend analysis (rising, stable, falling)
 * - Momentum shift detection
 * - Actionable alerts and suggestions
 * - Historical momentum tracking
 */

import { Message } from '../types';
import { createLogger } from '../utils/logger';
import redisClient from '../infrastructure/cache/redis';
import { FeatureFlagService } from '@flamoral/backend-shared';

const logger = createLogger('conversation-momentum-service');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MomentumTrend = 'rising' | 'stable' | 'falling';

export type MomentumAlertType =
  | 'momentum_rising'
  | 'momentum_peak'
  | 'momentum_dropping'
  | 'momentum_critical';

export interface MomentumScore {
  /** Current momentum score (0-100) */
  score: number;
  /** Current trend direction */
  trend: MomentumTrend;
  /** Rate of change per hour (-100 to +100) */
  velocity: number;
}

export interface MomentumFactors {
  /** Average response time in seconds (lower is better) */
  responseTime: number;
  /** Average message length in characters */
  messageLength: number;
  /** Ratio of questions to total messages (0-1) */
  questionRatio: number;
  /** Emoji usage frequency (0-1) */
  emojiUsage: number;
  /** Topic variety score (0-1, higher means more diverse topics) */
  topicVariety: number;
  /** Balance of messages between participants (0-1, 1 = perfect balance) */
  reciprocity: number;
  /** Messages per hour rate */
  messageRate: number;
}

export interface MomentumAlert {
  /** Alert type identifier */
  type: MomentumAlertType;
  /** Human-readable alert message */
  message: string;
  /** Actionable suggestion for the user */
  suggestion: string;
  /** Urgency level (1-5, 5 being most urgent) */
  urgency: number;
  /** Timestamp when alert was generated */
  timestamp: Date;
}

export interface MomentumHistoryEntry {
  /** Momentum score at this point */
  score: number;
  /** Trend at this point */
  trend: MomentumTrend;
  /** Timestamp of this entry */
  timestamp: Date;
}

export interface ConversationMomentum {
  /** Conversation ID */
  conversationId: string;
  /** Current momentum score (0-100) */
  currentScore: number;
  /** Current trend direction */
  trend: MomentumTrend;
  /** Score velocity (rate of change) */
  velocity: number;
  /** Detailed momentum factors */
  factors: MomentumFactors;
  /** Historical momentum scores */
  history: MomentumHistoryEntry[];
  /** Active alerts */
  alerts: MomentumAlert[];
  /** Last calculation timestamp */
  calculatedAt: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Scoring weights (must sum to 1.0)
  weights: {
    responseTime: 0.25,
    messageLength: 0.15,
    questionRatio: 0.15,
    emojiUsage: 0.1,
    topicVariety: 0.1,
    reciprocity: 0.15,
    messageRate: 0.1,
  },

  // Time decay for message relevance (in hours)
  messageDecayHours: 24,

  // Thresholds
  thresholds: {
    // Response time thresholds (seconds)
    responseTime: {
      excellent: 60, // < 1 minute
      good: 300, // < 5 minutes
      average: 1800, // < 30 minutes
      slow: 3600, // < 1 hour
    },
    // Message length thresholds (characters)
    messageLength: {
      tooShort: 10,
      optimal: 50,
      long: 200,
    },
    // Momentum score thresholds
    momentum: {
      peak: 80,
      rising: 60,
      stable: 40,
      dropping: 25,
      critical: 15,
    },
    // Trend detection thresholds
    trend: {
      risingVelocity: 5, // points per hour
      fallingVelocity: -5,
    },
    // Shift detection (significant change)
    shiftThreshold: 15,
  },

  // Cache settings
  cache: {
    keyPrefix: 'momentum:',
    historyKeyPrefix: 'momentum:history:',
    ttlSeconds: 3600, // 1 hour
    historyMaxEntries: 100,
  },
};

// ============================================================================
// CONVERSATION MOMENTUM SERVICE
// ============================================================================

export class ConversationMomentumService {
  private featureFlags: FeatureFlagService;

  constructor(featureFlags?: FeatureFlagService) {
    this.featureFlags = featureFlags || new FeatureFlagService();
  }

  /**
   * Calculate real-time momentum score for a conversation
   */
  async calculateMomentum(
    conversationId: string,
    messages: Message[],
    userId?: string
  ): Promise<ConversationMomentum> {
    // Check feature flag
    if (!this.isFeatureEnabled(userId)) {
      return this.createDefaultMomentum(conversationId);
    }

    try {
      // Sort messages by time (newest first for recent weighting)
      const sortedMessages = [...messages].sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );

      // Calculate individual factors
      const factors = this.calculateFactors(sortedMessages);

      // Calculate weighted score
      const score = this.calculateWeightedScore(factors);

      // Get previous momentum for trend analysis
      const previousMomentum = await this.getCachedMomentum(conversationId);

      // Analyze trend
      const history = await this.getMomentumHistory(conversationId, 24);
      const trend = this.analyzeTrend(history, score);

      // Calculate velocity
      const velocity = this.calculateVelocity(history, score);

      // Generate alerts
      const alerts = this.generateMomentumAlerts(
        {
          conversationId,
          currentScore: score,
          trend,
          velocity,
          factors,
          history,
          alerts: [],
          calculatedAt: new Date(),
        },
        previousMomentum
      );

      // Build momentum object
      const momentum: ConversationMomentum = {
        conversationId,
        currentScore: Math.round(score * 10) / 10,
        trend,
        velocity: Math.round(velocity * 10) / 10,
        factors,
        history: history.slice(0, 10), // Return last 10 entries
        alerts,
        calculatedAt: new Date(),
      };

      // Cache the result
      await this.cacheMomentum(momentum);

      // Store in history
      await this.addToHistory(conversationId, {
        score: momentum.currentScore,
        trend,
        timestamp: new Date(),
      });

      logger.debug('Momentum calculated', {
        conversationId,
        score: momentum.currentScore,
        trend,
        alertCount: alerts.length,
      });

      return momentum;
    } catch (error: any) {
      logger.error('Failed to calculate momentum', { conversationId, error: error.message });
      return this.createDefaultMomentum(conversationId);
    }
  }

  /**
   * Analyze trend from score history
   */
  analyzeTrend(scoreHistory: MomentumHistoryEntry[], currentScore: number): MomentumTrend {
    if (scoreHistory.length < 2) {
      return 'stable';
    }

    // Calculate recent trend using linear regression on last 5 entries
    const recentEntries = scoreHistory.slice(0, 5);
    const scores = recentEntries.map((e) => e.score);
    const avgRecentScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const scoreDiff = currentScore - avgRecentScore;

    if (scoreDiff > CONFIG.thresholds.trend.risingVelocity) {
      return 'rising';
    } else if (scoreDiff < CONFIG.thresholds.trend.fallingVelocity) {
      return 'falling';
    }

    return 'stable';
  }

  /**
   * Detect significant momentum shifts
   */
  detectMomentumShift(
    previous: ConversationMomentum | null,
    current: ConversationMomentum
  ): {
    hasShift: boolean;
    direction: 'positive' | 'negative' | 'none';
    magnitude: number;
  } {
    if (!previous) {
      return { hasShift: false, direction: 'none', magnitude: 0 };
    }

    const scoreDiff = current.currentScore - previous.currentScore;
    const magnitude = Math.abs(scoreDiff);

    if (magnitude >= CONFIG.thresholds.shiftThreshold) {
      return {
        hasShift: true,
        direction: scoreDiff > 0 ? 'positive' : 'negative',
        magnitude,
      };
    }

    return { hasShift: false, direction: 'none', magnitude };
  }

  /**
   * Generate actionable alerts based on momentum state
   */
  generateMomentumAlerts(
    momentum: ConversationMomentum,
    previousMomentum?: ConversationMomentum | null
  ): MomentumAlert[] {
    const alerts: MomentumAlert[] = [];
    const { currentScore, trend, velocity, factors } = momentum;

    // Check for momentum peak (great time to ask for date)
    if (currentScore >= CONFIG.thresholds.momentum.peak && trend === 'rising') {
      alerts.push({
        type: 'momentum_peak',
        message: 'Conversation is at peak engagement!',
        suggestion: 'This is a great time to suggest meeting up or take the conversation deeper.',
        urgency: 3,
        timestamp: new Date(),
      });
    }
    // Check for rising momentum
    else if (currentScore >= CONFIG.thresholds.momentum.rising && trend === 'rising') {
      alerts.push({
        type: 'momentum_rising',
        message: 'Conversation is heating up!',
        suggestion: 'Keep the energy going with thoughtful questions and genuine interest.',
        urgency: 2,
        timestamp: new Date(),
      });
    }
    // Check for dropping momentum
    else if (
      currentScore <= CONFIG.thresholds.momentum.dropping &&
      (trend === 'falling' || velocity < -3)
    ) {
      alerts.push({
        type: 'momentum_dropping',
        message: 'Conversation momentum is declining',
        suggestion: this.getReEngagementSuggestion(factors),
        urgency: 4,
        timestamp: new Date(),
      });
    }
    // Check for critical momentum
    else if (currentScore <= CONFIG.thresholds.momentum.critical) {
      alerts.push({
        type: 'momentum_critical',
        message: 'Risk of conversation fading',
        suggestion: this.getCriticalRecoverySuggestion(factors),
        urgency: 5,
        timestamp: new Date(),
      });
    }

    // Check for significant shifts
    if (previousMomentum) {
      const shift = this.detectMomentumShift(previousMomentum, momentum);
      if (shift.hasShift && shift.direction === 'negative') {
        // Only add if not already covered by other alerts
        if (!alerts.some((a) => a.type === 'momentum_dropping' || a.type === 'momentum_critical')) {
          alerts.push({
            type: 'momentum_dropping',
            message: `Sudden drop in engagement detected (${Math.round(shift.magnitude)} points)`,
            suggestion: 'Try asking an open-ended question or sharing something personal.',
            urgency: 4,
            timestamp: new Date(),
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Get momentum history for a conversation
   */
  async getMomentumHistory(
    conversationId: string,
    hours: number = 24
  ): Promise<MomentumHistoryEntry[]> {
    try {
      const key = `${CONFIG.cache.historyKeyPrefix}${conversationId}`;
      const historyStr = await redisClient.getClient().get(key);

      if (!historyStr || typeof historyStr !== 'string') {
        return [];
      }

      const history: MomentumHistoryEntry[] = JSON.parse(historyStr);
      const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

      return history
        .filter((entry) => new Date(entry.timestamp).getTime() > cutoffTime)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error: any) {
      logger.error('Failed to get momentum history', { conversationId, error: error.message });
      return [];
    }
  }

  /**
   * Get current cached momentum (for comparison)
   */
  async getCachedMomentum(conversationId: string): Promise<ConversationMomentum | null> {
    try {
      const key = `${CONFIG.cache.keyPrefix}${conversationId}`;
      const cachedStr = await redisClient.getClient().get(key);

      if (!cachedStr || typeof cachedStr !== 'string') {
        return null;
      }

      return JSON.parse(cachedStr);
    } catch (error: any) {
      logger.error('Failed to get cached momentum', { conversationId, error: error.message });
      return null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS - FACTOR CALCULATIONS
  // ============================================================================

  /**
   * Calculate all momentum factors from messages
   */
  private calculateFactors(messages: Message[]): MomentumFactors {
    if (messages.length === 0) {
      return this.getDefaultFactors();
    }

    return {
      responseTime: this.calculateResponseTimeFactor(messages),
      messageLength: this.calculateMessageLengthFactor(messages),
      questionRatio: this.calculateQuestionRatioFactor(messages),
      emojiUsage: this.calculateEmojiUsageFactor(messages),
      topicVariety: this.calculateTopicVarietyFactor(messages),
      reciprocity: this.calculateReciprocityFactor(messages),
      messageRate: this.calculateMessageRateFactor(messages),
    };
  }

  /**
   * Calculate response time factor (0-1, higher is better)
   */
  private calculateResponseTimeFactor(messages: Message[]): number {
    if (messages.length < 2) {
      return 0.5; // Default mid-score
    }

    const responseTimes: number[] = [];
    const sortedByTime = [...messages].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );

    for (let i = 1; i < sortedByTime.length; i++) {
      // Only count responses (different senders)
      if (sortedByTime[i].senderId !== sortedByTime[i - 1].senderId) {
        const responseTime =
          (new Date(sortedByTime[i].sentAt).getTime() -
            new Date(sortedByTime[i - 1].sentAt).getTime()) /
          1000;

        // Apply time decay - recent messages weighted higher
        const hoursAgo =
          (Date.now() - new Date(sortedByTime[i].sentAt).getTime()) / (1000 * 60 * 60);
        const decayFactor = Math.exp(-hoursAgo / CONFIG.messageDecayHours);

        responseTimes.push(responseTime * (1 / (decayFactor + 0.1)));
      }
    }

    if (responseTimes.length === 0) {
      return 0.5;
    }

    // Calculate weighted average response time
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    // Convert to score (0-1)
    const { excellent, good, average, slow } = CONFIG.thresholds.responseTime;

    if (avgResponseTime <= excellent) return 1.0;
    if (avgResponseTime <= good) return 0.8;
    if (avgResponseTime <= average) return 0.6;
    if (avgResponseTime <= slow) return 0.4;
    return 0.2;
  }

  /**
   * Calculate message length factor (0-1, optimal length scores highest)
   */
  private calculateMessageLengthFactor(messages: Message[]): number {
    const lengths = messages
      .filter((m) => m.content && m.type === 'text')
      .map((m) => m.content.length);

    if (lengths.length === 0) {
      return 0.5;
    }

    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const { tooShort, optimal, long } = CONFIG.thresholds.messageLength;

    // Score based on optimal message length
    if (avgLength < tooShort) return 0.3;
    if (avgLength >= optimal && avgLength <= long) return 1.0;
    if (avgLength < optimal) return 0.5 + ((avgLength - tooShort) / (optimal - tooShort)) * 0.5;
    if (avgLength > long) return Math.max(0.6, 1.0 - (avgLength - long) / 500);

    return 0.7;
  }

  /**
   * Calculate question ratio factor (0-1)
   */
  private calculateQuestionRatioFactor(messages: Message[]): number {
    const textMessages = messages.filter((m) => m.content && m.type === 'text');

    if (textMessages.length === 0) {
      return 0.5;
    }

    const questionCount = textMessages.filter(
      (m) =>
        m.content.includes('?') ||
        /^(who|what|when|where|why|how|do you|are you|have you|will you|would you|could you)/i.test(
          m.content
        )
    ).length;

    const ratio = questionCount / textMessages.length;

    // Optimal question ratio is around 20-40%
    if (ratio >= 0.2 && ratio <= 0.4) return 1.0;
    if (ratio < 0.2) return 0.5 + ratio * 2.5;
    return Math.max(0.5, 1.0 - (ratio - 0.4) * 2);
  }

  /**
   * Calculate emoji usage factor (0-1)
   */
  private calculateEmojiUsageFactor(messages: Message[]): number {
    const textMessages = messages.filter((m) => m.content && m.type === 'text');

    if (textMessages.length === 0) {
      return 0.5;
    }

    // Regex to match common emojis
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

    let totalEmojis = 0;
    textMessages.forEach((m) => {
      const matches = m.content.match(emojiRegex);
      if (matches) {
        totalEmojis += matches.length;
      }
    });

    const emojiPerMessage = totalEmojis / textMessages.length;

    // Moderate emoji usage (0.5-2 per message) is optimal
    if (emojiPerMessage >= 0.5 && emojiPerMessage <= 2) return 1.0;
    if (emojiPerMessage < 0.5) return 0.6 + emojiPerMessage * 0.8;
    if (emojiPerMessage > 2) return Math.max(0.5, 1.0 - (emojiPerMessage - 2) * 0.1);

    return 0.7;
  }

  /**
   * Calculate topic variety factor (0-1)
   */
  private calculateTopicVarietyFactor(messages: Message[]): number {
    const textMessages = messages.filter((m) => m.content && m.type === 'text');

    if (textMessages.length < 3) {
      return 0.5;
    }

    // Simple topic detection using keyword categories
    const topicKeywords: Record<string, string[]> = {
      work: ['work', 'job', 'career', 'office', 'boss', 'meeting', 'project'],
      hobbies: ['hobby', 'fun', 'enjoy', 'love to', 'weekend', 'free time', 'passion'],
      travel: ['travel', 'trip', 'vacation', 'visit', 'country', 'city', 'flight'],
      food: ['food', 'eat', 'restaurant', 'cook', 'dinner', 'lunch', 'breakfast', 'recipe'],
      entertainment: ['movie', 'show', 'music', 'book', 'read', 'watch', 'listen', 'game'],
      family: ['family', 'parents', 'sibling', 'brother', 'sister', 'mom', 'dad'],
      personal: ['feel', 'think', 'believe', 'hope', 'dream', 'goal', 'want'],
      dating: ['date', 'meet', 'coffee', 'drinks', 'dinner', 'together'],
    };

    const detectedTopics = new Set<string>();
    const allContent = textMessages.map((m) => m.content.toLowerCase()).join(' ');

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((kw) => allContent.includes(kw))) {
        detectedTopics.add(topic);
      }
    }

    // Score based on number of topics covered
    const topicCount = detectedTopics.size;
    const maxTopics = Object.keys(topicKeywords).length;

    return Math.min(1.0, topicCount / (maxTopics * 0.4)); // 40% coverage = perfect score
  }

  /**
   * Calculate reciprocity factor (0-1, balance of conversation)
   */
  private calculateReciprocityFactor(messages: Message[]): number {
    if (messages.length < 2) {
      return 0.5;
    }

    // Count messages per sender
    const senderCounts: Record<string, number> = {};
    messages.forEach((m) => {
      senderCounts[m.senderId] = (senderCounts[m.senderId] || 0) + 1;
    });

    const senders = Object.values(senderCounts);
    if (senders.length < 2) {
      return 0.3; // One-sided conversation
    }

    // Calculate balance (0-1, where 1 is perfect 50/50 split)
    const total = senders.reduce((a, b) => a + b, 0);
    const balance = Math.min(...senders) / (total / senders.length);

    return balance;
  }

  /**
   * Calculate message rate factor (0-1)
   */
  private calculateMessageRateFactor(messages: Message[]): number {
    if (messages.length < 2) {
      return 0.5;
    }

    const sortedByTime = [...messages].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );

    const firstMessage = new Date(sortedByTime[0].sentAt).getTime();
    const lastMessage = new Date(sortedByTime[sortedByTime.length - 1].sentAt).getTime();
    const hoursDuration = (lastMessage - firstMessage) / (1000 * 60 * 60);

    if (hoursDuration < 0.1) {
      return 0.8; // Very recent burst
    }

    const messagesPerHour = messages.length / hoursDuration;

    // Optimal rate: 5-20 messages per hour
    if (messagesPerHour >= 5 && messagesPerHour <= 20) return 1.0;
    if (messagesPerHour < 5) return 0.4 + (messagesPerHour / 5) * 0.6;
    if (messagesPerHour > 20) return Math.max(0.6, 1.0 - (messagesPerHour - 20) * 0.02);

    return 0.7;
  }

  /**
   * Calculate weighted score from factors
   */
  private calculateWeightedScore(factors: MomentumFactors): number {
    const { weights } = CONFIG;

    const score =
      factors.responseTime * weights.responseTime * 100 +
      factors.messageLength * weights.messageLength * 100 +
      factors.questionRatio * weights.questionRatio * 100 +
      factors.emojiUsage * weights.emojiUsage * 100 +
      factors.topicVariety * weights.topicVariety * 100 +
      factors.reciprocity * weights.reciprocity * 100 +
      factors.messageRate * weights.messageRate * 100;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate velocity (rate of score change per hour)
   */
  private calculateVelocity(history: MomentumHistoryEntry[], currentScore: number): number {
    if (history.length < 2) {
      return 0;
    }

    const recentHistory = history.slice(0, 5);
    const oldestRecent = recentHistory[recentHistory.length - 1];

    const hoursDiff = (Date.now() - new Date(oldestRecent.timestamp).getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 0.01) {
      return 0;
    }

    return (currentScore - oldestRecent.score) / hoursDiff;
  }

  // ============================================================================
  // PRIVATE METHODS - SUGGESTIONS
  // ============================================================================

  /**
   * Get re-engagement suggestion based on weak factors
   */
  private getReEngagementSuggestion(factors: MomentumFactors): string {
    const suggestions: string[] = [];

    if (factors.responseTime < 0.5) {
      suggestions.push('Try responding more promptly to keep the flow going');
    }
    if (factors.questionRatio < 0.5) {
      suggestions.push('Ask more questions to show genuine interest');
    }
    if (factors.reciprocity < 0.6) {
      suggestions.push('Balance the conversation by sharing more about yourself');
    }
    if (factors.topicVariety < 0.4) {
      suggestions.push('Introduce a new topic to keep things fresh');
    }
    if (factors.messageLength < 0.5) {
      suggestions.push('Share more detailed responses to deepen the connection');
    }

    return suggestions[0] || 'Try sharing something personal or asking an open-ended question.';
  }

  /**
   * Get critical recovery suggestion
   */
  private getCriticalRecoverySuggestion(factors: MomentumFactors): string {
    if (factors.reciprocity < 0.4) {
      return 'The conversation seems one-sided. Give them space or try a completely new approach.';
    }
    if (factors.messageRate < 0.3) {
      return 'Consider sending a thoughtful message referencing something specific they mentioned before.';
    }
    return 'Send a genuine, low-pressure message. Share something interesting or ask about their day.';
  }

  // ============================================================================
  // PRIVATE METHODS - CACHING
  // ============================================================================

  /**
   * Cache momentum calculation
   */
  private async cacheMomentum(momentum: ConversationMomentum): Promise<void> {
    try {
      const key = `${CONFIG.cache.keyPrefix}${momentum.conversationId}`;
      await redisClient.getClient().setEx(key, CONFIG.cache.ttlSeconds, JSON.stringify(momentum));
    } catch (error: any) {
      logger.error('Failed to cache momentum', { error: error.message });
    }
  }

  /**
   * Add entry to momentum history
   */
  private async addToHistory(conversationId: string, entry: MomentumHistoryEntry): Promise<void> {
    try {
      const key = `${CONFIG.cache.historyKeyPrefix}${conversationId}`;
      const existingStr = await redisClient.getClient().get(key);

      let history: MomentumHistoryEntry[] =
        existingStr && typeof existingStr === 'string' ? JSON.parse(existingStr) : [];

      // Add new entry at the beginning
      history.unshift(entry);

      // Limit history size
      if (history.length > CONFIG.cache.historyMaxEntries) {
        history = history.slice(0, CONFIG.cache.historyMaxEntries);
      }

      await redisClient.getClient().setEx(
        key,
        CONFIG.cache.ttlSeconds * 24, // 24 hours
        JSON.stringify(history)
      );
    } catch (error: any) {
      logger.error('Failed to add to history', { error: error.message });
    }
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITIES
  // ============================================================================

  /**
   * Check if feature is enabled
   */
  private isFeatureEnabled(userId?: string): boolean {
    return this.featureFlags.isEnabled(
      'engagementFeatures',
      'conversationMomentumAnalyzer',
      userId ? { userId } : undefined
    );
  }

  /**
   * Create default momentum object
   */
  private createDefaultMomentum(conversationId: string): ConversationMomentum {
    return {
      conversationId,
      currentScore: 50,
      trend: 'stable',
      velocity: 0,
      factors: this.getDefaultFactors(),
      history: [],
      alerts: [],
      calculatedAt: new Date(),
    };
  }

  /**
   * Get default factors
   */
  private getDefaultFactors(): MomentumFactors {
    return {
      responseTime: 0.5,
      messageLength: 0.5,
      questionRatio: 0.5,
      emojiUsage: 0.5,
      topicVariety: 0.5,
      reciprocity: 0.5,
      messageRate: 0.5,
    };
  }

  // ============================================================================
  // PUBLIC UTILITIES
  // ============================================================================

  /**
   * Get alert type display info
   */
  getAlertTypeInfo(type: MomentumAlertType): { icon: string; color: string; label: string } {
    const info: Record<MomentumAlertType, { icon: string; color: string; label: string }> = {
      momentum_rising: { icon: 'trending_up', color: '#4CAF50', label: 'Rising' },
      momentum_peak: { icon: 'star', color: '#FFD700', label: 'Peak' },
      momentum_dropping: { icon: 'trending_down', color: '#FF9800', label: 'Dropping' },
      momentum_critical: { icon: 'warning', color: '#F44336', label: 'Critical' },
    };

    return info[type];
  }

  /**
   * Get score interpretation
   */
  getScoreInterpretation(score: number): {
    level: string;
    description: string;
    color: string;
  } {
    if (score >= 80) {
      return {
        level: 'Excellent',
        description: 'Great chemistry! The conversation is flowing naturally.',
        color: '#4CAF50',
      };
    }
    if (score >= 60) {
      return {
        level: 'Good',
        description: 'Solid engagement. Keep up the good conversation.',
        color: '#8BC34A',
      };
    }
    if (score >= 40) {
      return {
        level: 'Moderate',
        description: 'Room for improvement. Try asking more questions.',
        color: '#FFC107',
      };
    }
    if (score >= 25) {
      return {
        level: 'Low',
        description: 'Conversation needs a boost. Try a new topic.',
        color: '#FF9800',
      };
    }
    return {
      level: 'Critical',
      description: 'Conversation is at risk. Consider a fresh approach.',
      color: '#F44336',
    };
  }

  /**
   * Clear momentum cache for a conversation
   */
  async clearCache(conversationId: string): Promise<void> {
    try {
      const momentumKey = `${CONFIG.cache.keyPrefix}${conversationId}`;
      const historyKey = `${CONFIG.cache.historyKeyPrefix}${conversationId}`;

      await Promise.all([
        redisClient.getClient().del(momentumKey),
        redisClient.getClient().del(historyKey),
      ]);

      logger.info('Momentum cache cleared', { conversationId });
    } catch (error: any) {
      logger.error('Failed to clear momentum cache', { conversationId, error: error.message });
    }
  }
}

// Export singleton instance
export const conversationMomentumService = new ConversationMomentumService();
export default conversationMomentumService;
