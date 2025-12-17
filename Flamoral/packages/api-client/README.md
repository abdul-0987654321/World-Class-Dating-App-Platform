# Flamoral API Client Package

React Query hooks and HTTP client for Flamoral dating platform.

## Features

- HTTP client with retry logic and error handling
- CSRF token protection
- JWT authentication with automatic token refresh
- Exponential backoff for failed requests
- TypeScript support with full type safety
- React Query hooks for common operations
- File upload with progress tracking
- Optimistic updates for better UX

## Installation

```bash
npm install @flamoral/react-api-client
# or
yarn add @flamoral/react-api-client
# or
pnpm add @flamoral/react-api-client
```

## Quick Start

### 1. Initialize the API Client

```typescript
import { initApiClient, QueryClient, QueryClientProvider } from '@flamoral/react-api-client';

// Initialize API client
initApiClient({
  baseURL: 'https://api.flamoral.com',
  retries: 3,
  retryDelay: 1000,
  getToken: () => localStorage.getItem('auth_token'),
  refreshToken: async () => {
    // Your token refresh logic
    const response = await fetch('/auth/refresh', { method: 'POST' });
    const { token } = await response.json();
    localStorage.setItem('auth_token', token);
    return token;
  },
  onTokenExpired: () => {
    window.location.href = '/login';
  }
});

// Create React Query client
const queryClient = new QueryClient();

// Wrap your app
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

### 2. Use React Query Hooks

```typescript
import { useCurrentUser, useUpdateProfile } from '@flamoral/react-api-client';

function Profile() {
  const { data: user, isLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => updateProfile.mutate({ bio: 'New bio' })}>
        Update
      </button>
    </div>
  );
}
```

### 3. Direct API Calls

```typescript
import { getApiClient } from '@flamoral/react-api-client';

async function fetchData() {
  const client = getApiClient();
  const data = await client.get('/api/endpoint');
  return data;
}
```

## Key Features

### Automatic Retry Logic

Requests that fail with transient errors (503, 500, network issues) are automatically retried with exponential backoff:

- 1st retry: after 1 second
- 2nd retry: after 2 seconds
- 3rd retry: after 4 seconds

```typescript
initApiClient({
  baseURL: '...',
  retries: 3,          // Number of retry attempts
  retryDelay: 1000,    // Initial delay in ms
});
```

### CSRF Protection

CSRF tokens are automatically:
- Fetched on client initialization
- Included in all mutation requests (POST, PUT, PATCH, DELETE)
- Refreshed when invalid

No manual CSRF handling required!

### JWT Token Refresh

When a request fails with 401 (unauthorized):
1. Automatically calls `refreshToken()` function
2. Retries the original request with new token
3. Queues other requests during refresh
4. Falls back to `onTokenExpired()` if refresh fails

```typescript
initApiClient({
  refreshToken: async () => {
    // Your token refresh logic
    const newToken = await refreshMyToken();
    return newToken;
  },
  onTokenExpired: () => {
    // Redirect to login
  }
});
```

### Error Handling

All errors follow a consistent format:

```typescript
interface ApiError {
  message: string;      // Human-readable error message
  code: string;         // Error code (e.g., 'UNAUTHORIZED')
  status: number;       // HTTP status code
  details?: any;        // Additional error details
  isRetryable: boolean; // Whether error can be retried
}
```

### File Uploads

Upload files with progress tracking:

```typescript
import { getApiClient } from '@flamoral/react-api-client';

const client = getApiClient();
await client.upload(
  '/users/me/photos',
  file,
  (progress) => console.log(`${progress}%`)
);
```

## Available Hooks

### User Hooks
- `useCurrentUser()` - Get current user profile
- `useUser(userId)` - Get user by ID
- `useUserPreferences()` - Get user preferences
- `useUpdateProfile()` - Update user profile
- `useUpdatePreferences()` - Update preferences
- `useUploadPhoto()` - Upload profile photo
- `useDeletePhoto()` - Delete profile photo
- `useReorderPhotos()` - Reorder profile photos
- `useBlockUser()` - Block a user
- `useUnblockUser()` - Unblock a user
- `useReportUser()` - Report a user

### Matching Hooks
- `useRecommendations()` - Get profile recommendations
- `useSwipe()` - Swipe on a profile (like/pass/super like)
- `useMatches(filter?)` - Get matches list
- `useLikes()` - Get received likes
- `useUnmatch()` - Unmatch with user
- `useUndoSwipe()` - Undo last swipe
- `useBoostProfile()` - Boost profile visibility
- `useMatchingStats()` - Get matching statistics

### Message Hooks
- `useConversations(unreadOnly?)` - Get conversations list
- `useConversation(id)` - Get conversation by ID
- `useMessages(conversationId)` - Get messages for conversation
- `useSendMessage()` - Send a message
- `useMarkAsRead()` - Mark messages as read
- `useDeleteMessage()` - Delete a message
- `useReactToMessage()` - React to a message (emoji)
- `useUnreadCount()` - Get total unread count
- `useMuteConversation()` - Mute/unmute conversation

## API Reference

### HTTP Methods

```typescript
const client = getApiClient();

// GET request
await client.get<ResponseType>('/endpoint');

// POST request
await client.post<ResponseType>('/endpoint', data);

// PUT request
await client.put<ResponseType>('/endpoint', data);

// PATCH request
await client.patch<ResponseType>('/endpoint', data);

// DELETE request
await client.delete<ResponseType>('/endpoint');

// File upload with progress
await client.upload<ResponseType>('/endpoint', file, onProgress);
```

### Configuration Options

```typescript
interface ApiClientConfig {
  baseURL: string;                              // API base URL
  timeout?: number;                             // Request timeout (default: 30000ms)
  retries?: number;                             // Retry attempts (default: 3)
  retryDelay?: number;                          // Initial retry delay (default: 1000ms)
  getToken?: () => string | null;               // Get JWT token
  refreshToken?: () => Promise<string | null>;  // Refresh JWT token
  onTokenExpired?: () => void;                  // Token expiration callback
  onError?: (error: ApiError) => void;          // Global error handler
}
```

## Documentation

- [Installation Guide](./INSTALL.md) - How to install the new client
- [API Client Fixes](./API_CLIENT_FIXES.md) - Detailed information about fixes
- [Usage Examples](./USAGE_EXAMPLES.md) - Comprehensive usage examples
- [TypeScript Types](./src/index.ts) - Full type definitions

## Backend Requirements

Your backend must support:

1. **CSRF Endpoint**: `GET /auth/csrf-token`
   ```json
   { "csrfToken": "token-value" }
   ```

2. **CSRF Validation**: Check `X-CSRF-Token` header on mutations

3. **Token Refresh** (optional): `POST /auth/refresh`
   ```json
   { "token": "new-jwt-token" }
   ```

4. **Consistent Error Format**:
   ```json
   {
     "message": "Error description",
     "code": "ERROR_CODE",
     "details": {}
   }
   ```

## Migration from Old Client

See [INSTALL.md](./INSTALL.md) for step-by-step migration instructions.

The new client is **100% backward compatible**. You can:
1. Install it without breaking existing code
2. Gradually adopt new features
3. Keep using existing hooks and methods

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Development mode (watch for changes)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT

## Support

For issues or questions:
- GitHub Issues: [flamoral/api-client](https://github.com/flamoral/api-client)
- Email: support@flamoral.com
