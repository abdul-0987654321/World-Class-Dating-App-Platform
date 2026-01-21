/**
 * Profile Service
 * Handles user profile management
 */

import { authTokenService } from './auth-token.service';
import apiClient from './api.client';
import {
  toArray,
  toBoolean,
  toString,
  toNumber,
  toDateString,
  normalizeSubscriptionTier,
  BackendProfileResponse,
} from '../utils/api-transformers';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: string;
  bio?: string;
  occupation?: string;
  company?: string;
  education?: string;
  city?: string;
  height?: number;
  interests: string[];
  lookingFor: string[];
  photos: ProfilePhoto[];
  prompts: ProfilePrompt[];
  isVerified: boolean;
  premiumTier?: string;
  profileCompletion: number;
  settings: ProfileSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  order: number;
}

export interface ProfilePrompt {
  id: string;
  question: string;
  answer: string;
}

export interface ProfileSettings {
  showAge: boolean;
  showDistance: boolean;
  incognitoMode: boolean;
  discoverable: boolean;
  ageRangeMin: number;
  ageRangeMax: number;
  maxDistance: number;
  genderPreference: string[];
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  occupation?: string;
  company?: string;
  education?: string;
  city?: string;
  height?: number;
  interests?: string[];
  lookingFor?: string[];
}

export interface UpdateSettingsData {
  showAge?: boolean;
  showDistance?: boolean;
  incognitoMode?: boolean;
  discoverable?: boolean;
  ageRangeMin?: number;
  ageRangeMax?: number;
  maxDistance?: number;
  genderPreference?: string[];
}

/**
 * Backend profile response shape (snake_case)
 */
interface BackendProfile {
  id: string;
  user_id?: string;
  userId?: string;
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  date_of_birth?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string | null;
  occupation?: string | null;
  company?: string | null;
  education?: string | null;
  city?: string | null;
  height?: number | null;
  interests?: string[] | null;
  looking_for?: string[] | null;
  lookingFor?: string[] | null;
  photos?: Array<{
    id?: string;
    url: string;
    is_primary?: boolean;
    isPrimary?: boolean;
    moderation_status?: string;
    moderationStatus?: string;
    order?: number;
  }> | null;
  prompts?: Array<{
    id?: string;
    question: string;
    answer: string;
  }> | null;
  is_verified?: boolean;
  isVerified?: boolean;
  is_photo_verified?: boolean;
  premium_tier?: string;
  premiumTier?: string;
  profile_completion?: number;
  profileCompletion?: number;
  profile_completion_percentage?: number;
  settings?: {
    show_age?: boolean;
    showAge?: boolean;
    show_distance?: boolean;
    showDistance?: boolean;
    incognito_mode?: boolean;
    incognitoMode?: boolean;
    discoverable?: boolean;
    age_range_min?: number;
    ageRangeMin?: number;
    age_range_max?: number;
    ageRangeMax?: number;
    max_distance?: number;
    maxDistance?: number;
    gender_preference?: string[];
    genderPreference?: string[];
  } | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

/**
 * Transforms backend profile response to frontend UserProfile format
 */
function transformBackendProfile(data: BackendProfile): UserProfile {
  // Transform photos with safe defaults
  const photos: ProfilePhoto[] = toArray(data.photos).map((photo, index) => ({
    id: photo.id || `photo-${index}`,
    url: photo.url,
    isPrimary: toBoolean(photo.is_primary ?? photo.isPrimary),
    moderationStatus: (photo.moderation_status ||
      photo.moderationStatus ||
      'pending') as ProfilePhoto['moderationStatus'],
    order: toNumber(photo.order, index),
  }));

  // Transform prompts with safe defaults
  const prompts: ProfilePrompt[] = toArray(data.prompts).map((prompt, index) => ({
    id: prompt.id || `prompt-${index}`,
    question: toString(prompt.question),
    answer: toString(prompt.answer),
  }));

  // Transform settings with safe defaults
  const settings = data.settings || {};
  const transformedSettings: ProfileSettings = {
    showAge: toBoolean(settings.show_age ?? settings.showAge ?? true),
    showDistance: toBoolean(settings.show_distance ?? settings.showDistance ?? true),
    incognitoMode: toBoolean(settings.incognito_mode ?? settings.incognitoMode ?? false),
    discoverable: toBoolean(settings.discoverable ?? true),
    ageRangeMin: toNumber(settings.age_range_min ?? settings.ageRangeMin, 18),
    ageRangeMax: toNumber(settings.age_range_max ?? settings.ageRangeMax, 45),
    maxDistance: toNumber(settings.max_distance ?? settings.maxDistance, 50),
    genderPreference: toArray(settings.gender_preference || settings.genderPreference),
  };

  return {
    id: data.id,
    email: data.email || '',
    firstName: data.first_name || data.firstName || '',
    lastName: data.last_name || data.lastName,
    dateOfBirth: data.date_of_birth || data.dateOfBirth || '',
    gender: data.gender || '',
    bio: toString(data.bio),
    occupation: toString(data.occupation),
    company: toString(data.company),
    education: toString(data.education),
    city: toString(data.city),
    height: data.height ?? undefined,
    interests: toArray(data.interests),
    lookingFor: toArray(data.looking_for || data.lookingFor),
    photos,
    prompts,
    isVerified: toBoolean(data.is_verified ?? data.isVerified ?? data.is_photo_verified),
    premiumTier: normalizeSubscriptionTier(data.premium_tier || data.premiumTier) || undefined,
    profileCompletion: toNumber(
      data.profile_completion ?? data.profileCompletion ?? data.profile_completion_percentage,
      0
    ),
    settings: transformedSettings,
    createdAt: toDateString(data.created_at || data.createdAt) || new Date().toISOString(),
    updatedAt: toDateString(data.updated_at || data.updatedAt) || new Date().toISOString(),
  };
}

class ProfileService {
  private isMock = !import.meta.env.VITE_API_URL;

