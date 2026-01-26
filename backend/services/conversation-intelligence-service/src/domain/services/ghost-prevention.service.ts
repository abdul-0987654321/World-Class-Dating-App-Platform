/**
 * Ghost Prevention Service
 * Detects ghosting risk and provides graceful exit mechanisms
 */

import { createLogger } from '@flamoral/backend-shared';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config';
import { dbClient } from '../../infrastructure/database/db-client';
import {
  GhostRiskAssessment,
  GhostRiskFactor,
  GhostIntervention,
  GracefulExitRequest,
  GracefulExitMessage,
  ExitFeedback,
  AggregatedFeedback,
  FeedbackPattern,
  ExitReason,
  FeedbackCategory,
} from '../types/conversation.types';

const logger = createLogger('ghost-prevention-service');

export class GhostPreventionService {
  /**
   * Assess ghosting risk for a conversation
   */
  async assessGhostRisk(conversationId: string): Promise<GhostRiskAssessment> {
    const db = dbClient.getClient();

    try {
      // Get recent messages
      const messages = await db('message_analyses')
        .where('conversation_id', conversationId)
        .orderBy('message_timestamp', 'desc')
        .limit(20);

      if (messages.length === 0) {
        return this.createLowRiskAssessment(conversationId);
      }

      const factors: GhostRiskFactor[] = [];
      let totalRisk = 0;

      // Factor 1: Time since last message
      const lastMessage = messages[0];
      const hoursSinceLastMessage =
        (Date.now() - new Date(lastMessage.message_timestamp).getTime()) / (1000 * 60 * 60);

      const timeFactor = this.calculateTimeFactor(hoursSinceLastMessage);
      factors.push(timeFactor);
      totalRisk += timeFactor.riskContribution;

      // Factor 2: Response time trend
      const responseTimes = messages
        .filter((m) => m.response_time_minutes !== null)
        .map((m) => parseFloat(m.response_time_minutes));

      if (responseTimes.length >= 3) {
        const trendFactor = this.calculateResponseTimeTrend(responseTimes);
        factors.push(trendFactor);
        totalRisk += trendFactor.riskContribution;
      }

      // Factor 3: Message length decline
      const messageLengths = messages.map((m) => m.word_count);
      if (messageLengths.length >= 3) {
        const lengthFactor = this.calculateMessageLengthTrend(messageLengths);
        factors.push(lengthFactor);
        totalRisk += lengthFactor.riskContribution;
      }

      // Factor 4: Question/engagement decline
      const recentQuestions = messages.slice(0, 5).filter((m) => m.is_question).length;
      const olderQuestions = messages.slice(5, 10).filter((m) => m.is_question).length;
      if (messages.length >= 10) {
        const engagementFactor = this.calculateEngagementDecline(recentQuestions, olderQuestions);
        factors.push(engagementFactor);
        totalRisk += engagementFactor.riskContribution;
      }

      // Factor 5: One-sided conversation
      const senderCounts: Record<string, number> = {};
      for (const m of messages.slice(0, 10)) {
        senderCounts[m.sender_id] = (senderCounts[m.sender_id] || 0) + 1;
      }
      const counts = Object.values(senderCounts);
      if (counts.length === 2) {
        const balanceFactor = this.calculateBalanceFactor(counts[0], counts[1]);
        factors.push(balanceFactor);
        totalRisk += balanceFactor.riskContribution;
      }

      // Normalize risk score
      const riskScore = Math.min(100, totalRisk);
      const riskLevel = this.getRiskLevel(riskScore);

      // Generate interventions
      const interventions = this.generateInterventions(riskLevel, factors, hoursSinceLastMessage);

      // Save assessment
      const assessment = {
        id: uuidv4(),
        conversation_id: conversationId,
        risk_score: riskScore,
        risk_level: riskLevel,
        factors: JSON.stringify(factors),
        interventions: JSON.stringify(interventions),
        assessed_at: new Date(),
      };

      await db('ghost_risk_assessments').insert(assessment);

      return {
        conversationId,
        assessedAt: assessment.assessed_at.toISOString(),
        riskScore,
        riskLevel,
        factors,
        interventions,
      };
    } catch (error: any) {
      logger.error('Error assessing ghost risk:', error);
      throw error;
    }
  }

