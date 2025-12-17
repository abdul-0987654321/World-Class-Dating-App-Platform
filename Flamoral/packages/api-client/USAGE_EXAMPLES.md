# API Client Usage Examples

## Basic Setup

### 1. Web App (React)

```typescript
// src/api/client.ts
import { initApiClient } from '@flamoral/react-api-client';

export const apiClient = initApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.flamoral.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,

  // Get JWT token from storage
  getToken: () => {
    return localStorage.getItem('auth_token');
  },

  // Refresh JWT token when expired
  refreshToken: async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Send refresh token cookie
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      return data.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  },

  // Handle token expiration
  onTokenExpired: () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  },

  // Global error handler (optional)
  onError: (error) => {
    console.error('API Error:', {
      code: error.code,
      status: error.status,
      message: error.message,
      isRetryable: error.isRetryable
    });

    // Show user-friendly error messages
    if (error.status === 503) {
      // Show "Service temporarily unavailable" message
      showToast('Service temporarily unavailable. Please try again.');
    } else if (error.status === 429) {
      showToast('Too many requests. Please wait a moment.');
    } else if (!error.isRetryable) {
      showToast(error.message);
    }
  }
});
```

### 2. Mobile App (React Native)

```typescript
// src/api/client.ts
import { initApiClient } from '@flamoral/react-api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiClient = initApiClient({
  baseURL: 'https://api.flamoral.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,

  getToken: async () => {
    return await AsyncStorage.getItem('auth_token');
  },

  refreshToken: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) return null;

      const response = await fetch('https://api.flamoral.com/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();
      await AsyncStorage.setItem('auth_token', data.token);
      return data.token;
    } catch (error) {
      return null;
    }
  },

  onTokenExpired: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
    // Navigate to login screen
    navigationRef.navigate('Login');
  },

  onError: (error) => {
    if (error.status === 503) {
      Alert.alert('Service Unavailable', 'Please try again in a few moments.');
    }
  }
});
```

## Usage with React Query Hooks

### Using Built-in Hooks

```typescript
import { useCurrentUser, useUpdateProfile } from '@flamoral/react-api-client';

function ProfileScreen() {
  // Fetch current user
  const { data: user, isLoading, error } = useCurrentUser();

  // Update profile mutation
  const updateProfile = useUpdateProfile();

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        name: 'New Name',
        bio: 'Updated bio'
      });
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### Direct API Client Usage

```typescript
import { getApiClient } from '@flamoral/react-api-client';

// Direct API calls (without React Query)
async function fetchUserProfile(userId: string) {
  const client = getApiClient();

  try {
    const user = await client.get<User>(`/users/${userId}`);
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}

async function updateUserProfile(data: Partial<User>) {
  const client = getApiClient();

  try {
    const updatedUser = await client.patch<User>('/users/me', data);
    return updatedUser;
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}
```

## Advanced Usage

### Custom Error Handling per Request

```typescript
import { getApiClient } from '@flamoral/react-api-client';

async function importantOperation() {
  const client = getApiClient();

  try {
    // This request will use the retry logic
    const result = await client.post('/api/important-operation', {
      data: 'critical'
    });
    return result;
  } catch (error) {
    // Check if error is retryable
    if (error.isRetryable) {
      console.log('Operation failed after retries');
      // Show user option to retry manually
    } else {
      console.log('Operation failed permanently');
      // Show error message
    }
    throw error;
  }
}
```

### File Upload with Progress

```typescript
import { getApiClient } from '@flamoral/react-api-client';

async function uploadPhoto(file: File) {
  const client = getApiClient();

  try {
    const photo = await client.upload<Photo>(
      '/users/me/photos',
      file,
      (progress) => {
        console.log(`Upload progress: ${progress}%`);
        updateProgressBar(progress);
      }
    );

    console.log('Photo uploaded:', photo);
    return photo;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### Using with React Query (Custom Hook)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@flamoral/react-api-client';

// Custom hook for a specific feature
export function useCustomFeature() {
  const client = getApiClient();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customFeature'],
    queryFn: () => client.get<FeatureData>('/api/custom-feature'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: (params: FeatureParams) =>
      client.post<FeatureResult>('/api/custom-feature', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFeature'] });
    },
  });

  return {
    data,
    isLoading,
    error,
    trigger: mutation.mutate,
    triggerAsync: mutation.mutateAsync,
  };
}
```

### CSRF Token Management

```typescript
import { getApiClient } from '@flamoral/react-api-client';

// Get current CSRF token
function getCurrentCsrfToken() {
  const client = getApiClient();
  return client.getCsrfToken();
}

// Manually refresh CSRF token (rarely needed)
async function refreshCsrfToken() {
  const client = getApiClient();
  await client.refreshCsrfToken();
  console.log('CSRF token refreshed');
}

// CSRF token is automatically:
// 1. Fetched on client initialization
// 2. Included in all POST/PUT/PATCH/DELETE requests
// 3. Refreshed on 403 errors with code CSRF_TOKEN_INVALID
```

### Environment-Specific Configuration

```typescript
// config/api.ts
import { ApiClientConfig } from '@flamoral/react-api-client';

export const getApiConfig = (): ApiClientConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    baseURL: isProduction
      ? 'https://api.flamoral.com'
      : 'http://localhost:3000',
    timeout: isProduction ? 30000 : 60000, // Longer timeout in dev
    retries: isProduction ? 3 : 1, // Less retries in dev
    retryDelay: 1000,
    getToken: () => localStorage.getItem('auth_token'),
    refreshToken: isProduction ? refreshTokenProd : refreshTokenDev,
    onTokenExpired: handleTokenExpired,
    onError: isProduction ? logErrorToSentry : logErrorToConsole,
  };
};

// Initialize with environment-specific config
initApiClient(getApiConfig());
```

## Testing

### Mock API Client for Tests

```typescript
import { initApiClient } from '@flamoral/react-api-client';

// Test setup
beforeAll(() => {
  initApiClient({
    baseURL: 'http://localhost:3001/api', // Test API server
    timeout: 5000,
    retries: 0, // No retries in tests
    getToken: () => 'test-token',
    onTokenExpired: jest.fn(),
  });
});

// Test example
test('fetches user profile', async () => {
  const client = getApiClient();
  const user = await client.get<User>('/users/me');
  expect(user.email).toBe('test@example.com');
});
```

## Troubleshooting

### CSRF Token Issues

If you see CSRF token errors:

1. Ensure backend has `/auth/csrf-token` endpoint
2. Check that cookies are being sent (`withCredentials: true`)
3. Verify CSRF token is in `X-CSRF-Token` header
4. Check browser console for errors during token fetch

```typescript
// Debug CSRF token
const client = getApiClient();
console.log('Current CSRF token:', client.getCsrfToken());
```

### Retry Logic Not Working

If retries aren't happening:

1. Check error status code is retryable (408, 429, 500, 502, 503, 504)
2. Verify `retries` config is > 0
3. Check browser console for retry attempts

```typescript
// Debug retry logic
onError: (error) => {
  console.log('Error status:', error.status);
  console.log('Is retryable:', error.isRetryable);
}
```

### Token Refresh Issues

If token refresh isn't working:

1. Ensure `refreshToken` function is provided
2. Check that it returns a valid token or null
3. Verify refresh endpoint is working
4. Check browser console for refresh errors

```typescript
// Debug token refresh
refreshToken: async () => {
  console.log('Attempting token refresh...');
  try {
    const newToken = await refreshTokenLogic();
    console.log('Token refreshed successfully');
    return newToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}
```
