/**
 * Rate Limit Configuration
 * Defines rate limits for different endpoints and subscription tiers
 */

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PLUS = 'plus',
  PREMIUM = 'premium',
  PREMIUM_PLUS = 'premium_plus',
  ELITE = 'elite',
}

export interface RateLimitRule {
  window: string; // Time window (e.g., '15m', '1h', '24h')
  max: number; // Maximum requests (-1 for unlimited)
}

export interface TieredRateLimitRule {
  [SubscriptionTier.FREE]: RateLimitRule;
  [SubscriptionTier.BASIC]: RateLimitRule;
  [SubscriptionTier.PLUS]: RateLimitRule;
  [SubscriptionTier.PREMIUM]: RateLimitRule;
  [SubscriptionTier.PREMIUM_PLUS]: RateLimitRule;
  [SubscriptionTier.ELITE]: RateLimitRule;
}

/**
 * Comprehensive rate limit configuration
 */
export const RATE_LIMITS = {
  // ==================== Authentication Endpoints ====================
  'POST /auth/login': { window: '15m', max: 5 },
  'POST /auth/register': { window: '1h', max: 3 },
  'POST /auth/forgot-password': { window: '1h', max: 3 },
  'POST /auth/reset-password': { window: '1h', max: 5 },
  'POST /auth/verify-email': { window: '15m', max: 5 },
  'POST /auth/resend-verification': { window: '1h', max: 3 },
  'POST /auth/refresh': { window: '15m', max: 10 },

  // ==================== Swipes (Tiered by Subscription) ====================
  'POST /swipes': {
    [SubscriptionTier.FREE]: { window: '24h', max: 50 },
    [SubscriptionTier.BASIC]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.PLUS]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.PREMIUM]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.PREMIUM_PLUS]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.ELITE]: { window: '24h', max: -1 }, // unlimited
  } as TieredRateLimitRule,

  'POST /likes': {
    [SubscriptionTier.FREE]: { window: '24h', max: 50 },
    [SubscriptionTier.BASIC]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.PLUS]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.PREMIUM]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.PREMIUM_PLUS]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.ELITE]: { window: '24h', max: -1 }, // unlimited
  } as TieredRateLimitRule,

  // ==================== Super Likes (Tiered by Subscription) ====================
  'POST /super-likes': {
    [SubscriptionTier.FREE]: { window: '24h', max: 1 },
    [SubscriptionTier.BASIC]: { window: '24h', max: 5 },
    [SubscriptionTier.PLUS]: { window: '24h', max: 10 },
    [SubscriptionTier.PREMIUM]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.PREMIUM_PLUS]: { window: '24h', max: -1 }, // unlimited
    [SubscriptionTier.ELITE]: { window: '24h', max: -1 }, // unlimited
  } as TieredRateLimitRule,

  // ==================== Messaging Endpoints (Tiered) ====================
  'POST /messages': {
    [SubscriptionTier.FREE]: { window: '1m', max: 20 },
    [SubscriptionTier.BASIC]: { window: '1m', max: 40 },
    [SubscriptionTier.PLUS]: { window: '1m', max: 60 },
    [SubscriptionTier.PREMIUM]: { window: '1m', max: 100 },
    [SubscriptionTier.PREMIUM_PLUS]: { window: '1m', max: 150 },
    [SubscriptionTier.ELITE]: { window: '1m', max: 200 },
  } as TieredRateLimitRule,
  'GET /messages': {
    [SubscriptionTier.FREE]: { window: '1m', max: 30 },
    [SubscriptionTier.BASIC]: { window: '1m', max: 60 },
    [SubscriptionTier.PLUS]: { window: '1m', max: 90 },
    [SubscriptionTier.PREMIUM]: { window: '1m', max: 120 },
    [SubscriptionTier.PREMIUM_PLUS]: { window: '1m', max: 150 },
    [SubscriptionTier.ELITE]: { window: '1m', max: 200 },
  } as TieredRateLimitRule,
  'POST /messages/read': { window: '1m', max: 100 },
  'GET /conversations': {
    [SubscriptionTier.FREE]: { window: '1m', max: 20 },
    [SubscriptionTier.BASIC]: { window: '1m', max: 40 },
    [SubscriptionTier.PLUS]: { window: '1m', max: 60 },
    [SubscriptionTier.PREMIUM]: { window: '1m', max: 100 },
    [SubscriptionTier.PREMIUM_PLUS]: { window: '1m', max: 120 },
    [SubscriptionTier.ELITE]: { window: '1m', max: 150 },
  } as TieredRateLimitRule,
  'POST /conversations': { window: '1m', max: 10 },
  'GET /conversations/:id': { window: '1m', max: 60 },
  'GET /conversations/:id/messages': { window: '1m', max: 60 },

  // ==================== Profile Endpoints ====================
  'PUT /profiles': { window: '1h', max: 10 },
  'POST /profiles/photos': { window: '1h', max: 20 },
  'DELETE /profiles/photos/:id': { window: '1h', max: 20 },
  'PUT /profiles/settings': { window: '15m', max: 30 },

  // ==================== Discovery Endpoints (Tiered) ====================
  'GET /discovery/recommendations': {
    [SubscriptionTier.FREE]: { window: '1m', max: 30 },
    [SubscriptionTier.BASIC]: { window: '1m', max: 60 },
    [SubscriptionTier.PLUS]: { window: '1m', max: 90 },
    [SubscriptionTier.PREMIUM]: { window: '1m', max: 120 },
    [SubscriptionTier.PREMIUM_PLUS]: { window: '1m', max: 150 },
    [SubscriptionTier.ELITE]: { window: '1m', max: 200 },
  } as TieredRateLimitRule,
  'POST /discovery/search': {
    [SubscriptionTier.FREE]: { window: '1m', max: 15 },
    [SubscriptionTier.BASIC]: { window: '1m', max: 30 },
    [SubscriptionTier.PLUS]: { window: '1m', max: 45 },
    [SubscriptionTier.PREMIUM]: { window: '1m', max: 60 },
    [SubscriptionTier.PREMIUM_PLUS]: { window: '1m', max: 90 },
    [SubscriptionTier.ELITE]: { window: '1m', max: 120 },
  } as TieredRateLimitRule,
  'GET /discovery/nearby': {
    [SubscriptionTier.FREE]: { window: '1m', max: 15 },
    [SubscriptionTier.BASIC]: { window: '1m', max: 30 },
    [SubscriptionTier.PLUS]: { window: '1m', max: 45 },
    [SubscriptionTier.PREMIUM]: { window: '1m', max: 60 },
    [SubscriptionTier.PREMIUM_PLUS]: { window: '1m', max: 90 },
    [SubscriptionTier.ELITE]: { window: '1m', max: 120 },
  } as TieredRateLimitRule,
  'GET /discovery/who-liked-me': {
    [SubscriptionTier.FREE]: { window: '1h', max: 0 }, // Premium feature
    [SubscriptionTier.BASIC]: { window: '1m', max: 30 },
    [SubscriptionTier.PLUS]: { window: '1m', max: 60 },
    [SubscriptionTier.PREMIUM]: { window: '1m', max: 90 },
    [SubscriptionTier.PREMIUM_PLUS]: { window: '1m', max: 120 },
    [SubscriptionTier.ELITE]: { window: '1m', max: -1 }, // unlimited
  } as TieredRateLimitRule,

  // ==================== Match Endpoints ====================
  'GET /matches': { window: '1m', max: 60 },
  'DELETE /matches/:id': { window: '1h', max: 20 },
  'POST /matches/:id/unmatch': { window: '1h', max: 20 },

  // ==================== User Endpoints ====================
  'GET /users/me': { window: '1m', max: 120 },
  'PUT /users/me': { window: '15m', max: 20 },
  'GET /users/:id': { window: '1m', max: 60 },
  'DELETE /users/me': { window: '24h', max: 1 }, // Account deletion
  'PUT /users/me/preferences': { window: '15m', max: 20 },
  'PUT /users/me/location': { window: '1m', max: 30 },

  // ==================== Verification Endpoints ====================
  'POST /verification/phone': { window: '1h', max: 5 },
  'POST /verification/phone/verify': { window: '15m', max: 5 },
  'POST /verification/photo': { window: '24h', max: 3 },

  // ==================== Gifts Endpoints (Tiered) ====================
  'POST /gifts/send': {
    [SubscriptionTier.FREE]: { window: '24h', max: 5 },
    [SubscriptionTier.BASIC]: { window: '24h', max: 20 },
    [SubscriptionTier.PLUS]: { window: '24h', max: 50 },
    [SubscriptionTier.PREMIUM]: { window: '24h', max: 100 },
    [SubscriptionTier.PREMIUM_PLUS]: { window: '24h', max: 200 },
    [SubscriptionTier.ELITE]: { window: '24h', max: -1 }, // unlimited
  } as TieredRateLimitRule,
  'GET /gifts/received': { window: '1m', max: 60 },
  'GET /gifts/sent': { window: '1m', max: 60 },

  // ==================== Boost Endpoints (Tiered) ====================
  'POST /boost': {
    [SubscriptionTier.FREE]: { window: '24h', max: 0 }, // Not available for free
    [SubscriptionTier.BASIC]: { window: '30d', max: 1 }, // 1 per month
    [SubscriptionTier.PLUS]: { window: '30d', max: 1 }, // 1 per month
    [SubscriptionTier.PREMIUM]: { window: '30d', max: 2 }, // 2 per month
    [SubscriptionTier.PREMIUM_PLUS]: { window: '30d', max: 4 }, // 4 per month
    [SubscriptionTier.ELITE]: { window: '30d', max: 12 }, // 12 per month
  } as TieredRateLimitRule,

  // ==================== Payment Endpoints ====================
  'POST /payments/subscriptions': { window: '1h', max: 10 },
  'POST /payments/boost': { window: '1h', max: 20 },
  'GET /payments/history': { window: '1m', max: 30 },

  // ==================== Notification Endpoints ====================
  'GET /notifications': { window: '1m', max: 60 },
  'PUT /notifications/:id/read': { window: '1m', max: 100 },
  'PUT /notifications/read-all': { window: '15m', max: 10 },

  // ==================== Moderation Endpoints ====================
  'POST /reports': { window: '1h', max: 10 },
  'POST /blocks': { window: '1h', max: 20 },
  'DELETE /blocks/:id': { window: '1h', max: 20 },

  // ==================== Media Endpoints ====================
  'POST /media/upload': { window: '1h', max: 50 },
  'DELETE /media/:id': { window: '1h', max: 30 },

  // ==================== Analytics Endpoints ====================
  'POST /analytics/events': { window: '1m', max: 100 },
  'GET /analytics/stats': { window: '15m', max: 30 },

  // ==================== Default Rate Limit ====================
  default: { window: '1m', max: 100 },
};

