import { createLogger } from '@flamoral/backend-shared';
import Queue from 'bull';
import Redis from 'ioredis';

const logger = createLogger('queue-config');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create Redis client for Bull
export const createRedisClient = (): Redis => {
  const client = new Redis(redisConfig);

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('error', (err) => {
    logger.error('Redis client error', err);
  });

  return client;
};

// Default Bull queue options
export const defaultQueueOptions: Queue.QueueOptions = {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

// Queue names
export enum QueueName {
  IMAGE_PROCESSING = 'image-processing',
  CONTENT_MODERATION = 'content-moderation',
  PHOTO_VERIFICATION = 'photo-verification',
  DEEPFAKE_DETECTION = 'deepfake-detection',
}

// Job priorities
export enum JobPriority {
  LOW = 10,
  NORMAL = 5,
  HIGH = 1,
  CRITICAL = 0,
}
