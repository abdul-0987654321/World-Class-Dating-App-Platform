# Claude "Fix Everything" Enforcement Prompt

> **Usage**: Paste this prompt into Claude to have it systematically fix and validate the entire Flamoral codebase for production readiness.

---

```
You are operating as a permanent autonomous engineering system for FLAMORAL (production dating SaaS).

You have full read/write access to:
- Repo (frontend, backend, workers, mobile if applicable, infra)
- DB/queues/caches/object storage/CDN
- CI/CD pipelines, environments, secrets manager
- Observability (logs/metrics/traces), feature flags

This is production software for real users. No demos. No mock data.

NON-NEGOTIABLES:
- No client-side-only enforcement for subscriptions, safety, moderation, verification, or limits.
- Any "core flow broken" is SEV-1: signup/login, profile update, discovery feed, like/match, messaging, payments, verification, moderation/reporting, calls.
- Every failure must emit structured logs with correlation_id; UI must show honest status.
- Append-only audit events for sensitive actions.
- Token-based auth only, secure secrets management, strict authz boundaries, data isolation.

MANDATORY REQUIREMENT:
Verify that Flamoral is implemented as a fully bespoke dating SaaS platform with:
- Custom frontend (Next.js or React)
- Dedicated backend (Node.js or Python) handling authentication, RBAC, subscriptions, realtime features, and APIs
Confirm all core dating logic runs in dedicated services with background processing, retries, logging, and fault handling.
Ensure all user-facing surfaces reflect live data for matches, messages, subscriptions, and verification status via APIs.
Validate secure secrets management, token-based authentication, authorization boundaries, audit logging, and data isolation.
Then run all linters, tests, production builds; fix every error/warning/failing test; add logs; profile/optimize slow paths; iterate until zero issues.
Finally build and push container images to Azure Container Registry (ACR) and deploy to Production with post-deployment health checks enabled.

AUTHORITATIVE CONTRACT:
- Use docs/02-api/api-inventory.md as the canonical endpoint and DB contract.
- Use docs/02-api/openapi.yaml as the machine-readable API contract.
If the repo differs, you must either:
(1) implement missing pieces to match the contract, OR
(2) update BOTH inventory and OpenAPI so they match the repo, with explicit justification, and then implement to that updated contract.
No drift allowed.

PHASE 1 — REPO SCAN + BASELINE (must output before coding):
1) Print architecture map: frontend, backend, workers, realtime, moderation, verification, subscriptions, media, observability.
2) Print actual tech stack: frameworks, DB, queue, cache, storage, auth, CI/CD.
3) Gap analysis vs contract: list missing endpoints/services/workers/tables and broken flows.

PHASE 2 — CONTRACT ENFORCEMENT IMPLEMENTATION (parallel agents required):
Spawn agents A–K:
A) Product/UX wiring: ensure every UI surface uses live APIs and shows server truth.
B) Auth/RBAC: token auth, refresh flow, roles, guards.
C) Profiles: versioned updates, photos upload/delete, caching invalidation.
D) Discovery/Matching: feed non-empty, caps server-side, ranking audit events.
E) Messaging realtime: REST + WS/SSE, idempotency, delivery reliability, attachments scanning.
F) Calls: request/accept/reject/end, safety controls, metrics.
G) Verification: email/phone/ID/selfie/liveness/video/biometric state machine; fix "Verify Now" end-to-end.
H) Moderation/reporting: reports, cases, actions, appeals, append-only enforcement events.
I) Subscriptions/Entitlements: plans, subscribe/status/cancel/webhooks; enforce everywhere server-side.
J) Observability/Self-healing: correlation IDs, SEV-1 monitors, runbooks, automated remediation steps.
K) Testing/CI/CD: unit/integration/e2e; smoke tests after deploy; artifact capture on failure.

Each agent must ship:
- Real code
- DB migrations
- Tests
- Docs updates (if needed)
- Observability hooks

PHASE 3 — DATABASE TABLES (must exist with migrations):
Ensure at least these tables exist (names may vary, but semantics must match):
- users, user_sessions, refresh_tokens, password_resets
- profiles, profile_versions, profile_photos, user_preferences
- discovery_candidates, likes, passes, super_likes, matches, ranking_audit_events
- conversations, messages, message_versions, attachments, presence_states
- call_sessions, call_events, call_reports
- verification_requests, verification_artifacts, verification_results
- reports, moderation_cases, moderation_actions, enforcement_events
- subscription_plans, user_subscriptions, entitlements_snapshot, payment_events
- media_files, media_scan_results
- audit_log_events, system_events, error_events

PHASE 4 — BACKGROUND WORKERS (mandatory with retries + DLQ):
- discovery_ranking_worker
- match_creation_worker
- message_delivery_worker
- call_signal_worker
- verification_worker
- moderation_triage_worker
- subscription_sync_worker
- notification_worker
- cleanup_retention_worker

PHASE 5 — TESTING (blocking):
- Run linters + formatters
- Run unit tests
- Run integration tests
- Run E2E tests (cost-aware start/stop if infra required)
Fix every failing test, error, and warning. Add diagnostics logging where unclear.

PHASE 6 — BUILD + DEPLOY (blocking):
- Produce production builds for all apps
- Build containers
- Push to ACR
- Deploy to Production
- Run post-deploy health checks:
  - /health OK
  - discovery feed returns items for eligible users
  - like/match works
  - messaging works end-to-end
  - verification status transitions correctly
  - subscription status/entitlements enforced server-side
  - critical logs/metrics show healthy thresholds

FINAL OUTPUT (must be explicit, no vague claims):
1) List of implemented endpoints and any contract diffs (with justification)
2) List of DB migrations applied
3) Test commands executed and final status (all green)
4) ACR image tags pushed
5) Deployment confirmation + health check results
6) SEV-1 monitors configured + runbooks updated
Do not stop until all criteria are met.
```

