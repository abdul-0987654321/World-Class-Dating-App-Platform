/**
 * Example: Complete Express App with Logging Middleware
 *
 * This file demonstrates how to properly configure all logging middleware
 * in an Express application.
 */

import express from 'express';
import { correlationId } from '../../shared/middleware/correlation-id';
import { createRequestLogger } from '../../shared/middleware/request-logger';
import { createErrorLogger, createErrorResponseHandler } from '../../shared/middleware/error-logger';
import logger from './src/utils/logger';

const app = express();

// 1. CORRELATION ID MIDDLEWARE (MUST BE FIRST)
app.use(correlationId);

// 2. REQUEST LOGGING MIDDLEWARE
app.use(createRequestLogger({
  logger,
  includeBody: false,           // Set to true to log request bodies
  includeHeaders: false,         // Set to true to log headers
  excludePaths: ['/health', '/ready'], // Don't log health checks
}));

// 3. BODY PARSING
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. YOUR ROUTES
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/users/:id', async (req, res, next) => {
  try {
    // Get correlation ID logger
    const requestLogger = logger.child({
      correlationId: (req as any).correlationId,
    });

    requestLogger.info('Fetching user', { userId: req.params.id });

    // Your business logic here
    const user = await getUserById(req.params.id);

    requestLogger.info('User fetched successfully', {
      userId: req.params.id,
      found: !!user,
    });

    res.json(user);
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// 5. ERROR LOGGING MIDDLEWARE (BEFORE ERROR RESPONSE HANDLER)
app.use(createErrorLogger({
  logger,
  includeStackTrace: process.env.NODE_ENV !== 'production',
}));

// 6. ERROR RESPONSE HANDLER (LAST)
app.use(createErrorResponseHandler({ logger }));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Example helper function
async function getUserById(id: string): Promise<any> {
  // Your implementation
  return { id, name: 'John Doe' };
}
