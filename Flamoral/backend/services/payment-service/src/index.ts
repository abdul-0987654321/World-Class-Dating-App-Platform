import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@flamoral/shared';
import { PaymentService } from './domain/services/payment.service';
import { testConnection, closeConnection } from './infrastructure/database/connection';
import paymentConfig from './config/payment.config';

// Import routes
import paymentRoutes from './api/routes/payment.routes';
import webhookRoutes from './api/routes/webhook.routes';

// Load environment variables
dotenv.config();

// Initialize payment configuration
try {
  paymentConfig.initialize();
} catch (error: any) {
  console.error('Failed to initialize payment configuration:', error.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Initialize logger
const logger = createLogger('payment-service');

// Validate environment variables
const validateEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required variables
  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];

  required.forEach(key => {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate environment
const envValidation = validateEnvironment();
if (!envValidation.valid) {
  logger.error('Environment configuration errors:');
  envValidation.errors.forEach((error) => logger.error(`  - ${error}`));
  if (process.env.NODE_ENV === 'production') {
    logger.error('Cannot start payment service without valid environment configuration');
    process.exit(1);
  } else {
    logger.warn('Running in development mode with incomplete environment configuration');
  }
}

// Validate Stripe configuration
const stripeValidation = PaymentService.validateConfiguration();
if (!stripeValidation.valid) {
  logger.error('Stripe configuration errors:');
  stripeValidation.errors.forEach((error) => logger.error(`  - ${error}`));
  if (process.env.NODE_ENV === 'production') {
    logger.error('Cannot start payment service without valid Stripe configuration');
    process.exit(1);
  } else {
    logger.warn('Running in development mode with incomplete Stripe configuration');
  }
} else {
  const status = PaymentService.getConfigurationStatus();
  logger.info(`Stripe configured in ${status.mode} mode (API version: ${status.apiVersion})`);
  logger.info(`Environment: ${status.environment}`);

  // Log sanitized configuration
  const sanitizedConfig = paymentConfig.getSanitizedConfig();
  logger.info('Payment service configuration:', {
    currency: sanitizedConfig.currency,
    trialPeriodDays: sanitizedConfig.trialPeriodDays,
    gracePeriodDays: sanitizedConfig.gracePeriodDays,
    features: sanitizedConfig.features,
  });
}

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3006;

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4000'
];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'js.stripe.com'],
      frameSrc: ["'self'", 'js.stripe.com'],
      connectSrc: ["'self'", 'api.stripe.com'],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours
}));

// Note: Webhook routes must be mounted BEFORE express.json() middleware
// because they need access to the raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

// JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount payment routes
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Payment Service',
    version: '1.0.0',
    status: 'running',
  });
});

// Error handling middleware (must be last)
import { errorHandler, notFoundHandler, requestTimeout } from './api/middleware/error-handler.middleware';

// Add request timeout
app.use(requestTimeout(30000)); // 30 seconds

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server with database connection check
const startServer = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('Failed to connect to database');
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      } else {
        logger.warn('Continuing without database connection in development mode');
      }
    } else {
      logger.info('Database connection successful');
    }

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Payment Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');

  try {
    await closeConnection();
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown();
});

// Start the server
startServer();

export default app;
