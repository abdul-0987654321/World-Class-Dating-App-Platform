/**
 * Configuration for Analytics Service
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
  };

  // Redis (for caching and queuing)
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
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
  };

  // External Services
  services: {
    userServiceUrl: string;
    matchingServiceUrl: string;
  };

  // Security
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  serviceApiKey: string;

  // CORS
  corsOrigins: string[];

  // Logging
  logLevel: string;

  // Monitoring
  monitoring?: {
    appInsightsConnectionString?: string;
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
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '7', 10),
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
  },

  services: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://localhost:3009',
  },

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret-key-min-32-chars',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key-min-32-chars',
  serviceApiKey: process.env.SERVICE_API_KEY || 'your-internal-service-api-key',

  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  logLevel: process.env.LOG_LEVEL || 'info',

  monitoring: {
    appInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
};

export default config;