  /**
   * Initiate a graceful exit from a conversation
   */
  async initiateGracefulExit(request: GracefulExitRequest): Promise<{
    exitId: string;
    message: string;
  }> {
    const db = dbClient.getClient();

    try {
      // Get the exit message template
      const template =
        config.gracefulExitTemplates[request.reason] || config.gracefulExitTemplates.other;

      const finalMessage = request.customMessage || template;

      // Get the other user in the conversation
      const connectionScore = await db('connection_scores')
        .where('conversation_id', request.conversationId)
        .first();

      if (!connectionScore) {
        throw new Error('Conversation not found');
      }

      const toUserId =
        connectionScore.user1_id === request.userId
          ? connectionScore.user2_id
          : connectionScore.user1_id;

      // Create graceful exit record
      const exitRecord = {
        id: uuidv4(),
        conversation_id: request.conversationId,
        from_user_id: request.userId,
        to_user_id: toUserId,
        reason: request.reason,
        custom_message: request.customMessage,
        final_message: finalMessage,
      };

      await db('graceful_exits').insert(exitRecord);

      // Record feedback if provided
      if (request.provideFeedback && request.feedbackCategories?.length) {
        await db('exit_feedback').insert({
          id: uuidv4(),
          graceful_exit_id: exitRecord.id,
          from_user_id: request.userId,
          to_user_id: toUserId,
          categories: request.feedbackCategories,
          is_private: true, // Always private initially
        });
      }

      return {
        exitId: exitRecord.id,
        message: finalMessage,
      };
    } catch (error: any) {
      logger.error('Error initiating graceful exit:', error);
      throw error;
    }
  }

  /**
   * Get available graceful exit message templates
   */
  getExitMessageTemplates(): GracefulExitMessage[] {
    return Object.entries(config.gracefulExitTemplates).map(([reason, template]) => ({
      id: reason,
      reason: reason as ExitReason,
      severity: this.getMessageSeverity(reason as ExitReason),
      messageTemplate: template,
      customizable: true,
    }));
  }

