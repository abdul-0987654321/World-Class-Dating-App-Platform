/**
 * Flamoral Advertising Service
 * AI-powered advertising platform for dating apps
 * Implements 40 features across 4 categories
 */

import { createValidator, commonValidations } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

import adRevenueRoutes from './api/routes/ad-revenue.routes';
import creativeRoutes from './api/routes/creative.routes';
import innovationsRoutes from './api/routes/innovations.routes';
import optimizationRoutes from './api/routes/optimization.routes';
import targetingRoutes from './api/routes/targeting.routes';
import logger from './utils/logger';

// Import routes

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('advertising-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3025),
  commonValidations.jwtAccessSecret,
  commonValidations.databaseUrl,
  commonValidations.dbHost,
  commonValidations.dbPort,
  commonValidations.dbPassword,
  {
    name: 'DB_NAME',
    required: true,
    description: 'PostgreSQL database name for advertising data',
  },
  {
    name: 'DB_USER',
    required: true,
    description: 'PostgreSQL database user',
  },
  {
    name: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API key for AI-powered ad creative generation',
    minLength: 20,
    sensitive: true,
  },
]);
validator.validateOrThrow();

// Ensure either DATABASE_URL or DB_HOST+DB_PASSWORD is set
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error('[advertising-service] Either DATABASE_URL or DB_HOST + DB_PASSWORD must be set');
}

const app = express();

// CORS allowed origins - production domains required
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || (
  isProduction
    ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']
);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Service-Key',
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-CSRF-Token',
      'x-csrf-token',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-CSRF-Token',
    ],
    maxAge: 86400, // 24 hours - cache preflight
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const PORT = process.env.PORT || 3025;

// Health check
app.get('/health', async (req, res) => {
  const checks = {
    openai: false,
  };

  try {
    // Check OpenAI API key is configured
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0) {
      checks.openai = true;
    }
  } catch (e) {
    logger.error('OpenAI health check failed', e);
  }

  const healthy = Object.values(checks).every((v) => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'advertising-service',
    timestamp: new Date().toISOString(),
    checks,
    features: {
      total: 40,
      categories: [
        'Audience Targeting & Segmentation',
        'AI-Enhanced Ad Creative',
        'Optimization & Performance',
        'Dating-Specific Ad Innovations',
      ],
    },
  });
});

// API Routes
app.use('/api/v1/targeting', targetingRoutes);
app.use('/api/v1/creative', creativeRoutes);
app.use('/api/v1/optimization', optimizationRoutes);
app.use('/api/v1/innovations', innovationsRoutes);
app.use('/api/v1/ads', adRevenueRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`
  ╔════════════════════════════════════════════════════════════════════╗
  ║         Flamoral Advertising Service                               ║
  ║         AI-Powered Dating App Advertising Platform                 ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Features: 43 total                                                ║
  ║  - Audience Targeting & Segmentation: 10 features                  ║
  ║  - AI-Enhanced Ad Creative: 10 features                            ║
  ║  - Optimization & Performance: 10 features                         ║
  ║  - Dating-Specific Ad Innovations: 10 features                     ║
  ║  - Ad Revenue (Banner, Interstitial, Rewarded): 3 features         ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Server running on port ${PORT}                                      ║
  ╚════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
