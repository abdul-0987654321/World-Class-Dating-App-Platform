# API Error Contract

**Last Updated:** 2025-12-21
**Version:** 1.0.0

---

This document defines the exact JSON schema for all API error responses. This is the source of truth for error format - all services must conform to this contract.

## Base Error Response Schema

All API errors follow this structure:

```json
{
  "code": "string",
  "message": "string",
  "correlation_id": "string",
  "timestamp": "string (ISO 8601)",
  "path": "string"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Machine-readable error code (e.g., `UNAUTHORIZED`) |
| `message` | string | Yes | Human-readable error message |
| `correlation_id` | string | Yes | UUID for request tracing |
| `timestamp` | string | Yes | ISO 8601 timestamp |
| `path` | string | Yes | Request path that caused the error |

---

## OpenAPI Schema Definitions

### Base Error Response

```yaml
components:
  schemas:
    ErrorResponse:
      type: object
      required:
        - code
        - message
        - correlation_id
        - timestamp
        - path
      properties:
        code:
          type: string
          description: Machine-readable error code
          example: "UNAUTHORIZED"
        message:
          type: string
          description: Human-readable error message
          example: "Authentication required"
        correlation_id:
          type: string
          format: uuid
          description: Unique request identifier for tracing
          example: "550e8400-e29b-41d4-a716-446655440000"
        timestamp:
          type: string
          format: date-time
          description: ISO 8601 timestamp
          example: "2025-12-21T10:30:00.000Z"
        path:
          type: string
          description: Request path
          example: "/api/v1/profile/me"
```

### Extended Error Responses

#### Validation Error (400)

```yaml
ValidationErrorResponse:
  allOf:
    - $ref: '#/components/schemas/ErrorResponse'
    - type: object
      properties:
        details:
          type: object
          properties:
            validation_errors:
              type: array
              items:
                type: string
              example:
                - "bio must be at most 2000 characters"
                - "display_name is required"
```

#### Payment Required Error (402)

```yaml
PaymentRequiredErrorResponse:
  allOf:
    - $ref: '#/components/schemas/ErrorResponse'
    - type: object
      properties:
        required_plan:
          type: string
          description: Plan required for this feature
          example: "GOLD"
        current_plan:
          type: string
          description: User's current plan
          example: "FREE"
```

#### Rate Limited Error (429)

```yaml
RateLimitedErrorResponse:
  allOf:
    - $ref: '#/components/schemas/ErrorResponse'
    - type: object
      properties:
        retry_after:
          type: integer
          description: Seconds until request can be retried
          example: 3600
```

---

## TypeScript Interface

```typescript
/**
 * Base API error response
 */
interface ApiErrorResponse {
  /** Machine-readable error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Unique request identifier for tracing */
  correlation_id: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Request path that caused the error */
  path: string;
}

/**
 * Validation error response (400)
 */
interface ValidationErrorResponse extends ApiErrorResponse {
  details?: {
    validation_errors: string[];
  };
}

/**
 * Payment required error response (402)
 */
interface PaymentRequiredErrorResponse extends ApiErrorResponse {
  /** Plan required for this feature */
  required_plan: string;

  /** User's current plan */
  current_plan: string;
}

/**
 * Rate limited error response (429)
 */
interface RateLimitedErrorResponse extends ApiErrorResponse {
  /** Seconds until request can be retried */
  retry_after?: number;
}
```

---

## Response Examples

### 400 Bad Request

```json
{
  "code": "BAD_REQUEST",
  "message": "Invalid request body",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/profile/me"
}
```

### 400 Validation Error

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

### 401 Unauthorized

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required",
  "correlation_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/matches"
}
```

### 402 Payment Required

```json
{
  "code": "PAYMENT_REQUIRED",
  "message": "Super Likes require a Gold subscription",
  "correlation_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/discovery/super-like",
  "required_plan": "GOLD",
  "current_plan": "FREE"
}
```

### 403 Forbidden

```json
{
  "code": "FORBIDDEN",
  "message": "You do not have permission to access this resource",
  "correlation_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/admin/users"
}
```

### 404 Not Found

```json
{
  "code": "NOT_FOUND",
  "message": "User with ID 'abc123' not found",
  "correlation_id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/users/abc123"
}
```

