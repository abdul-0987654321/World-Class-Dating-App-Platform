/**
 * Shared API endpoint paths for web and mobile apps
 * Using /api/v1/ prefix consistently
 */
export const API_PATHS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh-token',
    ME: '/api/v1/auth/me',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
  },

  // Discovery
  DISCOVERY: {
    FEED: '/api/v1/discovery/feed',
    PROFILES: '/api/v1/discovery/profiles',
    LIKE: '/api/v1/discovery/like',
    PASS: '/api/v1/discovery/pass',
    SUPER_LIKE: '/api/v1/discovery/super-like',
    REWIND: '/api/v1/discovery/rewind',
    STATS: '/api/v1/discovery/stats',
    PREFERENCES: '/api/v1/discovery/preferences',
    FILTERS: '/api/v1/discovery/filters',
    REPORT: '/api/v1/discovery/report',
    BLOCK: '/api/v1/discovery/block',
  },

  // Matches
  MATCHES: {
    LIST: '/api/v1/matches',
    DETAIL: (id: string) => `/api/v1/matches/${id}`,
    UNMATCH: (id: string) => `/api/v1/matches/${id}`,
    LIKES_YOU: '/api/v1/matches/likes-you',
  },

  // Messaging
  MESSAGING: {
    CONVERSATIONS: '/api/v1/messaging/conversations',
    CONVERSATION: (id: string) => `/api/v1/messaging/conversations/${id}`,
    MESSAGES: (conversationId: string) => `/api/v1/messaging/conversations/${conversationId}/messages`,
    READ: (conversationId: string) => `/api/v1/messaging/conversations/${conversationId}/read`,
    UNREAD_COUNT: '/api/v1/messaging/unread-count',
  },

  // Profile
  PROFILE: {
    GET: (userId: string) => `/api/v1/profile/${userId}`,
    UPDATE: (userId: string) => `/api/v1/profile/${userId}`,
    PHOTOS: (userId: string) => `/api/v1/profile/${userId}/photos`,
    PREFERENCES: (userId: string) => `/api/v1/profile/${userId}/preferences`,
  },

  // Boost
  BOOST: {
    STATUS: '/api/v1/boost/status',
    ACTIVATE: '/api/v1/boost/activate',
    HISTORY: '/api/v1/boost/history',
  },

  // Subscriptions
  SUBSCRIPTIONS: {
    CURRENT: '/api/v1/subscriptions/current',
    PLANS: '/api/v1/subscriptions/plans',
    UPGRADE: '/api/v1/subscriptions/upgrade',
    CANCEL: '/api/v1/subscriptions/cancel',
  },

  // Coins
  COINS: {
    BALANCE: '/api/v1/coins/balance',
    PACKAGES: '/api/v1/coins/packages',
    PURCHASE: '/api/v1/coins/purchase',
    TRANSACTIONS: '/api/v1/coins/transactions',
  },

  // Safety
  SAFETY: {
    VERIFICATION_STATUS: '/api/v1/safety/verification/status',
    VERIFICATION_SUBMIT: '/api/v1/safety/verification/submit',
    EMERGENCY_CONTACTS: '/api/v1/safety/emergency-contacts',
    BLOCKED_USERS: '/api/v1/safety/blocked',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    REGISTER_DEVICE: '/api/v1/notifications/device',
  },
} as const;

export type ApiPaths = typeof API_PATHS;
