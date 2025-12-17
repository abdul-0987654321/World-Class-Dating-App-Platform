# Discovered System Profile - Flamoral Dating Platform

**Generated:** 2025-12-12
**QA Architect Report**

---

## 1. PLATFORM OVERVIEW

| Component | Technology | Version |
|-----------|------------|---------|
| **Backend** | Node.js + Express/NestJS | 20.x |
| **Frontend Web** | React + Vite | 18.2.0 / 5.0.8 |
| **Mobile** | React Native + Expo | 0.73.0 |
| **Database** | PostgreSQL + MongoDB + Cosmos DB | 16 / 7 / Azure |
| **Cache** | Redis | 7.x |
| **Message Queue** | RabbitMQ + Azure Service Bus | 3.x |
| **Search** | Elasticsearch | 8.11.0 |
| **Container Orchestration** | Kubernetes (AKS) | 1.28.x |

---

## 2. API BASE URLs

| Environment | URL | WebSocket |
|-------------|-----|-----------|
| Development | http://localhost:3000-3012 | ws://localhost:5000 |
| Test | http://localhost:3001/api | ws://localhost:5000 |
| Production | https://api.flamoral.com | wss://api.flamoral.com |

---

## 3. AUTHENTICATION MECHANISM

- **Type:** JWT (Access + Refresh Tokens)
- **Access Token Expiry:** 7 days (configurable)
- **Refresh Token:** Supported with rotation
- **Storage (Web):** localStorage (LEGACY) / httpOnly cookies (SECURE)
- **Storage (Mobile):** AsyncStorage
- **OAuth Providers:** Google, Facebook, Apple
- **2FA:** Supported (TOTP-based)
- **Service-to-Service:** API Key + Internal Auth Middleware

---

## 4. WEBSOCKET ENDPOINTS

| Namespace | Purpose | Events |
|-----------|---------|--------|
| `/ws` | Main gateway | message:send, message:typing, message:read, presence:*, call:* |
| Redis Channels | `heartly:messages`, `heartly:matches`, `heartly:notifications`, `heartly:presence`, `heartly:typing` |

---

## 5. PAYMENT PROVIDERS

| Provider | Status | Environments |
|----------|--------|--------------|
| **Stripe** | FULLY IMPLEMENTED | All |
| **Paystack** | STUB (Basic structure) | Dev/Test |
| **Flutterwave** | STUB (Basic structure) | Dev/Test |
| **Apple IAP** | IMPLEMENTED | Production |
| **Google Play** | IMPLEMENTED | Production |

**Subscription Tiers:** free, basic, plus, premium, premium_plus, elite
**Billing Cycles:** monthly, 3_months, 6_months, yearly

---

## 6. PUSH NOTIFICATION PROVIDERS

| Provider | Platform | Status |
|----------|----------|--------|
| Firebase (FCM) | Android, Web | Configured |
| APNs | iOS | Configured |
| SendGrid | Email | Configured |
| Twilio | SMS | Configured |

---

## 7. DATABASE SCHEMA & MIGRATIONS

### Core Tables (PostgreSQL):
- `users`, `profiles`, `user_preferences`, `verification_tokens`
- `matches`, `swipes`, `likes`, `super_likes`
- `conversations`, `messages`, `message_attachments`
- `subscription_plans`, `user_subscriptions`, `transactions`
- `payment_methods`, `coin_packages`, `coin_transactions`
- `blocks`, `reports`, `notifications`, `devices`
- `stripe/paystack/flutterwave_webhook_events`

### Migration Strategy:
- Knex.js migrations (TypeScript)
- Rollback support
- Seed data available for testing

---

## 8. FEATURE FLAGS

| Flag | Default | Purpose |
|------|---------|---------|
| FEATURE_AI_MATCHING | true | AI-powered matching |
| FEATURE_VIDEO_CALLS | true | Video calling |
| FEATURE_VOICE_CALLS | true | Voice calling |
| FEATURE_TRAVEL_MODE | true | Travel mode |
| FEATURE_DATING_COACH | true | AI dating coach |
| FEATURE_GAMIFICATION | true | Points/badges |
| FEATURE_SOCIAL_FEED | true | Activity feed |
| FEATURE_STORIES | true | Story feature |
| FEATURE_BETA_FEATURES | false | Beta access |
| FEATURE_MAINTENANCE_MODE | false | Maintenance |

---

## 9. BACKEND SERVICES INVENTORY

| Service | Port | Status |
|---------|------|--------|
| api-gateway | 4000 | Active |
| auth-service | 3011 | Active |
| user-service | 3001 | Active |
| matching-service | 3002 | Active |
| messaging-service | 3003 | Active |
| payment-service | 3005 | Active |
| media-service | 3006 | Active |
| notification-service | 3008 | Active |
| analytics-service | 3007 | Active |
| moderation-service | 3004 | Active |
| realtime-service | 3012 | Active |
| admin-service | - | Active |
| ai-services | 3009 | Active |
| advertising-service | 3010 | Active |
| automation-service | - | Active |
| workflow-engine | - | Active |

