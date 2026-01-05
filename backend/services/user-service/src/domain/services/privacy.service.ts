import {
  PrivacySetting,
  PrivacySettingUpdateInput,
  isIncognitoActive,
  isVisibleTo,
  getFuzzyCoordinates,
  validatePrivacyUpdate,
  PROFILE_VISIBILITY,
} from '../entities/PrivacySetting.entity';
import { PrivacySettingRepository } from '../repositories/privacy-setting.repository';

export class PrivacyService {
  private privacySettingRepository: PrivacySettingRepository;

  constructor(privacySettingRepository?: PrivacySettingRepository) {
    this.privacySettingRepository = privacySettingRepository || new PrivacySettingRepository();
  }

  /**
   * Initialize privacy settings for a new user
   */
  async initializePrivacySettings(userId: string): Promise<PrivacySetting> {
    const existing = await this.privacySettingRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    return await this.privacySettingRepository.create({ userId });
  }

  /**
   * Get user's privacy settings
   */
  async getUserPrivacySettings(userId: string): Promise<PrivacySetting | null> {
    return await this.privacySettingRepository.findByUserId(userId);
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    updates: PrivacySettingUpdateInput
  ): Promise<PrivacySetting> {
    // Validate updates
    validatePrivacyUpdate(updates);

    return await this.privacySettingRepository.updateByUserId(userId, updates);
  }

  /**
   * Toggle incognito mode
   */
  async toggleIncognitoMode(
    userId: string,
    enabled: boolean,
    durationHours?: number
  ): Promise<PrivacySetting> {
    let until: Date | undefined;

    if (enabled && durationHours) {
      until = new Date();
      until.setHours(until.getHours() + durationHours);
    }

    return await this.privacySettingRepository.toggleIncognitoMode(userId, enabled, until);
  }

  /**
   * Activate incognito mode for 24 hours (premium feature)
   */
  async activateIncognito24h(userId: string): Promise<PrivacySetting> {
    // Check if user has premium subscription
    // This would integrate with subscription service
    return await this.toggleIncognitoMode(userId, true, 24);
  }

  /**
   * Check if user is in incognito mode
   */
  async isUserIncognito(userId: string): Promise<boolean> {
    const settings = await this.privacySettingRepository.findByUserId(userId);

    if (!settings) {
      return false;
    }

    return isIncognitoActive(settings);
  }

  /**
   * Check if user A can see user B's profile
   */
  async canViewProfile(
    viewerId: string,
    targetUserId: string,
    isMatch: boolean = false
  ): Promise<{ canView: boolean; reason?: string }> {
    const targetSettings = await this.privacySettingRepository.findByUserId(targetUserId);

    if (!targetSettings) {
      return { canView: true }; // Default: visible
    }

    const visible = isVisibleTo(targetSettings, viewerId, isMatch);

    if (!visible) {
      let reason = 'profile_not_visible';

      if (isIncognitoActive(targetSettings)) {
        reason = 'user_in_incognito';
      } else if (targetSettings.profileVisibility === PROFILE_VISIBILITY.PRIVATE) {
        reason = 'profile_private';
      } else if (targetSettings.profileVisibility === PROFILE_VISIBILITY.MATCHES_ONLY && !isMatch) {
        reason = 'matches_only';
      }

      return { canView: false, reason };
    }

    return { canView: true };
  }

  /**
   * Get user's location with privacy applied
   */
  async getUserLocation(
    userId: string,
    actualLatitude: number,
    actualLongitude: number
  ): Promise<{ latitude: number; longitude: number; isPrecise: boolean }> {
    const settings = await this.privacySettingRepository.findByUserId(userId);

    if (!settings || settings.preciseLocation) {
      return {
        latitude: actualLatitude,
        longitude: actualLongitude,
        isPrecise: true,
      };
    }

    const radiusKm = settings.locationRadiusKm || 5;
    const fuzzy = getFuzzyCoordinates(actualLatitude, actualLongitude, radiusKm);

    return {
      latitude: fuzzy.latitude,
      longitude: fuzzy.longitude,
      isPrecise: false,
    };
  }

  /**
   * Update profile visibility
   */
  async updateProfileVisibility(
    userId: string,
    visibility: PrivacySetting['profileVisibility']
  ): Promise<PrivacySetting> {
    return await this.privacySettingRepository.setProfileVisibility(userId, visibility);
  }

  /**
   * Update location settings
   */
  async updateLocationSettings(
    userId: string,
    preciseLocation: boolean,
    radiusKm?: number
  ): Promise<PrivacySetting> {
    // Validate radius
    if (!preciseLocation && radiusKm !== undefined) {
      if (radiusKm < 0 || radiusKm > 100) {
        throw new Error('Location radius must be between 0 and 100 km');
      }
    }

    return await this.privacySettingRepository.updateLocationSettings(
      userId,
      preciseLocation,
      radiusKm
    );
  }

  /**
   * Add phone number to hidden contacts
   */
  async hideFromContact(userId: string, phoneNumber: string): Promise<PrivacySetting> {
    return await this.privacySettingRepository.addHiddenContact(userId, phoneNumber);
  }

  /**
   * Remove phone number from hidden contacts
   */
  async unhideFromContact(userId: string, phoneNumber: string): Promise<PrivacySetting> {
    return await this.privacySettingRepository.removeHiddenContact(userId, phoneNumber);
  }

