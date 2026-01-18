/**
 * API Configuration for Flamoral Web App
 *
 * This file centralizes API configuration and provides standardized endpoints
 * for use throughout the web application.
 *
 * All API paths follow the pattern: /api/v1/{service}/{resource}
 */

// API Version
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

/**
 * Authentication endpoints
 */
export const AUTH_ENDPOINTS = {
  BASE: `${API_PREFIX}/auth`,
  LOGIN: `${API_PREFIX}/auth/login`,
  REGISTER: `${API_PREFIX}/auth/register`,
  LOGOUT: `${API_PREFIX}/auth/logout`,
  ME: `${API_PREFIX}/auth/me`,
  SESSION: `${API_PREFIX}/auth/session`,
  REFRESH_TOKEN: `${API_PREFIX}/auth/refresh-token`,
  FORGOT_PASSWORD: `${API_PREFIX}/auth/forgot-password`,
  RESET_PASSWORD: `${API_PREFIX}/auth/reset-password`,
  VERIFY_EMAIL: `${API_PREFIX}/auth/verify-email`,
  RESEND_VERIFICATION: `${API_PREFIX}/auth/resend-verification`,
  CSRF_TOKEN: `${API_PREFIX}/csrf/token`,
  CSRF_VERIFY: `${API_PREFIX}/csrf/verify`,
} as const;

/**
 * User endpoints
 */
export const USER_ENDPOINTS = {
  BASE: `${API_PREFIX}/users`,
  BLOCK: `${API_PREFIX}/users/block`,
  BLOCKED: `${API_PREFIX}/users/blocked`,
  blockUser: (userId: string) => `${API_PREFIX}/users/block/${userId}`,
  checkBlocked: (userId: string) => `${API_PREFIX}/users/block/check/${userId}`,
} as const;

/**
 * Profile endpoints
 */
export const PROFILE_ENDPOINTS = {
  BASE: `${API_PREFIX}/profiles`,
  ME: `${API_PREFIX}/profiles/me`,
  SETTINGS: `${API_PREFIX}/profiles/settings`,
  PHOTOS: `${API_PREFIX}/profiles/photos`,
  PHOTOS_REORDER: `${API_PREFIX}/profiles/photos/reorder`,
  PROMPTS: `${API_PREFIX}/profiles/prompts`,
  VERIFY: `${API_PREFIX}/profiles/verify`,
  photo: (photoId: string) => `${API_PREFIX}/profiles/photos/${photoId}`,
  prompt: (promptId: string) => `${API_PREFIX}/profiles/prompts/${promptId}`,
  byId: (profileId: string) => `${API_PREFIX}/profiles/${profileId}`,
} as const;

/**
 * Matching endpoints
 */
export const MATCH_ENDPOINTS = {
  BASE: `${API_PREFIX}/matches`,
  RECENT: `${API_PREFIX}/matches/recent`,
  COUNT: `${API_PREFIX}/matches/count`,
  LIKES: `${API_PREFIX}/matches/likes`,
  LIKES_YOU: `${API_PREFIX}/matches/likes-you`,
  byId: (matchId: string) => `${API_PREFIX}/matches/${matchId}`,
  extend: (matchId: string) => `${API_PREFIX}/matches/${matchId}/extend`,
  rematch: (userId: string) => `${API_PREFIX}/matches/${userId}/rematch`,
  report: (matchId: string) => `${API_PREFIX}/matches/${matchId}/report`,
} as const;

/**
 * Messaging endpoints
 */
export const MESSAGE_ENDPOINTS = {
  BASE: `${API_PREFIX}/messages`,
  CONVERSATIONS: `${API_PREFIX}/messages/conversations`,
  UNREAD_COUNT: `${API_PREFIX}/messages/unread-count`,
  conversation: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}`,
  messages: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/messages`,
  sendMessage: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/messages`,
  sendImage: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/messages/image`,
  sendVoice: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/messages/voice`,
  markRead: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/read`,
  markAllRead: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/read-all`,
  message: (conversationId: string, messageId: string) =>
    `${API_PREFIX}/messages/conversations/${conversationId}/messages/${messageId}`,
  reportMessage: (conversationId: string, messageId: string) =>
    `${API_PREFIX}/messages/conversations/${conversationId}/messages/${messageId}/report`,
  blockInConversation: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/block`,
  search: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/search`,
  media: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/media`,
  report: (conversationId: string) => `${API_PREFIX}/messages/conversations/${conversationId}/report`,
} as const;

