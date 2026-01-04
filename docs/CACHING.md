# Redis Caching Strategy

This document outlines the comprehensive Redis caching strategy for the Flamoral dating platform, including architecture, patterns, implementation details, and operational guidelines.

## Table of Contents

1. [Cache Architecture](#cache-architecture)
2. [Cache Patterns](#cache-patterns)
3. [Cached Data Types](#cached-data-types)
4. [Cache Keys](#cache-keys)
5. [Invalidation Strategies](#invalidation-strategies)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Cache Architecture

### ElastiCache Cluster Setup

Flamoral uses Amazon ElastiCache for Redis as the primary caching layer. The architecture is designed for high availability, low latency, and horizontal scalability.

#### Production Cluster Configuration

```yaml
# infrastructure/elasticache/production.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Flamoral ElastiCache Redis Cluster

Resources:
  RedisSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      Description: Subnet group for Redis cluster
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
        - !Ref PrivateSubnet3

  RedisSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Redis cluster
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 6379
          ToPort: 6379
          SourceSecurityGroupId: !Ref AppSecurityGroup

  RedisReplicationGroup:
    Type: AWS::ElastiCache::ReplicationGroup
    Properties:
      ReplicationGroupDescription: Flamoral Redis Cluster
      ReplicationGroupId: flamoral-redis-prod
      AutomaticFailoverEnabled: true
      MultiAZEnabled: true
      NumCacheClusters: 3
      CacheNodeType: cache.r6g.large
      Engine: redis
      EngineVersion: '7.0'
      Port: 6379
      CacheSubnetGroupName: !Ref RedisSubnetGroup
      SecurityGroupIds:
        - !Ref RedisSecurityGroup
      AtRestEncryptionEnabled: true
      TransitEncryptionEnabled: true
      SnapshotRetentionLimit: 7
      SnapshotWindow: '03:00-05:00'
      PreferredMaintenanceWindow: 'sun:05:00-sun:07:00'
      CacheParameterGroupName: !Ref RedisParameterGroup

  RedisParameterGroup:
    Type: AWS::ElastiCache::ParameterGroup
    Properties:
      CacheParameterGroupFamily: redis7
      Description: Custom parameters for Flamoral
      Properties:
        maxmemory-policy: volatile-lru
        notify-keyspace-events: Ex
        timeout: 300
```

#### Replication Topology

```
                    ┌─────────────────┐
                    │   Application   │
                    │    Services     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Redis Cluster  │
                    │    Endpoint     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│    Primary    │   │   Replica 1   │   │   Replica 2   │
│   (us-east-1a)│   │  (us-east-1b) │   │  (us-east-1c) │
│               │   │               │   │               │
│  Read/Write   │   │   Read Only   │   │   Read Only   │
└───────────────┘   └───────────────┘   └───────────────┘
```

#### Redis Client Configuration

```typescript
// backend/shared/cache/redis-client.ts
import Redis, { RedisOptions, Cluster } from 'ioredis';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  keyPrefix?: string;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
}

const getRedisConfig = (): CacheConfig => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'flamoral:',
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

class RedisClient {
  private static instance: Redis | Cluster;
  private static readReplica: Redis | Cluster;

  static getInstance(): Redis | Cluster {
    if (!this.instance) {
      const config = getRedisConfig();

      if (process.env.REDIS_CLUSTER_MODE === 'true') {
        this.instance = new Redis.Cluster(
          [{ host: config.host, port: config.port }],
          {
            redisOptions: {
              password: config.password,
              tls: config.tls,
            },
            scaleReads: 'slave',
            enableReadyCheck: true,
          }
        );
      } else {
        this.instance = new Redis(config);
      }

      this.instance.on('error', (err) => {
        console.error('Redis connection error:', err);
      });

      this.instance.on('connect', () => {
        console.log('Redis connected successfully');
      });
    }
    return this.instance;
  }

  static getReadReplica(): Redis | Cluster {
    if (!this.readReplica) {
      const config = getRedisConfig();
      config.host = process.env.REDIS_READ_HOST || config.host;
      this.readReplica = new Redis(config);
    }
    return this.readReplica;
  }
}

export const redis = RedisClient.getInstance();
export const redisRead = RedisClient.getReadReplica();
```

---

## Cache Patterns

### Cache-Aside Pattern (Lazy Loading)

The cache-aside pattern is used for read-heavy data where cache misses are acceptable.

```typescript
// backend/shared/cache/cache-aside.ts
import { redis, redisRead } from './redis-client';

interface CacheAsideOptions {
  ttl: number;
  useReadReplica?: boolean;
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
}

export class CacheAside<T> {
  private defaultOptions: CacheAsideOptions = {
    ttl: 300,
    useReadReplica: true,
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  };

  constructor(private options: Partial<CacheAsideOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async get(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const client = this.options.useReadReplica ? redisRead : redis;

    try {
      // Try to get from cache
      const cached = await client.get(key);

      if (cached) {
        return this.options.deserialize!(cached);
      }

      // Cache miss - fetch from source
      const data = await fetchFn();

      if (data !== null && data !== undefined) {
        // Store in cache with TTL
        await redis.setex(
          key,
          ttl || this.options.ttl!,
          this.options.serialize!(data)
        );
      }

      return data;
    } catch (error) {
      console.error(`Cache error for key ${key}:`, error);
      // Fallback to source on cache error
      return fetchFn();
    }
  }

  async invalidate(key: string): Promise<void> {
    await redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Usage example
const userCache = new CacheAside<UserProfile>({ ttl: 300 });

async function getUserProfile(userId: string): Promise<UserProfile> {
  return userCache.get(
    `user:profile:${userId}`,
    () => userRepository.findById(userId)
  );
}
```

### Write-Through Pattern

The write-through pattern ensures cache consistency by updating the cache on every write.

```typescript
// backend/shared/cache/write-through.ts
import { redis } from './redis-client';

interface WriteThroughOptions {
  ttl: number;
  updateCacheOnWrite: boolean;
}

export class WriteThrough<T> {
  constructor(
    private keyPrefix: string,
    private options: WriteThroughOptions = { ttl: 300, updateCacheOnWrite: true }
  ) {}

  private getKey(id: string): string {
    return `${this.keyPrefix}:${id}`;
  }

  async read(id: string, fetchFn: () => Promise<T>): Promise<T | null> {
    const key = this.getKey(id);
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    const data = await fetchFn();
    if (data) {
      await redis.setex(key, this.options.ttl, JSON.stringify(data));
    }

    return data;
  }

  async write(
    id: string,
    data: T,
    persistFn: (data: T) => Promise<T>
  ): Promise<T> {
    // Write to database first
    const persisted = await persistFn(data);

    // Update cache
    if (this.options.updateCacheOnWrite) {
      const key = this.getKey(id);
      await redis.setex(key, this.options.ttl, JSON.stringify(persisted));
    }

    return persisted;
  }

  async delete(id: string, deleteFn: () => Promise<void>): Promise<void> {
    // Delete from database
    await deleteFn();

    // Remove from cache
    const key = this.getKey(id);
    await redis.del(key);
  }
}

// Usage example
const profileWriteThrough = new WriteThrough<UserProfile>('user:profile', {
  ttl: 300,
  updateCacheOnWrite: true,
});

async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const existingProfile = await getUserProfile(userId);
  const updatedProfile = { ...existingProfile, ...updates };

  return profileWriteThrough.write(
    userId,
    updatedProfile,
    (data) => userRepository.update(userId, data)
  );
}
```

### TTL Strategies

```typescript
// backend/shared/cache/ttl-config.ts

export const TTL = {
  // Session data - longer TTL, critical for user experience
  USER_SESSION: 3600,           // 1 hour
  REFRESH_TOKEN: 604800,        // 7 days

  // User data - moderate TTL, balances freshness and performance
  USER_PROFILE: 300,            // 5 minutes
  USER_PREFERENCES: 600,        // 10 minutes
  USER_PHOTOS: 900,             // 15 minutes

  // Match data - shorter TTL, needs to stay fresh
  MATCH_SUGGESTIONS: 900,       // 15 minutes
  COMPATIBILITY_SCORE: 1800,    // 30 minutes
  DAILY_PICKS: 86400,           // 24 hours

  // Feature configuration - very short TTL
  FEATURE_FLAGS: 60,            // 1 minute
  APP_CONFIG: 300,              // 5 minutes

  // Rate limiting - varies by window
  RATE_LIMIT_WINDOW: 60,        // 1 minute sliding window
  RATE_LIMIT_DAILY: 86400,      // 24 hours

  // Temporary data
  OTP_CODE: 300,                // 5 minutes
  EMAIL_VERIFICATION: 86400,    // 24 hours
  PASSWORD_RESET: 3600,         // 1 hour
} as const;

// Dynamic TTL based on data characteristics
export function calculateDynamicTTL(
  baseType: keyof typeof TTL,
  factors: { popularity?: number; updateFrequency?: number }
): number {
  const baseTTL = TTL[baseType];
  let multiplier = 1;

  // High popularity items get longer TTL
  if (factors.popularity && factors.popularity > 0.8) {
    multiplier *= 1.5;
  }

  // Frequently updated items get shorter TTL
  if (factors.updateFrequency && factors.updateFrequency > 0.5) {
    multiplier *= 0.5;
  }

  return Math.floor(baseTTL * multiplier);
}
```

---

## Cached Data Types

### User Sessions

```typescript
// backend/services/user-service/src/cache/session.cache.ts
import { redis } from '@flamoral/shared/cache';
import { TTL } from '@flamoral/shared/cache/ttl-config';

interface UserSession {
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  permissions: string[];
}

export class SessionCache {
  private static readonly PREFIX = 'session';

  static getKey(sessionId: string): string {
    return `${this.PREFIX}:${sessionId}`;
  }

  static getUserSessionsKey(userId: string): string {
    return `${this.PREFIX}:user:${userId}`;
  }

  async create(sessionId: string, session: UserSession): Promise<void> {
    const key = SessionCache.getKey(sessionId);
    const userSessionsKey = SessionCache.getUserSessionsKey(session.userId);

    const pipeline = redis.pipeline();

    // Store session data
    pipeline.hset(key, {
      userId: session.userId,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      permissions: JSON.stringify(session.permissions),
    });
    pipeline.expire(key, TTL.USER_SESSION);

    // Add to user's session set
    pipeline.sadd(userSessionsKey, sessionId);
    pipeline.expire(userSessionsKey, TTL.USER_SESSION);

    await pipeline.exec();
  }

  async get(sessionId: string): Promise<UserSession | null> {
    const key = SessionCache.getKey(sessionId);
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      userId: data.userId,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: new Date(data.createdAt),
      lastActivityAt: new Date(data.lastActivityAt),
      permissions: JSON.parse(data.permissions),
    };
  }

  async refresh(sessionId: string): Promise<void> {
    const key = SessionCache.getKey(sessionId);

    const pipeline = redis.pipeline();
    pipeline.hset(key, 'lastActivityAt', new Date().toISOString());
    pipeline.expire(key, TTL.USER_SESSION);
    await pipeline.exec();
  }

  async destroy(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) return;

    const key = SessionCache.getKey(sessionId);
    const userSessionsKey = SessionCache.getUserSessionsKey(session.userId);

    const pipeline = redis.pipeline();
    pipeline.del(key);
    pipeline.srem(userSessionsKey, sessionId);
    await pipeline.exec();
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = SessionCache.getUserSessionsKey(userId);
    const sessionIds = await redis.smembers(userSessionsKey);

    if (sessionIds.length === 0) return;

    const pipeline = redis.pipeline();
    sessionIds.forEach((sessionId) => {
      pipeline.del(SessionCache.getKey(sessionId));
    });
    pipeline.del(userSessionsKey);
    await pipeline.exec();
  }
}
```

### User Profiles

```typescript
// backend/services/user-service/src/cache/profile.cache.ts
import { redis, redisRead } from '@flamoral/shared/cache';
import { TTL } from '@flamoral/shared/cache/ttl-config';

interface CachedUserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  location: { lat: number; lng: number };
  preferences: UserPreferences;
  verificationStatus: string;
  lastActiveAt: Date;
}

export class ProfileCache {
  private static readonly PREFIX = 'user:profile';

  static getKey(userId: string): string {
    return `${this.PREFIX}:${userId}`;
  }

  async set(userId: string, profile: CachedUserProfile): Promise<void> {
    const key = ProfileCache.getKey(userId);
    await redis.setex(key, TTL.USER_PROFILE, JSON.stringify(profile));
  }

  async get(userId: string): Promise<CachedUserProfile | null> {
    const key = ProfileCache.getKey(userId);
    const data = await redisRead.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getMany(userIds: string[]): Promise<Map<string, CachedUserProfile>> {
    if (userIds.length === 0) return new Map();

    const keys = userIds.map((id) => ProfileCache.getKey(id));
    const results = await redisRead.mget(...keys);

    const profiles = new Map<string, CachedUserProfile>();
    results.forEach((data, index) => {
      if (data) {
        profiles.set(userIds[index], JSON.parse(data));
      }
    });

    return profiles;
  }

  async invalidate(userId: string): Promise<void> {
    const key = ProfileCache.getKey(userId);
    await redis.del(key);
  }

  async updatePartial(
    userId: string,
    updates: Partial<CachedUserProfile>
  ): Promise<void> {
    const existing = await this.get(userId);
    if (existing) {
      const updated = { ...existing, ...updates };
      await this.set(userId, updated);
    }
  }
}
```

### Match Suggestions

```typescript
// backend/services/matching-service/src/cache/matches.cache.ts
import { redis, redisRead } from '@flamoral/shared/cache';
import { TTL } from '@flamoral/shared/cache/ttl-config';

interface MatchSuggestion {
  userId: string;
  score: number;
  reasons: string[];
  generatedAt: Date;
}

export class MatchesCache {
  private static readonly PREFIX = 'matches';

  static getSuggestionsKey(userId: string): string {
    return `${this.PREFIX}:suggestions:${userId}`;
  }

  static getSeenKey(userId: string): string {
    return `${this.PREFIX}:seen:${userId}`;
  }

  static getCompatibilityKey(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `${this.PREFIX}:compatibility:${sorted[0]}:${sorted[1]}`;
  }

  async setSuggestions(
    userId: string,
    suggestions: MatchSuggestion[]
  ): Promise<void> {
    const key = MatchesCache.getSuggestionsKey(userId);

    const pipeline = redis.pipeline();
    pipeline.del(key);

    suggestions.forEach((suggestion, index) => {
      pipeline.zadd(key, suggestion.score, JSON.stringify({
        ...suggestion,
        rank: index,
      }));
    });

    pipeline.expire(key, TTL.MATCH_SUGGESTIONS);
    await pipeline.exec();
  }

  async getSuggestions(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<MatchSuggestion[]> {
    const key = MatchesCache.getSuggestionsKey(userId);
    const results = await redisRead.zrevrange(
      key,
      offset,
      offset + limit - 1,
      'WITHSCORES'
    );

    const suggestions: MatchSuggestion[] = [];
    for (let i = 0; i < results.length; i += 2) {
      suggestions.push(JSON.parse(results[i]));
    }

    return suggestions;
  }

  async markAsSeen(userId: string, targetUserId: string): Promise<void> {
    const key = MatchesCache.getSeenKey(userId);
    await redis.sadd(key, targetUserId);
    await redis.expire(key, 86400 * 30); // 30 days
  }

  async getSeenUsers(userId: string): Promise<Set<string>> {
    const key = MatchesCache.getSeenKey(userId);
    const members = await redisRead.smembers(key);
    return new Set(members);
  }

  async setCompatibilityScore(
    userId1: string,
    userId2: string,
    score: number,
    reasons: string[]
  ): Promise<void> {
    const key = MatchesCache.getCompatibilityKey(userId1, userId2);
    await redis.setex(
      key,
      TTL.COMPATIBILITY_SCORE,
      JSON.stringify({ score, reasons, calculatedAt: new Date() })
    );
  }

  async getCompatibilityScore(
    userId1: string,
    userId2: string
  ): Promise<{ score: number; reasons: string[] } | null> {
    const key = MatchesCache.getCompatibilityKey(userId1, userId2);
    const data = await redisRead.get(key);
    return data ? JSON.parse(data) : null;
  }
}
```

### Rate Limiting Counters

```typescript
// backend/shared/cache/rate-limiter.ts
import { redis } from './redis-client';

interface RateLimitConfig {
  windowSizeMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export class SlidingWindowRateLimiter {
  constructor(private config: RateLimitConfig) {}

  private getKey(identifier: string, action: string): string {
    return `ratelimit:${action}:${identifier}`;
  }

  async check(identifier: string, action: string): Promise<RateLimitResult> {
    const key = this.getKey(identifier, action);
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;

    // Use Lua script for atomic operation
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_start = tonumber(ARGV[2])
      local max_requests = tonumber(ARGV[3])
      local window_size_ms = tonumber(ARGV[4])

      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

      -- Count current requests in window
      local current_count = redis.call('ZCARD', key)

      if current_count < max_requests then
        -- Add new request
        redis.call('ZADD', key, now, now .. '-' .. math.random())
        redis.call('PEXPIRE', key, window_size_ms)
        return {1, max_requests - current_count - 1, 0}
      else
        -- Get oldest request timestamp for retry-after
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local retry_after = oldest[2] and (oldest[2] + window_size_ms - now) or window_size_ms
        return {0, 0, retry_after}
      end
    `;

    const result = await redis.eval(
      luaScript,
      1,
      key,
      now.toString(),
      windowStart.toString(),
      this.config.maxRequests.toString(),
      this.config.windowSizeMs.toString()
    ) as [number, number, number];

    const [allowed, remaining, retryAfter] = result;

    return {
      allowed: allowed === 1,
      remaining,
      resetAt: new Date(now + this.config.windowSizeMs),
      retryAfter: retryAfter > 0 ? Math.ceil(retryAfter / 1000) : undefined,
    };
  }

  async reset(identifier: string, action: string): Promise<void> {
    const key = this.getKey(identifier, action);
    await redis.del(key);
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  api: new SlidingWindowRateLimiter({
    windowSizeMs: 60000,    // 1 minute
    maxRequests: 100,
  }),

  login: new SlidingWindowRateLimiter({
    windowSizeMs: 900000,   // 15 minutes
    maxRequests: 5,
  }),

  swipe: new SlidingWindowRateLimiter({
    windowSizeMs: 3600000,  // 1 hour
    maxRequests: 100,       // Free tier limit
  }),

  message: new SlidingWindowRateLimiter({
    windowSizeMs: 60000,    // 1 minute
    maxRequests: 30,
  }),

  superLike: new SlidingWindowRateLimiter({
    windowSizeMs: 86400000, // 24 hours
    maxRequests: 5,
  }),
};
```

### Feature Flags

```typescript
// backend/shared/cache/feature-flags.ts
import { redis, redisRead } from './redis-client';
import { TTL } from './ttl-config';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUserIds?: string[];
  excludedUserIds?: string[];
  metadata?: Record<string, any>;
}

export class FeatureFlagCache {
  private static readonly PREFIX = 'feature';
  private static localCache: Map<string, { flag: FeatureFlag; expiry: number }> = new Map();

  static getKey(flagName: string): string {
    return `${this.PREFIX}:${flagName}`;
  }

  static getAllKey(): string {
    return `${this.PREFIX}:all`;
  }

  async set(flag: FeatureFlag): Promise<void> {
    const key = FeatureFlagCache.getKey(flag.name);

    const pipeline = redis.pipeline();
    pipeline.hset(key, {
      name: flag.name,
      enabled: flag.enabled.toString(),
      rolloutPercentage: flag.rolloutPercentage.toString(),
      targetUserIds: JSON.stringify(flag.targetUserIds || []),
      excludedUserIds: JSON.stringify(flag.excludedUserIds || []),
      metadata: JSON.stringify(flag.metadata || {}),
    });
    pipeline.expire(key, TTL.FEATURE_FLAGS);
    pipeline.sadd(FeatureFlagCache.getAllKey(), flag.name);
    await pipeline.exec();

    // Update local cache
    FeatureFlagCache.localCache.set(flag.name, {
      flag,
      expiry: Date.now() + TTL.FEATURE_FLAGS * 1000,
    });
  }

  async get(flagName: string): Promise<FeatureFlag | null> {
    // Check local cache first
    const cached = FeatureFlagCache.localCache.get(flagName);
    if (cached && cached.expiry > Date.now()) {
      return cached.flag;
    }

    const key = FeatureFlagCache.getKey(flagName);
    const data = await redisRead.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    const flag: FeatureFlag = {
      name: data.name,
      enabled: data.enabled === 'true',
      rolloutPercentage: parseFloat(data.rolloutPercentage),
      targetUserIds: JSON.parse(data.targetUserIds),
      excludedUserIds: JSON.parse(data.excludedUserIds),
      metadata: JSON.parse(data.metadata),
    };

    // Update local cache
    FeatureFlagCache.localCache.set(flagName, {
      flag,
      expiry: Date.now() + TTL.FEATURE_FLAGS * 1000,
    });

    return flag;
  }

  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    const flag = await this.get(flagName);

    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check excluded users
    if (userId && flag.excludedUserIds?.includes(userId)) {
      return false;
    }

    // Check targeted users
    if (flag.targetUserIds && flag.targetUserIds.length > 0) {
      return userId ? flag.targetUserIds.includes(userId) : false;
    }

    // Percentage rollout
    if (flag.rolloutPercentage < 100) {
      if (!userId) return false;
      const hash = this.hashUserId(userId);
      return (hash % 100) < flag.rolloutPercentage;
    }

    return true;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    const flagNames = await redisRead.smembers(FeatureFlagCache.getAllKey());
    const flags: FeatureFlag[] = [];

    for (const name of flagNames) {
      const flag = await this.get(name);
      if (flag) flags.push(flag);
    }

    return flags;
  }
}
```

---

## Cache Keys

### Naming Conventions

```typescript
// backend/shared/cache/key-builder.ts

/**
 * Cache Key Naming Convention:
 *
 * Format: {namespace}:{entity}:{identifier}[:{subkey}]
 *
 * Examples:
 *   - user:profile:123
 *   - user:session:abc-def-ghi
 *   - matches:suggestions:123
 *   - ratelimit:api:192.168.1.1
 *   - feature:dark_mode
 */

export class CacheKeyBuilder {
  private parts: string[] = [];

  constructor(namespace: string) {
    this.parts.push(namespace);
  }

  entity(entity: string): CacheKeyBuilder {
    this.parts.push(entity);
    return this;
  }

  id(identifier: string | number): CacheKeyBuilder {
    this.parts.push(String(identifier));
    return this;
  }

  subkey(subkey: string): CacheKeyBuilder {
    this.parts.push(subkey);
    return this;
  }

  build(): string {
    return this.parts.join(':');
  }

  static user(entity: string, userId: string): string {
    return new CacheKeyBuilder('user').entity(entity).id(userId).build();
  }

  static match(entity: string, ...ids: string[]): string {
    const builder = new CacheKeyBuilder('matches').entity(entity);
    ids.forEach((id) => builder.id(id));
    return builder.build();
  }

  static rateLimit(action: string, identifier: string): string {
    return new CacheKeyBuilder('ratelimit').entity(action).id(identifier).build();
  }

  static feature(flagName: string): string {
    return new CacheKeyBuilder('feature').id(flagName).build();
  }
}

// Namespace registry for documentation
export const CACHE_NAMESPACES = {
  user: {
    description: 'User-related data',
    entities: ['profile', 'session', 'preferences', 'photos', 'settings'],
  },
  matches: {
    description: 'Matching and discovery data',
    entities: ['suggestions', 'seen', 'compatibility', 'likes', 'passes'],
  },
  messages: {
    description: 'Messaging data',
    entities: ['conversation', 'unread', 'typing'],
  },
  ratelimit: {
    description: 'Rate limiting counters',
    entities: ['api', 'login', 'swipe', 'message', 'superlike'],
  },
  feature: {
    description: 'Feature flags and configuration',
    entities: ['*'],
  },
  temp: {
    description: 'Temporary data (OTP, verification)',
    entities: ['otp', 'verification', 'reset'],
  },
} as const;
```

---

## Invalidation Strategies

### Event-Based Invalidation

```typescript
// backend/shared/cache/invalidation.ts
import { redis } from './redis-client';
import { EventEmitter } from 'events';

type InvalidationEvent =
  | 'user.updated'
  | 'user.deleted'
  | 'profile.updated'
  | 'match.created'
  | 'match.removed'
  | 'settings.changed';

interface InvalidationPayload {
  event: InvalidationEvent;
  userId?: string;
  targetUserId?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

class CacheInvalidator extends EventEmitter {
  private handlers: Map<InvalidationEvent, ((payload: InvalidationPayload) => Promise<void>)[]> = new Map();

  constructor() {
    super();
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    // User profile updated
    this.on('user.updated', async (payload) => {
      if (payload.userId) {
        await redis.del(`user:profile:${payload.userId}`);
        await redis.del(`user:preferences:${payload.userId}`);
      }
    });

    // User deleted
    this.on('user.deleted', async (payload) => {
      if (payload.userId) {
        const patterns = [
          `user:*:${payload.userId}`,
          `matches:*:${payload.userId}*`,
          `messages:*:${payload.userId}*`,
        ];

        for (const pattern of patterns) {
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        }
      }
    });

    // Profile updated
    this.on('profile.updated', async (payload) => {
      if (payload.userId) {
        await redis.del(`user:profile:${payload.userId}`);

        // Invalidate match suggestions for users who might see this profile
        // This is handled by background job for efficiency
        await redis.publish('cache:invalidate:matches', JSON.stringify({
          userId: payload.userId,
          reason: 'profile_update',
        }));
      }
    });

    // Match created
    this.on('match.created', async (payload) => {
      if (payload.userId && payload.targetUserId) {
        await redis.del(`matches:suggestions:${payload.userId}`);
        await redis.del(`matches:suggestions:${payload.targetUserId}`);
      }
    });
  }

  async invalidate(payload: InvalidationPayload): Promise<void> {
    this.emit(payload.event, payload);

    // Log invalidation for debugging
    console.log('Cache invalidation:', {
      event: payload.event,
      userId: payload.userId,
      timestamp: new Date().toISOString(),
    });
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    await redis.del(...keys);
    return keys.length;
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.invalidate({ event: 'user.updated', userId });
  }
}

export const cacheInvalidator = new CacheInvalidator();

// Usage in services
export function invalidateOnProfileUpdate(userId: string): void {
  cacheInvalidator.invalidate({
    event: 'profile.updated',
    userId,
  });
}
```

### Time-Based Invalidation with Background Refresh

```typescript
// backend/shared/cache/background-refresh.ts
import { redis } from './redis-client';

interface RefreshConfig {
  key: string;
  ttl: number;
  refreshThreshold: number; // Percentage of TTL remaining to trigger refresh
  fetchFn: () => Promise<any>;
}

export class BackgroundRefreshCache {
  private refreshQueue: Map<string, Promise<void>> = new Map();

  async get<T>(config: RefreshConfig): Promise<T | null> {
    const { key, ttl, refreshThreshold, fetchFn } = config;

    // Get value and TTL
    const pipeline = redis.pipeline();
    pipeline.get(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    const value = results?.[0]?.[1] as string | null;
    const remainingTtl = results?.[1]?.[1] as number;

    if (value) {
      // Check if refresh is needed
      const ttlPercentage = remainingTtl / ttl;

      if (ttlPercentage < refreshThreshold && !this.refreshQueue.has(key)) {
        // Trigger background refresh
        const refreshPromise = this.backgroundRefresh(key, ttl, fetchFn);
        this.refreshQueue.set(key, refreshPromise);
        refreshPromise.finally(() => this.refreshQueue.delete(key));
      }

      return JSON.parse(value);
    }

    // Cache miss - fetch and store
    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      await redis.setex(key, ttl, JSON.stringify(data));
    }

    return data;
  }

  private async backgroundRefresh(
    key: string,
    ttl: number,
    fetchFn: () => Promise<any>
  ): Promise<void> {
    try {
      const data = await fetchFn();
      if (data !== null && data !== undefined) {
        await redis.setex(key, ttl, JSON.stringify(data));
      }
    } catch (error) {
      console.error(`Background refresh failed for key ${key}:`, error);
    }
  }
}

// Usage
const backgroundCache = new BackgroundRefreshCache();

async function getPopularProfiles(): Promise<Profile[]> {
  return backgroundCache.get({
    key: 'popular:profiles',
    ttl: 300,
    refreshThreshold: 0.2, // Refresh when 20% of TTL remains
    fetchFn: () => profileService.getPopularProfiles(),
  });
}
```

---

## Monitoring

### CloudWatch Metrics

```typescript
// backend/shared/cache/metrics.ts
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { redis } from './redis-client';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });

interface CacheMetrics {
  hits: number;
  misses: number;
  latencyMs: number;
  memoryUsedBytes: number;
  connectedClients: number;
  keysCount: number;
}

export class CacheMonitor {
  private metrics = {
    hits: 0,
    misses: 0,
    totalLatency: 0,
    requestCount: 0,
  };

  recordHit(latencyMs: number): void {
    this.metrics.hits++;
    this.metrics.totalLatency += latencyMs;
    this.metrics.requestCount++;
  }

  recordMiss(latencyMs: number): void {
    this.metrics.misses++;
    this.metrics.totalLatency += latencyMs;
    this.metrics.requestCount++;
  }

  getHitRatio(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  getAverageLatency(): number {
    return this.metrics.requestCount > 0
      ? this.metrics.totalLatency / this.metrics.requestCount
      : 0;
  }

  async getRedisInfo(): Promise<CacheMetrics> {
    const info = await redis.info();
    const lines = info.split('\r\n');
    const parsed: Record<string, string> = {};

    lines.forEach((line) => {
      const [key, value] = line.split(':');
      if (key && value) parsed[key] = value;
    });

    return {
      hits: parseInt(parsed['keyspace_hits'] || '0'),
      misses: parseInt(parsed['keyspace_misses'] || '0'),
      latencyMs: this.getAverageLatency(),
      memoryUsedBytes: parseInt(parsed['used_memory'] || '0'),
      connectedClients: parseInt(parsed['connected_clients'] || '0'),
      keysCount: parseInt(parsed['db0']?.match(/keys=(\d+)/)?.[1] || '0'),
    };
  }

  async publishMetrics(): Promise<void> {
    const redisInfo = await this.getRedisInfo();
    const hitRatio = this.getHitRatio();

    await cloudwatch.putMetricData({
      Namespace: 'Flamoral/Cache',
      MetricData: [
        {
          MetricName: 'CacheHitRatio',
          Value: hitRatio,
          Unit: 'None',
          Dimensions: [{ Name: 'Environment', Value: process.env.NODE_ENV || 'development' }],
        },
        {
          MetricName: 'CacheHits',
          Value: this.metrics.hits,
          Unit: 'Count',
          Dimensions: [{ Name: 'Environment', Value: process.env.NODE_ENV || 'development' }],
        },
        {
          MetricName: 'CacheMisses',
          Value: this.metrics.misses,
          Unit: 'Count',
          Dimensions: [{ Name: 'Environment', Value: process.env.NODE_ENV || 'development' }],
        },
        {
          MetricName: 'CacheLatency',
          Value: this.getAverageLatency(),
          Unit: 'Milliseconds',
          Dimensions: [{ Name: 'Environment', Value: process.env.NODE_ENV || 'development' }],
        },
        {
          MetricName: 'MemoryUsed',
          Value: redisInfo.memoryUsedBytes,
          Unit: 'Bytes',
          Dimensions: [{ Name: 'Environment', Value: process.env.NODE_ENV || 'development' }],
        },
        {
          MetricName: 'ConnectedClients',
          Value: redisInfo.connectedClients,
          Unit: 'Count',
          Dimensions: [{ Name: 'Environment', Value: process.env.NODE_ENV || 'development' }],
        },
      ],
    });

    // Reset local metrics after publishing
    this.metrics = { hits: 0, misses: 0, totalLatency: 0, requestCount: 0 };
  }
}

export const cacheMonitor = new CacheMonitor();

// Publish metrics every minute
setInterval(() => {
  cacheMonitor.publishMetrics().catch(console.error);
}, 60000);
```

### Health Check Endpoint

```typescript
// backend/shared/cache/health.ts
import { redis } from './redis-client';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  memoryUsage: string;
  connectedClients: number;
  uptime: number;
  details?: string;
}

export async function checkCacheHealth(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // Ping test
    await redis.ping();
    const latencyMs = Date.now() - start;

    // Get info
    const info = await redis.info();
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const clientsMatch = info.match(/connected_clients:(\d+)/);
    const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);

    const status: HealthCheckResult = {
      status: 'healthy',
      latencyMs,
      memoryUsage: memoryMatch?.[1] || 'unknown',
      connectedClients: parseInt(clientsMatch?.[1] || '0'),
      uptime: parseInt(uptimeMatch?.[1] || '0'),
    };

    // Check for degradation
    if (latencyMs > 100) {
      status.status = 'degraded';
      status.details = 'High latency detected';
    }

    return status;
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      memoryUsage: 'unknown',
      connectedClients: 0,
      uptime: 0,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. High Cache Miss Rate

**Symptoms:**
- Hit ratio below 80%
- Increased database load
- Higher response times

**Diagnosis:**
```typescript
// Check cache stats
async function diagnoseCacheMisses(): Promise<void> {
  const info = await redis.info('stats');
  console.log('Cache Stats:', info);

  // Check specific key patterns
  const keyPatterns = ['user:profile:*', 'matches:*', 'session:*'];

  for (const pattern of keyPatterns) {
    const keys = await redis.keys(pattern);
    console.log(`${pattern}: ${keys.length} keys`);
  }
}
```

**Solutions:**
- Increase TTL for stable data
- Pre-warm cache on startup
- Review cache key consistency

#### 2. Memory Pressure

**Symptoms:**
- Evictions occurring
- Out of memory errors
- Slow responses

**Diagnosis:**
```typescript
async function diagnoseMemory(): Promise<void> {
  const info = await redis.info('memory');
  console.log('Memory Info:', info);

  // Find large keys
  const scan = redis.scanStream({ match: '*', count: 100 });
  const largKeys: Array<{ key: string; size: number }> = [];

  for await (const keys of scan) {
    for (const key of keys) {
      const size = await redis.memory('USAGE', key);
      if (size && size > 10000) {
        largKeys.push({ key, size });
      }
    }
  }

  console.log('Large keys:', largKeys.sort((a, b) => b.size - a.size).slice(0, 10));
}
```

**Solutions:**
- Review TTL strategy
- Implement data compression
- Scale cluster vertically or horizontally

#### 3. Connection Issues

**Symptoms:**
- Connection timeouts
- ECONNREFUSED errors
- Intermittent failures

**Diagnosis:**
```typescript
async function diagnoseConnections(): Promise<void> {
  try {
    const clientList = await redis.client('LIST');
    console.log('Connected Clients:', clientList);

    const info = await redis.info('clients');
    console.log('Client Info:', info);
  } catch (error) {
    console.error('Connection diagnostic failed:', error);
  }
}
```

**Solutions:**
- Check security group rules
- Verify connection pool settings
- Review timeout configurations

### Debugging Tools

```typescript
// backend/shared/cache/debug.ts
import { redis } from './redis-client';

export class CacheDebugger {
  // Monitor real-time commands
  async monitorCommands(durationMs: number = 10000): Promise<void> {
    const monitor = await redis.monitor();

    console.log('Monitoring Redis commands...');

    monitor.on('monitor', (time, args) => {
      console.log(`[${new Date(time * 1000).toISOString()}] ${args.join(' ')}`);
    });

    setTimeout(() => {
      monitor.disconnect();
      console.log('Monitoring stopped');
    }, durationMs);
  }

  // Analyze key distribution
  async analyzeKeyDistribution(): Promise<Record<string, number>> {
    const distribution: Record<string, number> = {};
    const scan = redis.scanStream({ match: '*', count: 1000 });

    for await (const keys of scan) {
      for (const key of keys as string[]) {
        const namespace = key.split(':')[0];
        distribution[namespace] = (distribution[namespace] || 0) + 1;
      }
    }

    return distribution;
  }

  // Check key TTLs
  async checkTTLs(pattern: string): Promise<Array<{ key: string; ttl: number }>> {
    const keys = await redis.keys(pattern);
    const results: Array<{ key: string; ttl: number }> = [];

    for (const key of keys.slice(0, 100)) {
      const ttl = await redis.ttl(key);
      results.push({ key, ttl });
    }

    return results.sort((a, b) => a.ttl - b.ttl);
  }

  // Slow log analysis
  async getSlowQueries(count: number = 10): Promise<any[]> {
    return redis.slowlog('GET', count);
  }
}

export const cacheDebugger = new CacheDebugger();
```

### Emergency Procedures

```typescript
// backend/shared/cache/emergency.ts
import { redis } from './redis-client';

export class CacheEmergencyProcedures {
  // Clear all cache (use with caution)
  async flushAll(): Promise<void> {
    console.warn('EMERGENCY: Flushing all cache data');
    await redis.flushall();
    console.log('Cache flushed successfully');
  }

  // Clear specific namespace
  async flushNamespace(namespace: string): Promise<number> {
    console.warn(`EMERGENCY: Flushing namespace: ${namespace}`);
    const keys = await redis.keys(`${namespace}:*`);

    if (keys.length === 0) return 0;

    await redis.del(...keys);
    console.log(`Flushed ${keys.length} keys from namespace: ${namespace}`);
    return keys.length;
  }

  // Disable caching temporarily
  async setBypassMode(enabled: boolean): Promise<void> {
    await redis.set('config:cache:bypass', enabled ? '1' : '0');
    console.log(`Cache bypass mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // Check if bypass mode is active
  async isBypassMode(): Promise<boolean> {
    const value = await redis.get('config:cache:bypass');
    return value === '1';
  }
}

export const emergencyProcedures = new CacheEmergencyProcedures();
```

---

## Best Practices Summary

1. **Key Naming**: Use consistent namespace:entity:id format
2. **TTL Selection**: Match TTL to data volatility and access patterns
3. **Error Handling**: Always have fallback to source on cache failures
4. **Monitoring**: Track hit ratios, latency, and memory usage
5. **Invalidation**: Prefer event-based over time-based where possible
6. **Serialization**: Use efficient serialization (JSON for most, MessagePack for large data)
7. **Connection Management**: Use connection pooling and proper timeout settings
8. **Security**: Enable TLS, use strong passwords, restrict network access

---

## Related Documentation

- [Infrastructure Guide](./INFRASTRUCTURE.md)
- [API Documentation](./API.md)
- [Performance Optimization](./PERFORMANCE.md)
- [Monitoring and Alerting](./MONITORING.md)
