# API Endpoint Inventory - Flamoral Dating Platform

> Auto-generated endpoint inventory for security review.
> Last updated: December 2024

## Overview

This document catalogs all API endpoints in the Flamoral Dating Platform with their:
- HTTP method and path
- Authentication requirements
- Authorization roles
- Input/output shapes
- Security considerations

---

## Services

### Auth Service (`/api/auth`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| POST | `/register` | None | Public | User registration | DTO validation required, rate limit |
| POST | `/login` | None | Public | User login | Brute force protection |
| POST | `/logout` | JWT | Any | User logout | Token invalidation |
| POST | `/refresh` | Refresh Token | Any | Refresh access token | Rotate refresh tokens |
| POST | `/forgot-password` | None | Public | Password reset request | Rate limit, no user enumeration |
| POST | `/reset-password` | Token | Public | Password reset confirm | Token expiry validation |
| POST | `/verify-email` | Token | Public | Email verification | One-time token |
| POST | `/verify-phone` | JWT + OTP | Any | Phone verification | Rate limit OTP attempts |

### User Service (`/api/users`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| GET | `/me` | JWT | Any | Get current user | Exclude sensitive fields |
| PATCH | `/me` | JWT | Any | Update current user | **DTO required, block server-owned fields** |
| DELETE | `/me` | JWT | Any | Delete account | Soft delete, audit log |
| GET | `/:id` | JWT | Any | Get user by ID | **Tenant isolation required** |
| GET | `/:id/profile` | JWT | Any | Get user profile | Public vs private data |
| PATCH | `/:id` | JWT | Admin | Admin update user | Audit logging required |

### Profile Service (`/api/profiles`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| GET | `/me` | JWT | Any | Get own profile | - |
| POST | `/` | JWT | Any | Create profile | **DTO required, status defaults to DRAFT** |
| PATCH | `/me` | JWT | Any | Update profile | **Block status/approved fields** |
| POST | `/me/submit` | JWT | Any | Submit for review | State machine validation |
| POST | `/:id/approve` | JWT | Moderator | Approve profile | State machine, audit log |
| POST | `/:id/reject` | JWT | Moderator | Reject profile | State machine, audit log |

### Matching Service (`/api/matches`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| POST | `/swipe` | JWT | Any | Swipe on user | **Rate limit for free tier** |
| POST | `/super-like` | JWT | Premium | Super like | **Subscription check** |
| GET | `/` | JWT | Any | Get matches | Tenant isolation |
| GET | `/likes-received` | JWT | Premium | See who liked you | **Subscription check** |
| POST | `/rewind` | JWT | Any | Undo last swipe | Quota enforcement |
| POST | `/unmatch/:id` | JWT | Any | Unmatch user | Ownership validation |

### Messaging Service (`/api/messages`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| POST | `/` | JWT | Any | Send message | **Match required**, rate limit |
| GET | `/conversations` | JWT | Any | List conversations | Tenant isolation |
| GET | `/conversations/:id` | JWT | Any | Get conversation | **Ownership validation** |
| DELETE | `/conversations/:id` | JWT | Any | Delete conversation | Soft delete |
| POST | `/conversations/:id/read` | JWT | Any | Mark as read | Ownership validation |

### Media Service (`/api/media`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| POST | `/photos` | JWT | Any | Upload photo | File type validation, quota check |
| DELETE | `/photos/:id` | JWT | Any | Delete photo | **Ownership validation** |
| GET | `/:id` | JWT | Any | Get media | Access control for private media |
| PATCH | `/photos/:id/primary` | JWT | Any | Set primary photo | Ownership validation |

### Payment Service (`/api/payments`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| POST | `/intents` | JWT | Any | Create payment intent | **Server calculates amount** |
| GET | `/methods` | JWT | Any | List payment methods | PCI compliance |
| POST | `/methods` | JWT | Any | Add payment method | PCI tokenization |
| DELETE | `/methods/:id` | JWT | Any | Remove payment method | Ownership validation |
| GET | `/subscriptions` | JWT | Any | Get subscription | - |
| POST | `/subscriptions/cancel` | JWT | Any | Cancel subscription | Audit log |

### Admin Service (`/api/admin`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| GET | `/users` | JWT | Admin | List all users | **Admin role required** |
| GET | `/users/:id` | JWT | Admin | Get any user | Admin role required |
| PATCH | `/users/:id` | JWT | Admin | Update any user | **Audit log required** |
| POST | `/users/:id/ban` | JWT | Admin | Ban user | Audit log required |
| POST | `/users/:id/unban` | JWT | Admin | Unban user | Audit log required |
| GET | `/reports` | JWT | Moderator | List reports | Role check |
| POST | `/reports/:id/action` | JWT | Moderator | Take action | State machine, audit log |
| GET | `/audit-logs` | JWT | Admin | View audit logs | Admin only |

### Moderation Service (`/api/moderation`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| GET | `/queue` | JWT | Moderator | Get moderation queue | **Role check** |
| POST | `/reports` | JWT | Any | Create report | Rate limit |
| POST | `/queue/:id/approve` | JWT | Moderator | Approve content | State machine |
| POST | `/queue/:id/reject` | JWT | Moderator | Reject content | State machine |

### Webhook Endpoints (`/api/webhooks`)

| Method | Path | Auth | Roles | Description | Security Notes |
|--------|------|------|-------|-------------|----------------|
| POST | `/stripe` | Signature | System | Stripe webhooks | **Signature verification** |
| POST | `/apple` | Signature | System | Apple IAP | Signature verification |
| POST | `/google` | Signature | System | Google Play | Signature verification |

---

## Security Requirements by Endpoint Type

### Public Endpoints
- Rate limiting
- No user enumeration
- CAPTCHA for sensitive actions

### Authenticated Endpoints
- Valid JWT required
- Token expiry validation
- User active/banned check

### Premium Endpoints
- Subscription tier validation
- Quota enforcement
- Feature flag check

### Admin Endpoints
- Admin role required
- IP whitelist (optional)
- All actions audited

### Webhook Endpoints
- Signature verification
- Idempotency handling
- IP whitelist for payment providers

---

## Known Security Considerations

### High Priority
1. All mutation endpoints need DTO validation
2. Admin routes need strict role checks
3. Cross-tenant access must be blocked everywhere

### Medium Priority
1. Rate limiting on all endpoints
2. Audit logging for sensitive operations
3. Error responses must not leak internal details

### Low Priority
1. Response caching headers
2. Request logging for debugging
3. Performance monitoring

---

## Updating This Document

This inventory should be updated when:
1. New endpoints are added
2. Authentication requirements change
3. New security controls are implemented

Run `npm run security:scan` to detect endpoints missing from this inventory.
