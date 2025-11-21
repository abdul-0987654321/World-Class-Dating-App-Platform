import axios from 'axios';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import config from '../../config';
import { ModerationResult, ModerationStatus } from '../../types';
import { createLogger } from '@connectsphere/shared';

const logger = createLogger('content-moderation-service');

// Moderation Service URL
const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://localhost:3005';

export class ContentModerationService {
  private client: ComputerVisionClient;

  constructor() {
    const credentials = new ApiKeyCredentials({
      inHeader: { 'Ocp-Apim-Subscription-Key': config.computerVision.apiKey },
    });

    this.client = new ComputerVisionClient(credentials, config.computerVision.endpoint);
  }

  /**
   * Moderate image using the Moderation Service (AWS Rekognition + Azure)
   */
  async moderateImage(
    imageUrl: string,
    contentId: string,
    userId: string
  ): Promise<{ status: ModerationStatus; result: any }> {
    try {
      logger.info(`Sending image to moderation service: ${imageUrl}`);

      // Call the moderation service
      const response = await axios.post(`${MODERATION_SERVICE_URL}/api/moderation/image`, {
        contentId,
        imageUrl,
        userId,
        contentType: 'image',
      });

      const moderationResult = response.data.result;

      // Map moderation service status to our status enum
      let status: ModerationStatus;
      switch (moderationResult.status) {
        case 'approved':
          status = ModerationStatus.APPROVED;
          break;
        case 'rejected':
          status = ModerationStatus.REJECTED;
          break;
        case 'flagged':
          status = ModerationStatus.FLAGGED;
          break;
        default:
          status = ModerationStatus.PENDING;
      }

      logger.info(`Moderation complete: ${status} (risk: ${moderationResult.overallRiskScore})`);

      return {
        status,
        result: {
          isAdultContent: moderationResult.detectedViolations?.includes('explicit_nudity') || false,
          isRacyContent: moderationResult.detectedViolations?.includes('suggestive_nudity') || false,
          isViolentContent: moderationResult.detectedViolations?.includes('violence') || false,
          adultScore: moderationResult.imageModerationResult?.categories?.explicitNudity || 0,
          racyScore: moderationResult.imageModerationResult?.categories?.suggestiveNudity || 0,
          violenceScore: moderationResult.imageModerationResult?.categories?.violence || 0,
          overallRiskScore: moderationResult.overallRiskScore,
          detectedViolations: moderationResult.detectedViolations || [],
          moderationAction: moderationResult.action,
        },
      };
    } catch (error: any) {
      logger.error('Image moderation failed:', error);

      // Fallback to local Azure Computer Vision if moderation service is down
      logger.warn('Falling back to local Azure Computer Vision analysis');
      return await this.fallbackModeration(imageUrl);
    }
  }

  /**
   * Fallback moderation using Azure Computer Vision directly
   */
  private async fallbackModeration(imageUrl: string): Promise<{ status: ModerationStatus; result: ModerationResult }> {
    try {
      const analysis = await this.client.analyzeImage(imageUrl, {
        visualFeatures: ['Adult', 'Description', 'Tags'],
      });

      const result: ModerationResult = {
        isAdultContent: analysis.adult?.isAdultContent || false,
        isRacyContent: analysis.adult?.isRacyContent || false,
        isViolentContent: analysis.adult?.isGoryContent || false,
        adultScore: analysis.adult?.adultScore || 0,
        racyScore: analysis.adult?.racyScore || 0,
        violenceScore: analysis.adult?.goreScore || 0,
        tags: analysis.tags?.map((tag) => tag.name || '') || [],
        description: analysis.description?.captions?.[0]?.text || '',
      };

      const status = this.determineModerationStatus(result);

      return { status, result };
    } catch (error) {
      logger.error('Fallback moderation also failed', error);
      // Default to pending for manual review
      return {
        status: ModerationStatus.PENDING,
        result: {
          isAdultContent: false,
          isRacyContent: false,
          isViolentContent: false,
          adultScore: 0,
          racyScore: 0,
          violenceScore: 0,
          tags: [],
          description: '',
        },
      };
    }
  }

  /**
   * Determine moderation status based on analysis result (for fallback)
   */
  private determineModerationStatus(result: ModerationResult): ModerationStatus {
    const { adultScore, racyScore, violenceScore } = result;
    const {
      adultContentThreshold,
      racyContentThreshold,
      violenceContentThreshold,
    } = config.moderation;

    // Reject if any score exceeds threshold
    if (
      adultScore >= adultContentThreshold ||
      racyScore >= racyContentThreshold ||
      violenceScore >= violenceContentThreshold
    ) {
      logger.warn('Image rejected due to inappropriate content', {
        adultScore,
        racyScore,
        violenceScore,
      });
      return ModerationStatus.REJECTED;
    }

    // Flag for manual review if scores are borderline (50-70%)
    if (
      (adultScore >= 0.5 && adultScore < adultContentThreshold) ||
      (racyScore >= 0.5 && racyScore < racyContentThreshold) ||
      (violenceScore >= 0.5 && violenceScore < violenceContentThreshold)
    ) {
      logger.info('Image flagged for manual review', {
        adultScore,
        racyScore,
        violenceScore,
      });
      return ModerationStatus.FLAGGED;
    }

    return ModerationStatus.APPROVED;
  }

  /**
   * Detect faces in image
   */
  async detectFaces(imageUrl: string): Promise<number> {
    try {
      const faces = await this.client.analyzeImage(imageUrl, {
        visualFeatures: ['Faces'],
      });

      const faceCount = faces.faces?.length || 0;
      logger.info(`Detected ${faceCount} face(s) in image`);

      return faceCount;
    } catch (error) {
      logger.error('Face detection failed', error);
      throw new Error('Face detection failed');
    }
  }

  /**
   * Verify that image contains at least one face (for profile photos)
   */
  async verifyFacePresence(imageUrl: string): Promise<boolean> {
    try {
      const faceCount = await this.detectFaces(imageUrl);
      return faceCount >= 1;
    } catch (error) {
      logger.error('Face verification failed', error);
      return false;
    }
  }

  /**
   * Get image description for accessibility
   */
  async getImageDescription(imageUrl: string): Promise<string> {
    try {
      const description = await this.client.describeImage(imageUrl);
      return description.captions?.[0]?.text || 'No description available';
    } catch (error) {
      logger.error('Failed to get image description', error);
      return 'No description available';
    }
  }
}

export default new ContentModerationService();
