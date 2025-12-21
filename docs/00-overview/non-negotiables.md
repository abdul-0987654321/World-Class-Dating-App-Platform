# Flamoral Non-Negotiables

> **Critical Rules**: Violations of these rules are production incidents. No exceptions.

## Core Principles

### 1. Server-Side Authority

**ALL enforcement MUST be server-side.** The client is untrusted.

| Enforcement Type | Server-Side Required | Client Can |
|------------------|---------------------|------------|
| Subscription tier limits | MUST check on every request | Display limits, optimistic UI |
| Daily like caps | MUST enforce in backend | Show remaining count |
| Age verification | MUST validate DOB server-side | Collect DOB |
| Content moderation | MUST scan all uploads | Show pending status |
| Rate limiting | MUST enforce at API gateway | Handle 429 gracefully |
| Feature access | MUST check entitlements | Hide/show UI elements |

**SEV-1 Trigger**: Any feature that works when tier check removed from client code.

### 2. Data Consistency

- **Server is truth**: UI MUST always fetch fresh state for critical data
- **Optimistic UI**: Allowed only with immediate server reconciliation
- **Stale data**: Maximum 30 seconds for non-critical, 0 for auth/entitlements

### 3. Security Boundaries

- **No client-side secrets**: API keys, signing keys NEVER in frontend
- **Token-only auth**: JWT access tokens, secure refresh flow
- **Input validation**: All inputs sanitized server-side
- **Output encoding**: All outputs properly escaped

---

## SEV-1 Definitions

A SEV-1 is a production incident requiring immediate response. The following conditions are SEV-1:

### Authentication & Session (SEV-1)

| Condition | Why SEV-1 |
|-----------|-----------|
| Users cannot log in | Core functionality broken |
| Users cannot register | Revenue impact, user acquisition blocked |
| Session tokens not validating | Security risk, users locked out |
| Password reset not working | Users locked out of accounts |

### Discovery & Matching (SEV-1)

| Condition | Why SEV-1 |
|-----------|-----------|
| Discovery feed returns empty when eligible users exist | Core product broken |
| Likes not processing | Matches cannot be created |
| Matches not being created on mutual likes | Core product broken |
| Match list not loading | Users cannot access connections |

### Messaging (SEV-1)

| Condition | Why SEV-1 |
|-----------|-----------|
| Messages not sending | Core communication broken |
| Messages not delivering in real-time | User experience severely degraded |
| Conversation list empty when matches exist | Core product broken |
| Message history not loading | Users lose conversation context |

### Payments & Subscriptions (SEV-1)

| Condition | Why SEV-1 |
|-----------|-----------|
| Subscription purchase failing | Revenue loss |
| Webhooks not processing | Entitlement sync broken |
| Premium features available to free users | Revenue loss, unfair advantage |
| Paid users downgraded incorrectly | Customer trust violation |

### Verification (SEV-1)

| Condition | Why SEV-1 |
|-----------|-----------|
| Verification status stuck (not updating) | Users blocked from full functionality |
| Verification uploads failing | Users cannot complete verification |
| Verified badge showing for unverified users | Trust and safety violation |
| Verification status not reflecting backend state | Data integrity violation |

### Calls (SEV-1)

| Condition | Why SEV-1 |
|-----------|-----------|
| Call requests not going through | Premium feature broken |
| Calls dropping unexpectedly | Poor user experience |
| Call quality consistently degraded | Premium feature not delivering value |

### Safety & Moderation (SEV-1)

| Condition | Why SEV-1 |
|-----------|-----------|
| Reports not being created | Safety system broken |
| Blocked users still visible | Safety bypass |
| Banned users can still access platform | Safety bypass |
| CSAM detection not running | Legal/compliance violation |

---

## Observability Requirements

### Every Request MUST Have

```
correlation_id: UUID linking all logs/traces for this request
user_id: Authenticated user (if applicable)
service: Service handling the request
endpoint: API endpoint
method: HTTP method
status_code: Response status
duration_ms: Request duration
```

### Every Error MUST Log

```
correlation_id: Same as request
error_code: Machine-readable error code
error_message: Human-readable message
stack_trace: For 5xx errors
context: Relevant request context (sanitized)
```

### Audit Events (Append-Only)

These actions MUST create immutable audit records:

- User registration
- Login/logout
- Password change/reset
- Profile updates
- Photo uploads/deletes
- Likes/passes/super-likes
- Match creation/unmatch
- Messages sent
- Reports submitted
- Moderation actions
- Subscription changes
- Verification status changes
- Account deletion requests

---

## Response Time SLOs

| Endpoint Category | p50 | p95 | p99 |
|-------------------|-----|-----|-----|
| Auth endpoints | 100ms | 300ms | 500ms |
| Profile read | 50ms | 150ms | 300ms |
| Profile write | 100ms | 300ms | 500ms |
| Discovery feed | 150ms | 400ms | 800ms |
| Like/pass | 100ms | 250ms | 400ms |
| Message send | 100ms | 300ms | 500ms |
| Message list | 100ms | 300ms | 500ms |
| Media upload | 500ms | 2000ms | 5000ms |

---

## Availability SLOs

| Service | Monthly Uptime Target |
|---------|----------------------|
| API Gateway | 99.9% |
| Auth Service | 99.9% |
| Messaging Service | 99.9% |
| Discovery Service | 99.5% |
| Media Service | 99.5% |
| Payment Service | 99.9% |
| Verification Service | 99.5% |

---

## Data Retention

| Data Type | Retention | Deletion Method |
|-----------|-----------|-----------------|
| User accounts | Until deletion requested | Soft delete, hard delete after 30 days |
| Messages | 2 years after last activity | Batch purge |
| Media files | 90 days after user deletion | Background worker |
| Audit logs | 7 years | Archive to cold storage |
| Error logs | 90 days | Auto-expire |
| Analytics | 2 years | Aggregated only after 90 days |

---

## Incident Response

### On-Call Responsibilities

1. **Acknowledge** within 5 minutes
2. **Assess** severity within 10 minutes
3. **Communicate** status to stakeholders within 15 minutes
4. **Remediate** or escalate within 30 minutes
5. **Post-mortem** within 48 hours for SEV-1/SEV-2

### Escalation Path

```
SEV-1: On-call -> Engineering Lead -> CTO (all within 15 min)
SEV-2: On-call -> Engineering Lead (within 30 min)
SEV-3: On-call -> Next business day
SEV-4: Track in backlog
```

---

## Deployment Rules

1. **No direct production changes**: All changes via CI/CD
2. **Required checks**: Lint, unit tests, integration tests must pass
3. **Staged rollout**: Canary (5%) -> 25% -> 50% -> 100%
4. **Rollback ready**: Previous version always deployable within 5 minutes
5. **Feature flags**: New features behind flags, gradual enablement
6. **Post-deploy verification**: Smoke tests MUST pass before marking complete

---

## Security Checklist

Before any release, verify:

- [ ] No secrets in code or logs
- [ ] All inputs validated server-side
- [ ] All outputs properly encoded
- [ ] Auth checks on all protected endpoints
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] CSP headers in place
- [ ] No SQL injection vectors
- [ ] No XSS vectors
- [ ] Dependency vulnerabilities scanned
