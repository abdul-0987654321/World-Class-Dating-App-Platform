import 'reflect-metadata';
import { createLogger } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware';
import { v4 as uuidv4 } from 'uuid';

import verificationRoutes from './api/routes/verification.routes';
import {
  errorHandler,
  notFoundHandler,
  initializeErrorHandlers,
} from './middleware/error-handler.middleware';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('api-gateway');

// Initialize global error handlers
initializeErrorHandlers();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 4000;

// Correlation ID middleware - add to every request
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
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
    maxAge: 86400,
  })
);

// ========================================================================
// PROXY TO USER-SERVICE
// This MUST come BEFORE body parsing middleware so that the raw request
// stream (including multipart/form-data for file uploads) is forwarded
// directly to the user-service without being consumed.
// ========================================================================
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
logger.info(`Configuring proxy to user-service: ${userServiceUrl}`);

const proxyOptions: ProxyOptions = {
  target: userServiceUrl,
  changeOrigin: true,
  // Do NOT rewrite the path - forward /api/v1/* as-is since user-service
  // mounts routes at the same /api/v1/* paths
  ws: false,
  // Timeout settings for long-running requests (file uploads, etc.)
  timeout: 120000, // 2 minutes
  proxyTimeout: 120000,
  // Forward cookies and credentials
  cookieDomainRewrite: '',
  // Preserve the host header for proper routing
  headers: {
    'X-Forwarded-By': 'flamoral-api-gateway',
  },
  on: {
    proxyReq: (proxyReq, req: Request) => {
      // Forward correlation ID if present
      const correlationId = (req as any).correlationId || req.headers['x-correlation-id'];
      if (correlationId) {
        proxyReq.setHeader('X-Correlation-ID', correlationId as string);
      }
      logger.info(`[Proxy] ${req.method} ${req.originalUrl} -> ${userServiceUrl}${req.originalUrl}`);
    },
    proxyRes: (proxyRes, req: Request) => {
      logger.info(`[Proxy] ${req.method} ${req.originalUrl} <- ${proxyRes.statusCode}`);
    },
    error: (err, req: Request, res: Response) => {
      logger.error(`[Proxy] Error proxying ${req.method} ${req.originalUrl}: ${err.message}`);
      // Only send error response if headers haven't been sent yet
      if (res && !res.headersSent) {
        res.status(502).json({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: 'Unable to reach the upstream service. Please try again later.',
            timestamp: new Date().toISOString(),
          },
        });
      }
    },
  },
};

// Mount the proxy for all /api/v1/* routes BEFORE body parsing
// This catches ALL API requests and forwards them to the user-service
app.use('/api/v1', createProxyMiddleware(proxyOptions));

logger.info('Proxy middleware registered for /api/v1/* -> user-service');

// ========================================================================
// END PROXY CONFIGURATION
// ========================================================================

// Body parsing - only for non-proxied routes (health, root, etc.)
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

// Verification routes for deployment validation
app.use('/api/v1/verify', verificationRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`User-service proxy target: ${userServiceUrl}`);
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
