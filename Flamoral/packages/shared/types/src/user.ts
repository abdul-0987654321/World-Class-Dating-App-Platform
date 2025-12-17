import type { Gender } from './common';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  role: 'user' | 'admin';
  subscription: 'free' | 'premium' | 'premium_plus';
  coinBalance: number;
  isActive: boolean;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    newMatches: boolean;
    messages: boolean;
    likes: boolean;
    superLikes: boolean;
  };
  privacy: {
    showOnline: boolean;
    showDistance: boolean;
    showAge: boolean;
    incognitoMode: boolean;
  };
  discovery: {
    ageMin: number;
    ageMax: number;
    distanceMax: number;
    showMe: Gender[];
  };
}
