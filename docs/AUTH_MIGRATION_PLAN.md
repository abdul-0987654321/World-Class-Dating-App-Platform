# Authentication Migration Plan: localStorage to httpOnly Cookies

## Executive Summary

This document outlines the migration plan for moving JWT token storage from localStorage (vulnerable to XSS) to httpOnly cookies (secure from JavaScript access). This is a critical security improvement for production deployment.

## Current State (Vulnerable)

### How Tokens Are Currently Stored

```typescript
// Frontend: apps/web-app/src/services/auth.service.ts
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);
```

### Security Risks

1. **XSS Vulnerability**: Any XSS attack can steal tokens via `document.cookie` or `localStorage`
2. **Token Theft**: Malicious scripts can read and exfiltrate tokens
3. **Session Hijacking**: Stolen tokens enable full account takeover
4. **No Automatic Expiry**: localStorage tokens persist until manually cleared

## Target State (Secure)

### httpOnly Cookie Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│   API Gateway   │────▶│   User Service  │
│  (No token      │     │  (Cookie →      │     │  (JWT verify)   │
│   access)       │     │   Header)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │ httpOnly cookies sent automatically
        ▼
   Secure, SameSite=Strict
```

## Implementation Plan

### Phase 1: Backend Changes (Week 1)

#### 1.1 Update User Service Auth Controller

```typescript
// backend/services/user-service/src/api/controllers/auth.controller.ts

// Login response: Set cookies instead of returning tokens
res.cookie('accessToken', tokens.accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
  domain: process.env.COOKIE_DOMAIN || undefined,
});

res.cookie('refreshToken', tokens.refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth/refresh', // Only sent to refresh endpoint
  domain: process.env.COOKIE_DOMAIN || undefined,
});

res.json({ success: true, user: userData });
```

#### 1.2 Add Cookie Parser Middleware

```typescript
// backend/services/user-service/src/index.ts
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

#### 1.3 Update Auth Middleware

```typescript
// backend/services/user-service/src/api/middleware/auth.middleware.ts
export const authMiddleware = (req, res, next) => {
  // Try header first (for API clients), then cookie
  let token = req.headers.authorization?.replace('Bearer ', '');

  if (!token && req.cookies) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Verify token...
};
```

#### 1.4 Add CSRF Protection

Since we're using cookies, we need CSRF protection:

```typescript
// Install: npm install csurf
import csrf from 'csurf';

// Apply to state-changing routes
const csrfProtection = csrf({ cookie: true });
app.use('/api/v1/auth', csrfProtection);

// Add CSRF token endpoint
app.get('/api/v1/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

#### 1.5 Update Logout

```typescript
// Clear cookies on logout
res.clearCookie('accessToken', { path: '/', domain: process.env.COOKIE_DOMAIN });
res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh', domain: process.env.COOKIE_DOMAIN });
```

### Phase 2: API Gateway Changes (Week 1)

#### 2.1 Cookie to Header Conversion

```typescript
// backend/services/api-gateway/src/middleware/cookie-to-header.middleware.ts
@Injectable()
export class CookieToHeaderMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.headers.authorization && req.cookies?.accessToken) {
      req.headers.authorization = `Bearer ${req.cookies.accessToken}`;
    }
    next();
  }
}
```

#### 2.2 Preserve Cookies in Proxy

```typescript
// Ensure cookies are forwarded to backend services
const response = await axios.get(url, {
  headers: { ...headers, Cookie: req.headers.cookie },
  withCredentials: true,
});
```

### Phase 3: Frontend Changes (Week 2)

#### 3.1 Update Auth Service

```typescript
// apps/web-app/src/services/auth.service.ts

class AuthService {
  private csrfToken: string | null = null;

