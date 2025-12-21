# Service Boundaries

## Ownership Matrix

Each service owns specific data and operations. Cross-service data access MUST go through APIs, never direct database queries.

| Service | Owns (Tables) | Exposes (Events) | Consumes (Events) |
|---------|---------------|------------------|-------------------|
| Auth | users, sessions, refresh_tokens, password_resets | user.created, session.started, session.ended | - |
| Profile | profiles, profile_versions, profile_photos, user_preferences | profile.updated, photo.uploaded, photo.deleted | user.created |
| Discovery | discovery_candidates, ranking_audit_events | - | profile.updated, match.created, like.created |
| Matching | likes, passes, super_likes, matches | match.created, like.created, unmatch.created | - |
| Messaging | conversations, messages, attachments, presence_states | message.created, message.delivered | match.created, unmatch.created |
| Calls | call_sessions, call_events, call_reports | call.started, call.ended | match.created |
| Verification | verification_requests, verification_artifacts, verification_results | verification.completed | user.created |
| Moderation | reports, moderation_cases, moderation_actions, enforcement_events | user.suspended, user.banned | report.created |
| Payment | subscription_plans, user_subscriptions, entitlements_snapshot, payment_events | subscription.upgraded, subscription.downgraded, subscription.canceled | user.created |
| Media | media_files, media_scan_results | media.approved, media.rejected | - |
| Notification | notification_log | - | All relevant events |
| Admin | admin_actions, support_tickets | - | All events (read-only) |

## API Contracts Between Services

### Auth -> All Services
```
GET /internal/auth/validate
Header: X-Internal-Token
Response: { user_id, role, entitlements }
```

### Profile -> Discovery
```
GET /internal/profiles/for-discovery?user_ids=...
Response: { profiles: [...] }
```

### Matching -> Messaging
```
POST /internal/messaging/conversations
Body: { match_id, user_a_id, user_b_id }
Response: { conversation_id }
```

### Payment -> All Services
```
GET /internal/payment/entitlements/{user_id}
Response: { plan, limits, features }
```

## Cross-Service Call Rules

1. **Sync calls**: Only for request-critical data
   - Auth validation
   - Entitlement checks
   - Rate limit checks

2. **Async events**: For non-critical updates
   - Profile updates propagating to discovery
   - Match creation triggering notifications
   - Subscription changes updating features

3. **No circular dependencies**: Service A calling B which calls A
   - Use events to break cycles
   - Or consolidate into single service

4. **Timeout and retry**: All cross-service calls
   - 2 second timeout
   - 3 retries with exponential backoff
   - Circuit breaker for failing services

## Data Consistency Model

### Strongly Consistent
- Authentication (token validation)
- Payment (subscription status)
- Moderation (user status/bans)

### Eventually Consistent
- Discovery feed (minutes lag acceptable)
- Profile data in search
- Notification delivery

### Conflict Resolution
- Last-write-wins for profile updates (with version tracking)
- Idempotency keys for duplicate prevention
- Audit log for reconstruction

## Service Communication Patterns

### Request-Response (Sync)
```
Client -> API Gateway -> Service A -> Service B
                                   <- Response
              <- Response
```
Use for: Auth, entitlement checks, critical reads

### Publish-Subscribe (Async)
```
Service A -> Event Bus -> Service B
                       -> Service C
                       -> Service D
```
Use for: Notifications, cache invalidation, analytics

### Saga Pattern (Distributed Transaction)
```
Orchestrator:
  1. Call Service A (compensate: A.rollback)
  2. Call Service B (compensate: B.rollback)
  3. Call Service C (compensate: C.rollback)
  On failure: Execute compensations in reverse
```
Use for: Subscription purchase, account deletion

## Service Mesh Configuration

### Retry Policy
```yaml
retries: 3
perTryTimeout: 2s
retryOn: 5xx,reset,connect-failure,retriable-4xx
```

### Circuit Breaker
```yaml
outlierDetection:
  consecutive5xxErrors: 5
  interval: 30s
  baseEjectionTime: 60s
  maxEjectionPercent: 50
```

### Rate Limiting
```yaml
global:
  requestsPerUnit: 1000
  unit: SECOND
perUser:
  requestsPerUnit: 100
  unit: MINUTE
```

## Service Health Checks

Each service exposes:

### Liveness Probe
```
GET /health/live
Response: 200 OK
```
Simple check that process is running.

### Readiness Probe
```
GET /health/ready
Response: 200 OK | 503 Not Ready
```
Checks database, redis, and critical dependencies.

### Full Health
```
GET /health
Response: {
  status: "ok" | "degraded" | "down",
  version: "1.2.3",
  dependencies: {
    database: "ok",
    redis: "ok",
    external_api: "degraded"
  }
}
```
Comprehensive health for dashboards.
