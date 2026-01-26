/**
 * Readiness Assessment Service
 * Handles relationship readiness assessment and scoring
 */

import { createLogger } from '@flamoral/backend-shared';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config';
import { dbClient } from '../../infrastructure/database/db-client';
import {
  ReadinessAssessment,
  ReadinessLevel,
  ReadinessBlocker,
  ReadinessRecommendation,
  SuggestedDatingMode,
  ReadinessQuestion,
  ReadinessAnswers,
} from '../types/wellness.types';

const logger = createLogger('readiness-service');

// Default readiness questions for assessment
const DEFAULT_QUESTIONS: ReadinessQuestion[] = [
  // Emotional Availability
  {
    id: 'ea_1',
    dimension: 'emotional_availability',
    questionText: 'How emotionally available do you feel for a new relationship right now?',
    questionType: 'scale',
    weight: 1.0,
  },
  {
    id: 'ea_2',
    dimension: 'emotional_availability',
    questionText: 'Are you currently processing emotions from a past relationship?',
    questionType: 'scale',
    weight: 0.8,
  },
  {
    id: 'ea_3',
    dimension: 'emotional_availability',
    questionText: 'How comfortable are you being vulnerable with someone new?',
    questionType: 'scale',
    weight: 0.7,
  },

  // Time Availability
  {
    id: 'ta_1',
    dimension: 'time_availability',
    questionText: 'How much time can you realistically dedicate to dating each week?',
    questionType: 'multiple_choice',
    options: [
      { value: 20, label: 'Very limited (< 2 hours/week)' },
      { value: 50, label: 'Some time (2-5 hours/week)' },
      { value: 80, label: 'Good availability (5-10 hours/week)' },
      { value: 100, label: 'Very available (10+ hours/week)' },
    ],
    weight: 1.0,
  },
  {
    id: 'ta_2',
    dimension: 'time_availability',
    questionText:
      'Are there major life events (career, moving, etc.) competing for your attention?',
    questionType: 'scale',
    weight: 0.6,
  },

  // Previous Relationship Recovery
  {
    id: 'prr_1',
    dimension: 'previous_relationship_recovery',
    questionText: 'How long has it been since your last significant relationship ended?',
    questionType: 'multiple_choice',
    options: [
      { value: 30, label: 'Less than 3 months' },
      { value: 60, label: '3-6 months' },
      { value: 80, label: '6-12 months' },
      { value: 100, label: 'More than 12 months' },
    ],
    weight: 0.8,
  },
  {
    id: 'prr_2',
    dimension: 'previous_relationship_recovery',
    questionText: 'How much have you processed and learned from your past relationships?',
    questionType: 'scale',
    weight: 1.0,
  },
  {
    id: 'prr_3',
    dimension: 'previous_relationship_recovery',
    questionText: 'Do you still have unresolved feelings for an ex?',
    questionType: 'scale',
    weight: 0.9,
  },

  // Communication Readiness
  {
    id: 'cr_1',
    dimension: 'communication_readiness',
    questionText: 'How comfortable are you expressing your needs and boundaries?',
    questionType: 'scale',
    weight: 1.0,
  },
  {
    id: 'cr_2',
    dimension: 'communication_readiness',
    questionText: 'How well do you handle conflict or disagreements in relationships?',
    questionType: 'scale',
    weight: 0.8,
  },

  // Intentionality
  {
    id: 'int_1',
    dimension: 'intentionality',
    questionText: "How clear are you about what you're looking for in a partner?",
    questionType: 'scale',
    weight: 1.0,
  },
  {
    id: 'int_2',
    dimension: 'intentionality',
    questionText: 'What type of relationship are you primarily seeking?',
    questionType: 'multiple_choice',
    options: [
      { value: 40, label: 'Just exploring, not sure yet' },
      { value: 60, label: 'Open to different possibilities' },
      { value: 80, label: 'Looking for something meaningful' },
      { value: 100, label: 'Actively seeking a committed relationship' },
    ],
    weight: 0.9,
  },

  // Self-Awareness
  {
    id: 'sa_1',
    dimension: 'self_awareness',
    questionText: 'How well do you understand your own attachment style and relationship patterns?',
    questionType: 'scale',
    weight: 1.0,
  },
  {
    id: 'sa_2',
    dimension: 'self_awareness',
    questionText:
      'How satisfied are you with yourself and your life independent of a relationship?',
    questionType: 'scale',
    weight: 0.8,
  },
];

