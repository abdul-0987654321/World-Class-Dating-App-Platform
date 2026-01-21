# Flamoral Dating Platform - QA Inventory

**Last Updated:** 2026-01-19  
**Version:** 1.0.0

---

## 1. API Endpoint Inventory

### 1.1 Auth Service (Port 3001)

| Method | Endpoint | Auth | Test Status |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | None | ✅ Covered |
| POST | `/api/v1/auth/login` | None | ✅ Covered |
| POST | `/api/v1/auth/logout` | JWT | ✅ Covered |
| POST | `/api/v1/auth/refresh` | Refresh | ✅ Covered |
| POST | `/api/v1/auth/verify-email` | Token | ✅ Covered |
| POST | `/api/v1/auth/forgot-password` | None | ✅ Covered |
| POST | `/api/v1/auth/reset-password` | Token | ✅ Covered |
| POST | `/api/v1/auth/mfa/enable` | JWT | ⚠️ Partial |
| POST | `/api/v1/auth/oauth/google` | OAuth | ❌ Missing |
| POST | `/api/v1/auth/oauth/apple` | OAuth | ❌ Missing |

**Coverage: 70%**

### 1.2 User Service (Port 3002)

| Method | Endpoint | Auth | Test Status |
|--------|----------|------|-------------|
| GET | `/api/v1/users/me` | JWT | ✅ Covered |
| PUT | `/api/v1/users/me` | JWT | ✅ Covered |
| GET | `/api/v1/users/me/profile` | JWT | ✅ Covered |
| PUT | `/api/v1/users/me/profile` | JWT | ✅ Covered |
| POST | `/api/v1/users/me/photos` | JWT | ⚠️ Partial |
| GET | `/api/v1/users/me/preferences` | JWT | ✅ Covered |
| POST | `/api/v1/users/block/:id` | JWT | ❌ Missing |
| POST | `/api/v1/users/report/:id` | JWT | ❌ Missing |
| DELETE | `/api/v1/users/me` | JWT | ❌ Missing |

**Coverage: 55%**

### 1.3 Matching Service (Port 3003)

| Method | Endpoint | Auth | Test Status |
|--------|----------|------|-------------|
| GET | `/api/v1/discovery` | JWT | ✅ Covered |
| POST | `/api/v1/swipe/like` | JWT | ✅ Covered |
| POST | `/api/v1/swipe/pass` | JWT | ✅ Covered |
| POST | `/api/v1/swipe/super-like` | JWT | ⚠️ Partial |
| GET | `/api/v1/matches` | JWT | ✅ Covered |
| DELETE | `/api/v1/matches/:id` | JWT | ✅ Covered |
| POST | `/api/v1/boost` | JWT | ❌ Missing |

**Coverage: 71%**

### 1.4 Messaging Service (Port 5000)

| Method | Endpoint | Auth | Test Status |
|--------|----------|------|-------------|
| GET | `/api/v1/conversations` | JWT | ✅ Covered |
| GET | `/api/v1/conversations/:id/messages` | JWT | ✅ Covered |
| POST | `/api/v1/conversations/:id/messages` | JWT | ✅ Covered |
| POST | `/api/v1/calls/initiate` | JWT | ❌ Missing |
| WS | `/ws/messaging` | JWT | ⚠️ Partial |

**Coverage: 60%**

### 1.5 Payment Service (Port 3007)

| Method | Endpoint | Auth | Test Status |
|--------|----------|------|-------------|
| GET | `/api/v1/subscriptions/plans` | JWT | ✅ Covered |
| POST | `/api/v1/subscriptions/subscribe` | JWT | ✅ Covered |
| POST | `/api/v1/subscriptions/cancel` | JWT | ✅ Covered |
| POST | `/api/v1/webhooks/stripe` | Stripe | ❌ Missing |

**Coverage: 75%**

---

## 2. Critical UI Journeys

| # | Journey | Priority | Status |
|---|---------|----------|--------|
| 1 | User Registration | P0 | ✅ Covered |
| 2 | Login/Logout | P0 | ✅ Covered |
| 3 | Profile Setup | P0 | ✅ Covered |
| 4 | Discovery/Swiping | P0 | ✅ Covered |
| 5 | Match Creation | P0 | ✅ Covered |
| 6 | Messaging | P0 | ✅ Covered |
| 7 | Subscription Purchase | P0 | ✅ Covered |
| 8 | Profile Edit | P0 | ✅ Covered |
| 9 | Photo Verification | P1 | ⚠️ Partial |
| 10 | Video Call | P1 | ❌ Missing |
| 11 | Settings | P1 | ❌ Missing |
| 12 | Block/Report | P1 | ❌ Missing |
| 13 | GDPR Deletion | P0 | ❌ Missing |
| 14 | Social Login | P1 | ❌ Missing |

**Coverage: 57%**

---

## 3. Test Suite Breakdown

### Smoke Tests (< 5 min)
- API Health: 8 tests
- Auth Flow: 6 tests
- Core CRUD: 10 tests
- UI Critical: 8 tests
**Total: 32 tests**

### Regression (< 60 min)
- API E2E: 80+ tests
- UI E2E: 80+ tests
- Integration: 200+ tests
**Total: 360+ tests**

---

## 4. Gap Analysis (P0 Critical)

| Gap | Impact | Action |
|-----|--------|--------|
| OAuth tests | Auth coverage | Implement mock OAuth |
| Stripe webhooks | Payment reliability | Add webhook tests |
| GDPR deletion | Legal compliance | Implement flow tests |
| Video calls | Feature coverage | Add Agora mocks |
| Block/Report | User safety | Add safety tests |

---

## 5. Recommended Cadence

| Trigger | Tests | Duration |
|---------|-------|----------|
| PR | Smoke | < 10 min |
| Main | API + Integration | < 40 min |
| Nightly | Full Regression | < 90 min |
| Weekly | Load + Security | < 4 hours |
