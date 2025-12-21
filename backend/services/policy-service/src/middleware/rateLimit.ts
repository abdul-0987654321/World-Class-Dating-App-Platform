/**
 * Rate Limit Middleware
 */

import { Request, Response, NextFunction } from 'express';

export const rateLimitMiddleware = (options: { windowMs: number; max: number }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implement rate limiting logic
    // For now, just pass through
    next();
  };
};
