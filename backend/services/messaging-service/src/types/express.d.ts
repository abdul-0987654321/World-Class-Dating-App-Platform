/**
 * Express type declarations
 * Extends Express Request to include user property from auth middleware
 */

declare namespace Express {
  interface User {
    userId: string;
    email: string;
    subscriptionTier?: string;
    subscriptionStatus?: string;
    roles?: string[];
  }

  interface Request {
    user?: User;
  }
}
