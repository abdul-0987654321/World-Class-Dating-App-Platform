/**
 * Configuration for Analytics Service
 * Includes PostgreSQL, Redis, and TimescaleDB configurations
 */

import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;

  // Database (PostgreSQL)
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolMin: number;
    poolMax: number;
    enableTimescaleDB: boolean;
    connectionTimeout: number;
    queryTimeout: number;
    idleTimeout: number;
    ssl: boolean | {
      rejectUnauthorized: boolean;
      ca?: string;
    };
  };

  // Redis (for caching and queuing)
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetriesPerRequest: number;
    enableOfflineQueue: boolean;
  };

  // Event Queue
  eventQueue: {
    type: 'redis' | 'kafka' | 'rabbitmq';
    kafkaBrokers?: string[];
    rabbitmqUrl?: string;
  };

  // Analytics Configuration
  analytics: {
    eventBatchSize: number;
    eventFlushIntervalMs: number;
    dataRetentionDays: number;
    enableRealTimeAggregation: boolean;
  };

  // External Services
  services: {
    userServiceUrl: string;
    matchingServiceUrl: string;
    paymentServiceUrl: string;
  };

  // Security
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  serviceApiKey: string;

  // CORS
  corsOrigins: string[];
  corsCredentials: boolean;

  // Logging
  logLevel: string;

  // Monitoring
  monitoring?: {
    appInsightsConnectionString?: string;
    enableTelemetry: boolean;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3007', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'flamoral_analytics',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    enableTimescaleDB: process.env.ENABLE_TIMESCALEDB === 'true',
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    ssl: process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          ca: process.env.DB_SSL_CA,
        }
      : false,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '7', 10),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false',
  },

  eventQueue: {
    type: (process.env.EVENT_QUEUE_TYPE as 'redis' | 'kafka' | 'rabbitmq') || 'redis',
    kafkaBrokers: process.env.KAFKA_BROKERS?.split(','),
    rabbitmqUrl: process.env.RABBITMQ_URL,
  },

  analytics: {
    eventBatchSize: parseInt(process.env.EVENT_BATCH_SIZE || '1000', 10),
    eventFlushIntervalMs: parseInt(process.env.EVENT_FLUSH_INTERVAL_MS || '5000', 10),
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '365', 10),
    enableRealTimeAggregation: process.env.ENABLE_REALTIME_AGGREGATION !== 'false',
  },

  services: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://localhost:3009',
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  },

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret-key-min-32-chars',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key-min-32-chars',
  serviceApiKey: process.env.SERVICE_API_KEY || 'your-internal-service-api-key',

  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  corsCredentials: process.env.CORS_CREDENTIALS !== 'false',

  logLevel: process.env.LOG_LEVEL || 'info',

  monitoring: {
    appInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    enableTelemetry: process.env.ENABLE_TELEMETRY !== 'false',
  },
};

export default config;
