# Action Items - API Client Package Fix

## Status: READY FOR INSTALLATION

All fixes have been implemented and documented. Follow these steps to complete the installation.

---

## STEP 1: Install the Fixed Client (REQUIRED)

### Windows
```cmd
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral\packages\api-client\src
copy client.ts client.ts.backup
copy client-new.ts client.ts
```

### Linux/Mac
```bash
cd /path/to/Flamoral/packages/api-client/src
cp client.ts client.ts.backup
cp client-new.ts client.ts
```

**Time**: 30 seconds
**Priority**: CRITICAL

---

## STEP 2: Update Web App Initialization (REQUIRED)

### Location
Find where you initialize the API client (likely in `web/src/api/client.ts` or similar)

### Before
```typescript
import { initApiClient } from '@flamoral/react-api-client';

export const apiClient = initApiClient({
  baseURL: import.meta.env.VITE_API_URL,
  getToken: () => localStorage.getItem('token'),
  onTokenExpired: () => window.location.href = '/login'
});
```

### After
```typescript
import { initApiClient } from '@flamoral/react-api-client';

export const apiClient = initApiClient({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,

  getToken: () => localStorage.getItem('token'),

  refreshToken: async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Token refresh failed');
      const { token } = await response.json();
      localStorage.setItem('token', token);
      return token;
    } catch (error) {
      return null;
    }
  },

  onTokenExpired: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

  onError: (error) => {
    console.error('API Error:', error);
    if (error.status === 503) {
      // Show maintenance message
      toast.error('Service temporarily unavailable. Please try again.');
    }
  }
});
```

**Time**: 2 minutes
**Priority**: HIGH

---

## STEP 3: Update Mobile App Initialization (REQUIRED if using mobile)

### Location
Find where you initialize the API client in your React Native app

### Code
```typescript
import { initApiClient } from '@flamoral/react-api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiClient = initApiClient({
  baseURL: 'https://api.flamoral.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,

  getToken: async () => {
    return await AsyncStorage.getItem('token');
  },

  refreshToken: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) return null;

      const response = await fetch('https://api.flamoral.com/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const { token } = await response.json();
      await AsyncStorage.setItem('token', token);
      return token;
    } catch (error) {
      return null;
    }
  },

  onTokenExpired: async () => {
    await AsyncStorage.multiRemove(['token', 'refresh_token']);
    // Navigate to login screen
  }
});
```

**Time**: 2 minutes
**Priority**: HIGH (if using mobile)

---

## STEP 4: Implement Backend CSRF Endpoint (REQUIRED)

### Node.js/Express Example
```javascript
import csrf from 'csurf';

// Setup CSRF middleware
const csrfProtection = csrf({ cookie: true });

// CSRF token endpoint
app.get('/auth/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Validate CSRF on mutations
app.post('/api/*', csrfProtection, (req, res, next) => {
  // CSRF validation happens automatically via middleware
  next();
});

app.put('/api/*', csrfProtection, (req, res, next) => {
  next();
});

app.patch('/api/*', csrfProtection, (req, res, next) => {
  next();
});

app.delete('/api/*', csrfProtection, (req, res, next) => {
  next();
});

// Error handler for CSRF failures
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      code: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token'
    });
  } else {
    next(err);
  }
});
```

**Time**: 5 minutes
**Priority**: CRITICAL

---

## STEP 5: Implement Token Refresh Endpoint (OPTIONAL but RECOMMENDED)

### Node.js/Express Example
```javascript
app.post('/auth/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        code: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ token: newAccessToken });
  } catch (error) {
    res.status(401).json({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid or expired refresh token'
    });
  }
});
```

**Time**: 10 minutes
**Priority**: HIGH

---

## STEP 6: Test the Implementation (REQUIRED)

### Test CSRF Protection
```bash
# The API client should automatically add X-CSRF-Token header
# Check browser DevTools Network tab for POST requests
```

### Test Retry Logic
```javascript
// Temporarily modify backend to return 503
app.get('/api/test-503', (req, res) => {
  res.status(503).json({ message: 'Service unavailable' });
});

// Then test from frontend
await client.get('/api/test-503');
// Should retry 3 times before failing
```

### Test Token Refresh
```javascript
// Make token expire early, then make a request
localStorage.setItem('token', 'expired-token');
await client.get('/api/protected-endpoint');
// Should automatically refresh token and retry
```

**Time**: 10 minutes
**Priority**: HIGH

---

## STEP 7: Deploy (REQUIRED)

1. **Commit changes**
   ```bash
   git add packages/api-client/
   git commit -m "Fix: Enhanced API client with CSRF, retry logic, and token refresh"
   ```

2. **Deploy to staging**
   - Test all functionality
   - Verify CSRF protection works
   - Verify retries work
   - Verify token refresh works

3. **Deploy to production**

**Time**: Varies
**Priority**: CRITICAL

---

## Checklist

- [ ] Step 1: Install fixed client (copy client-new.ts to client.ts)
- [ ] Step 2: Update web app initialization
- [ ] Step 3: Update mobile app initialization (if applicable)
- [ ] Step 4: Implement backend CSRF endpoint
- [ ] Step 5: Implement token refresh endpoint
- [ ] Step 6: Test the implementation
- [ ] Step 7: Deploy to staging
- [ ] Step 7: Deploy to production

---

## Estimated Total Time

- **Minimum (web only)**: 18 minutes
- **With mobile**: 20 minutes
- **With testing**: 30 minutes
- **With deployment**: 45-60 minutes

---

## Documentation Reference

If you need help with any step:

| Step | See File |
|------|----------|
| Quick overview | `QUICK_START.md` |
| Installation | `INSTALL.md` |
| Configuration examples | `USAGE_EXAMPLES.md` |
| Technical details | `API_CLIENT_FIXES.md` |
| What changed | `BEFORE_AFTER_COMPARISON.md` |
| All files | `COMPLETE_FILE_LIST.md` |

---

## Support

If you encounter issues:

1. Check the documentation files above
2. Verify all steps were completed
3. Check browser console for errors
4. Check backend logs for errors

---

## Success Criteria

You'll know it's working when:

- [ ] No more 503 errors for transient failures
- [ ] CSRF protection prevents attacks
- [ ] Users stay logged in (token refresh works)
- [ ] Better error messages in console
- [ ] All existing features still work

---

## Next Steps After Installation

1. Monitor error logs for any issues
2. Track metrics:
   - Reduction in 503 error tickets
   - Reduction in "logged out" complaints
   - CSRF attack attempts blocked
3. Consider adding more error handling in `onError` callback
4. Consider adding analytics for retry events

---

## Questions?

All fixes are thoroughly documented. Check the documentation files for detailed explanations, examples, and troubleshooting tips.
