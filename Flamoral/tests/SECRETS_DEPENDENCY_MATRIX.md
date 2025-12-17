# Flamoral Dating Platform - API-to-Secret Dependency Matrix

**Generated:** 2025-12-12
**Platform:** Flamoral Dating Platform (Azure AKS Deployment)
**Total Secrets Identified:** 87+ unique secrets across 5 categories

---

## Executive Summary

This report maps all 15 microservices to their required secrets, categorized by type.

**Key Findings:**
- **Current Key Vault Coverage:** 29/63 production secrets (46%)
- **Missing from Key Vault:** 34+ critical secrets
- **Critical Security Gaps:** CSAM compliance, message encryption, Cosmos DB credentials

---

## Master Matrix: Service to Secrets

| Service | Auth | Payment | Database | External | Infrastructure | Total |
|---------|------|---------|----------|----------|----------------|-------|
| **API Gateway** | 6 | - | 2 | 2 | - | 10 |
| **Auth Service** | 7 | - | 4 | 2 | 1 | 13 |
| **User Service** | 7 | - | 4 | 10 | 1 | 20 |
| **Payment Service** | 3 | 6 | 4 | 1 | 1 | 13 |
| **Messaging Service** | 3 | - | 4 | 2 | 2 | 11 |
| **Media Service** | 2 | - | 4 | 5 | 1 | 12 |
| **Notification Service** | 1 | - | 4 | 7 | 1 | 13 |
| **Moderation Service** | 2 | - | 4 | 10 | 1 | 16 |
| **Analytics Service** | 2 | - | 6 | 7 | 1 | 15 |
| **Matching Service** | 2 | - | 4 | 3 | 1 | 10 |
| **Realtime Service** | 2 | - | 2 | 2 | 1 | 7 |
| **Admin Service** | 4 | - | 3 | 2 | 1 | 10 |
| **AI Services** | 1 | - | 3 | 4 | 1 | 9 |

---

## Secrets by Category

### 1. AUTH SECRETS

| Secret Name | Services Using | Key Vault Status |
|-------------|---------------|------------------|
| JWT_SECRET | All services | In Vault |
| JWT_ACCESS_SECRET | 10 services | In Vault |
| JWT_REFRESH_SECRET | 9 services | In Vault |
| SESSION_SECRET | 3 services | In Vault |
| GOOGLE_CLIENT_SECRET | 2 services | In Vault |
| FACEBOOK_APP_SECRET | 2 services | In Vault |
| APPLE_PRIVATE_KEY | 2 services | In Vault |
| SERVICE_API_KEY | 15 services | In Vault |
| ADMIN_OVERRIDE_SECRET | 1 service | **MISSING** |
| TOTP_ENCRYPTION_MASTER_KEY | 1 service | **MISSING** |

### 2. PAYMENT SECRETS

| Secret Name | Services Using | Key Vault Status |
|-------------|---------------|------------------|
| STRIPE_SECRET_KEY | Payment Service | In Vault |
| STRIPE_WEBHOOK_SECRET | Payment Service | In Vault |
| PAYSTACK_SECRET_KEY | Payment Service | Disabled |
| FLUTTERWAVE_SECRET_KEY | Payment Service | Disabled |
| APPLE_IAP_SHARED_SECRET | Payment Service | **MISSING** |
| GOOGLE_PLAY_SERVICE_ACCOUNT | Payment Service | **MISSING** |

### 3. DATABASE SECRETS

| Secret Name | Services Using | Key Vault Status |
|-------------|---------------|------------------|
| DB_PASSWORD | 9 services | In Vault |
| DATABASE_URL | 9 services | In Vault |
| MONGODB_URI | 3 services | In Vault |
| REDIS_PASSWORD | 15 services | In Vault |
| REDIS_URL | 15 services | In Vault |
| COSMOS_KEY | 1 service | **MISSING** |
| COSMOS_ENDPOINT | 1 service | **MISSING** |

### 4. EXTERNAL SECRETS

| Secret Name | Services Using | Key Vault Status |
|-------------|---------------|------------------|
| SENDGRID_API_KEY | 3 services | In Vault |
| TWILIO_AUTH_TOKEN | 1 service | In Vault |
| FIREBASE_PRIVATE_KEY | 1 service | In Vault |
| AGORA_APP_CERTIFICATE | 2 services | In Vault |
| AGORA_CUSTOMER_SECRET | 2 services | In Vault |
| OPENAI_API_KEY | 2 services | In Vault |
| SENTRY_DSN | 15 services | In Vault |
| AZURE_FACE_API_KEY | 3 services | In Vault |
| AZURE_CONTENT_MODERATOR_KEY | 1 service | In Vault |
| PHOTODNA_API_KEY | 1 service | **MISSING** (CRITICAL) |
| NCMEC_API_KEY | 1 service | **MISSING** (CRITICAL) |

### 5. INFRASTRUCTURE SECRETS

