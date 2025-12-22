# Error Codes Reference

**Last Updated:** 2025-12-21
**Version:** 1.0.0

---

This document provides a complete reference of all error codes used in the Flamoral API.

## Error Code Table

| Code | HTTP Status | User-Safe Message | When to Use | Example Scenario |
|------|-------------|-------------------|-------------|------------------|
| `BAD_REQUEST` | 400 | Invalid request. Please check your input. | Invalid input data, malformed JSON, missing required fields | User submits profile update with invalid date format |
| `VALIDATION_ERROR` | 400 | Please correct the highlighted fields. | Form validation failures | Bio exceeds 2000 character limit |
| `UNAUTHORIZED` | 401 | Authentication required. Please log in. | Missing or invalid JWT token | Token expired, user must re-login |
| `INVALID_CREDENTIALS` | 401 | Invalid email or password. | Login with wrong password | User types incorrect password |
| `TOKEN_EXPIRED` | 401 | Your session has expired. Please log in again. | JWT access token expired | Token older than 15 minutes |
| `REFRESH_TOKEN_EXPIRED` | 401 | Please log in again. | Refresh token expired | Token older than 7 days |
| `PAYMENT_REQUIRED` | 402 | This feature requires a subscription upgrade. | Feature behind paywall | Free user tries Super Like |
| `INSUFFICIENT_CREDITS` | 402 | You don't have enough credits for this action. | In-app currency depleted | User out of boost credits |
| `FORBIDDEN` | 403 | You do not have permission to perform this action. | User lacks permission | Non-admin tries admin endpoint |
| `BLOCKED_USER` | 403 | You cannot interact with this user. | User blocked the requester | Sending message to someone who blocked you |
| `ACCOUNT_SUSPENDED` | 403 | Your account has been suspended. | Account under moderation | Too many policy violations |
| `NOT_FOUND` | 404 | The requested resource was not found. | Resource doesn't exist | Request profile for deleted user |
| `USER_NOT_FOUND` | 404 | User not found. | Specific user lookup failed | Deep link to non-existent profile |
| `MATCH_NOT_FOUND` | 404 | Match not found. | Match lookup failed | Unmatched user trying to message |
| `CONVERSATION_NOT_FOUND` | 404 | Conversation not found. | Conversation lookup failed | Chat thread was deleted |
| `CONFLICT` | 409 | This resource already exists. | Duplicate resource | Email already registered |
| `EMAIL_ALREADY_EXISTS` | 409 | An account with this email already exists. | Duplicate email on register | User re-registers with same email |
| `ALREADY_MATCHED` | 409 | You are already matched with this user. | Duplicate match attempt | Like user already matched with |
| `ALREADY_LIKED` | 409 | You have already liked this user. | Duplicate like | Like same person twice |
| `PAYLOAD_TOO_LARGE` | 413 | The uploaded file is too large. | File size exceeds limit | Photo larger than 10MB |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | This file type is not supported. | Invalid file type | Upload .exe instead of image |
| `UNPROCESSABLE_ENTITY` | 422 | Unable to process this request. | Semantic validation failure | Age preference min > max |
| `RATE_LIMITED` | 429 | Too many requests. Please try again later. | Rate limit exceeded | API spam protection triggered |
| `LIKE_LIMIT_EXCEEDED` | 429 | You've reached your daily like limit. | Daily like cap hit | Free user exceeds 25 likes/day |
| `SUPER_LIKE_LIMIT_EXCEEDED` | 429 | You've used all your Super Likes for today. | Super Like cap hit | Used 1 daily Super Like |
| `MESSAGE_LIMIT_EXCEEDED` | 429 | Slow down! You're sending messages too fast. | Message rate limit | Spam protection |
| `INTERNAL_SERVER_ERROR` | 500 | An unexpected error occurred. Please try again later. | Unexpected server error | Unhandled exception |
| `DATABASE_ERROR` | 500 | An unexpected error occurred. Please try again later. | Database operation failed | Connection pool exhausted |
| `BAD_GATEWAY` | 502 | A service is temporarily unavailable. | Upstream service down | Payment provider offline |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable. Please try again. | Service in maintenance | Planned maintenance window |
| `GATEWAY_TIMEOUT` | 504 | Request timed out. Please try again. | Upstream service timeout | Slow third-party API |

