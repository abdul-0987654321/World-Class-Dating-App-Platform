# Rate Limiting Quick Reference Card

## Rate Limit Tiers (24h Window)

| Feature | FREE | PLUS | GOLD | PLATINUM | DIAMOND |
|---------|------|------|------|----------|---------|
| Swipes | 50 | 100 | 200 | 500 | Unlimited |
| Likes | 100 | 200 | 400 | 1000 | Unlimited |
| Super Likes | 1 | 5 | 10 | 20 | 50 |
| Boosts | 0 | 1 | 2 | 5 | 10 |

## Common Endpoints

| Endpoint | Window | Limit | Type |
|----------|--------|-------|------|
| POST /auth/login | 15m | 5 | Fixed |
| POST /auth/register | 1h | 3 | Fixed |
| POST /messages | 1m | 30 | Fixed |
| GET /messages | 1m | 60 | Fixed |
| PUT /profiles | 1h | 10 | Fixed |
| GET /discovery/recommendations | 1m | 60 | Fixed |

## DDoS Protection Layers

| Layer | Window | Limit | Block Duration |
|-------|--------|-------|----------------|
| Burst | 10s | 50 | 5m |
| Sustained | 1m | 200 | 15m |
| Hourly | 1h | 5000 | 24h |

## Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1699564800000
Retry-After: 42 (when limited)
```

## Decorators

```typescript
// Custom limit
@RateLimit({ window: '5m', max: 10 })

// Strict limit (3 per 15m)
@StrictRateLimit()

// Relaxed limit (300 per 1m)
@RelaxedRateLimit()

// Skip rate limiting
@SkipRateLimit()
```

## Admin API (Quick Commands)

```bash
# Get DDoS stats
curl /api/v1/admin/rate-limit/ddos/stats

# Get banned IPs
curl /api/v1/admin/rate-limit/ddos/banned

# Ban IP for 1 hour
curl -X POST "/api/v1/admin/rate-limit/ddos/ban/IP?duration=1h"

# Permanent ban
curl -X POST "/api/v1/admin/rate-limit/ddos/ban/IP"

# Unban IP
curl -X DELETE /api/v1/admin/rate-limit/ddos/ban/IP

# Reset user rate limit
curl -X DELETE /api/v1/admin/rate-limit/user/USER_ID

# Get rate limit info
curl "/api/v1/admin/rate-limit/user/ID?method=POST&path=/swipes"
```

## Redis Commands

```bash
# View all rate limit keys
redis-cli KEYS "ratelimit:*"

# View DDoS keys
redis-cli KEYS "ddos:*"

# Check specific user
redis-cli ZRANGE "ratelimit:user:123:POST:/swipes" 0 -1

# Count requests in window
redis-cli ZCARD "ratelimit:user:123:POST:/swipes"

# Clear all rate limits (DANGEROUS!)
redis-cli KEYS "ratelimit:*" | xargs redis-cli DEL
```

## Environment Variables

```bash
# Required
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Optional
RATE_LIMIT_WHITELIST=127.0.0.1,::1
ADMIN_OVERRIDE_SECRET=your-secret
```

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 429 | Too Many Requests | Wait for Retry-After seconds |
| 200 | Success | Check X-RateLimit-Remaining |

## Time Format

| Format | Meaning |
|--------|---------|
| 10s | 10 seconds |
| 5m | 5 minutes |
| 1h | 1 hour |
| 24h | 24 hours |
| 7d | 7 days |

## Violation Escalation

| Violation # | Ban Duration |
|-------------|--------------|
| 1 | 5 minutes |
| 2 | 30 minutes |
| 3 | 2 hours |
| 4 | 12 hours |
| 5 | 24 hours |
| 6 | 7 days |
| 10+ | Permanent |

## Testing Commands

```bash
# Test basic rate limit
for i in {1..10}; do curl http://localhost:4000/api/v1/health; done

# Test auth rate limit
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/v1/auth/login \
    -d '{"email":"test@test.com","password":"wrong"}'
  sleep 1
done

# Test DDoS protection
for i in {1..60}; do curl http://localhost:4000/api/v1/health & done
```

## Emergency Procedures

### If under attack:

```bash
# 1. Check stats
curl /api/v1/admin/rate-limit/ddos/stats

# 2. Ban attacker IP
curl -X POST /api/v1/admin/rate-limit/ddos/ban/ATTACKER_IP

# 3. Monitor
watch -n 1 'curl /api/v1/admin/rate-limit/ddos/stats'
```

### If Redis is down:

1. System continues (fail-open)
2. Rate limiting disabled
3. Restore Redis immediately
4. No data loss (TTL-based)

### If legitimate user banned:

```bash
# 1. Check ban info
curl /api/v1/admin/rate-limit/ddos/banned/IP

# 2. Clear violations
curl -X DELETE /api/v1/admin/rate-limit/ddos/violations/IP

# 3. Unban
curl -X DELETE /api/v1/admin/rate-limit/ddos/ban/IP
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Redis connection error | Check Redis status: `redis-cli ping` |
| Legitimate user banned | Use admin API to unban |
| Rate limits too strict | Adjust in `rate-limit.config.ts` |
| Memory usage high | Check Redis: `redis-cli INFO memory` |

## Files Location

```
src/
├── config/rate-limit.config.ts         # Configuration
├── middleware/advanced-rate-limiter.middleware.ts
├── services/ddos-protection.service.ts
├── guards/comprehensive-rate-limit.guard.ts
├── decorators/rate-limit.decorator.ts
└── controllers/rate-limit-admin.controller.ts
```

## Key Metrics to Monitor

1. **Redis**
   - Memory usage
   - Connection count
   - Operations/sec

2. **Rate Limiting**
   - 429 response rate
   - Banned IP count
   - Violation patterns

3. **Performance**
   - Response time
   - Request throughput
   - Error rates

## Production Checklist

- [x] Redis configured with persistence
- [x] Strong ADMIN_OVERRIDE_SECRET set
- [x] RATE_LIMIT_WHITELIST configured
- [x] Monitoring/alerts set up
- [x] Limits reviewed for production
- [x] Emergency procedures documented
- [x] Tested in staging

---

**Print this page for quick reference during operations**
