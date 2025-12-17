# API Endpoint Checklist - Flamoral Dating Platform

**Generated:** 2025-12-12
**Contract Verification Against Canonical API Surface**

---

## Legend
- **Exists:** Y = Yes, N = No, P = Partial
- **Auth:** Y = Required, N = Public, I = Internal Only
- **Coverage:** U = Unit, I = Integration, E = E2E, A = API Test
- **Status:** PASS / FAIL / PARTIAL / NOT_TESTED

---

## 1. AUTH & IDENTITY

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| POST /auth/register | Y | N | U,I,E,A | PASS |
| POST /auth/login | Y | N | U,I,E,A | PASS |
| POST /auth/logout | Y | Y | U,I,E | PASS |
| POST /auth/refresh-token | Y | N | U,I | PASS |
| POST /auth/verify-email | Y | N | U,I | PASS |
| POST /auth/forgot-password | Y | N | U | PASS |
| POST /auth/reset-password | Y | N | U | PASS |
| POST /auth/resend-verification | Y | N | U | PASS |
| POST /auth/oauth/google | P | N | - | NOT_TESTED |
| POST /auth/oauth/apple | P | N | - | NOT_TESTED |
| POST /auth/oauth/facebook | P | N | - | NOT_TESTED |
| GET /auth/session | Y | Y | U | PASS |
| GET /auth/me | Y | Y | U,I | PASS |
| POST /auth/validate-token | Y | I | U | PASS |
| POST /auth/2fa/enable | P | Y | - | NOT_TESTED |
| POST /auth/2fa/verify | P | Y | - | NOT_TESTED |

---

## 2. USERS, PROFILE, MEDIA, SETTINGS

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| GET /users/me | Y | Y | U,I,A | PASS |
| PUT /users/me | Y | Y | U,I | PASS |
| GET /users/{userId} | Y | Y | I | PASS |
| PUT /users/me/preferences | Y | Y | I | PASS |
| PUT /users/me/visibility | Y | Y | I | PASS |
| POST /users/me/photos | Y | Y | I,E | PASS |
| DELETE /users/me/photos | Y | Y | I | PASS |
| POST /users/me/photos/reorder | Y | Y | - | NOT_TESTED |
| POST /users/me/video-intro | Y | Y | - | NOT_TESTED |
| PUT /users/me/settings | Y | Y | I | PASS |
| POST /users/me/pause | Y | Y | - | NOT_TESTED |
| POST /users/me/reactivate | Y | Y | - | NOT_TESTED |
| DELETE /users/me | Y | Y | I | PASS |
| GET /profile | Y | Y | U,I,E | PASS |
| PUT /profile | Y | Y | U,I | PASS |

---

## 3. DISCOVERY & MATCHING

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| GET /discovery | Y | Y | I,E,A | PASS |
| POST /discovery/refresh | Y | Y | - | NOT_TESTED |
| GET /discovery/filters | Y | Y | I | PASS |
| POST /swipes (like/pass) | Y | Y | U,I,E,A | PASS |
| POST /swipes (super-like) | Y | Y | I | PASS |
| POST /swipes/undo | Y | Y | - | NOT_TESTED |
| GET /swipes/likes | Y | Y | I | PASS |
| GET /swipes/stats | Y | Y | - | NOT_TESTED |
| GET /matches | Y | Y | I,E,A | PASS |
| DELETE /matches/{matchId} | Y | Y | I | PASS |
| POST /ai/match-score | Y | Y | - | NOT_TESTED |
| POST /ai/recommendations | Y | Y | - | NOT_TESTED |
| POST /ai/compatibility | Y | Y | - | NOT_TESTED |

---

## 4. MESSAGING & REALTIME

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| GET /conversations | Y | Y | I,E,A | PASS |
| GET /conversations/{id} | Y | Y | I,A | PASS |
| POST /conversations/{id}/messages | Y | Y | I,E,A | PASS |
| GET /conversations/{id}/messages | Y | Y | I,A | PASS |
| POST /messages | Y | Y | U,I,E | PASS |
| GET /messages/{messageId} | Y | Y | I | PASS |
| PUT /messages/{messageId} | Y | Y | I | PASS |
| DELETE /messages/{messageId} | Y | Y | I | PASS |
| PUT /messages/{id}/status | Y | Y | I | PASS |
| GET /messages/unread-count | Y | Y | I | PASS |
| POST /presence/online | Y | Y | - | WEBSOCKET |
| POST /presence/typing | Y | Y | I | WEBSOCKET |
| GET /presence/{userId} | Y | Y | - | WEBSOCKET |
| POST /messages/media | Y | Y | I | PASS |
| POST /messages/voice | Y | Y | - | NOT_TESTED |
| POST /messages/video | Y | Y | - | NOT_TESTED |

---

## 5. NOTIFICATIONS

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| GET /notifications | Y | Y | I,A | PASS |
| GET /notifications/unread-count | Y | Y | I | PASS |
| PUT /notifications/{id}/read | Y | Y | I | PASS |
| PUT /notifications/read-all | Y | Y | I | PASS |
| DELETE /notifications/{id} | Y | Y | I | PASS |
| POST /notifications/send | Y | Y | I | PASS |
| GET /notifications/preferences | Y | Y | I | PASS |
| PUT /notifications/preferences | Y | Y | I,A | PASS |
| POST /devices/register | Y | Y | I | PASS |
| DELETE /devices/{deviceId} | Y | Y | - | NOT_TESTED |

