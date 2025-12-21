# Flamoral API Inventory

> **Authoritative Contract**: All implementations MUST match this inventory. Any drift between code and this document is a bug.

## Quick Reference

| Domain | Endpoints | Status |
|--------|-----------|--------|
| Auth | 4 | Required |
| Profile | 4 | Required |
| Discovery | 4 | Required |
| Matches | 2 | Required |
| Conversations | 3 | Required |
| Calls | 4 | Required |
| Verification | 3 | Required |
| Reports | 1 | Required |
| Subscriptions | 3 | Required |
| Media | 1 | Required |
| Audit | 1 | Required |
| Health | 1 | Required |

---

## 1. Authentication (`/auth`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register new user (age gate + consent required) |
| POST | `/auth/login` | None | Login with credentials |
| POST | `/auth/refresh` | None | Exchange refresh token for new access token |
| GET | `/auth/session` | Bearer | Get current session + entitlements snapshot |

### Invariants
- Registration MUST enforce age >= 18 server-side
- Registration MUST require explicit consent for terms and privacy
- Password MUST be >= 10 characters
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- All auth failures MUST return generic error (no user enumeration)

### Database Tables
- `users`: user_id, email, password_hash, role, dob, country, created_at, updated_at, deleted_at
- `user_sessions`: session_id, user_id, device_info, created_at, last_active_at
- `refresh_tokens`: token_id, user_id, token_hash, expires_at, revoked_at
- `password_resets`: reset_id, user_id, token_hash, expires_at, used_at

---

## 2. Profile (`/profile`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/profile/me` | Bearer | Get my profile (server truth) |
| PUT | `/profile/me` | Bearer | Update my profile (versioned) |
| POST | `/profile/photos` | Bearer | Upload profile photo (tier limits enforced) |
| DELETE | `/profile/photos/{photo_id}` | Bearer | Delete a profile photo |

### Invariants
- Profile updates MUST create version history
- Photo count enforced by subscription tier (Free: 3, Plus: 6, Premium: 9)
- Photos MUST be scanned before becoming visible
- Cache invalidation on any profile change

### Database Tables
- `profiles`: user_id, display_name, bio, gender, interests, location, created_at, updated_at
- `profile_versions`: version_id, user_id, payload_json, created_at
- `profile_photos`: photo_id, user_id, media_id, status, position, created_at
- `user_preferences`: user_id, age_min, age_max, distance_km, genders, dealbreakers, updated_at

---

## 3. Discovery (`/discovery`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/discovery/feed` | Bearer | Get discovery feed (MUST NOT be empty when eligible users exist) |
| POST | `/discovery/like` | Bearer | Like a user (caps enforced server-side) |
| POST | `/discovery/pass` | Bearer | Pass on a user |
| POST | `/discovery/super-like` | Bearer | Super-like (tier enforced) |

### Invariants
- Feed MUST return candidates when eligible users exist (SEV-1 if empty incorrectly)
- Daily like caps: Free: 50, Plus: 100, Premium: unlimited
- Super-likes: Free: 1/day, Plus: 5/day, Premium: 10/day
- Mutual likes create matches automatically
- All like/pass/super-like events logged for audit

### Database Tables
- `discovery_candidates`: candidate_id, user_id, target_user_id, score, created_at
- `likes`: event_id, actor_user_id, target_user_id, created_at, correlation_id
- `passes`: event_id, actor_user_id, target_user_id, created_at, correlation_id
- `super_likes`: event_id, actor_user_id, target_user_id, created_at, correlation_id
- `matches`: match_id, user_a_id, user_b_id, created_at, ended_at, end_reason
- `ranking_audit_events`: event_id, user_id, algorithm_version, factors_json, created_at

---

## 4. Matches (`/matches`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/matches` | Bearer | List my matches (paginated) |
| DELETE | `/matches/{match_id}` | Bearer | Unmatch |

### Invariants
- Only matched users can access match details
- Unmatch is permanent, creates conversation soft-delete
- Unmatch reason logged but not exposed to other party

---

## 5. Conversations (`/conversations`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/conversations` | Bearer | List my conversations |
| GET | `/conversations/{conversation_id}` | Bearer | Get conversation thread |
| POST | `/conversations/{conversation_id}/messages` | Bearer | Send message (idempotent via Idempotency-Key header) |

### Invariants
- Only matched users can access conversation
- Messages require Idempotency-Key header to prevent duplicates
- Message delivery confirmed via WebSocket/SSE
- Attachments must be pre-uploaded via `/media/upload`

### Database Tables
- `conversations`: conversation_id, match_id, created_at, last_message_at
- `messages`: message_id, conversation_id, sender_id, type, content, media_id, created_at, correlation_id
- `message_versions`: version_id, message_id, content, edited_at
- `attachments`: attachment_id, message_id, media_id, type
- `presence_states`: user_id, status, last_seen_at

---

## 6. Calls (`/calls`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/calls/request` | Bearer | Request 1:1 call (must be matched + allowed by policy) |
| POST | `/calls/accept` | Bearer | Accept a call |
| POST | `/calls/reject` | Bearer | Reject a call |
| POST | `/calls/end` | Bearer | End a call |

### Invariants
- Only matched users can call each other
- Calls require Premium tier (enforced server-side)
- Call duration and quality metrics logged
- Call reports integrated with moderation

### Database Tables
- `call_sessions`: call_id, match_id, requester_id, status, provider, provider_room, created_at, ended_at
- `call_events`: event_id, call_id, event_type, actor_user_id, created_at
- `call_reports`: report_id, call_id, reporter_id, category, description, created_at

