import 'reflect-metadata';
import { createLogger } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import verificationRoutes from './api/routes/verification.routes';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('api-gateway');

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());

// SECURITY: CORS configuration - Always include production domains as fallback
const isProduction = process.env.NODE_ENV === 'production';
const defaultOrigins = isProduction
  ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
  : ['http://localhost:5173', 'http://localhost:3000'];
const allowedOrigins = process.env.CORS_ORIGINS?.split(',').filter(Boolean) || defaultOrigins;
if (process.env.CORS_ORIGINS === undefined && isProduction) {
  logger.warn('CORS_ORIGINS not explicitly set in production, using default production domains.');
}
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Check if origin is in allowed list
      if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
        // Development mode without explicit origins - allow all
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const checks: Record<string, boolean> = {
    gateway: true, // API Gateway itself is running
  };

  // Check downstream service URLs are configured
  const serviceUrls = {
    user: process.env.USER_SERVICE_URL,
    auth: process.env.AUTH_SERVICE_URL,
    matching: process.env.MATCHING_SERVICE_URL,
    messaging: process.env.MESSAGING_SERVICE_URL,
    media: process.env.MEDIA_SERVICE_URL,
    payment: process.env.PAYMENT_SERVICE_URL,
    notification: process.env.NOTIFICATION_SERVICE_URL,
  };

  // Verify service URLs are configured (not actually calling them to avoid circular dependencies)
  checks.servicesConfigured = Object.values(serviceUrls).every((url) => url && url.length > 0);

  const healthy = Object.values(checks).every((v) => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    checks,
    services: serviceUrls,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral API Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      graphql: '/graphql',
      api: '/api/v1',
    },
  });
});

// API v1 routes placeholder
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    message: 'Flamoral API v1',
    status: 'operational',
    services: {
      user: `${process.env.USER_SERVICE_URL}`,
      matching: `${process.env.MATCHING_SERVICE_URL}`,
      messaging: `${process.env.MESSAGING_SERVICE_URL}`,
      media: `${process.env.MEDIA_SERVICE_URL}`,
      payment: `${process.env.PAYMENT_SERVICE_URL}`,
      notification: `${process.env.NOTIFICATION_SERVICE_URL}`,
    },
  });
});

// Verification routes for deployment validation
app.use('/api/v1/verify', verificationRoutes);

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
