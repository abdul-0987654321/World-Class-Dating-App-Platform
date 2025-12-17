# Flamoral Platform - Frontend Connectivity Guide

## Overview

This guide provides comprehensive information about frontend connectivity setup for both the web and mobile applications of the Flamoral Dating Platform. It covers API client configuration, WebSocket connectivity, authentication flows, and troubleshooting.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Web App Connectivity](#web-app-connectivity)
3. [Mobile App Connectivity](#mobile-app-connectivity)
4. [Environment Configuration](#environment-configuration)
5. [API Client Implementation](#api-client-implementation)
6. [WebSocket Configuration](#websocket-configuration)
7. [Authentication Flow](#authentication-flow)
8. [SSL/TLS and Certificate Pinning](#ssltls-and-certificate-pinning)
9. [Error Handling and Retry Logic](#error-handling-and-retry-logic)
10. [Testing Connectivity](#testing-connectivity)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Backend Architecture

The Flamoral platform uses a microservices architecture with:

- **API Gateway** (Port 4000): Main entry point for all frontend requests
  - URL: `https://api.flamoral.com` (production)
  - URL: `http://localhost:4000` (development)

- **Microservices**:
  - Auth Service (3001)
  - User/Profile Service (3002)
  - Matching Service (3003)
  - Messaging Service (3004)
  - Media Service (3006)
  - Payment Service (3007)
  - Notification Service (3008)
  - Moderation Service (3009)

- **WebSocket Server** (Port 5000): Real-time features
  - URL: `wss://api.flamoral.com` (production)
  - URL: `ws://localhost:5000` (development)

### Frontend Applications

1. **Web App** (`apps/web-app/`)
   - Built with React + Vite
   - Uses Fetch API with custom API client
   - Socket.IO for WebSocket connections

2. **Mobile App** (`apps/mobile-app/`)
   - Built with React Native + Expo
   - Uses Axios with custom API client
   - Socket.IO for WebSocket connections
   - Certificate pinning for enhanced security

---

## Web App Connectivity

### API Client Configuration

Location: `apps/web-app/src/services/api.client.ts`

#### Key Features:

1. **Base URL Configuration**
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || '';
   ```

2. **HttpOnly Cookie Authentication**
   - All requests include `credentials: 'include'`
   - Cookies are managed by the browser
   - No token storage in localStorage

3. **Automatic Token Refresh**
   - Detects 401 responses
   - Attempts to refresh token automatically
   - Retries original request after refresh

4. **Error Handling**
   - Custom `ApiError` class
   - Structured error responses
   - Proper error propagation

#### Usage Example:

```typescript
import { apiClient } from '@/services/api.client';

// GET request
const user = await apiClient.get('/api/v1/users/me');

// POST request
const response = await apiClient.post('/api/v1/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

// PUT request
const updated = await apiClient.put('/api/v1/users/profile', profileData);

// DELETE request
await apiClient.delete('/api/v1/users/photo/123');
```

### WebSocket Configuration

Location: `apps/web-app/src/services/socket.service.ts`

#### Features:

1. **Socket.IO Client**
   - Automatic reconnection
   - Fallback to polling
   - Authentication via token

2. **Event Handlers**
   - New messages
   - Typing indicators
   - Online status
   - Match notifications

#### Usage Example:

```typescript
import { socketService } from '@/services/socket.service';

// Connect to socket server
await socketService.connect(authToken);

// Subscribe to messages
const unsubscribe = socketService.onMessage(conversationId, (message) => {
  console.log('New message:', message);
});

// Send message
socketService.sendMessage(conversationId, 'Hello!');

// Send typing indicator
socketService.sendTyping(conversationId, true);

// Cleanup
unsubscribe();
socketService.disconnect();
```

---

## Mobile App Connectivity

### API Client Configuration

Location: `apps/mobile-app/src/api/client.ts`

#### Key Features:

1. **Axios-based Client**
   ```typescript
   const axiosInstance = axios.create({
     baseURL: config.baseURL || 'https://api.flamoral.com',
     timeout: 30000,
   });
   ```

2. **Token-based Authentication**
   - Tokens stored in secure storage (Keychain/Keystore)
   - Authorization header automatically added
   - Token refresh on 401 responses

3. **Request/Response Interceptors**
   - Automatic token injection
   - Error standardization
   - Network error handling

#### API Configuration

Location: `apps/mobile-app/src/services/api/config.ts`

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'https://api.flamoral.com',

  AI_SERVICES: {
    FRAUD_DETECTION: 'https://ai.flamoral.com/fraud',
    NLP_SERVICE: 'https://ai.flamoral.com/nlp',
    PHOTO_ANALYSIS: 'https://ai.flamoral.com/photos',
    RECOMMENDATION: 'https://ai.flamoral.com/recommendations',
  },

  TIMEOUTS: {
    DEFAULT: 30000,
    UPLOAD: 120000,
    AI_ANALYSIS: 60000,
  },

  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
  },
};
```

### WebSocket Configuration

Location: `apps/mobile-app/src/services/realtime/WebSocketService.ts`

#### Features:

1. **Secure Token Storage**
   - Tokens retrieved from AsyncStorage
   - Automatic token refresh

2. **Connection Management**
   - Automatic reconnection
   - Connection state tracking
   - Graceful degradation

3. **Event Types**
   - `message:new` - New message received
   - `message:delivered` - Message delivery confirmation
   - `message:read` - Read receipt
   - `typing:start/stop` - Typing indicators
   - `presence:update` - User online/offline status
   - `match:new` - New match notification

#### Usage Example:

```typescript
import { webSocketService } from '@/services/realtime/WebSocketService';

// Connect
await webSocketService.connect();

// Subscribe to events
const unsubscribe = webSocketService.on('message:new', (data) => {
  console.log('New message:', data.message);
});

// Send message
webSocketService.sendMessage(conversationId, {
  content: 'Hello!',
  type: 'text',
});

// Cleanup
unsubscribe();
webSocketService.disconnect();
```

---

## Environment Configuration

### Web App Environment Variables

#### Development (`.env.development`)
```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:5000
VITE_SOCKET_URL=ws://localhost:5000
VITE_ENABLE_DEBUG=true
```

#### Staging (`.env.staging`)
```env
VITE_API_URL=https://api-staging.flamoral.com
VITE_WS_URL=wss://api-staging.flamoral.com
VITE_SOCKET_URL=wss://api-staging.flamoral.com
VITE_ENABLE_DEBUG=true
```

#### Production (`.env.production`)
```env
VITE_API_URL=https://api.flamoral.com
VITE_WS_URL=wss://api.flamoral.com
VITE_SOCKET_URL=wss://api.flamoral.com
VITE_ENABLE_DEBUG=false
```

### Mobile App Environment Variables

#### Development (`.env`)
```env
API_BASE_URL=http://localhost:4000
WEBSOCKET_URL=ws://localhost:4000
ENABLE_SSL_PINNING=false
DEBUG_MODE=true
```

#### Production (`.env.production`)
```env
API_BASE_URL=https://api.flamoral.com
WEBSOCKET_URL=wss://api.flamoral.com
ENABLE_SSL_PINNING=true
DEBUG_MODE=false
```

---

## API Client Implementation

### Request Flow

```
Frontend App
    ↓
API Client (api.client.ts)
    ↓
HTTP Request (GET/POST/PUT/DELETE/PATCH)
    ↓
API Gateway (port 4000)
    ↓
Microservice Router
    ↓
Specific Microservice
    ↓
Response
    ↓
API Client (error handling, token refresh)
    ↓
Frontend App
```

### Authentication Flow

#### Web App (httpOnly Cookies)

1. **Login**
   ```typescript
   POST /api/v1/auth/login
   Body: { email, password }
   Response: { user, accessToken, refreshToken }
   // Tokens set as httpOnly cookies
   ```

2. **Authenticated Request**
   ```typescript
   GET /api/v1/users/me
   Headers: { credentials: 'include' }
   // Cookies automatically sent
   ```

3. **Token Refresh**
   ```typescript
   POST /api/v1/auth/refresh-token
   Headers: { credentials: 'include' }
   // Uses refreshToken cookie
   Response: { accessToken }
   // New accessToken cookie set
   ```

#### Mobile App (Token Storage)

1. **Login**
   ```typescript
   POST /api/v1/auth/login
   Body: { email, password }
   Response: { user, accessToken, refreshToken }
   // Store tokens in secure storage
   ```

2. **Authenticated Request**
   ```typescript
   GET /api/v1/users/me
   Headers: { Authorization: 'Bearer <accessToken>' }
   ```

3. **Token Refresh**
   ```typescript
   POST /api/v1/auth/refresh
   Body: { refreshToken }
   Response: { accessToken, refreshToken }
   // Update tokens in secure storage
   ```

---

## WebSocket Configuration

### Connection Lifecycle

1. **Initialization**
   ```typescript
   // Retrieve auth token
   const token = await getAuthToken();

   // Connect with authentication
   await socketService.connect(token);
   ```

2. **Event Subscription**
   ```typescript
   // Subscribe to specific conversation
   socketService.joinConversation(conversationId);

   // Listen for messages
   socketService.onMessage(conversationId, handleMessage);
   ```

3. **Event Emission**
   ```typescript
   // Send message
   socketService.sendMessage(conversationId, content);

   // Send typing indicator
   socketService.sendTyping(conversationId, true);
   ```

4. **Cleanup**
   ```typescript
   // Unsubscribe from conversation
   socketService.leaveConversation(conversationId);

   // Disconnect
   socketService.disconnect();
   ```

### WebSocket Events

#### Client → Server

- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a new message
- `typing` - Typing indicator
- `mark_read` - Mark messages as read

#### Server → Client

- `new_message` - New message received
- `message_delivered` - Message delivery confirmation
- `message_read` - Read receipt
- `typing` - User typing notification
- `user_online` - User came online
- `user_offline` - User went offline
- `new_match` - New match notification

---

## SSL/TLS and Certificate Pinning

### Web App (Browser-based SSL)

- SSL/TLS handled by the browser
- Certificate validation automatic
- HTTPS enforced in production

### Mobile App (Certificate Pinning)

#### Why Certificate Pinning?

- Prevents man-in-the-middle (MITM) attacks
- Adds extra layer of security
- Required for sensitive data transmission

#### Implementation

Location: `apps/mobile-app/src/services/api/sslPinning.ts`

```typescript
import { SSL_PINS_API_FLAMORAL } from '@env';

const sslPinningConfig = {
  hostname: 'api.flamoral.com',
  publicKeyHashes: SSL_PINS_API_FLAMORAL.split(','),
};
```

#### Generating SSL Pins

```bash
# Run the SSL pin generation script
cd apps/mobile-app
./scripts/generate-ssl-pins.sh api.flamoral.com

# Output: Base64-encoded SHA256 public key hash
sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```

#### Configuration

In `.env.production`:
```env
SSL_PINS_API_FLAMORAL=sha256/PRIMARY_PIN=,sha256/BACKUP_PIN=
ENABLE_SSL_PINNING=true
```

---

## Error Handling and Retry Logic

### Web App Error Handling

```typescript
try {
  const data = await apiClient.get('/api/v1/users/me');
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/login';
    } else if (error.status === 403) {
      // Forbidden
      showToast('Access denied');
    } else if (error.status >= 500) {
      // Server error
      showToast('Server error. Please try again.');
    }
  }
}
```

### Mobile App Retry Logic

```typescript
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Usage
const data = await retry(() => apiClient.get('/api/v1/users/me'));
```

---

## Testing Connectivity

### Using the Test Script

#### Linux/Mac:
```bash
chmod +x scripts/test-connectivity.sh
./scripts/test-connectivity.sh development
./scripts/test-connectivity.sh staging
./scripts/test-connectivity.sh production
```

#### Windows:
```cmd
scripts\test-connectivity.bat development
scripts\test-connectivity.bat staging
scripts\test-connectivity.bat production
```

### Manual Testing

#### Test API Connectivity:
```bash
# Health check
curl http://localhost:4000/health

# API v1 health
curl http://localhost:4000/api/v1/health

# Test authentication endpoint
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

#### Test WebSocket Connectivity:
```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:5000
```

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors (Web App)

**Symptom:** Browser console shows CORS policy errors

**Solution:**
- Check API Gateway CORS configuration
- Ensure `credentials: 'include'` is set in API client
- Verify `CORS_ORIGINS` includes your frontend URL

**Backend Fix:**
```typescript
// API Gateway
app.use(cors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
}));
```

#### 2. WebSocket Connection Failures

**Symptom:** WebSocket fails to connect or disconnects frequently

**Solution:**
- Verify WebSocket URL is correct
- Check firewall/proxy settings
- Ensure authentication token is valid
- Test with Socket.IO debug mode:

```typescript
const socket = io(socketUrl, {
  auth: { token },
  transports: ['websocket', 'polling'],
  reconnection: true,
  debug: true, // Enable debug logging
});
```

#### 3. SSL Certificate Errors (Mobile)

**Symptom:** Certificate pinning failures, SSL handshake errors

**Solution:**
- Regenerate SSL pins
- Verify certificate hasn't expired
- Check certificate chain
- Disable pinning in development:

```env
# .env.development
ENABLE_SSL_PINNING=false
```

#### 4. 401 Unauthorized Errors

**Symptom:** All authenticated requests fail with 401

**Solution:**
- Check token is being stored correctly
- Verify token hasn't expired
- Test token refresh mechanism
- Clear app cache/storage

**Web App:**
```typescript
// Check if token refresh is working
localStorage.clear();
// Re-login
```

**Mobile App:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear tokens
await AsyncStorage.removeItem('auth_token');
await AsyncStorage.removeItem('refresh_token');
```

#### 5. Network Timeout Errors

**Symptom:** Requests timeout before completing

**Solution:**
- Increase timeout values
- Check network connectivity
- Verify backend services are running
- Test with different timeout settings:

```typescript
// Increase timeout for specific request
apiClient.get('/api/v1/large-data', {
  timeout: 60000, // 60 seconds
});
```

#### 6. Environment Variable Not Loading

**Symptom:** API URL is undefined or incorrect

**Solution:**

**Web App:**
- Restart Vite dev server
- Check `.env` file location
- Verify `VITE_` prefix

**Mobile App:**
- Clear Metro bundler cache: `expo start -c`
- Rebuild native apps
- Check `app.json` configuration

---

## Best Practices

### 1. API Client Usage

✅ **DO:**
- Use the centralized API client
- Handle errors gracefully
- Implement proper loading states
- Add request/response logging in development

❌ **DON'T:**
- Make direct fetch/axios calls
- Store tokens in localStorage (web)
- Ignore error responses
- Skip error boundaries

### 2. WebSocket Management

✅ **DO:**
- Connect on user login
- Disconnect on logout
- Handle reconnection gracefully
- Clean up event listeners

❌ **DON'T:**
- Create multiple socket connections
- Leave listeners attached after unmount
- Ignore connection state
- Send messages when disconnected

### 3. Security

✅ **DO:**
- Use HTTPS in production
- Implement certificate pinning (mobile)
- Validate SSL certificates
- Use secure storage for tokens

❌ **DON'T:**
- Disable SSL verification
- Store secrets in code
- Log sensitive data
- Skip authentication checks

### 4. Performance

✅ **DO:**
- Implement request caching
- Use connection pooling
- Compress request/response data
- Implement lazy loading

❌ **DON'T:**
- Make unnecessary API calls
- Send large payloads
- Skip pagination
- Block the UI thread

---

## Support

For additional help:

- **Documentation:** `docs/`
- **API Reference:** `docs/API_ENDPOINTS_MAP.md`
- **Issues:** GitHub Issues
- **Email:** support@flamoral.com

---

## Related Documentation

- [API Endpoints Map](./API_ENDPOINTS_MAP.md)
- [WebSocket Integration Guide](../WEBSOCKET_INTEGRATION.md)
- [Security Implementation](../SECURITY_IMPLEMENTATION_SUMMARY.md)
- [Environment Setup](../ENVIRONMENT_SETUP_COMPLETE.md)
