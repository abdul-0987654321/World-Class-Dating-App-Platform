import { Injectable, NotFoundException } from '@nestjs/common';

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  age: number;
  gender: string;
  location: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  interests: string[];
  occupation: string;
  education: string;
  height?: number;
  photos: ProfilePhoto[];
  preferences: UserPreferences;
  verificationStatus: {
    email: boolean;
    phone: boolean;
    identity: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  isPrimary: boolean;
  order: number;
  isVerified: boolean;
  uploadedAt: Date;
}

export interface UserPreferences {
  ageRange: {
    min: number;
    max: number;
  };
  distance: number;
  genderPreference: string[];
  relationshipGoals: string[];
  dealbreakers: string[];
  showOnlineStatus: boolean;
  showDistance: boolean;
  showAge: boolean;
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  age?: number;
  gender?: string;
  location?: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  interests?: string[];
  occupation?: string;
  education?: string;
  height?: number;
}

export interface UpdatePreferencesDto {
  ageRange?: {
    min: number;
    max: number;
  };
  distance?: number;
  genderPreference?: string[];
  relationshipGoals?: string[];
  dealbreakers?: string[];
  showOnlineStatus?: boolean;
  showDistance?: boolean;
  showAge?: boolean;
}

export interface ProfileCompleteness {
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  suggestions: string[];
}

@Injectable()
export class ProfileService {
  // In a real implementation, this would use a database
  private profiles: Map<string, Profile> = new Map();

  async getProfile(userId: string): Promise<Profile> {
    const profile = this.profiles.get(userId);

    if (!profile) {
      // Return a default profile structure for new users
      const defaultProfile: Profile = {
        id: userId,
        userId: userId,
        displayName: '',
        bio: '',
        age: 0,
        gender: '',
        location: {
          city: '',
          country: '',
        },
        interests: [],
        occupation: '',
        education: '',
        photos: [],
        preferences: {
          ageRange: { min: 18, max: 50 },
          distance: 50,
          genderPreference: [],
          relationshipGoals: [],
          dealbreakers: [],
          showOnlineStatus: true,
          showDistance: true,
          showAge: true,
        },
        verificationStatus: {
          email: false,
          phone: false,
          identity: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.profiles.set(userId, defaultProfile);
      return defaultProfile;
    }

    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileDto): Promise<Profile> {
    let profile = this.profiles.get(userId);

    if (!profile) {
      profile = await this.getProfile(userId);
    }

    const updatedProfile: Profile = {
      ...profile,
      ...data,
      updatedAt: new Date(),
    };

    this.profiles.set(userId, updatedProfile);
    return updatedProfile;
  }

  async getProfilePhotos(userId: string): Promise<ProfilePhoto[]> {
    const profile = await this.getProfile(userId);
    return profile.photos;
  }

  async addProfilePhoto(
    userId: string,
    photoData: Omit<ProfilePhoto, 'id' | 'uploadedAt'>
  ): Promise<ProfilePhoto> {
    const profile = await this.getProfile(userId);

    const newPhoto: ProfilePhoto = {
      id: `photo_${Date.now()}`,
      ...photoData,
      uploadedAt: new Date(),
    };

    // If this is the first photo, make it primary
    if (profile.photos.length === 0) {
      newPhoto.isPrimary = true;
    }

    profile.photos.push(newPhoto);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return newPhoto;
  }

  async deleteProfilePhoto(userId: string, photoId: string): Promise<void> {
    const profile = await this.getProfile(userId);

    const photoIndex = profile.photos.findIndex((p) => p.id === photoId);
    if (photoIndex === -1) {
      throw new NotFoundException('Photo not found');
    }

    const deletedPhoto = profile.photos[photoIndex];
    profile.photos.splice(photoIndex, 1);

    // If deleted photo was primary, make the first remaining photo primary
    if (deletedPhoto.isPrimary && profile.photos.length > 0) {
      profile.photos[0].isPrimary = true;
    }

    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);
  }

  async updatePreferences(
    userId: string,
    preferences: UpdatePreferencesDto
  ): Promise<UserPreferences> {
    const profile = await this.getProfile(userId);

    const updatedPreferences: UserPreferences = {
      ...profile.preferences,
      ...preferences,
    };

    profile.preferences = updatedPreferences;
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return updatedPreferences;
  }

  async getProfileCompleteness(userId: string): Promise<ProfileCompleteness> {
    const profile = await this.getProfile(userId);

    const requiredFields = [
      { field: 'displayName', label: 'Display name' },
      { field: 'bio', label: 'Bio' },
      { field: 'age', label: 'Age' },
      { field: 'gender', label: 'Gender' },
      { field: 'location.city', label: 'City' },
      { field: 'interests', label: 'Interests' },
      { field: 'occupation', label: 'Occupation' },
      { field: 'photos', label: 'Profile photos' },
    ];

    const completedFields: string[] = [];
    const missingFields: string[] = [];
    const suggestions: string[] = [];

    for (const { field, label } of requiredFields) {
      const value = this.getNestedValue(profile, field);

      if (this.isFieldComplete(value)) {
        completedFields.push(field);
      } else {
        missingFields.push(field);
        suggestions.push(`Add your ${label.toLowerCase()} to improve your profile`);
      }
    }

    // Additional suggestions based on profile quality
    if (profile.photos.length < 3) {
      suggestions.push('Add more photos to increase your match rate');
    }

    if (profile.bio.length < 100) {
      suggestions.push('Write a longer bio to help others get to know you');
    }

    if (profile.interests.length < 3) {
      suggestions.push('Add more interests to find better matches');
    }

    const percentage = Math.round(
      (completedFields.length / requiredFields.length) * 100
    );

    return {
      percentage,
      completedFields,
      missingFields,
      suggestions: suggestions.slice(0, 5), // Return top 5 suggestions
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private isFieldComplete(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return value > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }
}
