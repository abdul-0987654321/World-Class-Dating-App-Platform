# Flamoral Dating Platform - Master Integration Guide

> **Version:** 1.0.0
> **Last Updated:** December 2024
> **Status:** Production Ready

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [All Integrations Summary](#all-integrations-summary)
3. [Third-Party Services Configuration](#third-party-services-configuration)
4. [Environment Variables Reference](#environment-variables-reference)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Platform Overview

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLAMORAL DATING PLATFORM                       │
├─────────────────────────────────────────────────────────────────────────┤
│  CLIENTS                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   iOS App    │  │ Android App  │  │   Web App    │                  │
│  │ React Native │  │ React Native │  │    React     │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
├─────────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Azure Front  │  │   Azure      │  │    Azure     │                  │
│  │    Door      │  │     AKS      │  │     ACR      │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
├─────────────────────────────────────────────────────────────────────────┤
│  BACKEND SERVICES (16 Microservices)                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │API GW  │ │  Auth  │ │  User  │ │ Match  │ │Message │              │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ Media  │ │Payment │ │Notific.│ │Analytics│ │Moderate│              │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │Realtime│ │ Admin  │ │  Ads   │ │Automate│ │Workflow│              │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘              │
├─────────────────────────────────────────────────────────────────────────┤
│  AI/ML SERVICES                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │Recommend.  │ │Dating Coach│ │Photo Anal. │ │Fraud Detect│          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
├─────────────────────────────────────────────────────────────────────────┤
│  DATA STORES                                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │PostgreSQL│ │ Redis │ │CosmosDB│ │ Kafka  │ │Blob Stor│             │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Microservices List

| Service | Technology | Port | Purpose |
|---------|------------|------|---------|
| API Gateway | Node.js/Express | 3000 | Request routing, rate limiting |
| Auth Service | Node.js/TypeScript | 3001 | Authentication, JWT, OAuth |
| User Service | Node.js/TypeScript | 3002 | User profiles, preferences |
| Matching Service | Node.js/TypeScript | 3003 | Swipes, matches, discovery |
| Messaging Service | Node.js/TypeScript | 3004 | Chat, WebSocket, E2E encryption |
| Media Service | Node.js/TypeScript | 3005 | Photo/video upload, CDN |
| Payment Service | Node.js/TypeScript | 3006 | Stripe, Apple Pay, Google Pay |
| Notification Service | Node.js/TypeScript | 3007 | Push, Email, SMS |
| Analytics Service | Node.js/TypeScript | 3008 | Events, metrics, reporting |
| Moderation Service | Python/FastAPI | 3009 | Content moderation, AI |
| Realtime Service | Node.js/Socket.io | 3010 | WebSocket connections |
| Admin Service | Node.js/TypeScript | 3011 | Admin dashboard API |
| Advertising Service | Node.js/TypeScript | 3012 | Ads, campaigns |
| Automation Service | Node.js/TypeScript | 3013 | Scheduled tasks, jobs |
| Workflow Engine | Node.js/TypeScript | 3014 | Business process automation |
| AI Recommendation | Python/FastAPI | 5001 | ML matching algorithm |
| Dating Coach | Python/FastAPI | 5002 | AI conversation suggestions |
| Photo Analysis | Python/FastAPI | 5003 | Photo scoring, verification |
| Fraud Detection | Python/FastAPI | 5004 | Fraud prevention |

---

## All Integrations Summary

### Payment Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Stripe** | Web payments, subscriptions | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | [Stripe Docs](https://stripe.com/docs) |
| **Apple IAP** | iOS in-app purchases | `APPLE_SHARED_SECRET` | [App Store Connect](https://appstoreconnect.apple.com) |
| **Google Play Billing** | Android in-app purchases | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | [Play Console](https://play.google.com/console) |
| **PayPal** | Alternative payment | `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` | [PayPal Developer](https://developer.paypal.com) |

### Authentication Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Google OAuth** | Social login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com) |
| **Apple Sign In** | iOS social login | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` | [Apple Developer](https://developer.apple.com) |
| **Facebook Login** | Social login | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | [Facebook Developers](https://developers.facebook.com) |
| **Twilio** | SMS verification | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | [Twilio Console](https://console.twilio.com) |

### Communication Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Firebase FCM** | Push notifications | `FIREBASE_SERVICE_ACCOUNT_JSON` | [Firebase Console](https://console.firebase.google.com) |
| **Apple APNs** | iOS push notifications | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_FILE` | [Apple Developer](https://developer.apple.com) |
| **SendGrid** | Email delivery | `SENDGRID_API_KEY` | [SendGrid](https://sendgrid.com) |
| **Twilio** | SMS delivery | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | [Twilio Console](https://console.twilio.com) |

### Video/Voice Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Agora** | Video/voice calling | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | [Agora Console](https://console.agora.io) |
| **Agora Cloud Recording** | Call recording | Same as above + S3/Azure config | [Agora Docs](https://docs.agora.io) |

### Media Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Azure Blob Storage** | Media storage | `AZURE_STORAGE_CONNECTION_STRING` | [Azure Portal](https://portal.azure.com) |
| **Azure CDN** | Content delivery | Configured via Terraform | [Azure CDN](https://azure.microsoft.com/services/cdn) |
| **Tenor/Giphy** | GIF integration | `TENOR_API_KEY`, `GIPHY_API_KEY` | [Tenor](https://tenor.com/developer), [Giphy](https://developers.giphy.com) |

### AI/ML Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Azure Face API** | Photo verification | `AZURE_FACE_API_KEY`, `AZURE_FACE_ENDPOINT` | [Azure Cognitive Services](https://azure.microsoft.com/services/cognitive-services) |
| **Azure Content Moderator** | Content moderation | `AZURE_CONTENT_MODERATOR_KEY` | [Azure Cognitive Services](https://azure.microsoft.com/services/cognitive-services) |
| **OpenAI GPT-4** | AI features | `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com) |
| **AWS Rekognition** | Alternative photo analysis | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | [AWS Console](https://console.aws.amazon.com) |

### Infrastructure Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Azure AKS** | Kubernetes hosting | Service Principal | [Azure Portal](https://portal.azure.com) |
| **Azure ACR** | Container registry | Managed Identity | [Azure Portal](https://portal.azure.com) |
| **Azure Key Vault** | Secrets management | Managed Identity | [Azure Portal](https://portal.azure.com) |
| **Azure Front Door** | CDN, WAF, Load balancing | Configured via Terraform | [Azure Portal](https://portal.azure.com) |
| **Azure PostgreSQL** | Primary database | Connection string | [Azure Portal](https://portal.azure.com) |
| **Azure Redis** | Caching, sessions | Connection string | [Azure Portal](https://portal.azure.com) |
| **Azure Cosmos DB** | Messages, real-time data | Connection string | [Azure Portal](https://portal.azure.com) |
| **Azure Service Bus** | Message queue | Connection string | [Azure Portal](https://portal.azure.com) |

### Monitoring Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Prometheus** | Metrics collection | Configured in K8s | [Prometheus](https://prometheus.io) |
| **Grafana** | Dashboards | Configured in K8s | [Grafana](https://grafana.com) |
| **Jaeger** | Distributed tracing | Configured in K8s | [Jaeger](https://jaegertracing.io) |
| **Loki** | Log aggregation | Configured in K8s | [Grafana Loki](https://grafana.com/oss/loki) |
| **PagerDuty** | Alerting | `PAGERDUTY_ROUTING_KEY` | [PagerDuty](https://pagerduty.com) |
| **Slack** | Alert notifications | `SLACK_WEBHOOK_URL` | [Slack API](https://api.slack.com) |

### Analytics Integrations

| Integration | Purpose | Required Keys | Documentation |
|-------------|---------|---------------|---------------|
| **Mixpanel** | Product analytics | `MIXPANEL_TOKEN` | [Mixpanel](https://mixpanel.com) |
| **Amplitude** | User analytics | `AMPLITUDE_API_KEY` | [Amplitude](https://amplitude.com) |
| **Firebase Analytics** | Mobile analytics | Included with Firebase | [Firebase](https://firebase.google.com) |

---

## Third-Party Services Configuration

### 1. Stripe Setup

```bash
# 1. Create Stripe account at https://stripe.com
# 2. Get API keys from Dashboard > Developers > API keys
# 3. Create webhook endpoint at Dashboard > Developers > Webhooks
#    Endpoint URL: https://api.flamoral.com/api/payments/webhook
#    Events to subscribe:
#    - checkout.session.completed
#    - customer.subscription.created
#    - customer.subscription.updated
#    - customer.subscription.deleted
#    - invoice.paid
#    - invoice.payment_failed

# 4. Create products and prices in Stripe Dashboard:
#    - Gold Monthly: $14.99
#    - Gold Yearly: $143.88
#    - Platinum Monthly: $24.99
#    - Platinum Yearly: $239.88
#    - Diamond Monthly: $39.99
#    - Diamond Yearly: $383.88
```

### 2. Firebase Setup

```bash
# 1. Create Firebase project at https://console.firebase.google.com
# 2. Enable Cloud Messaging
# 3. Download service account JSON:
#    Project Settings > Service Accounts > Generate New Private Key
# 4. For iOS: Upload APNs key or certificate
# 5. For Android: Download google-services.json
```

### 3. Agora Setup

```bash
# 1. Create account at https://console.agora.io
# 2. Create new project (select "Secured mode")
# 3. Copy App ID and App Certificate
# 4. Enable Cloud Recording if needed
# 5. Configure recording storage (S3 or Azure Blob)
```

### 4. Apple Developer Setup

```bash
# 1. Apple Sign In:
#    - Register App ID with Sign In with Apple capability
#    - Create Services ID for web
#    - Generate private key

# 2. In-App Purchases:
#    - Create App in App Store Connect
#    - Add In-App Purchases (subscriptions, consumables)
#    - Get Shared Secret: App Store Connect > App > In-App Purchases > Manage

# 3. Push Notifications:
#    - Create APNs Key in Apple Developer Portal
#    - Download .p8 key file
```

### 5. Google Cloud Setup

```bash
# 1. OAuth:
#    - Create project in Google Cloud Console
#    - Configure OAuth consent screen
#    - Create OAuth 2.0 Client IDs (Web, iOS, Android)

# 2. Play Billing:
#    - Create service account with Financial permissions
#    - Download JSON key file

# 3. Maps (optional):
#    - Enable Maps SDK for iOS/Android
#    - Create API key
```

### 6. Azure Services Setup

```bash
# Using Terraform (recommended):
cd infrastructure/terraform/environments/dev
terraform init
terraform plan
terraform apply

# Services created automatically:
# - AKS cluster
# - PostgreSQL Flexible Server
# - Redis Cache
# - Cosmos DB
# - Storage Account
# - Key Vault
# - Front Door with WAF
# - Container Registry
```

---

## Environment Variables Reference

### Backend Services (.env)

```env
# =============================================================================
# CORE SETTINGS
# =============================================================================
NODE_ENV=production
PORT=3000
API_URL=https://api.flamoral.com
WEB_URL=https://flamoral.com
MOBILE_SCHEME=flamoral

# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL=postgresql://user:pass@host:5432/flamoral?sslmode=require
REDIS_URL=redis://:password@host:6380?ssl=true
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://xxx.documents.azure.com:443/;AccountKey=xxx;
COSMOS_DB_DATABASE=flamoral

# =============================================================================
# AUTHENTICATION
# =============================================================================
JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Apple Sign In
APPLE_CLIENT_ID=com.flamoral.app
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----"

# Facebook
FACEBOOK_APP_ID=123456789
FACEBOOK_APP_SECRET=xxx

# =============================================================================
# PAYMENTS
# =============================================================================
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Apple IAP
APPLE_SHARED_SECRET=xxx

# Google Play
GOOGLE_PLAY_PACKAGE_NAME=com.flamoral.app
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----"

# =============================================================================
# COMMUNICATIONS
# =============================================================================
# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@flamoral.com

# Firebase
FIREBASE_PROJECT_ID=flamoral-app
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@flamoral-app.iam.gserviceaccount.com

# =============================================================================
# VIDEO CALLING
# =============================================================================
AGORA_APP_ID=xxx
AGORA_APP_CERTIFICATE=xxx

# =============================================================================
# AI/ML SERVICES
# =============================================================================
OPENAI_API_KEY=sk-xxx
AZURE_FACE_API_KEY=xxx
AZURE_FACE_ENDPOINT=https://xxx.cognitiveservices.azure.com
AZURE_CONTENT_MODERATOR_KEY=xxx
AZURE_CONTENT_MODERATOR_ENDPOINT=https://xxx.cognitiveservices.azure.com

# =============================================================================
# STORAGE
# =============================================================================
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx
AZURE_STORAGE_CONTAINER=media
CDN_URL=https://cdn.flamoral.com

# =============================================================================
# MONITORING
# =============================================================================
PAGERDUTY_ROUTING_KEY=xxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# =============================================================================
# MEDIA
# =============================================================================
TENOR_API_KEY=xxx
GIPHY_API_KEY=xxx
```

### Mobile App (.env)

```env
# API
API_BASE_URL=https://api.flamoral.com
WS_URL=wss://realtime.flamoral.com

# Firebase
FIREBASE_API_KEY=xxx
FIREBASE_AUTH_DOMAIN=flamoral-app.firebaseapp.com
FIREBASE_PROJECT_ID=flamoral-app
FIREBASE_MESSAGING_SENDER_ID=123456789

# Social Login
GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
FACEBOOK_APP_ID=123456789

# Agora
AGORA_APP_ID=xxx

# Analytics
MIXPANEL_TOKEN=xxx
AMPLITUDE_API_KEY=xxx
```

### Web App (.env)

```env
VITE_API_URL=https://api.flamoral.com
VITE_WS_URL=wss://realtime.flamoral.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_FACEBOOK_APP_ID=123456789
VITE_AGORA_APP_ID=xxx
VITE_MIXPANEL_TOKEN=xxx
```

---

## Deployment Steps

### Phase 1: Infrastructure Setup (Week 1)

```bash
# Step 1: Azure Infrastructure
cd infrastructure/terraform/environments/prod
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Step 2: Verify Resources
az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks
kubectl get nodes

# Step 3: Configure Secrets
kubectl create namespace flamoral
kubectl create secret generic flamoral-secrets \
  --from-env-file=.env.production \
  -n flamoral
```

### Phase 2: Database Setup (Week 1)

```bash
# Step 1: Run Migrations
cd backend/services/user-service
npm run migrate:prod

# Step 2: Seed Initial Data (optional)
npm run seed:prod

# Step 3: Verify Database
psql $DATABASE_URL -c "SELECT count(*) FROM users;"
```

### Phase 3: Deploy Backend Services (Week 1-2)

```bash
# Step 1: Build and Push Images
cd backend/services
for service in */; do
  docker build -t flamoralprodacr.azurecr.io/${service}:v1.0.0 ./$service
  docker push flamoralprodacr.azurecr.io/${service}:v1.0.0
done

# Step 2: Deploy with Helm
cd infrastructure/helm/flamoral-platform
helm upgrade --install flamoral . \
  -f values-prod.yaml \
  -n flamoral \
  --wait

# Step 3: Verify Deployments
kubectl get pods -n flamoral
kubectl get services -n flamoral
```

### Phase 4: Deploy Monitoring (Week 2)

```bash
# Step 1: Deploy Prometheus
kubectl apply -f infrastructure/monitoring/prometheus/

# Step 2: Deploy Grafana
kubectl apply -f infrastructure/monitoring/grafana/

# Step 3: Deploy Jaeger
kubectl apply -f infrastructure/monitoring/tracing/

# Step 4: Deploy Loki
kubectl apply -f infrastructure/logging/

# Step 5: Configure Alerts
kubectl apply -f infrastructure/monitoring/alertmanager/
```

### Phase 5: Configure Third-Party Services (Week 2)

```bash
# 1. Stripe Webhooks
# Configure endpoint: https://api.flamoral.com/api/payments/webhook

# 2. Firebase
# Upload APNs certificates
# Configure Android SHA-1 fingerprint

# 3. Agora
# Configure recording storage

# 4. DNS
# Point domains to Azure Front Door
```

### Phase 6: Deploy Mobile Apps (Week 3)

```bash
# iOS
cd apps/mobile-app/ios
pod install
# Archive and upload to App Store Connect

# Android
cd apps/mobile-app/android
./gradlew assembleRelease
# Upload to Google Play Console
```

### Phase 7: Deploy Web App (Week 3)

```bash
# Build
cd apps/web-app
npm run build

# Deploy to Azure Static Web Apps or CDN
az storage blob upload-batch \
  --source dist \
  --destination '$web' \
  --account-name flamoralweb
```

---

## Post-Deployment Checklist

### Security Verification

- [ ] WAF rules are active and blocking malicious traffic
- [ ] SSL/TLS certificates are valid and auto-renewing
- [ ] All secrets are stored in Azure Key Vault
- [ ] Rate limiting is working on all endpoints
- [ ] 2FA is enabled for admin accounts
- [ ] Security headers are properly configured

### Performance Verification

- [ ] CDN is caching static assets
- [ ] Database queries are optimized (check slow query log)
- [ ] Redis cache hit rate > 90%
- [ ] API response times < 200ms (p95)
- [ ] Auto-scaling is working under load

### Monitoring Verification

- [ ] All services are reporting metrics to Prometheus
- [ ] Grafana dashboards are showing data
- [ ] Alerts are firing correctly (test with chaos engineering)
- [ ] Logs are aggregating in Loki
- [ ] Distributed traces are visible in Jaeger

### Integration Verification

- [ ] Stripe payments processing correctly
- [ ] Push notifications working on iOS and Android
- [ ] Social login working (Google, Apple, Facebook)
- [ ] Video calls connecting successfully
- [ ] SMS verification codes being sent
- [ ] Email notifications being delivered

### App Store Verification

- [ ] iOS app approved and live
- [ ] Android app approved and live
- [ ] In-app purchases working
- [ ] Deep links working
- [ ] App tracking transparency implemented (iOS)

---

## Quick Reference Links

| Resource | URL |
|----------|-----|
| API Documentation | https://api.flamoral.com/docs |
| Admin Dashboard | https://admin.flamoral.com |
| Grafana | https://grafana.flamoral.com |
| Prometheus | https://prometheus.flamoral.com |
| Jaeger | https://jaeger.flamoral.com |
| Azure Portal | https://portal.azure.com |
| Stripe Dashboard | https://dashboard.stripe.com |
| Firebase Console | https://console.firebase.google.com |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |

---

## Support

For deployment issues:
- Check logs: `kubectl logs -n flamoral <pod-name>`
- Check events: `kubectl get events -n flamoral`
- Review monitoring dashboards
- Contact DevOps team

---

*Document maintained by Flamoral Engineering Team*
