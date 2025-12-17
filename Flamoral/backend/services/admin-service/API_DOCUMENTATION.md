# Admin Service API Documentation

## Overview
The Admin Service provides comprehensive administrative capabilities for the Flamoral dating platform, including user management, analytics, moderation, and system health monitoring.

**Base URL:** `http://localhost:3010/api/admin`

## Authentication

All endpoints (except `/auth/login`) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login as an admin user.

**Request Body:**
```json
{
  "email": "admin@flamoral.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "uuid",
      "email": "admin@flamoral.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "lastLogin": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /auth/logout
Logout current admin user.

#### POST /auth/password-reset/request
Request password reset link.

#### POST /auth/password-reset/confirm
Confirm password reset with token.

#### POST /auth/password/change
Change password (authenticated).

#### GET /auth/session
Verify current session.

---

### Admin Management

#### GET /admins
List all administrators.

**Query Parameters:**
- `role` - Filter by role
- `isActive` - Filter by active status
- `search` - Search by name or email
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Permissions Required:** ADMIN role

#### GET /admins/stats
Get admin statistics.

#### GET /admins/:adminId
Get admin details by ID.

#### POST /admins
Create new admin.

**Permissions Required:** SUPER_ADMIN role

**Request Body:**
```json
{
  "email": "newadmin@flamoral.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "moderator",
  "password": "secure_password"
}
```

#### PUT /admins/:adminId
Update admin details.

**Permissions Required:** SUPER_ADMIN role

#### POST /admins/:adminId/deactivate
Deactivate an admin.

**Permissions Required:** SUPER_ADMIN role

#### POST /admins/:adminId/reactivate
Reactivate an admin.

**Permissions Required:** SUPER_ADMIN role

#### DELETE /admins/:adminId
Delete an admin (soft delete).

**Permissions Required:** SUPER_ADMIN role

#### GET /admins/:adminId/permissions
Get admin permissions.

---

### Dashboard

#### GET /dashboard
Get dashboard overview statistics.

**Query Parameters:**
- `range` - Time range: 'today', 'week', 'month' (default: 'today')

**Permissions Required:** ANALYTICS_VIEW

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 10000,
      "activeUsers": 5000,
      "newUsersToday": 50,
      "premiumUsers": 2000,
      "totalMatches": 50000,
      "matchesToday": 200,
      "revenue": {
        "today": 1500,
        "month": 45000,
        "total": 500000
      }
    },
    "activities": []
  }
}
```

---

### User Management

#### GET /users
Search and list users.

**Query Parameters:**
- `search` - Search term
- `filter` - Filter: 'all', 'verified', 'premium', 'banned', 'reported'
- `page` - Page number
- `limit` - Items per page

**Permissions Required:** USER_VIEW

#### GET /users/:userId
Get detailed user information.

**Permissions Required:** USER_VIEW

#### POST /users/:userId/ban
Ban a user.

**Permissions Required:** USER_BAN

**Request Body:**
```json
{
  "reason": "Violation of terms",
  "duration": 86400
}
```

#### POST /users/:userId/unban
Unban a user.

**Permissions Required:** USER_BAN

#### POST /users/:userId/verify
Verify a user.

**Permissions Required:** USER_EDIT

#### DELETE /users/:userId
Delete a user (soft delete).

**Permissions Required:** USER_DELETE

**Request Body:**
```json
{
  "reason": "User requested deletion"
}
```

#### POST /users/:userId/reset-password
Reset user password.

**Permissions Required:** USER_EDIT

---

### System Health

#### GET /health
Get system health status.