---

## 7. Verification (`/verification`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/verification/start` | Bearer | Start verification flow (consent + region policy) |
| POST | `/verification/upload` | Bearer | Upload verification artifact |
| GET | `/verification/status` | Bearer | Get current verification status (MUST reflect live truth) |

### Invariants
- Status MUST always reflect actual backend state (SEV-1 if stale)
- Region-specific policies applied (e.g., biometric consent in IL, TX, WA)
- Verification artifacts encrypted at rest
- Failed verifications allow retry after 24h

### Database Tables
- `verification_requests`: request_id, user_id, type, status, region_policy_key, created_at, updated_at
- `verification_artifacts`: artifact_id, request_id, media_id, type, created_at
- `verification_results`: result_id, request_id, decision, reason_code, decided_at

---

## 8. Reports (`/reports`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reports` | Bearer | Report a user or content |

### Invariants
- All reports create moderation cases
- Reporter identity protected from reported user
- Evidence attachments preserved immutably

### Database Tables
- `reports`: report_id, reporter_id, target_user_id, category, description, evidence_media_id, status, created_at
- `moderation_cases`: case_id, subject_user_id, status, created_at, resolved_at
- `moderation_actions`: action_id, case_id, action_type, actor_id, reason, created_at
- `enforcement_events`: event_id, case_id, action_type, target_user_id, created_at, correlation_id

---

## 9. Subscriptions (`/subscriptions`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscriptions/plans` | None | List subscription plans |
| POST | `/subscriptions/subscribe` | Bearer | Subscribe to a plan |
| GET | `/subscriptions/status` | Bearer | Get subscription status + entitlements |

### Invariants
- ALL tier enforcement MUST be server-side (SEV-1 if client-only)
- Entitlements snapshot updated on subscription change
- Webhook reconciliation with payment provider (Stripe)
- Grace period: 3 days for past_due before downgrade

### Database Tables
- `subscription_plans`: plan_id, name, price, currency, limits_json, features_json
- `user_subscriptions`: subscription_id, user_id, plan_id, status, started_at, renews_at, canceled_at
- `entitlements_snapshot`: snapshot_id, user_id, plan, limits_json, features_json, created_at
- `payment_events`: payment_event_id, user_id, provider, type, payload_json, created_at, correlation_id

---

## 10. Media (`/media`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/media/upload` | Bearer | Upload media (validated, scanned, tier limits) |

### Invariants
- All uploads scanned for prohibited content before approval
- Size limits enforced (10MB photos, 50MB videos)
- Signed URLs for access, expiring in 1 hour
- CSAM detection required, immediate escalation

### Database Tables
- `media_files`: media_id, owner_user_id, purpose, url, status, mime, size_bytes, created_at
- `media_scan_results`: scan_id, media_id, scanner, result, details_json, scanned_at

---

## 11. Audit (`/audit`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit/logs` | Bearer | List my audit log events (append-only) |

### Invariants
- Append-only, no deletions ever
- All sensitive actions logged with correlation_id
- Retention: 7 years minimum

### Database Tables
- `audit_log_events`: event_id, event_type, actor_user_id, subject_user_id, payload_json, correlation_id, created_at
- `system_events`: event_id, event_type, service, details_json, created_at
- `error_events`: event_id, error_type, service, stack_trace, correlation_id, created_at

---

## 12. Health (`/health`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |

### Invariants
- Returns 200 only when all critical dependencies healthy
- Includes version for deployment tracking

---

## Background Workers (Mandatory)

All workers MUST have:
- Retry logic with exponential backoff
- Dead letter queue (DLQ) for failed jobs
- Structured logging with correlation_id
- Metrics for processing time and error rates

| Worker | Purpose | Queue |
|--------|---------|-------|
| `discovery_ranking_worker` | Compute discovery feed rankings | `discovery.ranking` |
| `match_creation_worker` | Process mutual likes into matches | `matching.create` |
| `message_delivery_worker` | Ensure message delivery via WebSocket | `messaging.deliver` |
| `call_signal_worker` | Handle call signaling | `calls.signal` |
| `verification_worker` | Process verification requests | `verification.process` |
| `moderation_triage_worker` | Triage incoming reports | `moderation.triage` |
| `subscription_sync_worker` | Sync with payment provider | `subscriptions.sync` |
| `notification_worker` | Send push/email notifications | `notifications.send` |
| `cleanup_retention_worker` | Enforce data retention policies | `cleanup.retention` |

---

## Subscription Tiers

| Feature | Free | Plus | Premium |
|---------|------|------|---------|
| Daily Likes | 50 | 100 | Unlimited |
| Super-Likes/Day | 1 | 5 | 10 |
| Boosts/Month | 0 | 1 | 5 |
| Max Photos | 3 | 6 | 9 |
| Who Liked You | No | Yes | Yes |
| Read Receipts | No | No | Yes |
| Advanced Filters | No | Yes | Yes |
| Calls Enabled | No | No | Yes |
| Rewind | No | Yes | Yes |

---

## Error Response Format

All errors MUST follow this structure:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human-readable error message",
  "correlation_id": "uuid-for-tracing"
}
```

## Rate Limits

| Endpoint Pattern | Limit | Window |
|------------------|-------|--------|
| `/auth/*` | 10 | 1 minute |
| `/discovery/like` | Tier-based | 24 hours |
| `/conversations/*/messages` | 100 | 1 minute |
| `/media/upload` | 20 | 1 hour |
| All other endpoints | 100 | 1 minute |
