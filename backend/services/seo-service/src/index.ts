/**
 * Flamoral SEO Service
 * Comprehensive SEO management and optimization service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import seoRoutes from './api/routes/seo.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;
const SERVICE_NAME = 'seo-service';

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/seo', seoRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🔍 Flamoral SEO Service                              ║
║                                                        ║
║   Port: ${PORT}                                          ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║                                                        ║
║   Endpoints:                                           ║
║   - GET  /health              Health check             ║
║   - GET  /api/seo/sitemap.xml Generated sitemap        ║
║   - GET  /api/seo/robots.txt  Robots.txt               ║
║   - POST /api/seo/audit       Run SEO audit            ║
║   - *    /api/seo/redirects   Redirect management      ║
║   - *    /api/seo/vitals      Core Web Vitals          ║
║   - GET  /api/seo/health      SEO health score         ║
║   - *    /api/seo/schema      Schema markup            ║
║   - *    /api/seo/keywords    Keyword analysis         ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;

// Re-export services for external use
export { sitemapService } from './services/sitemap.service';
export { seoAuditService } from './services/seo-audit.service';
export { redirectService } from './services/redirect.service';
export { coreWebVitalsService, seoHealthScoreService } from './services/core-web-vitals.service';
export { aiSeoService } from './services/ai-seo.service';
export * from './integrations/marketing-pixels';
export * from './types';
