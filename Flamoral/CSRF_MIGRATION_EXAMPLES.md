# CSRF Migration Examples

This document shows real examples of migrating existing code to use CSRF protection.

## Example 1: Login Form

### Before (Vulnerable)

```typescript
// LoginForm.tsx
import { useState } from 'react';
import authService from '@/services/auth.service';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Direct fetch without CSRF
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    // Handle response...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### After (Protected) - Method 1: Using apiClient

```typescript
// LoginForm.tsx
import { useState } from 'react';
import apiClient from '@/services/api.client';
import { CsrfProtectedForm } from '@/components/common';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // apiClient automatically adds CSRF token
    const response = await apiClient.post('/api/v1/auth/login', {
      email,
      password,
    }, {
      skipAuth: true, // Login doesn't need auth token
    });

    // Handle response...
  };

  return (
    <CsrfProtectedForm onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </CsrfProtectedForm>
  );
}
```

### After (Protected) - Method 2: Using authService

```typescript
// auth.service.ts - Update the service
async login(email: string, password: string): Promise<LoginResponse> {
  // Use apiClient instead of direct fetch
  const response = await apiClient.post<{ success: boolean; data: LoginResponse }>(
    '/api/v1/auth/login',
    { email, password },
    { skipAuth: true }
  );

  this.saveSession(response.data);
  return response.data;
}

// LoginForm.tsx - Simplified component
import { useState } from 'react';
import authService from '@/services/auth.service';
import { CsrfProtectedForm } from '@/components/common';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Service handles CSRF automatically
    await authService.login(email, password);

    // Handle success...
  };

  return (
    <CsrfProtectedForm onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </CsrfProtectedForm>
  );
}
```

## Example 2: Profile Update Form

### Before (Vulnerable)

```typescript
// ProfileForm.tsx
function ProfileForm({ user }) {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const response = await fetch('/api/v1/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="firstName" defaultValue={user.firstName} />
      <input name="lastName" defaultValue={user.lastName} />
      <input name="bio" defaultValue={user.bio} />
      <button type="submit">Save</button>
    </form>
  );
}
```

### After (Protected)

```typescript
// ProfileForm.tsx
import apiClient from '@/services/api.client';
import { CsrfProtectedForm } from '@/components/common';

function ProfileForm({ user }) {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // apiClient handles both auth token and CSRF
    await apiClient.put('/api/v1/users/me',
      Object.fromEntries(formData)
    );
  };

  return (
    <CsrfProtectedForm onSubmit={handleSubmit}>
      <input name="firstName" defaultValue={user.firstName} />
      <input name="lastName" defaultValue={user.lastName} />
      <input name="bio" defaultValue={user.bio} />
      <button type="submit">Save</button>
    </CsrfProtectedForm>
  );
}
```

## Example 3: Delete Button/Action

### Before (Vulnerable)

```typescript
// DeleteButton.tsx
function DeleteButton({ userId }: { userId: string }) {
  const handleDelete = async () => {
    if (!confirm('Are you sure?')) return;

    await fetch(`/api/v1/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
  };

  return (
    <button onClick={handleDelete}>
      Delete User
    </button>
  );
}
```

### After (Protected)

```typescript
// DeleteButton.tsx
import apiClient from '@/services/api.client';

function DeleteButton({ userId }: { userId: string }) {
  const handleDelete = async () => {
    if (!confirm('Are you sure?')) return;

    // apiClient automatically includes CSRF token for DELETE
    await apiClient.delete(`/api/v1/users/${userId}`);
  };

  return (
    <button onClick={handleDelete}>
      Delete User
    </button>
  );
}
```

## Example 4: File Upload

### Before (Vulnerable)

```typescript
// PhotoUpload.tsx
function PhotoUpload() {
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    await fetch('/api/v1/users/me/photos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
  };

  return <input type="file" onChange={handleUpload} />;
}
```

### After (Protected)

```typescript
// PhotoUpload.tsx
import apiClient from '@/services/api.client';
import csrfService from '@/services/csrf.service';

function PhotoUpload() {
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    // Add CSRF token to FormData
    await csrfService.addToFormData(formData);

    // Get CSRF header
    const csrfHeader = await csrfService.getTokenHeader();

    await fetch('/api/v1/users/me/photos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...csrfHeader,
      },
      credentials: 'include', // Important!
      body: formData,
    });
  };

  return <input type="file" onChange={handleUpload} />;
}
```

## Example 5: Backend Endpoint Protection

### Before (Vulnerable)

```typescript
// user.controller.ts
@Post('me/photos')
async uploadPhoto(
  @Headers('authorization') authorization: string,
  @Body() body: any,
) {
  // No CSRF protection - vulnerable!
  return this.proxyService.post('userService', '/api/users/me/photos', body, {
    Authorization: authorization,
  });
}
```

### After (Protected) - Automatic

```typescript
// user.controller.ts
@Post('me/photos')
async uploadPhoto(
  @Headers('authorization') authorization: string,
  @Body() body: any,
) {
  // CSRF middleware automatically validates token
  // No code changes needed!
  return this.proxyService.post('userService', '/api/users/me/photos', body, {
    Authorization: authorization,
  });
}
```

### After (Protected) - Webhook Exception

```typescript
// payment.controller.ts
import { SkipCsrf } from '../decorators/csrf.decorator';

@SkipCsrf() // Skip CSRF for webhook
@Post('webhooks/stripe')
async handleStripeWebhook(@Body() body: any) {
  // Webhook endpoints should skip CSRF
  return this.paymentService.processWebhook(body);
}
```

## Example 6: Axios Migration

### Before (Using Axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usage
await api.post('/users/me', data);
```

### After (Using apiClient)

```typescript
import apiClient from '@/services/api.client';

// apiClient already has auth and CSRF
await apiClient.post('/api/v1/users/me', data);
```

### After (Keep Axios but add CSRF)

```typescript
import axios from 'axios';
import csrfService from '@/services/csrf.service';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Important!
});

// Add auth interceptor
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF for state-changing requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    const csrfToken = await csrfService.getToken();
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

// Usage
await api.post('/users/me', data);
```

## Example 7: React Query/SWR Integration

### Before (Vulnerable)

```typescript
// Using React Query
import { useMutation } from '@tanstack/react-query';

function useUpdateProfile() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  });
}
```

### After (Protected)

```typescript
// Using React Query with apiClient
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/services/api.client';

