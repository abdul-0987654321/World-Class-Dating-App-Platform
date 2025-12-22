# Flamoral Authentication Architecture

## Overview

The Flamoral dating platform uses a secure, token-based authentication system with JWT (JSON Web Tokens) for stateless authentication and session management.

## Architecture Diagram

```
                                     +------------------+
                                     |    Frontend      |
                                     | (flamoral.com)   |
                                     +--------+---------+
                                              |
                                              | HTTPS
                                              v
+--------------------------------------------------+
|                   NGINX Ingress                  |
|  - SSL/TLS Termination                          |
|  - Rate Limiting (10 RPS for auth endpoints)    |
|  - CORS Headers                                 |
|  - Security Headers (HSTS, CSP, etc.)          |
+--------+-----------------------------------------+
         |
         | /api/v1/auth/*
         v
+------------------+          +------------------+
|   API Gateway    |--------->|   Auth Service   |
| (NestJS - 3000)  |          | (Express - 3001) |
+--------+---------+          +--------+---------+
         |                             |
         |                    +--------+--------+
         |                    |        |        |
         v                    v        v        v
+------------------+  +--------+  +--------+  +--------+
|  Other Services  |  |PostgreSQL| | Redis  | | Email  |
+------------------+  | (Users)  | |(Tokens)| |(SMTP)  |
                      +----------+ +--------+ +--------+
```

## Token Flow

### Registration Flow

```
1. User submits registration form
   |
   v
2. POST /api/v1/auth/register
   - Validate input (email, password strength, age >= 18)
   - Check password against HaveIBeenPwned breach database
   - Hash password with bcrypt
   - Create user in PostgreSQL
   - Generate access token (15min) + refresh token (7 days)
   - Send verification email (async)
   |
   v
3. Return { user, accessToken, refreshToken }
   |
   v
4. Frontend stores tokens (httpOnly cookies recommended)
```

### Login Flow

```
1. User submits login form
   |
   v
2. POST /api/v1/auth/login
   - Check account lockout status
   - Verify email/password
   - Record device fingerprint
   - Detect suspicious login patterns
   - Create session in Redis
   - Generate new token pair
   |
   v
3. Return { user, accessToken, refreshToken }
   |
   v
4. (If new device) Send security notification email
```

### Token Refresh Flow

```
1. Access token expires (after 15 minutes)
   |
   v
2. POST /api/v1/auth/refresh-token
   - Verify refresh token signature
   - Check for token reuse (security breach detection)
   - Validate against Redis storage
   - Rotate refresh token (issue new one)
   - Invalidate old refresh token
   |
   v
3. Return { accessToken, refreshToken }
```

### Token Validation (Internal)

```
1. Request with Authorization: Bearer <token>
   |
   v
2. JWT Middleware verifies:
   - Token signature (HS256)
   - Token not expired
   - Token not blacklisted
   - Issuer and audience claims
   |
   v
3. Extract user payload { userId, email }
   |
   v
4. Attach to request for downstream handlers
```

## Security Features

### JWT Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Algorithm | HS256 | HMAC-SHA256 signing |
| Access Token Expiry | 15 minutes | Short-lived for security |
| Refresh Token Expiry | 7 days | Longer for user convenience |
| Issuer | https://api.flamoral.com | Token issuer claim |
| Audience | flamoral-users | Token audience claim |

### Rate Limiting

