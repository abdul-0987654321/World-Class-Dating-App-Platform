/**
 * Relationship Progression Service
 * Relationship milestones, progression tracking, and shared experiences
 */

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { initializeDatabase, closeDatabase } from './infrastructure/database/db-client';
import progressionRoutes from './api/routes/progression.routes';

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
    service: 'relationship-progression-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Routes
// ============================================================================

app.use('/api/v1/progression', progressionRoutes);

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

// 404 handler
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
    // Initialize database
    await initializeDatabase();

    // Start server
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Relationship Progression Service                         ║
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

// Graceful shutdown
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