  /**
   * Check if user should be hidden from specific phone number
   */
  async shouldHideFromPhoneNumber(userId: string, phoneNumber: string): Promise<boolean> {
    const settings = await this.privacySettingRepository.findByUserId(userId);

    if (!settings || !settings.hideFromContacts || !settings.hiddenContactNumbers) {
      return false;
    }

    return settings.hiddenContactNumbers.includes(phoneNumber);
  }

  /**
   * Get user's visible profile information based on privacy settings
   */
  async getVisibleProfileInfo(
    targetUserId: string,
    viewerId: string,
    isMatch: boolean = false
  ): Promise<{
    showDistance: boolean;
    showLastActive: boolean;
    showOnlineStatus: boolean;
    showAge: boolean;
    isIncognito: boolean;
  }> {
    const settings = await this.privacySettingRepository.findByUserId(targetUserId);

    if (!settings) {
      // Default visibility
      return {
        showDistance: true,
        showLastActive: true,
        showOnlineStatus: true,
        showAge: true,
        isIncognito: false,
      };
    }

    const incognito = isIncognitoActive(settings);

    return {
      showDistance: settings.showDistance && !incognito,
      showLastActive: settings.showLastActive && !incognito,
      showOnlineStatus: settings.showOnlineStatus && !incognito,
      showAge: settings.showAge,
      isIncognito: incognito,
    };
  }

  /**
   * Update read receipts setting
   */
  async updateReadReceipts(userId: string, enabled: boolean): Promise<PrivacySetting> {
    return await this.privacySettingRepository.updateByUserId(userId, {
      readReceiptsEnabled: enabled,
    });
  }

  /**
   * Update typing indicators setting
   */
  async updateTypingIndicators(userId: string, enabled: boolean): Promise<PrivacySetting> {
    return await this.privacySettingRepository.updateByUserId(userId, {
      typingIndicatorsEnabled: enabled,
    });
  }

  /**
   * Check if read receipts should be shown
   */
  async shouldShowReadReceipt(userId: string): Promise<boolean> {
    const settings = await this.privacySettingRepository.findByUserId(userId);
    return settings ? settings.readReceiptsEnabled : true;
  }

  /**
   * Check if typing indicator should be shown
   */
  async shouldShowTypingIndicator(userId: string): Promise<boolean> {
    const settings = await this.privacySettingRepository.findByUserId(userId);
    return settings ? settings.typingIndicatorsEnabled : true;
  }

  /**
   * Get all users currently in incognito mode (for analytics)
   */
  async getActiveIncognitoUsers(): Promise<PrivacySetting[]> {
    return await this.privacySettingRepository.findActiveIncognitoUsers();
  }

  /**
   * Expire incognito mode for users (cron job)
   */
  async expireIncognitoModes(): Promise<number> {
    const activeIncognito = await this.privacySettingRepository.findActiveIncognitoUsers();
    let expired = 0;

    const now = new Date();

    for (const settings of activeIncognito) {
      if (settings.incognitoUntil && new Date(settings.incognitoUntil) < now) {
        await this.privacySettingRepository.update(settings.id, {
          incognitoMode: false,
          incognitoUntil: undefined,
        });
        expired++;
      }
    }

    return expired;
  }

  /**
   * Get privacy recommendations for user
   */
  async getPrivacyRecommendations(userId: string): Promise<{
    recommendations: string[];
    currentSettings: PrivacySetting | null;
  }> {
    const settings = await this.privacySettingRepository.findByUserId(userId);
    const recommendations: string[] = [];

    if (!settings) {
      recommendations.push('Initialize your privacy settings');
      return { recommendations, currentSettings: null };
    }

    // Analyze settings and provide recommendations
    if (settings.showOnlineStatus) {
      recommendations.push('Consider hiding your online status for more privacy');
    }

    if (settings.preciseLocation) {
      recommendations.push('Enable location fuzzing to protect your exact location');
    }

    if (!settings.hideFromContacts) {
      recommendations.push('Hide your profile from phone contacts if you prefer anonymity');
    }

    if (settings.profileVisibility === PROFILE_VISIBILITY.EVERYONE) {
      recommendations.push('Restrict profile visibility to matches only for enhanced privacy');
    }

    return { recommendations, currentSettings: settings };
  }

  /**
   * Apply privacy presets (quick privacy modes)
   */
  async applyPrivacyPreset(
    userId: string,
    preset: 'public' | 'balanced' | 'private'
  ): Promise<PrivacySetting> {
    const presets: Record<string, PrivacySettingUpdateInput> = {
      public: {
        showDistance: true,
        showLastActive: true,
        showOnlineStatus: true,
        profileVisibility: PROFILE_VISIBILITY.EVERYONE,
        preciseLocation: true,
        readReceiptsEnabled: true,
        typingIndicatorsEnabled: true,
      },
      balanced: {
        showDistance: true,
        showLastActive: true,
        showOnlineStatus: false,
        profileVisibility: PROFILE_VISIBILITY.EVERYONE,
        preciseLocation: false,
        locationRadiusKm: 5,
        readReceiptsEnabled: true,
        typingIndicatorsEnabled: true,
      },
      private: {
        showDistance: false,
        showLastActive: false,
        showOnlineStatus: false,
        profileVisibility: PROFILE_VISIBILITY.MATCHES_ONLY,
        preciseLocation: false,
        locationRadiusKm: 10,
        readReceiptsEnabled: false,
        typingIndicatorsEnabled: false,
      },
    };

    const updates = presets[preset];
    if (!updates) {
      throw new Error('Invalid privacy preset');
    }

    return await this.updatePrivacySettings(userId, updates);
  }
}

export default new PrivacyService();
