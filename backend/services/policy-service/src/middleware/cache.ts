/**
 * Cache Middleware
 */

import { Request, Response, NextFunction } from 'express';

export const cacheMiddleware = (options: { ttl: number }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implement caching logic
    // For now, just pass through
    next();
  };
};
