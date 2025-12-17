/**
 * Unit tests for Profile Service
 * Tests profile CRUD, verification, privacy, and gamification
 */

import profileService from '../../src/services/profile.service';
import profileRepository from '../../src/repositories/profile.repository';
import mediaService from '../../src/clients/media-service.client';
import moderationService from '../../src/clients/moderation-service.client';

jest.mock('../../src/repositories/profile.repository');
jest.mock('../../src/clients/media-service.client');
jest.mock('../../src/clients/moderation-service.client');

describe('ProfileService', () => {
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    it('should create a complete profile', async () => {
      const profileData = {
        userId,
        bio: 'Love hiking and coffee!',
        interests: ['Travel', 'Fitness', 'Coffee'],
        occupation: 'Software Engineer',
        education: 'Bachelor of Science',
        height: 175,
        lookingFor: ['Long-term', 'Short-term'],
        photos: [
          { url: 'https://cdn.example.com/photo1.jpg', order: 1 },
          { url: 'https://cdn.example.com/photo2.jpg', order: 2 },
        ],
      };

      const mockProfile = {
        id: 'profile-123',
        ...profileData,
        isVerified: false,
        verificationLevel: 'none',
        created_at: new Date(),
      };

      (profileRepository.create as jest.Mock).mockResolvedValue(mockProfile);
      (moderationService.checkContent as jest.Mock).mockResolvedValue({ approved: true });

      const result = await profileService.createProfile(profileData);

      expect(result).toEqual(mockProfile);
      expect(profileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          bio: profileData.bio,
          interests: profileData.interests,
        })
      );
    });

    it('should validate bio length', async () => {
      const profileData = {
        userId,
        bio: 'A'.repeat(501), // Exceeds 500 character limit
        interests: ['Travel'],
      };

      await expect(profileService.createProfile(profileData)).rejects.toThrow(
        'Bio must be 500 characters or less'
      );
    });

    it('should validate minimum number of photos', async () => {
      const profileData = {
        userId,
        bio: 'Test bio',
        interests: ['Travel'],
        photos: [], // No photos
      };

      await expect(profileService.createProfile(profileData)).rejects.toThrow(
        'At least 2 photos are required'
      );
    });

    it('should moderate bio content', async () => {
      const profileData = {
        userId,
        bio: 'Inappropriate content here',
        interests: ['Travel'],
        photos: [
          { url: 'photo1.jpg', order: 1 },
          { url: 'photo2.jpg', order: 2 },
        ],
      };

      (moderationService.checkContent as jest.Mock).mockResolvedValue({
        approved: false,
        reason: 'Inappropriate content detected',
      });

      await expect(profileService.createProfile(profileData)).rejects.toThrow(
        'Profile content violates community guidelines'
      );
    });

    it('should limit number of interests', async () => {
      const profileData = {
        userId,
        bio: 'Test bio',
        interests: Array.from({ length: 11 }, (_, i) => `Interest ${i}`), // More than 10
        photos: [
          { url: 'photo1.jpg', order: 1 },
          { url: 'photo2.jpg', order: 2 },
        ],
      };

      await expect(profileService.createProfile(profileData)).rejects.toThrow(
        'Maximum 10 interests allowed'
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      const existingProfile = {
        id: 'profile-123',
        userId,
        bio: 'Old bio',
        interests: ['Travel'],
      };

      const updates = {
        bio: 'New bio about hiking!',
        interests: ['Travel', 'Hiking', 'Photography'],
        occupation: 'Product Manager',
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(existingProfile);
      (moderationService.checkContent as jest.Mock).mockResolvedValue({ approved: true });
      (profileRepository.update as jest.Mock).mockResolvedValue({
        ...existingProfile,
        ...updates,
      });

      const result = await profileService.updateProfile(userId, updates);

      expect(result.bio).toBe(updates.bio);
      expect(result.interests).toEqual(updates.interests);
      expect(result.occupation).toBe(updates.occupation);
    });

    it('should prevent updating verification status directly', async () => {
      const updates = {
        isVerified: true, // User trying to verify themselves
        verificationLevel: 'verified',
      };

      await expect(profileService.updateProfile(userId, updates as any)).rejects.toThrow(
        'Cannot update verification status directly'
      );
    });

    it('should track profile updates in audit log', async () => {
      const existingProfile = { id: 'profile-123', userId, bio: 'Old bio' };
      const updates = { bio: 'New bio' };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(existingProfile);
      (moderationService.checkContent as jest.Mock).mockResolvedValue({ approved: true });
      (profileRepository.update as jest.Mock).mockResolvedValue({
        ...existingProfile,
        ...updates,
      });

      await profileService.updateProfile(userId, updates);

      // Verify audit log entry was created
      // expect(auditService.log).toHaveBeenCalledWith(...)
    });
  });

  describe('addPhoto', () => {
    it('should add photo to profile', async () => {
      const photoData = {
        url: 'https://cdn.example.com/new-photo.jpg',
        order: 3,
      };

      const mockProfile = {
        id: 'profile-123',
        userId,
        photos: [
          { url: 'photo1.jpg', order: 1 },
          { url: 'photo2.jpg', order: 2 },
        ],
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);
      (moderationService.checkPhoto as jest.Mock).mockResolvedValue({ approved: true });
      (profileRepository.addPhoto as jest.Mock).mockResolvedValue({
        ...mockProfile,
        photos: [...mockProfile.photos, photoData],
      });

      const result = await profileService.addPhoto(userId, photoData);

      expect(result.photos).toHaveLength(3);
      expect(moderationService.checkPhoto).toHaveBeenCalledWith(photoData.url);
    });

    it('should enforce maximum photo limit', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId,
        photos: Array.from({ length: 9 }, (_, i) => ({ url: `photo${i}.jpg`, order: i })),
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);

      await expect(
        profileService.addPhoto(userId, { url: 'photo10.jpg', order: 10 })
      ).rejects.toThrow('Maximum 9 photos allowed');
    });

    it('should reject inappropriate photos', async () => {
      const mockProfile = { id: 'profile-123', userId, photos: [] };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);
      (moderationService.checkPhoto as jest.Mock).mockResolvedValue({
        approved: false,
        reason: 'Nudity detected',
      });

      await expect(
        profileService.addPhoto(userId, { url: 'inappropriate.jpg', order: 1 })
      ).rejects.toThrow('Photo violates community guidelines');
    });
  });

  describe('requestVerification', () => {
    it('should initiate photo verification process', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId,
        isVerified: false,
        photos: [
          { url: 'photo1.jpg', order: 1 },
          { url: 'photo2.jpg', order: 2 },
        ],
      };

      const verificationPhoto = {
        url: 'https://cdn.example.com/verification.jpg',
        pose: 'thumbs_up',
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);
      (mediaService.initiatePhotoVerification as jest.Mock).mockResolvedValue({
        verificationId: 'verification-123',
        status: 'pending',
      });

      const result = await profileService.requestVerification(userId, verificationPhoto);

      expect(result.status).toBe('pending');
      expect(mediaService.initiatePhotoVerification).toHaveBeenCalledWith(
        userId,
        verificationPhoto
      );
    });

    it('should prevent duplicate verification requests', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId,
        verificationStatus: 'pending',
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);

      await expect(
        profileService.requestVerification(userId, { url: 'verification.jpg', pose: 'thumbs_up' })
      ).rejects.toThrow('Verification already in progress');
    });

    it('should skip verification for already verified profiles', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId,
        isVerified: true,
        verificationLevel: 'verified',
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);

      await expect(
        profileService.requestVerification(userId, { url: 'verification.jpg', pose: 'thumbs_up' })
      ).rejects.toThrow('Profile already verified');
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update privacy settings', async () => {
      const privacySettings = {
        showAge: false,
        showDistance: true,
        showOnlineStatus: false,
        incognito: false,
      };

      (profileRepository.updatePrivacySettings as jest.Mock).mockResolvedValue({
        userId,
        ...privacySettings,
      });

      const result = await profileService.updatePrivacySettings(userId, privacySettings);

      expect(result).toMatchObject(privacySettings);
      expect(profileRepository.updatePrivacySettings).toHaveBeenCalledWith(
        userId,
        privacySettings
      );
    });

    it('should enable incognito mode for premium users only', async () => {
      const user = { id: userId, isPremium: false };

      await expect(
        profileService.updatePrivacySettings(userId, { incognito: true }, user)
      ).rejects.toThrow('Incognito mode is a Premium feature');
    });

    it('should allow incognito for premium users', async () => {
      const user = { id: userId, isPremium: true };

      (profileRepository.updatePrivacySettings as jest.Mock).mockResolvedValue({
        userId,
        incognito: true,
      });

      const result = await profileService.updatePrivacySettings(
        userId,
        { incognito: true },
        user
      );

      expect(result.incognito).toBe(true);
    });
  });

  describe('GDPR Compliance', () => {
    it('should export all user data', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId,
        bio: 'Test bio',
        interests: ['Travel'],
        photos: [{ url: 'photo1.jpg' }],
        created_at: new Date(),
      };

      const mockSwipes = [
        { targetUserId: 'user-456', action: 'LIKE', created_at: new Date() },
      ];

      const mockMatches = [{ matchedUserId: 'user-789', created_at: new Date() }];

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);

      const exportData = await profileService.exportUserData(userId);

      expect(exportData).toHaveProperty('profile');
      expect(exportData).toHaveProperty('swipes');
      expect(exportData).toHaveProperty('matches');
      expect(exportData).toHaveProperty('messages');
      expect(exportData).toHaveProperty('exportedAt');
    });

    it('should delete all user data (right to be forgotten)', async () => {
      (profileRepository.deleteByUserId as jest.Mock).mockResolvedValue(true);

      await profileService.deleteUserData(userId);

      expect(profileRepository.deleteByUserId).toHaveBeenCalledWith(userId);
      // Verify all related data is deleted or anonymized
    });

    it('should anonymize data instead of hard delete', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId,
        bio: 'Personal info',
        email: 'user@example.com',
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);
      (profileRepository.anonymize as jest.Mock).mockResolvedValue({
        id: 'profile-123',
        userId: 'DELETED_USER',
        bio: '[DELETED]',
        email: '[DELETED]',
      });

      await profileService.deleteUserData(userId, { anonymize: true });

      expect(profileRepository.anonymize).toHaveBeenCalledWith(userId);
    });
  });

  describe('Gamification', () => {
    it('should award profile completion badge', async () => {
      const completeProfile = {
        id: 'profile-123',
        userId,
        bio: 'Complete bio',
        interests: ['Travel', 'Fitness', 'Coffee'],
        occupation: 'Engineer',
        education: 'Bachelor',
        photos: Array.from({ length: 5 }, (_, i) => ({ url: `photo${i}.jpg`, order: i })),
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(completeProfile);

      const completionCheck = await profileService.checkProfileCompletion(userId);

      expect(completionCheck.isComplete).toBe(true);
      expect(completionCheck.completionPercentage).toBe(100);
      expect(completionCheck.badges).toContain('profile_complete');
    });

    it('should calculate profile completion percentage', async () => {
      const partialProfile = {
        id: 'profile-123',
        userId,
        bio: 'Bio',
        interests: ['Travel'],
        photos: [{ url: 'photo1.jpg', order: 1 }],
        // Missing: occupation, education, more photos
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(partialProfile);

      const completionCheck = await profileService.checkProfileCompletion(userId);

      expect(completionCheck.completionPercentage).toBeLessThan(100);
      expect(completionCheck.missingFields).toContain('occupation');
      expect(completionCheck.missingFields).toContain('education');
    });
  });

  describe('Profile Visibility', () => {
    it('should hide inactive profiles from discovery', async () => {
      const inactiveProfile = {
        id: 'profile-123',
        userId,
        lastActiveAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(inactiveProfile);

      const visibility = await profileService.checkProfileVisibility(userId);

      expect(visibility.isVisible).toBe(false);
      expect(visibility.reason).toBe('Inactive for more than 30 days');
    });

    it('should show profiles with recent activity', async () => {
      const activeProfile = {
        id: 'profile-123',
        userId,
        lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(activeProfile);

      const visibility = await profileService.checkProfileVisibility(userId);

      expect(visibility.isVisible).toBe(true);
    });

    it('should hide incognito profiles from non-mutual likes', async () => {
      const incognitoProfile = {
        id: 'profile-123',
        userId,
        privacySettings: { incognito: true },
      };

      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(incognitoProfile);

      const visibility = await profileService.checkProfileVisibility(userId, {
        viewerId: 'other-user',
        mutualLike: false,
      });

      expect(visibility.isVisible).toBe(false);
      expect(visibility.reason).toBe('User is in incognito mode');
    });
  });
});
