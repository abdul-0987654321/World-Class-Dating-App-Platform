/**
 * Connection Score Service
 * Analyzes conversations and calculates connection quality scores
 */

import { createLogger } from '@flamoral/backend-shared';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config';
import { dbClient } from '../../infrastructure/database/db-client';
import {
  ConnectionScore,
  ScoreLevel,
  ConnectionScoreUpdate,
  ConversationAnalysis,
  ConversationSuggestion,
  ConversationMilestone,
  DepthAnalysis,
  ReciprocityAnalysis,
  EngagementAnalysis,
  TopicCategory,
} from '../types/conversation.types';

const logger = createLogger('connection-score-service');

// Topic detection keywords
const TOPIC_KEYWORDS: Record<string, string[]> = {
  work: ['job', 'work', 'career', 'office', 'boss', 'colleague', 'project', 'meeting'],
  hobbies: ['hobby', 'weekend', 'fun', 'enjoy', 'love doing', 'passion', 'free time'],
  travel: ['travel', 'trip', 'vacation', 'country', 'visited', 'want to go', 'flight'],
  family: ['family', 'mom', 'dad', 'brother', 'sister', 'parents', 'kids', 'children'],
  values: ['believe', 'important', 'matter', 'value', 'principle', 'faith', 'meaning'],
  dreams: ['dream', 'goal', 'future', 'hope', 'aspire', 'want to', 'one day'],
  past: ['grew up', 'childhood', 'used to', 'remember', 'back then', 'younger'],
  feelings: ['feel', 'emotion', 'happy', 'sad', 'excited', 'nervous', 'scared', 'love'],
};

// Personal info indicators
const PERSONAL_INFO_PATTERNS = [
  /my name is/i,
  /i live in/i,
  /i work at/i,
  /my number is/i,
  /here's my/i,
  /my instagram/i,
  /my phone/i,
  /where i'm from/i,
];

// Vulnerability indicators
const VULNERABILITY_PATTERNS = [
  /i've never told/i,
  /to be honest/i,
  /i'm scared/i,
  /i struggle with/i,
  /my insecurity/i,
  /i'm worried/i,
  /this is hard to say/i,
  /i feel vulnerable/i,
];

// Meetup indicators
const MEETUP_PATTERNS = [
  /meet up/i,
  /get together/i,
  /grab coffee/i,
  /grab a drink/i,
  /let's meet/i,
  /see you in person/i,
  /go on a date/i,
  /this weekend/i,
  /are you free/i,
];

export class ConnectionScoreService {
  /**
   * Analyze a new message and update connection score
   */
  async analyzeMessage(update: ConnectionScoreUpdate): Promise<ConnectionScore> {
    const db = dbClient.getClient();

    try {
      // Analyze the message
      const analysis = this.analyzeMessageContent(update.messageContent);

      // Store message analysis
      await db('message_analyses').insert({
        id: uuidv4(),
        message_id: update.messageId,
        conversation_id: update.conversationId,
        sender_id: update.senderId,
        word_count: analysis.wordCount,
        is_question: analysis.isQuestion,
        depth_score: analysis.depthScore,
        topics: analysis.topics,
        contains_personal_info: analysis.containsPersonalInfo,
        contains_vulnerability: analysis.containsVulnerability,
        mentions_meetup: analysis.mentionsMeetup,
        response_time_minutes: update.responseTimeMinutes,
        message_timestamp: update.messageTimestamp,
      });

      // Get or create connection score
      let connectionScore = await this.getOrCreateConnectionScore(update.conversationId);

      // Recalculate scores based on all messages
      connectionScore = await this.recalculateScores(update.conversationId);

      // Check for new milestones
      await this.checkMilestones(update.conversationId, connectionScore);

      // Generate suggestions if needed
      await this.generateSuggestions(update.conversationId, connectionScore);

      return connectionScore;
    } catch (error: any) {
      logger.error('Error analyzing message:', error);
      throw error;
    }
  }

