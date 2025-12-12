# Console.log Migration Examples

This document provides concrete examples of migrating from console.log to the secure logger.

## Table of Contents

1. [Basic Migrations](#basic-migrations)
2. [Service File Examples](#service-file-examples)
3. [Component Examples](#component-examples)
4. [API/Network Examples](#apinetwork-examples)
5. [Error Handling Examples](#error-handling-examples)

---

## Basic Migrations

### Simple Logging

**Before:**
```typescript
console.log('User logged in');
console.info('Profile updated');
console.debug('API response', data);
console.warn('Deprecated feature used');
console.error('Login failed', error);
```

**After:**
```typescript
import logger from '@utils/logger';

logger.info('User logged in');
logger.info('Profile updated');
logger.debug('API response', { data });
logger.warn('Deprecated feature used');
logger.error('Login failed', error);
```

### Logging with Context

**Before:**
```typescript
console.log('Processing payment for user:', userId, 'amount:', amount);
```

**After:**
```typescript
logger.info('Processing payment', { userId, amount });
```

---

## Service File Examples

### Example 1: AgoraService.ts (Video Calling)

**Before:**
```typescript
async initialize(): Promise<void> {
  try {
    this.engine = createAgoraRtcEngine();
    await this.engine.initialize({
      appId: this.appId,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });

    this.setupEventHandlers();
    console.log('Agora initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Agora engine:', error);
    throw error;
  }
}

private setupEventHandlers(): void {
  this.engine.addListener('onUserJoined', (connection, remoteUid, elapsed) => {
    console.log('User joined:', remoteUid);
    this.remoteUsers.add(remoteUid);
    this.emit('user-joined', remoteUid);
  });

  this.engine.addListener('onUserOffline', (connection, remoteUid, reason) => {
    console.log('User offline:', remoteUid, reason);
    this.remoteUsers.delete(remoteUid);
    this.emit('user-left', remoteUid);
  });

  this.engine.addListener('onError', (err, msg) => {
    console.error('Agora error:', err, msg);
    this.emit('error', { err, msg });
  });

  this.engine.addListener('onWarning', (warn, msg) => {
    console.warn('Agora warning:', warn, msg);
  });
}
```

**After:**
```typescript
import logger from '../utils/logger';

async initialize(): Promise<void> {
  try {
    this.engine = createAgoraRtcEngine();
    await this.engine.initialize({
      appId: this.appId,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });

    this.setupEventHandlers();
    logger.info('Agora initialized successfully', { appId: this.appId });
  } catch (error) {
    logger.error('Failed to initialize Agora engine', error as Error);
    throw error;
  }
}

private setupEventHandlers(): void {
  this.engine.addListener('onUserJoined', (connection, remoteUid, elapsed) => {
    logger.debug('User joined call', { remoteUid, elapsed });
    this.remoteUsers.add(remoteUid);
    this.emit('user-joined', remoteUid);
  });

  this.engine.addListener('onUserOffline', (connection, remoteUid, reason) => {
    logger.debug('User left call', { remoteUid, reason });
    this.remoteUsers.delete(remoteUid);
    this.emit('user-left', remoteUid);
  });

  this.engine.addListener('onError', (err, msg) => {
    logger.error('Agora SDK error', new Error(msg), { errorCode: err });
    this.emit('error', { err, msg });
  });

  this.engine.addListener('onWarning', (warn, msg) => {
    logger.warn('Agora SDK warning', { warningCode: warn, message: msg });
  });
}
```

### Example 2: WebSocketService.ts (Real-time Messaging)

**Before:**
```typescript
connect(userId: string, token: string): void {
  console.log('Connecting WebSocket for user:', userId);

  this.ws = new WebSocket(`${this.url}?token=${token}`);

  this.ws.onopen = () => {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
  };

  this.ws.onmessage = (event) => {
    console.log('Received message:', event.data);
    const message = JSON.parse(event.data);
    this.handleMessage(message);
  };

  this.ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  this.ws.onclose = () => {
    console.log('WebSocket disconnected');
    this.isConnected = false;
    this.reconnect();
  };
}
```

**After:**
```typescript
import logger from '../utils/logger';

connect(userId: string, token: string): void {
  logger.info('Connecting WebSocket', { userId });

  // Note: token is automatically sanitized if logged
  this.ws = new WebSocket(`${this.url}?token=${token}`);

  this.ws.onopen = () => {
    logger.info('WebSocket connected', { userId });
    this.isConnected = true;
    this.reconnectAttempts = 0;
  };

  this.ws.onmessage = (event) => {
    logger.debug('WebSocket message received', {
      userId,
      messageType: typeof event.data,
    });
    const message = JSON.parse(event.data);
    this.handleMessage(message);
  };

  this.ws.onerror = (error) => {
    logger.error('WebSocket connection error', error as Error, { userId });
  };

  this.ws.onclose = () => {
    logger.warn('WebSocket connection closed', { userId, willReconnect: true });
    this.isConnected = false;
    this.reconnect();
  };
}
```

### Example 3: EncryptionService.ts (Sensitive Operations)

**Before:**
```typescript
async encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
  console.log('Encrypting message for recipient');

  try {
    const encrypted = await crypto.encrypt(message, recipientPublicKey);
    console.log('Message encrypted successfully');
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}

async decryptMessage(encryptedMessage: string, privateKey: string): Promise<string> {
  console.log('Decrypting message');

  try {
    const decrypted = await crypto.decrypt(encryptedMessage, privateKey);
    console.log('Message decrypted:', decrypted); // ❌ NEVER log decrypted content!
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
}
```

**After:**
```typescript
import logger from '../utils/logger';

async encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
  logger.debug('Encrypting message', {
    messageLength: message.length,
    // recipientPublicKey is automatically sanitized
  });

  try {
    const encrypted = await crypto.encrypt(message, recipientPublicKey);
    logger.debug('Message encrypted successfully', {
      encryptedLength: encrypted.length,
    });
    return encrypted;
  } catch (error) {
    logger.error('Message encryption failed', error as Error);
    throw error;
  }
}

async decryptMessage(encryptedMessage: string, privateKey: string): Promise<string> {
  logger.debug('Decrypting message', {
    encryptedLength: encryptedMessage.length,
  });

  try {
    const decrypted = await crypto.decrypt(encryptedMessage, privateKey);
    // ✅ GOOD: Only log metadata, not content
    logger.debug('Message decrypted successfully', {
      decryptedLength: decrypted.length,
    });
    return decrypted;
  } catch (error) {
    logger.error('Message decryption failed', error as Error);
    throw error;
  }
}
```

---

## Component Examples

### Example 1: Login Screen

**Before:**
```typescript
const LoginScreen = () => {
  const handleLogin = async () => {
    console.log('Login attempt');

    try {
      const response = await api.login(email, password);
      console.log('Login successful:', response);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Error', 'Login failed');
    }
  };

  return <View>...</View>;
};
```

**After:**
```typescript
import logger from '@utils/logger';

const LoginScreen = () => {
  const handleLogin = async () => {
    logger.info('Login attempt started', { email }); // email is auto-sanitized

    try {
      const response = await api.login(email, password);
      logger.info('Login successful', { userId: response.userId });
      logger.userAction('Login', { method: 'email' });
      navigation.navigate('Home');
    } catch (error) {
      logger.error('Login failed', error as Error, { email });
      Alert.alert('Error', 'Login failed');
    }
  };

  return <View>...</View>;
};
```

### Example 2: Payment Component

**Before:**
```typescript
const PaymentCheckout = ({ orderId, amount }) => {
  useEffect(() => {
    console.log('Payment checkout mounted', orderId, amount);
  }, []);

  const handlePayment = async (cardDetails) => {
    console.log('Processing payment:', cardDetails);

    try {
      const result = await processPayment(orderId, cardDetails);
      console.log('Payment successful:', result);
      onSuccess(result);
    } catch (error) {
      console.error('Payment failed:', error);
      onError(error);
    }
  };

  return <View>...</View>;
};
```

**After:**
```typescript
import logger from '@utils/logger';

const PaymentCheckout = ({ orderId, amount }) => {
  useEffect(() => {
    logger.info('Payment checkout opened', { orderId, amount });
    logger.userAction('View Checkout', { orderId, amount });
  }, [orderId, amount]);

  const handlePayment = async (cardDetails) => {
    // cardDetails are automatically sanitized (credit_card, cvv, etc.)
    logger.info('Payment processing started', { orderId, amount });

    const startTime = Date.now();

    try {
      const result = await processPayment(orderId, cardDetails);
      const duration = Date.now() - startTime;

      logger.info('Payment successful', {
        orderId,
        amount,
        transactionId: result.transactionId,
      });
      logger.performance('Payment Processing', duration, { orderId });
      logger.userAction('Complete Payment', { orderId, amount });

      onSuccess(result);
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Payment processing failed', error as Error, {
        orderId,
        amount,
        duration,
      });
      logger.userAction('Payment Failed', { orderId, error: (error as Error).message });

      onError(error);
    }
  };

  return <View>...</View>;
};
```

---

## API/Network Examples

### Example 1: API Client

**Before:**
```typescript
class ApiClient {
  async request(method: string, endpoint: string, data?: any) {
    console.log(`${method} ${endpoint}`, data);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      const json = await response.json();
      console.log('API response:', json);

      return json;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}
```

**After:**
```typescript
import logger from '../utils/logger';

class ApiClient {
  async request(method: string, endpoint: string, data?: any) {
    logger.debug('API request started', { method, endpoint });

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      const json = await response.json();
      const duration = Date.now() - startTime;

      logger.network(
        method,
        `${this.baseUrl}${endpoint}`,
        response.status,
        duration,
        {
          success: response.ok,
        }
      );

      return json;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.network(
        method,
        `${this.baseUrl}${endpoint}`,
        0,
        duration,
        {
          error: (error as Error).message,
        }
      );

      logger.error('API request failed', error as Error, {
        method,
        endpoint,
      });

      throw error;
    }
  }
}
```

### Example 2: File Upload

**Before:**
```typescript
async uploadFile(file: File, userId: string) {
  console.log('Uploading file:', file.name, 'for user:', userId);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Upload successful:', result);

    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

**After:**
```typescript
import logger, { startTimer } from '@utils/logger';

async uploadFile(file: File, userId: string) {
  logger.info('File upload started', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    userId,
  });

  const endTimer = startTimer('File Upload');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    endTimer();

    logger.info('File upload successful', {
      fileName: file.name,
      fileSize: file.size,
      fileId: result.fileId,
      userId,
    });

    logger.userAction('Upload File', {
      fileName: file.name,
      fileType: file.type,
    });

    return result;
  } catch (error) {
    endTimer();

    logger.error('File upload failed', error as Error, {
      fileName: file.name,
      fileSize: file.size,
      userId,
    });

    throw error;
  }
}
```

---

## Error Handling Examples

### Example 1: Try-Catch with Context

**Before:**
```typescript
async function fetchUserProfile(userId: string) {
  try {
    const profile = await api.get(`/users/${userId}`);
    console.log('Profile fetched:', profile);
    return profile;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    throw error;
  }
}
```

**After:**
```typescript
import logger from '@utils/logger';

async function fetchUserProfile(userId: string) {
  logger.debug('Fetching user profile', { userId });

  try {
    const profile = await api.get(`/users/${userId}`);
    logger.debug('User profile fetched successfully', { userId });
    return profile;
  } catch (error) {
    logger.error('Failed to fetch user profile', error as Error, {
      userId,
      endpoint: `/users/${userId}`,
    });
    throw error;
  }
}
```

### Example 2: Error Boundary

**Before:**
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }

    return this.props.children;
  }
}
```

**After:**
```typescript
import logger from '@utils/logger';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.fatal('Unhandled error caught by boundary', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }

    return this.props.children;
  }
}
```

### Example 3: Promise Rejection

**Before:**
```typescript
Promise.all([
  fetchUsers(),
  fetchPosts(),
  fetchComments(),
])
  .then(([users, posts, comments]) => {
    console.log('All data fetched', { users, posts, comments });
  })
  .catch(error => {
    console.error('Failed to fetch data:', error);
  });
```

**After:**
```typescript
import logger from '@utils/logger';

const endTimer = startTimer('Fetch All Data');

Promise.all([
  fetchUsers(),
  fetchPosts(),
  fetchComments(),
])
  .then(([users, posts, comments]) => {
    endTimer();
    logger.info('All data fetched successfully', {
      usersCount: users.length,
      postsCount: posts.length,
      commentsCount: comments.length,
    });
  })
  .catch(error => {
    endTimer();
    logger.error('Failed to fetch data', error as Error);
  });
```

---

## Summary

### Key Principles

1. **Always import the logger**: `import logger from '@utils/logger';`
2. **Use appropriate log levels**: debug < info < warn < error < fatal
3. **Provide context**: Include relevant metadata objects
4. **Never log sensitive data directly**: Logger auto-sanitizes, but be mindful
5. **Measure performance**: Use `startTimer()` or `logger.performance()`
6. **Log user actions**: Use `logger.userAction()` for analytics
7. **Log network requests**: Use `logger.network()` for API calls

### Quick Reference

```typescript
// Development only
logger.debug('Debug info', { context });

// General information
logger.info('User action completed', { userId });

// Warnings
logger.warn('Deprecated API used', { endpoint });

// Errors
logger.error('Operation failed', error, { context });

// Critical errors
logger.fatal('System failure', error, { context });

// Performance
logger.performance('Operation Name', durationMs, { context });

// Network
logger.network('GET', '/api/endpoint', 200, durationMs, { context });

// User actions
logger.userAction('Button Clicked', { buttonId });

// Timing
const endTimer = startTimer('Operation');
// ... do work ...
endTimer();
```

---

**Remember:** The automated script (`scripts/replace-console-logs.js`) can handle most basic replacements, but manual review and enhancement is recommended for better context and appropriate log levels.
