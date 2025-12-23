import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@flamoral/backend-shared';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('api-gateway');

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
}));
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
  checks.servicesConfigured = Object.values(serviceUrls).every(url => url && url.length > 0);

  const healthy = Object.values(checks).every(v => v);
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
