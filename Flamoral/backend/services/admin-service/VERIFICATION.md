# Admin Service Verification Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Build the Service
```bash
npm run build
```

### 4. Run the Service
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Verification Steps

### Check Compilation
```bash
npx tsc --noEmit
```

Expected: No errors

### Check Linting
```bash
npm run lint
```

### Test Endpoints

#### 1. Health Check (No Auth Required)
```bash
curl http://localhost:3010/health
```

Expected Response:
```json
{
  "status": "healthy",
  "service": "admin-service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Login
```bash
curl -X POST http://localhost:3010/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@flamoral.com",
    "password": "your_password"
  }'
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "admin": { ... },
    "token": "jwt_token_here"
  }
}
```

#### 3. Get Dashboard (Requires Auth)
```bash
curl http://localhost:3010/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 4. Test Rate Limiting
Run the same endpoint 5+ times within 15 minutes:
```bash
for i in {1..6}; do
  curl -X POST http://localhost:3010/api/admin/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
```

Expected: 429 Too Many Requests on 6th attempt

#### 5. Test Validation
```bash
curl -X POST http://localhost:3010/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "123"
  }'
```

Expected: 400 with validation errors

## File Structure Verification

Ensure all files exist:

### Services
- [x] src/services/auth.service.ts
- [x] src/services/admin.service.ts
- [x] src/services/dashboard.service.ts
- [x] src/services/users.service.ts
- [x] src/services/health.service.ts
- [x] src/services/abtest.service.ts
- [x] src/services/tickets.service.ts
- [x] src/services/reports.service.ts

### Middleware
- [x] src/middleware/auth.ts
- [x] src/middleware/audit.ts
- [x] src/middleware/validation.ts
- [x] src/middleware/rateLimiter.ts

### Infrastructure
- [x] src/infrastructure/database.ts
- [x] src/infrastructure/redis.ts

### Routes
- [x] src/routes/index.ts

### Core
- [x] src/index.ts
- [x] src/types/index.ts
- [x] src/utils/logger.ts

### Config
- [x] package.json
- [x] tsconfig.json
- [x] .env.example

### Documentation
- [x] README.md
- [x] API_DOCUMENTATION.md
- [x] FIXES_SUMMARY.md
- [x] VERIFICATION.md

## Database Verification

### Check Database Connection
The service should connect to PostgreSQL on startup. Check logs for:
```
Database connection established
```

### Verify Required Tables
Run this query to check tables:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Required tables:
- admins
- admin_login_attempts
- audit_logs
- users
- reports
- ab_tests
- support_tickets
- ticket_messages
- transactions
- subscription_history
- matches
- messages
- likes
- profile_views
- photo_verifications
- activity_logs
- user_actions
- deletion_queue
- login_history

## Redis Verification

### Check Redis Connection
The service should connect to Redis on startup. Check logs for:
```
Redis connected
```

### Test Redis
```bash
redis-cli ping
```

Expected: PONG

## Log Verification

### Check Logs Directory
```bash
ls -la logs/
```

Expected files:
- error.log
- combined.log

### Monitor Logs
```bash
# Development
tail -f logs/combined.log

# Errors only
tail -f logs/error.log
```

## Endpoint Coverage

### Authentication (6 endpoints)
- [x] POST /api/admin/auth/login
- [x] POST /api/admin/auth/logout
- [x] POST /api/admin/auth/password-reset/request
- [x] POST /api/admin/auth/password-reset/confirm
- [x] POST /api/admin/auth/password/change
- [x] GET /api/admin/auth/session

### Admin Management (9 endpoints)
- [x] GET /api/admin/admins
- [x] GET /api/admin/admins/stats
- [x] GET /api/admin/admins/:adminId
- [x] POST /api/admin/admins
- [x] PUT /api/admin/admins/:adminId
- [x] POST /api/admin/admins/:adminId/deactivate
- [x] POST /api/admin/admins/:adminId/reactivate
- [x] DELETE /api/admin/admins/:adminId
- [x] GET /api/admin/admins/:adminId/permissions

### Dashboard (1 endpoint)
- [x] GET /api/admin/dashboard

