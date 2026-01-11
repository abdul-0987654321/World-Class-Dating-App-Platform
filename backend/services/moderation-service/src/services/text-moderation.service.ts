/**
 * Text Moderation Service using AWS Comprehend
 * Provides text moderation capabilities using AWS Comprehend for toxicity and sentiment detection.
 */

import {
  ComprehendClient,
  DetectSentimentCommand,
  DetectToxicContentCommand,
  ToxicLabels,
} from '@aws-sdk/client-comprehend';

import config from '../config';
import { TextModerationResult, ViolationType } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('text-moderation-service');

// Profanity list for basic detection (AWS Comprehend doesn't have built-in profanity)
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|damn|ass|bitch|bastard|crap|dick|cock|cunt|pussy|whore|slut|fag|faggot|nigger|retard)\b/gi,
];

export class TextModerationService {
  private client: ComprehendClient;

  constructor() {
    // Initialize AWS Comprehend client
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      this.client = new ComprehendClient({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      });
      logger.info('AWS Comprehend client initialized');
    } else {
      // Use default credentials (IAM role in production)
      this.client = new ComprehendClient({
        region: config.aws.region,
      });
      logger.info('AWS Comprehend client initialized with default credentials');
    }
  }

  /**
   * Moderate text content using AWS Comprehend
   */
  async moderateText(text: string): Promise<TextModerationResult> {
    try {
      logger.info('Moderating text content');

      // Run toxicity detection and sentiment analysis in parallel
      const [toxicityResult, sentimentResult, profanityResult] = await Promise.all([
        this.detectToxicity(text),
        this.detectSentiment(text),
        this.detectProfanity(text),
      ]);

      // Calculate scores
      const profanityScore = profanityResult.score;
      const sexuallyScore = toxicityResult.sexual || 0;
      const offensiveScore = Math.max(
        toxicityResult.insult || 0,
        toxicityResult.hateSpeech || 0,
        toxicityResult.threat || 0
      );

      // Detect violations
      const detectedViolations = this.detectViolations(toxicityResult, profanityResult);

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(
        profanityScore,
        sexuallyScore,
        offensiveScore,
        toxicityResult
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(detectedViolations, overallRiskScore);

      const result: TextModerationResult = {
        profanityScore,
        sexuallyScore,
        offensiveScore,
        detectedProfanity: profanityResult.words,
        detectedLanguage: 'en', // AWS Comprehend can detect language but we'll default to 'en'
        overallRiskScore,
        detectedViolations,
        recommendations,
      };

      logger.info(`Text moderation complete. Risk score: ${overallRiskScore.toFixed(2)}`);
      return result;
    } catch (error: any) {
      logger.error('Text moderation failed:', error);
      // Return a safe default result on error
      return {
        profanityScore: 0,
        sexuallyScore: 0,
        offensiveScore: 0,
        detectedProfanity: [],
        detectedLanguage: 'unknown',
        overallRiskScore: 0,
        detectedViolations: [],
        recommendations: ['Unable to analyze text. Manual review recommended.'],
      };
    }
  }

  /**
   * Detect toxicity in text using AWS Comprehend
   */
  private async detectToxicity(text: string): Promise<{
    hateSpeech: number;
    threat: number;
    insult: number;
    sexual: number;
    graphic: number;
  }> {
    try {
      const command = new DetectToxicContentCommand({
        TextSegments: [{ Text: text }],
        LanguageCode: 'en',
      });

      const response = await this.client.send(command);
      const labels = response.ResultList?.[0]?.Labels || [];

      // Map AWS toxicity labels to scores
      const toxicityScores = {
        hateSpeech: 0,
        threat: 0,
        insult: 0,
        sexual: 0,
        graphic: 0,
      };

      for (const label of labels) {
        const score = label.Score || 0;
        const name = label.Name as string;
        if (name === 'HATE_SPEECH') {
          toxicityScores.hateSpeech = score;
        } else if (name === 'THREAT') {
          toxicityScores.threat = score;
        } else if (name === 'INSULT') {
          toxicityScores.insult = score;
        } else if (name === 'SEXUAL') {
          toxicityScores.sexual = score;
        } else if (name === 'GRAPHIC') {
          toxicityScores.graphic = score;
        }
      }

      return toxicityScores;
    } catch (error) {
      logger.error('Toxicity detection failed:', error);
      return { hateSpeech: 0, threat: 0, insult: 0, sexual: 0, graphic: 0 };
    }
  }

  /**
   * Detect sentiment in text using AWS Comprehend
   */
  private async detectSentiment(text: string): Promise<{
    sentiment: string;
    negative: number;
  }> {
    try {
      const command = new DetectSentimentCommand({
        Text: text,
        LanguageCode: 'en',
      });

      const response = await this.client.send(command);

      return {
        sentiment: response.Sentiment || 'NEUTRAL',
        negative: response.SentimentScore?.Negative || 0,
      };
    } catch (error) {
      logger.error('Sentiment detection failed:', error);
      return { sentiment: 'NEUTRAL', negative: 0 };
    }
  }

  /**
   * Detect profanity using pattern matching
   */
  private detectProfanity(text: string): { score: number; words: string[] } {
    const detectedWords: string[] = [];

    for (const pattern of PROFANITY_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        detectedWords.push(...matches.map((w) => w.toLowerCase()));
      }
    }

    // Remove duplicates
    const uniqueWords = [...new Set(detectedWords)];

    // Calculate score based on number of profane words
    const score = Math.min(uniqueWords.length * 0.2, 1.0);

    return { score, words: uniqueWords };
  }

  /**
   * Detect violations from toxicity results
   */
  private detectViolations(
    toxicityResult: {
      hateSpeech: number;
      threat: number;
      insult: number;
      sexual: number;
      graphic: number;
    },
    profanityResult: { score: number; words: string[] }
  ): ViolationType[] {
    const violations: ViolationType[] = [];

    if (profanityResult.score >= config.moderation.text.profanity) {
      violations.push(ViolationType.PROFANITY);
    }

    if (toxicityResult.sexual >= config.moderation.text.sexually) {
      violations.push(ViolationType.SEXUAL_CONTENT);
    }

    if (toxicityResult.hateSpeech >= config.moderation.text.hate) {
      violations.push(ViolationType.HATE_SPEECH);
    }

    if (toxicityResult.insult >= config.moderation.text.offensive) {
      violations.push(ViolationType.HARASSMENT);
    }

    if (toxicityResult.threat >= 0.7) {
      violations.push(ViolationType.VIOLENCE);
    }

    if (toxicityResult.graphic >= 0.7) {
      violations.push(ViolationType.DISTURBING_CONTENT);
    }

    return violations;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(
    profanityScore: number,
    sexuallyScore: number,
    offensiveScore: number,
    toxicityResult: {
      hateSpeech: number;
      threat: number;
      insult: number;
      sexual: number;
      graphic: number;
    }
  ): number {
    // Weighted average of all scores
    const weights = {
      profanity: 0.15,
      sexually: 0.25,
      offensive: 0.2,
      hateSpeech: 0.2,
      threat: 0.15,
      graphic: 0.05,
    };

    const score =
      profanityScore * weights.profanity +
      sexuallyScore * weights.sexually +
      offensiveScore * weights.offensive +
      toxicityResult.hateSpeech * weights.hateSpeech +
      toxicityResult.threat * weights.threat +
      toxicityResult.graphic * weights.graphic;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: ViolationType[], riskScore: number): string[] {
    const recommendations: string[] = [];

    if (violations.length === 0 && riskScore < 0.3) {
      recommendations.push('Content appears appropriate');
      return recommendations;
    }

    if (violations.includes(ViolationType.PROFANITY)) {
      recommendations.push('Remove profane language');
    }

    if (violations.includes(ViolationType.SEXUAL_CONTENT)) {
      recommendations.push('Remove sexually explicit content');
    }

    if (violations.includes(ViolationType.HATE_SPEECH)) {
      recommendations.push('Remove hateful or discriminatory language');
    }

    if (violations.includes(ViolationType.HARASSMENT)) {
      recommendations.push('Remove insulting or harassing content');
    }

    if (violations.includes(ViolationType.VIOLENCE)) {
      recommendations.push('Remove threatening content');
    }

    if (violations.includes(ViolationType.DISTURBING_CONTENT)) {
      recommendations.push('Remove graphic or disturbing content');
    }

    if (riskScore >= 0.7) {
      recommendations.push('Content may need manual review');
    }

    return recommendations;
  }
}

// Export singleton instance
const textModerationService = new TextModerationService();
export default textModerationService;
