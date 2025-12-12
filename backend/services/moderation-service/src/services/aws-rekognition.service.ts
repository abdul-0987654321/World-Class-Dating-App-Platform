import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import axios from 'axios';
import config from '../config';
import { createLogger } from '../utils/logger';
import { ImageModerationResult, ViolationType } from '../types';

const logger = createLogger('aws-rekognition-service');

export class AWSRekognitionService {
  private client: RekognitionClient;

  constructor() {
    // Initialize AWS Rekognition client
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      this.client = new RekognitionClient({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      });
      logger.info('AWS Rekognition client initialized');
    } else {
      logger.warn('AWS credentials not configured. Image moderation will be limited.');
    }
  }

  /**
   * Moderate an image using AWS Rekognition
   */
  async moderateImage(imageUrl: string): Promise<ImageModerationResult> {
    try {
      logger.info(`Moderating image: ${imageUrl}`);

      // Download image from URL
      const imageBuffer = await this.downloadImage(imageUrl);

      // Call AWS Rekognition Detect Moderation Labels API
      const command = new DetectModerationLabelsCommand({
        Image: {
          Bytes: imageBuffer,
        },
        MinConfidence: config.aws.rekognition.minConfidence,
      });

      const response = await this.client.send(command);

      // Process moderation labels
      const moderationLabels = (response.ModerationLabels || []).map((label) => ({
        name: label.Name || '',
        confidence: label.Confidence || 0,
        parentName: label.ParentName,
      }));

      // Categorize labels
      const categories = this.categorizeLabels(moderationLabels);

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(categories);

      // Detect violations
      const detectedViolations = this.detectViolations(categories);

      // Generate recommendations
      const recommendations = this.generateRecommendations(detectedViolations, overallRiskScore);

      const result: ImageModerationResult = {
        moderationLabels,
        categories,
        overallRiskScore,
        detectedViolations,
        recommendations,
      };

      logger.info(`Image moderation complete. Risk score: ${overallRiskScore.toFixed(2)}`);
      return result;
    } catch (error: any) {
      logger.error('Image moderation failed:', error);
      throw new Error(`Failed to moderate image: ${error.message}`);
    }
  }

  /**
   * Download image from URL
   */
  private async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      return Buffer.from(response.data);
    } catch (error: any) {
      logger.error('Failed to download image:', error);
      throw new Error('Failed to download image for moderation');
    }
  }

  /**
   * Categorize moderation labels into content categories
   */
  private categorizeLabels(
    labels: Array<{ name: string; confidence: number; parentName?: string }>
  ): { [category: string]: number } {
    const categories: { [category: string]: number } = {
      explicitNudity: 0,
      suggestiveNudity: 0,
      violence: 0,
      visuallyDisturbing: 0,
      rude: 0,
      drugs: 0,
      tobacco: 0,
      alcohol: 0,
      gambling: 0,
      hate: 0,
    };

    for (const label of labels) {
      const confidence = label.confidence / 100; // Convert to 0-1 scale

      // Map AWS labels to our categories
      const labelLower = label.name.toLowerCase();
      const parentLower = label.parentName?.toLowerCase() || '';

      // Explicit Nudity
      if (
        labelLower.includes('explicit') ||
        labelLower.includes('nudity') ||
        parentLower === 'explicit nudity'
      ) {
        categories.explicitNudity = Math.max(categories.explicitNudity, confidence);
      }

      // Suggestive Nudity
      if (
        labelLower.includes('suggestive') ||
        labelLower.includes('revealing') ||
        parentLower === 'suggestive'
      ) {
        categories.suggestiveNudity = Math.max(categories.suggestiveNudity, confidence);
      }

      // Violence
      if (
        labelLower.includes('violence') ||
        labelLower.includes('graphic') ||
        labelLower.includes('weapon') ||
        parentLower === 'violence'
      ) {
        categories.violence = Math.max(categories.violence, confidence);
      }

      // Visually Disturbing
      if (
        labelLower.includes('disturbing') ||
        labelLower.includes('gore') ||
        labelLower.includes('corpse') ||
        parentLower === 'visually disturbing'
      ) {
        categories.visuallyDisturbing = Math.max(categories.visuallyDisturbing, confidence);
      }

      // Rude Gestures
      if (labelLower.includes('rude') || labelLower.includes('gesture') || parentLower === 'rude gestures') {
        categories.rude = Math.max(categories.rude, confidence);
      }

      // Drugs
      if (labelLower.includes('drug') || parentLower === 'drugs') {
        categories.drugs = Math.max(categories.drugs, confidence);
      }

      // Tobacco
      if (labelLower.includes('tobacco') || labelLower.includes('smoking') || parentLower === 'tobacco') {
        categories.tobacco = Math.max(categories.tobacco, confidence);
      }

      // Alcohol
      if (labelLower.includes('alcohol') || labelLower.includes('drinking') || parentLower === 'alcohol') {
        categories.alcohol = Math.max(categories.alcohol, confidence);
      }

      // Gambling
      if (labelLower.includes('gambling') || parentLower === 'gambling') {
        categories.gambling = Math.max(categories.gambling, confidence);
      }

      // Hate Symbols
      if (labelLower.includes('hate') || labelLower.includes('symbol') || parentLower === 'hate symbols') {
        categories.hate = Math.max(categories.hate, confidence);
      }
    }

    return categories;
  }

  /**
   * Calculate overall risk score from categories
   */
  private calculateOverallRiskScore(categories: { [category: string]: number }): number {
    // Weight different categories (critical violations have higher weight)
    const weights = {
      explicitNudity: 1.0,
      suggestiveNudity: 0.6,
      violence: 0.9,
      visuallyDisturbing: 0.8,
      rude: 0.4,
      drugs: 0.7,
      tobacco: 0.3,
      alcohol: 0.3,
      gambling: 0.5,
      hate: 1.0,
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [category, score] of Object.entries(categories)) {
      const weight = weights[category as keyof typeof weights] || 0.5;
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }

    // Calculate weighted average
    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    return Math.min(1.0, overallScore); // Cap at 1.0
  }

  /**
   * Detect violations based on thresholds
   */
  private detectViolations(categories: { [category: string]: number }): ViolationType[] {
    const violations: ViolationType[] = [];
    const thresholds = config.moderation.image;

    if (categories.explicitNudity >= thresholds.explicitNudity) {
      violations.push(ViolationType.EXPLICIT_NUDITY);
    }
    if (categories.suggestiveNudity >= thresholds.suggestiveNudity) {
      violations.push(ViolationType.SUGGESTIVE_NUDITY);
    }
    if (categories.violence >= thresholds.violence) {
      violations.push(ViolationType.VIOLENCE);
    }
    if (categories.visuallyDisturbing >= thresholds.visuallyDisturbing) {
      violations.push(ViolationType.DISTURBING_CONTENT);
    }
    if (categories.rude >= thresholds.rude) {
      violations.push(ViolationType.HARASSMENT);
    }
    if (categories.drugs >= thresholds.drugs) {
      violations.push(ViolationType.DRUGS);
    }
    if (categories.tobacco >= thresholds.tobacco) {
      violations.push(ViolationType.TOBACCO);
    }
    if (categories.alcohol >= thresholds.alcohol) {
      violations.push(ViolationType.ALCOHOL);
    }
    if (categories.gambling >= thresholds.gambling) {
      violations.push(ViolationType.GAMBLING);
    }
    if (categories.hate >= thresholds.hate) {
      violations.push(ViolationType.HATE_SPEECH);
    }

    return violations;
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: ViolationType[], riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskScore >= config.autoAction.autoRejectThreshold) {
      recommendations.push('AUTO_REJECT: Risk score exceeds rejection threshold');
    } else if (riskScore >= config.autoAction.autoFlagThreshold) {
      recommendations.push('FLAG_FOR_REVIEW: Risk score requires manual review');
    } else if (riskScore < config.autoAction.autoApproveThreshold) {
      recommendations.push('AUTO_APPROVE: Risk score is acceptable');
    }

    if (violations.includes(ViolationType.EXPLICIT_NUDITY)) {
      recommendations.push('Remove image immediately - explicit nudity detected');
    }
    if (violations.includes(ViolationType.VIOLENCE)) {
      recommendations.push('Remove image - violent content detected');
    }
    if (violations.includes(ViolationType.HATE_SPEECH)) {
      recommendations.push('Remove image and warn/suspend user - hate symbols detected');
    }
    if (violations.includes(ViolationType.DISTURBING_CONTENT)) {
      recommendations.push('Remove image - visually disturbing content detected');
    }
    if (violations.includes(ViolationType.SUGGESTIVE_NUDITY)) {
      recommendations.push('Flag for manual review - suggestive content detected');
    }

    return recommendations;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(config.aws.accessKeyId && config.aws.secretAccessKey);
  }
}

export default new AWSRekognitionService();