/**
 * Notification endpoints
 */
export const NOTIFICATION_ENDPOINTS = {
  BASE: `${API_PREFIX}/notifications`,
  LIST: `${API_PREFIX}/notifications`,
  UNREAD_COUNT: `${API_PREFIX}/notifications/unread-count`,
  SETTINGS: `${API_PREFIX}/notifications/settings`,
  REGISTER_DEVICE: `${API_PREFIX}/notifications/devices`,
  byId: (notificationId: string) => `${API_PREFIX}/notifications/${notificationId}`,
  markRead: (notificationId: string) => `${API_PREFIX}/notifications/${notificationId}/read`,
  MARK_ALL_READ: `${API_PREFIX}/notifications/read-all`,
} as const;

/**
 * Subscription endpoints
 */
export const SUBSCRIPTION_ENDPOINTS = {
  BASE: `${API_PREFIX}/subscriptions`,
  CURRENT: `${API_PREFIX}/subscriptions/current`,
  PLANS: `${API_PREFIX}/subscriptions/plans`,
  UPGRADE: `${API_PREFIX}/subscriptions/upgrade`,
  CANCEL: `${API_PREFIX}/subscriptions/cancel`,
  HISTORY: `${API_PREFIX}/subscriptions/history`,
  RESTORE: `${API_PREFIX}/subscriptions/restore`,
} as const;

/**
 * Coins/Virtual Currency endpoints
 */
export const COIN_ENDPOINTS = {
  BASE: `${API_PREFIX}/coins`,
  BALANCE: `${API_PREFIX}/coins/balance`,
  PACKAGES: `${API_PREFIX}/coins/packages`,
  PURCHASE: `${API_PREFIX}/coins/purchase`,
  SPEND: `${API_PREFIX}/coins/spend`,
  TRANSACTIONS: `${API_PREFIX}/coins/transactions`,
} as const;

/**
 * Discovery endpoints
 */
export const DISCOVERY_ENDPOINTS = {
  BASE: `${API_PREFIX}/discovery`,
  FEED: `${API_PREFIX}/discovery/feed`,
  PROFILES: `${API_PREFIX}/discovery/profiles`,
  LIKE: `${API_PREFIX}/discovery/like`,
  PASS: `${API_PREFIX}/discovery/pass`,
  SUPER_LIKE: `${API_PREFIX}/discovery/super-like`,
  REWIND: `${API_PREFIX}/discovery/rewind`,
  BOOST_ACTIVATE: `${API_PREFIX}/discovery/boost/activate`,
  BOOST_STATUS: `${API_PREFIX}/discovery/boost/status`,
  SUPER_LIKE_INFO: `${API_PREFIX}/discovery/super-like/info`,
  REWIND_INFO: `${API_PREFIX}/discovery/rewind/info`,
  STATS: `${API_PREFIX}/discovery/stats`,
  PREFERENCES: `${API_PREFIX}/discovery/preferences`,
  FILTERS: `${API_PREFIX}/discovery/filters`,
  PAUSE: `${API_PREFIX}/discovery/pause`,
  RESUME: `${API_PREFIX}/discovery/resume`,
  REPORT: `${API_PREFIX}/discovery/report`,
  BLOCK: `${API_PREFIX}/discovery/block`,
  LIKE_FROM_LIST: `${API_PREFIX}/discovery/like-from-list`,
  CURATED_PICKS: `${API_PREFIX}/discovery/curated-picks`,
  PASSPORT: `${API_PREFIX}/discovery/passport`,
  MATCHES: `${API_PREFIX}/discovery/matches`,
  profile: (profileId: string) => `${API_PREFIX}/discovery/profiles/${profileId}`,
  match: (matchId: string) => `${API_PREFIX}/discovery/matches/${matchId}`,
} as const;

/**
 * Safety endpoints
 */
