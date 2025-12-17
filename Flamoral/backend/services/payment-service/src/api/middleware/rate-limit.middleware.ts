import { Request, Response, NextFunction } from 'express';
import paymentConfig from '../../config/payment.config';
import logger from '../../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate Limiting Middleware
 * Implements per-user rate limiting for payment endpoints
 */
class RateLimiter {
  private requestCounts: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get rate limiter for payment endpoints
   */
  paymentLimiter() {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = paymentConfig.getConfig();
      const userId = this.getUserId(req);
      const key = `payment:${userId}`;

      const result = this.checkRateLimit(
        key,
        config.rateLimit.paymentMaxRequests,
        config.rateLimit.windowMs
      );

      if (!result.allowed) {
        logger.warn(`Payment rate limit exceeded for user ${userId}`);
        return res.status(429).json({
          success: false,
          message: 'Too many payment requests. Please try again later.',
          retryAfter: Math.ceil(result.resetIn / 1000),
        });
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.rateLimit.paymentMaxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      next();
    };
  }

  /**
   * Get rate limiter for standard endpoints
   */
  standardLimiter() {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = paymentConfig.getConfig();
      const userId = this.getUserId(req);
      const key = `standard:${userId}`;

      const result = this.checkRateLimit(
        key,
        config.rateLimit.standardMaxRequests,
        config.rateLimit.windowMs
      );

      if (!result.allowed) {
        logger.warn(`Standard rate limit exceeded for user ${userId}`);
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(result.resetIn / 1000),
        });
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.rateLimit.standardMaxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      next();
    };
  }

  /**
   * Check rate limit for a key
   */
  private checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    resetIn: number;
  } {
    const now = Date.now();
    const entry = this.requestCounts.get(key);

    // No entry or expired entry
    if (!entry || now >= entry.resetTime) {
      const resetTime = now + windowMs;
      this.requestCounts.set(key, {
        count: 1,
        resetTime,
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
        resetIn: windowMs,
      };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        resetIn: entry.resetTime - now,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
      resetIn: entry.resetTime - now,
    };
  }

  /**
   * Get user ID from request
   */
  private getUserId(req: Request): string {
    // Try to get user ID from auth token
    const user = (req as any).user;
    if (user && user.id) {
      return user.id;
    }

    // Try to get from body
    if (req.body && req.body.userId) {
      return req.body.userId;
    }

    // Fall back to IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.requestCounts.entries()) {
      if (now >= entry.resetTime) {
        this.requestCounts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Reset rate limit for a user (admin use)
   */
  resetUserLimit(userId: string): void {
    this.requestCounts.delete(`payment:${userId}`);
    this.requestCounts.delete(`standard:${userId}`);
    logger.info(`Rate limit reset for user ${userId}`);
  }

  /**
   * Get current stats
   */
  getStats(): {
    totalEntries: number;
    paymentEntries: number;
    standardEntries: number;
  } {
    let paymentEntries = 0;
    let standardEntries = 0;

    for (const key of this.requestCounts.keys()) {
      if (key.startsWith('payment:')) paymentEntries++;
      if (key.startsWith('standard:')) standardEntries++;
    }

    return {
      totalEntries: this.requestCounts.size,
      paymentEntries,
      standardEntries,
    };
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval);
    this.requestCounts.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export middleware functions
export const paymentRateLimit = rateLimiter.paymentLimiter();
export const standardRateLimit = rateLimiter.standardLimiter();

export default rateLimiter;
