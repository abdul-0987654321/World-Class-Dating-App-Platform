/**
 * Service Mocks
 * Mock implementations of all services for testing
 */

import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  photoUrl: 'https://example.com/photo.jpg',
  subscription: 'free',
  isVerified: true,
  premiumTier: 'FREE',
  coinBalance: 100,
  profileCompletion: 80,
};

export const mockEntitlements = {
  tier: 'FREE',
  features: ['basic_matching', 'messaging'],
  limits: {
    dailyLikes: 10,
    dailySuperLikes: 0,
    dailyBoosts: 0,
    messagesBeforeMatch: false,
    seeWhoLikesYou: false,
    advancedFilters: false,
    readReceipts: false,
    incognitoMode: false,
    videoCalls: false,
    prioritySupport: false,
  },
};

export const mockLoginResponse = {
  user: mockUser,
  token: 'mock-jwt-token',
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

// Auth Service Mock
export const mockAuthService = {
  login: vi.fn().mockResolvedValue(mockLoginResponse),
  register: vi.fn().mockResolvedValue(mockLoginResponse),
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
  getSession: vi.fn().mockResolvedValue({
    user: mockUser,
    entitlements: mockEntitlements,
    isAuthenticated: true,
  }),
  refreshToken: vi.fn().mockResolvedValue(mockLoginResponse),
  forgotPassword: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue(undefined),
  verifyEmail: vi.fn().mockResolvedValue(undefined),
  resendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn().mockReturnValue(true),
  getToken: vi.fn().mockReturnValue('mock-jwt-token'),
  getStoredEntitlements: vi.fn().mockReturnValue(mockEntitlements),
  hasFeature: vi.fn().mockReturnValue(false),
};

// Mock profile data
export const mockProfile = {
  user_id: 'profile-1',
  first_name: 'Jane',
  age: 25,
  bio: 'Love hiking and coffee',
  photos: [{ url: 'https://example.com/photo1.jpg', isPrimary: true }],
  distance: 5,
  city: 'New York',
  interests: ['hiking', 'coffee', 'music'],
  is_verified: true,
  compatibility_score: 85,
};

export const mockProfiles = [
  mockProfile,
  {
    user_id: 'profile-2',
    first_name: 'John',
    age: 28,
    bio: 'Software engineer who loves travel',
    photos: [{ url: 'https://example.com/photo2.jpg', isPrimary: true }],
    distance: 10,
    city: 'Brooklyn',
    interests: ['travel', 'coding', 'photography'],
    is_verified: false,
    compatibility_score: 78,
  },
];

// Discovery Service Mock
export const mockDiscoveryService = {
  getRecommendations: vi.fn().mockResolvedValue({ profiles: mockProfiles }),
  swipe: vi.fn().mockResolvedValue({ isMatch: false }),
  getStats: vi.fn().mockResolvedValue({
    remainingLikes: 10,
    remainingSuperLikes: 5,
    remainingBoosts: 1,
  }),
  getFilters: vi.fn().mockResolvedValue({
    ageRange: { min: 18, max: 50 },
    distance: 50,
    genders: ['all'],
  }),
  updateFilters: vi.fn().mockResolvedValue(undefined),
};

// Mock conversation data
export const mockConversation = {
  id: 'conv-1',
  participant: {
    id: 'user-2',
    name: 'Jane',
    photoUrl: 'https://example.com/photo.jpg',
    isOnline: true,
    isTyping: false,
  },
  lastMessage: {
    content: 'Hey there!',
    sentAt: new Date().toISOString(),
    senderId: 'user-2',
  },
  unreadCount: 1,
  isTyping: false,
};

export const mockMessage = {
  id: 'msg-1',
  senderId: 'test-user-123',
  content: 'Hello!',
  sentAt: new Date().toISOString(),
  status: 'sent',
};

// Messaging Service Mock
export const mockMessagingService = {
  getConversations: vi.fn().mockResolvedValue({
    conversations: [mockConversation],
  }),
  getMessages: vi.fn().mockResolvedValue({
    messages: [mockMessage],
  }),
  sendMessage: vi.fn().mockResolvedValue(mockMessage),
  markAsRead: vi.fn().mockResolvedValue(undefined),
  deleteMessage: vi.fn().mockResolvedValue(undefined),
  sendTypingIndicator: vi.fn().mockResolvedValue(undefined),
};

// Profile Service Mock
export const mockProfileService = {
  getProfile: vi.fn().mockResolvedValue(mockUser),
  updateProfile: vi.fn().mockResolvedValue(mockUser),
  uploadPhoto: vi.fn().mockResolvedValue({ url: 'https://example.com/new-photo.jpg' }),
  deletePhoto: vi.fn().mockResolvedValue(undefined),
  getInterests: vi.fn().mockResolvedValue([
    { id: '1', name: 'Hiking', category: 'Outdoors' },
    { id: '2', name: 'Music', category: 'Entertainment' },
  ]),
};

// API Client Mock
export const mockApiClient = {
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  request: vi.fn().mockResolvedValue({}),
  refreshCsrfToken: vi.fn().mockResolvedValue('mock-csrf-token'),
};

// Factory functions to create fresh mocks
export function createMockAuthService() {
  return { ...mockAuthService };
}

export function createMockDiscoveryService() {
  return { ...mockDiscoveryService };
}

export function createMockMessagingService() {
  return { ...mockMessagingService };
}

export function createMockProfileService() {
  return { ...mockProfileService };
}

export function createMockApiClient() {
  return { ...mockApiClient };
}

// Reset all mocks
export function resetAllMocks() {
  Object.values(mockAuthService).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      fn.mockReset();
    }
  });
  Object.values(mockDiscoveryService).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      fn.mockReset();
    }
  });
  Object.values(mockMessagingService).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      fn.mockReset();
    }
  });
  Object.values(mockProfileService).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      fn.mockReset();
    }
  });
  Object.values(mockApiClient).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      fn.mockReset();
    }
  });
}