### User Management (6 endpoints)
- [x] GET /api/admin/users
- [x] GET /api/admin/users/:userId
- [x] POST /api/admin/users/:userId/ban
- [x] POST /api/admin/users/:userId/unban
- [x] POST /api/admin/users/:userId/verify
- [x] DELETE /api/admin/users/:userId
- [x] POST /api/admin/users/:userId/reset-password

### System Health (3 endpoints)
- [x] GET /api/admin/health
- [x] GET /api/admin/health/services/:serviceName/logs
- [x] POST /api/admin/health/services/:serviceName/restart

### A/B Tests (9 endpoints)
- [x] GET /api/admin/ab-tests
- [x] GET /api/admin/ab-tests/:testId
- [x] POST /api/admin/ab-tests
- [x] PUT /api/admin/ab-tests/:testId
- [x] POST /api/admin/ab-tests/:testId/start
- [x] POST /api/admin/ab-tests/:testId/pause
- [x] POST /api/admin/ab-tests/:testId/complete
- [x] DELETE /api/admin/ab-tests/:testId
- [x] GET /api/admin/ab-tests/:testId/metrics

### Support Tickets (7 endpoints)
- [x] GET /api/admin/tickets
- [x] GET /api/admin/tickets/stats
- [x] GET /api/admin/tickets/:ticketId
- [x] POST /api/admin/tickets/:ticketId/assign
- [x] POST /api/admin/tickets/:ticketId/messages
- [x] PUT /api/admin/tickets/:ticketId/status
- [x] PUT /api/admin/tickets/:ticketId/priority

### Audit Logs (1 endpoint)
- [x] GET /api/admin/audit-logs

### Reports (7 endpoints)
- [x] GET /api/admin/reports/overview
- [x] GET /api/admin/reports/users
- [x] GET /api/admin/reports/revenue
- [x] GET /api/admin/reports/engagement
- [x] GET /api/admin/reports/moderation
- [x] GET /api/admin/reports/subscriptions
- [x] GET /api/admin/reports/export/:reportType

**Total: 48 endpoints**

## Security Checklist

- [x] Authentication required for all protected endpoints
- [x] Role-based access control implemented
- [x] Permission checks on sensitive operations
- [x] Rate limiting on all endpoints
- [x] Input validation on all endpoints
- [x] Audit logging for sensitive operations
- [x] CORS configured
- [x] Helmet security headers
- [x] Password hashing
- [x] JWT token authentication
- [x] SQL injection prevention (parameterized queries)
- [x] XSS protection

## Common Issues & Solutions

### Issue: Database connection failed
**Solution:**
- Check PostgreSQL is running
- Verify DB credentials in .env
- Check network connectivity

### Issue: Redis connection failed
**Solution:**
- Check Redis is running
- Verify Redis credentials in .env
- Check REDIS_TLS setting

### Issue: 401 Unauthorized
**Solution:**
- Check JWT token is valid
- Ensure Authorization header format: "Bearer <token>"
- Verify token hasn't expired

### Issue: 403 Forbidden
**Solution:**
- Check admin role has required permission
- Review ROLE_PERMISSIONS in types/index.ts
- Verify admin account is active

### Issue: 429 Too Many Requests
**Solution:**
- This is expected for rate limiting
- Wait for rate limit window to reset
- Check rate limit headers in response

### Issue: Validation errors
**Solution:**
- Review request body format
- Check required fields
- Verify data types match schema

## Performance Testing

### Load Test Example (using Apache Bench)
```bash
# Test dashboard endpoint
ab -n 1000 -c 10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3010/api/admin/dashboard
```

### Expected Performance
- Dashboard: < 500ms
- User list: < 200ms
- Report generation: < 2s
- CSV export: < 5s

## Monitoring

### Key Metrics to Monitor
1. Response times
2. Error rates
3. Rate limit hits
4. Database connection pool
5. Redis memory usage
6. CPU and memory usage
7. Audit log volume

### Recommended Tools
- Prometheus + Grafana
- New Relic
- DataDog
- ELK Stack (Elasticsearch, Logstash, Kibana)

## Success Criteria

All checks should pass:
- [x] Service starts without errors
- [x] Database connection successful
- [x] Redis connection successful
- [x] All endpoints respond correctly
- [x] Rate limiting works
- [x] Validation works
- [x] Authentication works
- [x] Authorization works
- [x] Audit logging works
- [x] Reports generate correctly
- [x] No TypeScript compilation errors
- [x] No ESLint errors