/**
 * DDoS Protection Configuration
 */
export const DDOS_PROTECTION = {
  // Enable/disable DDoS protection (useful for development/testing)
  enabled: process.env.DDOS_PROTECTION_ENABLED !== 'false',

  // IP-based protection
  ip: {
    // Burst protection
    burst: {
      window: '10s', // 10 seconds
      max: 50, // 50 requests in 10 seconds
      blockDuration: '5m', // Block for 5 minutes
    },
    // Sustained traffic protection
    sustained: {
      window: '1m', // 1 minute
      max: 200, // 200 requests per minute
      blockDuration: '15m', // Block for 15 minutes
    },
    // Long-term abuse protection
    hourly: {
      window: '1h', // 1 hour
      max: 5000, // 5000 requests per hour
      blockDuration: '24h', // Block for 24 hours
    },
  },

  // Violation tracking
  violations: {
    // Number of violations before permanent ban
    maxViolations: 10,
    // Time window to track violations
    trackingWindow: '7d', // 7 days
    // Escalating ban durations
    banDurations: ['5m', '30m', '2h', '12h', '24h', '7d', 'permanent'],
  },

  // Request fingerprinting
  fingerprint: {
    enabled: true,
    // Factors to consider for fingerprinting
    factors: ['user-agent', 'accept-language', 'accept-encoding', 'connection'],
  },

  // Whitelist (IPs that bypass DDoS protection)
  whitelist: process.env.RATE_LIMIT_WHITELIST?.split(',') || [],

  // Admin override
  adminOverride: {
    enabled: true,
    secret: process.env.ADMIN_OVERRIDE_SECRET,
  },
};

