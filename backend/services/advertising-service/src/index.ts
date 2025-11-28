/**
 * Flamoral Advertising Service
 * AI-powered advertising platform for dating apps
 * Implements 40 features across 4 categories
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import logger from './utils/logger';

// Import routes
import targetingRoutes from './api/routes/targeting.routes';
import creativeRoutes from './api/routes/creative.routes';
import optimizationRoutes from './api/routes/optimization.routes';
import innovationsRoutes from './api/routes/innovations.routes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3009;

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'advertising-service',
    timestamp: new Date().toISOString(),
    features: {
      total: 40,
      categories: [
        'Audience Targeting & Segmentation',
        'AI-Enhanced Ad Creative',
        'Optimization & Performance',
        'Dating-Specific Ad Innovations',
      ],
    },
  });
});

// API Routes
app.use('/api/targeting', targetingRoutes);
app.use('/api/creative', creativeRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/innovations', innovationsRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`
  ╔════════════════════════════════════════════════════════════════════╗
  ║         Flamoral Advertising Service                               ║
  ║         AI-Powered Dating App Advertising Platform                 ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Features: 40 total                                                ║
  ║  - Audience Targeting & Segmentation: 10 features                  ║
  ║  - AI-Enhanced Ad Creative: 10 features                            ║
  ║  - Optimization & Performance: 10 features                         ║
  ║  - Dating-Specific Ad Innovations: 10 features                     ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Server running on port ${PORT}                                      ║
  ╚════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
