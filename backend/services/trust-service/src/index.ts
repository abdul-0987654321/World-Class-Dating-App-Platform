/**
 * Trust Service
 * Trust scoring, reputation tracking, and behavioral signals
 */

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { initializeDatabase, closeDatabase } from './infrastructure/database/db-client';
import trustRoutes from './api/routes/trust.routes';

const app = express();

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'trust-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Routes
// ============================================================================

app.use('/api/v1/trust', trustRoutes);

// ============================================================================
// Error Handling
// ============================================================================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// ============================================================================
// Server Startup
// ============================================================================

async function startServer(): Promise<void> {
  try {
    await initializeDatabase();

    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Trust Service                                            ║
║   Port: ${config.port}                                          ║
║   Environment: ${config.nodeEnv.padEnd(38)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

startServer();

export default app;