export class ReadinessService {
  /**
   * Start a new readiness assessment
   */
  async startAssessment(
    userId: string,
    context: 'initial' | 'periodic' | 'post_break' = 'initial'
  ): Promise<{ assessmentId: string; questions: ReadinessQuestion[] }> {
    const db = dbClient.getClient();

    try {
      // Check for existing active assessment
      const existing = await db('readiness_assessments')
        .where('user_id', userId)
        .where('expires_at', '>', new Date())
        .orderBy('completed_at', 'desc')
        .first();

      // If recent assessment exists (within 7 days for periodic), return it
      if (existing && context === 'periodic') {
        const daysSinceCompleted =
          (Date.now() - new Date(existing.completed_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCompleted < 7) {
          return {
            assessmentId: existing.id,
            questions: [], // No new questions needed
          };
        }
      }

      // Get questions from database or use defaults
      let questions = await db('readiness_questions')
        .where('is_active', true)
        .orderBy('sort_order', 'asc');

      if (questions.length === 0) {
        questions = DEFAULT_QUESTIONS.map((q, index) => ({
          ...q,
          sort_order: index,
          is_active: true,
        }));
      }

      const assessmentId = uuidv4();

      return {
        assessmentId,
        questions: questions.map(this.mapToReadinessQuestion),
      };
    } catch (error: any) {
      logger.error('Error starting assessment:', error);
      throw error;
    }
  }

  /**
   * Submit answers and get assessment results
   */
  async submitAssessment(
    userId: string,
    assessmentId: string,
    answers: ReadinessAnswers
  ): Promise<ReadinessAssessment> {
    const db = dbClient.getClient();

    try {
      // Get questions for scoring
      let questions = await db('readiness_questions').where('is_active', true);

      if (questions.length === 0) {
        questions = DEFAULT_QUESTIONS as any;
      }

      // Calculate dimension scores
      const dimensionScores = this.calculateDimensionScores(questions, answers);

      // Calculate overall score with weights
      const weights = config.wellness.readinessWeights;
      const overallScore =
        dimensionScores.emotionalAvailability * weights.emotionalAvailability +
        dimensionScores.timeAvailability * weights.timeAvailability +
        dimensionScores.previousRelationshipRecovery * weights.previousRelationshipRecovery +
        dimensionScores.communicationReadiness * weights.communicationReadiness +
        dimensionScores.intentionalityScore * weights.intentionalityScore +
        dimensionScores.selfAwarenessScore * weights.selfAwarenessScore;

      // Determine readiness level
      const readinessLevel = this.getReadinessLevel(overallScore);
      const suggestedMode = this.getSuggestedDatingMode(overallScore, dimensionScores);
      const suggestedPace = this.getSuggestedPace(overallScore);

      // Analyze strengths and growth areas
      const { strengths, growthAreas } = this.analyzeStrengthsAndGrowth(dimensionScores);
      const blockers = this.identifyBlockers(dimensionScores, answers);
      const recommendations = this.generateReadinessRecommendations(
        dimensionScores,
        readinessLevel
      );

      // Save assessment
      const assessment = {
        id: assessmentId,
        user_id: userId,
        completed_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days

        emotional_availability: dimensionScores.emotionalAvailability,
        time_availability: dimensionScores.timeAvailability,
        previous_relationship_recovery: dimensionScores.previousRelationshipRecovery,
        communication_readiness: dimensionScores.communicationReadiness,
        intentionality_score: dimensionScores.intentionalityScore,
        self_awareness_score: dimensionScores.selfAwarenessScore,

        overall_readiness_score: overallScore,
        readiness_level: readinessLevel,
        suggested_dating_mode: suggestedMode,
        suggested_pace: suggestedPace,

        strengths: JSON.stringify(strengths),
        growth_areas: JSON.stringify(growthAreas),
        blockers: JSON.stringify(blockers),
        recommendations: JSON.stringify(recommendations),
        raw_answers: JSON.stringify(answers),
      };

      await db('readiness_assessments').insert(assessment);

      return this.mapToReadinessAssessment({
        ...assessment,
        strengths,
        growth_areas: growthAreas,
        blockers,
        recommendations,
      });
    } catch (error: any) {
      logger.error('Error submitting assessment:', error);
      throw error;
    }
  }

  /**
   * Get the most recent readiness assessment for a user
   */
  async getLatestAssessment(userId: string): Promise<ReadinessAssessment | null> {
    const db = dbClient.getClient();

    try {
      const assessment = await db('readiness_assessments')
        .where('user_id', userId)
        .orderBy('completed_at', 'desc')
        .first();

      if (!assessment) return null;

      return this.mapToReadinessAssessment(assessment);
    } catch (error: any) {
      logger.error('Error getting latest assessment:', error);
      throw error;
    }
  }

  /**
   * Get assessment history for a user
   */
  async getAssessmentHistory(userId: string, limit = 10): Promise<ReadinessAssessment[]> {
    const db = dbClient.getClient();

    try {
      const assessments = await db('readiness_assessments')
        .where('user_id', userId)
        .orderBy('completed_at', 'desc')
        .limit(limit);

      return assessments.map(this.mapToReadinessAssessment);
    } catch (error: any) {
      logger.error('Error getting assessment history:', error);
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateDimensionScores(
    questions: any[],
    answers: ReadinessAnswers
  ): Record<string, number> {
    const dimensionTotals: Record<string, { sum: number; weightSum: number }> = {
      emotional_availability: { sum: 0, weightSum: 0 },
      time_availability: { sum: 0, weightSum: 0 },
      previous_relationship_recovery: { sum: 0, weightSum: 0 },
      communication_readiness: { sum: 0, weightSum: 0 },
      intentionality: { sum: 0, weightSum: 0 },
      self_awareness: { sum: 0, weightSum: 0 },
    };

    for (const question of questions) {
      const answer = answers[question.id];
      if (answer === undefined) continue;

      const dimension = question.dimension;
      const weight = question.weight || 1.0;

      let score: number;
      if (question.question_type === 'scale') {
        // Scale answers are 1-10, convert to 0-100
        score = (Number(answer) / 10) * 100;
      } else if (question.question_type === 'multiple_choice') {
        // Multiple choice already has values
        score = Number(answer);
      } else if (question.question_type === 'boolean') {
        // Boolean: depends on question context
        score = answer ? 100 : 0;
      } else {
        score = 50; // Default
      }

      // Some questions are inverse (e.g., "do you have unresolved feelings?")
      if (question.id === 'prr_3' || question.id === 'ta_2') {
        score = 100 - score; // Inverse the score
      }

      if (dimensionTotals[dimension]) {
        dimensionTotals[dimension].sum += score * weight;
        dimensionTotals[dimension].weightSum += weight;
      }
    }

    return {
      emotionalAvailability: this.safeDivide(
        dimensionTotals.emotional_availability.sum,
        dimensionTotals.emotional_availability.weightSum
      ),
      timeAvailability: this.safeDivide(
        dimensionTotals.time_availability.sum,
        dimensionTotals.time_availability.weightSum
      ),
      previousRelationshipRecovery: this.safeDivide(
        dimensionTotals.previous_relationship_recovery.sum,
        dimensionTotals.previous_relationship_recovery.weightSum
      ),
      communicationReadiness: this.safeDivide(
        dimensionTotals.communication_readiness.sum,
        dimensionTotals.communication_readiness.weightSum
      ),
      intentionalityScore: this.safeDivide(
        dimensionTotals.intentionality.sum,
        dimensionTotals.intentionality.weightSum
      ),
      selfAwarenessScore: this.safeDivide(
        dimensionTotals.self_awareness.sum,
        dimensionTotals.self_awareness.weightSum
      ),
    };
  }

  private safeDivide(num: number, denom: number): number {
    return denom > 0 ? Math.round((num / denom) * 100) / 100 : 50;
  }

  private getReadinessLevel(score: number): ReadinessLevel {
    if (score >= 86) return 'highly_ready';
    if (score >= 71) return 'ready';
    if (score >= 51) return 'approaching';
    if (score >= 31) return 'developing';
    return 'not_ready';
  }

  private getSuggestedDatingMode(
    overallScore: number,
    dimensionScores: Record<string, number>
  ): SuggestedDatingMode {
    if (overallScore < 35) return 'pause_and_reflect';
    if (overallScore < 55) return 'casual_exploration';
    if (overallScore < 75) return 'intentional_dating';
    return 'relationship_focused';
  }

  private getSuggestedPace(score: number): 'slow' | 'moderate' | 'ready' {
    if (score < 50) return 'slow';
    if (score < 75) return 'moderate';
    return 'ready';
  }

  private analyzeStrengthsAndGrowth(dimensionScores: Record<string, number>): {
    strengths: string[];
    growthAreas: string[];
  } {
    const dimensionLabels: Record<string, string> = {
      emotionalAvailability: 'Emotional Availability',
      timeAvailability: 'Time Availability',
      previousRelationshipRecovery: 'Past Relationship Processing',
      communicationReadiness: 'Communication Skills',
      intentionalityScore: 'Dating Intentionality',
      selfAwarenessScore: 'Self-Awareness',
    };

    const strengths: string[] = [];
    const growthAreas: string[] = [];

    for (const [key, score] of Object.entries(dimensionScores)) {
      const label = dimensionLabels[key] || key;
      if (score >= 75) {
        strengths.push(label);
      } else if (score < 50) {
        growthAreas.push(label);
      }
    }

    return { strengths, growthAreas };
  }

  private identifyBlockers(
    dimensionScores: Record<string, number>,
    answers: ReadinessAnswers
  ): ReadinessBlocker[] {
    const blockers: ReadinessBlocker[] = [];

    // Check for significant blockers
    if (dimensionScores.emotionalAvailability < 40) {
      blockers.push({
        dimension: 'Emotional Availability',
        severity: dimensionScores.emotionalAvailability < 25 ? 'significant' : 'moderate',
        description: 'You may not be emotionally ready for a new relationship right now.',
        suggestedAction: 'Consider taking time for self-reflection and emotional processing.',
      });
    }

    if (dimensionScores.previousRelationshipRecovery < 40) {
      blockers.push({
        dimension: 'Past Relationship',
        severity: dimensionScores.previousRelationshipRecovery < 25 ? 'significant' : 'moderate',
        description: 'Unresolved feelings from past relationships may affect new connections.',
        suggestedAction: 'Work through closure before actively dating.',
      });
    }

    if (dimensionScores.timeAvailability < 30) {
      blockers.push({
        dimension: 'Time Availability',
        severity: 'moderate',
        description: 'Limited time availability may make it hard to build meaningful connections.',
        suggestedAction: 'Consider whether this is the right time to prioritize dating.',
      });
    }

    return blockers;
  }

  private generateReadinessRecommendations(
    dimensionScores: Record<string, number>,
    level: ReadinessLevel
  ): ReadinessRecommendation[] {
    const recommendations: ReadinessRecommendation[] = [];

    if (level === 'not_ready' || level === 'developing') {
      recommendations.push({
        category: 'Self-Work',
        title: 'Focus on Personal Growth',
        description: 'Before actively dating, invest time in understanding yourself better.',
        resources: ['Attachment style assessment', 'Journaling prompts', 'Therapy/counseling'],
        timeframe: '2-4 weeks',
      });
    }

    if (dimensionScores.communicationReadiness < 60) {
      recommendations.push({
        category: 'Communication',
        title: 'Develop Communication Skills',
        description: 'Strong communication is key to healthy relationships.',
        resources: ['Nonviolent Communication resources', 'Boundary-setting guides'],
        timeframe: 'Ongoing',
      });
    }

    if (dimensionScores.selfAwarenessScore < 60) {
      recommendations.push({
        category: 'Self-Awareness',
        title: 'Deepen Self-Understanding',
        description: 'Know your patterns, needs, and dealbreakers before dating.',
        resources: ['Personality assessments', 'Values clarification exercises'],
        timeframe: '1-2 weeks',
      });
    }

    if (level === 'ready' || level === 'highly_ready') {
      recommendations.push({
        category: 'Action',
        title: "You're Ready to Date!",
        description: "Your readiness assessment shows you're in a good place to find connection.",
        resources: ['Profile optimization tips', 'First date conversation guides'],
        timeframe: 'Now',
      });
    }

    return recommendations;
  }

  private mapToReadinessQuestion(row: any): ReadinessQuestion {
    return {
      id: row.id,
      dimension: row.dimension,
      questionText: row.question_text,
      questionType: row.question_type,
      options: row.options,
      weight: parseFloat(row.weight) || 1.0,
    };
  }

  private mapToReadinessAssessment(row: any): ReadinessAssessment {
    return {
      id: row.id,
      userId: row.user_id,
      completedAt: row.completed_at,
      expiresAt: row.expires_at,

      emotionalAvailability: parseFloat(row.emotional_availability),
      timeAvailability: parseFloat(row.time_availability),
      previousRelationshipRecovery: parseFloat(row.previous_relationship_recovery),
      communicationReadiness: parseFloat(row.communication_readiness),
      intentionalityScore: parseFloat(row.intentionality_score),
      selfAwarenessScore: parseFloat(row.self_awareness_score),

      overallReadinessScore: parseFloat(row.overall_readiness_score),
      readinessLevel: row.readiness_level,

      strengths: typeof row.strengths === 'string' ? JSON.parse(row.strengths) : row.strengths,
      growthAreas:
        typeof row.growth_areas === 'string' ? JSON.parse(row.growth_areas) : row.growth_areas,
      blockers: typeof row.blockers === 'string' ? JSON.parse(row.blockers) : row.blockers,
      recommendations:
        typeof row.recommendations === 'string'
          ? JSON.parse(row.recommendations)
          : row.recommendations,

      suggestedDatingMode: row.suggested_dating_mode,
      suggestedPace: row.suggested_pace,
    };
  }
}

export const readinessService = new ReadinessService();
