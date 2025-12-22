# Rate Limiting Setup Guide

This guide walks through setting up and testing the comprehensive rate limiting system.

## Quick Start

### 1. Install Dependencies

The rate limiting system uses the existing dependencies:
- `ioredis` - For Redis connection
- `@nestjs/throttler` - Base throttling framework
- All other dependencies are already in package.json

### 2. Configure Environment

Add to your `.env` file:

```bash
# Redis Configuration (required)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# DDoS Protection (optional)
RATE_LIMIT_WHITELIST=127.0.0.1,::1
ADMIN_OVERRIDE_SECRET=change-this-in-production
```

### 3. Start Redis

Using Docker:
```bash
docker run -d \
  --name redis-rate-limit \
  -p 6379:6379 \
  redis:7-alpine
```

Or using docker-compose (already configured in `docker-compose.dev.yml`):
```bash
docker-compose -f docker-compose.dev.yml up -d redis
```

### 4. Verify Installation

Start the API Gateway:
```bash
npm run start:dev
```

Check logs for:
```
✓ Connected to Redis for advanced rate limiting
✓ Connected to Redis for DDoS protection
✓ Connected to Redis for rate limit guard
```

## Testing Rate Limits

### Test Basic Rate Limiting

```bash
# Make multiple requests to test rate limiting
for i in {1..10}; do
  curl -i http://localhost:4000/api/v1/health
  echo "Request $i"
done
```

Check response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 90
X-RateLimit-Reset: 1699564860000
```

### Test Authentication Rate Limits

```bash
# This should get rate limited after 5 attempts
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo "Attempt $i"
  sleep 1
done
```

After 5 attempts, you should get:
```json
{
  "statusCode": 429,
  "message": "Too many authentication attempts. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 840
}
```

### Test DDoS Protection

```bash
# Rapid fire requests to trigger burst protection
for i in {1..60}; do
  curl -s http://localhost:4000/api/v1/health > /dev/null &
done
wait
```

This should trigger the burst protection and temporarily ban your IP.

### Test Admin API

```bash
# Get DDoS statistics
curl http://localhost:4000/api/v1/admin/rate-limit/ddos/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"

# Get banned IPs
curl http://localhost:4000/api/v1/admin/rate-limit/ddos/banned \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"

# Unban an IP
curl -X DELETE \
  http://localhost:4000/api/v1/admin/rate-limit/ddos/ban/127.0.0.1 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

## Integration with Existing Code

### Using Custom Rate Limits in Controllers

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { RateLimit, StrictRateLimit, SkipRateLimit } from '@decorators/rate-limit.decorator';

@Controller('example')
export class ExampleController {
  // Custom rate limit: 20 requests per 5 minutes
  @RateLimit({ window: '5m', max: 20 })
  @Post('action')
  async customRateLimit() {
    return { message: 'Limited to 20 per 5 minutes' };
  }

  // Strict rate limit: 3 requests per 15 minutes
  @StrictRateLimit()
  @Post('sensitive')
  async strictLimit() {
    return { message: 'Very strict limits' };
  }

  // Skip rate limiting
  @SkipRateLimit()
  @Get('webhook')
  async noRateLimit() {
    return { message: 'No rate limit' };
  }
}
```

### Checking User Subscription Tier

The system automatically detects subscription tiers from the JWT token:

```typescript
// In your JWT payload, include:
{
  userId: '123',
  subscriptionTier: 'GOLD', // or PLUS, PLATINUM, DIAMOND
  // ... other fields
}
```

The rate limiter will automatically apply tier-specific limits.

## Monitoring

### View Rate Limit Keys in Redis

```bash
# Connect to Redis
redis-cli

# View all rate limit keys
KEYS ratelimit:*

# View DDoS keys
KEYS ddos:*

# Check specific user's rate limit
ZRANGE ratelimit:user:123:POST:/swipes 0 -1 WITHSCORES

