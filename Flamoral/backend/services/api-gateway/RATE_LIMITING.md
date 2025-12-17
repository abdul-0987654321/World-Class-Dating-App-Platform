# Comprehensive Rate Limiting System

This document describes the advanced rate limiting and DDoS protection system implemented in the API Gateway.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [Rate Limit Tiers](#rate-limit-tiers)
6. [DDoS Protection](#ddos-protection)
7. [Admin API](#admin-api)
8. [Usage Examples](#usage-examples)
9. [Monitoring](#monitoring)
10. [Best Practices](#best-practices)

## Overview

The rate limiting system provides:

- **Sliding window algorithm** for accurate rate limiting
- **Subscription tier-based limits** (FREE, PLUS, GOLD, PLATINUM, DIAMOND)
- **DDoS protection** with automatic IP banning
- **Request fingerprinting** for enhanced security
- **Admin controls** for managing bans and limits
- **Redis-backed** for distributed systems

## Features

### Core Features

1. **Sliding Window Rate Limiting**
   - More accurate than fixed window
   - Prevents burst attacks at window boundaries
   - Redis sorted sets for atomic operations

2. **Subscription Tier Support**
   - Different limits for each subscription level
   - Automatic tier detection from JWT
   - Unlimited options for premium tiers

3. **DDoS Protection**
   - Multi-layered protection (burst, sustained, hourly)
   - Automatic escalating bans
   - Request fingerprinting
   - IP whitelisting

4. **Flexible Configuration**
   - Per-endpoint rate limits
   - Custom decorators for specific routes
   - Environment-based configuration
   - Admin override capability

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Incoming Request                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           ComprehensiveRateLimitGuard (Guard)               │
│  • Checks whitelist                                         │
│  • Validates admin override                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DDoSProtectionService                          │
│  • Burst protection (10s window)                            │
│  • Sustained protection (1m window)                         │
│  • Hourly protection (1h window)                            │
│  • Violation tracking & escalation                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Rate Limit Check (Sliding Window)              │
│  • Extract user/subscription tier                           │
│  • Get endpoint-specific limits                             │
│  • Check against Redis sorted set                           │
│  • Set response headers                                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Allow/Block Request                       │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# DDoS Protection
RATE_LIMIT_WHITELIST=127.0.0.1,::1
ADMIN_OVERRIDE_SECRET=your-secret-key
```

### Rate Limit Configuration File

Located at: `src/config/rate-limit.config.ts`

```typescript
export const RATE_LIMITS = {
  // Authentication endpoints
  'POST /auth/login': { window: '15m', max: 5 },
  'POST /auth/register': { window: '1h', max: 3 },

  // Tiered endpoints
  'POST /swipes': {
    FREE: { window: '24h', max: 50 },
    PLUS: { window: '24h', max: 100 },
    GOLD: { window: '24h', max: 200 },
    PLATINUM: { window: '24h', max: 500 },
    DIAMOND: { window: '24h', max: -1 }, // unlimited
  },

  // Default
  default: { window: '1m', max: 100 },
};
```

## Rate Limit Tiers

### Authentication Endpoints

| Endpoint | Window | Limit | Reason |
|----------|--------|-------|--------|
| POST /auth/login | 15 minutes | 5 | Prevent brute force |
| POST /auth/register | 1 hour | 3 | Prevent spam accounts |
| POST /auth/forgot-password | 1 hour | 3 | Prevent abuse |

### Swipes (Subscription-Based)

| Tier | Window | Limit |
|------|--------|-------|
| FREE | 24 hours | 50 |
| PLUS | 24 hours | 100 |
| GOLD | 24 hours | 200 |
| PLATINUM | 24 hours | 500 |
| DIAMOND | 24 hours | Unlimited |

### Super Likes (Subscription-Based)

| Tier | Window | Limit |
|------|--------|-------|
| FREE | 24 hours | 1 |
| PLUS | 24 hours | 5 |
| GOLD | 24 hours | 10 |
| PLATINUM | 24 hours | 20 |
| DIAMOND | 24 hours | 50 |

### Messaging

| Endpoint | Window | Limit |
|----------|--------|-------|
| POST /messages | 1 minute | 30 |
| GET /messages | 1 minute | 60 |

### Profile Updates

| Endpoint | Window | Limit |
|----------|--------|-------|
| PUT /profiles | 1 hour | 10 |
| POST /profiles/photos | 1 hour | 20 |

## DDoS Protection

### Multi-Layer Protection

1. **Burst Protection**
   - Window: 10 seconds
   - Limit: 50 requests
   - Block: 5 minutes

2. **Sustained Traffic Protection**
   - Window: 1 minute
   - Limit: 200 requests
   - Block: 15 minutes

3. **Hourly Protection**
   - Window: 1 hour
   - Limit: 5000 requests
   - Block: 24 hours

### Violation Escalation

The system tracks violations and escalates ban durations:

| Violations | Ban Duration |
|------------|-------------|
| 1 | 5 minutes |
| 2 | 30 minutes |
| 3 | 2 hours |
| 4 | 12 hours |
| 5 | 24 hours |
| 6 | 7 days |
| 10+ | Permanent |

### Request Fingerprinting

The system creates fingerprints based on:
- User-Agent
- Accept-Language
- Accept-Encoding
- Connection headers

This helps detect distributed attacks from the same source.

## Admin API

### Get DDoS Statistics

```bash
GET /api/v1/admin/rate-limit/ddos/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalBanned": 5,
    "temporaryBans": 3,
    "permanentBans": 2,
    "activeViolations": 10
  }
}
```

### Get Banned IPs

```bash
GET /api/v1/admin/rate-limit/ddos/banned
```

### Ban an IP

```bash
# Temporary ban
POST /api/v1/admin/rate-limit/ddos/ban/192.168.1.100?duration=1h&reason=Abuse

# Permanent ban
POST /api/v1/admin/rate-limit/ddos/ban/192.168.1.100?reason=Malicious
```

### Unban an IP

```bash
DELETE /api/v1/admin/rate-limit/ddos/ban/192.168.1.100
```

### Get Rate Limit Info

```bash
GET /api/v1/admin/rate-limit/user/user123?method=POST&path=/swipes
```

### Reset Rate Limit

```bash
# Reset all limits for user
DELETE /api/v1/admin/rate-limit/user/user123

# Reset specific endpoint for user
DELETE /api/v1/admin/rate-limit/user/user123?method=POST&path=/swipes
```

## Usage Examples

### Custom Rate Limit Decorator

```typescript
import { RateLimit, StrictRateLimit, SkipRateLimit } from '@decorators/rate-limit.decorator';

@Controller('sensitive')
export class SensitiveController {
  // Custom rate limit
  @RateLimit({ window: '5m', max: 10 })
  @Post('action')
  async sensitiveAction() {
    // Limited to 10 requests per 5 minutes
  }

  // Strict rate limit (3 per 15 minutes)
  @StrictRateLimit()
  @Post('critical')
  async criticalAction() {
    // Very strict limits
  }

  // Skip rate limiting
  @SkipRateLimit()
  @Get('health')
  async healthCheck() {
    // No rate limit
  }
}
```

### Whitelist IPs

Add to `.env`:
```bash
RATE_LIMIT_WHITELIST=10.0.0.1,10.0.0.2,172.16.0.0/12
```

### Admin Override

Include header in request:
```bash
curl -H "X-Admin-Override: your-secret-key" \
     https://api.example.com/endpoint
```

## Monitoring

### Response Headers

Every request includes rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1699564800000
```

When rate limited:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564800000
Retry-After: 42
```

### Error Response

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 42,
  "limit": 100,
  "window": "1m",
  "tier": "FREE"
}
```

### Logging

The system logs:
- Rate limit violations
- DDoS protection triggers
- IP bans (temporary and permanent)
- Violation escalations

Example log:
```
[WARN] Rate limit exceeded for ratelimit:user:123:POST:/swipes - FREE tier
[WARN] DDoS protection blocked request from 192.168.1.100: Burst rate limit exceeded
[WARN] Banned IP 192.168.1.100 for 300s - Reason: burst protection violation
```

## Best Practices

### For Developers

1. **Use appropriate decorators**
   - Apply `@StrictRateLimit()` to sensitive endpoints
   - Use `@SkipRateLimit()` for health checks and webhooks
   - Set custom limits with `@RateLimit()` when needed

2. **Test rate limits**
   - Always test rate limits in development
   - Use admin override for testing
   - Monitor Redis usage

3. **Handle 429 responses**
   - Respect `Retry-After` header
   - Implement exponential backoff
   - Show user-friendly messages

### For Operations

1. **Monitor Redis**
   - Watch memory usage
   - Set up Redis persistence
   - Monitor connection count

2. **Review banned IPs regularly**
   - Check for false positives
   - Unban legitimate users
   - Analyze attack patterns

3. **Adjust limits based on usage**
   - Monitor actual usage patterns
   - Adjust limits for new features
   - Balance security vs. usability

### For Security

1. **Protect admin endpoints**
   - Keep `ADMIN_OVERRIDE_SECRET` secure
   - Rotate secrets regularly
   - Monitor admin API usage

2. **Maintain whitelist carefully**
   - Only whitelist trusted IPs
   - Document whitelist changes
   - Review whitelist monthly

3. **Analyze violations**
   - Review violation logs
   - Identify attack patterns
   - Update protection rules

## Troubleshooting

### Issue: Redis Connection Errors

**Solution:**
- Check Redis is running: `redis-cli ping`
- Verify connection details in `.env`
- Check firewall rules

### Issue: Legitimate Users Getting Banned

**Solution:**
- Review ban info: `GET /admin/rate-limit/ddos/banned/:ip`
- Clear violations: `DELETE /admin/rate-limit/ddos/violations/:ip`
- Unban: `DELETE /admin/rate-limit/ddos/ban/:ip`
- Add to whitelist if needed

### Issue: Rate Limits Too Strict

**Solution:**
- Review logs for patterns
- Adjust limits in `rate-limit.config.ts`
- Consider upgrading subscription tiers
- Use custom decorators for specific endpoints

### Issue: DDoS False Positives

**Solution:**
- Increase DDoS protection limits in config
- Whitelist known good IPs
- Review fingerprinting configuration
- Adjust violation escalation thresholds

## Performance Considerations

### Redis Optimization

1. **Use pipelining** - Already implemented for atomic operations
2. **Set appropriate TTLs** - Prevents memory bloat
3. **Monitor key count** - Watch for key accumulation
4. **Use connection pooling** - Shared Redis connection

### Scaling

For high-traffic scenarios:

1. **Redis Cluster** - Distribute load across multiple Redis nodes
2. **Read Replicas** - Separate read/write operations
3. **Caching** - Cache rate limit rules in memory
4. **Sharding** - Shard by user ID or IP range

## Security Considerations

1. **Never expose admin endpoints publicly**
2. **Rotate secrets regularly**
3. **Use HTTPS for all requests**
4. **Log all admin actions**
5. **Implement IP-based access control for admin API**
6. **Monitor for unusual patterns**
7. **Regularly review and update rate limits**

## Future Enhancements

Potential improvements:

- [ ] Machine learning-based anomaly detection
- [ ] Geographic-based rate limiting
- [ ] Time-of-day dynamic limits
- [ ] Per-organization rate limits
- [ ] Rate limit analytics dashboard
- [ ] Automatic limit adjustment based on system load
- [ ] Integration with WAF (Web Application Firewall)
- [ ] Advanced bot detection

## Support

For issues or questions:
- Check logs first
- Review this documentation
- Use admin API for diagnostics
- Monitor Redis health
- Contact DevOps team for infrastructure issues

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Maintained by:** API Gateway Team
