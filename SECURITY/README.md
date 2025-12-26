# Security Documentation - Flamoral Dating Platform

## Overview

This document outlines the security architecture, policies, and requirements for the Flamoral Dating Platform.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Container Image Signing](#container-image-signing)
3. [DTO Policy](#dto-policy)
4. [Authorization Policy](#authorization-policy)
5. [Tenant Isolation](#tenant-isolation)
6. [Approval Workflow Security](#approval-workflow-security)
7. [Audit Logging](#audit-logging)
8. [Running Security Checks](#running-security-checks)
9. [Contributing Securely](#contributing-securely)

---

## Security Architecture

### API Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  - Rate Limiting                                            │
│  - JWT Validation                                           │
│  - Request Logging                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authorization Layer                        │
│  - Role-Based Access Control (RBAC)                         │
│  - Tenant Isolation                                         │
│  - Resource Ownership Validation                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DTO Validation Layer                      │
│  - Input Schema Validation                                  │
│  - Unknown Field Rejection                                  │
│  - Server-Owned Field Protection                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  - Subscription/Entitlement Checks                          │
│  - State Machine Enforcement                                │
│  - Audit Event Logging                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Container Image Signing

### Overview

All container images deployed to the Flamoral platform are cryptographically signed using [cosign](https://github.com/sigstore/cosign) with Sigstore keyless signing. This ensures supply chain integrity by verifying that images were built by our official CI/CD pipeline.

### How It Works

1. **Signing (CI/CD Pipeline)**: After each Docker image is built and pushed to Azure Container Registry, the unified pipeline signs the image using cosign with GitHub OIDC keyless signing.

2. **Verification (Kubernetes Admission)**: A Kyverno ClusterPolicy (`verify-image-signatures`) validates that all images deployed to the `flamoral` namespace have valid signatures before allowing Pod creation.

### Keyless Signing with GitHub OIDC

We use Sigstore's keyless signing which:
- Uses GitHub Actions OIDC tokens for identity
- Records signatures in the Rekor transparency log
- Eliminates the need to manage signing keys
- Ties image provenance to specific GitHub workflow runs

### Verification Policy

The Kyverno policy verifies:
- **Issuer**: `https://token.actions.githubusercontent.com` (GitHub Actions)
- **Subject**: `https://github.com/flamoral/*` (Flamoral organization)
- **Rekor**: Signatures are recorded in the public transparency log

### Policy Location

- **Kyverno Policy**: `infrastructure/kubernetes/policies/verify-image-signatures.yaml`
- **CI/CD Integration**: `.github/workflows/unified-pipeline.yml`

### Manual Verification

To manually verify an image signature:

```bash
# Verify a signed image
cosign verify \
  --certificate-identity-regexp="https://github.com/flamoral/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  flamoralprodacr.azurecr.io/api-gateway:v1.0.0
```

### Trusted Base Images

External base images (nginx, redis, postgres, mcr.microsoft.com) are allowed without signature verification as they are trusted upstream images.

---

## DTO Policy

### Requirements

1. **All endpoints must use strict DTOs** for input validation
2. **Unknown fields are rejected** by default
3. **Server-owned fields are never writable** by clients

### Server-Owned Fields (Never Accept from Client)

```typescript
const SERVER_OWNED_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'role',
  'isAdmin',
  'isVerified',
  'approved',
  'status',
  'subscriptionTier',
  'credits',
  'quota',
  'tenantId',
  'ownerId',
  'emailVerified',
  'phoneVerified',
];
```

### Implementation Pattern

```typescript
// BAD - Never do this
async updateUser(@Body() body: any) {
  return this.userService.update(userId, body);
}

// GOOD - Use DTOs with validation
async updateUser(@Body() dto: UpdateUserDto) {
  // DTO only allows safe fields
  return this.userService.update(userId, dto);
}
```

---

## Authorization Policy

### Requirements

Every endpoint MUST implement:

1. **Authentication** - Valid JWT required
2. **Authorization** - Role/permission check
3. **Tenant Isolation** - User can only access their tenant's data
4. **Ownership Validation** - User can only modify their own resources (unless admin)

### Authorization Pattern

```typescript
// Recommended: Centralized policy function
function authorize(actor: User, action: string, resource: Resource, context: AuthContext): boolean {
  // 1. Check tenant isolation
  if (actor.tenantId !== resource.tenantId) {
    return false;
  }

  // 2. Check ownership or admin
  if (resource.ownerId !== actor.id && !actor.roles.includes('admin')) {
    return false;
  }

  // 3. Check subscription tier for premium features
  if (context.requiresPremium && actor.subscriptionTier !== 'premium') {
    return false;
  }

  return true;
}
```

---

## Tenant Isolation

### Requirements

1. **Every database query must filter by tenantId**
2. **Cross-tenant access is forbidden** (403/404)
3. **Tenant context must be derived from JWT**, not request params

### Implementation Pattern

```typescript
// BAD - IDOR vulnerability
async getUser(@Param('userId') userId: string) {
  return this.userRepo.findOne({ id: userId });
}

// GOOD - Tenant isolated
async getUser(@Param('userId') userId: string, @CurrentUser() actor: User) {
  return this.userRepo.findOne({
    id: userId,
    tenantId: actor.tenantId
  });
}
```

---

## Approval Workflow Security

### State Machine Enforcement

Approval workflows must enforce valid state transitions:

```
DRAFT → PENDING_REVIEW → APPROVED/REJECTED
         │
         └→ Cannot skip to APPROVED directly
```

### Requirements

1. **Transitions are validated server-side**
2. **Replay protection** - Same action cannot be performed twice
3. **Audit trail** - All transitions are logged

---

## Audit Logging

### Required Audit Events

| Event Type | Fields Required |
|------------|-----------------|
| Role Change | actor, target, oldRole, newRole, timestamp |
| Approval | actor, resource, action, outcome, timestamp |
| Subscription Change | actor, oldTier, newTier, timestamp |
| Admin Action | actor, action, target, timestamp |
| Login/Logout | actor, ip, userAgent, timestamp |

### Audit Log Schema

```typescript
interface AuditEvent {
  id: string;
  timestamp: Date;
  actor: {
    id: string;
    tenantId: string;
    role: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  before?: object;
  after?: object;
  correlationId: string;
  ip: string;
  userAgent: string;
}
```

---

## Running Security Checks

### Local Development

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run security abuse tests
npm run test:security

# Run security agent scan
npm run security:scan

# Run SAST analysis
npm run security:sast

# Full security check (all of the above)
npm run security:pr
```

### CI/CD Pipeline

Security checks run automatically on every PR:

1. **Static Analysis** - Semgrep rules for common vulnerabilities
2. **Dependency Audit** - npm audit for known CVEs
3. **Business Logic Abuse Tests** - Simulated attack scenarios
4. **DTO Validation** - Ensure all endpoints have proper validation

---

## Contributing Securely

### New Endpoint Checklist

- [ ] DTO defined with class-validator decorators
- [ ] Unknown fields rejected (`forbidNonWhitelisted: true`)
- [ ] Server-owned fields excluded from DTO
- [ ] Authentication guard applied
- [ ] Authorization policy implemented
- [ ] Tenant isolation in database queries
- [ ] Audit logging for sensitive operations
- [ ] Security abuse tests added (if applicable)

### Code Review Security Checklist

- [ ] No `update(..., req.body)` patterns
- [ ] No raw ORM entity returns (use DTOs)
- [ ] No IDOR vulnerabilities
- [ ] No mass assignment vulnerabilities
- [ ] Proper error handling (no stack traces in response)
- [ ] Audit logging for privileged operations

---

## Contact

For security issues, contact: security@flamoral.com

**Do not disclose security vulnerabilities publicly.**
