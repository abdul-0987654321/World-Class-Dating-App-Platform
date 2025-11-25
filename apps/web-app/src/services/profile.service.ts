/**
 * Profile Service
 * Handles user profile management
 */

import apiClient from './api.client';

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

    return apiClient.get<UserProfile>('/api/profile');
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      await mockApi.updateProfile(data);
      return this.getProfile();
    }

    return apiClient.patch<UserProfile>('/api/profile', data);
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
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
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