# Count requests in current window
ZCARD ratelimit:user:123:POST:/swipes
```

### Monitor Logs

The system logs important events:

```bash
# Follow logs
npm run start:dev

# Filter rate limit logs
npm run start:dev 2>&1 | grep -i "rate limit"

# Filter DDoS logs
npm run start:dev 2>&1 | grep -i "ddos"
```

## Configuration Guide

### Adjusting Rate Limits

Edit `src/config/rate-limit.config.ts`:

```typescript
export const RATE_LIMITS = {
  // Add new endpoint
  'POST /your/endpoint': { window: '1m', max: 50 },

  // Update existing endpoint
  'POST /messages': { window: '1m', max: 60 }, // Changed from 30

  // Add tiered endpoint
  'POST /premium-feature': {
    FREE: { window: '1h', max: 10 },
    PLUS: { window: '1h', max: 50 },
    GOLD: { window: '1h', max: 100 },
    PLATINUM: { window: '1h', max: 500 },
    DIAMOND: { window: '1h', max: -1 }, // unlimited
  },
};
```

### Adjusting DDoS Protection

Edit `src/config/rate-limit.config.ts`:

```typescript
export const DDOS_PROTECTION = {
  ip: {
    burst: {
      window: '10s',
      max: 100, // Increased from 50
      blockDuration: '5m',
    },
    sustained: {
      window: '1m',
      max: 500, // Increased from 200
      blockDuration: '15m',
    },
  },
  // ... rest of config
};
```

### Adding Whitelisted IPs

Option 1: Environment variable (recommended):
```bash
RATE_LIMIT_WHITELIST=10.0.0.1,10.0.0.2,192.168.1.0/24
```

Option 2: In code:
```typescript
// src/config/rate-limit.config.ts
export const DDOS_PROTECTION = {
  whitelist: [
    '10.0.0.1',
    '10.0.0.2',
    '192.168.1.0/24',
  ],
};
```

## Production Deployment

### Checklist

- [ ] Set strong `ADMIN_OVERRIDE_SECRET`
- [ ] Configure Redis for production (persistence, clustering)
- [ ] Set up Redis monitoring (memory, connections)
- [ ] Configure proper `RATE_LIMIT_WHITELIST` (load balancers, monitoring)
- [ ] Review and adjust rate limits based on expected traffic
- [ ] Set up alerts for:
  - High number of banned IPs
  - Redis connection errors
  - High violation counts
- [ ] Document emergency procedures
- [ ] Test failover scenarios

### Redis Production Setup

```yaml
# docker-compose.prod.yml
services:
  redis-rate-limit:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-rate-limit-data:/data
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  redis-rate-limit-data:
```

### Environment Variables for Production

```bash
# Production .env
REDIS_HOST=redis-rate-limit
REDIS_PORT=6379
REDIS_PASSWORD=strong-password-here
REDIS_DB=0

# Whitelist your load balancer IPs
RATE_LIMIT_WHITELIST=10.0.0.1,10.0.0.2

# Strong secret for admin override
ADMIN_OVERRIDE_SECRET=use-strong-random-secret-here

# Adjust limits for production traffic
THROTTLE_LIMIT=500
```

### Monitoring Setup

Create alerts for:

```yaml
# Prometheus alerts
groups:
  - name: rate_limiting
    rules:
      - alert: HighRateLimitViolations
        expr: rate(rate_limit_violations_total[5m]) > 10
        annotations:
          summary: High rate limit violations detected

      - alert: RedisDown
        expr: up{job="redis-rate-limit"} == 0
        annotations:
          summary: Redis for rate limiting is down

      - alert: HighNumberOfBannedIPs
        expr: ddos_banned_ips_total > 100
        annotations:
          summary: Unusually high number of banned IPs
