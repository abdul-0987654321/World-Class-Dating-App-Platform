import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@connectsphere/shared';

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
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'ConnectSphere API Gateway',
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
    message: 'ConnectSphere API v1',
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