  /**
   * Get aggregated feedback for a user
   */
  async getAggregatedFeedback(userId: string): Promise<AggregatedFeedback> {
    const db = dbClient.getClient();

    try {
      const feedbacks = await db('exit_feedback')
        .where('to_user_id', userId)
        .where('is_private', true);

      const totalExits = feedbacks.length;

      if (totalExits < 3) {
        // Not enough data to show patterns
        return {
          userId,
          totalExits,
          patterns: [],
          lastUpdated: new Date().toISOString(),
        };
      }

      // Aggregate feedback categories
      const categoryCounts: Record<FeedbackCategory, number> = {
        conversation_quality: 0,
        response_time: 0,
        compatibility: 0,
        communication_style: 0,
        other: 0,
      };

      for (const feedback of feedbacks) {
        for (const category of feedback.categories || []) {
          if (categoryCounts[category as FeedbackCategory] !== undefined) {
            categoryCounts[category as FeedbackCategory]++;
          }
        }
      }

      const patterns: FeedbackPattern[] = Object.entries(categoryCounts)
        .filter(([_, count]) => count > 0)
        .map(([category, count]) => {
          const percentage = (count / totalExits) * 100;
          return {
            category: category as FeedbackCategory,
            count,
            percentage,
            isSignificant: percentage >= 30,
            suggestion: this.getSuggestionForCategory(category as FeedbackCategory),
          };
        })
        .sort((a, b) => b.count - a.count);

      return {
        userId,
        totalExits,
        patterns,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Error getting aggregated feedback:', error);
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private createLowRiskAssessment(conversationId: string): GhostRiskAssessment {
    return {
      conversationId,
      assessedAt: new Date().toISOString(),
      riskScore: 0,
      riskLevel: 'low',
      factors: [],
      interventions: [],
    };
  }

  private calculateTimeFactor(hoursSinceLastMessage: number): GhostRiskFactor {
    const { responseTimeWarning, responseTimeCritical } = config.connectionScore.ghostRisk;

    let riskContribution = 0;
    if (hoursSinceLastMessage > responseTimeCritical) {
      riskContribution = 35;
    } else if (hoursSinceLastMessage > responseTimeWarning) {
      riskContribution = 20;
    } else if (hoursSinceLastMessage > 12) {
      riskContribution = 10;
    } else if (hoursSinceLastMessage > 6) {
      riskContribution = 5;
    }

    return {
      factor: 'time_since_last_message',
      weight: 0.35,
      currentValue: hoursSinceLastMessage,
      riskContribution,
    };
  }

  private calculateResponseTimeTrend(responseTimes: number[]): GhostRiskFactor {
    // Check if response times are increasing
    const recentAvg =
      responseTimes.slice(0, Math.ceil(responseTimes.length / 2)).reduce((a, b) => a + b, 0) /
      Math.ceil(responseTimes.length / 2);
    const olderAvg =
      responseTimes.slice(Math.ceil(responseTimes.length / 2)).reduce((a, b) => a + b, 0) /
      Math.floor(responseTimes.length / 2);

    const increaseRatio = olderAvg > 0 ? recentAvg / olderAvg : 1;

    let riskContribution = 0;
    if (increaseRatio > 3) riskContribution = 20;
    else if (increaseRatio > 2) riskContribution = 15;
    else if (increaseRatio > 1.5) riskContribution = 10;

    return {
      factor: 'response_time_trend',
      weight: 0.2,
      currentValue: increaseRatio,
      riskContribution,
    };
  }

  private calculateMessageLengthTrend(messageLengths: number[]): GhostRiskFactor {
    const recentAvg =
      messageLengths.slice(0, Math.ceil(messageLengths.length / 2)).reduce((a, b) => a + b, 0) /
      Math.ceil(messageLengths.length / 2);
    const olderAvg =
      messageLengths.slice(Math.ceil(messageLengths.length / 2)).reduce((a, b) => a + b, 0) /
      Math.floor(messageLengths.length / 2);

    const decreaseRatio = olderAvg > 0 ? recentAvg / olderAvg : 1;

    let riskContribution = 0;
    if (decreaseRatio < 0.3) riskContribution = 15;
    else if (decreaseRatio < 0.5) riskContribution = 10;
    else if (decreaseRatio < 0.7) riskContribution = 5;

    return {
      factor: 'message_length_decline',
      weight: 0.15,
      currentValue: decreaseRatio,
      riskContribution,
    };
  }

  private calculateEngagementDecline(
    recentQuestions: number,
    olderQuestions: number
  ): GhostRiskFactor {
    const ratio = olderQuestions > 0 ? recentQuestions / olderQuestions : 1;

    let riskContribution = 0;
    if (ratio === 0 && olderQuestions > 0) riskContribution = 15;
    else if (ratio < 0.3) riskContribution = 10;
    else if (ratio < 0.5) riskContribution = 5;

    return {
      factor: 'engagement_decline',
      weight: 0.15,
      currentValue: ratio,
      riskContribution,
    };
  }

  private calculateBalanceFactor(count1: number, count2: number): GhostRiskFactor {
    const ratio = Math.min(count1, count2) / Math.max(count1, count2);

    let riskContribution = 0;
    if (ratio < 0.2) riskContribution = 15;
    else if (ratio < 0.4) riskContribution = 10;
    else if (ratio < 0.6) riskContribution = 5;

    return {
      factor: 'conversation_balance',
      weight: 0.15,
      currentValue: ratio,
      riskContribution,
    };
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    const { lowThreshold, mediumThreshold, highThreshold } = config.connectionScore.ghostRisk;

    if (score >= highThreshold) return 'critical';
    if (score >= mediumThreshold) return 'high';
    if (score >= lowThreshold) return 'medium';
    return 'low';
  }

  private generateInterventions(
    riskLevel: string,
    factors: GhostRiskFactor[],
    hoursSinceLastMessage: number
  ): GhostIntervention[] {
    const interventions: GhostIntervention[] = [];

    if (riskLevel === 'critical') {
      interventions.push({
        type: 'offer_graceful_exit',
        priority: 'urgent',
        message:
          'This conversation seems to have stalled. Would you like to send a graceful closing message?',
      });
    }

    if (riskLevel === 'high' || riskLevel === 'critical') {
      interventions.push({
        type: 'prompt_checkin',
        priority: 'recommended',
        message:
          "It's been a while since you heard from them. Consider sending a friendly check-in.",
      });
    }

    if (hoursSinceLastMessage > 24 && hoursSinceLastMessage < 72) {
      interventions.push({
        type: 'send_reminder',
        priority: 'optional',
        message: 'Send a light, no-pressure message to re-engage the conversation.',
      });
    }

    // Check specific factors
    const balanceFactor = factors.find((f) => f.factor === 'conversation_balance');
    if (balanceFactor && balanceFactor.currentValue < 0.4) {
      interventions.push({
        type: 'suggest_question',
        priority: 'recommended',
        message: 'The conversation feels one-sided. Try asking an engaging question.',
      });
    }

    return interventions;
  }

  private getMessageSeverity(reason: ExitReason): 'gentle' | 'standard' | 'direct' {
    switch (reason) {
      case 'too_busy_right_now':
        return 'gentle';
      case 'not_feeling_connection':
      case 'looking_for_different':
        return 'standard';
      case 'found_someone_else':
        return 'direct';
      default:
        return 'standard';
    }
  }

  private getSuggestionForCategory(category: FeedbackCategory): string {
    const suggestions: Record<FeedbackCategory, string> = {
      conversation_quality: 'Try asking more open-ended questions and sharing more about yourself.',
      response_time: 'Consider responding more promptly to messages, even if briefly.',
      compatibility: "Be clearer about your interests and what you're looking for in your profile.",
      communication_style:
        'Pay attention to how your match communicates and try to match their energy.',
      other: 'Review your conversations for areas of improvement.',
    };
    return suggestions[category] || suggestions.other;
  }
}

export const ghostPreventionService = new GhostPreventionService();
