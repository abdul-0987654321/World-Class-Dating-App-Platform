import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Export authenticate as both named export and requireAuth alias
export { authenticate as requireAuth };

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_ACCESS_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, secret) as { userId: string; email: string };
      req.user = {
        id: decoded.userId,
        userId: decoded.userId,
        email: decoded.email,
      };
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
    return;
  }
};
