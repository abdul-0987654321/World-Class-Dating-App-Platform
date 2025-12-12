import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@flamoral/shared';

// Import routes
import paymentRoutes from './api/routes/payment.routes';
import webhookRoutes from './api/routes/webhook.routes';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('payment-service');

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3006;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// Start server
app.listen(PORT, () => {
  logger.info(\`Payment Service running on port \${PORT}\`);
  logger.info(\`Environment: \${process.env.NODE_ENV || 'development'}\`);
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
