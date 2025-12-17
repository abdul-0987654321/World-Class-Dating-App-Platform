# Admin Dashboard Architecture
## flamoral.com - Complete System Overview

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    apps/web-app/src/                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Admin Pages                             │  │
│  │                                                            │  │
│  │  • AdminDashboardPage.tsx       (Overview & Stats)       │  │
│  │  • AdminUsersPage.tsx           (User Management)        │  │
│  │  • AdminModerationPage.tsx      (Content Moderation)     │  │
│  │  • AdminVerificationsPage.tsx   (Photo Verification)     │  │
│  │  • AdminReportsPage.tsx         (User Reports)           │  │
│  │  • AdminAnalyticsPage.tsx       (Analytics & Metrics)    │  │
│  │  • AdminRevenuePage.tsx         (Revenue Dashboard)      │  │
│  │  • AdminSettingsPage.tsx        (System Settings)        │  │
│  │  • AdminSystemHealthPage.tsx    (Health Monitoring)      │  │
│  │  • AdminABTestsPage.tsx         (A/B Testing)            │  │
│  │  • AdminSupportTicketsPage.tsx  (Support Tickets)        │  │
│  │  • AdminAuditLogsPage.tsx       (Audit Logs)             │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│                   HTTP Requests with JWT                         │
│                            ↓                                     │
└─────────────────────────────────────────────────────────────────┘
                             ↓
                 GET /api/v1/api/admin/*
                 Authorization: Bearer <JWT>
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                 │
│              backend/services/api-gateway/                       │
│                      Port: 4000                                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Controllers Layer                               │  │
│  │                                                            │  │
│  │  AdminController                                          │  │
│  │    @Controller('admin')  ← Adds /admin prefix            │  │
│  │                                                            │  │
│  │    Routes:                                                │  │
│  │    • GET    /users           → List users                │  │
│  │    • GET    /users/:id       → User details              │  │
│  │    • POST   /users/:id/ban   → Ban user                  │  │
│  │    • GET    /dashboard       → Dashboard stats           │  │
│  │    • GET    /health          → System health             │  │
│  │    • GET    /ab-tests        → A/B tests                 │  │
│  │    • GET    /tickets         → Support tickets           │  │
│  │    • GET    /audit-logs      → Audit logs                │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Middleware Layer                                │  │
│  │                                                            │  │
│  │  • JwtAuthGuard          → Verify JWT token              │  │
│  │  • RateLimitGuard        → Rate limiting                 │  │
│  │  • CsrfMiddleware        → CSRF protection               │  │
│  │  • SecurityHeaders       → Security headers              │  │
│  │  • TracingMiddleware     → Request tracing               │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Proxy Service                                   │  │
│  │                                                            │  │
│  │  • Circuit Breaker       → Fault tolerance               │  │
│  │  • Retry Logic           → Auto-retry failed requests    │  │
│  │  • Timeout Management    → Request timeouts              │  │
│  │  • Load Balancing        → Distribute load               │  │
│  │                                                            │  │
│  │  Configuration:                                           │  │
│  │    adminService: 'http://localhost:3010'                 │  │
│  │    timeout: 15000ms                                       │  │
│  │    maxRetries: 1                                          │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
└─────────────────────────────────────────────────────────────────┘
                             ↓
              Proxy Request to Admin Service
                 GET /api/admin/users
              Authorization: Bearer <JWT>
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN SERVICE                                │
│            backend/services/admin-service/                       │
│                      Port: 3010                                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Routes Layer                                    │  │
│  │         src/routes/index.ts                               │  │
│  │                                                            │  │
│  │  Express Router: /api/admin                               │  │
│  │                                                            │  │
│  │  Middleware:                                              │  │
│  │    • authenticateAdmin    → Verify admin JWT             │  │
│  │    • requirePermission    → Check permissions            │  │
│  │    • requireRole          → Check admin role             │  │
│  │    • auditLog             → Log admin actions            │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Services Layer                                  │  │
│  │                                                            │  │
│  │  • DashboardService      → Dashboard statistics          │  │
│  │  • UsersService          → User management               │  │
│  │  • HealthService         → System health checks          │  │
│  │  • ABTestService         → A/B test management           │  │
│  │  • TicketsService        → Support ticket management     │  │
│  │  • AuditService          → Audit log management          │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Database Layer                                  │  │
│  │                                                            │  │
│  │  PostgreSQL Database:                                     │  │
│  │    • admins              → Admin users                   │  │
│  │    • audit_logs          → Admin action logs             │  │
│  │    • ab_tests            → A/B tests                      │  │
│  │    • support_tickets     → Support tickets               │  │
│  │    • ticket_messages     → Ticket messages               │  │
│  │                                                            │  │
│  │  Redis Cache:                                             │  │
│  │    • Session storage     → Admin sessions                │  │
│  │    • Rate limiting       → Request rate tracking         │  │
│  │    • Statistics cache    → Cached dashboard stats        │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Example

### GET /api/v1/api/admin/users Request Flow

```
1. Frontend (React)
   ↓
   fetch('/api/admin/users', {
     headers: { 'Authorization': 'Bearer <JWT>' }
   })

2. API Gateway (Port 4000)
   ↓
   Path: /api/v1/api/admin/users
   • Global Prefix: /api/v1 ✓
   • Controller: @Controller('admin') → /admin ✓
   • Route: @Get('users') → /users ✓
   • Combined: /api/v1/api/admin/users ✓

3. Middleware Stack
   ↓
   a. CsrfMiddleware → Check CSRF token
   b. TracingMiddleware → Add request ID
   c. JwtAuthGuard → Verify JWT token
   d. RateLimitGuard → Check rate limits
   e. AdminController.getAllUsers() → Execute handler

4. Proxy Service
   ↓
   ProxyService.get('adminService', '/users', headers)
   • Service URL: http://localhost:3010 (from config)
   • Target Path: /users (NOT /api/admin/users)
   • Circuit Breaker: Check if service is healthy
   • Timeout: 15000ms
   • Retry: Max 1 retry on failure

5. Admin Service (Port 3010)
   ↓
   Express Route: /api/admin/users
   a. authenticateAdmin → Verify JWT and extract admin info
   b. requirePermission(Permission.USER_VIEW) → Check permission
   c. UsersService.searchUsers() → Execute business logic
   d. Database Query → Fetch users from PostgreSQL
   e. auditLog → Log admin action to audit_logs table

6. Response Flow (Reverse)
   ↓
   Admin Service → Proxy Service → API Gateway → Frontend

   Response:
   {
     "success": true,
     "data": {
       "users": [...],
       "total": 1234,
       "page": 1,
       "totalPages": 62
     }
   }
```

---

## Security Architecture

### Authentication Flow

```
┌──────────────┐
│   Frontend   │
│  (Web App)   │
└──────┬───────┘
       │ 1. Login with credentials
       ↓
┌──────────────────────┐
│   Auth Service       │
│   (Port 3001)        │
│                      │
│ • Verify credentials │
│ • Check admin role   │
│ • Generate JWT       │
└──────┬───────────────┘
       │ 2. Return JWT with admin claims
       │    { userId, email, role: 'admin', permissions: [...] }
       ↓
┌──────────────┐
│   Frontend   │
│  Store JWT   │
└──────┬───────┘
       │ 3. All admin requests include JWT
       │    Authorization: Bearer <JWT>
       ↓
┌──────────────────────┐
│   API Gateway        │
│   JwtAuthGuard       │
│                      │
│ • Verify JWT sig     │
│ • Check expiration   │
│ • Extract claims     │
└──────┬───────────────┘
       │ 4. Forward to Admin Service
       ↓
┌──────────────────────┐
│   Admin Service      │
│   authenticateAdmin  │
│                      │
│ • Re-verify JWT      │
│ • Check admin role   │
│ • Check permissions  │
│ • Log action         │
└──────────────────────┘
```

### Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────┐
│                      Admin Roles                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  SUPER_ADMIN                                             │
│    └─ All permissions                                    │
│    └─ System configuration                               │
│    └─ User role management                               │
│                                                           │
│  ADMIN                                                    │
│    └─ User management                                    │
│    └─ Content moderation                                 │
│    └─ Analytics viewing                                  │
│    └─ Settings management                                │
│                                                           │
│  MODERATOR                                                │
│    └─ Content moderation                                 │
│    └─ Report handling                                    │
│    └─ User warnings                                      │
│                                                           │
│  SUPPORT                                                  │
│    └─ Ticket management                                  │
│    └─ User support                                       │
│    └─ View user details                                  │
│                                                           │
│  ANALYST                                                  │
│    └─ Analytics viewing                                  │
│    └─ Report generation                                  │
│    └─ Data export                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Permission Matrix

```
┌──────────────────┬────────┬───────┬────────────┬─────────┬─────────┐
│   Permission     │ Super  │ Admin │ Moderator  │ Support │ Analyst │
│                  │ Admin  │       │            │         │         │
├──────────────────┼────────┼───────┼────────────┼─────────┼─────────┤
│ USER_VIEW        │   ✓    │   ✓   │     ✓      │    ✓    │    ✓    │
│ USER_EDIT        │   ✓    │   ✓   │     ✗      │    ✗    │    ✗    │
│ USER_BAN         │   ✓    │   ✓   │     ✓      │    ✗    │    ✗    │
│ USER_DELETE      │   ✓    │   ✓   │     ✗      │    ✗    │    ✗    │
│ MODERATION_VIEW  │   ✓    │   ✓   │     ✓      │    ✗    │    ✗    │
│ MODERATION_MOD   │   ✓    │   ✓   │     ✓      │    ✗    │    ✗    │
│ REPORT_VIEW      │   ✓    │   ✓   │     ✓      │    ✓    │    ✗    │
│ REPORT_HANDLE    │   ✓    │   ✓   │     ✓      │    ✗    │    ✗    │
│ ANALYTICS_VIEW   │   ✓    │   ✓   │     ✗      │    ✗    │    ✓    │
│ ANALYTICS_EXPORT │   ✓    │   ✓   │     ✗      │    ✗    │    ✓    │
│ SETTINGS_EDIT    │   ✓    │   ✓   │     ✗      │    ✗    │    ✗    │
│ TICKET_VIEW      │   ✓    │   ✓   │     ✗      │    ✓    │    ✗    │
│ TICKET_RESPOND   │   ✓    │   ✓   │     ✗      │    ✓    │    ✗    │
│ AUDIT_VIEW       │   ✓    │   ✓   │     ✗      │    ✗    │    ✗    │
│ HEALTH_MANAGE    │   ✓    │   ✗   │     ✗      │    ✗    │    ✗    │
└──────────────────┴────────┴───────┴────────────┴─────────┴─────────┘
```

---

## Database Schema

### Admin Tables

```sql
-- Admins table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin', 'moderator', 'support', 'analyst'))
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    changes JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_audit_admin (admin_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_resource (resource),
    INDEX idx_audit_created (created_at)
);

-- A/B tests table
CREATE TABLE ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    variants JSONB NOT NULL,
    metrics JSONB NOT NULL,
    results JSONB,
    winner_variant VARCHAR(100),
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'paused', 'completed'))
);

-- Support tickets table
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    assigned_to UUID REFERENCES admins(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,

    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed'))
);

-- Ticket messages table
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_name VARCHAR(200),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_sender_type CHECK (sender_type IN ('user', 'admin', 'system'))
);
```

---

## Configuration Files

### API Gateway Configuration

**File:** `backend/services/api-gateway/src/config/configuration.ts`

```typescript
services: {
  adminService: process.env.ADMIN_SERVICE_URL || 'http://localhost:3010',
  // ... other services
},

serviceTimeouts: {
  default: 15000,
  admin: 15000,  // Admin operations timeout
},
```

### API Gateway .env

**File:** `backend/services/api-gateway/.env`

```bash
# Admin Service
ADMIN_SERVICE_URL=http://localhost:3010

# JWT Secrets (shared with admin service)
JWT_SECRET=your-jwt-secret-here
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

### Admin Service .env

**File:** `backend/services/admin-service/.env`

```bash
# Service Configuration
PORT=3010
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/flamoral
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (must match API Gateway)
JWT_SECRET=your-jwt-secret-here
JWT_ACCESS_SECRET=your-access-secret-here

# Internal Service Key
INTERNAL_SERVICE_KEY=your-internal-service-key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

## Port Allocation

```
┌────────────────────┬──────┬─────────────────────────┐
│   Service          │ Port │ Purpose                  │
├────────────────────┼──────┼─────────────────────────┤
│ API Gateway        │ 4000 │ Main entry point        │
│ Auth Service       │ 3001 │ Authentication          │
│ User Service       │ 3002 │ User management         │
│ Messaging Service  │ 3003 │ Messages & chat         │
│ Media Service      │ 3004 │ Media uploads           │
│ Payment Service    │ 3005 │ Payments & billing      │
│ Moderation Service │ 3006 │ Content moderation      │
│ Analytics Service  │ 3007 │ Analytics & metrics     │
│ Matching Service   │ 3008 │ Matching algorithm      │
│ Notification Svc   │ 3009 │ Push notifications      │
│ Admin Service      │ 3010 │ Admin dashboard         │
│ Advertising Svc    │ 3011 │ Ads management          │
│ Realtime Service   │ 8081 │ WebSocket/real-time     │
│ AI Service         │ 8000 │ ML/AI processing        │
│ Redis              │ 6379 │ Cache & sessions        │
│ PostgreSQL         │ 5432 │ Database                │
└────────────────────┴──────┴─────────────────────────┘
```

---

## Performance Considerations

### Circuit Breaker Configuration

```typescript
circuitBreaker: {
  failureThreshold: 5,        // Open after 5 failures
  timeout: 15000,             // Wait 15s before retry
  successThreshold: 5,        // 5 successes to close
  minimumRequests: 5,         // Min requests before evaluation
}
```

### Timeout Hierarchy

```
NGINX Timeout (60s)
    └─ API Gateway Timeout (30s)
        └─ Admin Service Timeout (15s)
            └─ Database Timeout (10s)
```

### Caching Strategy

```
┌────────────────────────┬──────────┬────────────────┐
│   Data Type            │ Duration │ Storage        │
├────────────────────────┼──────────┼────────────────┤
│ Dashboard statistics   │ 5 min    │ Redis          │
│ User list (paginated)  │ 1 min    │ Redis          │
│ System health          │ 30 sec   │ Redis          │
│ A/B test results       │ 10 min   │ Redis          │
│ Audit logs (recent)    │ 2 min    │ Redis          │
└────────────────────────┴──────────┴────────────────┘
```

---

## Deployment Architecture

### Development
```
Local Machine
├─ PostgreSQL (Docker)
├─ Redis (Docker)
├─ Admin Service (Port 3010)
├─ API Gateway (Port 4000)
└─ Web App (Port 5173)
```

### Staging / Production
```
Azure Cloud
├─ Azure PostgreSQL Database
├─ Azure Cache for Redis
├─ Azure Container Instances
│   ├─ Admin Service (Container)
│   ├─ API Gateway (Container)
│   └─ Other Services (Containers)
└─ Azure Static Web Apps (Frontend)
    └─ CDN (Global Distribution)
```

---

## Monitoring & Observability

### Metrics to Track

```
Service Health:
  • Request rate (req/sec)
  • Error rate (%)
  • Response time (p50, p95, p99)
  • Circuit breaker state

Admin Activity:
  • Admin logins
  • Actions performed
  • Failed auth attempts
  • Audit log volume

Business Metrics:
  • User bans/day
  • Content moderated/day
  • Tickets resolved/day
  • A/B test results
```

### Logging

```
Admin Service Logs:
  • Admin authentication events
  • Permission denied events
  • All admin actions (audit)
  • Service errors

API Gateway Logs:
  • Request/response logs
  • Circuit breaker events
  • Rate limit violations
  • Timeout events
```

---

## Best Practices

### Security
- ✅ Always use HTTPS in production
- ✅ Implement strict CORS policies
- ✅ Log all admin actions
- ✅ Use strong JWT secrets
- ✅ Implement MFA for admin accounts
- ✅ Regular security audits

### Performance
- ✅ Cache dashboard statistics
- ✅ Use pagination for large lists
- ✅ Implement request deduplication
- ✅ Use connection pooling
- ✅ Monitor slow queries

### Reliability
- ✅ Use circuit breakers
- ✅ Implement retries with backoff
- ✅ Set appropriate timeouts
- ✅ Handle partial failures gracefully
- ✅ Regular health checks

---

## References

- [Admin Dashboard Fix Report](./ADMIN_DASHBOARD_FIX_REPORT.md)
- [Quick Start Guide](./ADMIN_FIX_QUICK_START.md)
- [Complete Implementation Guide](./ADMIN_DASHBOARD_COMPLETE.md)
- [API Gateway Configuration](./backend/services/api-gateway/README.md)
- [Admin Service README](./backend/services/admin-service/README.md)

---

**Last Updated:** 2025-12-15