  async login(email: string, password: string): Promise<User> {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    }, {
      withCredentials: true, // Include cookies
    });

    // No token storage - cookies are automatic
    return response.user;
  }

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout', {}, {
      withCredentials: true,
    });
    // Cookies are cleared by server
  }

  async getCsrfToken(): Promise<string> {
    if (!this.csrfToken) {
      const response = await apiClient.get('/api/csrf-token', {
        withCredentials: true,
      });
      this.csrfToken = response.csrfToken;
    }
    return this.csrfToken;
  }

  // Check auth status by calling protected endpoint
  async isAuthenticated(): Promise<boolean> {
    try {
      await apiClient.get('/api/auth/me', { withCredentials: true });
      return true;
    } catch {
      return false;
    }
  }
}
```

#### 3.2 Update API Client

```typescript
// apps/web-app/src/services/api.client.ts

const apiClient = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true, // Always send cookies
});

// Add CSRF token to mutating requests
apiClient.interceptors.request.use(async (config) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
    const csrfToken = await authService.getCsrfToken();
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Handle 401 by redirecting to login
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### 3.3 Remove localStorage Token Handling

```typescript
// DELETE all of these:
// localStorage.setItem('accessToken', ...);
// localStorage.getItem('accessToken');
// localStorage.removeItem('accessToken');
```

### Phase 4: Mobile App Considerations

For React Native mobile apps, continue using secure storage (not affected):

```typescript
// Mobile uses SecureStore (iOS Keychain / Android Keystore)
import * as SecureStore from 'expo-secure-store';

// Keep existing implementation for mobile
await SecureStore.setItemAsync('accessToken', token);
```

### Phase 5: Testing & Rollout (Week 3)

#### 5.1 Test Cases

1. **Login Flow**
   - Verify cookies are set with correct attributes
   - Verify no tokens in response body
   - Verify CSRF token is generated

2. **Authenticated Requests**
   - Verify cookies are sent automatically
   - Verify CSRF token is validated
   - Verify 401 on expired tokens

3. **Token Refresh**
   - Verify refresh token cookie is only sent to refresh endpoint
   - Verify new access token cookie is set after refresh

4. **Logout**
   - Verify all cookies are cleared
   - Verify subsequent requests fail with 401

5. **Security Tests**
   - Verify XSS cannot access tokens
   - Verify CSRF attacks are blocked
   - Verify cookies are not sent cross-origin

#### 5.2 Rollout Strategy

1. **Canary Release**: Deploy to 5% of users
2. **Monitor**: Watch for auth failures, error rates
3. **Gradual Rollout**: 25% → 50% → 100%
4. **Fallback**: Feature flag to revert to localStorage if needed

## Configuration

### Environment Variables

```env
# Cookie configuration
COOKIE_DOMAIN=.flamoral.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# CSRF configuration
CSRF_SECRET=<random-32-char-secret>
```

### CORS Configuration

```typescript
// Ensure CORS allows credentials
cors({
  origin: ['https://flamoral.com', 'https://app.flamoral.com'],
  credentials: true,
});
```

## Backwards Compatibility

During migration, support both methods:

```typescript
// Auth middleware supports both
const token =
  req.headers.authorization?.replace('Bearer ', '') ||
  req.cookies?.accessToken;
```

This allows gradual frontend migration while backend serves both old and new clients.

## Security Checklist

- [ ] httpOnly flag set on all auth cookies
- [ ] Secure flag set (HTTPS only in production)
- [ ] SameSite=Strict to prevent CSRF
- [ ] CSRF token validation on all mutating requests
- [ ] Cookie domain scoped appropriately
- [ ] Refresh token path restricted to refresh endpoint
- [ ] Short access token expiry (15 minutes)
- [ ] Longer refresh token expiry (7 days)
- [ ] Clear cookies on logout
- [ ] No tokens in URL parameters
- [ ] No tokens in response bodies after migration

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Backend | Cookie auth, CSRF protection |
| 2 | Frontend | API client updates, remove localStorage |
| 3 | Testing | Security testing, canary release |
| 4 | Rollout | Full production deployment |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing sessions | Use feature flag, gradual rollout |
| CORS issues | Thorough testing in staging |
| CSRF attacks | Implement CSRF tokens before removing localStorage |
| Mobile app impact | Mobile apps use SecureStore, not affected |

## Success Metrics

- Zero XSS token theft attempts successful
- No increase in auth error rates
- CSRF attack attempts blocked
- All security checklist items verified
