import axios from 'axios';
import config from '../config';
import { createLogger } from '@flamoral/shared';
import { TextModerationResult, ViolationType, AzureTextModerationResponse } from '../types';

const logger = createLogger('azure-content-moderator-service');

export class AzureContentModeratorService {
  private endpoint: string;
  private apiKey: string;

  constructor() {
    this.endpoint = config.azure.contentModerator.endpoint;
    this.apiKey = config.azure.contentModerator.apiKey;

    if (this.isConfigured()) {
      logger.info('Azure Content Moderator service initialized');
    } else {
      logger.warn('Azure Content Moderator not configured. Text moderation will be limited.');
    }
  }

  /**
   * Moderate text content using Azure Content Moderator
   */
  async moderateText(text: string): Promise<TextModerationResult> {
    try {
      logger.info('Moderating text content');

      if (!this.isConfigured()) {
        // Return default result if not configured
        return this.createDefaultResult(text);
      }

      // Call Azure Content Moderator Text API
      const url = `${this.endpoint}/contentmoderator/moderate/v1.0/ProcessText/Screen`;

      const response = await axios.post<AzureTextModerationResponse>(
        url,
        text,
        {
          headers: {
            'Content-Type': 'text/plain',
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
          params: {
            language: 'eng',
            autocorrect: false,
            PII: true,
            classify: true,
          },
          timeout: 10000,
        }
      );

      // Process response
      const data = response.data;

      // Extract scores
      const profanityScore = this.extractProfanityScore(data);
      const sexuallyScore = data.Classification?.Category1?.Score || 0;
      const offensiveScore = data.Classification?.Category2?.Score || 0;
      const hateScore = data.Classification?.Category3?.Score || 0;

      // Extract detected profanity
      const detectedProfanity = (data.Terms || []).map((term) => term.Term);

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore({
        profanityScore,
        sexuallyScore,
        offensiveScore,
        hateScore,
      });

      // Detect violations
      const detectedViolations = this.detectViolations({
        profanityScore,
        sexuallyScore,
        offensiveScore,
        hateScore,
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations(detectedViolations, overallRiskScore);

      const result: TextModerationResult = {
        profanityScore,
        sexuallyScore,
        offensiveScore,
        detectedProfanity,
        detectedLanguage: data.Language || 'unknown',
        overallRiskScore,
        detectedViolations,
        recommendations,
      };

      logger.info(`Text moderation complete. Risk score: ${overallRiskScore.toFixed(2)}`);
      return result;
    } catch (error: any) {
      logger.error('Text moderation failed:', error);

      // Fallback to basic profanity check
      return this.createFallbackResult(text);
    }
  }

  /**
   * Extract profanity score from response
   */
  private extractProfanityScore(data: AzureTextModerationResponse): number {
    // If profane terms are detected, return a high score
    if (data.Terms && data.Terms.length > 0) {
      return Math.min(1.0, 0.7 + data.Terms.length * 0.1);
    }
    return 0;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(scores: {
    profanityScore: number;
    sexuallyScore: number;
    offensiveScore: number;
    hateScore: number;
  }): number {
    // Weight different categories
    const weights = {
      profanity: 0.6,
      sexually: 0.8,
      offensive: 0.7,
      hate: 1.0,
    };

    const weightedScore =
      scores.profanityScore * weights.profanity +
      scores.sexuallyScore * weights.sexually +
      scores.offensiveScore * weights.offensive +
      scores.hateScore * weights.hate;

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

    return Math.min(1.0, weightedScore / totalWeight);
  }

  /**
   * Detect violations based on thresholds
   */
  private detectViolations(scores: {
    profanityScore: number;
    sexuallyScore: number;
    offensiveScore: number;
    hateScore: number;
  }): ViolationType[] {
    const violations: ViolationType[] = [];
    const thresholds = config.moderation.text;

    if (scores.profanityScore >= thresholds.profanity) {
      violations.push(ViolationType.PROFANITY);
    }
    if (scores.sexuallyScore >= thresholds.sexually) {
      violations.push(ViolationType.SEXUAL_CONTENT);
    }
    if (scores.offensiveScore >= thresholds.offensive) {
      violations.push(ViolationType.HARASSMENT);
    }
    if (scores.hateScore >= thresholds.hate) {
      violations.push(ViolationType.HATE_SPEECH);
    }

    return violations;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(violations: ViolationType[], riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskScore >= config.autoAction.autoRejectThreshold) {
      recommendations.push('AUTO_REJECT: Text contains severe violations');
    } else if (riskScore >= config.autoAction.autoFlagThreshold) {
      recommendations.push('FLAG_FOR_REVIEW: Text requires manual review');
    } else if (riskScore < config.autoAction.autoApproveThreshold) {
      recommendations.push('AUTO_APPROVE: Text is acceptable');
    }

    if (violations.includes(ViolationType.HATE_SPEECH)) {
      recommendations.push('Remove content and warn/suspend user - hate speech detected');
    }
    if (violations.includes(ViolationType.SEXUAL_CONTENT)) {
      recommendations.push('Remove or flag content - sexual content detected');
    }
    if (violations.includes(ViolationType.HARASSMENT)) {
      recommendations.push('Flag for review - potentially offensive content detected');
    }
    if (violations.includes(ViolationType.PROFANITY)) {
      recommendations.push('Warn user about profanity usage');
    }

    return recommendations;
  }

  /**
   * Create default result when service is not configured
   */
  private createDefaultResult(text: string): TextModerationResult {
    // Basic profanity check using word list
    const profanityWords = ['fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap'];
    const textLower = text.toLowerCase();
    const detectedProfanity: string[] = [];

    for (const word of profanityWords) {
      if (textLower.includes(word)) {
        detectedProfanity.push(word);
      }
    }

    const profanityScore = detectedProfanity.length > 0 ? 0.7 : 0;

    return {
      profanityScore,
      sexuallyScore: 0,
      offensiveScore: 0,
      detectedProfanity,
      detectedLanguage: 'unknown',
      overallRiskScore: profanityScore * 0.5,
      detectedViolations: profanityScore > 0 ? [ViolationType.PROFANITY] : [],
      recommendations: profanityScore > 0 ? ['Mild profanity detected'] : ['Content appears acceptable'],
    };
  }

  /**
   * Fallback result when API call fails
   */
  private createFallbackResult(text: string): TextModerationResult {
    logger.warn('Using fallback text moderation');
    return this.createDefaultResult(text);
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.endpoint && this.apiKey);
  }
}

export default new AzureContentModeratorService();
