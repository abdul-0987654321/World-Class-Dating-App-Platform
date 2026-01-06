/**
 * Idempotency Middleware
 *
 * Ensures that mutations (POST/PUT/PATCH/DELETE) with the same Idempotency-Key
 * return the same response, preventing duplicate operations.
 *
 * Usage:
 * - Client sends Idempotency-Key header with unique value (UUID recommended)
 * - Middleware checks if key was already processed
 * - If yes, returns cached response
 * - If no, processes request and caches response
 *
 * Required for:
 * - Payment endpoints (subscriptions, coins, boosts)
 * - Any mutation that should not be duplicated
 */

import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import logger from '../utils/logger';

// Idempotency key TTL: 24 hours
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

// Header name
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

// Methods that support idempotency
const IDEMPOTENT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Endpoints that REQUIRE idempotency key
const REQUIRED_IDEMPOTENCY_ENDPOINTS = [
  '/api/v1/payments/create-intent',
  '/api/v1/payments/subscription/create',
  '/api/v1/payments/refund',
  '/api/v1/payments/methods/add',
  '/api/v1/subscriptions',
  '/api/v1/coins/purchase',
  '/api/v1/boosts/purchase',
];

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
}

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private redis: Redis | null = null;

  constructor() {
    this.initRedis();
  }

  private initRedis(): void {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
      });

      this.redis.on('error', (err) => {
        logger.error('Redis connection error in IdempotencyMiddleware', { message: err.message });
      });
    } catch (error) {
      logger.error('Failed to initialize Redis for idempotency', error);
    }
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Only apply to mutation methods
    if (!IDEMPOTENT_METHODS.includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers[IDEMPOTENCY_KEY_HEADER] as string | undefined;
    const isRequiredEndpoint = REQUIRED_IDEMPOTENCY_ENDPOINTS.some((endpoint) =>
      req.path.startsWith(endpoint)
    );

    // If endpoint requires idempotency and key is missing, reject
    if (isRequiredEndpoint && !idempotencyKey) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `Idempotency-Key header is required for ${req.method} ${req.path}`,
        details: {
          header: IDEMPOTENCY_KEY_HEADER,
          format: 'UUID recommended (e.g., 550e8400-e29b-41d4-a716-446655440000)',
        },
      });
      return;
    }

    // If no idempotency key provided, proceed without caching
    if (!idempotencyKey) {
      return next();
    }

    // Validate key format (should be non-empty, reasonable length)
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be between 8 and 128 characters',
      });
      return;
    }

    // If Redis is not available, proceed without caching
    if (!this.redis) {
      logger.warn('Redis not available for idempotency check, proceeding without cache');
      return next();
    }

    const cacheKey = this.buildCacheKey(req, idempotencyKey);

    try {
      // Check if we have a cached response
      const cachedData = await this.redis.get(cacheKey);

      if (cachedData) {
        const cached: CachedResponse = JSON.parse(cachedData);

        // Return cached response
        res.setHeader('X-Idempotency-Replayed', 'true');
        res.setHeader('X-Idempotency-Key', idempotencyKey);

        // Restore original headers
        Object.entries(cached.headers).forEach(([key, value]) => {
          if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
            res.setHeader(key, value);
          }
        });

        res.status(cached.statusCode).json(cached.body);
        return;
      }

      // Check if request is in progress (prevent concurrent duplicate requests)
      const lockKey = `${cacheKey}:lock`;
      const lockAcquired = await this.redis.set(lockKey, '1', 'EX', 30, 'NX');

      if (!lockAcquired) {
        // Another request with this key is in progress
        res.status(HttpStatus.CONFLICT).json({
          success: false,
          code: 'IDEMPOTENCY_KEY_IN_USE',
          message: 'A request with this idempotency key is already being processed',
        });
        return;
      }

      // Intercept the response to cache it
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      const cacheResponse = async (body: unknown): Promise<void> => {
        try {
          if (this.redis) {
            const responseToCache: CachedResponse = {
              statusCode: res.statusCode,
              headers: this.extractCacheableHeaders(res),
              body,
              timestamp: Date.now(),
            };

            await this.redis.setex(cacheKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(responseToCache));
            await this.redis.del(lockKey);
          }
        } catch (error) {
          logger.error('Failed to cache idempotent response', error);
        }
      };

      res.json = (body: unknown): Response => {
        cacheResponse(body);
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        return originalJson(body);
      };

      res.send = (body: unknown): Response => {
        if (typeof body === 'string') {
          try {
            const parsed = JSON.parse(body);
            cacheResponse(parsed);
          } catch {
            // Not JSON, don't cache
          }
        }
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        return originalSend(body);
      };

      next();
    } catch (error) {
      logger.error('Idempotency middleware error', error);
      // On error, proceed without caching
      next();
    }
  }

  private buildCacheKey(req: Request, idempotencyKey: string): string {
    // Include user ID if authenticated for user-scoped idempotency
    const userId = (req as { user?: { id?: string; userId?: string } }).user?.id || 'anonymous';
    return `idempotency:${userId}:${req.method}:${req.path}:${idempotencyKey}`;
  }

  private extractCacheableHeaders(res: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    const cacheableHeaders = [
      'content-type',
      'x-request-id',
      'x-correlation-id',
    ];

    cacheableHeaders.forEach((header) => {
      const value = res.getHeader(header);
      if (value) {
        headers[header] = String(value);
      }
    });

    return headers;
  }
}

/**
 * Express middleware function for non-NestJS services
 */
export function idempotencyMiddleware(redis: Redis | null) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only apply to mutation methods
    if (!IDEMPOTENT_METHODS.includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers[IDEMPOTENCY_KEY_HEADER] as string | undefined;
    const isRequiredEndpoint = REQUIRED_IDEMPOTENCY_ENDPOINTS.some((endpoint) =>
      req.path.includes(endpoint.replace('/api/v1', ''))
    );

    // If endpoint requires idempotency and key is missing, reject
    if (isRequiredEndpoint && !idempotencyKey) {
      res.status(400).json({
        success: false,
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `Idempotency-Key header is required for ${req.method} ${req.path}`,
      });
      return;
    }

    // If no idempotency key provided, proceed without caching
    if (!idempotencyKey || !redis) {
      return next();
    }

    const userId = (req as { user?: { id?: string; userId?: string } }).user?.id || (req as { user?: { id?: string; userId?: string } }).user?.userId || 'anonymous';
    const cacheKey = `idempotency:${userId}:${req.method}:${req.path}:${idempotencyKey}`;

    try {
      // Check cache
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        const cached: CachedResponse = JSON.parse(cachedData);
        res.setHeader('X-Idempotency-Replayed', 'true');
        res.status(cached.statusCode).json(cached.body);
        return;
      }

      // Acquire lock
      const lockKey = `${cacheKey}:lock`;
      const lockAcquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');

      if (!lockAcquired) {
        res.status(409).json({
          success: false,
          code: 'IDEMPOTENCY_KEY_IN_USE',
          message: 'A request with this idempotency key is already being processed',
        });
        return;
      }

      // Intercept response
      const originalJson = res.json.bind(res);

      res.json = (body: unknown): Response => {
        const responseToCache: CachedResponse = {
          statusCode: res.statusCode,
          headers: {},
          body,
          timestamp: Date.now(),
        };

        redis.setex(cacheKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(responseToCache)).catch(() => {});
        redis.del(lockKey).catch(() => {});

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Idempotency middleware error', error);
      next();
    }
  };
}

export default IdempotencyMiddleware;
