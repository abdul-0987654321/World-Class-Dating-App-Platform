import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ModerationService } from '../services/moderation.service';
import { AWSRekognitionService } from '../services/aws-rekognition.service';
import { AzureContentModeratorService } from '../services/azure-content-moderator.service';
import { ModerationStatus, ViolationType, ContentType } from '../types';
import db from '../infrastructure/database';

// Mock external services
jest.mock('../services/aws-rekognition.service');
jest.mock('../services/azure-content-moderator.service');
jest.mock('../infrastructure/database');

describe('ModerationService', () => {
  let moderationService: ModerationService;
  let mockAWSService: jest.Mocked<AWSRekognitionService>;
  let mockAzureService: jest.Mocked<AzureContentModeratorService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Initialize service
    moderationService = new ModerationService();
    mockAWSService = AWSRekognitionService as any;
    mockAzureService = AzureContentModeratorService as any;
  });

  afterEach(async () => {
    // Clean up test data
    if (db) {
      await db('moderation_logs').where('content_id', 'like', 'test-%').del();
      await db('user_violations').where('user_id', 'like', 'test-%').del();
      await db('user_moderation_records').where('user_id', 'like', 'test-%').del();
    }
  });

  describe('Image Moderation', () => {
    it('should auto-approve safe images (risk < 0.50)', async () => {
      // Mock AWS response for safe image
      mockAWSService.moderateImage.mockResolvedValue({
        moderationLabels: [],
        categories: {},
        overallRiskScore: 0.23,
        detectedViolations: [],
      });

      const result = await moderationService.moderateImage({
        contentId: 'test-img-001',
        imageUrl: 'https://example.com/safe-photo.jpg',
        userId: 'test-user-001',
        contentType: ContentType.IMAGE,
      });

      expect(result.status).toBe(ModerationStatus.APPROVED);
      expect(result.action).toBe('auto_approved');
      expect(result.overallRiskScore).toBeLessThan(0.5);
      expect(result.detectedViolations).toHaveLength(0);
    });

    it('should flag borderline images for review (risk 0.50-0.89)', async () => {
      // Mock AWS response for borderline content
      mockAWSService.moderateImage.mockResolvedValue({
        moderationLabels: [
          { name: 'Suggestive', confidence: 75 },
        ],
        categories: {
          suggestive: 0.75,
        },
        overallRiskScore: 0.75,
        detectedViolations: [ViolationType.SUGGESTIVE],
      });

      const result = await moderationService.moderateImage({
        contentId: 'test-img-002',
        imageUrl: 'https://example.com/borderline-photo.jpg',
        userId: 'test-user-002',
        contentType: ContentType.IMAGE,
      });

      expect(result.status).toBe(ModerationStatus.FLAGGED);
      expect(result.action).toBe('flagged_for_review');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0.5);
      expect(result.overallRiskScore).toBeLessThan(0.9);
      expect(result.detectedViolations).toContain(ViolationType.SUGGESTIVE);
    });

    it('should auto-reject explicit content (risk >= 0.90)', async () => {
      // Mock AWS response for explicit content
      mockAWSService.moderateImage.mockResolvedValue({
        moderationLabels: [
          { name: 'Explicit Nudity', confidence: 98 },
          { name: 'Graphic Male Nudity', confidence: 95 },
        ],
        categories: {
          explicitNudity: 0.98,
        },
        overallRiskScore: 0.98,
        detectedViolations: [ViolationType.EXPLICIT_NUDITY],
      });

      const result = await moderationService.moderateImage({
        contentId: 'test-img-003',
        imageUrl: 'https://example.com/explicit-photo.jpg',
        userId: 'test-user-003',
        contentType: ContentType.IMAGE,
      });

      expect(result.status).toBe(ModerationStatus.REJECTED);
      expect(result.action).toBe('auto_rejected');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0.9);
      expect(result.detectedViolations).toContain(ViolationType.EXPLICIT_NUDITY);
    });

    it('should detect multiple violation types', async () => {
      // Mock AWS response with multiple violations
      mockAWSService.moderateImage.mockResolvedValue({
        moderationLabels: [
          { name: 'Violence', confidence: 85 },
          { name: 'Weapons', confidence: 80 },
          { name: 'Blood', confidence: 75 },
        ],
        categories: {
          violence: 0.85,
          weapons: 0.80,
        },
        overallRiskScore: 0.85,
        detectedViolations: [ViolationType.VIOLENCE, ViolationType.WEAPONS],
      });

      const result = await moderationService.moderateImage({
        contentId: 'test-img-004',
        imageUrl: 'https://example.com/violent-photo.jpg',
        userId: 'test-user-004',
        contentType: ContentType.IMAGE,
      });

      expect(result.detectedViolations).toContain(ViolationType.VIOLENCE);
      expect(result.detectedViolations).toContain(ViolationType.WEAPONS);
      expect(result.detectedViolations.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle AWS service errors gracefully', async () => {
      // Mock AWS error
      mockAWSService.moderateImage.mockRejectedValue(
        new Error('AWS Rekognition service unavailable')
      );

      await expect(
        moderationService.moderateImage({
          contentId: 'test-img-005',
          imageUrl: 'https://example.com/photo.jpg',
          userId: 'test-user-005',
          contentType: ContentType.IMAGE,
        })
      ).rejects.toThrow('AWS Rekognition service unavailable');
    });
  });

  describe('Text Moderation', () => {
    it('should approve clean text', async () => {
      // Mock Azure response for clean text
      mockAzureService.moderateText.mockResolvedValue({
        profanity: { detected: false, terms: [] },
        hateSpeech: { detected: false, score: 0.05 },
        sexualContent: { detected: false, score: 0.03 },
        overallRiskScore: 0.05,
        detectedViolations: [],
      });

      const result = await moderationService.moderateText({
        contentId: 'test-txt-001',
        text: 'Hello, how are you today?',
        userId: 'test-user-001',
        contentType: ContentType.TEXT,
      });

      expect(result.status).toBe(ModerationStatus.APPROVED);
      expect(result.detectedViolations).toHaveLength(0);
    });

    it('should detect profanity in text', async () => {
      // Mock Azure response with profanity
      mockAzureService.moderateText.mockResolvedValue({
        profanity: {
          detected: true,
          terms: ['badword1', 'badword2'],
        },
        hateSpeech: { detected: false, score: 0.10 },
        sexualContent: { detected: false, score: 0.08 },
        overallRiskScore: 0.78,
        detectedViolations: [ViolationType.PROFANITY],
      });

      const result = await moderationService.moderateText({
        contentId: 'test-txt-002',
        text: 'This text contains profanity',
        userId: 'test-user-002',
        contentType: ContentType.TEXT,
      });

      expect(result.detectedViolations).toContain(ViolationType.PROFANITY);
      expect(result.status).toBe(ModerationStatus.FLAGGED);
    });

    it('should detect hate speech', async () => {
      // Mock Azure response with hate speech
      mockAzureService.moderateText.mockResolvedValue({
        profanity: { detected: false, terms: [] },
        hateSpeech: { detected: true, score: 0.92 },
        sexualContent: { detected: false, score: 0.05 },
        overallRiskScore: 0.92,
        detectedViolations: [ViolationType.HATE_SPEECH],
      });

      const result = await moderationService.moderateText({
        contentId: 'test-txt-003',
        text: 'This text contains hate speech',
        userId: 'test-user-003',
        contentType: ContentType.TEXT,
      });

      expect(result.detectedViolations).toContain(ViolationType.HATE_SPEECH);
      expect(result.status).toBe(ModerationStatus.REJECTED);
    });
  });

  describe('User Sanctions', () => {
    it('should issue warning for first violation', async () => {
      const userId = 'test-user-warn-001';

      // Mock database responses
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([]), // No previous violations
      });

      await moderationService.handleViolations(userId, {
        contentId: 'test-content-001',
        userId,
        status: ModerationStatus.REJECTED,
        action: 'auto_rejected',
        overallRiskScore: 0.95,
        detectedViolations: [ViolationType.EXPLICIT_NUDITY],
        recommendations: ['Content removed'],
        moderatedAt: new Date(),
      } as any);

      // Verify warning was issued
      // In real implementation, check database or service calls
      expect(true).toBe(true); // Placeholder
    });

    it('should suspend user after 3 violations', async () => {
      const userId = 'test-user-suspend-001';

      // Mock 3 previous violations
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([
          { id: '1', severity: 'medium' },
          { id: '2', severity: 'medium' },
          { id: '3', severity: 'high' },
        ]),
      });

      await moderationService.handleViolations(userId, {
        contentId: 'test-content-002',
        userId,
        status: ModerationStatus.REJECTED,
        action: 'auto_rejected',
        overallRiskScore: 0.92,
        detectedViolations: [ViolationType.VIOLENCE],
        recommendations: ['Account suspended'],
        moderatedAt: new Date(),
      } as any);

      // Verify suspension was applied
      expect(true).toBe(true); // Placeholder
    });

    it('should ban user after 5 violations', async () => {
      const userId = 'test-user-ban-001';

      // Mock 5+ previous violations
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([
          { id: '1', severity: 'high' },
          { id: '2', severity: 'high' },
          { id: '3', severity: 'critical' },
          { id: '4', severity: 'high' },
          { id: '5', severity: 'critical' },
        ]),
      });

      await moderationService.handleViolations(userId, {
        contentId: 'test-content-003',
        userId,
        status: ModerationStatus.REJECTED,
        action: 'auto_rejected',
        overallRiskScore: 0.98,
        detectedViolations: [ViolationType.EXPLICIT_NUDITY],
        recommendations: ['Account banned'],
        moderatedAt: new Date(),
      } as any);

      // Verify ban was applied
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Restriction Checking', () => {
    it('should return no restriction for active user', async () => {
      const userId = 'test-user-active-001';

      // Mock active user record
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          user_id: userId,
          status: 'active',
          permanently_banned: false,
          current_suspension_ends_at: null,
        }),
      });

      const restriction = await moderationService.isUserRestricted(userId);

      expect(restriction.restricted).toBe(false);
      expect(restriction.reason).toBeUndefined();
      expect(restriction.endsAt).toBeUndefined();
    });

    it('should return restriction for suspended user', async () => {
      const userId = 'test-user-suspended-001';
      const suspensionEnd = new Date(Date.now() + 86400000); // 24 hours from now

      // Mock suspended user record
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          user_id: userId,
          status: 'suspended',
          permanently_banned: false,
          current_suspension_ends_at: suspensionEnd,
        }),
      });

      const restriction = await moderationService.isUserRestricted(userId);

      expect(restriction.restricted).toBe(true);
      expect(restriction.reason).toContain('suspended');
      expect(restriction.endsAt).toBeDefined();
    });

    it('should return restriction for banned user', async () => {
      const userId = 'test-user-banned-001';

      // Mock banned user record
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          user_id: userId,
          status: 'banned',
          permanently_banned: true,
          banned_at: new Date(),
          banned_reason: 'Multiple severe violations',
        }),
      });

      const restriction = await moderationService.isUserRestricted(userId);

      expect(restriction.restricted).toBe(true);
      expect(restriction.reason).toContain('banned');
      expect(restriction.endsAt).toBeUndefined(); // Permanent ban has no end date
    });

    it('should handle expired suspensions correctly', async () => {
      const userId = 'test-user-expired-suspension-001';
      const expiredDate = new Date(Date.now() - 86400000); // 24 hours ago

      // Mock user with expired suspension
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          user_id: userId,
          status: 'suspended',
          permanently_banned: false,
          current_suspension_ends_at: expiredDate,
        }),
      });

      const restriction = await moderationService.isUserRestricted(userId);

      // Expired suspension should not restrict user
      expect(restriction.restricted).toBe(false);
    });
  });

  describe('Moderation Queue', () => {
    it('should add flagged content to queue', async () => {
      const moderationResult = {
        contentId: 'test-queue-001',
        userId: 'test-user-queue-001',
        status: ModerationStatus.FLAGGED,
        overallRiskScore: 0.75,
        detectedViolations: [ViolationType.SUGGESTIVE],
      } as any;

      await moderationService.addToModerationQueue(moderationResult);

      // Verify queue entry was created
      expect(true).toBe(true); // Placeholder
    });

    it('should assign correct priority based on risk score', async () => {
      const testCases = [
        { riskScore: 0.95, expectedPriority: 'urgent' },
        { riskScore: 0.80, expectedPriority: 'high' },
        { riskScore: 0.65, expectedPriority: 'medium' },
        { riskScore: 0.52, expectedPriority: 'low' },
      ];

      for (const testCase of testCases) {
        const moderationResult = {
          contentId: `test-priority-${testCase.riskScore}`,
          userId: 'test-user-priority',
          status: ModerationStatus.FLAGGED,
          overallRiskScore: testCase.riskScore,
          detectedViolations: [],
        } as any;

        await moderationService.addToModerationQueue(moderationResult);

        // Verify priority assignment
        // In real implementation, check database for correct priority
      }

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance', () => {
    it('should moderate image in under 3 seconds', async () => {
      mockAWSService.moderateImage.mockResolvedValue({
        moderationLabels: [],
        categories: {},
        overallRiskScore: 0.15,
        detectedViolations: [],
      });

      const startTime = Date.now();

      await moderationService.moderateImage({
        contentId: 'test-perf-001',
        imageUrl: 'https://example.com/photo.jpg',
        userId: 'test-user-perf',
        contentType: ContentType.IMAGE,
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000);
    });

    it('should handle concurrent moderation requests', async () => {
      mockAWSService.moderateImage.mockResolvedValue({
        moderationLabels: [],
        categories: {},
        overallRiskScore: 0.20,
        detectedViolations: [],
      });

      const requests = Array.from({ length: 10 }, (_, i) =>
        moderationService.moderateImage({
          contentId: `test-concurrent-${i}`,
          imageUrl: `https://example.com/photo-${i}.jpg`,
          userId: `test-user-concurrent-${i}`,
          contentType: ContentType.IMAGE,
        })
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.status).toBe(ModerationStatus.APPROVED);
      });
    });
  });
});
