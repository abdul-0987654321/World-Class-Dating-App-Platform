/**
 * Cache Middleware
 * Implements in-memory caching with TTL support
 */

import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  etag: string;
  createdAt: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  keyGenerator?: (req: Request) => string;
  shouldCache?: (req: Request, res: Response) => boolean;
  cacheControl?: boolean;
  etag?: boolean;
}

// In-memory cache storage
const cacheStore = new Map<string, CacheEntry>();

// Cleanup interval
const CLEANUP_INTERVAL = 30000; // 30 seconds
let cleanupTimer: NodeJS.Timeout | null = null;

function startCacheCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cacheStore.entries()) {
      if (now > entry.expiresAt) {
        cacheStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

function generateETag(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

function defaultKeyGenerator(req: Request): string {
  const base = `${req.method}:${req.originalUrl || req.url}`;
  const acceptLang = req.headers['accept-language'] || 'en';
  return `cache:${base}:${acceptLang}`;
}

export const cacheMiddleware = (options: CacheOptions) => {
  const {
    ttl,
    keyGenerator = defaultKeyGenerator,
    shouldCache = () => true,
    cacheControl = true,
    etag = true,
  } = options;

  // Start cleanup process
  startCacheCleanup();

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const now = Date.now();

    // Check for cached response
    const cached = cacheStore.get(cacheKey);

    if (cached && now < cached.expiresAt) {
      // Check ETag for conditional requests
      if (etag) {
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag === cached.etag) {
          res.status(304).end();
          return;
        }
        res.setHeader('ETag', cached.etag);
      }

      // Set cache control headers
      if (cacheControl) {
        const maxAge = Math.floor((cached.expiresAt - now) / 1000);
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
        res.setHeader('X-Cache', 'HIT');
      }

      return res.json(cached.data);
    }

    // Cache miss - intercept response
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && shouldCache(req, res)) {
        const etagValue = generateETag(data);

        const entry: CacheEntry = {
          data,
          etag: etagValue,
          createdAt: now,
          expiresAt: now + ttl,
        };

        cacheStore.set(cacheKey, entry);

        if (etag) {
          res.setHeader('ETag', etagValue);
        }

        if (cacheControl) {
          const maxAge = Math.floor(ttl / 1000);
          res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
          res.setHeader('X-Cache', 'MISS');
        }
      }

      return originalJson(data);
    };

    next();
  };
};

// Cache invalidation utilities
export const invalidateCache = (pattern?: string | RegExp): number => {
  let count = 0;

  if (!pattern) {
    count = cacheStore.size;
    cacheStore.clear();
    return count;
  }

  for (const key of cacheStore.keys()) {
    const matches = typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key);

    if (matches) {
      cacheStore.delete(key);
      count++;
    }
  }

  return count;
};

export const getCacheStats = () => ({
  size: cacheStore.size,
  keys: Array.from(cacheStore.keys()),
});

// Export for testing
export const _getCacheStore = () => cacheStore;
export const _clearCacheStore = () => cacheStore.clear();
