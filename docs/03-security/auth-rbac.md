# Authentication & Role-Based Access Control

## Authentication Flow

### Registration

```
1. Client submits: email, password, date_of_birth, country, consents
2. Server validates:
   - Email format and uniqueness
   - Password strength (min 10 chars, complexity)
   - Age >= 18 from date_of_birth
   - Consents for terms and privacy = true
3. Server creates user with hashed password (bcrypt, cost 12)
4. Server sends verification email
5. Server returns access_token + refresh_token
```

### Login

```
1. Client submits: email, password
2. Server validates credentials
3. Rate limiting: 10 attempts per minute per IP/email
4. On success:
   - Generate access_token (JWT, 15 min expiry)
   - Generate refresh_token (opaque, 7 day expiry, stored hashed)
   - Create session record
5. On failure:
   - Log attempt with IP, user agent
   - Increment failure counter
   - After 5 failures: temporary lockout (15 min)
```

### Token Refresh

```
1. Client submits: refresh_token
2. Server validates:
   - Token exists and not revoked
   - Token not expired
   - User account active
3. On success:
   - Rotate refresh token (old one invalidated)
   - Issue new access_token
4. On failure:
   - Revoke all user sessions (potential token theft)
```

### Logout

```
1. Client submits: (authenticated request)
2. Server:
   - Revokes current refresh_token
   - Adds access_token to denylist (until expiry)
   - Updates session end time
```

## Token Structure

### Access Token (JWT)

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "role": "user|moderator|admin|support",
    "plan": "free|plus|premium",
    "iat": 1234567890,
    "exp": 1234568790,
    "jti": "unique_token_id"
  }
}
```

### Refresh Token

- Opaque, random 256-bit value
- Stored as bcrypt hash in database
- Includes: user_id, device_id, created_at, expires_at

## Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Standard user | Own profile, discovery, messaging, reports |
| `moderator` | Content moderator | View reports, take actions, view cases |
| `support` | Customer support | View user accounts, reset passwords, adjust subscriptions |
| `admin` | Full access | All permissions, system configuration |

## Permission Matrix

### User Endpoints

| Endpoint | user | moderator | support | admin |
|----------|------|-----------|---------|-------|
| GET /profile/me | Yes | Yes | Yes | Yes |
| PUT /profile/me | Own | Own | Own | Own |
| GET /discovery/feed | Yes | Yes | Yes | Yes |
| POST /discovery/like | Yes | Yes | Yes | Yes |
| GET /conversations | Yes | Yes | Yes | Yes |
| POST /reports | Yes | Yes | Yes | Yes |

### Moderation Endpoints

| Endpoint | user | moderator | support | admin |
|----------|------|-----------|---------|-------|
| GET /moderation/cases | No | Assigned | No | All |
| POST /moderation/actions | No | Yes | No | Yes |
| GET /moderation/queue | No | Yes | No | Yes |

### Support Endpoints

| Endpoint | user | moderator | support | admin |
|----------|------|-----------|---------|-------|
| GET /support/user/:id | No | No | Yes | Yes |
| POST /support/password-reset | No | No | Yes | Yes |
| POST /support/subscription-adjust | No | No | Yes | Yes |

### Admin Endpoints

| Endpoint | user | moderator | support | admin |
|----------|------|-----------|---------|-------|
| GET /admin/users | No | No | No | Yes |
| POST /admin/users/:id/ban | No | No | No | Yes |
| GET /admin/system/config | No | No | No | Yes |
| POST /admin/system/config | No | No | No | Yes |

## Authorization Implementation

### Middleware Chain

```typescript
// Order matters
app.use(
  rateLimiter,           // 1. Rate limit
  extractToken,          // 2. Extract JWT from header
  validateToken,         // 3. Verify signature and expiry
  loadUser,              // 4. Load user from database
  checkRole,             // 5. Verify required role
  checkResourceOwner,    // 6. Verify ownership (for user resources)
  handler                // 7. Actual handler
);
```

### Resource Ownership Check

```typescript
// Every user resource access must verify ownership
async function checkResourceOwner(req, res, next) {
  const resource = await getResource(req.params.id);

  if (!resource) {
    return res.status(404).json({ code: 'NOT_FOUND' });
  }

  if (resource.owner_id !== req.user.id && req.user.role === 'user') {
    return res.status(403).json({ code: 'FORBIDDEN' });
  }

  req.resource = resource;
  next();
}
```

## Session Management

### Session Record

```sql
CREATE TABLE user_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  end_reason VARCHAR(50)
);
```

### Session Controls

- View active sessions: `GET /auth/sessions`
- End specific session: `DELETE /auth/sessions/:id`
- End all sessions: `DELETE /auth/sessions` (except current)
- Sessions auto-expire after 30 days of inactivity

## Password Security

### Requirements
- Minimum 10 characters
- At least one uppercase, lowercase, number
- Not in common password list
- Not containing email or name

### Storage
- bcrypt with cost factor 12
- Salt automatically included

### Reset Flow
1. Request reset: `POST /auth/password-reset`
2. Server sends email with token (expires 1 hour)
3. Complete reset: `POST /auth/password-reset/complete`
4. All existing sessions invalidated

## Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
```

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 10 | 1 minute |
| POST /auth/register | 5 | 1 hour |
| POST /auth/password-reset | 3 | 1 hour |
| POST /auth/refresh | 30 | 1 minute |

## Audit Logging

All auth events logged:
- Login success/failure
- Logout
- Token refresh
- Password change
- Password reset request
- Session termination
- Role change

Log format:
```json
{
  "event_type": "auth.login_success",
  "user_id": "...",
  "ip_address": "...",
  "user_agent": "...",
  "correlation_id": "...",
  "timestamp": "..."
}
```