```

### Performance Tuning

For high-traffic scenarios:

1. **Enable Redis pipelining** (already implemented)
2. **Use Redis Cluster** for horizontal scaling
3. **Increase Redis connection pool**:
   ```typescript
   // In middleware/guard constructors
   this.redis = new Redis({
     // ... existing config
     maxRetriesPerRequest: 3,
     enableReadyCheck: true,
     lazyConnect: false,
   });
   ```
4. **Monitor Redis memory**:
   ```bash
   redis-cli INFO memory
   ```

## Troubleshooting

### Redis Connection Issues

**Problem:** `Redis connection error`

**Solutions:**
```bash
# 1. Check Redis is running
docker ps | grep redis

# 2. Test connection
redis-cli -h localhost -p 6379 ping

# 3. Check firewall
telnet localhost 6379

# 4. Verify credentials
redis-cli -h localhost -p 6379 -a your-password ping
```

### Rate Limits Not Working

**Problem:** Requests not being rate limited

**Checks:**
1. Verify Redis connection in logs
2. Check if endpoint is whitelisted
3. Verify rate limit configuration
4. Check if `@SkipRateLimit()` decorator is used
5. Test with curl to see headers

**Debug:**
```bash
# Check Redis keys
redis-cli KEYS "ratelimit:*"

# Monitor Redis commands
redis-cli MONITOR
```

### False Positive Bans

**Problem:** Legitimate users getting banned

**Solutions:**
```bash
# 1. Check ban info
curl http://localhost:4000/api/v1/admin/rate-limit/ddos/banned/IP_ADDRESS

# 2. Clear violations
curl -X DELETE http://localhost:4000/api/v1/admin/rate-limit/ddos/violations/IP_ADDRESS

# 3. Unban
curl -X DELETE http://localhost:4000/api/v1/admin/rate-limit/ddos/ban/IP_ADDRESS

# 4. Add to whitelist if needed
```

### Memory Issues

**Problem:** Redis using too much memory

**Solutions:**
1. Check key count: `redis-cli DBSIZE`
2. Set max memory: `redis-cli CONFIG SET maxmemory 512mb`
3. Set eviction policy: `redis-cli CONFIG SET maxmemory-policy allkeys-lru`
4. Review TTLs in configuration

## Support and Maintenance

### Regular Maintenance Tasks

**Daily:**
- Check Redis health
- Review error logs
- Monitor banned IP count

**Weekly:**
- Review violation patterns
- Analyze rate limit effectiveness
- Check for false positives
- Update whitelist if needed

**Monthly:**
- Review and adjust rate limits
- Analyze traffic patterns
- Update documentation
- Security audit

### Emergency Procedures

**If system is under attack:**

1. **Immediate response:**
   ```bash
   # Increase DDoS protection (requires code change and restart)
   # OR use admin override for critical services
   ```

2. **Ban attack IPs:**
   ```bash
   curl -X POST http://localhost:4000/api/v1/admin/rate-limit/ddos/ban/ATTACKER_IP
   ```

3. **Monitor:**
   ```bash
   # Watch banned IPs
   watch -n 1 'curl -s http://localhost:4000/api/v1/admin/rate-limit/ddos/stats'
   ```

**If Redis goes down:**

1. System continues to work (fail-open)
2. Rate limiting is disabled
3. Restore Redis ASAP
4. Check Redis persistence/backup

### Getting Help

1. Check this documentation
2. Review logs for errors
3. Check Redis health
4. Use admin API for diagnostics
5. Contact DevOps team

## Migration from Old System

If you're migrating from `RedisThrottlerGuard`:

1. **Backup current Redis data:**
   ```bash
   redis-cli SAVE
   cp /var/lib/redis/dump.rdb /backup/
   ```

2. **Update app.module.ts** (already done)

3. **Test thoroughly** in development

4. **Deploy to staging** first

5. **Monitor closely** after production deploy

6. **Rollback plan:** Keep backup of old code and Redis data

---

**Last Updated:** December 2024
**Version:** 1.0.0