---

## 10. EXISTING TEST COVERAGE

### Unit Tests:
- auth-service: controllers, services, validators ✓
- user-service: controllers, services, repositories ✓
- payment-service: controllers, services ✓
- matching-service: swipe service ✓
- media-service: image processing, upload, verification ✓
- messaging-service: message service ✓

### Integration Tests:
- auth.integration.test.ts ✓
- user.integration.test.ts ✓
- matching.integration.test.ts ✓
- messaging.integration.test.ts ✓
- payment.integration.test.ts ✓
- moderation.integration.test.ts ✓
- subscription.integration.test.ts ✓
- coin.integration.test.ts ✓
- boost.integration.test.ts ✓
- privacy-safety.integration.test.ts ✓

### E2E Tests:
- auth.spec.ts ✓
- critical-flows.spec.ts ✓
- discovery-swiping.spec.ts ✓
- messaging.spec.ts ✓
- payment-subscription.spec.ts ✓
- profile-setup.spec.ts ✓
- Web: Playwright ✓
- Mobile: Detox ✓

### API Tests:
- auth-api-complete.spec.ts ✓
- user-api.spec.ts ✓
- matching-api.spec.ts ✓
- messaging-api.spec.ts ✓
- notification-api.spec.ts ✓
- media-api.spec.ts ✓
- payment-api.spec.ts ✓

### Security Tests:
- authentication-security.spec.ts ✓

### Load Tests:
- K6 scenarios (discovery, matching, chat, websocket) ✓

---

## 11. SECRETS & ENV VARIABLES

### Required Secrets (Azure Key Vault):
- JWT_SECRET, JWT_REFRESH_SECRET
- DB_PASSWORD, REDIS_PASSWORD
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- SENDGRID_API_KEY, TWILIO_AUTH_TOKEN
- FIREBASE_PRIVATE_KEY
- SERVICE_API_KEY
- ENCRYPTION_KEY

### GitHub Secrets:
- AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID
- EXPO_TOKEN, SNYK_TOKEN
- SLACK_WEBHOOK_URL, PAGERDUTY_INTEGRATION_KEY

---

## 12. COVERAGE GAPS IDENTIFIED

### Missing Tests:
1. OAuth integration tests (Google/Apple/Facebook)
2. 2FA enable/verify flow tests
3. Webhook signature verification tests (Paystack/Flutterwave)
4. Rate limiting boundary tests
5. IDOR vulnerability tests
6. File upload type/size validation tests
7. WebSocket reconnection tests
8. Message encryption tests
9. Subscription restore flow (mobile)
10. Admin panel integration tests

### Code Quality Issues:
1. **Web App:** Multiple API client versions in use (localStorage vs httpOnly)
2. **Mobile App:** SSL pinning not universally enabled
3. **Backend:** Paystack/Flutterwave webhooks are stubs only
4. **Tests:** Some duplicate test directories (__tests__ vs tests)

---

## 13. INFRASTRUCTURE READINESS

| Component | Status | Notes |
|-----------|--------|-------|
| Azure AKS | Ready | Multi-node cluster |
| Azure ACR | Ready | Container registry |
| Azure Key Vault | Ready | Secrets management |
| Azure Service Bus | Ready | Message queues |
| PostgreSQL (Azure) | Ready | Premium tier |
| Redis (Azure) | Ready | Premium tier |
| Cosmos DB | Ready | For messaging |
| CDN | Ready | Media delivery |
| WAF/DDoS | Ready | Production only |
| SSL/TLS | Ready | Let's Encrypt |
| Monitoring | Ready | Prometheus/Grafana/Jaeger |

---

## 14. CI/CD PIPELINE STATUS

| Pipeline | Trigger | Status |
|----------|---------|--------|
| main-ci.yml | Push/PR | Active |
| e2e-tests.yml | PR | Active |
| integration-tests.yml | PR | Active |
| security-tests.yml | Push/Schedule | Active |
| helm-deploy.yml | Manual | Active |
| unified-cd-production.yml | Manual + Approval | Active |

---

## 15. RECOMMENDATIONS

### Critical (Must Fix Before Launch):
1. Consolidate web API client to secure version (httpOnly cookies)
2. Complete Paystack/Flutterwave webhook implementations
3. Add comprehensive rate limiting tests
4. Fix localStorage usage in production code

### High Priority:
1. Enable SSL pinning in mobile app universally
2. Add OAuth flow integration tests
3. Add 2FA flow tests
4. Remove duplicate test directories

### Medium Priority:
1. Add chaos engineering tests
2. Implement contract testing (Pact)
3. Add visual regression tests for mobile
4. Performance baseline establishment
