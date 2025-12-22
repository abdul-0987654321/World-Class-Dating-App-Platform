# Frontend Error Handling Guide

**Last Updated:** 2025-12-21
**Version:** 1.0.0

---

This document explains how errors are handled in the Flamoral web and mobile applications.

## Overview

The frontend error handling system consists of:

1. **API Client** - Catches errors and transforms them into `ApiError` objects
2. **Global Error Handler** - Provides default behavior for each error type
3. **Component-Level Handlers** - Allow customization for specific use cases
4. **UI Components** - Display appropriate error states to users

---

## The Global Error Handler

### How It Works

The API client (`apps/web-app/src/services/api.client.ts`) automatically catches all HTTP errors:

```typescript
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// In the request method:
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new ApiError(
    errorData.message || `Request failed with status ${response.status}`,
    response.status,
    errorData
  );
}
```

### Default UX Behavior by Status Code

| HTTP Status | UX Behavior | Implementation |
|-------------|-------------|----------------|
| 400 | Show inline validation errors | Display `details.validation_errors` on form fields |
| 401 | Redirect to login | Clear tokens, redirect to `/login` |
| 402 | Show upgrade modal | Open subscription modal with plan options |
| 403 | Show access denied | Display error message, stay on page |
| 404 | Show not found | Display "not found" state or redirect |
| 429 | Show rate limit | Display countdown using `retry_after` |
| 500+ | Show generic error | Toast notification, log to Sentry |

---

## Handling 402 Payment Required Errors

The `useUpgradeModal` hook provides standardized handling for subscription-gated features:

### Usage

```tsx
import { useUpgradeModal } from '../hooks/useUpgradeModal';

function DiscoveryPage() {
  const { upgradeModalState, closeUpgradeModal, wrapApiCall } = useUpgradeModal();

  const handleSuperLike = async (userId: string) => {
    try {
      await wrapApiCall(
        () => discoveryService.superLike(userId),
        'super_like'  // Feature name for analytics
      );
      // Success handling
    } catch (error) {
      // Non-402 errors handled here
      if (error instanceof ApiError && error.status !== 402) {
        showToast('error', error.message);
      }
    }
  };

  return (
    <>
      <button onClick={() => handleSuperLike(userId)}>Super Like</button>
      <UpgradeModal
        isOpen={upgradeModalState.isOpen}
        onClose={closeUpgradeModal}
        feature={upgradeModalState.feature}
        message={upgradeModalState.message}
        requiredTier={upgradeModalState.requiredTier}
      />
    </>
  );
}
```

### Hook Implementation

The hook extracts plan information from the error response:

```typescript
const handleApiError = useCallback((error: unknown): boolean => {
  if (error instanceof ApiError && error.status === 402) {
    const errorData = error.data as Record<string, unknown> | undefined;
    const feature = (errorData?.feature as string) || undefined;
    const message = (errorData?.message as string) || error.message;
    const requiredTier = (errorData?.requiredTier as string) || 'GOLD';

    showUpgradeModal(feature, message, requiredTier);
    return true;  // Error was handled
  }
  return false;  // Error not handled
}, [showUpgradeModal]);
```

---

## Handling Form Validation Errors

### Displaying Validation Errors

When a 400 error contains validation details, display them inline:

```tsx
interface FormErrors {
  [field: string]: string;
}

function ProfileForm() {
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = async (data: ProfileData) => {
    try {
      await profileService.update(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const errorData = error.data as { details?: { validation_errors?: string[] } };

        // Parse validation errors into field-specific errors
        const fieldErrors: FormErrors = {};
        errorData.details?.validation_errors?.forEach((msg) => {
          // Extract field name from message like "bio must be at most 2000 characters"
          const field = msg.split(' ')[0];
          fieldErrors[field] = msg;
        });

        setErrors(fieldErrors);
      } else {
        throw error;  // Re-throw non-validation errors
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="bio" />
      {errors.bio && <span className="error">{errors.bio}</span>}

      <input name="display_name" />
      {errors.display_name && <span className="error">{errors.display_name}</span>}

      <button type="submit">Save</button>
    </form>
  );
}
```

---