---

## DB Table Definitions (Minimum Columns)

Add this to the prompt for more specific database structure enforcement:

```
DATABASE SCHEMA REQUIREMENTS:

Core tables (minimum columns):

users:
  - user_id: UUID PRIMARY KEY
  - email: VARCHAR UNIQUE NOT NULL
  - password_hash: VARCHAR NOT NULL
  - role: VARCHAR DEFAULT 'user'
  - dob: DATE NOT NULL
  - country: VARCHAR(2) NOT NULL
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()
  - deleted_at: TIMESTAMP

profiles:
  - user_id: UUID PRIMARY KEY REFERENCES users
  - display_name: VARCHAR(50)
  - bio: TEXT
  - gender: VARCHAR(20)
  - interests: JSONB
  - location: JSONB
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

profile_versions:
  - version_id: UUID PRIMARY KEY
  - user_id: UUID REFERENCES users
  - payload_json: JSONB NOT NULL
  - created_at: TIMESTAMP DEFAULT NOW()

profile_photos:
  - photo_id: UUID PRIMARY KEY
  - user_id: UUID REFERENCES users
  - media_id: UUID REFERENCES media_files
  - status: VARCHAR DEFAULT 'pending_scan'
  - position: INTEGER
  - created_at: TIMESTAMP DEFAULT NOW()

user_preferences:
  - user_id: UUID PRIMARY KEY REFERENCES users
  - age_min: INTEGER DEFAULT 18
  - age_max: INTEGER DEFAULT 99
  - distance_km: INTEGER DEFAULT 100
  - genders: JSONB
  - dealbreakers: JSONB
  - updated_at: TIMESTAMP DEFAULT NOW()

likes:
  - event_id: UUID PRIMARY KEY
  - actor_user_id: UUID REFERENCES users
  - target_user_id: UUID REFERENCES users
  - created_at: TIMESTAMP DEFAULT NOW()
  - correlation_id: UUID

passes:
  - event_id: UUID PRIMARY KEY
  - actor_user_id: UUID REFERENCES users
  - target_user_id: UUID REFERENCES users
  - created_at: TIMESTAMP DEFAULT NOW()
  - correlation_id: UUID

super_likes:
  - event_id: UUID PRIMARY KEY
  - actor_user_id: UUID REFERENCES users
  - target_user_id: UUID REFERENCES users
  - created_at: TIMESTAMP DEFAULT NOW()
  - correlation_id: UUID

matches:
  - match_id: UUID PRIMARY KEY
  - user_a_id: UUID REFERENCES users
  - user_b_id: UUID REFERENCES users
  - created_at: TIMESTAMP DEFAULT NOW()
  - ended_at: TIMESTAMP
  - end_reason: VARCHAR(50)

conversations:
  - conversation_id: UUID PRIMARY KEY
  - match_id: UUID REFERENCES matches
  - created_at: TIMESTAMP DEFAULT NOW()
  - last_message_at: TIMESTAMP

messages:
  - message_id: UUID PRIMARY KEY
  - conversation_id: UUID REFERENCES conversations
  - sender_id: UUID REFERENCES users
  - type: VARCHAR NOT NULL
  - content: TEXT
  - media_id: UUID REFERENCES media_files
  - created_at: TIMESTAMP DEFAULT NOW()
  - correlation_id: UUID

call_sessions:
  - call_id: UUID PRIMARY KEY
  - match_id: UUID REFERENCES matches
  - requester_id: UUID REFERENCES users
  - status: VARCHAR NOT NULL
  - provider: VARCHAR
  - provider_room: VARCHAR
  - created_at: TIMESTAMP DEFAULT NOW()
  - ended_at: TIMESTAMP

verification_requests:
  - request_id: UUID PRIMARY KEY
  - user_id: UUID REFERENCES users
  - type: VARCHAR NOT NULL
  - status: VARCHAR NOT NULL
  - region_policy_key: VARCHAR
  - created_at: TIMESTAMP DEFAULT NOW()
  - updated_at: TIMESTAMP DEFAULT NOW()

reports:
  - report_id: UUID PRIMARY KEY
  - reporter_id: UUID REFERENCES users
  - target_user_id: UUID REFERENCES users
  - category: VARCHAR NOT NULL
  - description: TEXT
  - evidence_media_id: UUID REFERENCES media_files
  - status: VARCHAR DEFAULT 'received'
  - created_at: TIMESTAMP DEFAULT NOW()

user_subscriptions:
  - subscription_id: UUID PRIMARY KEY
  - user_id: UUID REFERENCES users
  - plan_id: VARCHAR NOT NULL
  - status: VARCHAR NOT NULL
  - started_at: TIMESTAMP DEFAULT NOW()
  - renews_at: TIMESTAMP
  - canceled_at: TIMESTAMP

entitlements_snapshot:
  - snapshot_id: UUID PRIMARY KEY
  - user_id: UUID REFERENCES users
  - plan: VARCHAR NOT NULL
  - limits_json: JSONB NOT NULL
  - features_json: JSONB NOT NULL
  - created_at: TIMESTAMP DEFAULT NOW()

media_files:
  - media_id: UUID PRIMARY KEY
  - owner_user_id: UUID REFERENCES users
  - purpose: VARCHAR NOT NULL
  - url: TEXT NOT NULL
  - status: VARCHAR DEFAULT 'pending_scan'
  - mime: VARCHAR
  - size_bytes: BIGINT
  - created_at: TIMESTAMP DEFAULT NOW()

audit_log_events:
  - event_id: UUID PRIMARY KEY
  - event_type: VARCHAR NOT NULL
  - actor_user_id: UUID REFERENCES users
  - subject_user_id: UUID REFERENCES users
  - payload_json: JSONB
  - correlation_id: UUID NOT NULL
  - created_at: TIMESTAMP DEFAULT NOW()
```

---

## Usage Notes

1. **Before running**: Ensure you have the full repo cloned and accessible
2. **Authentication**: Claude will need appropriate API keys for external services
3. **Database access**: Read/write access to staging/production databases
4. **CI/CD access**: Ability to trigger pipelines and view results
5. **Monitoring**: Access to view logs and metrics during validation

## Expected Outputs

After execution, Claude should produce:

1. Architecture map of current implementation
2. Gap analysis between code and contract
3. List of all changes made
4. All tests passing
5. Container images built and pushed
6. Production deployment verified
7. Health checks passing
