/**
 * Express Request Extension
 * Extends Express Request type with user property from auth middleware
 */

declare namespace Express {
  interface Request {
    user?: {
      id: string;
      userId: string;
      email: string;
      role?: 'user' | 'moderator' | 'admin' | 'support';
    };
    correlationId?: string;
    serviceId?: string;
    requestId?: string;
  }
}
