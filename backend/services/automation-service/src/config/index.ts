import dotenv from 'dotenv';

dotenv.config();

export const config = {
  service: {
    name: process.env.SERVICE_NAME || 'automation-service',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3013', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'flamoral_automation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '7', 10),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'flamoral_events',
    queues: {
      match: process.env.RABBITMQ_MATCH_QUEUE || 'match_events',
      message: process.env.RABBITMQ_MESSAGE_QUEUE || 'message_events',
      user: process.env.RABBITMQ_USER_QUEUE || 'user_events',
    },
  },
  services: {
    messaging: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3003',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    matching: process.env.MATCHING_SERVICE_URL || 'http://localhost:3002',
    ai: process.env.AI_SERVICE_URL || 'http://localhost:3009',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
  },
  serviceAuth: {
    apiKey: process.env.SERVICE_API_KEY || '',
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
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
    matchWarmupIntervals: process.env.MATCH_WARMUP_INTERVALS?.split(',') || ['1h', '6h', '24h', '72h'],
  },
  rateLimiting: {
    automationPerUserDaily: parseInt(process.env.AUTOMATION_RATE_LIMIT_PER_USER_DAILY || '10', 10),
    scheduledMessagePerUserDaily: parseInt(process.env.SCHEDULED_MESSAGE_RATE_LIMIT_PER_USER_DAILY || '5', 10),
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
