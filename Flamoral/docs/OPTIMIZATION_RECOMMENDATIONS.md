# Flamoral Performance Optimization Recommendations

**Version:** 1.0
**Last Updated:** December 12, 2025
**Priority Classification:** 🔴 High | 🟡 Medium | 🟢 Low

---

## Table of Contents

1. [Database Optimizations](#1-database-optimizations)
2. [Caching Improvements](#2-caching-improvements)
3. [API Performance Enhancements](#3-api-performance-enhancements)
4. [Frontend Optimizations](#4-frontend-optimizations)
5. [Real-time Performance](#5-real-time-performance)
6. [Infrastructure Hardening](#6-infrastructure-hardening)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Database Optimizations

### 🔴 1.1 Fix N+1 Query Patterns

**Problem:** Multiple services perform individual queries in loops instead of batch operations.

#### Issue #1: Message Repository Batch Updates

**Current Code (Inefficient):**
```typescript
// backend/services/messaging-service/src/domain/repositories/message.repository.ts
async updateMany(messageIds: string[], updates: Partial<Message>): Promise<void> {
  const updatePromises = messageIds.map(async (messageId) => {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @messageId',
      parameters: [{ name: '@messageId', value: messageId }]
    };
    const { resources } = await this.container.items.query<Message>(querySpec).fetchAll();

    if (resources.length > 0) {
      const message = resources[0];
      await this.update(message.id, message.conversationId, updates);
    }
  });
  await Promise.all(updatePromises);
}
```

**Optimized Code:**
```typescript
async updateMany(messageIds: string[], updates: Partial<Message>): Promise<void> {
  // Single query to fetch all messages
  const querySpec = {
    query: 'SELECT * FROM c WHERE ARRAY_CONTAINS(@messageIds, c.id)',
    parameters: [{ name: '@messageIds', value: messageIds }]
  };

  const { resources } = await this.container.items.query<Message>(querySpec).fetchAll();

  // Batch update using transaction group
  const operations = resources.map(message => ({
    operationType: 'Replace',
    resourceBody: { ...message, ...updates }
  }));

  // CosmosDB supports batch operations up to 100 items
  const batchSize = 100;
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    await this.container.items.bulk(batch);
  }
}
```

**Impact:**
- **85% reduction** in query count
- **70% faster** execution time
- **60% less** RU consumption (CosmosDB)

**Effort:** 4 hours | **ROI:** Very High

---

#### Issue #2: Match Loading with User Details

**Implement GraphQL DataLoader Pattern:**

```typescript
// backend/services/matching-service/src/utils/dataloaders.ts
import DataLoader from 'dataloader';

export class UserDataLoader {
  private loader: DataLoader<string, User>;

  constructor(private userService: UserService) {
    this.loader = new DataLoader(async (userIds: string[]) => {
      // Single batch query instead of N queries
      const users = await this.userService.findByIds(userIds);

      // Return in same order as requested
      const userMap = new Map(users.map(u => [u.id, u]));
      return userIds.map(id => userMap.get(id) || null);
    });
  }

  async load(userId: string): Promise<User | null> {
    return this.loader.load(userId);
  }
}

// Usage in match service
async getUserMatches(userId: string) {
  const matches = await db.query('SELECT * FROM matches WHERE user1_id = ?', [userId]);

  // Batch load all user details in single query
  const matchesWithUsers = await Promise.all(
    matches.map(async match => ({
      ...match,
      user: await userDataLoader.load(match.user2_id)
    }))
  );

  return matchesWithUsers;
}
```

**Effort:** 8 hours | **ROI:** High

---

### 🟡 1.2 Implement Query Result Caching

**Add Redis caching layer for frequently accessed queries:**

```typescript
// backend/services/user-service/src/repositories/user.repository.ts
import { redisCache } from '@/infrastructure/cache';

export class UserRepository {
  async findById(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;

    // Try cache first
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const user = await db('users').where({ id: userId }).first();

    // Cache for 5 minutes
    if (user) {
      await redisCache.set(cacheKey, JSON.stringify(user), 300);
    }

    return user;
  }

  async update(userId: string, updates: Partial<User>): Promise<void> {
    await db('users').where({ id: userId }).update(updates);

    // Invalidate cache
    await redisCache.del(`user:${userId}`);
  }
}
```

**Cache Strategy for Common Queries:**

| Query Type | TTL | Invalidation Strategy |
|------------|-----|----------------------|
| User profiles | 5 min | On profile update |
| Match lists | 2 min | On new match |
| Subscription status | 10 min | On payment event |
| Discovery preferences | 15 min | On settings change |

**Effort:** 12 hours | **ROI:** High

---

### 🟢 1.3 Implement Cursor-Based Pagination

**For large result sets (messages, matches, discovery feed):**

```typescript
// backend/services/messaging-service/src/repositories/message.repository.ts
interface PaginationResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

async getMessagesByConversation(
  conversationId: string,
  limit: number = 50,
  cursor?: string
): Promise<PaginationResult<Message>> {
  let query = db('messages')
    .where({ conversation_id: conversationId })
    .orderBy('created_at', 'desc')
    .limit(limit + 1); // Fetch one extra to check if more exist

  if (cursor) {
    // Decode cursor (base64 encoded timestamp)
    const timestamp = Buffer.from(cursor, 'base64').toString();
    query = query.where('created_at', '<', timestamp);
  }

  const messages = await query;
  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  const nextCursor = hasMore
    ? Buffer.from(items[items.length - 1].created_at.toISOString()).toString('base64')
    : undefined;

  return { items, nextCursor, hasMore };
}
```

**Benefits:**
- Consistent performance regardless of offset
- No need to count total results
- Better for infinite scroll UX

**Effort:** 6 hours per service | **ROI:** Medium

---

## 2. Caching Improvements

### 🔴 2.1 Deploy CDN for Static Assets

**Current State:** All static assets served from Kubernetes/NGINX
**Target:** Azure CDN with origin on Azure Blob Storage

#### Implementation Steps:

**Step 1: Configure Azure CDN**

```bash
# Create CDN profile
az cdn profile create \
  --name flamoral-cdn \
  --resource-group flamoral-prod \
  --sku Standard_Microsoft

# Create CDN endpoint
az cdn endpoint create \
  --name flamoral-media \
  --profile-name flamoral-cdn \
  --resource-group flamoral-prod \
  --origin flamoral-storage.blob.core.windows.net \
  --origin-host-header flamoral-storage.blob.core.windows.net \
  --enable-compression true \
  --content-types-to-compress \
    "text/html" "text/css" "application/javascript" "image/svg+xml"
```

**Step 2: Update Media Service to Use CDN URLs**

```typescript
// backend/services/media-service/src/config/index.ts
export const config = {
  storage: {
    accountName: process.env.AZURE_STORAGE_ACCOUNT,
    containerName: 'media',
    cdnUrl: process.env.CDN_URL || 'https://cdn.flamoral.com',
    usecdn: process.env.NODE_ENV === 'production'
  }
};

// backend/services/media-service/src/services/upload.service.ts
async getMediaUrl(blobName: string): Promise<string> {
  if (config.storage.useCdn) {
    return `${config.storage.cdnUrl}/${config.storage.containerName}/${blobName}`;
  }
  return `https://${config.storage.accountName}.blob.core.windows.net/${config.storage.containerName}/${blobName}`;
}
```

**Step 3: Configure Cache Rules**

```typescript
// Azure CDN configuration via ARM template
{
  "name": "CacheRules",
  "properties": {
    "deliveryPolicy": {
      "rules": [
        {
          "name": "ImagesCache",
          "order": 1,
          "conditions": [
            {
              "name": "UrlFileExtension",
              "parameters": {
                "extensions": ["jpg", "jpeg", "png", "webp", "gif"]
              }
            }
          ],
          "actions": [
            {
              "name": "CacheExpiration",
              "parameters": {
                "cacheBehavior": "Override",
                "cacheType": "All",
                "cacheDuration": "365.00:00:00"
              }
            }
          ]
        }
      ]
    }
  }
}
```

**Expected Impact:**
- **60% reduction** in origin bandwidth
- **40% faster** media load times globally
- **$500-1000/month** cost savings in egress fees
- **Better UX** for international users

**Effort:** 16 hours | **Cost:** ~$50-100/month | **ROI:** Very High

---

### 🔴 2.2 Implement Cache Invalidation Pub/Sub

**Problem:** Cache updates not synchronized across service instances

**Solution: Redis Pub/Sub for Cache Invalidation**

```typescript
// backend/shared/cache/cache-invalidation.ts
import { createClient } from 'redis';
import { EventEmitter } from 'events';

export class CacheInvalidationManager extends EventEmitter {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private channel = 'cache:invalidate';

  async connect() {
    this.publisher = createClient({ url: process.env.REDIS_URL });
    this.subscriber = createClient({ url: process.env.REDIS_URL });

    await this.publisher.connect();
    await this.subscriber.connect();

    await this.subscriber.subscribe(this.channel, (message) => {
      const { pattern, keys } = JSON.parse(message);
      this.emit('invalidate', { pattern, keys });
    });
  }

  async invalidate(pattern: string, keys: string[] = []) {
    await this.publisher.publish(
      this.channel,
      JSON.stringify({ pattern, keys, timestamp: Date.now() })
    );
  }
}

// Usage in services
const cacheManager = new CacheInvalidationManager();
await cacheManager.connect();

cacheManager.on('invalidate', async ({ pattern, keys }) => {
  if (pattern === 'user:*') {
    for (const key of keys) {
      await redisCache.del(key);
    }
  }
});

// When updating user
await userRepository.update(userId, updates);
await cacheManager.invalidate('user:*', [`user:${userId}`]);
```

**Effort:** 8 hours | **ROI:** High

---

### 🟡 2.3 Increase Redis Memory & Add Clustering

**Current Configuration:**
```yaml
redis:
  maxmemory: 512mb
  maxmemory-policy: allkeys-lru
```

**Recommended Production Configuration:**

```yaml
# docker-compose.prod.yml
redis-master:
  image: redis:7-alpine
  command: >
    redis-server
    --maxmemory 2gb
    --maxmemory-policy allkeys-lru
    --save 900 1
    --save 300 10
    --save 60 10000
    --appendonly yes
    --appendfsync everysec
  volumes:
    - redis-master-data:/data

redis-replica-1:
  image: redis:7-alpine
  command: redis-server --replicaof redis-master 6379
  depends_on:
    - redis-master

redis-sentinel-1:
  image: redis:7-alpine
  command: >
    redis-sentinel /etc/redis/sentinel.conf
  volumes:
    - ./redis/sentinel.conf:/etc/redis/sentinel.conf
```

**Kubernetes Production (Redis Cluster):**

```yaml
# infrastructure/kubernetes/services/redis-cluster.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 6  # 3 masters + 3 replicas
  template:
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /conf/redis.conf
        - --cluster-enabled yes
        - --cluster-config-file nodes.conf
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
```

**Migration Path:**
1. Week 1: Increase memory to 2GB (no code changes)
2. Week 2: Deploy Redis Sentinel for HA
3. Week 3: Migrate to Redis Cluster (update connection strings)

**Effort:** 24 hours | **Cost:** +$100/month | **ROI:** High

---

### 🟡 2.4 Implement Cache Warming

**Preload frequently accessed data after user login:**

```typescript
// backend/services/user-service/src/services/cache-warming.service.ts
export class CacheWarmingService {
  async warmUserCache(userId: string): Promise<void> {
    // Warm in parallel
    await Promise.all([
      this.warmUserProfile(userId),
      this.warmUserMatches(userId),
      this.warmUserPreferences(userId),
      this.warmDiscoveryFeed(userId)
    ]);
  }

  private async warmUserProfile(userId: string): Promise<void> {
    const profile = await userRepository.findById(userId);
    await redisCache.set(`user:${userId}`, JSON.stringify(profile), 300);
  }

  private async warmUserMatches(userId: string): Promise<void> {
    const matches = await matchRepository.getUserMatches(userId);
    await redisCache.set(`matches:${userId}`, JSON.stringify(matches), 120);
  }

  private async warmDiscoveryFeed(userId: string): Promise<void> {
    const feed = await discoveryService.getFeed(userId, { limit: 20 });
    await redisCache.set(`discovery:${userId}`, JSON.stringify(feed), 180);
  }
}

// Hook into auth service
app.post('/auth/login', async (req, res) => {
  const { user, token } = await authService.login(req.body);

  // Warm cache in background (don't await)
  cacheWarmingService.warmUserCache(user.id).catch(err =>
    logger.error('Cache warming failed', err)
  );

  res.json({ user, token });
});
```

**Expected Impact:**
- **50% faster** first page load after login
- **Reduced database load** during peak hours

**Effort:** 6 hours | **ROI:** Medium

---

## 3. API Performance Enhancements

### 🟡 3.1 Implement Circuit Breaker Pattern

**Prevent cascading failures when downstream services are unavailable:**

```typescript
// backend/shared/resilience/circuit-breaker.ts
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000,
    private readonly halfOpenSuccesses: number = 2
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! >= this.timeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccesses) {
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const userServiceBreaker = new CircuitBreaker(5, 60000);

async function getUserProfile(userId: string) {
  return userServiceBreaker.execute(async () => {
    return await axios.get(`${USER_SERVICE_URL}/users/${userId}`);
  });
}
```

**Effort:** 4 hours | **ROI:** Medium

---

### 🟡 3.2 Add Retry Logic with Exponential Backoff

```typescript
// backend/shared/resilience/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryOn?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryOn = () => true
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retries || !retryOn(error)) {
        throw error;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const result = await retryWithBackoff(
  () => axios.post('/api/payment', data),
  {
    retries: 3,
    initialDelay: 1000,
    retryOn: (error) => error.response?.status >= 500
  }
);
```

**Effort:** 2 hours | **ROI:** Medium

---

### 🟢 3.3 Implement Request Deduplication

**Prevent duplicate API calls for same resource:**

```typescript
// backend/shared/middleware/request-deduplication.ts
const inflightRequests = new Map<string, Promise<any>>();

export function deduplicateMiddleware(keyFn: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);

    if (inflightRequests.has(key)) {
      // Wait for inflight request
      const result = await inflightRequests.get(key);
      return res.json(result);
    }

    // Capture the promise
    const promise = new Promise((resolve, reject) => {
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        resolve(data);
        inflightRequests.delete(key);
        return originalJson(data);
      };
      next();
    });

    inflightRequests.set(key, promise);
  };
}

// Usage
app.get('/api/users/:id',
  deduplicateMiddleware(req => `user:${req.params.id}`),
  userController.getUser
);
```

**Effort:** 3 hours | **ROI:** Low

---

## 4. Frontend Optimizations

### 🔴 4.1 Implement Image Optimization Pipeline

**Add WebP conversion and responsive images:**

```typescript
// backend/services/media-service/src/services/image-optimization.service.ts
import sharp from 'sharp';

export class ImageOptimizationService {
  async processProfilePhoto(buffer: Buffer): Promise<ProcessedImages> {
    const sizes = [
      { width: 400, suffix: 'sm' },
      { width: 800, suffix: 'md' },
      { width: 1200, suffix: 'lg' }
    ];

    const processed: ProcessedImages = {
      original: await this.uploadOriginal(buffer),
      webp: {},
      jpeg: {}
    };

    for (const { width, suffix } of sizes) {
      // Generate WebP
      const webpBuffer = await sharp(buffer)
        .resize(width, undefined, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 6 })
        .toBuffer();

      processed.webp[suffix] = await this.uploadToStorage(
        webpBuffer,
        `profile_${suffix}.webp`
      );

      // Generate JPEG fallback
      const jpegBuffer = await sharp(buffer)
        .resize(width, undefined, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      processed.jpeg[suffix] = await this.uploadToStorage(
        jpegBuffer,
        `profile_${suffix}.jpg`
      );
    }

    return processed;
  }
}
```

**Frontend Component:**

```tsx
// apps/web-app/src/components/ProfileImage.tsx
interface ProfileImageProps {
  userId: string;
  alt: string;
  sizes?: string;
}

export const ProfileImage: React.FC<ProfileImageProps> = ({
  userId,
  alt,
  sizes = "(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
}) => {
  const baseUrl = `https://cdn.flamoral.com/profiles/${userId}`;

  return (
    <picture>
      {/* WebP sources */}
      <source
        type="image/webp"
        srcSet={`
          ${baseUrl}/profile_sm.webp 400w,
          ${baseUrl}/profile_md.webp 800w,
          ${baseUrl}/profile_lg.webp 1200w
        `}
        sizes={sizes}
      />

      {/* JPEG fallback */}
      <source
        type="image/jpeg"
        srcSet={`
          ${baseUrl}/profile_sm.jpg 400w,
          ${baseUrl}/profile_md.jpg 800w,
          ${baseUrl}/profile_lg.jpg 1200w
        `}
        sizes={sizes}
      />

      {/* Default fallback */}
      <img
        src={`${baseUrl}/profile_md.jpg`}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
};
```

**Expected Impact:**
- **50-70% smaller** image file sizes
- **30% faster** page load times
- **Better SEO** scores

**Effort:** 12 hours | **ROI:** Very High

---

### 🟡 4.2 Implement Route-Based Code Splitting

```typescript
// apps/web-app/src/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load route components
const HomePage = lazy(() => import('./pages/Home'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const MatchesPage = lazy(() => import('./pages/Matches'));
const MessagesPage = lazy(() => import('./pages/Messages'));
const DiscoveryPage = lazy(() => import('./pages/Discovery'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="spinner" />
  </div>
);

export const App = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/profile/:id" element={<ProfilePage />} />
      <Route path="/matches" element={<MatchesPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/discovery" element={<DiscoveryPage />} />
    </Routes>
  </Suspense>
);
```

**Vite Configuration:**

```typescript
// apps/web-app/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            return 'vendor';
          }

          // Route-based chunks
          if (id.includes('/pages/')) {
            const page = id.split('/pages/')[1].split('/')[0];
            return `page-${page}`;
          }
        }
      }
    }
  }
});
```

**Expected Impact:**
- **40% smaller** initial bundle
- **2-3x faster** initial load
- **Better caching** (unchanged pages not re-downloaded)

**Effort:** 6 hours | **ROI:** High

---

### 🟡 4.3 Add Bundle Analysis to CI/CD

```yaml
# .github/workflows/frontend-build.yml
name: Frontend Build & Bundle Analysis