| Secret Name | Services Using | Key Vault Status |
|-------------|---------------|------------------|
| AZURE_STORAGE_KEY | 2 services | In Vault |
| AZURE_STORAGE_CONNECTION_STRING | 2 services | In Vault |
| AZURE_SERVICE_BUS_CONNECTION_STRING | 3 services | In Vault |
| APPLICATION_INSIGHTS_CONNECTION_STRING | 15 services | In Vault |
| ENCRYPTION_KEY | 1 service | **MISSING** |
| ELASTICSEARCH_PASSWORD | 1 service | **MISSING** |

---

## Critical Security Issues

### CRITICAL (Immediate Action Required)

1. **CSAM Detection Secrets Not in Key Vault**
   - Impact: Legal non-compliance (18 U.S.C. Section 2258A)
   - Secrets: PHOTODNA_API_KEY, NCMEC_API_KEY, CSAM_ENCRYPTION_KEY, AUDIT_SIGNING_KEY
   - Action: Migrate to Key Vault within 24 hours

2. **Message Encryption Key Not in Key Vault**
   - Impact: GDPR violation risk
   - Secret: ENCRYPTION_KEY
   - Action: Migrate immediately

3. **Cosmos DB Credentials Not in Key Vault**
   - Impact: Full database access if compromised
   - Secrets: COSMOS_KEY, COSMOS_ENDPOINT
   - Action: Migrate immediately

4. **2FA Encryption Keys Not in Key Vault**
   - Impact: User 2FA secrets exposed
   - Secrets: TOTP_ENCRYPTION_MASTER_KEY, TOTP_ENCRYPTION_KEY_SALT
   - Action: Migrate within 48 hours

### HIGH (Action Within 7 Days)

5. **Mobile Payment Credentials Not in Key Vault**
   - Secrets: APPLE_IAP_SHARED_SECRET, GOOGLE_PLAY_SERVICE_ACCOUNT

6. **Push Notification Keys Not Centralized**
   - Secrets: APNS_KEY, FCM_SERVER_KEY, FIREBASE_SERVICE_ACCOUNT

7. **Admin Override Secret Not in Key Vault**
   - Secret: ADMIN_OVERRIDE_SECRET

8. **No Secret Rotation Automation**

---

## Vault-per-App Architecture Mapping

### Auth Vault (flamoral-{env}-auth-kv)
- JWT secrets (access, refresh, legacy)
- OAuth credentials (Google, Facebook, Apple)
- Session secrets
- Service API keys

**Services with Access:** Auth Service (full), API Gateway (read), User Service (OAuth only)

### Payment Vault (flamoral-{env}-payment-kv)
- Stripe API keys and webhook secrets
- Mobile IAP credentials (Apple, Google Play)
- Payment gateway tokens

**Services with Access:** Payment Service (full), User Service (read subscriptions)

### Data Vault (flamoral-{env}-data-kv)
- PostgreSQL credentials per service
- MongoDB/Cosmos DB credentials
- Redis connection strings
- Backup encryption keys

**Services with Access:** All backend services (scoped per service)

### External Vault (flamoral-{env}-external-kv)
- Communication (SendGrid, Twilio, Firebase)
- Video (Agora.io)
- AI (OpenAI, Azure Cognitive)
- Monitoring (Sentry, Mixpanel)

**Services with Access:** Notification, Media, Moderation, Analytics

### Infrastructure Vault (flamoral-{env}-infra-kv)
- Azure Storage credentials
- Service Bus connections
- Application Insights
- Elasticsearch credentials

**Services with Access:** Infrastructure components, backup automation

---

## Hardcoded Secrets Analysis

**Status: PASSED**

- Searched pattern: `(sk_live_|sk_test_|pk_live_|whsec_|SG\.|xoxb-|ghp_|gho_|AIza)`
- 59 files matched (all in .env.example or documentation)
- No actual secrets hardcoded in source code

---

## Secret Rotation Requirements

| Secret | Current | Recommended | Automation |
|--------|---------|-------------|------------|
| JWT Secrets | Manual | 90 days | None |
| Database Passwords | Manual | 180 days | None |
| Service API Key | Manual | 90 days | None |
| Stripe Webhook Secret | Manual | When compromised | None |
| Encryption Keys | Manual | 365 days | Partial |
| OAuth Secrets | Manual | Per provider | None |

---

## Compliance Checklist

### GDPR
- Encryption at rest
- Encryption in transit
- Right to erasure
- Data retention policies

### CCPA
- User data deletion
- Privacy policy
- Opt-out mechanisms

### CSAM Compliance (18 U.S.C. Section 2258A)
- **CRITICAL:** CSAM detection credentials NOT in secure vault
- NCMEC reporting implemented
- PhotoDNA integration implemented
- 90-day evidence retention configured

### PCI DSS
- Stripe handles all card data
- No card data stored in application
- Webhook signature verification implemented

---

## Recommendations

1. **Immediate:** Migrate 11 critical secrets (CSAM + encryption + Cosmos DB) within 24-48 hours
2. **Week 1:** Complete vault-per-app architecture deployment
3. **Week 2:** Implement secret rotation automation
4. **Week 3-4:** Enable private endpoints for production vaults
5. **Ongoing:** Regular secret audits and rotation
