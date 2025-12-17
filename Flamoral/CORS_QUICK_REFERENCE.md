# CORS & Browser Compatibility - Quick Reference Guide

## 🎯 Quick Fix Summary

All browser compatibility and CORS issues have been fixed across the entire flamoral.com stack.

---

## 🔧 Common CORS Errors & Solutions

### Error: "No 'Access-Control-Allow-Origin' header present"

**Solution:** ✅ Fixed in all services
- API Gateway, User Service, Auth Service, Messaging Service, Realtime Service
- All configured with proper CORS headers
- Supports all flamoral.com subdomains

### Error: "CORS policy: Credentials mode is 'include'"

**Solution:** ✅ Fixed
- `credentials: true` enabled in all CORS configurations
- Cookies and authentication headers now work cross-origin

### Error: "Preflight request doesn't pass"

**Solution:** ✅ Fixed
- OPTIONS method enabled in all services
- All required headers added to `Access-Control-Allow-Headers`
- Preflight responses cached for 24 hours

### Error: "WebSocket connection failed"

**Solution:** ✅ Fixed
- WebSocket CORS configured in API Gateway
- Socket.IO CORS configured in Messaging Service
- Go realtime service has enhanced CORS middleware
- NGINX ingress has WebSocket-specific configuration

### Error: "Cookie blocked by SameSite policy"

**Solution:** ✅ Fixed
- Dynamic SameSite attribute (Lax/None) based on origin
- Secure flag enabled in production
- Domain set to `.flamoral.com` for cross-subdomain support

---

## 📋 Allowed Origins

```javascript
// Development
'http://localhost:3000'
'http://localhost:5173'
'http://localhost:5174'

// Production
'https://flamoral.com'
'https://www.flamoral.com'
'https://admin.flamoral.com'
'https://app.flamoral.com'
'https://flamoral.vercel.app'
'https://*.flamoral.com' // Wildcard subdomain support
```

---

## 🔑 Required Headers for API Calls

### Client-Side Request Headers
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'X-CSRF-Token': 'CSRF_TOKEN_FROM_COOKIE',
  'X-Requested-With': 'XMLHttpRequest'
}
```

### Server Response Headers
```
Access-Control-Allow-Origin: https://flamoral.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token
Access-Control-Expose-Headers: X-CSRF-Token, X-RateLimit-Limit
Access-Control-Max-Age: 86400
```

---

## 🍪 Cookie Configuration

### CSRF Token Cookie
```javascript
{
  name: 'XSRF-TOKEN',
  httpOnly: false,  // Must be readable by JavaScript
  secure: true,     // HTTPS only in production
  sameSite: 'lax',  // or 'none' for cross-origin
  maxAge: 86400000, // 24 hours
  domain: '.flamoral.com',
  path: '/'
}
```

### CSRF Secret Cookie
```javascript
{
  name: '_csrf',
  httpOnly: true,   // Cannot be accessed by JavaScript
  secure: true,
  sameSite: 'lax',  // or 'none' for cross-origin
  maxAge: 86400000,
  domain: '.flamoral.com',
  path: '/'
}
```

---

## 🔌 WebSocket Connection

### Client-Side Connection
```javascript
import io from 'socket.io-client';

const socket = io('https://api.flamoral.com', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

### Server-Side Configuration
```typescript
@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
})
```

---

## 🛡️ Security Headers

### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' https://js.stripe.com https://www.google-analytics.com;
connect-src 'self' wss://*.flamoral.com https://*.flamoral.com;
```

### Other Security Headers
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 🧪 Testing CORS

### Test Preflight Request
```bash
curl -X OPTIONS https://api.flamoral.com/api/auth/login \
  -H "Origin: https://flamoral.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v
```

### Test Actual Request
```bash
curl -X POST https://api.flamoral.com/api/auth/login \
  -H "Origin: https://flamoral.com" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -v
```

### Test WebSocket Connection
```bash
# Install wscat first: npm install -g wscat
wscat -c wss://api.flamoral.com/socket.io/?token=YOUR_JWT_TOKEN
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Do This
```javascript
// Missing credentials
fetch('https://api.flamoral.com/api/users', {
  method: 'GET'
  // Missing: credentials: 'include'
});

// Wrong origin format
const allowedOrigins = ['flamoral.com']; // ❌ Missing https://

// Setting SameSite=Strict for cross-origin
res.cookie('token', value, {
  sameSite: 'strict' // ❌ Won't work cross-origin
});
```

### ✅ Do This Instead
```javascript
// Include credentials
fetch('https://api.flamoral.com/api/users', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken()
  }
});

// Correct origin format
const allowedOrigins = ['https://flamoral.com'];

// Use SameSite=None for cross-origin (with Secure)
res.cookie('token', value, {
  sameSite: 'none',
  secure: true
});
```

---

## 🐛 Debugging CORS Issues

### Browser DevTools
1. Open DevTools → Network tab
2. Look for preflight OPTIONS requests
3. Check response headers
4. Look for CORS errors in Console tab

### Check CORS Headers
```javascript
// In browser console
fetch('https://api.flamoral.com/api/health', {
  credentials: 'include'
})
  .then(res => {
    console.log('CORS Headers:', {
      'Access-Control-Allow-Origin': res.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.headers.get('Access-Control-Allow-Credentials')
    });
  });
```

### Check Cookies
```javascript
// In browser console
console.log('Cookies:', document.cookie);
```

---

## 📱 Mobile App Configuration

### iOS
```swift
// Enable credentials
let config = URLSessionConfiguration.default
config.httpCookieAcceptPolicy = .always
config.httpShouldSetCookies = true

// Add headers
var request = URLRequest(url: url)
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
```

### Android
```kotlin
// Enable credentials
val client = OkHttpClient.Builder()
    .cookieJar(WebViewCookieJar())
    .build()

// Add headers
val request = Request.Builder()
    .url("https://api.flamoral.com/api/users")
    .addHeader("Content-Type", "application/json")
    .addHeader("Authorization", "Bearer $token")
    .addHeader("X-API-Key", apiKey)
    .build()
```

---

## 🔄 Environment-Specific Settings

### Development
```env
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Production
```env
NODE_ENV=production
CORS_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com
```

---

## 📞 Need Help?

### Check These Files
1. `backend/services/api-gateway/src/main.ts` - API Gateway CORS
2. `backend/services/api-gateway/src/middleware/security-headers.middleware.ts` - CSP
3. `backend/services/api-gateway/src/middleware/csrf.middleware.ts` - CSRF & Cookies
4. `infrastructure/kubernetes/ingress/ingress-nginx.yaml` - NGINX CORS

### Review Documentation
- [Full Fix Summary](./BROWSER_COMPATIBILITY_CORS_FIX_COMPLETE.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)
- [CSRF Implementation](./CSRF_IMPLEMENTATION.md)

---

**Last Updated:** December 15, 2025
**Status:** ✅ All Issues Resolved