## Handling 401 Unauthorized Errors

The API client includes automatic token refresh for CSRF errors. For authentication errors:

```typescript
// In the axios interceptor (packages/api-client/src/client.ts)
this.client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      this.config.onTokenExpired?.();
    }
    return Promise.reject(apiError);
  }
);
```

### Configuring Token Expiration Handler

```typescript
const apiClient = initApiClient({
  baseURL: API_BASE_URL,
  getToken: () => localStorage.getItem('authToken'),
  onTokenExpired: () => {
    // Clear stored tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');

    // Redirect to login
    window.location.href = '/login?expired=true';
  },
  onError: (error) => {
    // Global error handler
    console.error('API Error:', error);
    Sentry.captureException(error);
  },
});
```

---

## Toasts vs Full-Page Errors

### When to Use Toasts

Use toast notifications for:
- Transient errors that don't block the user
- Rate limit warnings
- Network errors with retry option
- Success confirmations

```tsx
import { useToast } from '../hooks/useToast';

function MatchCard({ userId }) {
  const { showToast } = useToast();

  const handleLike = async () => {
    try {
      await discoveryService.like(userId);
      showToast('success', 'Liked!');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 429) {
          const retryAfter = (error.data as any)?.retry_after;
          showToast('warning', `Rate limited. Try again in ${retryAfter} seconds`);
        } else if (error.status >= 500) {
          showToast('error', 'Something went wrong. Please try again.');
        }
      }
    }
  };
}
```

### When to Use Full-Page Errors

Use full-page error states for:
- 404 Not Found (resource doesn't exist)
- 403 Forbidden (no access to page)
- Critical errors that prevent page function

```tsx
function ProfilePage({ userId }) {
  const [error, setError] = useState<ApiError | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    profileService.getById(userId)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err);
        }
      });
  }, [userId]);

  if (error?.status === 404) {
    return <NotFoundPage message="This profile doesn't exist" />;
  }

  if (error?.status === 403) {
    return <AccessDeniedPage message="You don't have access to this profile" />;
  }

  if (error) {
    return <ErrorPage error={error} onRetry={() => window.location.reload()} />;
  }

  return <ProfileDetails profile={profile} />;
}
```

---

## Customizing Error Display

### Error Boundary Component

Wrap sections of your app in error boundaries:

```tsx
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Custom Error Messages by Feature

Create a mapping for user-friendly messages:

```typescript
const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  discovery: {
    LIKE_LIMIT_EXCEEDED: "You've used all your likes today. Upgrade to get unlimited likes!",
    RATE_LIMITED: "Slow down! Take a moment before swiping again.",
  },
  messaging: {
    MESSAGE_LIMIT_EXCEEDED: "You're sending messages too fast. Wait a moment.",
    BLOCKED_USER: "You can't message this person.",
  },
  profile: {
    VALIDATION_ERROR: "Please fix the highlighted fields.",
    PAYLOAD_TOO_LARGE: "This photo is too large. Try a smaller one.",
  },
};

function getErrorMessage(feature: string, code: string, fallback: string): string {
  return ERROR_MESSAGES[feature]?.[code] || fallback;
}
```

---

## Correlation ID for Debugging

Include correlation IDs in error reports:

```tsx
function ErrorDisplay({ error }: { error: ApiError }) {
  const correlationId = (error.data as any)?.correlation_id;

  return (
    <div className="error-display">
      <p>{error.message}</p>
      {correlationId && (
        <small className="correlation-id">
          Reference: {correlationId}
        </small>
      )}
    </div>
  );
}
```

---

## Best Practices

### Do:
- Always catch errors from API calls
- Show user-friendly messages
- Include retry options for transient errors
- Log errors with correlation IDs
- Handle 402 errors with upgrade prompts

### Don't:
- Show technical error messages to users
- Ignore 401 errors (always handle auth)
- Block the entire app on recoverable errors
- Forget to handle loading and error states
- Expose stack traces in production

---

## Related Documentation

- [Main Error Handling Guide](../errors.md)
- [Error Codes Reference](./error-codes.md)
- [Backend Integration Guide](./backend-integration.md)
- [API Error Contract](./api-contract.md)