---

## Error Code Categories

### Authentication Errors (401)

```typescript
// Error codes that indicate authentication issues
type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_EXPIRED';
```

**Frontend Behavior:** Redirect to login page, clear stored tokens.

### Authorization Errors (403)

```typescript
// Error codes that indicate permission issues
type AuthorizationErrorCode =
  | 'FORBIDDEN'
  | 'BLOCKED_USER'
  | 'ACCOUNT_SUSPENDED';
```

**Frontend Behavior:** Show access denied message, do not redirect.

### Payment Errors (402)

```typescript
// Error codes that indicate payment/subscription requirements
type PaymentErrorCode =
  | 'PAYMENT_REQUIRED'
  | 'INSUFFICIENT_CREDITS';
```

**Frontend Behavior:** Show upgrade modal with plan options.

### Rate Limit Errors (429)

```typescript
// Error codes that indicate rate limiting
type RateLimitErrorCode =
  | 'RATE_LIMITED'
  | 'LIKE_LIMIT_EXCEEDED'
  | 'SUPER_LIKE_LIMIT_EXCEEDED'
  | 'MESSAGE_LIMIT_EXCEEDED';
```

**Frontend Behavior:** Show rate limit message with `retry_after` countdown.

### Not Found Errors (404)

```typescript
// Error codes for missing resources
type NotFoundErrorCode =
  | 'NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'MATCH_NOT_FOUND'
  | 'CONVERSATION_NOT_FOUND';
```

**Frontend Behavior:** Show appropriate "not found" UI or redirect to home.

---

## Extended Error Response Examples

### Validation Error (400)

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/profile/me",
  "details": {
    "validation_errors": [
      "bio must be at most 2000 characters",
      "display_name is required"
    ]
  }
}
```

### Payment Required Error (402)

```json
{
  "code": "PAYMENT_REQUIRED",
  "message": "Super Likes require a Gold subscription",
  "correlation_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/discovery/super-like",
  "required_plan": "GOLD",
  "current_plan": "FREE"
}
```

### Rate Limited Error (429)

```json
{
  "code": "LIKE_LIMIT_EXCEEDED",
  "message": "You've reached your daily like limit",
  "correlation_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/discovery/like",
  "retry_after": 43200
}
```

### Not Found Error (404)

```json
{
  "code": "USER_NOT_FOUND",
  "message": "User with ID 'abc123' not found",
  "correlation_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/users/abc123"
}
```

---

## Adding New Error Codes

When adding a new error code:

1. **Choose the right HTTP status** - Match the semantic meaning
2. **Use SCREAMING_SNAKE_CASE** - Consistent with existing codes
3. **Write user-safe message** - Never expose technical details
4. **Document in this file** - Add to the table above
5. **Update OpenAPI spec** - Add to response definitions
6. **Add frontend handling** - If special UX is needed

### Example: Adding a new error

```typescript
// 1. Add to ERROR_CODES in http-exception.filter.ts (if new status)
// 2. Add factory method if needed
export class ApiErrors {
  static profileIncomplete(missingFields: string[]): HttpException {
    return new HttpException({
      code: 'PROFILE_INCOMPLETE',
      message: 'Please complete your profile to use this feature',
      details: { missing_fields: missingFields },
    }, HttpStatus.BAD_REQUEST);
  }
}
```

---

## Error Code Constants

The error codes are defined in `backend/services/api-gateway/src/filters/http-exception.filter.ts`:

```typescript
const ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};
```

---

## Related Documentation

- [Main Error Handling Guide](../errors.md)
- [Frontend Error Handling](./frontend-handling.md)
- [Backend Integration Guide](./backend-integration.md)
- [API Error Contract](./api-contract.md)
