import {
  RekognitionClient,
  DetectModerationLabelsCommand,
  DetectFacesCommand,
} from '@aws-sdk/client-rekognition';
import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';

import config from '../../config';
import { ModerationResult, ModerationStatus } from '../../types';

const logger = createLogger('content-moderation-service');

// Moderation Service URL
const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://localhost:3005';

export class ContentModerationService {
  private client: RekognitionClient;

  constructor() {
    this.client = new RekognitionClient({
      region: config.aws.region,
    });
  }

  /**
   * Moderate image using the Moderation Service (AWS Rekognition)
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
          isRacyContent:
            moderationResult.detectedViolations?.includes('suggestive_nudity') || false,
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

      // Fallback to local AWS Rekognition if moderation service is down
      logger.warn('Falling back to local AWS Rekognition analysis');
      return await this.fallbackModeration(imageUrl);
    }
  }

  /**
   * Fallback moderation using AWS Rekognition directly
   */
  private async fallbackModeration(
    imageUrl: string
  ): Promise<{ status: ModerationStatus; result: ModerationResult }> {
    try {
      // Download image for Rekognition
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const imageBytes = Buffer.from(imageResponse.data);

      // Detect moderation labels
      const moderationCommand = new DetectModerationLabelsCommand({
        Image: { Bytes: imageBytes },
        MinConfidence: 50,
      });

      const moderationResponse = await this.client.send(moderationCommand);
      const labels = moderationResponse.ModerationLabels || [];

      // Calculate scores from labels
      let adultScore = 0;
      let racyScore = 0;
      let violenceScore = 0;

      for (const label of labels) {
        const confidence = (label.Confidence || 0) / 100;
        const name = label.Name?.toLowerCase() || '';
        const parentName = label.ParentName?.toLowerCase() || '';

        if (
          name.includes('explicit') ||
          name.includes('nudity') ||
          parentName.includes('explicit')
        ) {
          adultScore = Math.max(adultScore, confidence);
        }
        if (
          name.includes('suggestive') ||
          name.includes('revealing') ||
          parentName.includes('suggestive')
        ) {
          racyScore = Math.max(racyScore, confidence);
        }
        if (
          name.includes('violence') ||
          name.includes('gore') ||
          parentName.includes('violence')
        ) {
          violenceScore = Math.max(violenceScore, confidence);
        }
      }

      const result: ModerationResult = {
        isAdultContent: adultScore >= config.moderation.adultContentThreshold,
        isRacyContent: racyScore >= config.moderation.racyContentThreshold,
        isViolentContent: violenceScore >= config.moderation.violenceContentThreshold,
        adultScore,
        racyScore,
        violenceScore,
        tags: labels.map((l) => l.Name || ''),
        description: '',
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
    const { adultContentThreshold, racyContentThreshold, violenceContentThreshold } =
      config.moderation;

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
   * Detect faces in image using AWS Rekognition
   */
  async detectFaces(imageUrl: string): Promise<number> {
    try {
      // Download image for Rekognition
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const imageBytes = Buffer.from(imageResponse.data);

      const command = new DetectFacesCommand({
        Image: { Bytes: imageBytes },
        Attributes: ['DEFAULT'],
      });

      const response = await this.client.send(command);
      const faceCount = response.FaceDetails?.length || 0;

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
  async getImageDescription(_imageUrl: string): Promise<string> {
    // AWS Rekognition doesn't provide image descriptions directly
    // This could be implemented using AWS Bedrock or other services if needed
    return 'Image description not available';
  }
}

export default new ContentModerationService();