function useUpdateProfile() {
  return useMutation({
    mutationFn: async (data) => {
      // CSRF automatically handled
      return apiClient.put('/api/v1/users/me', data);
    },
  });
}

// Usage in component
function ProfileForm() {
  const updateProfile = useUpdateProfile();

  const handleSubmit = (data) => {
    updateProfile.mutate(data);
  };

  return (
    <CsrfProtectedForm onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit(Object.fromEntries(formData));
    }}>
      {/* form fields */}
    </CsrfProtectedForm>
  );
}
```

## Example 8: Testing Updates

### Before (Vulnerable Test)

```typescript
// profile.test.tsx
it('should update profile', async () => {
  const { getByRole } = render(<ProfileForm />);

  fireEvent.click(getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith('/api/v1/users/me', {
      method: 'PUT',
      body: expect.any(String),
    });
  });
});
```

### After (Protected Test)

```typescript
// profile.test.tsx
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock CSRF token endpoint
const server = setupServer(
  rest.get('/api/v1/csrf/token', (req, res, ctx) => {
    return res(
      ctx.cookie('XSRF-TOKEN', 'test-token'),
      ctx.json({ csrfToken: 'test-token' })
    );
  }),
  rest.put('/api/v1/users/me', (req, res, ctx) => {
    // Verify CSRF token in request
    const csrfToken = req.headers.get('X-CSRF-Token');
    if (csrfToken !== 'test-token') {
      return res(ctx.status(403), ctx.json({ message: 'CSRF token missing' }));
    }
    return res(ctx.json({ success: true }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('should update profile with CSRF token', async () => {
  const { getByRole } = render(<ProfileForm />);

  fireEvent.click(getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'test-token',
        }),
      })
    );
  });
});
```

## Summary of Changes

### Frontend Changes
1. ✅ Replace `<form>` with `<CsrfProtectedForm>`
2. ✅ Use `apiClient` instead of direct `fetch()`
3. ✅ Add `credentials: 'include'` to any remaining fetch calls
4. ✅ Use `csrfService` for file uploads and custom cases
5. ✅ Update tests to mock CSRF token endpoint

### Backend Changes
1. ✅ Most endpoints protected automatically
2. ✅ Add `@SkipCsrf()` for webhooks and public endpoints
3. ✅ No changes needed for standard CRUD operations

### Testing Changes
1. ✅ Mock `/api/v1/csrf/token` endpoint
2. ✅ Include CSRF token in test requests
3. ✅ Verify CSRF validation in integration tests
