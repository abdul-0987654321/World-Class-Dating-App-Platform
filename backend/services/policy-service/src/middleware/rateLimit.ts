/**
 * Rate Limit Middleware
 * Implements sliding window rate limiting with in-memory storage
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;
}

// In-memory storage for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval to prevent memory leaks
const CLEANUP_INTERVAL = 60000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup(windowMs: number): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.lastRefill > windowMs * 2) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't keep the process alive just for cleanup
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

function getClientIdentifier(req: Request): string {
  // Try to get user ID from authenticated requests
  const userId = (req as any).user?.id || (req as any).user?.userId;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';

  return `ip:${ip}`;
}

export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    keyGenerator = getClientIdentifier,
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    headers = true,
  } = options;

  // Start cleanup process
  startCleanup(windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry) {
      // First request from this client
      entry = {
        tokens: max - 1, // Consume one token for this request
        lastRefill: now,
      };
      rateLimitStore.set(key, entry);

      if (headers) {
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', entry.tokens);
        res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      }

      return next();
    }

    // Calculate tokens to add based on time elapsed
    const elapsed = now - entry.lastRefill;
    const tokensToAdd = Math.floor((elapsed / windowMs) * max);

    if (tokensToAdd > 0) {
      entry.tokens = Math.min(max, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    if (headers) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, entry.tokens));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
    }

    if (entry.tokens <= 0) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((windowMs - elapsed) / 1000);

      if (headers) {
        res.setHeader('Retry-After', retryAfter);
      }

      return res.status(statusCode).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter,
      });
    }

    // Consume a token
    entry.tokens--;

    // Handle skip options
    if (skipFailedRequests || skipSuccessfulRequests) {
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        if (skipFailedRequests && res.statusCode >= 400) {
          entry!.tokens++;
        }
        if (skipSuccessfulRequests && res.statusCode < 400) {
          entry!.tokens++;
        }
        return originalEnd.apply(this, args);
      } as any;
    }

    next();
  };
};

// Export for testing
export const _getRateLimitStore = () => rateLimitStore;
export const _clearRateLimitStore = () => rateLimitStore.clear();
