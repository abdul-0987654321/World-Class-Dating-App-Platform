// API Configuration
// Note: These are default values. Override them in your app's config
// API Gateway runs on port 4000 with /api/v1 prefix
export const API_BASE_URL = 'http://localhost:4000/api/v1';
export const WS_BASE_URL = 'http://localhost:4000';
export const API_TIMEOUT = 30000; // 30 seconds

// App Configuration
export const APP_NAME = 'Flamoral';
export const APP_VERSION = '1.0.0';
export const MIN_AGE = 18;
export const MAX_AGE = 99;

// Swipe Limits
export const FREE_DAILY_SWIPES = 50;
export const PREMIUM_DAILY_SWIPES = 999;
export const SUPER_LIKES_PER_DAY = 1;
export const PREMIUM_SUPER_LIKES_PER_DAY = 5;

// Distance
export const MAX_DISTANCE_KM = 160; // ~100 miles
export const DEFAULT_DISTANCE_KM = 50;

// Photos
export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 9;
export const MAX_PHOTO_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Profile
export const MIN_BIO_LENGTH = 10;
export const MAX_BIO_LENGTH = 500;
export const MAX_INTERESTS = 10;
export const MAX_PROMPTS = 3;

// Messaging
export const MAX_MESSAGE_LENGTH = 1000;
export const MESSAGES_PER_PAGE = 50;

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      `${FREE_DAILY_SWIPES} daily swipes`,
      'Basic matching',
      'Limited filters',
      '1 super like per day'
    ]
  },
  PREMIUM: {
    name: 'Premium',
    price: 9.99,
    features: [
      'Unlimited swipes',
      'See who likes you',
      'Advanced filters',
      '5 super likes per day',
      'Rewind swipes',
      'Boost profile'
    ]
  },
  PREMIUM_PLUS: {
    name: 'Premium+',
    price: 19.99,
    features: [
      'All Premium features',
      'Priority likes',
      'Free monthly boost',
      'Read receipts',
      'Ad-free experience',
      'Passport (change location)'
    ]
  }
};

// Coins
export const COIN_PACKAGES = [
  { coins: 10, price: 4.99 },
  { coins: 25, price: 9.99 },
  { coins: 50, price: 17.99 },
  { coins: 100, price: 29.99 }
];

export const COIN_COSTS = {
  SUPER_LIKE: 1,
  BOOST_30_MIN: 3,
  REWIND: 1
};

// Moderation
export const SUSPENSION_DURATIONS = [1, 3, 7, 14, 30]; // days
export const REPORT_REASONS = [
  'inappropriate-content',
  'harassment',
  'spam',
  'fake-profile',
  'underage',
  'violence',
  'other'
];

// Regex Patterns
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
export const PASSWORD_MIN_LENGTH = 8;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  INVALID_PHONE: 'Please enter a valid phone number',
  REQUIRED_FIELD: 'This field is required',
  AGE_RESTRICTION: `You must be at least ${MIN_AGE} years old`,
  MIN_PHOTOS: `Please upload at least ${MIN_PHOTOS} photos`,
  MAX_PHOTOS: `You can upload up to ${MAX_PHOTOS} photos`,
  SWIPE_LIMIT: 'Daily swipe limit reached. Upgrade to Premium for unlimited swipes!'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  PHOTO_UPLOADED: 'Photo uploaded successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  EMAIL_SENT: 'Email sent successfully',
  VERIFICATION_SENT: 'Verification code sent'
};

// Routes (for deep linking)
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  DISCOVERY: '/discovery',
  MATCHES: '/matches',
  MESSAGES: '/messages',
  SUBSCRIPTION: '/subscription'
};
