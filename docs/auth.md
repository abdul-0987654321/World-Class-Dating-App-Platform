# FLAMORAL Authentication System Documentation

## Overview

The FLAMORAL platform uses JWT-based authentication with access and refresh tokens. This document covers the authentication architecture, API endpoints, and implementation guidelines.

## Architecture

### Token Strategy

| Token Type | Storage | Lifetime | Purpose |
|------------|---------|----------|---------|
| Access Token | Memory / httpOnly cookie | 15 minutes | API authorization |
| Refresh Token | httpOnly cookie | 7 days | Token renewal |

### Security Features

- **httpOnly cookies**: Tokens stored in httpOnly cookies (prevents XSS access)
- **CSRF protection**: Cross-site request forgery protection via tokens
- **Rate limiting**: Login and password reset endpoints are rate-limited
- **Account lockout**: Progressive lockout after failed login attempts
- **Password hashing**: bcrypt with appropriate cost factor

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "male"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isVerified": false,
      "profileCompletion": 20
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Validation:**
- Email: Valid format, unique
- Password: Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Age: Must be 18+

---

#### POST /api/auth/login
Authenticate an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "isVerified": true,
      "premiumTier": "GOLD",
      "coinBalance": 150
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

**Note:** Error messages are intentionally vague to prevent user enumeration.

---

#### POST /api/auth/logout
Invalidate the current session.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### POST /api/auth/refresh
Obtain a new access token using a refresh token.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

#### GET /api/auth/me
Get the current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "photoUrl": "https://...",
    "isVerified": true,
    "premiumTier": "GOLD",
    "subscription": "gold",
    "coinBalance": 150,
    "profileCompletion": 85
  }
}
```

---

#### GET /api/auth/session
Get current session with entitlements (for UI state).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "entitlements": {
      "tier": "GOLD",
      "features": ["unlimited_likes", "see_likes", "rewind"],
      "limits": {
        "dailyLikes": -1,
        "dailySuperLikes": 5,
        "dailyBoosts": 1,
        "seeWhoLikesYou": true,
        "advancedFilters": true,
        "readReceipts": false,
        "incognitoMode": false,
        "videoCalls": false
      },
      "expiresAt": "2024-12-31T23:59:59Z"
    },
    "isAuthenticated": true
  }
}
```

---

#### POST /api/auth/forgot-password
Request a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account exists, a reset email has been sent"
}
```

**Rate Limiting:** 3 requests per email per hour

---

#### POST /api/auth/reset-password
Reset password using a token from email.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

#### POST /api/auth/verify-email
Verify email address using token from email.

**Request:**
```json
{
  "token": "verification-token"
}
```

---

### OAuth Endpoints

#### GET /api/auth/oauth/google/start
Initiate Google OAuth flow.

#### GET /api/auth/oauth/google/callback
Handle Google OAuth callback.

#### GET /api/auth/oauth/apple/start
Initiate Apple Sign-In flow.

#### GET /api/auth/oauth/apple/callback
Handle Apple callback.

#### GET /api/auth/oauth/facebook/start
Initiate Facebook OAuth flow.

#### GET /api/auth/oauth/facebook/callback
Handle Facebook callback.

## Frontend Implementation

### Auth Service (auth.service.ts)

The frontend auth service handles all authentication operations:

```typescript
import { authService } from '../../services';

// Login
const response = await authService.login(email, password);

// Register
const response = await authService.register({
  email,
  password,
  firstName,
  lastName,
  dateOfBirth,
  gender
});

// Logout
await authService.logout();

// Get current user
const user = await authService.getCurrentUser();

// Check authentication
const isLoggedIn = authService.isAuthenticated();

// Refresh token
await authService.refreshToken();
```

### Environment Variables

Frontend:
```env
VITE_API_URL=https://api.flamoral.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_APPLE_CLIENT_ID=your-apple-client-id
VITE_APPLE_REDIRECT_URI=https://flamoral.com/auth/apple/callback
VITE_FACEBOOK_APP_ID=your-facebook-app-id
```

Backend:
```env
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
```

### Error Handling

Standard error response format:

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;       // Machine-readable error code
    message: string;    // Human-readable message
    field?: string;     // Optional: specific field that caused error
  };
}
```

Common error codes:
- `INVALID_CREDENTIALS` - Wrong email/password
- `ACCOUNT_LOCKED` - Too many failed attempts
- `TOKEN_EXPIRED` - Access token expired
- `TOKEN_INVALID` - Malformed or tampered token
- `EMAIL_NOT_VERIFIED` - Email verification required
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `VALIDATION_ERROR` - Input validation failed

## Security Considerations

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| POST /auth/login | 5 per minute per IP |
| POST /auth/register | 3 per minute per IP |
| POST /auth/forgot-password | 3 per hour per email |
| POST /auth/verify-email | 10 per hour per user |

### Account Lockout

- After 5 failed login attempts: 5-minute lockout
- After 10 failed attempts: 30-minute lockout
- After 20 failed attempts: Account locked, admin reset required

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)
- Not in common password list
- Not similar to email or name

### Token Security

1. **Access tokens** are short-lived (15 min) to limit exposure
2. **Refresh tokens** are rotated on each use
3. **Token blacklist** maintained for logged-out sessions
4. **JWT signature** verified on every request

## Mock Mode

For development without backend, the auth service runs in mock mode when `VITE_API_URL` is not set:

```typescript
// Mock credentials for development only
const mockUsers = {
  'test1@flamoral.com': { password: 'TestUser1!', userId: 'test-user-1' },
  'test2@flamoral.com': { password: 'TestUser2!', userId: 'test-user-2' },
};
```

**Note:** Mock mode is for development only. The login page UI does NOT expose these credentials - they must be used programmatically for testing.

## Redux State Management

Auth state is managed via Redux Toolkit in `store/slices/authSlice.ts`:

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

## Quick Reference

| Action | Method | Endpoint | Auth Required |
|--------|--------|----------|---------------|
| Register | POST | /auth/register | No |
| Login | POST | /auth/login | No |
| Logout | POST | /auth/logout | Yes |
| Refresh | POST | /auth/refresh | No (uses refresh token) |
| Get User | GET | /auth/me | Yes |
| Get Session | GET | /auth/session | Yes |
| Forgot Password | POST | /auth/forgot-password | No |
| Reset Password | POST | /auth/reset-password | No |
| Verify Email | POST | /auth/verify-email | No |
