/**
 * Relationship Progression Service Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3033', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'flamoral_progression',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwt: {
    publicKey: process.env.JWT_PUBLIC_KEY || '',
    issuer: process.env.JWT_ISSUER || 'flamoral-auth',
    audience: process.env.JWT_AUDIENCE || 'flamoral-api',
  },

  services: {
    serviceKey: process.env.SERVICE_KEY || 'dev-service-key',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://localhost:3004',
  },

  milestones: {
    maxCustomMilestones: 20,
    celebrationCooldownHours: 24,
  },
};

export default config;