  /**
   * Get connection score for a conversation
   */
  async getConnectionScore(conversationId: string): Promise<ConnectionScore | null> {
    const db = dbClient.getClient();

    const score = await db('connection_scores').where('conversation_id', conversationId).first();

    if (!score) return null;

    return this.mapToConnectionScore(score);
  }

  /**
   * Get full conversation analysis
   */
  async getConversationAnalysis(conversationId: string): Promise<ConversationAnalysis> {
    const db = dbClient.getClient();

    const connectionScore = await this.getConnectionScore(conversationId);
    const messages = await db('message_analyses')
      .where('conversation_id', conversationId)
      .orderBy('message_timestamp', 'asc');

    const milestones = await db('conversation_milestones')
      .where('conversation_id', conversationId)
      .orderBy('achieved_at', 'asc');

    const suggestions = await db('conversation_suggestions')
      .where('conversation_id', conversationId)
      .where('is_dismissed', false)
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      });

    // Build analysis
    const depthAnalysis = this.buildDepthAnalysis(messages);
    const reciprocityAnalysis = this.buildReciprocityAnalysis(messages);
    const engagementAnalysis = this.buildEngagementAnalysis(messages);

    // Determine next milestone
    const nextMilestone = this.getNextMilestone(connectionScore?.overallScore || 0, milestones);

    return {
      conversationId,
      analyzedAt: new Date().toISOString(),
      depthAnalysis,
      reciprocityAnalysis,
      engagementAnalysis,
      suggestions: suggestions.map(this.mapToSuggestion),
      milestonesReached: milestones.map(this.mapToMilestone),
      nextMilestone,
    };
  }

  /**
   * Get suggestions for a user in a conversation
   */
  async getSuggestions(conversationId: string, userId: string): Promise<ConversationSuggestion[]> {
    const db = dbClient.getClient();

    const suggestions = await db('conversation_suggestions')
      .where('conversation_id', conversationId)
      .where('for_user_id', userId)
      .where('is_dismissed', false)
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      })
      .orderBy('priority', 'desc')
      .limit(3);

    return suggestions.map(this.mapToSuggestion);
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string, userId: string): Promise<void> {
    const db = dbClient.getClient();

    await db('conversation_suggestions')
      .where('id', suggestionId)
      .where('for_user_id', userId)
      .update({ is_dismissed: true });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private analyzeMessageContent(content: string): {
    wordCount: number;
    isQuestion: boolean;
    depthScore: number;
    topics: string[];
    containsPersonalInfo: boolean;
    containsVulnerability: boolean;
    mentionsMeetup: boolean;
  } {
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    const isQuestion = content.includes('?');

    // Detect topics
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some((kw) => lowerContent.includes(kw))) {
        topics.push(topic);
      }
    }

    // Calculate depth score based on message characteristics
    let depthScore = 0;

    // Word count contribution (longer messages often deeper)
    if (wordCount > 50) depthScore += 25;
    else if (wordCount > 25) depthScore += 15;
    else if (wordCount > 10) depthScore += 10;

    // Topic depth
    const deepTopics = ['values', 'dreams', 'feelings', 'past'];
    const moderateTopics = ['family', 'work'];
    for (const topic of topics) {
      if (deepTopics.includes(topic)) depthScore += 20;
      else if (moderateTopics.includes(topic)) depthScore += 10;
      else depthScore += 5;
    }

    // Questions show engagement
    if (isQuestion) depthScore += 10;

    // Check for personal info
    const containsPersonalInfo = PERSONAL_INFO_PATTERNS.some((p) => p.test(content));
    if (containsPersonalInfo) depthScore += 15;

    // Check for vulnerability
    const containsVulnerability = VULNERABILITY_PATTERNS.some((p) => p.test(content));
    if (containsVulnerability) depthScore += 25;

    // Check for meetup discussion
    const mentionsMeetup = MEETUP_PATTERNS.some((p) => p.test(content));
    if (mentionsMeetup) depthScore += 20;

    depthScore = Math.min(100, depthScore);

    return {
      wordCount,
      isQuestion,
      depthScore,
      topics,
      containsPersonalInfo,
      containsVulnerability,
      mentionsMeetup,
    };
  }

  private async getOrCreateConnectionScore(conversationId: string): Promise<ConnectionScore> {
    const db = dbClient.getClient();

    let score = await db('connection_scores').where('conversation_id', conversationId).first();

    if (!score) {
      // We need user IDs - for now use placeholder, in real impl get from conversation
      [score] = await db('connection_scores')
        .insert({
          id: uuidv4(),
          conversation_id: conversationId,
          user1_id: uuidv4(), // Would come from conversation lookup
          user2_id: uuidv4(),
        })
        .returning('*');
    }

    return this.mapToConnectionScore(score);
  }

  private async recalculateScores(conversationId: string): Promise<ConnectionScore> {
    const db = dbClient.getClient();

    const messages = await db('message_analyses')
      .where('conversation_id', conversationId)
      .orderBy('message_timestamp', 'asc');

    if (messages.length === 0) {
      return this.getOrCreateConnectionScore(conversationId);
    }

    // Calculate metrics
    const totalMessages = messages.length;
    const avgMessageLength = messages.reduce((sum, m) => sum + m.word_count, 0) / totalMessages;
    const questionCount = messages.filter((m) => m.is_question).length;
    const questionRatio = questionCount / totalMessages;

    // Response times (excluding first message)
    const responseTimes = messages
      .filter((m) => m.response_time_minutes !== null)
      .map((m) => parseFloat(m.response_time_minutes));
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Topics discussed
    const allTopics = messages.flatMap((m) => m.topics || []);
    const uniqueTopics = [...new Set(allTopics)];

    // Progression indicators
    const hasPersonalInfo = messages.some((m) => m.contains_personal_info);
    const hasVulnerability = messages.some((m) => m.contains_vulnerability);
    const hasMeetup = messages.some((m) => m.mentions_meetup);

    // Calculate dimension scores
    const depthScore = this.calculateDepthScore(messages);
    const reciprocityScore = this.calculateReciprocityScore(messages);
    const engagementScore = this.calculateEngagementScore(messages, avgResponseTime);
    const progressionScore = this.calculateProgressionScore(
      hasPersonalInfo,
      hasVulnerability,
      hasMeetup,
      totalMessages
    );

    // Calculate overall score
    const weights = config.connectionScore.weights;
    const overallScore =
      depthScore * weights.depth +
      reciprocityScore * weights.reciprocity +
      engagementScore * weights.engagement +
      progressionScore * weights.progression;

    const scoreLevel = this.getScoreLevel(overallScore);

    // Determine trend (compare to previous score)
    const existingScore = await db('connection_scores')
      .where('conversation_id', conversationId)
      .first();

    const previousScore = existingScore ? parseFloat(existingScore.overall_score) : 0;
    const scoreTrend =
      overallScore > previousScore + 5
        ? 'improving'
        : overallScore < previousScore - 5
          ? 'declining'
          : 'stable';

    // Update score
    const updateData = {
      overall_score: overallScore,
      score_level: scoreLevel,
      depth_score: depthScore,
      reciprocity_score: reciprocityScore,
      engagement_score: engagementScore,
      progression_score: progressionScore,
      total_messages: totalMessages,
      average_message_length: avgMessageLength,
      question_ratio: questionRatio,
      response_time_average: avgResponseTime,
      topics_discussed: uniqueTopics,
      has_exchanged_personal_info: hasPersonalInfo,
      has_discussed_meetup: hasMeetup,
      has_shared_vulnerability: hasVulnerability,
      score_trend: scoreTrend,
      updated_at: new Date(),
    };

    await db('connection_scores').where('conversation_id', conversationId).update(updateData);

    return {
      ...this.mapToConnectionScore(existingScore),
      ...updateData,
      conversationId,
      user1Id: existingScore?.user1_id || '',
      user2Id: existingScore?.user2_id || '',
      topicsDiscussed: uniqueTopics,
      hasExchangedPersonalInfo: hasPersonalInfo,
      hasDiscussedMeetup: hasMeetup,
      hasSharedVulnerability: hasVulnerability,
      lastUpdated: new Date().toISOString(),
    };
  }

  private calculateDepthScore(messages: any[]): number {
    if (messages.length === 0) return 0;

    const avgDepth =
      messages.reduce((sum, m) => sum + parseFloat(m.depth_score), 0) / messages.length;
    return Math.min(100, avgDepth);
  }

  private calculateReciprocityScore(messages: any[]): number {
    if (messages.length < 2) return 50; // Neutral for single messages

    // Group by sender
    const senderCounts: Record<string, number> = {};
    for (const m of messages) {
      senderCounts[m.sender_id] = (senderCounts[m.sender_id] || 0) + 1;
    }

    const counts = Object.values(senderCounts);
    if (counts.length < 2) return 50;

    const ratio = Math.min(...counts) / Math.max(...counts);
    return Math.round(ratio * 100);
  }

  private calculateEngagementScore(messages: any[], avgResponseTime: number): number {
    let score = 50;

    // Response time factor
    const { responseTimeWarning, responseTimeCritical } = config.connectionScore.ghostRisk;
    if (avgResponseTime > 0) {
      if (avgResponseTime < 60)
        score += 25; // Under 1 hour
      else if (avgResponseTime < responseTimeWarning * 60) score += 15;
      else if (avgResponseTime < responseTimeCritical * 60) score -= 10;
      else score -= 25;
    }

    // Message quality
    const avgWordCount = messages.reduce((sum, m) => sum + m.word_count, 0) / messages.length;
    if (avgWordCount > 30) score += 15;
    else if (avgWordCount > 15) score += 10;
    else if (avgWordCount < 5) score -= 10;

    // Question engagement
    const questionRatio = messages.filter((m) => m.is_question).length / messages.length;
    if (questionRatio > 0.3) score += 10;
    else if (questionRatio > 0.15) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateProgressionScore(
    hasPersonalInfo: boolean,
    hasVulnerability: boolean,
    hasMeetup: boolean,
    totalMessages: number
  ): number {
    let score = 0;

    // Base score from message count
    if (totalMessages > 50) score += 30;
    else if (totalMessages > 20) score += 20;
    else if (totalMessages > 10) score += 10;

    // Progression milestones
    if (hasPersonalInfo) score += 25;
    if (hasVulnerability) score += 25;
    if (hasMeetup) score += 20;

    return Math.min(100, score);
  }

  private getScoreLevel(score: number): ScoreLevel {
    if (score >= 76) return 'bonding';
    if (score >= 51) return 'connecting';
    if (score >= 26) return 'warming';
    return 'sparking';
  }

  private async checkMilestones(conversationId: string, score: ConnectionScore): Promise<void> {
    const db = dbClient.getClient();
    const milestones = config.connectionScore.milestones;

    const existingMilestones = await db('conversation_milestones')
      .where('conversation_id', conversationId)
      .pluck('milestone_id');

    const toAdd: { id: string; name: string; score: number }[] = [];

    // Check each milestone
    if (score.totalMessages >= 1 && !existingMilestones.includes('first_message')) {
      toAdd.push({ id: 'first_message', ...milestones.firstMessage });
    }
    if (score.totalMessages >= 10 && !existingMilestones.includes('ten_messages')) {
      toAdd.push({ id: 'ten_messages', ...milestones.tenMessages });
    }
    if (score.topicsDiscussed.length >= 3 && !existingMilestones.includes('shared_interests')) {
      toAdd.push({ id: 'shared_interests', ...milestones.sharedInterests });
    }
    if (score.hasExchangedPersonalInfo && !existingMilestones.includes('personal_info')) {
      toAdd.push({ id: 'personal_info', ...milestones.personalInfo });
    }
    if (score.hasSharedVulnerability && !existingMilestones.includes('vulnerability')) {
      toAdd.push({ id: 'vulnerability', ...milestones.vulnerability });
    }
    if (score.hasDiscussedMeetup && !existingMilestones.includes('meetup_discussion')) {
      toAdd.push({ id: 'meetup_discussion', ...milestones.meetupDiscussion });
    }

    // Insert new milestones
    for (const milestone of toAdd) {
      await db('conversation_milestones').insert({
        id: uuidv4(),
        conversation_id: conversationId,
        milestone_id: milestone.id,
        milestone_name: milestone.name,
      });
    }
  }

  private async generateSuggestions(conversationId: string, score: ConnectionScore): Promise<void> {
    const db = dbClient.getClient();
    const suggestions: Partial<ConversationSuggestion>[] = [];

    // Low depth - suggest deeper questions
    if (score.depthScore < 40) {
      suggestions.push({
        type: 'ask_deeper_question',
        priority: 'medium',
        title: 'Go Deeper',
        description: 'Try asking questions that reveal more about values, dreams, or experiences.',
        exampleActions: [
          "What's something you've always wanted to try?",
          "What's the most meaningful experience you've had recently?",
          'What do you value most in your relationships?',
        ],
      });
    }

    // Low reciprocity - suggest balancing
    if (score.reciprocityScore < 40) {
      suggestions.push({
        type: 'balance_conversation',
        priority: 'high',
        title: 'Balance the Conversation',
        description: 'The conversation seems one-sided. Try asking more questions or sharing more.',
        exampleActions: [
          'Ask follow-up questions about what they shared',
          'Share your own experiences related to the topic',
          'Express genuine curiosity about their perspective',
        ],
      });
    }

    // Good progress but no meetup - suggest it
    if (score.overallScore > 60 && !score.hasDiscussedMeetup) {
      suggestions.push({
        type: 'suggest_meetup',
        priority: 'low',
        title: 'Consider Meeting Up',
        description:
          'Your conversation is going well! It might be time to suggest meeting in person.',
        exampleActions: [
          "I've really enjoyed chatting - would you want to grab coffee sometime?",
          "It'd be great to continue this conversation in person!",
          'Are you free this weekend to meet up?',
        ],
      });
    }

    // Insert suggestions (avoid duplicates)
    for (const suggestion of suggestions) {
      const existing = await db('conversation_suggestions')
        .where('conversation_id', conversationId)
        .where('type', suggestion.type)
        .where('is_dismissed', false)
        .first();

      if (!existing) {
        // We need to get user IDs from conversation
        // For now, we'll skip the for_user_id (would need conversation lookup)
      }
    }
  }

  private buildDepthAnalysis(messages: any[]): DepthAnalysis {
    const allTopics = messages.flatMap((m) => m.topics || []);
    const topicCounts: Record<string, number> = {};
    for (const topic of allTopics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }

    const deepTopics = ['values', 'dreams', 'feelings', 'past'];
    const topicCategories: TopicCategory[] = Object.entries(topicCounts).map(([name, count]) => ({
      name,
      count,
      depth: deepTopics.includes(name)
        ? 'deep'
        : name === 'hobbies' || name === 'work'
          ? 'moderate'
          : 'surface',
    }));

    const avgDepth =
      messages.reduce((sum, m) => sum + parseFloat(m.depth_score), 0) / (messages.length || 1);
    const surfaceLevelRatio =
      messages.filter((m) => parseFloat(m.depth_score) < 30).length / (messages.length || 1);

    return {
      score: avgDepth,
      topicCategories,
      surfaceLevelRatio,
      meaningfulExchanges: messages.filter((m) => parseFloat(m.depth_score) >= 50).length,
      vulnerabilityMoments: messages.filter((m) => m.contains_vulnerability).length,
    };
  }

  private buildReciprocityAnalysis(messages: any[]): ReciprocityAnalysis {
    const senderCounts: Record<string, number> = {};
    const senderQuestions: Record<string, number> = {};

    for (const m of messages) {
      senderCounts[m.sender_id] = (senderCounts[m.sender_id] || 0) + 1;
      if (m.is_question) {
        senderQuestions[m.sender_id] = (senderQuestions[m.sender_id] || 0) + 1;
      }
    }

    const counts = Object.values(senderCounts);
    const messageRatio = counts.length >= 2 ? Math.min(...counts) / Math.max(...counts) : 1;

    const questionCounts = Object.values(senderQuestions);
    const questionRatio =
      questionCounts.length >= 2 ? Math.min(...questionCounts) / Math.max(...questionCounts) : 1;

    const score = ((messageRatio + questionRatio) / 2) * 100;

    return {
      score,
      messageRatio,
      questionAskedRatio: questionRatio,
      initiationBalance: messageRatio,
      isBalanced: score >= 60,
    };
  }

  private buildEngagementAnalysis(messages: any[]): EngagementAnalysis {
    const responseTimes = messages
      .filter((m) => m.response_time_minutes !== null)
      .map((m) => parseFloat(m.response_time_minutes));

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const responseTimeVariance =
      responseTimes.length > 1
        ? responseTimes.reduce((sum, t) => sum + Math.pow(t - avgResponseTime, 2), 0) /
          responseTimes.length
        : 0;
    const responseTimeConsistency = Math.max(0, 100 - Math.sqrt(responseTimeVariance));

    const avgWordCount =
      messages.reduce((sum, m) => sum + m.word_count, 0) / (messages.length || 1);
    const messageQualityScore = Math.min(100, avgWordCount * 2);

    // Ghost risk calculation
    const lastMessage = messages[messages.length - 1];
    let ghostingRisk = 0;
    if (lastMessage) {
      const hoursSinceLastMessage =
        (Date.now() - new Date(lastMessage.message_timestamp).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastMessage > 72) ghostingRisk = 90;
      else if (hoursSinceLastMessage > 48) ghostingRisk = 70;
      else if (hoursSinceLastMessage > 24) ghostingRisk = 40;
      else if (hoursSinceLastMessage > 12) ghostingRisk = 20;
    }

    return {
      score: this.calculateEngagementScore(messages, avgResponseTime),
      averageResponseTime: avgResponseTime,
      responseTimeConsistency,
      messageQualityScore,
      ghostingRisk,
    };
  }

  private getNextMilestone(
    currentScore: number,
    achievedMilestones: any[]
  ): ConversationMilestone | null {
    const allMilestones = Object.entries(config.connectionScore.milestones)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => a.score - b.score);

    const achievedIds = achievedMilestones.map((m) => m.milestone_id);

    for (const milestone of allMilestones) {
      if (!achievedIds.includes(milestone.id)) {
        return {
          id: milestone.id,
          name: milestone.name,
          description: `Reach ${milestone.score} connection score`,
          requiredScore: milestone.score,
          achieved: false,
          achievedAt: null,
        };
      }
    }

    return null;
  }

  private mapToConnectionScore(row: any): ConnectionScore {
    return {
      conversationId: row.conversation_id,
      user1Id: row.user1_id,
      user2Id: row.user2_id,
      overallScore: parseFloat(row.overall_score),
      scoreLevel: row.score_level,
      depthScore: parseFloat(row.depth_score),
      reciprocityScore: parseFloat(row.reciprocity_score),
      engagementScore: parseFloat(row.engagement_score),
      progressionScore: parseFloat(row.progression_score),
      totalMessages: row.total_messages,
      averageMessageLength: parseFloat(row.average_message_length),
      questionRatio: parseFloat(row.question_ratio),
      responseTimeAverage: parseFloat(row.response_time_average),
      topicsDiscussed: row.topics_discussed || [],
      hasExchangedPersonalInfo: row.has_exchanged_personal_info,
      hasDiscussedMeetup: row.has_discussed_meetup,
      hasSharedVulnerability: row.has_shared_vulnerability,
      scoreTrend: row.score_trend,
      lastUpdated: row.updated_at,
    };
  }

  private mapToSuggestion(row: any): ConversationSuggestion {
    return {
      id: row.id,
      type: row.type,
      priority: row.priority,
      title: row.title,
      description: row.description,
      exampleActions: row.example_actions || [],
    };
  }

  private mapToMilestone(row: any): ConversationMilestone {
    return {
      id: row.milestone_id,
      name: row.milestone_name,
      description: '',
      requiredScore: 0,
      achieved: true,
      achievedAt: row.achieved_at,
    };
  }
}

export const connectionScoreService = new ConnectionScoreService();
