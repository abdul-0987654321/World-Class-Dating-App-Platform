/**
 * Rate Limit Configuration
 * Defines rate limits for different endpoints and subscription tiers
 */

export enum SubscriptionTier {
  FREE = 'FREE',
  PLUS = 'PLUS',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export interface RateLimitRule {
  window: string; // Time window (e.g., '15m', '1h', '24h')
  max: number; // Maximum requests (-1 for unlimited)
}

export interface TieredRateLimitRule {
  [SubscriptionTier.FREE]: RateLimitRule;
  [SubscriptionTier.PLUS]: RateLimitRule;
  [SubscriptionTier.GOLD]: RateLimitRule;
  [SubscriptionTier.PLATINUM]: RateLimitRule;
  [SubscriptionTier.DIAMOND]: RateLimitRule;
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
    [SubscriptionTier.PLUS]: { window: '24h', max: 100 },
    [SubscriptionTier.GOLD]: { window: '24h', max: 200 },
    [SubscriptionTier.PLATINUM]: { window: '24h', max: 500 },
    [SubscriptionTier.DIAMOND]: { window: '24h', max: -1 }, // unlimited
  } as TieredRateLimitRule,

  'POST /likes': {
    [SubscriptionTier.FREE]: { window: '24h', max: 100 },
    [SubscriptionTier.PLUS]: { window: '24h', max: 200 },
    [SubscriptionTier.GOLD]: { window: '24h', max: 400 },
    [SubscriptionTier.PLATINUM]: { window: '24h', max: 1000 },
    [SubscriptionTier.DIAMOND]: { window: '24h', max: -1 }, // unlimited
  } as TieredRateLimitRule,

  // ==================== Super Likes (Tiered by Subscription) ====================
  'POST /super-likes': {
    [SubscriptionTier.FREE]: { window: '24h', max: 1 },
    [SubscriptionTier.PLUS]: { window: '24h', max: 5 },
    [SubscriptionTier.GOLD]: { window: '24h', max: 10 },
    [SubscriptionTier.PLATINUM]: { window: '24h', max: 20 },
    [SubscriptionTier.DIAMOND]: { window: '24h', max: 50 },
  } as TieredRateLimitRule,

  // ==================== Messaging Endpoints ====================
  'POST /messages': { window: '1m', max: 30 },
  'GET /messages': { window: '1m', max: 60 },
  'POST /messages/read': { window: '1m', max: 100 },
  'GET /conversations': { window: '1m', max: 30 },

  // ==================== Profile Endpoints ====================
  'PUT /profiles': { window: '1h', max: 10 },
  'POST /profiles/photos': { window: '1h', max: 20 },
  'DELETE /profiles/photos/:id': { window: '1h', max: 20 },
  'PUT /profiles/settings': { window: '15m', max: 30 },

  // ==================== Discovery Endpoints ====================
  'GET /discovery/recommendations': { window: '1m', max: 60 },
  'POST /discovery/search': { window: '1m', max: 30 },
  'GET /discovery/nearby': { window: '1m', max: 30 },

  // ==================== Match Endpoints ====================
  'GET /matches': { window: '1m', max: 60 },
  'DELETE /matches/:id': { window: '1h', max: 20 },

  // ==================== Boost Endpoints (Tiered) ====================
  'POST /boost': {
    [SubscriptionTier.FREE]: { window: '24h', max: 0 }, // Not available for free
    [SubscriptionTier.PLUS]: { window: '24h', max: 1 },
    [SubscriptionTier.GOLD]: { window: '24h', max: 2 },
    [SubscriptionTier.PLATINUM]: { window: '24h', max: 5 },
    [SubscriptionTier.DIAMOND]: { window: '24h', max: 10 },
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
    factors: [
      'user-agent',
      'accept-language',
      'accept-encoding',
      'connection',
    ],
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
  tier: SubscriptionTier = SubscriptionTier.FREE,
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
    const pattern = keyPath.replace(/:[^\/]+/g, '[^/]+');
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
 * Check if IP is whitelisted
 * @param ip - IP address
 * @returns True if whitelisted
 */
export function isWhitelisted(ip: string): boolean {
  return DDOS_PROTECTION.whitelist.includes(ip);
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
