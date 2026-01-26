/**
 * Trust Service Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3034', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'flamoral_trust',
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
    safetyServiceUrl: process.env.SAFETY_SERVICE_URL || 'http://localhost:3005',
  },

  trust: {
    // Score weights
    verificationWeight: 0.3,
    behavioralWeight: 0.25,
    communityWeight: 0.2,
    accountAgeWeight: 0.15,
    activityWeight: 0.1,

    // Thresholds
    minScoreForBadge: 75,
    warningThreshold: 40,
    decayDaysInactive: 30,
    decayRate: 0.02,
  },
};

export default config;
