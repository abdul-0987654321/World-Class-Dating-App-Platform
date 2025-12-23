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
      role?: string;
    };
  }
}
