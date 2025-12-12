/**
 * Unit tests for Moderation Service
 * Tests content moderation, violation handling, user restrictions, and admin actions
 */

import moderationService from '../../../src/services/moderation.service';
import awsRekognitionService from '../../../src/services/aws-rekognition.service';
import azureContentModeratorService from '../../../src/services/azure-content-moderator.service';
import db from '../../../src/infrastructure/database/connection';
import notificationClient from '../../../src/infrastructure/clients/notification-service.client';
import {
  ModerationStatus,
  ModerationAction,
  ContentType,
  ViolationType,
  UserModerationStatus,
} from '../../../src/types';

jest.mock('../../../src/services/aws-rekognition.service');
jest.mock('../../../src/services/azure-content-moderator.service');
jest.mock('../../../src/infrastructure/database/connection');
jest.mock('../../../src/infrastructure/clients/notification-service.client');
jest.mock('../../../src/config', () => ({
  default: {
    autoAction: {
      autoRejectThreshold: 0.9,
      autoFlagThreshold: 0.7,
      banViolationCount: 3,
      suspensionViolationCount: 5,
    },
  },
}));
jest.mock('@flamoral/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('ModerationService', () => {
  const userId = 'user-123';
  const contentId = 'content-456';
  const imageUrl = 'https://example.com/image.jpg';
  const textContent = 'This is a sample text message';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database methods
    (db as any).mockReturnValue({
      insert: jest.fn().mockResolvedValue(undefined),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(undefined),
      first: jest.fn().mockResolvedValue(null),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
  });

  describe('moderateImage', () => {
    it('should auto-approve safe images', async () => {
      const mockImageResult = {
        overallRiskScore: 0.05,
        detectedViolations: [],
        recommendations: ['Image is safe to display'],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockImageResult);
      (db as any).mockReturnValue({
        insert: jest.fn().mockResolvedValue(undefined),
      });

      const result = await moderationService.moderateImage({
        userId,
        contentId,
        imageUrl,
        contentType: ContentType.IMAGE,
      });

      expect(awsRekognitionService.moderateImage).toHaveBeenCalledWith(imageUrl);
      expect(result.status).toBe(ModerationStatus.APPROVED);
      expect(result.action).toBe(ModerationAction.AUTO_APPROVED);
      expect(result.overallRiskScore).toBe(0.05);
    });

    it('should auto-reject images with high risk score', async () => {
      const mockImageResult = {
        overallRiskScore: 0.95,
        detectedViolations: [ViolationType.EXPLICIT_NUDITY],
        recommendations: ['Image contains explicit content'],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockImageResult);
      (db as any).mockReturnValue({
        insert: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      });
      (notificationClient.notifyContentRejected as jest.Mock).mockResolvedValue(undefined);

      const result = await moderationService.moderateImage({
        userId,
        contentId,
        imageUrl,
        contentType: ContentType.IMAGE,
      });

      expect(result.status).toBe(ModerationStatus.REJECTED);
      expect(result.action).toBe(ModerationAction.AUTO_REJECTED);
      expect(notificationClient.notifyContentRejected).toHaveBeenCalled();
    });

    it('should flag images with medium risk score for manual review', async () => {
      const mockImageResult = {
        overallRiskScore: 0.75,
        detectedViolations: [ViolationType.SUGGESTIVE],
        recommendations: ['May require manual review'],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockImageResult);
      (db as any).mockReturnValue({
        insert: jest.fn().mockResolvedValue(undefined),
      });
      (notificationClient.notifyContentFlagged as jest.Mock).mockResolvedValue(undefined);

      const result = await moderationService.moderateImage({
        userId,
        contentId,
        imageUrl,
        contentType: ContentType.IMAGE,
      });

      expect(result.status).toBe(ModerationStatus.FLAGGED);
      expect(result.action).toBe(ModerationAction.AUTO_FLAGGED);
      expect(notificationClient.notifyContentFlagged).toHaveBeenCalled();
    });

    it('should auto-reject images with critical violations regardless of score', async () => {
      const mockImageResult = {
        overallRiskScore: 0.60,
        detectedViolations: [ViolationType.VIOLENCE, ViolationType.HATE_SPEECH],
        recommendations: ['Contains critical violations'],
      };

      (awsRekognitionService.moderateImage as jest.Mock).mockResolvedValue(mockImageResult);
      (db as any).mockReturnValue({
        insert: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      });
      (notificationClient.notifyContentRejected as jest.Mock).mockResolvedValue(undefined);

      const result = await moderationService.moderateImage({
        userId,
        contentId,
        imageUrl,
        contentType: ContentType.IMAGE,
      });

      expect(result.status).toBe(ModerationStatus.REJECTED);
      expect(result.action).toBe(ModerationAction.AUTO_REJECTED);
    });
  });

  describe('moderateText', () => {
    it('should auto-approve safe text', async () => {
      const mockTextResult = {
        overallRiskScore: 0.10,
        detectedViolations: [],
        recommendations: ['Text is appropriate'],
      };

      (azureContentModeratorService.moderateText as jest.Mock).mockResolvedValue(
        mockTextResult
      );
      (db as any).mockReturnValue({
        insert: jest.fn().mockResolvedValue(undefined),
      });

      const result = await moderationService.moderateText({
        userId,
        contentId,
        text: textContent,
        contentType: ContentType.TEXT,
      });

      expect(azureContentModeratorService.moderateText).toHaveBeenCalledWith(textContent);
      expect(result.status).toBe(ModerationStatus.APPROVED);
      expect(result.action).toBe(ModerationAction.AUTO_APPROVED);
    });

    it('should auto-reject text with profanity and hate speech', async () => {
      const mockTextResult = {
        overallRiskScore: 0.98,
        detectedViolations: [ViolationType.PROFANITY, ViolationType.HATE_SPEECH],
        recommendations: ['Text contains inappropriate language'],
      };

      (azureContentModeratorService.moderateText as jest.Mock).mockResolvedValue(
        mockTextResult
      );
      (db as any).mockReturnValue({
        insert: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      });
      (notificationClient.notifyContentRejected as jest.Mock).mockResolvedValue(undefined);

      const result = await moderationService.moderateText({
        userId,
        contentId,
        text: textContent,
        contentType: ContentType.TEXT,
      });

      expect(result.status).toBe(ModerationStatus.REJECTED);
      expect(result.action).toBe(ModerationAction.AUTO_REJECTED);
      expect(notificationClient.notifyContentRejected).toHaveBeenCalled();
    });

    it('should flag text with medium risk for manual review', async () => {
      const mockTextResult = {
        overallRiskScore: 0.72,
        detectedViolations: [ViolationType.SPAM],
        recommendations: ['Potential spam content'],
      };

      (azureContentModeratorService.moderateText as jest.Mock).mockResolvedValue(
        mockTextResult
      );
      (db as any).mockReturnValue({
        insert: jest.fn().mockResolvedValue(undefined),
      });
      (notificationClient.notifyContentFlagged as jest.Mock).mockResolvedValue(undefined);

      const result = await moderationService.moderateText({
        userId,
        contentId,
        text: textContent,
        contentType: ContentType.TEXT,
      });

      expect(result.status).toBe(ModerationStatus.FLAGGED);
      expect(result.action).toBe(ModerationAction.AUTO_FLAGGED);
    });
  });

  describe('isUserRestricted', () => {
    it('should return false for unrestricted users', async () => {
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      });

      const result = await moderationService.isUserRestricted(userId);

      expect(result.restricted).toBe(false);
    });

    it('should return true for permanently banned users', async () => {
      const bannedRecord = {
        user_id: userId,
        status: UserModerationStatus.BANNED,
        permanently_banned: true,
        banned_reason: 'Severe violations',
      };

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(bannedRecord),
      });

      const result = await moderationService.isUserRestricted(userId);

      expect(result.restricted).toBe(true);
      expect(result.reason).toContain('permanently banned');
    });

    it('should return true for suspended users with active suspension', async () => {
      const suspendedRecord = {
        user_id: userId,
        status: UserModerationStatus.SUSPENDED,
        current_suspension_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(suspendedRecord),
      });

      const result = await moderationService.isUserRestricted(userId);

      expect(result.restricted).toBe(true);
      expect(result.reason).toContain('temporarily suspended');
      expect(result.endsAt).toBeDefined();
    });

    it('should clear expired suspensions automatically', async () => {
      const expiredSuspension = {
        user_id: userId,
        status: UserModerationStatus.SUSPENDED,
        current_suspension_ends_at: new Date(Date.now() - 1000), // Expired
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(expiredSuspension),
        update: mockUpdate,
      });

      const result = await moderationService.isUserRestricted(userId);

      expect(result.restricted).toBe(false);
      expect(mockUpdate).toHaveBeenCalledWith({
        status: UserModerationStatus.ACTIVE,
        current_suspension_ends_at: null,
        updated_at: expect.any(Date),
      });
    });
  });

  describe('adminSuspendUser', () => {
    it('should suspend user for specified duration', async () => {
      const adminId = 'admin-123';
      const suspensionDays = 7;
      const reason = 'Repeated policy violations';

      const existingRecord = {
        user_id: userId,
        status: UserModerationStatus.ACTIVE,
        suspension_count: 2,
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(existingRecord),
        insert: jest.fn().mockResolvedValue(undefined),
        update: mockUpdate,
      });
      (notificationClient.notifyUserSuspended as jest.Mock).mockResolvedValue(undefined);

      await moderationService.adminSuspendUser(userId, suspensionDays, reason, adminId);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserModerationStatus.SUSPENDED,
          suspension_count: 3,
          last_admin_action: 'manual_suspension',
          last_admin_action_by: adminId,
          last_admin_action_reason: reason,
        })
      );
      expect(notificationClient.notifyUserSuspended).toHaveBeenCalled();
    });

    it('should create moderation record if none exists', async () => {
      const adminId = 'admin-123';
      const suspensionDays = 3;
      const reason = 'First violation';

      const mockInsert = jest.fn().mockResolvedValue(undefined);
      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn()
          .mockResolvedValueOnce(null) // No existing record
          .mockResolvedValueOnce({ user_id: userId, suspension_count: 0 }), // After insert
        insert: mockInsert,
        update: mockUpdate,
      });
      (notificationClient.notifyUserSuspended as jest.Mock).mockResolvedValue(undefined);

      await moderationService.adminSuspendUser(userId, suspensionDays, reason, adminId);

      expect(mockInsert).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('adminUnsuspendUser', () => {
    it('should unsuspend user successfully', async () => {
      const adminId = 'admin-123';
      const reason = 'Appeal approved';

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: mockUpdate,
      });
      (notificationClient.notifyUserUnsuspended as jest.Mock).mockResolvedValue(undefined);

      await moderationService.adminUnsuspendUser(userId, adminId, reason);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserModerationStatus.ACTIVE,
          current_suspension_ends_at: null,
          last_admin_action: 'manual_unsuspension',
          last_admin_action_by: adminId,
        })
      );
      expect(notificationClient.notifyUserUnsuspended).toHaveBeenCalled();
    });
  });

  describe('adminBanUser', () => {
    it('should permanently ban user', async () => {
      const adminId = 'admin-123';
      const reason = 'Severe violations of community guidelines';

      const existingRecord = {
        user_id: userId,
        status: UserModerationStatus.ACTIVE,
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(existingRecord),
        insert: jest.fn().mockResolvedValue(undefined),
        update: mockUpdate,
      });
      (notificationClient.notifyUserBanned as jest.Mock).mockResolvedValue(undefined);

      await moderationService.adminBanUser(userId, reason, adminId);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserModerationStatus.BANNED,
          permanently_banned: true,
          banned_at: expect.any(Date),
          banned_reason: reason,
          last_admin_action: 'manual_ban',
          last_admin_action_by: adminId,
        })
      );
      expect(notificationClient.notifyUserBanned).toHaveBeenCalled();
    });
  });

  describe('adminUnbanUser', () => {
    it('should unban user successfully', async () => {
      const adminId = 'admin-123';
      const reason = 'Mistaken ban';

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: mockUpdate,
      });
      (notificationClient.notifyUserUnbanned as jest.Mock).mockResolvedValue(undefined);

      await moderationService.adminUnbanUser(userId, adminId, reason);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserModerationStatus.ACTIVE,
          permanently_banned: false,
          banned_at: null,
          banned_reason: null,
          last_admin_action: 'manual_unban',
        })
      );
      expect(notificationClient.notifyUserUnbanned).toHaveBeenCalled();
    });
  });

  describe('getUserViolationHistory', () => {
    it('should return user violation history', async () => {
      const mockViolations = [
        {
          id: 'violation-1',
          user_id: userId,
          violation_type: ViolationType.PROFANITY,
          severity: 'medium',
          created_at: new Date(),
        },
        {
          id: 'violation-2',
          user_id: userId,
          violation_type: ViolationType.SPAM,
          severity: 'low',
          created_at: new Date(),
        },
      ];

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockViolations),
      });

      const result = await moderationService.getUserViolationHistory(userId, 50);

      expect(result).toEqual(mockViolations);
      expect(result).toHaveLength(2);
    });

    it('should respect custom limit', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: mockLimit,
      });

      await moderationService.getUserViolationHistory(userId, 10);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe('getUserModerationStatus', () => {
    it('should return user moderation record', async () => {
      const mockRecord = {
        user_id: userId,
        status: UserModerationStatus.ACTIVE,
        total_violations: 2,
        severe_violations: 0,
        warnings_issued: 1,
      };

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockRecord),
      });

      const result = await moderationService.getUserModerationStatus(userId);

      expect(result).toEqual(mockRecord);
    });

    it('should return null if no record exists', async () => {
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      });

      const result = await moderationService.getUserModerationStatus(userId);

      expect(result).toBeNull();
    });
  });
});
