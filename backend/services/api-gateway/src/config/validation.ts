import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(4000),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: Joi.string().default('7d'),

  // Service URLs
  USER_SERVICE_URL: Joi.string().uri().default('http://localhost:3001'),
  PROFILE_SERVICE_URL: Joi.string().uri().default('http://localhost:3002'),
  MATCHING_SERVICE_URL: Joi.string().uri().default('http://localhost:3003'),
  MESSAGING_SERVICE_URL: Joi.string().uri().default('http://localhost:3004'),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().default('http://localhost:3005'),
  MEDIA_SERVICE_URL: Joi.string().uri().default('http://localhost:3006'),
  PAYMENT_SERVICE_URL: Joi.string().uri().default('http://localhost:3007'),
  MODERATION_SERVICE_URL: Joi.string().uri().default('http://localhost:3008'),
  AI_SERVICE_URL: Joi.string().uri().default('http://localhost:8000'),

  // Redis - SECURITY: No defaults for host/port in production (enforced in configuration.ts)
  REDIS_HOST: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().default('localhost'),
  }),
  REDIS_PORT: Joi.alternatives().try(Joi.number(), Joi.string().pattern(/^\d+$/)).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.alternatives().try(Joi.number(), Joi.string().pattern(/^\d+$/)).default(6379),
  }),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.alternatives().try(Joi.number(), Joi.string().pattern(/^\d+$/)).default(0),
  REDIS_URL: Joi.string().optional().allow(''),

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
});
