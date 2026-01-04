/**
 * Type definitions for User Service
 */

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
        role?: 'user' | 'admin' | 'moderator' | 'support';
      };
    }
  }
}

export {};
