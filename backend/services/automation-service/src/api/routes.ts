import { Router } from 'express';

const router = Router();

// Placeholder for existing API routes
// This file integrates with the existing automation service routes

router.get('/status', (req, res) => {
  res.json({
    message: 'Automation Service API Routes',
    version: '1.0.0',
  });
});

export default router;
