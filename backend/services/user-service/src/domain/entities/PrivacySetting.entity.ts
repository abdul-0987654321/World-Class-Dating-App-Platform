export interface PrivacySetting {
  id: string;
  userId: string;

  // Incognito mode (premium feature)
  incognitoMode: boolean;
  incognitoUntil?: Date;

  // Visibility settings
  showDistance: boolean;
  showLastActive: boolean;
  showOnlineStatus: boolean;
  showAge: boolean;

  // Profile visibility
  profileVisibility: 'everyone' | 'matches_only' | 'private';

  // Contact hiding
  hideFromContacts: boolean;
  hiddenContactNumbers?: string[]; // Phone numbers to hide from

  // Read receipts and indicators
  readReceiptsEnabled: boolean;
  typingIndicatorsEnabled: boolean;

  // Location privacy
  preciseLocation: boolean;
  locationRadiusKm?: number; // Fuzz location by X km

  createdAt: Date;
  updatedAt: Date;
}

export interface PrivacySettingCreateInput {
  userId: string;
  // All other fields are optional with defaults
}

export interface PrivacySettingUpdateInput {
  incognitoMode?: boolean;
  incognitoUntil?: Date;
  showDistance?: boolean;
  showLastActive?: boolean;
  showOnlineStatus?: boolean;
  showAge?: boolean;
  profileVisibility?: PrivacySetting['profileVisibility'];
  hideFromContacts?: boolean;
  hiddenContactNumbers?: string[];
  readReceiptsEnabled?: boolean;
  typingIndicatorsEnabled?: boolean;
  preciseLocation?: boolean;
  locationRadiusKm?: number;
}

export const PROFILE_VISIBILITY = {
  EVERYONE: 'everyone',
  MATCHES_ONLY: 'matches_only',
  PRIVATE: 'private',
} as const;

// Check if incognito mode is currently active
export function isIncognitoActive(settings: PrivacySetting): boolean {
  if (!settings.incognitoMode) {
    return false;
  }

  if (!settings.incognitoUntil) {
    return true; // No expiry means always active
  }

  return new Date() < new Date(settings.incognitoUntil);
}

// Check if user should be visible to another user
export function isVisibleTo(settings: PrivacySetting, viewerId: string, isMatch: boolean): boolean {
  // If in incognito mode, not visible
  if (isIncognitoActive(settings)) {
    return false;
  }

  // Check profile visibility setting
  if (settings.profileVisibility === 'private') {
    return false;
  }

  if (settings.profileVisibility === 'matches_only' && !isMatch) {
    return false;
  }

  // Default: visible to everyone
  return true;
}

// Check if should show distance to viewer
export function shouldShowDistance(settings: PrivacySetting): boolean {
  return settings.showDistance && !isIncognitoActive(settings);
}

// Check if should show last active
export function shouldShowLastActive(settings: PrivacySetting): boolean {
  return settings.showLastActive && !isIncognitoActive(settings);
}

// Check if should show online status
export function shouldShowOnlineStatus(settings: PrivacySetting): boolean {
  return settings.showOnlineStatus && !isIncognitoActive(settings);
}

// Get location fuzzing radius
export function getLocationFuzzRadius(settings: PrivacySetting): number {
  if (settings.preciseLocation) {
    return 0; // No fuzzing
  }

  return settings.locationRadiusKm || 5; // Default 5km fuzzing
}

// Calculate fuzzy coordinates
export function getFuzzyCoordinates(
  latitude: number,
  longitude: number,
  radiusKm: number
): { latitude: number; longitude: number } {
  if (radiusKm === 0) {
    return { latitude, longitude };
  }

  // Simple random offset within radius
  const radiusDegrees = radiusKm / 111; // Rough conversion km to degrees
  const randomAngle = Math.random() * 2 * Math.PI;
  const randomRadius = Math.random() * radiusDegrees;

  return {
    latitude: latitude + randomRadius * Math.cos(randomAngle),
    longitude: longitude + randomRadius * Math.sin(randomAngle),
  };
}

// Get default privacy settings
export function getDefaultPrivacySettings(userId: string): PrivacySettingCreateInput {
  return {
    userId,
    // Defaults are set in database migration
  };
}

// Validate privacy settings update
export function validatePrivacyUpdate(update: PrivacySettingUpdateInput): void {
  if (update.locationRadiusKm !== undefined) {
    if (update.locationRadiusKm < 0 || update.locationRadiusKm > 100) {
      throw new Error('Location radius must be between 0 and 100 km');
    }
  }

  if (update.incognitoUntil && new Date(update.incognitoUntil) < new Date()) {
    throw new Error('Incognito expiry time must be in the future');
  }
}

// Check if phone number should be hidden
export function shouldHideFromContact(settings: PrivacySetting, phoneNumber: string): boolean {
  if (!settings.hideFromContacts || !settings.hiddenContactNumbers) {
    return false;
  }

  return settings.hiddenContactNumbers.includes(phoneNumber);
}
