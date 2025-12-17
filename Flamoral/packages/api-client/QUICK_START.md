# Quick Start Guide

## 1. Install the Fixed Client (30 seconds)

```bash
cd src
copy client.ts client.ts.backup
copy client-new.ts client.ts
```

## 2. Update Your App's Initialization (2 minutes)

```typescript
import { initApiClient } from '@flamoral/react-api-client';

initApiClient({
  baseURL: 'https://api.flamoral.com',
  retries: 3,
  retryDelay: 1000,

  getToken: () => localStorage.getItem('auth_token'),

  refreshToken: async () => {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    const { token } = await response.json();
    localStorage.setItem('auth_token', token);
    return token;
  },

  onTokenExpired: () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  },

  onError: (error) => {
    if (error.status === 503) {
      console.log('Service temporarily unavailable');
    }
  }
});
```

## 3. Implement Backend CSRF Endpoint (5 minutes)

```javascript
// Express.js example
app.get('/auth/csrf-token', (req, res) => {
  const token = req.csrfToken(); // Using csurf middleware
  res.json({ csrfToken: token });
});

// Validate CSRF on mutations
app.post('/api/*', (req, res, next) => {
  const token = req.headers['x-csrf-token'];
  if (!isValidCsrfToken(token)) {
    return res.status(403).json({
      code: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token'
    });
  }
  next();
});
```

## 4. Test It Works

```typescript
// Test CSRF protection
await client.post('/api/test', { data: 'test' });
// Should automatically include X-CSRF-Token header

// Test retry logic
// Temporarily return 503 from backend
await client.get('/api/endpoint-that-returns-503');
// Should retry 3 times before failing

// Test token refresh
// Make token expire, then make request
await client.get('/api/protected-endpoint');
// Should refresh token and retry automatically
```

## Done!

Your API client now has:
- Automatic CSRF protection
- Retry logic for transient failures
- JWT token refresh
- Better error handling
- Full TypeScript support

## Need Help?

- Full documentation: See `README.md`
- Usage examples: See `USAGE_EXAMPLES.md`
- Detailed fixes: See `API_CLIENT_FIXES.md`
- Installation: See `INSTALL.md`

## What Changed?

Before:
```typescript
// Manual error handling
// No retry logic
// No CSRF protection
// No token refresh
```

After:
```typescript
// Automatic retry on 503 errors
// Auto CSRF token handling
// Auto token refresh on 401
// Better error messages
```

## Configuration Reference

```typescript
interface ApiClientConfig {
  baseURL: string;              // Required: API base URL
  timeout?: number;             // Optional: Request timeout (default: 30000)
  retries?: number;             // Optional: Retry attempts (default: 3)
  retryDelay?: number;          // Optional: Initial delay (default: 1000)
  getToken?: () => string | null;              // Optional: Get JWT token
  refreshToken?: () => Promise<string | null>; // Optional: Refresh JWT token
  onTokenExpired?: () => void;                 // Optional: Token expired callback
  onError?: (error: ApiError) => void;         // Optional: Global error handler
}
```

## Backward Compatible

All existing code continues to work:
- Hooks: `useCurrentUser()`, `useMatches()`, etc.
- Direct calls: `client.get()`, `client.post()`, etc.
- Types: `User`, `Match`, `Message`, etc.

No breaking changes!
