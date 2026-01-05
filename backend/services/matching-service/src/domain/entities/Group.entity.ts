/**
 * Group Entity
 * Represents a group of friends for group-to-group matching
 */

import { GroupStatus, GroupPreferences, GroupLookingFor } from '../../types/group-matching.types';

export class Group {
  id: string;
  name: string;
  bio: string;
  photos: string[];
  adminId: string;
  status: GroupStatus;
  preferences: GroupPreferences;
  combinedInterests: string[];
  memberCount: number;
  minMembers: number;
  maxMembers: number;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
  isVerified: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    bio: string;
    photos: string[];
    adminId: string;
    status?: GroupStatus;
    preferences?: GroupPreferences;
    combinedInterests?: string[];
    memberCount?: number;
    minMembers?: number;
    maxMembers?: number;
    location?: {
      latitude: number;
      longitude: number;
      city?: string;
    };
    isVerified?: boolean;
    isPremium?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.bio = data.bio;
    this.photos = data.photos || [];
    this.adminId = data.adminId;
    this.status = data.status || GroupStatus.ACTIVE;
    this.preferences = data.preferences || this.getDefaultPreferences();
    this.combinedInterests = data.combinedInterests || [];
    this.memberCount = data.memberCount || 1;
    this.minMembers = data.minMembers || 2;
    this.maxMembers = data.maxMembers || 8;
    this.location = data.location;
    this.isVerified = data.isVerified || false;
    this.isPremium = data.isPremium || false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  private getDefaultPreferences(): GroupPreferences {
    return {
      minGroupSize: 2,
      maxGroupSize: 8,
      ageRangeMin: 18,
      ageRangeMax: 99,
      maxDistance: 50,
      genderPreferences: [],
      activityPreferences: [],
      lookingFor: [GroupLookingFor.GROUP_HANGOUT],
    };
  }

  isActive(): boolean {
    return this.status === GroupStatus.ACTIVE;
  }

  canAddMember(): boolean {
    return this.memberCount < this.maxMembers && this.isActive();
  }

  hasMinimumMembers(): boolean {
    return this.memberCount >= this.minMembers;
  }

  isAdmin(userId: string): boolean {
    return this.adminId === userId;
  }

  static createNew(
    adminId: string,
    data: {
      name: string;
      bio: string;
      photos?: string[];
      preferences?: Partial<GroupPreferences>;
      minMembers?: number;
      maxMembers?: number;
      location?: {
        latitude: number;
        longitude: number;
        city?: string;
      };
    }
  ): Partial<Group> {
    const defaultPreferences: GroupPreferences = {
      minGroupSize: 2,
      maxGroupSize: 8,
      ageRangeMin: 18,
      ageRangeMax: 99,
      maxDistance: 50,
      genderPreferences: [],
      activityPreferences: [],
      lookingFor: [GroupLookingFor.GROUP_HANGOUT],
    };

    return {
      name: data.name,
      bio: data.bio,
      photos: data.photos || [],
      adminId,
      status: GroupStatus.ACTIVE,
      preferences: { ...defaultPreferences, ...data.preferences },
      combinedInterests: [],
      memberCount: 1,
      minMembers: data.minMembers || 2,
      maxMembers: data.maxMembers || 8,
      location: data.location,
      isVerified: false,
      isPremium: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