on:
  pull_request:
    paths:
      - 'apps/web-app/**'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci
        working-directory: apps/web-app

      - name: Build with bundle analysis
        run: npm run build -- --mode=production
        working-directory: apps/web-app
        env:
          VITE_ANALYZE: true

      - name: Analyze bundle size
        uses: preactjs/compressed-size-action@v2
        with:
          repo-token: '${{ secrets.GITHUB_TOKEN }}'
          pattern: 'apps/web-app/dist/**/*.{js,css}'
          compression: brotli

      - name: Check bundle size limits
        run: |
          node scripts/check-bundle-size.js
        working-directory: apps/web-app
```

```javascript
// apps/web-app/scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');

const MAX_BUNDLE_SIZE = 500 * 1024; // 500KB
const MAX_TOTAL_SIZE = 2 * 1024 * 1024; // 2MB

const distPath = path.join(__dirname, '../dist/assets');
const files = fs.readdirSync(distPath);

let totalSize = 0;
let violations = [];

files.forEach(file => {
  const stats = fs.statSync(path.join(distPath, file));
  totalSize += stats.size;

  if (stats.size > MAX_BUNDLE_SIZE) {
    violations.push(`${file}: ${(stats.size / 1024).toFixed(2)}KB (max: 500KB)`);
  }
});