  async getProfile(): Promise<UserProfile> {
    if (this.isMock) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const user = JSON.parse(stored);
        return {
          ...user,
          dateOfBirth: '1995-01-15',
          gender: 'male',
          bio: 'Mock user bio',
          interests: ['Travel', 'Music', 'Food'],
          lookingFor: ['relationship'],
          photos: [],
          prompts: [],
          profileCompletion: 75,
          settings: {
            showAge: true,
            showDistance: true,
            incognitoMode: false,
            discoverable: true,
            ageRangeMin: 18,
            ageRangeMax: 45,
            maxDistance: 50,
            genderPreference: ['female'],
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw new Error('Not authenticated');
    }

    // Backend may return wrapped response { success, data } or direct profile
    const response = await apiClient.get<
      { success: boolean; data: BackendProfile } | BackendProfile
    >('/api/profile');

    // Handle both wrapped and unwrapped response formats
    const backendProfile =
      'success' in response && response.data ? response.data : (response as BackendProfile);
    return transformBackendProfile(backendProfile);
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      await mockApi.updateProfile(data);
      return this.getProfile();
    }

    // Backend may return wrapped response { success, data } or direct profile
    const response = await apiClient.patch<
      { success: boolean; data: BackendProfile } | BackendProfile
    >('/api/profile', data);

    // Handle both wrapped and unwrapped response formats
    const backendProfile =
      'success' in response && response.data ? response.data : (response as BackendProfile);
    return transformBackendProfile(backendProfile);
  }

  async updateSettings(data: UpdateSettingsData): Promise<ProfileSettings> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        showAge: data.showAge ?? true,
        showDistance: data.showDistance ?? true,
        incognitoMode: data.incognitoMode ?? false,
        discoverable: data.discoverable ?? true,
        ageRangeMin: data.ageRangeMin ?? 18,
        ageRangeMax: data.ageRangeMax ?? 45,
        maxDistance: data.maxDistance ?? 50,
        genderPreference: data.genderPreference ?? ['female'],
      };
    }

    return apiClient.patch<ProfileSettings>('/api/profile/settings', data);
  }

  async uploadPhoto(file: File, isPrimary: boolean = false): Promise<ProfilePhoto> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        id: `photo-${Date.now()}`,
        url: URL.createObjectURL(file),
        isPrimary,
        moderationStatus: 'approved',
        order: 0,
      };
    }

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('isPrimary', String(isPrimary));

    const response = await fetch('/api/profile/photos', {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload photo');
    }

    return response.json();
  }

  async deletePhoto(photoId: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    await apiClient.delete(`/api/profile/photos/${photoId}`);
  }

  async reorderPhotos(photoIds: string[]): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    await apiClient.put('/api/profile/photos/reorder', { photoIds });
  }

  async addPrompt(question: string, answer: string): Promise<ProfilePrompt> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        id: `prompt-${Date.now()}`,
        question,
        answer,
      };
    }

    return apiClient.post<ProfilePrompt>('/api/profile/prompts', {
      question,
      answer,
    });
  }

  async updatePrompt(promptId: string, answer: string): Promise<ProfilePrompt> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        id: promptId,
        question: 'A question',
        answer,
      };
    }

    return apiClient.patch<ProfilePrompt>(`/api/profile/prompts/${promptId}`, {
      answer,
    });
  }

  async deletePrompt(promptId: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    await apiClient.delete(`/api/profile/prompts/${promptId}`);
  }

  async requestVerification(): Promise<{ verificationUrl: string }> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { verificationUrl: 'mock-verification-url' };
    }

    return apiClient.post('/api/profile/verify');
  }

  async deleteAccount(): Promise<void> {
    if (this.isMock) {
      localStorage.clear();
      return;
    }

    await apiClient.delete('/api/profile');
    localStorage.clear();
  }
}

export const profileService = new ProfileService();
export default profileService;