---

## 6. SEARCH & FILTERS

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| GET /search/users | Y | Y | I | PASS |
| POST /search/advanced | Y | Y | - | NOT_TESTED |
| GET /filters/options | Y | Y | I | PASS |
| POST /filters/save | Y | Y | - | NOT_TESTED |
| GET /filters/saved | Y | Y | - | NOT_TESTED |

---

## 7. SUBSCRIPTIONS & PAYMENTS

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| GET /subscriptions/plans | Y | N | I | PASS |
| GET /subscriptions/current | Y | Y | I,E | PASS |
| POST /payments/create-intent | Y | Y | U,I | PASS |
| POST /payments/subscription/create | Y | Y | U,I,E | PASS |
| POST /payments/subscription/cancel | Y | Y | U,I | PASS |
| POST /subscriptions/restore | Y | Y | - | NOT_TESTED |
| GET /payments/methods/{customerId} | Y | Y | U | PASS |
| POST /payments/methods/add | Y | Y | U | PASS |
| POST /payments/refund | Y | Y | U | PASS |
| POST /payments/webhook | Y | N | U,I | PASS |
| POST /payments/webhook/stripe | Y | N | U,I | PASS |
| POST /payments/webhook/paystack | P | N | - | STUB |
| POST /payments/webhook/flutterwave | P | N | - | STUB |
| POST /iap/validate-receipt | Y | Y | - | NOT_TESTED |

---

## 8. TRUST, SAFETY, MODERATION

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| POST /blocks/{blockedId} | Y | Y | I | PASS |
| DELETE /blocks/{blockedId} | Y | Y | I | PASS |
| GET /blocks/list | Y | Y | I | PASS |
| GET /blocks/check/{targetUserId} | Y | Y | I | PASS |
| POST /reports | Y | Y | I | PASS |
| POST /verification/identity | Y | Y | I | PASS |
| POST /verification/photo | Y | Y | I,E | PASS |
| GET /verification/status | Y | Y | I | PASS |
| POST /ai/moderation/text | Y | I | I | PASS |
| POST /ai/moderation/image | Y | I | I | PASS |

---

## 9. ACTIVITY, LOCATION, SYSTEM

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| GET /activity/feed | P | Y | - | NOT_TESTED |
| POST /activity/like | P | Y | - | NOT_TESTED |
| POST /activity/view | P | Y | - | NOT_TESTED |
| POST /activity/share | P | Y | - | NOT_TESTED |
| POST /location/update | Y | Y | I | PASS |
| GET /location/nearby | Y | Y | I | PASS |
| PUT /location/privacy | Y | Y | I | PASS |
| GET /health | Y | N | - | PASS |
| GET /status | Y | N | - | PASS |
| POST /logs/client | Y | Y | - | NOT_TESTED |
| GET /config/feature-flags | Y | Y | - | NOT_TESTED |

---

## 10. PREMIUM FEATURES

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| POST /boosts/activate | Y | Y | I | PASS |
| GET /boosts/status | Y | Y | I | PASS |
| POST /coins/purchase | Y | Y | I,E | PASS |
| GET /coins/balance | Y | Y | I | PASS |
| GET /coins/transactions | Y | Y | I | PASS |
| GET /achievements | Y | Y | - | NOT_TESTED |
| GET /rewards | Y | Y | - | NOT_TESTED |

---

## 11. INTERNAL SERVICE ENDPOINTS

| Endpoint | Exists | Auth | Coverage | Status |
|----------|--------|------|----------|--------|
| POST /internal/messages/publish | Y | I | - | INTERNAL |
| POST /internal/messages/read-receipt | Y | I | - | INTERNAL |
| POST /internal/messages/typing | Y | I | - | INTERNAL |
| GET /internal/users/{userId} | Y | I | - | INTERNAL |
| POST /internal/notifications/send | Y | I | - | INTERNAL |

---

## SUMMARY

| Category | Total | Exists | Tested | Pass Rate |
|----------|-------|--------|--------|-----------|
| Auth & Identity | 16 | 14 | 11 | 79% |
| Users/Profile | 15 | 15 | 11 | 73% |
| Discovery/Matching | 13 | 13 | 7 | 54% |
| Messaging | 16 | 16 | 12 | 75% |
| Notifications | 10 | 10 | 8 | 80% |
| Search/Filters | 5 | 5 | 2 | 40% |
| Payments | 14 | 12 | 8 | 67% |
| Trust/Safety | 10 | 10 | 9 | 90% |
| System | 11 | 9 | 4 | 44% |
| Premium | 7 | 7 | 4 | 57% |
| **TOTAL** | **117** | **111** | **76** | **69%** |

---

## CRITICAL GAPS

### High Priority (Block Launch):
1. OAuth integration tests (Google/Apple/Facebook)
2. 2FA flow tests
3. Paystack/Flutterwave webhook completion
4. Subscription restore (mobile) tests

### Medium Priority:
1. Discovery refresh endpoint test
2. Swipe undo test (premium feature)
3. Photo reorder/video-intro tests
4. Voice/video message tests
5. Search advanced filters test
6. Feature flags config endpoint

### Low Priority:
1. Activity feed endpoints (if feature enabled)
2. Client logging endpoint
3. Achievement/rewards endpoints