**Permissions Required:** HEALTH_VIEW

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": [],
    "database": { "status": "up", "connections": 5, "latency": 10 },
    "redis": { "status": "up", "memory": 1024000, "latency": 5 },
    "metrics": { "cpu": 45.5, "memory": 60.2, "disk": 0 }
  }
}
```

#### GET /health/services/:serviceName/logs
Get service logs.

**Permissions Required:** HEALTH_VIEW

#### POST /health/services/:serviceName/restart
Restart a service.

**Permissions Required:** HEALTH_MANAGE, ADMIN role

---

### A/B Tests

#### GET /ab-tests
List A/B tests.

**Query Parameters:**
- `status` - Filter by status
- `page` - Page number
- `limit` - Items per page

**Permissions Required:** AB_TEST_VIEW

#### GET /ab-tests/:testId
Get A/B test details.

**Permissions Required:** AB_TEST_VIEW

#### POST /ab-tests
Create new A/B test.

**Permissions Required:** AB_TEST_CREATE

**Request Body:**
```json
{
  "name": "Homepage Button Test",
  "description": "Testing different CTA button colors",
  "variants": [
    {
      "name": "Control",
      "description": "Blue button",
      "allocation": 50
    },
    {
      "name": "Variant A",
      "description": "Red button",
      "allocation": 50
    }
  ],
  "metrics": {
    "primaryMetric": "click_through_rate",
    "secondaryMetrics": ["time_on_page", "bounce_rate"]
  }
}
```

#### PUT /ab-tests/:testId
Update A/B test.

**Permissions Required:** AB_TEST_EDIT

#### POST /ab-tests/:testId/start
Start A/B test.

**Permissions Required:** AB_TEST_EDIT

#### POST /ab-tests/:testId/pause
Pause A/B test.

**Permissions Required:** AB_TEST_EDIT

#### POST /ab-tests/:testId/complete
Complete A/B test.

**Permissions Required:** AB_TEST_EDIT

**Request Body:**
```json
{
  "results": {
    "winner": "variant_id",
    "confidence": 95,
    "summary": "Variant A performed 15% better"
  }
}
```

#### DELETE /ab-tests/:testId
Delete A/B test.

**Permissions Required:** AB_TEST_DELETE

#### GET /ab-tests/:testId/metrics
Get A/B test metrics.

**Permissions Required:** AB_TEST_VIEW

---

### Support Tickets

#### GET /tickets
List support tickets.

**Query Parameters:**
- `status` - Filter by status
- `priority` - Filter by priority
- `assignedTo` - Filter by assigned admin
- `page` - Page number
- `limit` - Items per page

**Permissions Required:** TICKET_VIEW

#### GET /tickets/stats
Get ticket statistics.

**Permissions Required:** TICKET_VIEW

#### GET /tickets/:ticketId
Get ticket details.

**Permissions Required:** TICKET_VIEW

#### POST /tickets/:ticketId/assign
Assign ticket to current admin.

**Permissions Required:** TICKET_RESPOND

#### POST /tickets/:ticketId/messages
Add message to ticket.

**Permissions Required:** TICKET_RESPOND

**Request Body:**
```json
{
  "content": "Thank you for contacting support...",
  "attachments": []
}
```

#### PUT /tickets/:ticketId/status
Update ticket status.

**Permissions Required:** TICKET_CLOSE

**Request Body:**
```json
{
  "status": "resolved"
}
```

#### PUT /tickets/:ticketId/priority
Update ticket priority.

**Permissions Required:** TICKET_RESPOND

**Request Body:**
```json
{
  "priority": "high"
}
```

---

### Audit Logs

#### GET /audit-logs
Query audit logs.

**Query Parameters:**
- `adminId` - Filter by admin ID
- `action` - Filter by action type
- `resource` - Filter by resource type
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `page` - Page number
- `limit` - Items per page

**Permissions Required:** AUDIT_VIEW

---

### Reports & Analytics

#### GET /reports/overview
Get overview statistics.

**Permissions Required:** ANALYTICS_VIEW

#### GET /reports/users
Get user growth report.

**Query Parameters:**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Permissions Required:** ANALYTICS_VIEW

#### GET /reports/revenue
Get revenue report.

**Query Parameters:**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Permissions Required:** REVENUE_VIEW

#### GET /reports/engagement
Get engagement report.

**Permissions Required:** ANALYTICS_VIEW

#### GET /reports/moderation
Get moderation report.

**Permissions Required:** ANALYTICS_VIEW

#### GET /reports/subscriptions
Get subscription report.

**Permissions Required:** ANALYTICS_VIEW

#### GET /reports/export/:reportType
Export report as CSV.

**Path Parameters:**
- `reportType` - Type: 'users', 'revenue', 'engagement', 'moderation', 'subscriptions'

**Query Parameters:**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Permissions Required:** ANALYTICS_EXPORT

---

## Admin Roles

### Hierarchy (from highest to lowest)
1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - Administrative access
3. **MODERATOR** - Content moderation
4. **SUPPORT** - User support
5. **ANALYST** - Analytics and reporting

### Permissions by Role

**SUPER_ADMIN:** All permissions

**ADMIN:**
- User management (view, edit, ban)
- Content moderation
- Reports handling
- Analytics
- Settings management
- Revenue viewing
- A/B test management
- Ticket management
- Audit log viewing
- System health viewing

**MODERATOR:**
- User viewing
- Content moderation
- Reports handling
- Ticket management

**SUPPORT:**
- User viewing
- Ticket management
- Content viewing

**ANALYST:**
- Analytics viewing and export
- Revenue viewing
- User viewing
- A/B test viewing

---

## Rate Limiting

- **Strict:** 5 requests per 15 minutes (login, password reset)
- **Standard:** 60 requests per minute (write operations)
- **Lenient:** 120 requests per minute (read operations)

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Security Features

1. **JWT Authentication** - Secure token-based authentication
2. **Role-Based Access Control (RBAC)** - Granular permissions system
3. **Rate Limiting** - Protection against abuse
4. **Audit Logging** - All admin actions logged
5. **Input Validation** - All inputs validated using express-validator
6. **Password Hashing** - Secure password storage
7. **CORS Protection** - Configured CORS policies
8. **Helmet** - Security headers

---

## Notes

- All timestamps are in ISO 8601 format
- All IDs are UUIDs
- Pagination is 1-indexed
- Date ranges default to last 30 days if not specified
- Soft deletes are used for users and admins (data retained for 30 days)
- Audit logs are retained for 90 days
