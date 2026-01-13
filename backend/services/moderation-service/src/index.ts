import 'reflect-metadata'; // Required for class-validator decorators
import { createValidator, commonValidations } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import config from './config';
import internalRoutes from './routes/internal.routes';
import moderationRoutes from './routes/moderation.routes';
import { createLogger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
// Note: AWS credentials are optional - will use IAM role if available
const validator = createValidator('moderation-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3012),
  commonValidations.jwtAccessSecret,
  {
    name: 'AWS_ACCESS_KEY_ID',
    required: false,
    description:
      'AWS access key ID for Rekognition/Comprehend moderation (optional - uses IAM role if not set)',
    sensitive: true,
  },
  {
    name: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    description: 'AWS secret access key (optional - uses IAM role if not set)',
    sensitive: true,
  },
  {
    name: 'AWS_REGION',
    required: false,
    description: 'AWS region for Rekognition and Comprehend services',
    defaultValue: 'us-east-1',
  },
]);
validator.validateOrThrow();

// Initialize logger
const logger = createLogger('moderation-service');

// Create Express app
const app: Application = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const checks = {
    awsRekognition: false,
    awsComprehend: false,
  };

  try {
    // Check if AWS credentials are configured (or IAM role available)
    // In production with IAM roles, credentials may not be explicitly set
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      checks.awsRekognition = true;
      checks.awsComprehend = true;
    } else if (process.env.AWS_REGION) {
      // IAM role may be available
      checks.awsRekognition = true;
      checks.awsComprehend = true;
    }
  } catch (e) {
    logger.error('AWS health check failed', e);
  }

  // In degraded mode, service is still healthy but with limited functionality
  const allServicesUp = Object.values(checks).every((v) => v);
  const isDegradedMode = process.env.ALLOW_DEGRADED_MODE === 'true';
  const healthy = allServicesUp || isDegradedMode;

  res.status(healthy ? 200 : 503).json({
    status: allServicesUp ? 'healthy' : isDegradedMode ? 'degraded' : 'unhealthy',
    service: 'moderation-service',
    timestamp: new Date().toISOString(),
    degradedMode: isDegradedMode && !allServicesUp,
    checks,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Content Moderation Service',
    version: '1.0.0',
    status: 'running',
    features: [
      'AI-powered image moderation (AWS Rekognition)',
      'Text content moderation (AWS Comprehend)',
      'Auto-flag/reject inappropriate content',
      'User violation tracking',
      'Auto-suspension/ban system',
      'Moderation queue for manual review',
    ],
  });
});

// API Routes
app.use('/api/v1/moderation', moderationRoutes);

// Internal API Routes (service-to-service)
app.use('/api/v1/internal/moderation', internalRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Moderation Service running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(
    'AWS Services: ' +
      (config.aws.accessKeyId || process.env.AWS_REGION
        ? 'Configured (Rekognition + Comprehend)'
        : 'Not configured')
  );
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
