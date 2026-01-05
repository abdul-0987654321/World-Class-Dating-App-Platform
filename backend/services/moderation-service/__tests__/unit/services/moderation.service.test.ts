/**
 * Moderation Service Unit Tests
 *
 * Tests critical safety paths for content moderation including:
 * - Image moderation with AWS Rekognition
 * - Text moderation with Azure Content Moderator
 * - Violation handling and user penalties
 * - Risk score thresholds
 */

import {
  ModerationStatus,
  ModerationAction,
  ContentType,
  ViolationType,
  ImageModerationResult,
  TextModerationResult,
} from '../../../src/types';

// Mock external services
jest.mock('../../../src/services/aws-rekognition.service', () => ({
  default: {
    moderateImage: jest.fn(),
  },
}));

jest.mock('../../../src/services/azure-content-moderator.service', () => ({
  default: {
    moderateText: jest.fn(),
  },
}));

jest.mock('../../../src/infrastructure/database/connection', () => ({
  default: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 'test-id' }]),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(1),
    increment: jest.fn().mockResolvedValue(1),
  })),
}));

jest.mock('../../../src/infrastructure/clients/notification-service.client', () => ({
  default: {
    sendNotification: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import awsRekognitionService from '../../../src/services/aws-rekognition.service';
import azureContentModeratorService from '../../../src/services/azure-content-moderator.service';
import { ModerationService } from '../../../src/services/moderation.service';

describe('ModerationService', () => {
  let moderationService: ModerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    moderationService = new ModerationService();
  });

  describe('moderateImage', () => {
    const mockImageRequest = {
      userId: 'user-123',
      contentId: 'content-456',
      contentType: ContentType.IMAGE,
      imageUrl: 'https://example.com/image.jpg',
    };

    it('should approve safe images with low risk score', async () => {
      const mockResult: ImageModerationResult = {
        moderationLabels: [],
        categories: {},
        overallRiskScore: 0.1,
        detectedViolations: [],
        recommendations: [],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateImage(mockImageRequest);

      expect(result.status).toBe(ModerationStatus.APPROVED);
      expect(result.action).toBe(ModerationAction.AUTO_APPROVED);
      expect(result.overallRiskScore).toBe(0.1);
      expect(result.detectedViolations).toEqual([]);
    });

    it('should flag images with medium risk score for manual review', async () => {
      const mockResult: ImageModerationResult = {
        moderationLabels: [
          { name: 'Suggestive', confidence: 0.65 },
        ],
        categories: { suggestive: 0.65 },
        overallRiskScore: 0.55,
        detectedViolations: [ViolationType.SUGGESTIVE_NUDITY],
        recommendations: ['Manual review recommended'],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateImage(mockImageRequest);

      expect(result.status).toBe(ModerationStatus.FLAGGED);
      expect(result.action).toBe(ModerationAction.AUTO_FLAGGED);
      expect(result.detectedViolations).toContain(ViolationType.SUGGESTIVE_NUDITY);
    });

    it('should reject images with high risk score', async () => {
      const mockResult: ImageModerationResult = {
        moderationLabels: [
          { name: 'Explicit Nudity', confidence: 0.95 },
        ],
        categories: { explicitNudity: 0.95 },
        overallRiskScore: 0.95,
        detectedViolations: [ViolationType.EXPLICIT_NUDITY],
        recommendations: ['Content violates community guidelines'],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateImage(mockImageRequest);

      expect(result.status).toBe(ModerationStatus.REJECTED);
      expect(result.action).toBe(ModerationAction.AUTO_REJECTED);
      expect(result.detectedViolations).toContain(ViolationType.EXPLICIT_NUDITY);
    });

    it('should detect violence and reject content', async () => {
      const mockResult: ImageModerationResult = {
        moderationLabels: [
          { name: 'Violence', confidence: 0.88 },
        ],
        categories: { violence: 0.88 },
        overallRiskScore: 0.88,
        detectedViolations: [ViolationType.VIOLENCE],
        recommendations: ['Violent content not allowed'],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateImage(mockImageRequest);

      expect(result.status).toBe(ModerationStatus.REJECTED);
      expect(result.detectedViolations).toContain(ViolationType.VIOLENCE);
    });

    it('should handle AWS Rekognition errors gracefully', async () => {
      (awsRekognitionService.moderateImage as jest.Mock).mockRejectedValue(
        new Error('AWS service unavailable')
      );

      await expect(moderationService.moderateImage(mockImageRequest)).rejects.toThrow(
        'AWS service unavailable'
      );
    });
  });

  describe('moderateText', () => {
    const mockTextRequest = {
      userId: 'user-123',
      contentId: 'content-789',
      contentType: ContentType.MESSAGE,
      text: 'Hello, how are you?',
    };

    it('should approve clean text with low scores', async () => {
      const mockResult: TextModerationResult = {
        profanityScore: 0.05,
        sexuallyScore: 0.02,
        offensiveScore: 0.03,
        overallRiskScore: 0.1,
        detectedViolations: [],
        piiDetected: [],
        recommendations: [],
      };

      (azureContentModeratorService.moderateText as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateText(mockTextRequest);

      expect(result.status).toBe(ModerationStatus.APPROVED);
      expect(result.action).toBe(ModerationAction.AUTO_APPROVED);
    });

    it('should flag text with profanity for review', async () => {
      const mockResult: TextModerationResult = {
        profanityScore: 0.6,
        sexuallyScore: 0.1,
        offensiveScore: 0.3,
        overallRiskScore: 0.55,
        detectedViolations: [ViolationType.PROFANITY],
        piiDetected: [],
        recommendations: ['Contains mild profanity'],
      };

      (azureContentModeratorService.moderateText as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateText(mockTextRequest);

      expect(result.status).toBe(ModerationStatus.FLAGGED);
      expect(result.detectedViolations).toContain(ViolationType.PROFANITY);
    });

    it('should reject text with hate speech', async () => {
      const mockResult: TextModerationResult = {
        profanityScore: 0.4,
        sexuallyScore: 0.1,
        offensiveScore: 0.95,
        overallRiskScore: 0.9,
        detectedViolations: [ViolationType.HATE_SPEECH, ViolationType.HARASSMENT],
        piiDetected: [],
        recommendations: ['Violates community guidelines'],
      };

      (azureContentModeratorService.moderateText as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateText(mockTextRequest);

      expect(result.status).toBe(ModerationStatus.REJECTED);
      expect(result.detectedViolations).toContain(ViolationType.HATE_SPEECH);
      expect(result.detectedViolations).toContain(ViolationType.HARASSMENT);
    });

    it('should detect and flag spam content', async () => {
      const mockResult: TextModerationResult = {
        profanityScore: 0.1,
        sexuallyScore: 0.05,
        offensiveScore: 0.1,
        overallRiskScore: 0.7,
        detectedViolations: [ViolationType.SPAM],
        piiDetected: [],
        recommendations: ['Likely spam content'],
      };

      (azureContentModeratorService.moderateText as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateText(mockTextRequest);

      expect(result.detectedViolations).toContain(ViolationType.SPAM);
    });
  });

  describe('Risk Score Thresholds', () => {
    it('should use correct threshold for auto-approve (< 0.3)', async () => {
      const mockResult: ImageModerationResult = {
        moderationLabels: [],
        categories: {},
        overallRiskScore: 0.29,
        detectedViolations: [],
        recommendations: [],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateImage({
        userId: 'user-123',
        contentId: 'content-456',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.status).toBe(ModerationStatus.APPROVED);
    });

    it('should use correct threshold for flag (0.3 - 0.7)', async () => {
      const mockResult: ImageModerationResult = {
        moderationLabels: [{ name: 'Suggestive', confidence: 0.5 }],
        categories: { suggestive: 0.5 },
        overallRiskScore: 0.5,
        detectedViolations: [ViolationType.SUGGESTIVE_NUDITY],
        recommendations: [],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateImage({
        userId: 'user-123',
        contentId: 'content-456',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.status).toBe(ModerationStatus.FLAGGED);
    });

    it('should use correct threshold for auto-reject (>= 0.7)', async () => {
      const mockResult: ImageModerationResult = {
        moderationLabels: [{ name: 'Explicit', confidence: 0.8 }],
        categories: { explicit: 0.8 },
        overallRiskScore: 0.7,
        detectedViolations: [ViolationType.EXPLICIT_NUDITY],
        recommendations: [],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateImage({
        userId: 'user-123',
        contentId: 'content-456',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.status).toBe(ModerationStatus.REJECTED);
    });
  });

  describe('Content Type Handling', () => {
    it('should correctly set content type for profile images', async () => {
      const mockResult: ImageModerationResult = {
        moderationLabels: [],
        categories: {},
        overallRiskScore: 0.1,
        detectedViolations: [],
        recommendations: [],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateImage({
        userId: 'user-123',
        contentId: 'content-456',
        contentType: ContentType.PROFILE,
        imageUrl: 'https://example.com/profile.jpg',
      });

      expect(result.contentType).toBe(ContentType.PROFILE);
    });

    it('should correctly set content type for bio text', async () => {
      const mockResult: TextModerationResult = {
        profanityScore: 0.05,
        sexuallyScore: 0.02,
        offensiveScore: 0.03,
        overallRiskScore: 0.1,
        detectedViolations: [],
        piiDetected: [],
        recommendations: [],
      };

      (azureContentModeratorService.moderateText as jest.Mock).mockResolvedValue(mockResult);

      const result = await moderationService.moderateText({
        userId: 'user-123',
        contentId: 'content-789',
        contentType: ContentType.BIO,
        text: 'I love hiking and traveling',
      });

      expect(result.contentType).toBe(ContentType.BIO);
    });
  });
});

describe('ModerationService - Edge Cases', () => {
  let moderationService: ModerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    moderationService = new ModerationService();
  });

  it('should handle empty moderation labels', async () => {
    const mockResult: ImageModerationResult = {
      moderationLabels: [],
      categories: {},
      overallRiskScore: 0.0,
      detectedViolations: [],
      recommendations: [],
    };

    (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

    const result = await moderationService.moderateImage({
      userId: 'user-123',
      contentId: 'content-456',
      imageUrl: 'https://example.com/image.jpg',
    });

    expect(result.status).toBe(ModerationStatus.APPROVED);
    expect(result.moderationLabels || result.imageModerationResult?.moderationLabels).toEqual([]);
  });

  it('should handle multiple violations in single content', async () => {
    const mockResult: ImageModerationResult = {
      moderationLabels: [
        { name: 'Violence', confidence: 0.8 },
        { name: 'Drugs', confidence: 0.75 },
      ],
      categories: { violence: 0.8, drugs: 0.75 },
      overallRiskScore: 0.9,
      detectedViolations: [ViolationType.VIOLENCE, ViolationType.DRUGS],
      recommendations: ['Multiple policy violations detected'],
    };

    (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

    const result = await moderationService.moderateImage({
      userId: 'user-123',
      contentId: 'content-456',
      imageUrl: 'https://example.com/image.jpg',
    });

    expect(result.detectedViolations.length).toBeGreaterThanOrEqual(2);
    expect(result.detectedViolations).toContain(ViolationType.VIOLENCE);
    expect(result.detectedViolations).toContain(ViolationType.DRUGS);
  });

  it('should handle underage detection with highest priority', async () => {
    const mockResult: ImageModerationResult = {
      moderationLabels: [
        { name: 'Underage', confidence: 0.85 },
      ],
      categories: { underage: 0.85 },
      overallRiskScore: 1.0, // Maximum risk for underage content
      detectedViolations: [ViolationType.UNDERAGE],
      recommendations: ['Immediate action required'],
    };

    (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockResult);

    const result = await moderationService.moderateImage({
      userId: 'user-123',
      contentId: 'content-456',
      imageUrl: 'https://example.com/image.jpg',
    });

    expect(result.status).toBe(ModerationStatus.REJECTED);
    expect(result.detectedViolations).toContain(ViolationType.UNDERAGE);
    expect(result.overallRiskScore).toBe(1.0);
  });
});