| Endpoint | Limit | Window | Burst |
|----------|-------|--------|-------|
| /api/v1/auth/login | 5 RPS | - | 1x |
| /api/v1/auth/register | 5 RPS | - | 1x |
| /api/v1/auth/forgot-password | 5 RPS | - | 1x |
| /api/v1/auth/* (other) | 10 RPS | - | 2x |
| Global auth rate | 100 req | 15 min | - |

### Account Security

1. **Account Lockout**
   - 5 failed attempts triggers temporary lockout
   - Lockout duration: 15 minutes
   - 3 consecutive lockouts triggers permanent lock

2. **Password Policy**
   - Minimum 8 characters
   - Must contain: uppercase, lowercase, number, special char
   - Checked against HaveIBeenPwned breach database

3. **Session Management**
   - Maximum 5 concurrent sessions per user
   - Session idle timeout: 30 minutes
   - Trusted device tracking

4. **Token Security**
   - Refresh token rotation on every use
   - Token reuse detection (invalidates all tokens)
   - Access token blacklisting on logout

## Required Environment Variables

### Required (Will Fail Without)

```bash
# JWT Secrets (minimum 32 characters each)
JWT_ACCESS_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
```

### Required for Full Functionality

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=flamoral_db
DB_USER=flamoral
DB_PASSWORD=<database-password>

# Redis
REDIS_URL=redis://:password@redis:6379/0

# Email (for verification, password reset)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@flamoral.com
```

### Optional (OAuth Providers)

```bash
# Google OAuth 2.0
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret>
GOOGLE_CALLBACK_URL=https://api.flamoral.com/api/v1/auth/google/callback

# Apple Sign-In
APPLE_CLIENT_ID=com.flamoral.app
APPLE_TEAM_ID=<team-id>
APPLE_KEY_ID=<key-id>
APPLE_PRIVATE_KEY=<private-key-content>

# Facebook OAuth
FACEBOOK_APP_ID=<app-id>
FACEBOOK_APP_SECRET=<app-secret>
```

### Configuration Settings

```bash
# Server
PORT=3001
NODE_ENV=production

# JWT Settings
JWT_ISSUER=https://api.flamoral.com
JWT_AUDIENCE=flamoral-users
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=https://flamoral.com,https://www.flamoral.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Frontend
FRONTEND_URL=https://flamoral.com
```

## OAuth Setup Instructions

### Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to APIs & Services > Credentials
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add authorized JavaScript origins:
   - `https://flamoral.com`
   - `https://www.flamoral.com`
7. Add authorized redirect URIs:
   - `https://api.flamoral.com/api/v1/auth/google/callback`
8. Copy Client ID and Client Secret

### Apple Sign-In

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create a new App ID with Sign In with Apple capability
4. Create a Services ID for web authentication
5. Configure domains and return URLs:
   - Domain: `flamoral.com`
   - Return URL: `https://api.flamoral.com/api/v1/auth/apple/callback`
6. Create a private key for Sign In with Apple
7. Download and securely store the private key

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing
3. Add Facebook Login product
4. Configure Valid OAuth Redirect URIs:
   - `https://api.flamoral.com/api/v1/auth/facebook/callback`
5. Copy App ID and App Secret

## API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register new user |
| POST | /api/v1/auth/login | Login user |
| POST | /api/v1/auth/refresh-token | Refresh access token |
| POST | /api/v1/auth/verify-email | Verify email with token |
| POST | /api/v1/auth/forgot-password | Request password reset |
| POST | /api/v1/auth/reset-password | Reset password with token |
| POST | /api/v1/auth/resend-verification | Resend verification email |
| GET | /api/v1/auth/google | Initiate Google OAuth |
| GET | /api/v1/auth/google/callback | Google OAuth callback |
| GET | /api/v1/auth/apple | Initiate Apple Sign-In |
| POST | /api/v1/auth/apple/callback | Apple Sign-In callback |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/logout | Logout user |
| GET | /api/v1/auth/me | Get current user info |
| GET | /api/v1/auth/session | Get session with entitlements |

### Internal Endpoints (Service-to-Service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/validate-token | Validate token (internal) |

## Kubernetes Deployment

### Apply Configuration

```bash
# Apply ConfigMaps
kubectl apply -f infrastructure/kubernetes/config/auth-config.yaml

# Apply Secrets (replace placeholders first!)
kubectl apply -f infrastructure/kubernetes/secrets/auth-secrets.yaml

# Apply Deployment
kubectl apply -f infrastructure/kubernetes/deploy/auth-service-complete.yaml

# Apply Ingress
kubectl apply -f infrastructure/kubernetes/ingress/auth-ingress.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n flamoral -l app=auth-service

# Check service
kubectl get svc -n flamoral auth-service

# Check logs
kubectl logs -n flamoral -l app=auth-service --tail=100

# Test health endpoint
kubectl port-forward -n flamoral svc/auth-service 3001:3001
curl http://localhost:3001/health
```

### Generate Secrets

```bash
# Generate JWT secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
INTERNAL_SERVICE_KEY=$(openssl rand -base64 32)

# Store in Azure Key Vault
az keyvault secret set --vault-name flamoral-prod-kv \
  --name JWT-ACCESS-SECRET --value "$JWT_ACCESS_SECRET"

az keyvault secret set --vault-name flamoral-prod-kv \
  --name JWT-REFRESH-SECRET --value "$JWT_REFRESH_SECRET"

az keyvault secret set --vault-name flamoral-prod-kv \
  --name INTERNAL-SERVICE-KEY --value "$INTERNAL_SERVICE_KEY"
```

## Testing

### Run Auth Flow Test

```bash
# Test against production
./scripts/test-auth-flow.sh production

# Test against staging
./scripts/test-auth-flow.sh staging

# Test against localhost
./scripts/test-auth-flow.sh local
```

### Manual Testing with curl

```bash
# Register
curl -X POST https://api.flamoral.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "first_name": "Test",
    "last_name": "User",
    "date_of_birth": "1995-01-15",
    "gender": "male"
  }'

# Login
curl -X POST https://api.flamoral.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

# Access protected endpoint
curl -X GET https://api.flamoral.com/api/v1/auth/me \
  -H "Authorization: Bearer <access-token>"

# Refresh token
curl -X POST https://api.flamoral.com/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh-token>"
  }'

# Logout
curl -X POST https://api.flamoral.com/api/v1/auth/logout \
  -H "Authorization: Bearer <access-token>"
```

## Troubleshooting

### Common Issues

1. **"JWT_ACCESS_SECRET is required"**
   - Ensure auth-secrets is properly created
   - Check secret key names match exactly

2. **"Invalid token"**
   - Token may be expired (15min for access)
   - Token may be blacklisted (after logout)
   - Check JWT_ISSUER and JWT_AUDIENCE match

3. **"Account is temporarily locked"**
   - Wait for lockout period (15 minutes)
   - Check Redis for lockout status

4. **CORS errors**
   - Verify CORS_ORIGINS includes your frontend domain
   - Check ingress CORS annotations

5. **OAuth redirect errors**
   - Verify callback URLs match exactly in provider settings
   - Check protocol (https vs http)

### Debug Commands

```bash
# View auth-service logs
kubectl logs -n flamoral -l app=auth-service -f

# Check ConfigMap values
kubectl get configmap auth-config -n flamoral -o yaml

# Check Secret keys (not values!)
kubectl get secret auth-secrets -n flamoral -o jsonpath='{.data}' | jq 'keys'

# Test internal connectivity
kubectl exec -n flamoral -it <pod-name> -- curl http://redis:6379

# Check Redis token storage
kubectl exec -n flamoral -it <redis-pod> -- redis-cli keys "refresh_token:*"
```

## Security Considerations

1. **Never log tokens or secrets** - Auth service uses structured logging without sensitive data
2. **Use HTTPS only** - HTTP redirects to HTTPS via ingress
3. **Short access token lifetime** - 15 minutes limits exposure window
4. **Refresh token rotation** - Prevents replay attacks
5. **Token reuse detection** - Alerts on potential token theft
6. **Password breach checking** - Prevents use of compromised passwords
7. **Rate limiting** - Prevents brute force attacks
8. **Account lockout** - Temporary and permanent lockout for repeated failures
