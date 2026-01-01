# Flamoral Platform - QA Release Gates

**Version:** 1.0
**Last Updated:** 2026-01-01

## Pre-Production Deployment Checklist

All conditions must pass before deploying to production. Fail the release if ANY condition fails.

---

## 1. Environment Isolation

| Check | Command/Method | Expected Result |
|-------|---------------|-----------------|
| No test users in prod DB | `SELECT COUNT(*) FROM users WHERE email LIKE '%@example.com' OR email LIKE '%@test.com'` | 0 |
| No seed data in prod | Verify seed migrations are disabled | No seed scripts executed |
| Test user flag check | `SELECT COUNT(*) FROM users WHERE is_test_user = true` | 0 |
| Demo accounts blocked | Check email validation rejects @demo.* domains | Blocked |

---

## 2. Authentication & Security

| Check | Status | Notes |
|-------|--------|-------|
| JWT tokens include subscription tier | Required | Must have `subscriptionTier`, `subscriptionStatus` |
| Refresh token rotation enabled | Required | Verify in auth config |
| WebSocket CORS not wildcard | Required | No `'*'` in production |
| CORS origins explicit | Required | Only flamoral.com domains |
| No hardcoded secrets in frontend | Required | Scan for API keys |
| CSRF protection enabled | Required | All mutating endpoints |

---

## 3. Brand Consistency

| Surface | Logo | Colors | Font |
|---------|------|--------|------|
| Landing Page | Heart+Flame gradient | #FF2E93, #7B61FF, #2ED4FF | Instrument Serif |
| Auth Pages | Same | Same | Same |
| Navigation | Same | Dark theme #111318 | Same |
| Discover | Same | Same | Same |
| Profile | Same | Same | Same |
| Subscription | Same | Same | Same |
| Safety Center | Same | Same | Same |

**Required Colors:**
- Primary Gradient: `#FF2E93` (pink) → `#7B61FF` (purple) → `#2ED4FF` (blue)
- Background: `#0B0B0F`
- Surface: `#111318`
- Accent Gold: `#FFB703`

---

## 4. Payment Integration

| Provider | Status | Webhook Verified | Idempotent |
|----------|--------|------------------|------------|
| Stripe | PRODUCTION | Signature checked | Event tracking |
| Apple IAP | PRODUCTION | Receipt validated | Dedup check |
| Google Play | PRODUCTION | Service account | Dedup check |
| Paystack | STUB | Needs implementation | N/A |
| Flutterwave | STUB | Needs implementation | N/A |

**Pre-Deploy Checks:**
- [ ] Stripe webhook secret configured
- [ ] Payment routes require authentication
- [ ] Subscription enforcement is backend-side
- [ ] Refund logic properly handles coin deduction

---

## 5. API Endpoints

| Endpoint Category | Auth Required | Rate Limited |
|-------------------|---------------|--------------|
| `/api/v1/auth/*` (public) | No | Yes |
| `/api/v1/users/*` | Yes | Yes |
| `/api/v1/discovery/*` | Yes | Yes |
| `/api/v1/matches/*` | Yes | Yes |
| `/api/v1/calls/*` | Yes (Premium) | Yes |
| `/api/v1/payments/*` | Yes | Yes |
| `/api/v1/webhooks/*` | Signature | No |

---

## 6. Feature Completeness

### Core Features (Must Work)
- [ ] User registration and login
- [ ] Profile creation and editing
- [ ] Discovery/swiping
- [ ] Matching
- [ ] Messaging
- [ ] Subscription purchase
- [ ] Coin/gem purchases
- [ ] Boosts and super likes

### Premium Features (Tier-Gated)
- [ ] Video calls (Premium+)
- [ ] Advanced filters
- [ ] Unlimited likes
- [ ] Read receipts
- [ ] Incognito mode

### Known Gaps (Acceptable for MVP)
- Communities: Backend not implemented (frontend mock)
- Reels: Feature not implemented
- Gems: No spending mechanics (earning only)

---

## 7. Safety Center

| Module | Status | Fallback |
|--------|--------|----------|
| Verification | Working | Default status |
| Security (2FA) | Working | Default settings |
| Privacy | Working | Default settings |
| Emergency SOS | BROKEN | Endpoint missing |
| Block/Report | Working | N/A |

**Critical:** SOS endpoint needs implementation before full production launch.

---

## 8. Database

| Check | Verification |
|-------|--------------|
| All migrations applied | `SELECT * FROM knex_migrations` |
| Tables exist | users, profiles, matches, swipes, messages, call_history |
| Indexes created | Check for idx_* indexes |
| No orphaned data | FK constraints enforced |

---

## 9. Infrastructure

| Component | Health Check | Expected |
|-----------|--------------|----------|
| API Gateway | `/health` | OK |
| Auth Service | Internal health | Running |
| User Service | Internal health | Running |
| Matching Service | Internal health | Running |
| Messaging Service | Internal health | Running |
| Payment Service | Internal health | Running |
| CloudFront | Distribution status | Deployed |
| RDS | Connection test | Connected |

---

## 10. Performance

| Metric | Target | Actual |
|--------|--------|--------|
| API response time (p95) | < 500ms | Measure |
| Page load time | < 3s | Measure |
| WebSocket latency | < 100ms | Measure |
| Database query time | < 50ms | Measure |

---

## Release Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Platform Engineer | | | |
| Security Review | | | |
| QA Lead | | | |
| Product Owner | | | |

---

## Post-Deployment Verification

1. [ ] Smoke test: Register new user
2. [ ] Smoke test: Login existing user
3. [ ] Smoke test: Create/edit profile
4. [ ] Smoke test: Discovery feed loads
5. [ ] Smoke test: Subscription page loads prices
6. [ ] Smoke test: Safety center accessible
7. [ ] Monitor: Error rates < 1%
8. [ ] Monitor: No 500 errors in logs
9. [ ] Monitor: Payment webhooks receiving
10. [ ] Monitor: WebSocket connections stable
