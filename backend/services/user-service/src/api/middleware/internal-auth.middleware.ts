import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to authenticate internal service-to-service requests
 */
export const authenticateInternal = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const serviceKey = req.headers['x-service-key'];
  const expectedKey = process.env.SERVICE_API_KEY || 'internal-service-key';

  if (!serviceKey || serviceKey !== expectedKey) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid service credentials',
    });
  }

  return next();
};
