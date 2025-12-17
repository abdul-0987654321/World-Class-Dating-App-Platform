# CSRF Protection Quick Start Guide

## Installation

### Backend (API Gateway)

1. Install dependencies:
```bash
cd backend/services/api-gateway
npm install cookie-parser @types/cookie-parser
```

2. The CSRF middleware is already configured in `main.ts` and will start protecting endpoints automatically.

## Usage

### Backend: Protecting Endpoints

**Default Behavior:**
- All POST, PUT, PATCH, DELETE requests are automatically protected
- GET, HEAD, OPTIONS requests are allowed without CSRF token

**Skip CSRF for specific endpoints:**
```typescript
import { SkipCsrf } from '../decorators/csrf.decorator';

@SkipCsrf()
@Post('webhook')
async handleWebhook() {
  // No CSRF validation
}
```

**Require CSRF for GET requests:**
```typescript
import { RequireCsrf } from '../decorators/csrf.decorator';

@RequireCsrf()
@Get('sensitive-data')
async getSensitiveData() {
  // CSRF required even for GET
}
```

### Frontend: Using API Client (Recommended)

The API client automatically handles CSRF tokens:

```typescript
import apiClient from '@/services/api.client';

// CSRF token is automatically included
await apiClient.post('/api/v1/users/me', {
  name: 'John Doe',
  email: 'john@example.com',
});

// For PUT, PATCH, DELETE too
await apiClient.put('/api/v1/users/me', data);
await apiClient.patch('/api/v1/users/me', data);
await apiClient.delete('/api/v1/users/12345');
```

### Frontend: Using Forms

**Option 1: CsrfProtectedForm (Easiest)**
```typescript
import { CsrfProtectedForm } from '@/components/common';

function MyForm() {
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Your form submission logic
  };

  return (
    <CsrfProtectedForm onSubmit={handleSubmit}>
      <input name="username" />
      <input name="email" />
      <button type="submit">Submit</button>
    </CsrfProtectedForm>
  );
}
```

**Option 2: Manual Token (Advanced)**
```typescript
import { useCsrfToken } from '@/hooks/useCsrfToken';

function MyForm() {
  const { token, loading } = useCsrfToken();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Add CSRF token manually
    formData.append('_csrf', token);

    // Submit form
    await apiClient.post('/api/endpoint', Object.fromEntries(formData));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="_csrf" value={token} />
      <input name="username" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Frontend: Custom Fetch Requests

```typescript
import csrfService from '@/services/csrf.service';

// Get CSRF header
const headers = await csrfService.getTokenHeader();

fetch('/api/v1/endpoint', {
  method: 'POST',
  headers: {
    ...headers,
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important!
  body: JSON.stringify(data),
});
```

## Testing

### Get CSRF Token

```bash
curl -c cookies.txt http://localhost:4000/api/v1/csrf/token
```

### Use CSRF Token

```bash
# Extract token from response
TOKEN=$(curl -c cookies.txt http://localhost:4000/api/v1/csrf/token | jq -r '.csrfToken')

# Use in POST request
curl -b cookies.txt \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}' \
  http://localhost:4000/api/v1/users/me
```

## Troubleshooting

### Issue: "CSRF token missing"

**Solution:**
- Ensure cookies are enabled in browser
- Check `credentials: 'include'` in fetch requests
- Verify CORS allows credentials

### Issue: "CSRF token mismatch"

**Solution:**
- Token from cookie must match header
- Don't modify the token
- Ensure token hasn't expired (24h)

### Issue: "CORS error"

**Solution:**
- Add frontend URL to CORS whitelist in backend config
- Ensure CORS allows credentials
- Check allowed headers include 'X-CSRF-Token'

### Issue: GET request works but POST fails

**Solution:**
- This is expected! POST requires CSRF token
- Use apiClient or add CSRF token header
- Check browser console for CSRF errors

## Environment Variables

Add to `.env`:

```env
# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true

# Security
NODE_ENV=production  # Enables secure cookies
```

## Important Notes

1. **Always use `credentials: 'include'`** in fetch requests
2. **Use apiClient when possible** - CSRF is automatic
3. **Use CsrfProtectedForm** for React forms
4. **Don't skip CSRF** unless absolutely necessary (webhooks, public APIs)
5. **Test with HTTPS in production** - Required for secure cookies

## Migration Checklist

- [ ] Install cookie-parser dependency
- [ ] Update all fetch calls to include `credentials: 'include'`
- [ ] Replace `<form>` with `<CsrfProtectedForm>`
- [ ] Update API calls to use apiClient
- [ ] Test POST/PUT/PATCH/DELETE endpoints
- [ ] Configure CORS origins
- [ ] Enable HTTPS in production

## API Endpoints

- `GET /api/v1/csrf/token` - Get CSRF token
- `GET /api/v1/csrf/verify` - Verify token validity

## Support

For detailed documentation, see `CSRF_IMPLEMENTATION.md`

For issues, check:
1. Browser console for errors
2. Network tab for cookie/header values
3. Backend logs for validation errors