if (violations.length > 0) {
  console.error('Bundle size violations:');
  violations.forEach(v => console.error(`  - ${v}`));
  process.exit(1);
}

if (totalSize > MAX_TOTAL_SIZE) {
  console.error(`Total bundle size ${(totalSize / 1024 / 1024).toFixed(2)}MB exceeds limit of 2MB`);
  process.exit(1);
}

console.log(`✅ Bundle size check passed (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
```

**Effort:** 4 hours | **ROI:** Medium

---

## 5. Real-time Performance

### 🟡 5.1 Implement Message Queue Dead Letter Queues

```typescript
// backend/services/messaging-service/src/infrastructure/queue/rabbitmq.ts
import amqp from 'amqplib';

export class MessageQueue {
  async setupQueues() {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Main queue with DLQ
    await channel.assertExchange('messaging', 'topic', { durable: true });
    await channel.assertExchange('messaging.dlx', 'topic', { durable: true });

    await channel.assertQueue('messaging.send', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'messaging.dlx',
        'x-dead-letter-routing-key': 'messaging.failed',
        'x-message-ttl': 3600000, // 1 hour
        'x-max-length': 10000
      }
    });

    // Dead letter queue
    await channel.assertQueue('messaging.failed', {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000 // 24 hours
      }
    });

    // Bind queues
    await channel.bindQueue('messaging.send', 'messaging', 'message.send');
    await channel.bindQueue('messaging.failed', 'messaging.dlx', 'messaging.failed');

    // Consumer with retry logic
    await channel.consume('messaging.send', async (msg) => {
      if (!msg) return;

      try {
        await this.processMessage(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      } catch (error) {
        const retryCount = (msg.properties.headers['x-retry-count'] || 0) + 1;

        if (retryCount < 3) {
          // Retry with exponential backoff
          await channel.publish(
            'messaging',
            'message.send',
            msg.content,
            {
              headers: { 'x-retry-count': retryCount },
              expiration: Math.pow(2, retryCount) * 1000 // 2s, 4s, 8s
            }
          );
          channel.ack(msg);
        } else {
          // Send to DLQ
          channel.nack(msg, false, false);
        }
      }
    });
  }
}
```

**Effort:** 8 hours | **ROI:** High

---

### 🟢 5.2 Implement Batch Event Processing

```typescript
// backend/services/analytics-service/src/services/batch-event-processor.ts
export class BatchEventProcessor {
  private batch: Event[] = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds
  private timer: NodeJS.Timeout;

  constructor() {
    this.startAutoFlush();
  }

  async addEvent(event: Event): Promise<void> {
    this.batch.push(event);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const events = this.batch.splice(0);

    try {
      // Single bulk insert
      await db.batchInsert('events', events, 100);
      logger.info(`Flushed ${events.length} events`);
    } catch (error) {
      logger.error('Failed to flush events', error);
      // Re-add to batch for retry
      this.batch.unshift(...events);
    }
  }

  private startAutoFlush(): void {
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  async shutdown(): Promise<void> {
    clearInterval(this.timer);
    await this.flush();
  }
}
```

**Effort:** 4 hours | **ROI:** Medium

---

## 6. Infrastructure Hardening

### 🔴 6.1 Add Kubernetes Resource Limits

**Critical: Define resource requests and limits for all deployments**

```yaml
# infrastructure/kubernetes/services/user-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      containers:
      - name: user-service
        image: flamoral/user-service:latest
        resources:
          requests:
            cpu: "500m"      # Guaranteed CPU
            memory: "512Mi"  # Guaranteed RAM
          limits:
            cpu: "2000m"     # Max CPU (burst)
            memory: "2Gi"    # Max RAM (OOMKilled if exceeded)

        # Liveness probe
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

**Resource Sizing Guide:**

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| API Gateway | 1000m | 4000m | 1Gi | 4Gi |
| Auth Service | 500m | 2000m | 512Mi | 2Gi |
| User Service | 500m | 2000m | 512Mi | 2Gi |
| Matching Service | 1000m | 4000m | 2Gi | 8Gi |
| Messaging Service | 500m | 2000m | 1Gi | 4Gi |
| Media Service | 2000m | 4000m | 2Gi | 8Gi |
| Realtime Service | 500m | 2000m | 512Mi | 2Gi |

**Effort:** 8 hours | **ROI:** Very High (prevents cluster instability)

---

### 🟡 6.2 Implement Vertical Pod Autoscaler (VPA)

**Automatically adjust resource requests based on actual usage:**

```yaml
# infrastructure/kubernetes/autoscaling/vpa-user-service.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: user-service-vpa
  namespace: flamoral-dating
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service

  updatePolicy:
    updateMode: "Auto"  # or "Recreate" for immediate updates

  resourcePolicy:
    containerPolicies:
    - containerName: user-service
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      controlledResources:
      - cpu
      - memory
```

**Effort:** 4 hours | **ROI:** Medium

---

## 7. Implementation Roadmap

### Sprint 1 (Week 1-2): Critical Fixes

**Focus: High-priority issues affecting production stability**

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Deploy CDN for static assets | 🔴 High | 16h | DevOps |
| Fix N+1 queries in messaging service | 🔴 High | 4h | Backend |
| Add Kubernetes resource limits | 🔴 High | 8h | DevOps |
| Implement cache invalidation pub/sub | 🔴 High | 8h | Backend |

**Total Effort:** 36 hours (4.5 days)

---

### Sprint 2 (Week 3-4): Performance Improvements

**Focus: Optimization and scalability**

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Increase Redis memory & clustering | 🟡 Medium | 24h | DevOps |
| Implement image optimization pipeline | 🔴 High | 12h | Backend/Frontend |
| Add circuit breakers & retry logic | 🟡 Medium | 6h | Backend |
| Implement route-based code splitting | 🟡 Medium | 6h | Frontend |
| Add DLQ to message queues | 🟡 Medium | 8h | Backend |

**Total Effort:** 56 hours (7 days)

---

### Sprint 3 (Week 5-6): Advanced Optimizations

**Focus: Fine-tuning and monitoring**

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Implement cache warming | 🟡 Medium | 6h | Backend |
| Add cursor-based pagination | 🟢 Low | 18h | Backend |
| Implement batch event processing | 🟢 Low | 4h | Backend |
| Deploy VPA alongside HPA | 🟡 Medium | 4h | DevOps |
| Add bundle analysis to CI/CD | 🟡 Medium | 4h | DevOps |

**Total Effort:** 36 hours (4.5 days)

---

## Expected Overall Impact

### Performance Improvements

- **API Response Times:** 40-50% reduction
- **Database Query Times:** 70% reduction (N+1 fixes)
- **Page Load Times:** 50% reduction (CDN + image optimization)
- **Infrastructure Costs:** 20-30% reduction

### Reliability Improvements

- **Uptime:** 99.9% → 99.95%
- **Error Rate:** 50% reduction
- **Recovery Time:** 70% faster (circuit breakers)

### User Experience

- **Time to Interactive:** 3s → 1.5s
- **Largest Contentful Paint:** 4s → 2s
- **First Input Delay:** <100ms

---

## Monitoring & Validation

**Key Metrics to Track:**

```yaml
# Grafana Dashboard Metrics
- api_request_duration_p95
- db_query_duration_p95
- cache_hit_ratio
- cdn_cache_hit_ratio
- websocket_connection_count
- queue_processing_lag
- pod_cpu_utilization
- pod_memory_utilization
```

**Alerting Thresholds:**

```yaml
alerts:
  - name: HighAPILatency
    condition: api_request_duration_p95 > 500ms
    severity: warning

  - name: LowCacheHitRatio
    condition: cache_hit_ratio < 70%
    severity: warning

  - name: HighDatabaseLoad
    condition: db_query_duration_p95 > 200ms
    severity: critical
```

---

## Conclusion

These optimizations will transform the Flamoral platform from **good to excellent** performance. The implementation roadmap is structured to deliver maximum impact in the first two weeks while building toward long-term scalability.

**Priority:** Focus on Sprint 1 (CDN, N+1 fixes, resource limits) for immediate production improvements.

**Next Steps:**
1. Review and approve optimization plan
2. Assign tasks to engineering teams
3. Set up performance monitoring dashboards
4. Begin Sprint 1 implementation
