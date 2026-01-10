/**
 * Main types export file
 */

// Re-export discovery types
export * from './discovery.types';

// Re-export speed dating types
export * from './speedDating.types';

/**
 * User Types
 */
export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  interestedIn: ('men' | 'women' | 'everyone')[];
  photos: ProfilePhoto[];
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isPremium: boolean;
  premiumExpiresAt?: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  age: number;
  bio?: string;
  photos: ProfilePhoto[];
  location: Location;
  occupation?: string;
  company?: string;
  education?: string;
  verified: boolean;
  interests: string[];
  lookingFor?: 'casual' | 'serious' | 'friendship' | 'not-sure';
  height?: number;
  relationshipGoal?: string;
  zodiacSign?: string;
  smoking?: 'yes' | 'no' | 'sometimes';
  drinking?: 'yes' | 'no' | 'sometimes';
  exercise?: 'active' | 'sometimes' | 'rarely';
  pets?: string[];
  languages?: string[];
  videoProfileUrl?: string;
  answerPrompts?: ProfilePrompt[];
  spotifyArtists?: string[];
  instagramHandle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  order: number;
  isVerified?: boolean;
}

export interface Location {
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProfilePrompt {
  id: string;
  question: string;
  answer: string;
}

/**
 * Auth Types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  interestedIn: ('men' | 'women' | 'everyone')[];
  phoneNumber?: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Message Types
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'gif' | 'voice' | 'video';
  mediaUrl?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  matchId: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Subscription Types
 */
export interface Subscription {
  id: string;
  userId: string;
  plan: 'basic' | 'premium' | 'platinum';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}

/**
 * Notification Types
 */
export interface Notification {
  id: string;
  userId: string;
  type: 'match' | 'message' | 'like' | 'super_like' | 'view' | 'system';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

/**
 * API Error Types
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: any;
}

/**
 * Common Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
