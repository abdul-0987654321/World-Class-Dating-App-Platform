export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized access',
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: {
      dailyLikes: 50,
      dailySuperLikes: 1,
      canSeeWhoLikedYou: false,
      unlimitedMatches: true,
      advancedFilters: false,
      monthlyBoosts: 0,
      incognitoMode: false,
      readReceipts: false,
      rewind: false,
      passport: false,
      priorityLikes: false,
    },
  },
  BASIC: {
    name: 'Basic',
    price: 9.99,
    features: {
      dailyLikes: -1, // Unlimited
      dailySuperLikes: 5,
      canSeeWhoLikedYou: true,
      unlimitedMatches: true,
      advancedFilters: false,
      monthlyBoosts: 1,
      incognitoMode: false,
      readReceipts: false,
      rewind: true,
      passport: false,
      priorityLikes: false,
    },
  },
  PLUS: {
    name: 'Plus',
    price: 14.99,
    features: {
      dailyLikes: -1, // Unlimited
      dailySuperLikes: 10,
      canSeeWhoLikedYou: true,
      unlimitedMatches: true,
      advancedFilters: false,
      monthlyBoosts: 1,
      incognitoMode: true,
      readReceipts: true,
      rewind: true,
      passport: false,
      priorityLikes: true,
    },
  },
  PREMIUM: {
    name: 'Premium',
    price: 19.99,
    features: {
      dailyLikes: -1, // Unlimited
      dailySuperLikes: -1, // Unlimited
      canSeeWhoLikedYou: true,
      unlimitedMatches: true,
      advancedFilters: true,
      monthlyBoosts: 2,
      incognitoMode: true,
      readReceipts: true,
      rewind: true,
      passport: true,
      priorityLikes: true,
    },
  },
  PREMIUM_PLUS: {
    name: 'Premium+',
    price: 29.99,
    features: {
      dailyLikes: -1, // Unlimited
      dailySuperLikes: -1, // Unlimited
      canSeeWhoLikedYou: true,
      unlimitedMatches: true,
      advancedFilters: true,
      monthlyBoosts: 4,
      incognitoMode: true,
      readReceipts: true,
      rewind: true,
      passport: true,
      priorityLikes: true,
      messageBeforeMatch: true,
      profileVisitors: true,
    },
  },
  ELITE: {
    name: 'Elite',
    price: 49.99,
    features: {
      dailyLikes: -1, // Unlimited
      dailySuperLikes: -1, // Unlimited
      canSeeWhoLikedYou: true,
      unlimitedMatches: true,
      advancedFilters: true,
      monthlyBoosts: 12,
      incognitoMode: true,
      readReceipts: true,
      rewind: true,
      passport: true,
      priorityLikes: true,
      messageBeforeMatch: true,
      profileVisitors: true,
      vipBadge: true,
      dedicatedSupport: true,
    },
  },
} as const;

export const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  AUTH: {
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
  },
} as const;

export const MAX_PROFILE_PHOTOS = 9;
export const MIN_PROFILE_PHOTOS = 1;
export const MAX_BIO_LENGTH = 500;
export const MAX_INTERESTS = 10;
export const MIN_AGE = 18;
export const MAX_AGE = 100;
export const DEFAULT_DISTANCE_MAX = 50; // kilometers
export const MATCH_EXPIRY_DAYS = 30;
export const TOKEN_EXPIRY_HOURS = 24;
export const REFRESH_TOKEN_EXPIRY_DAYS = 30;