export const SAFETY_ENDPOINTS = {
  BASE: `${API_PREFIX}/safety`,
  // Verification
  VERIFICATION_STATUS: `${API_PREFIX}/safety/verification/status`,
  VERIFICATION_SUBMIT: `${API_PREFIX}/safety/verification/submit`,
  // Security
  SECURITY_SETTINGS: `${API_PREFIX}/safety/security/settings`,
  TWO_FA_SETUP: `${API_PREFIX}/safety/security/2fa/setup`,
  TWO_FA_VERIFY: `${API_PREFIX}/safety/security/2fa/verify`,
  TWO_FA_DISABLE: `${API_PREFIX}/safety/security/2fa/disable`,
  SESSIONS: `${API_PREFIX}/safety/security/sessions`,
  REVOKE_ALL_SESSIONS: `${API_PREFIX}/safety/security/sessions/revoke-all`,
  // Privacy
  PRIVACY_SETTINGS: `${API_PREFIX}/safety/privacy/settings`,
  INCOGNITO_ENABLE: `${API_PREFIX}/safety/privacy/incognito/enable`,
  INCOGNITO_DISABLE: `${API_PREFIX}/safety/privacy/incognito/disable`,
  DATA_EXPORT: `${API_PREFIX}/safety/privacy/export`,
  DELETE_ACCOUNT: `${API_PREFIX}/safety/privacy/delete`,
  // Emergency
  EMERGENCY_CONTACTS: `${API_PREFIX}/safety/emergency-contacts`,
  CHECK_IN_ACTIVE: `${API_PREFIX}/safety/check-in/active`,
  CHECK_IN: `${API_PREFIX}/safety/check-in`,
  SOS: `${API_PREFIX}/safety/sos`,
  // Block/Report
  BLOCKED_USERS: `${API_PREFIX}/safety/blocked`,
  BLOCK_USER: `${API_PREFIX}/safety/block`,
  REPORT: `${API_PREFIX}/safety/report`,
  // Resources
  TIPS: `${API_PREFIX}/safety/tips`,
  CRISIS_RESOURCES: `${API_PREFIX}/safety/crisis/resources`,
  RESOURCES: `${API_PREFIX}/safety/resources`,
  session: (sessionId: string) => `${API_PREFIX}/safety/security/sessions/${sessionId}`,
  emergencyContact: (contactId: string) => `${API_PREFIX}/safety/emergency-contacts/${contactId}`,
  checkInConfirm: (checkInId: string) => `${API_PREFIX}/safety/check-in/${checkInId}/confirm`,
  unblock: (userId: string) => `${API_PREFIX}/safety/block/${userId}`,
} as const;

/**
 * Boost endpoints
 */
export const BOOST_ENDPOINTS = {
  BASE: `${API_PREFIX}/boosts`,
  ACTIVE: `${API_PREFIX}/boosts/active`,
  HISTORY: `${API_PREFIX}/boosts/history`,
  PACKAGES: `${API_PREFIX}/boosts/packages`,
  ACTIVATE: `${API_PREFIX}/boosts/activate`,
  STATS: `${API_PREFIX}/boosts/stats`,
} as const;

/**
 * Gamification endpoints
 */
export const GAMIFICATION_ENDPOINTS = {
  BASE: `${API_PREFIX}/gamification`,
  ACHIEVEMENTS: `${API_PREFIX}/gamification/achievements`,
  STREAKS: `${API_PREFIX}/gamification/streaks`,
  LEADERBOARD: `${API_PREFIX}/gamification/leaderboard`,
  REWARDS: `${API_PREFIX}/gamification/rewards`,
} as const;

/**
 * Community endpoints
 */
export const COMMUNITY_ENDPOINTS = {
  BASE: `${API_PREFIX}/communities`,
  LIST: `${API_PREFIX}/communities`,
  MY_COMMUNITIES: `${API_PREFIX}/communities/my`,
  DISCOVER: `${API_PREFIX}/communities/discover`,
  byId: (communityId: string) => `${API_PREFIX}/communities/${communityId}`,
  join: (communityId: string) => `${API_PREFIX}/communities/${communityId}/join`,
  leave: (communityId: string) => `${API_PREFIX}/communities/${communityId}/leave`,
  members: (communityId: string) => `${API_PREFIX}/communities/${communityId}/members`,
  posts: (communityId: string) => `${API_PREFIX}/communities/${communityId}/posts`,
} as const;

/**
 * Speed Dating endpoints
 */
export const SPEED_DATING_ENDPOINTS = {
  BASE: `${API_PREFIX}/speed-dating`,
  SESSIONS: `${API_PREFIX}/speed-dating/sessions`,
  ACTIVE: `${API_PREFIX}/speed-dating/active`,
  JOIN: `${API_PREFIX}/speed-dating/join`,
  LEAVE: `${API_PREFIX}/speed-dating/leave`,
  session: (sessionId: string) => `${API_PREFIX}/speed-dating/sessions/${sessionId}`,
} as const;

/**
 * Video Chat endpoints
 */
