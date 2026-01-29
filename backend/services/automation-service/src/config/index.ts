import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Helper to require configuration in production
function requireInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) {
    throw new Error(`${name} environment variable is required in production`);
  }
  return devDefault;
}

export const config = {
  service: {
    name: process.env.SERVICE_NAME || 'automation-service',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3013', 10),
  },
  jwt: {
    accessSecret: requireInProduction('JWT_ACCESS_SECRET', 'dev-jwt-secret-not-for-production'),
  },
  database: (() => {
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        database: url.pathname.slice(1),
        user: url.username,
        password: decodeURIComponent(url.password),
        ssl: process.env.DB_SSL !== 'false',
        pool: {
          min: parseInt(process.env.DB_POOL_MIN || '2', 10),
          max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        },
      };
    }
    return {
      host: requireInProduction('DB_HOST', 'localhost'),
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'flamoral_automation',
      user: process.env.DB_USER || 'postgres',
      password: requireInProduction('DB_PASSWORD', ''),
      ssl: isProduction ? true : process.env.DB_SSL === 'true',
      pool: {
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      },
    };
  })(),
  redis: (() => {
    if (process.env.REDIS_URL) {
      const url = new URL(process.env.REDIS_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password ? decodeURIComponent(url.password) : undefined,
        db: parseInt(process.env.REDIS_DB || '7', 10),
      };
    }
    return {
      host: requireInProduction('REDIS_HOST', 'localhost'),
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '7', 10),
    };
  })(),
  rabbitmq: {
    // Security: Validate AMQPS in production, fail-safe to secure default
    url: (() => {
      const url = process.env.RABBITMQ_URL;

      if (isProduction && url && !url.startsWith('amqps://')) {
        throw new Error('RABBITMQ_URL must use amqps:// (TLS) in production');
      }

      if (isProduction && !url) {
        throw new Error('RABBITMQ_URL environment variable is required in production');
      }

      // Default to localhost only in development
      return url || 'amqp://localhost:5672';
    })(),
    exchange: process.env.RABBITMQ_EXCHANGE || 'flamoral_events',
    queues: {
      match: process.env.RABBITMQ_MATCH_QUEUE || 'match_events',
      message: process.env.RABBITMQ_MESSAGE_QUEUE || 'message_events',
      user: process.env.RABBITMQ_USER_QUEUE || 'user_events',
    },
  },
  services: {
    messaging: requireInProduction('MESSAGING_SERVICE_URL', 'http://localhost:3003'),
    notification: requireInProduction('NOTIFICATION_SERVICE_URL', 'http://localhost:3008'),
    user: requireInProduction('USER_SERVICE_URL', 'http://localhost:3001'),
    matching: requireInProduction('MATCHING_SERVICE_URL', 'http://localhost:3002'),
    ai: requireInProduction('AI_SERVICE_URL', 'http://localhost:3009'),
    analytics: requireInProduction('ANALYTICS_SERVICE_URL', 'http://localhost:3007'),
  },
  serviceAuth: {
    apiKey: requireInProduction('SERVICE_API_KEY', ''),
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || (
      isProduction
        ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
        : ['http://localhost:3000', 'http://localhost:5173']
    ),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  },
  automation: {
    enableAutoDmFlows: process.env.ENABLE_AUTO_DM_FLOWS === 'true',
    enableIcebreakerSuggestions: process.env.ENABLE_ICEBREAKER_SUGGESTIONS === 'true',
    enableGhostingDetection: process.env.ENABLE_GHOSTING_DETECTION === 'true',
    enableScheduledMessages: process.env.ENABLE_SCHEDULED_MESSAGES === 'true',
    enableAiReplyAssistant: process.env.ENABLE_AI_REPLY_ASSISTANT === 'true',
  },
  workflow: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '50', 10),
    timeoutMs: parseInt(process.env.WORKFLOW_TIMEOUT_MS || '30000', 10),
    retryAttempts: parseInt(process.env.WORKFLOW_RETRY_ATTEMPTS || '3', 10),
  },
  icebreaker: {
    cacheTtlHours: parseInt(process.env.ICEBREAKER_CACHE_TTL_HOURS || '24', 10),
    minLength: parseInt(process.env.ICEBREAKER_MIN_LENGTH || '20', 10),
    maxLength: parseInt(process.env.ICEBREAKER_MAX_LENGTH || '150', 10),
  },
  ghosting: {
    thresholdHours: parseInt(process.env.GHOSTING_THRESHOLD_HOURS || '48', 10),
    reEngagementDelayHours: parseInt(process.env.RE_ENGAGEMENT_DELAY_HOURS || '72', 10),
    maxReEngagementAttempts: parseInt(process.env.MAX_RE_ENGAGEMENT_ATTEMPTS || '2', 10),
  },
  scheduledMessaging: {
    dailyEngagementTime: process.env.DAILY_ENGAGEMENT_TIME || '09:00',
    weeklyDigestDay: process.env.WEEKLY_DIGEST_DAY || 'monday',
    weeklyDigestTime: process.env.WEEKLY_DIGEST_TIME || '10:00',
    matchWarmupEnabled: process.env.MATCH_WARMUP_SEQUENCE_ENABLED === 'true',
    matchWarmupIntervals: process.env.MATCH_WARMUP_INTERVALS?.split(',') || [
      '1h',
      '6h',
      '24h',
      '72h',
    ],
  },
  rateLimiting: {
    automationPerUserDaily: parseInt(process.env.AUTOMATION_RATE_LIMIT_PER_USER_DAILY || '10', 10),
    scheduledMessagePerUserDaily: parseInt(
      process.env.SCHEDULED_MESSAGE_RATE_LIMIT_PER_USER_DAILY || '5',
      10
    ),
    aiRequestPerUserHourly: parseInt(process.env.AI_REQUEST_RATE_LIMIT_PER_USER_HOURLY || '20', 10),
  },
  bull: {
    jobAttempts: parseInt(process.env.BULL_JOB_ATTEMPTS || '3', 10),
    jobBackoffDelayMs: parseInt(process.env.BULL_JOB_BACKOFF_DELAY_MS || '5000', 10),
    removeOnComplete: process.env.BULL_JOB_REMOVE_ON_COMPLETE === 'true',
    removeOnFail: process.env.BULL_JOB_REMOVE_ON_FAIL === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  analytics: {
    trackEvents: process.env.TRACK_AUTOMATION_EVENTS === 'true',
  },
};

export default config;