/**
 * Rate Limit Response Messages
 */
export const RATE_LIMIT_MESSAGES = {
  default: 'Too many requests. Please try again later.',
  auth: 'Too many authentication attempts. Please try again later.',
  swipes: 'Daily swipe limit reached. Upgrade your subscription for more swipes.',
  superLikes: 'Super like limit reached. Upgrade your subscription for more super likes.',
  messages: 'Message rate limit exceeded. Please slow down.',
  boost: 'Boost limit reached. Upgrade your subscription for more boosts.',
  ddos: 'Suspicious activity detected. Your IP has been temporarily blocked.',
};

/**
 * Parse time window string to seconds
 * @param window - Time window string (e.g., '15m', '1h', '24h')
 * @returns Duration in seconds
 */
export function parseTimeWindow(window: string): number {
  const units: { [key: string]: number } = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time window format: ${window}`);
  }

  const [, value, unit] = match;
  return parseInt(value, 10) * units[unit];
}

/**
 * Get rate limit rule for endpoint and subscription tier
 * @param method - HTTP method
 * @param path - Request path
 * @param tier - Subscription tier
 * @returns Rate limit rule
 */
export function getRateLimitRule(
  method: string,
  path: string,
  tier: SubscriptionTier = SubscriptionTier.FREE
): RateLimitRule {
  // Normalize path (remove trailing slash, remove query params)
  const normalizedPath = path.split('?')[0].replace(/\/$/, '');

  // Try exact match
  const exactKey = `${method} ${normalizedPath}`;
  const exactRule = RATE_LIMITS[exactKey];

  if (exactRule) {
    // Check if it's a tiered rule
    if (typeof exactRule === 'object' && tier in exactRule) {
      return (exactRule as any)[tier];
    }
    // Simple rule
    if ('window' in exactRule && 'max' in exactRule) {
      return exactRule as RateLimitRule;
    }
  }

  // Try pattern matching (e.g., /matches/:id)
  for (const [key, rule] of Object.entries(RATE_LIMITS)) {
    if (key === 'default') continue;

    const [keyMethod, keyPath] = key.split(' ');
    if (keyMethod !== method) continue;

    // Convert route pattern to regex
    const pattern = keyPath.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(normalizedPath)) {
      // Check if it's a tiered rule
      if (typeof rule === 'object' && tier in rule) {
        return (rule as any)[tier];
      }
      // Simple rule
      if ('window' in rule && 'max' in rule) {
        return rule as RateLimitRule;
      }
    }
  }

  // Return default rule
  return RATE_LIMITS.default as RateLimitRule;
}

/**
 * Check if IP is whitelisted or is a private/internal IP
 * @param ip - IP address
 * @returns True if whitelisted
 */
export function isWhitelisted(ip: string): boolean {
  // Check explicit whitelist from environment
  if (DDOS_PROTECTION.whitelist.includes(ip)) {
    return true;
  }

  // Allow private/internal IPs (Kubernetes internal traffic)
  const cleanIp = ip.replace('::ffff:', ''); // Remove IPv6 prefix

  // Railway health check IPs and internal networking
  if (
    cleanIp.startsWith('100.64.') || // Railway CGNAT range
    cleanIp.startsWith('100.65.') ||
    cleanIp.startsWith('100.66.') ||
    cleanIp.startsWith('100.67.') ||
    cleanIp.startsWith('100.68.') ||
    cleanIp.startsWith('100.69.') ||
    cleanIp.startsWith('100.70.') ||
    cleanIp.startsWith('100.71.') ||
    cleanIp.startsWith('100.') // Broader Railway/Vercel edge range
  ) {
    return true;
  }

  // Check private IP ranges
  if (
    cleanIp.startsWith('10.') || // 10.0.0.0/8
    cleanIp.startsWith('172.16.') || // 172.16.0.0/12
    cleanIp.startsWith('172.17.') ||
    cleanIp.startsWith('172.18.') ||
    cleanIp.startsWith('172.19.') ||
    cleanIp.startsWith('172.20.') ||
    cleanIp.startsWith('172.21.') ||
    cleanIp.startsWith('172.22.') ||
    cleanIp.startsWith('172.23.') ||
    cleanIp.startsWith('172.24.') ||
    cleanIp.startsWith('172.25.') ||
    cleanIp.startsWith('172.26.') ||
    cleanIp.startsWith('172.27.') ||
    cleanIp.startsWith('172.28.') ||
    cleanIp.startsWith('172.29.') ||
    cleanIp.startsWith('172.30.') ||
    cleanIp.startsWith('172.31.') ||
    cleanIp.startsWith('192.168.') || // 192.168.0.0/16
    cleanIp === '127.0.0.1' || // localhost
    cleanIp === 'localhost'
  ) {
    return true;
  }

  return false;
}

/**
 * Get rate limit message
 * @param endpoint - Endpoint key
 * @returns Rate limit message
 */
export function getRateLimitMessage(endpoint: string): string {
  if (endpoint.includes('/auth/')) return RATE_LIMIT_MESSAGES.auth;
  if (endpoint.includes('/swipes')) return RATE_LIMIT_MESSAGES.swipes;
  if (endpoint.includes('/super-likes')) return RATE_LIMIT_MESSAGES.superLikes;
  if (endpoint.includes('/messages')) return RATE_LIMIT_MESSAGES.messages;
  if (endpoint.includes('/boost')) return RATE_LIMIT_MESSAGES.boost;
  return RATE_LIMIT_MESSAGES.default;
}