export const VIDEO_CHAT_ENDPOINTS = {
  BASE: `${API_PREFIX}/video-chat`,
  INITIATE: `${API_PREFIX}/video-chat/initiate`,
  HISTORY: `${API_PREFIX}/video-chat/history`,
  ACTIVE: `${API_PREFIX}/video-chat/active`,
  ELIGIBILITY: `${API_PREFIX}/video-chat/eligibility`,
  accept: (callId: string) => `${API_PREFIX}/video-chat/accept/${callId}`,
  end: (callId: string) => `${API_PREFIX}/video-chat/end/${callId}`,
  status: (callId: string) => `${API_PREFIX}/video-chat/status/${callId}`,
} as const;

/**
 * Referral endpoints
 */
export const REFERRAL_ENDPOINTS = {
  BASE: `${API_PREFIX}/referrals`,
  CODE: `${API_PREFIX}/referrals/code`,
  STATS: `${API_PREFIX}/referrals/stats`,
  APPLY: `${API_PREFIX}/referrals/apply`,
  HISTORY: `${API_PREFIX}/referrals/history`,
} as const;

/**
 * Reports/Moderation endpoints
 */
export const REPORT_ENDPOINTS = {
  BASE: `${API_PREFIX}/reports`,
  MY_REPORTS: `${API_PREFIX}/reports/my`,
  byId: (reportId: string) => `${API_PREFIX}/reports/${reportId}`,
} as const;

/**
 * Moderation endpoints
 */
export const MODERATION_ENDPOINTS = {
  BASE: `${API_PREFIX}/moderation`,
  VIOLATIONS: `${API_PREFIX}/moderation/violations`,
  APPEALS: `${API_PREFIX}/moderation/appeals`,
  violation: (violationId: string) => `${API_PREFIX}/moderation/violations/${violationId}`,
  appeal: (appealId: string) => `${API_PREFIX}/moderation/appeals/${appealId}`,
  userStatus: (userId: string) => `${API_PREFIX}/moderation/users/${userId}/status`,
} as const;

/**
 * Admin endpoints
 */
export const ADMIN_ENDPOINTS = {
  BASE: `${API_PREFIX}/admin`,
  USERS: `${API_PREFIX}/admin/users`,
  MODERATION_QUEUE: `${API_PREFIX}/admin/moderation/queue`,
  MODERATION_STATISTICS: `${API_PREFIX}/admin/moderation/statistics`,
  moderationReview: (moderationLogId: string) => `${API_PREFIX}/admin/moderation/review/${moderationLogId}`,
} as const;

/**
 * Ads endpoints
 */
export const ADS_ENDPOINTS = {
  BASE: `${API_PREFIX}/ads`,
  PLACEMENT: `${API_PREFIX}/ads/placement`,
  CLICK: `${API_PREFIX}/ads/click`,
  IMPRESSION: `${API_PREFIX}/ads/impression`,
} as const;

/**
 * Policy endpoints
 */
export const POLICY_ENDPOINTS = {
  BASE: `${API_PREFIX}/policies`,
  TERMS: `${API_PREFIX}/policies/terms`,
  PRIVACY: `${API_PREFIX}/policies/privacy`,
  COMMUNITY_GUIDELINES: `${API_PREFIX}/policies/community-guidelines`,
  ACCEPT: `${API_PREFIX}/policies/accept`,
} as const;

/**
 * Privacy Settings endpoints
 */
export const PRIVACY_ENDPOINTS = {
  BASE: `${API_PREFIX}/privacy`,
  SETTINGS: `${API_PREFIX}/privacy/settings`,
  INCOGNITO: `${API_PREFIX}/privacy/incognito`,
} as const;

/**
 * Usage Limits endpoints
 */
export const LIMITS_ENDPOINTS = {
  BASE: `${API_PREFIX}/limits`,
  USER_LIMITS: `${API_PREFIX}/limits/user`,
  check: (action: string) => `${API_PREFIX}/limits/check/${action}`,
  use: (action: string) => `${API_PREFIX}/limits/use/${action}`,
} as const;

/**
 * Encryption Keys endpoints
 */
export const ENCRYPTION_ENDPOINTS = {
  BASE: `${API_PREFIX}/keys`,
  UPLOAD: `${API_PREFIX}/keys/upload`,
  CLAIM: `${API_PREFIX}/keys/claim`,
  GENERATE: `${API_PREFIX}/keys/generate`,
  SESSION: `${API_PREFIX}/keys/session`,
  byUserId: (userId: string) => `${API_PREFIX}/keys/${userId}`,
  sessionByConversation: (conversationId: string) => `${API_PREFIX}/keys/session/${conversationId}`,
} as const;