### 409 Conflict

```json
{
  "code": "CONFLICT",
  "message": "An account with this email already exists",
  "correlation_id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/auth/register"
}
```

### 413 Payload Too Large

```json
{
  "code": "PAYLOAD_TOO_LARGE",
  "message": "File size exceeds the 10MB limit",
  "correlation_id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/profile/photos"
}
```

### 429 Rate Limited

```json
{
  "code": "RATE_LIMITED",
  "message": "Too many requests. Please try again later.",
  "correlation_id": "b8c9d0e1-f2a3-4567-bcde-678901234567",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/discovery/like",
  "retry_after": 60
}
```

### 429 Like Limit Exceeded

```json
{
  "code": "LIKE_LIMIT_EXCEEDED",
  "message": "You've reached your daily like limit",
  "correlation_id": "c9d0e1f2-a3b4-5678-cdef-789012345678",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/discovery/like",
  "retry_after": 43200
}
```

### 500 Internal Server Error

```json
{
  "code": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred. Please try again later.",
  "correlation_id": "d0e1f2a3-b4c5-6789-defa-890123456789",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/matches"
}
```

### 502 Bad Gateway

```json
{
  "code": "BAD_GATEWAY",
  "message": "A downstream service is unavailable",
  "correlation_id": "e1f2a3b4-c5d6-7890-efab-901234567890",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/payments/subscribe"
}
```

### 503 Service Unavailable

```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Service is temporarily unavailable. Please try again later.",
  "correlation_id": "f2a3b4c5-d6e7-8901-fabc-012345678901",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/profile/me"
}
```

### 504 Gateway Timeout

```json
{
  "code": "GATEWAY_TIMEOUT",
  "message": "Request timed out. Please try again.",
  "correlation_id": "a3b4c5d6-e7f8-9012-abcd-123456789012",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/discovery/feed"
}
```

---

## HTTP Headers

### Response Headers

All error responses include:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Correlation-ID` | Same as `correlation_id` in body | `550e8400-e29b-41d4-a716-446655440000` |
| `Content-Type` | Always JSON | `application/json` |

### Rate Limit Headers (429 responses)

| Header | Description | Example |
|--------|-------------|---------|
| `Retry-After` | Seconds until retry is allowed | `60` |
| `X-RateLimit-Limit` | Request limit | `100` |
| `X-RateLimit-Remaining` | Remaining requests | `0` |
| `X-RateLimit-Reset` | Unix timestamp of limit reset | `1703156400` |

---

## Validation Rules

### Code Field
- Must be SCREAMING_SNAKE_CASE
- Must be from the approved list (see [Error Codes Reference](./error-codes.md))
- Max length: 64 characters

### Message Field
- Must be user-safe (no technical details in production)
- Max length: 500 characters
- Should end with proper punctuation

### Correlation ID Field
- Must be valid UUID v4
- Generated by server if not provided by client

### Timestamp Field
- Must be ISO 8601 format
- Must include timezone (prefer UTC with 'Z' suffix)
- Example: `2025-12-21T10:30:00.000Z`

### Path Field
- Must start with `/`
- Must not include query parameters
- Should match the requested endpoint

---

## Contract Verification

To verify your service conforms to this contract, use this test:

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

const errorResponseSchema = {
  type: 'object',
  required: ['code', 'message', 'correlation_id', 'timestamp', 'path'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z_]+$' },
    message: { type: 'string', minLength: 1, maxLength: 500 },
    correlation_id: { type: 'string', format: 'uuid' },
    timestamp: { type: 'string', format: 'date-time' },
    path: { type: 'string', pattern: '^/' },
    details: { type: 'object' },
    required_plan: { type: 'string' },
    current_plan: { type: 'string' },
    retry_after: { type: 'integer', minimum: 0 },
  },
  additionalProperties: false,
};

const validate = ajv.compile(errorResponseSchema);

function verifyErrorResponse(response: any): boolean {
  return validate(response);
}
```

---

## Related Documentation

- [Main Error Handling Guide](../errors.md)
- [Error Codes Reference](./error-codes.md)
- [Frontend Error Handling](./frontend-handling.md)
- [Backend Integration Guide](./backend-integration.md)
- [OpenAPI Specification](../02-api/openapi.yaml)
