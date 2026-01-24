/**
 * Policy Service - Entry Point
 * Serves legal policies, terms of service, and privacy policies
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PolicyController } from './controllers/policyController';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3028;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Initialize controller
const policyController = new PolicyController();

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'policy-service',
    timestamp: new Date().toISOString(),
  });
});

// Get supported regions
app.get('/api/v1/policies/regions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const regions = await policyController.getSupportedRegions();
    res.json({ success: true, data: regions });
  } catch (error) {
    next(error);
  }
});

// Get available policy types
app.get('/api/v1/policies/types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await policyController.getPolicyTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// Get policy by type
app.get('/api/v1/policies/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const { region = 'GLOBAL', language = 'en', format = 'json', version } = req.query;

    const policy = await policyController.getPolicy({
      policyType: type,
      region: region as string,
      language: language as string,
      format: format as string,
      version: version as string | undefined,
    });

    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

// Get policy summary
app.get(
  '/api/v1/policies/:type/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      const { region = 'GLOBAL', language = 'en' } = req.query;

      const summary = await policyController.getPolicySummary({
        policyType: type,
        region: region as string,
        language: language as string,
      });

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
);

// Validate policy content
app.post('/api/v1/policies/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, region, policyType } = req.body;

    if (!content || !policyType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: content, policyType',
      });
    }

    const validation = await policyController.validatePolicy({
      content,
      region: region || 'GLOBAL',
      policyType,
    });

    res.json({ success: true, data: validation });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Policy service error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Policy service running on port ${PORT}`);
});

export default app;