/**
 * AI Service endpoints
 */
export const AI_ENDPOINTS = {
  FRAUD_DETECTION: `${API_PREFIX}/ai/fraud`,
  NLP: `${API_PREFIX}/ai/nlp`,
  PHOTO_ANALYSIS: `${API_PREFIX}/ai/photos`,
  RECOMMENDATIONS: `${API_PREFIX}/ai/recommendations`,
} as const;

/**
 * Payments/Purchase verification endpoints
 */
export const PAYMENT_ENDPOINTS = {
  BASE: `${API_PREFIX}/payments`,
  VERIFY_PURCHASE: `${API_PREFIX}/payments/verify`,
  METHODS: `${API_PREFIX}/payments/methods`,
  HISTORY: `${API_PREFIX}/payments/history`,
} as const;

/**
 * Combined API endpoints object for easy access
 */
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  USERS: USER_ENDPOINTS,
  PROFILES: PROFILE_ENDPOINTS,
  MATCHES: MATCH_ENDPOINTS,
  MESSAGES: MESSAGE_ENDPOINTS,
  NOTIFICATIONS: NOTIFICATION_ENDPOINTS,
  SUBSCRIPTIONS: SUBSCRIPTION_ENDPOINTS,
  COINS: COIN_ENDPOINTS,
  DISCOVERY: DISCOVERY_ENDPOINTS,
  SAFETY: SAFETY_ENDPOINTS,
  BOOSTS: BOOST_ENDPOINTS,
  GAMIFICATION: GAMIFICATION_ENDPOINTS,
  COMMUNITIES: COMMUNITY_ENDPOINTS,
  SPEED_DATING: SPEED_DATING_ENDPOINTS,
  VIDEO_CHAT: VIDEO_CHAT_ENDPOINTS,
  REFERRALS: REFERRAL_ENDPOINTS,
  REPORTS: REPORT_ENDPOINTS,
  MODERATION: MODERATION_ENDPOINTS,
  ADMIN: ADMIN_ENDPOINTS,
  ADS: ADS_ENDPOINTS,
  POLICIES: POLICY_ENDPOINTS,
  PRIVACY: PRIVACY_ENDPOINTS,
  LIMITS: LIMITS_ENDPOINTS,
  ENCRYPTION: ENCRYPTION_ENDPOINTS,
  AI: AI_ENDPOINTS,
  PAYMENTS: PAYMENT_ENDPOINTS,
} as const;

// Environment-specific configuration
export const API_CONFIG = {
  // Base URL from environment or default
  BASE_URL: import.meta.env.VITE_API_URL || '',

  // WebSocket URL
  WS_URL: import.meta.env.VITE_WS_URL || '',

  // Request timeouts (milliseconds)
  TIMEOUTS: {
    DEFAULT: 30000,
    UPLOAD: 120000,
    LONG_POLL: 60000,
  },

  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
  },

  // Feature flags for API behavior
  FEATURES: {
    CSRF_PROTECTION: true,
    AUTO_REFRESH_TOKEN: true,
    OFFLINE_QUEUE: false,
  },
} as const;

/**
 * Build a full API URL with the base URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.BASE_URL;
  if (!baseUrl) return endpoint;
  return `${baseUrl}${endpoint}`;
}

/**
 * Build a WebSocket URL
 */
export function buildWsUrl(path: string = ''): string {
  const wsUrl = API_CONFIG.WS_URL;
  if (!wsUrl) return path;
  return `${wsUrl}${path}`;
}

// Type definitions
export type ApiConfig = typeof API_CONFIG;
export type AuthEndpoints = typeof AUTH_ENDPOINTS;
export type UserEndpoints = typeof USER_ENDPOINTS;
export type ProfileEndpoints = typeof PROFILE_ENDPOINTS;
export type MatchEndpoints = typeof MATCH_ENDPOINTS;
export type MessageEndpoints = typeof MESSAGE_ENDPOINTS;
export type NotificationEndpoints = typeof NOTIFICATION_ENDPOINTS;
export type SubscriptionEndpoints = typeof SUBSCRIPTION_ENDPOINTS;
export type CoinEndpoints = typeof COIN_ENDPOINTS;
export type DiscoveryEndpoints = typeof DISCOVERY_ENDPOINTS;
export type SafetyEndpoints = typeof SAFETY_ENDPOINTS;
export type ApiEndpoints = typeof API_ENDPOINTS;
