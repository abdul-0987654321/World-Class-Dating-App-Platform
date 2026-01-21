/**
 * Blind Profile Mode Service ("Unmasked")
 * Progressive profile reveal based on conversation depth
 *
 * This is a NOVEL feature - no competitor dating app has this.
 *
 * How it works:
 * 1. Users opt-in to Blind Profile Mode
 * 2. Initially, only a blurred photo and basic info is shown
 * 3. As conversation progresses, more profile elements are revealed
 * 4. Full reveal happens after meaningful engagement
 *
 * Revelation Stages:
 * - Stage 0: Blurred photo, first name only, one interest
 * - Stage 1: Semi-blurred photo, age, 3 interests (after 5 messages)
 * - Stage 2: Clear photo, bio snippet, occupation (after 15 messages)
 * - Stage 3: Full profile (after 30 messages or mutual reveal)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Profile, ProfilePhoto } from './profile.service';

// Feature flag check for blind profile mode (30% rollout)
function isFeatureEnabled(userId: string): boolean {
  // In production: return featureFlags.isEnabled('innovativeFeatures', 'blindProfileMode', { userId });
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100 < 30; // 30% rollout
}

// Revelation stages
export enum RevealStage {
  HIDDEN = 0,      // Blurred, minimal info
  PARTIAL = 1,     // Semi-blurred, some info
  MOSTLY = 2,      // Clear photo, more info
  FULL = 3,        // Complete profile
}

// Thresholds for automatic revelation
const STAGE_THRESHOLDS = {
  [RevealStage.PARTIAL]: 5,    // 5 messages exchanged
  [RevealStage.MOSTLY]: 15,    // 15 messages exchanged
  [RevealStage.FULL]: 30,      // 30 messages exchanged
};

// Configuration for what's visible at each stage
const STAGE_VISIBILITY: Record<RevealStage, ProfileVisibility> = {
  [RevealStage.HIDDEN]: {
    showPhoto: 'blurred',
    showName: 'first_only',
    showAge: false,
    showBio: false,
    showInterests: 1,
    showOccupation: false,
    showEducation: false,
    showLocation: 'country_only',
    showHeight: false,
  },
  [RevealStage.PARTIAL]: {
    showPhoto: 'semi_blurred',
    showName: 'first_only',
    showAge: true,
    showBio: false,
    showInterests: 3,
    showOccupation: false,
    showEducation: false,
    showLocation: 'city_only',
    showHeight: false,
  },
  [RevealStage.MOSTLY]: {
    showPhoto: 'clear',
    showName: 'first_only',
    showAge: true,
    showBio: 'snippet',
    showInterests: 5,
    showOccupation: true,
    showEducation: false,
    showLocation: 'city_only',
    showHeight: true,
  },
  [RevealStage.FULL]: {
    showPhoto: 'clear',
    showName: 'full',
    showAge: true,
    showBio: 'full',
    showInterests: -1, // All
    showOccupation: true,
    showEducation: true,
    showLocation: 'full',
    showHeight: true,
  },
};

export interface ProfileVisibility {
  showPhoto: 'blurred' | 'semi_blurred' | 'clear';
  showName: 'first_only' | 'full';
  showAge: boolean;
  showBio: boolean | 'snippet' | 'full';
  showInterests: number; // -1 = all
  showOccupation: boolean;
  showEducation: boolean;
  showLocation: 'country_only' | 'city_only' | 'full';
  showHeight: boolean;
}

export interface BlindProfileSettings {
  userId: string;
  enabled: boolean;
  revealStrategy: 'automatic' | 'manual' | 'hybrid';
  customThresholds?: Partial<typeof STAGE_THRESHOLDS>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationProgress {
  viewerId: string;
  profileOwnerId: string;
  messageCount: number;
  currentStage: RevealStage;
  manualRevealRequested: boolean;
  manualRevealGranted: boolean;
  lastInteractionAt: Date;
}

export interface BlindProfile {
  userId: string;
  stage: RevealStage;
  visibility: ProfileVisibility;
  displayName: string;
  age?: number;
  bio?: string;
  interests: string[];
  occupation?: string;
  education?: string;
  location?: {
    city?: string;
    country?: string;
  };
  height?: number;
  photos: BlindProfilePhoto[];
  revealProgress: {
    currentStage: RevealStage;
    nextStage: RevealStage | null;
    messagesUntilNextStage: number;
    canRequestReveal: boolean;
  };
}

export interface BlindProfilePhoto {
  id: string;
  url: string;
  blurLevel: 'none' | 'light' | 'heavy';
  isPrimary: boolean;
}

@Injectable()
export class BlindProfileService {
  private readonly logger = new Logger(BlindProfileService.name);

  // In-memory storage (replace with database in production)
  private settings: Map<string, BlindProfileSettings> = new Map();
  private progress: Map<string, ConversationProgress> = new Map();

  /**
   * Check if blind profile feature is available for a user (feature flag)
   */
  isFeatureAvailable(userId: string): boolean {
    return isFeatureEnabled(userId);
  }

  /**
   * Check if user has blind profile mode enabled
   */
  isBlindModeEnabled(userId: string): boolean {
    // First check feature flag
    if (!isFeatureEnabled(userId)) {
      return false;
    }
    const settings = this.settings.get(userId);
    return settings?.enabled ?? false;
  }

  /**
   * Enable blind profile mode for a user
   * Returns null if feature is not available for this user
   */
  enableBlindMode(
    userId: string,
    strategy: 'automatic' | 'manual' | 'hybrid' = 'automatic'
  ): BlindProfileSettings | null {
    // Check feature flag first
    if (!isFeatureEnabled(userId)) {
      this.logger.debug('Blind profile mode not available for user ' + userId + ' (feature flag disabled)');
      return null;
    }

    const settings: BlindProfileSettings = {
      userId,
      enabled: true,
      revealStrategy: strategy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.settings.set(userId, settings);
    this.logger.log('Blind mode enabled for user ' + userId);
    return settings;
  }

  /**
   * Disable blind profile mode
   */
  disableBlindMode(userId: string): void {
    const settings = this.settings.get(userId);
    if (settings) {
      settings.enabled = false;
      settings.updatedAt = new Date();
      this.logger.log('Blind mode disabled for user ' + userId);
    }
  }

  /**
   * Get blind profile settings
   */
  getSettings(userId: string): BlindProfileSettings | null {
    return this.settings.get(userId) || null;
  }

  /**
   * Get the revelation stage for a viewer looking at a profile
   */
  getRevealStage(viewerId: string, profileOwnerId: string): RevealStage {
    const key = this.getProgressKey(viewerId, profileOwnerId);
    const progress = this.progress.get(key);

    if (!progress) {
      return RevealStage.HIDDEN;
    }

    // Check if manual reveal was granted
    if (progress.manualRevealGranted) {
      return RevealStage.FULL;
    }

    return progress.currentStage;
  }

  /**
   * Update conversation progress and potentially advance reveal stage
   */
  updateProgress(
    viewerId: string,
    profileOwnerId: string,
    messageCount: number
  ): ConversationProgress {
    const key = this.getProgressKey(viewerId, profileOwnerId);
    let progress = this.progress.get(key);

    if (!progress) {
      progress = {
        viewerId,
        profileOwnerId,
        messageCount: 0,
        currentStage: RevealStage.HIDDEN,
        manualRevealRequested: false,
        manualRevealGranted: false,
        lastInteractionAt: new Date(),
      };
    }

    progress.messageCount = messageCount;
    progress.lastInteractionAt = new Date();

    // Calculate new stage based on thresholds
    const ownerSettings = this.settings.get(profileOwnerId);
    const thresholds = ownerSettings?.customThresholds || STAGE_THRESHOLDS;

    if (messageCount >= (thresholds[RevealStage.FULL] || 30)) {
      progress.currentStage = RevealStage.FULL;
    } else if (messageCount >= (thresholds[RevealStage.MOSTLY] || 15)) {
      progress.currentStage = RevealStage.MOSTLY;
    } else if (messageCount >= (thresholds[RevealStage.PARTIAL] || 5)) {
      progress.currentStage = RevealStage.PARTIAL;
    }

    this.progress.set(key, progress);
    return progress;
  }

  /**
   * Request manual reveal (viewer asks profile owner)
   */
  requestReveal(viewerId: string, profileOwnerId: string): boolean {
    const key = this.getProgressKey(viewerId, profileOwnerId);
    let progress = this.progress.get(key);

    if (!progress) {
      progress = {
        viewerId,
        profileOwnerId,
        messageCount: 0,
        currentStage: RevealStage.HIDDEN,
        manualRevealRequested: false,
        manualRevealGranted: false,
        lastInteractionAt: new Date(),
      };
    }

    // Only allow reveal request after some conversation
    if (progress.messageCount < 3) {
      return false;
    }

    progress.manualRevealRequested = true;
    this.progress.set(key, progress);
    this.logger.log('Reveal requested by ' + viewerId + ' for ' + profileOwnerId);
    return true;
  }

  /**
   * Grant manual reveal (profile owner approves)
   */
  grantReveal(profileOwnerId: string, viewerId: string): boolean {
    const key = this.getProgressKey(viewerId, profileOwnerId);
    const progress = this.progress.get(key);

    if (!progress || !progress.manualRevealRequested) {
      return false;
    }

    progress.manualRevealGranted = true;
    progress.currentStage = RevealStage.FULL;
    this.progress.set(key, progress);
    this.logger.log('Reveal granted by ' + profileOwnerId + ' to ' + viewerId);
    return true;
  }

  /**
   * Get a blind profile view for a specific viewer
   */
  getBlindProfile(
    fullProfile: Profile,
    viewerId: string
  ): BlindProfile {
    const stage = this.getRevealStage(viewerId, fullProfile.userId);
    const visibility = STAGE_VISIBILITY[stage];
    const progress = this.progress.get(this.getProgressKey(viewerId, fullProfile.userId));

    // Calculate messages until next stage
    let nextStage: RevealStage | null = null;
    let messagesUntilNext = 0;

    if (stage < RevealStage.FULL) {
      nextStage = (stage + 1) as RevealStage;
      const threshold = STAGE_THRESHOLDS[nextStage];
      messagesUntilNext = Math.max(0, threshold - (progress?.messageCount || 0));
    }

    return {
      userId: fullProfile.userId,
      stage,
      visibility,
      displayName: this.formatName(fullProfile.displayName, visibility.showName),
      age: visibility.showAge ? fullProfile.age : undefined,
      bio: this.formatBio(fullProfile.bio, visibility.showBio),
      interests: this.limitInterests(fullProfile.interests, visibility.showInterests),
      occupation: visibility.showOccupation ? fullProfile.occupation : undefined,
      education: visibility.showEducation ? fullProfile.education : undefined,
      location: this.formatLocation(fullProfile.location, visibility.showLocation),
      height: visibility.showHeight ? fullProfile.height : undefined,
      photos: this.formatPhotos(fullProfile.photos, visibility.showPhoto),
      revealProgress: {
        currentStage: stage,
        nextStage,
        messagesUntilNextStage: messagesUntilNext,
        canRequestReveal: (progress?.messageCount || 0) >= 3 && !progress?.manualRevealRequested,
      },
    };
  }

  /**
   * Format display name based on visibility
   */
  private formatName(fullName: string, visibility: 'first_only' | 'full'): string {
    if (visibility === 'full') {
      return fullName;
    }
    // Return first name only
    return fullName.split(' ')[0];
  }

  /**
   * Format bio based on visibility
   */
  private formatBio(bio: string, visibility: boolean | 'snippet' | 'full'): string | undefined {
    if (!visibility || !bio) {
      return undefined;
    }
    if (visibility === 'snippet') {
      // Return first 100 characters
      return bio.length > 100 ? bio.substring(0, 100) + '...' : bio;
    }
    return bio;
  }

  /**
   * Limit interests based on visibility
   */
  private limitInterests(interests: string[], limit: number): string[] {
    if (limit === -1 || limit >= interests.length) {
      return interests;
    }
    return interests.slice(0, limit);
  }

  /**
   * Format location based on visibility
   */
  private formatLocation(
    location: Profile['location'],
    visibility: 'country_only' | 'city_only' | 'full'
  ): { city?: string; country?: string } | undefined {
    if (!location) {
      return undefined;
    }

    switch (visibility) {
      case 'country_only':
        return { country: location.country };
      case 'city_only':
        return { city: location.city, country: location.country };
      case 'full':
        return { city: location.city, country: location.country };
    }
  }

  /**
   * Format photos with appropriate blur level
   */
  private formatPhotos(
    photos: ProfilePhoto[],
    photoVisibility: 'blurred' | 'semi_blurred' | 'clear'
  ): BlindProfilePhoto[] {
    const blurLevel: 'none' | 'light' | 'heavy' =
      photoVisibility === 'clear' ? 'none' :
      photoVisibility === 'semi_blurred' ? 'light' : 'heavy';

    return photos.map(photo => ({
      id: photo.id,
      url: this.getBlurredPhotoUrl(photo.url, blurLevel),
      blurLevel,
      isPrimary: photo.isPrimary,
    }));
  }

  /**
   * Get blurred photo URL (in production, use image processing service)
   */
  private getBlurredPhotoUrl(originalUrl: string, blurLevel: 'none' | 'light' | 'heavy'): string {
    if (blurLevel === 'none') {
      return originalUrl;
    }

    // In production, this would call an image processing service
    // For now, append a query parameter that the frontend can use
    const blurAmount = blurLevel === 'heavy' ? 30 : 10;
    const separator = originalUrl.includes('?') ? '&' : '?';
    return originalUrl + separator + 'blur=' + blurAmount;
  }

  /**
   * Generate progress key for two users
   */
  private getProgressKey(viewerId: string, profileOwnerId: string): string {
    return viewerId + ':' + profileOwnerId;
  }
}

// Export singleton for use outside NestJS DI
export const blindProfileService = new BlindProfileService();
export default blindProfileService;
