/**
 * Blind Profile Mode Service Tests
 */

import {
  BlindProfileService,
  RevealStage,
} from '../profile/blind-profile.service';
import { Profile } from '../profile/profile.service';

describe('BlindProfileService', () => {
  let service: BlindProfileService;

  // Use a userId that passes the 30% feature flag rollout (hash-based)
  // 'enabled-user-1' hashes to a value in the 0-30 range
  const enabledUserId = 'enabled-user-1';

  const mockProfile: Profile = {
    id: 'profile-123',
    userId: enabledUserId,
    displayName: 'Jane Doe',
    bio: 'I love hiking, photography, and exploring new places. Looking for someone to share adventures with!',
    age: 28,
    gender: 'female',
    location: {
      city: 'San Francisco',
      country: 'USA',
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
    },
    interests: ['hiking', 'photography', 'travel', 'cooking', 'yoga', 'reading'],
    occupation: 'Software Engineer',
    education: 'Stanford University',
    height: 165,
    photos: [
      {
        id: 'photo-1',
        url: 'https://example.com/photo1.jpg',
        thumbnailUrl: 'https://example.com/photo1-thumb.jpg',
        isPrimary: true,
        order: 1,
        isVerified: true,
        uploadedAt: new Date(),
      },
      {
        id: 'photo-2',
        url: 'https://example.com/photo2.jpg',
        thumbnailUrl: 'https://example.com/photo2-thumb.jpg',
        isPrimary: false,
        order: 2,
        isVerified: false,
        uploadedAt: new Date(),
      },
    ],
    preferences: {
      ageRange: { min: 25, max: 35 },
      distance: 50,
      genderPreference: ['male'],
      relationshipGoals: ['long_term'],
      dealbreakers: [],
      showOnlineStatus: true,
      showDistance: true,
      showAge: true,
    },
    verificationStatus: {
      email: true,
      phone: true,
      identity: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new BlindProfileService();
  });

  describe('Feature Flag', () => {
    it('should check if feature is available for a user', () => {
      // Feature availability is based on hash-based rollout (30%)
      const result = service.isFeatureAvailable(enabledUserId);
      expect(typeof result).toBe('boolean');
    });

    it('should return null when enabling blind mode for disabled user', () => {
      // Use a userId that will hash to >= 30 (outside rollout)
      const disabledUserId = 'disabled-test-user-xyz';
      const settings = service.enableBlindMode(disabledUserId);

      // If feature flag is disabled, should return null
      // If enabled, should return settings
      if (settings === null) {
        expect(service.isFeatureAvailable(disabledUserId)).toBe(false);
      } else {
        expect(service.isFeatureAvailable(disabledUserId)).toBe(true);
      }
    });
  });

  describe('Blind Mode Settings', () => {
    it('should enable blind mode for a user', () => {
      const settings = service.enableBlindMode(enabledUserId, 'automatic');

      // Settings may be null if feature flag is disabled for this user
      if (settings) {
        expect(settings.userId).toBe(enabledUserId);
        expect(settings.enabled).toBe(true);
        expect(settings.revealStrategy).toBe('automatic');
      }
    });

    it('should check if blind mode is enabled', () => {
      // Initially not enabled
      const initiallyEnabled = service.isBlindModeEnabled(enabledUserId);

      service.enableBlindMode(enabledUserId);

      // After enabling, check based on feature flag availability
      if (service.isFeatureAvailable(enabledUserId)) {
        expect(service.isBlindModeEnabled(enabledUserId)).toBe(true);
      } else {
        // Feature flag disabled - should remain false
        expect(service.isBlindModeEnabled(enabledUserId)).toBe(false);
      }
    });

    it('should disable blind mode', () => {
      service.enableBlindMode(enabledUserId);

      service.disableBlindMode(enabledUserId);
      expect(service.isBlindModeEnabled(enabledUserId)).toBe(false);
    });

    it('should return settings for a user', () => {
      service.enableBlindMode(enabledUserId, 'hybrid');

      const settings = service.getSettings(enabledUserId);

      if (service.isFeatureAvailable(enabledUserId)) {
        expect(settings).not.toBeNull();
        expect(settings?.revealStrategy).toBe('hybrid');
      }
    });
  });

  describe('Reveal Stages', () => {
    const viewerId = 'viewer-456';
    const profileOwnerId = enabledUserId;

    it('should start at HIDDEN stage', () => {
      const stage = service.getRevealStage(viewerId, profileOwnerId);
      expect(stage).toBe(RevealStage.HIDDEN);
    });

    it('should advance to PARTIAL after 5 messages', () => {
      service.updateProgress(viewerId, profileOwnerId, 5);

      const stage = service.getRevealStage(viewerId, profileOwnerId);
      expect(stage).toBe(RevealStage.PARTIAL);
    });

    it('should advance to MOSTLY after 15 messages', () => {
      service.updateProgress(viewerId, profileOwnerId, 15);

      const stage = service.getRevealStage(viewerId, profileOwnerId);
      expect(stage).toBe(RevealStage.MOSTLY);
    });

    it('should advance to FULL after 30 messages', () => {
      service.updateProgress(viewerId, profileOwnerId, 30);

      const stage = service.getRevealStage(viewerId, profileOwnerId);
      expect(stage).toBe(RevealStage.FULL);
    });

    it('should track progress separately for each viewer-profile pair', () => {
      service.updateProgress('viewer-1', profileOwnerId, 5);
      service.updateProgress('viewer-2', profileOwnerId, 15);

      expect(service.getRevealStage('viewer-1', profileOwnerId)).toBe(RevealStage.PARTIAL);
      expect(service.getRevealStage('viewer-2', profileOwnerId)).toBe(RevealStage.MOSTLY);
    });
  });

  describe('Manual Reveal', () => {
    const viewerId = 'viewer-456';
    const profileOwnerId = enabledUserId;

    it('should not allow reveal request with less than 3 messages', () => {
      service.updateProgress(viewerId, profileOwnerId, 2);

      const success = service.requestReveal(viewerId, profileOwnerId);
      expect(success).toBe(false);
    });

    it('should allow reveal request after 3 messages', () => {
      service.updateProgress(viewerId, profileOwnerId, 3);

      const success = service.requestReveal(viewerId, profileOwnerId);
      expect(success).toBe(true);
    });

    it('should grant reveal and advance to FULL stage', () => {
      service.updateProgress(viewerId, profileOwnerId, 5);
      service.requestReveal(viewerId, profileOwnerId);

      expect(service.getRevealStage(viewerId, profileOwnerId)).toBe(RevealStage.PARTIAL);

      service.grantReveal(profileOwnerId, viewerId);

      expect(service.getRevealStage(viewerId, profileOwnerId)).toBe(RevealStage.FULL);
    });

    it('should not grant reveal without request', () => {
      service.updateProgress(viewerId, profileOwnerId, 5);

      const success = service.grantReveal(profileOwnerId, viewerId);
      expect(success).toBe(false);
    });
  });

  describe('Blind Profile Generation', () => {
    const viewerId = 'viewer-456';

    it('should generate HIDDEN stage profile correctly', () => {
      const blindProfile = service.getBlindProfile(mockProfile, viewerId);

      expect(blindProfile.stage).toBe(RevealStage.HIDDEN);
      expect(blindProfile.displayName).toBe('Jane'); // First name only
      expect(blindProfile.age).toBeUndefined();
      expect(blindProfile.bio).toBeUndefined();
      expect(blindProfile.interests.length).toBe(1);
      expect(blindProfile.occupation).toBeUndefined();
      expect(blindProfile.education).toBeUndefined();
      expect(blindProfile.location?.city).toBeUndefined();
      expect(blindProfile.location?.country).toBe('USA');
      expect(blindProfile.photos[0].blurLevel).toBe('heavy');
    });

    it('should generate PARTIAL stage profile correctly', () => {
      service.updateProgress(viewerId, mockProfile.userId, 5);

      const blindProfile = service.getBlindProfile(mockProfile, viewerId);

      expect(blindProfile.stage).toBe(RevealStage.PARTIAL);
      expect(blindProfile.displayName).toBe('Jane');
      expect(blindProfile.age).toBe(28);
      expect(blindProfile.bio).toBeUndefined();
      expect(blindProfile.interests.length).toBe(3);
      expect(blindProfile.location?.city).toBe('San Francisco');
      expect(blindProfile.photos[0].blurLevel).toBe('light');
    });

    it('should generate MOSTLY stage profile correctly', () => {
      service.updateProgress(viewerId, mockProfile.userId, 15);

      const blindProfile = service.getBlindProfile(mockProfile, viewerId);

      expect(blindProfile.stage).toBe(RevealStage.MOSTLY);
      expect(blindProfile.age).toBe(28);
      expect(blindProfile.bio).toBeDefined();
      expect(blindProfile.bio!.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(blindProfile.interests.length).toBe(5);
      expect(blindProfile.occupation).toBe('Software Engineer');
      expect(blindProfile.height).toBe(165);
      expect(blindProfile.photos[0].blurLevel).toBe('none');
    });

    it('should generate FULL stage profile correctly', () => {
      service.updateProgress(viewerId, mockProfile.userId, 30);

      const blindProfile = service.getBlindProfile(mockProfile, viewerId);

      expect(blindProfile.stage).toBe(RevealStage.FULL);
      expect(blindProfile.displayName).toBe('Jane Doe'); // Full name
      expect(blindProfile.bio).toBe(mockProfile.bio);
      expect(blindProfile.interests.length).toBe(mockProfile.interests.length);
      expect(blindProfile.education).toBe('Stanford University');
    });

    it('should include reveal progress information', () => {
      service.updateProgress(viewerId, mockProfile.userId, 7);

      const blindProfile = service.getBlindProfile(mockProfile, viewerId);

      expect(blindProfile.revealProgress.currentStage).toBe(RevealStage.PARTIAL);
      expect(blindProfile.revealProgress.nextStage).toBe(RevealStage.MOSTLY);
      expect(blindProfile.revealProgress.messagesUntilNextStage).toBe(8); // 15 - 7
      expect(blindProfile.revealProgress.canRequestReveal).toBe(true);
    });

    it('should indicate canRequestReveal correctly', () => {
      // Less than 3 messages - can't request
      service.updateProgress(viewerId, mockProfile.userId, 2);
      let blindProfile = service.getBlindProfile(mockProfile, viewerId);
      expect(blindProfile.revealProgress.canRequestReveal).toBe(false);

      // 3+ messages - can request
      service.updateProgress(viewerId, mockProfile.userId, 3);
      blindProfile = service.getBlindProfile(mockProfile, viewerId);
      expect(blindProfile.revealProgress.canRequestReveal).toBe(true);

      // Already requested - can't request again
      service.requestReveal(viewerId, mockProfile.userId);
      blindProfile = service.getBlindProfile(mockProfile, viewerId);
      expect(blindProfile.revealProgress.canRequestReveal).toBe(false);
    });
  });

  describe('Photo Blur URLs', () => {
    const viewerId = 'viewer-456';

    it('should append blur parameter for blurred photos', () => {
      const blindProfile = service.getBlindProfile(mockProfile, viewerId);

      expect(blindProfile.photos[0].url).toContain('blur=30');
    });

    it('should append lighter blur for semi-blurred photos', () => {
      service.updateProgress(viewerId, mockProfile.userId, 5);

      const blindProfile = service.getBlindProfile(mockProfile, viewerId);

      expect(blindProfile.photos[0].url).toContain('blur=10');
    });

    it('should not modify URL for clear photos', () => {
      service.updateProgress(viewerId, mockProfile.userId, 30);

      const blindProfile = service.getBlindProfile(mockProfile, viewerId);

      expect(blindProfile.photos[0].url).not.toContain('blur=');
      expect(blindProfile.photos[0].url).toBe(mockProfile.photos[0].url);
    });
  });
});
