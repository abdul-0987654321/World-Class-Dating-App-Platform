/**
 * Flamoral Advertising Service
 * AI-powered advertising platform for dating apps
 * Implements 40 features across 4 categories
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import logger from './utils/logger';

// Import routes
import targetingRoutes from './api/routes/targeting.routes';
import creativeRoutes from './api/routes/creative.routes';
import optimizationRoutes from './api/routes/optimization.routes';
import innovationsRoutes from './api/routes/innovations.routes';
import { createValidator, commonValidations } from '@flamoral/shared';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('advertising-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3011),
  commonValidations.jwtAccessSecret,
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

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = process.env.PORT || 3010;

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

  const healthy = Object.values(checks).every(v => v);
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
  ║  Features: 40 total                                                ║
  ║  - Audience Targeting & Segmentation: 10 features                  ║
  ║  - AI-Enhanced Ad Creative: 10 features                            ║
  ║  - Optimization & Performance: 10 features                         ║
  ║  - Dating-Specific Ad Innovations: 10 features                     ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Server running on port ${PORT}                                      ║
  ╚════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
