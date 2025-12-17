# Kubernetes Manifests - Comprehensive Fixes Summary

## Date: 2025-12-16

## Overview
This document summarizes all fixes and updates made to the Flamoral Kubernetes manifests to ensure proper production deployment.

---

## 1. ConfigMap Updates (base/configmap.yaml)

### Added Environment Variables:
- **Policy Service URL**: Added `POLICY_SERVICE_URL` for the new policy service
- **Cache Configuration**: `CACHE_TTL`, `CACHE_CHECK_PERIOD`
- **Email Configuration**: `EMAIL_FROM_NAME`, `EMAIL_SUPPORT`
- **Upload Configuration**: `MAX_FILE_SIZE`, `ALLOWED_IMAGE_TYPES`
- **WebSocket Configuration**: `WS_HEARTBEAT_INTERVAL`, `WS_HEARTBEAT_TIMEOUT`
- **Matching Algorithm**: `MATCHING_ALGORITHM`, `MATCHING_BATCH_SIZE`, `MATCHING_SCHEDULE`
- **Payment Configuration**: `STRIPE_MODE`, `PAYMENT_CURRENCY`
- **Subscription Plans**: `PREMIUM_MONTHLY_PRICE`, `PREMIUM_YEARLY_PRICE`, `PLATINUM_MONTHLY_PRICE`
- **Azure Cosmos DB**: `COSMOS_DB_ENDPOINT`, `COSMOS_DB_DATABASE`
- **Service Bus**: `SERVICE_BUS_NAMESPACE`
- **Content Moderation**: `MODERATION_AUTO_APPROVE_THRESHOLD`, `MODERATION_AUTO_REJECT_THRESHOLD`
- **Rate Limiting**: `AUTH_RATE_LIMIT`, `API_RATE_LIMIT`, `UPLOAD_RATE_LIMIT`
- **Business Rules**: `MAX_DISTANCE_KM`, `FREE_LIKES_PER_DAY`, `PREMIUM_LIKES_PER_DAY`

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\base\configmap.yaml`

---

## 2. Secrets Template Updates (base/secrets.yaml)

### Added Secret Placeholders:
- **Agora Additional**: `AGORA_REST_API_KEY`
- **Location Services**: `IP_GEOLOCATION_API_KEY`
- **Background Jobs**: `BULL_REDIS_PASSWORD`
- **Encryption**: `DATA_ENCRYPTION_KEY`, `FIELD_ENCRYPTION_KEY`
- **Webhooks**: `GITHUB_WEBHOOK_SECRET`, `SLACK_SIGNING_SECRET`
- **CDN & Storage**: `CLOUDFLARE_API_KEY`, `CDN_API_KEY`
- **Admin Panel**: `ADMIN_INITIAL_PASSWORD`, `ADMIN_SECRET_KEY`

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\base\secrets.yaml`

---

## 3. Ingress Configuration Updates

### base/ingress.yaml
**Changes Made:**
- Updated namespace from `flamoral` to `flamoral-prod`
- Added `admin.flamoral.com` to TLS hosts
- Added admin host route mapping to `admin-service:3013`
- Fixed service name references:
  - `flamoral-realtime-service` → `realtime-service`
  - `flamoral-media-service` → `media-service`
- Updated port for realtime-service from `8080` to `8081`
- Updated port for media-service from `3005` to `3006`
- Added `admin.flamoral.com` to CORS origins

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\base\ingress.yaml`

### ingress/ingress-nginx.yaml
**Changes Made:**
- Updated namespace from `dating-app` to `flamoral-prod`
- Updated ingress names to use `flamoral-*` prefix
- Added `admin.flamoral.com` and `media.flamoral.com` to TLS hosts
- Updated secret names to use `flamoral-*` prefix
- Fixed service references:
  - `frontend` → `flamoral-web`
  - `websocket-service` → `realtime-service`
- Updated all port numbers to match service definitions
- Added admin panel routing

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\ingress\ingress-nginx.yaml`

---

## 4. Certificate Manager Updates (production/cert-manager.yaml)

**Changes Made:**
- Updated certificate names to use `flamoral-*` prefix
- Changed namespace from `flamoral` to `flamoral-prod`
- Updated secret names:
  - `wildcard-datingapp-tls` → `flamoral-wildcard-tls`
  - `api-datingapp-tls` → `flamoral-api-tls`
  - `www-datingapp-tls` → `flamoral-tls`
- Added `admin.flamoral.com` and `media.flamoral.com` to certificate DNS names

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\production\cert-manager.yaml`

---

## 5. Namespace Configuration Updates (base/namespace.yaml)

**Changes Made:**
- Updated namespace names:
  - `dating-app` → `flamoral-prod`
  - `dating-app-staging` → `flamoral-staging`
  - `dating-app-dev` → `flamoral-dev`
- Added `istio-injection: enabled` label for prod and staging
- Added consistent labeling across all namespaces
- Added `app.kubernetes.io/name` and `app.kubernetes.io/part-of` labels

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\base\namespace.yaml`

---

## 6. New Deployment Manifests Created

### policy-service.yaml
**Features:**
- Port: 3016
- Tier: medium-traffic
- Replicas: 2
- Spot instance eligible (80% weight)
- Pod anti-affinity for HA
- Resource requests: 192Mi RAM, 75m CPU
- Resource limits: 384Mi RAM, 300m CPU
- Complete secret integration (database, Redis, auth, Azure)
- Health checks configured

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\production\deployments\policy-service.yaml`

### automation-service.yaml
**Features:**
- Port: 3014
- Tier: low-traffic
- Replicas: 1
- Spot instance eligible (100% weight)
- Resource requests: 192Mi RAM, 75m CPU
- Resource limits: 512Mi RAM, 400m CPU
- Integration with communication secrets (SendGrid, Twilio)
- Azure Service Bus integration
- Health checks configured

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\production\deployments\automation-service.yaml`

---

## 7. External Secrets Operator Configuration Updates

**Changes Made:**

### Database Secrets Mapping
- Updated PostgreSQL secret keys to match Azure Key Vault naming:
  - `db-host` → `postgres-host`
  - `db-user` → `postgres-user`
  - `db-password` → `postgres-password`
  - `db-name` → `postgres-db`
- Added `postgres-port` mapping
- Updated MongoDB/Cosmos mappings:
  - `mongodb-uri` → `cosmos-mongodb-uri`
- Added `cosmos-connection-string` mapping
- Added `REDIS_PORT` mapping

### OAuth Secrets Mapping
- Added complete OAuth provider secret keys:
  - `GOOGLE_CLIENT_ID` → `google-oauth-client-id`
  - `GOOGLE_CLIENT_SECRET` → `google-oauth-client-secret`
  - `FACEBOOK_APP_ID` → `facebook-app-id`
  - `FACEBOOK_APP_SECRET` → `facebook-app-secret`
  - `APPLE_CLIENT_ID` → `apple-client-id`
  - `APPLE_TEAM_ID` → `apple-team-id`
  - `APPLE_KEY_ID` → `apple-key-id`
  - `APPLE_PRIVATE_KEY` → `apple-private-key`

### Azure Services Secrets Mapping
- Updated Azure secret key mappings:
  - Added `azure-storage-account-name`
  - `azure-storage-key` → `azure-storage-account-key`
  - `azure-service-bus-connection-string` → `azure-servicebus-connection-string`
  - `azure-face-api-key` → `azure-cognitive-face-api-key`
  - `azure-content-moderator-key` → `azure-cognitive-content-moderator-key`
  - Added `azure-cognitive-computer-vision-key`
  - `application-insights-connection-string` → `azure-appinsights-connection-string`
  - Added `azure-appinsights-instrumentation-key`

### Template Updates
- Fixed DATABASE_URL template to use correct variable names
- Fixed REDIS_URL template to include port

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\secrets\external-secrets-operator.yaml`

---

## 8. Service Manifests Created (production/services-all.yaml)

**Created ClusterIP Services for:**

### Core Services
- api-gateway (port 4000)
- auth-service (port 3001)
- user-service (port 3002)
- messaging-service (port 3003)
- payment-service (port 3005)
- media-service (port 3006)

### Feature Services
- analytics-service (port 3007)
- moderation-service (port 3008)
- matching-service (port 3009)
- advertising-service (port 3011)
- notification-service (port 3012)
- admin-service (port 3013)
- automation-service (port 3014)
- workflow-engine (port 3015)
- policy-service (port 3016)

### Real-time & Frontend
- realtime-service (port 8081)
- flamoral-web (port 80)

### AI/ML Services (Python)
- recommendation-service (port 5000)
- nlp-service (port 5001)
- photo-analysis-service (port 5002)
- fraud-detection-service (port 5003)
- dating-coach-service (port 5004)
- content-generator-service (port 5005)
- ai-service (port 8000)

**Features:**
- All services use ClusterIP for internal communication
- API Gateway has session affinity (ClientIP, 3-hour timeout)
- Proper tier labeling for all services
- Consistent naming convention

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\production\services-all.yaml`

---

## 9. Production Deployment Namespace Updates

**Updated Files:**
All production deployment files updated to use `namespace: flamoral-prod`:

1. auth-service.yaml
2. user-service.yaml
3. api-gateway.yaml
4. messaging-service.yaml
5. payment-service.yaml
6. media-service.yaml
7. matching-service.yaml
8. moderation-service.yaml
9. analytics-service.yaml
10. notification-service.yaml
11. admin-service.yaml
12. realtime-service.yaml
13. advertising-service.yaml
14. workflow-engine.yaml

**Directory**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\production\deployments\`

---

## 10. Resource Quotas Verified

**Verified Configurations:**
- Production namespace quotas: 20 CPU cores, 40Gi memory
- Staging namespace quotas: 10 CPU cores, 20Gi memory
- Dev namespace quotas: 5 CPU cores, 10Gi memory
- LimitRanges properly configured for all namespaces
- PriorityClasses defined (critical, high, medium, low, batch)

**File**: `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\production\cost-optimization\namespace-quotas.yaml`

---

## Key Improvements Summary

1. **Namespace Consistency**: All manifests now use consistent `flamoral-prod`, `flamoral-staging`, `flamoral-dev` naming
2. **Complete Service Coverage**: All microservices now have proper Service definitions
3. **Secret Management**: External Secrets Operator properly mapped to Azure Key Vault naming conventions
4. **Ingress Configuration**: Complete routing for all subdomains (main, api, admin, ws, media)
5. **SSL/TLS**: Proper certificate management with cert-manager for all domains
6. **Missing Services**: Added deployment manifests for policy-service and automation-service
7. **Environment Variables**: Comprehensive ConfigMap with all required application settings
8. **Security**: All deployments use proper security contexts, read-only filesystems, and drop all capabilities

---

## Deployment Order

For proper deployment, apply manifests in this order:

1. **Namespaces**: `kubectl apply -f base/namespace.yaml`
2. **ConfigMaps**: `kubectl apply -f base/configmap.yaml`
3. **Secrets Setup**: Configure External Secrets Operator
4. **Services**: `kubectl apply -f production/services-all.yaml`
5. **Deployments**: `kubectl apply -f production/deployments/`
6. **Ingress**: `kubectl apply -f base/ingress.yaml`
7. **Cert Manager**: `kubectl apply -f production/cert-manager.yaml`

---

## Azure Key Vault Secret Names Required

Based on External Secrets configuration, ensure these secrets exist in Azure Key Vault:

### Database
- postgres-host
- postgres-port
- postgres-user
- postgres-password
- postgres-db
- cosmos-mongodb-uri
- cosmos-connection-string
- redis-host
- redis-port
- redis-password

### Authentication
- jwt-secret
- jwt-access-secret
- jwt-refresh-secret
- session-secret
- cookie-secret
- encryption-key
- service-api-key

### OAuth
- google-oauth-client-id
- google-oauth-client-secret
- facebook-app-id
- facebook-app-secret
- apple-client-id
- apple-team-id
- apple-key-id
- apple-private-key

### Payment
- stripe-secret-key
- stripe-webhook-secret
- stripe-publishable-key

### Communication
- sendgrid-api-key
- twilio-account-sid
- twilio-auth-token
- twilio-phone-number

### Azure Services
- azure-storage-account-name
- azure-storage-account-key
- azure-storage-connection-string
- azure-servicebus-connection-string
- azure-cognitive-face-api-key
- azure-cognitive-content-moderator-key
- azure-cognitive-computer-vision-key
- azure-appinsights-connection-string
- azure-appinsights-instrumentation-key

### AI Services
- openai-api-key
- ai-model-api-key

### Monitoring
- sentry-dsn
- mixpanel-token
- grafana-admin-password

---

## Validation Checklist

- [x] All namespaces use consistent naming convention
- [x] All deployments have corresponding Service definitions
- [x] Ingress routes configured for all domains
- [x] SSL certificates configured via cert-manager
- [x] External Secrets mapped to correct Azure Key Vault keys
- [x] ConfigMap contains all required environment variables
- [x] Resource quotas and limits appropriate for production
- [x] Security contexts properly configured
- [x] Health checks configured for all services
- [x] Missing service deployments created (policy, automation)

---

## Next Steps

1. **Azure Key Vault Setup**: Ensure all required secrets are stored in Azure Key Vault
2. **DNS Configuration**: Point all subdomains to the cluster ingress IP
3. **Image Registry**: Ensure all container images are pushed to `flamoraldevacr.azurecr.io`
4. **Database Migration**: Run database migration jobs before deploying services
5. **Monitoring Setup**: Deploy Prometheus, Grafana, and Application Insights
6. **Testing**: Deploy to staging environment first, then production

---

## Files Modified/Created

### Modified Files (18):
1. `base/configmap.yaml`
2. `base/secrets.yaml`
3. `base/ingress.yaml`
4. `base/namespace.yaml`
5. `ingress/ingress-nginx.yaml`
6. `production/cert-manager.yaml`
7. `secrets/external-secrets-operator.yaml`
8. `production/deployments/auth-service.yaml`
9. `production/deployments/user-service.yaml`
10. `production/deployments/api-gateway.yaml`
11. `production/deployments/messaging-service.yaml`
12. `production/deployments/payment-service.yaml`
13. `production/deployments/media-service.yaml`
14. `production/deployments/matching-service.yaml`
15. `production/deployments/moderation-service.yaml`
16. `production/deployments/analytics-service.yaml`
17. `production/deployments/notification-service.yaml`
18. `production/deployments/admin-service.yaml`
19. `production/deployments/realtime-service.yaml`
20. `production/deployments/advertising-service.yaml`
21. `production/deployments/workflow-engine.yaml`

### Created Files (3):
1. `production/deployments/policy-service.yaml`
2. `production/deployments/automation-service.yaml`
3. `production/services-all.yaml`
4. `KUBERNETES_FIXES_SUMMARY.md` (this file)

---

**Total Files Updated**: 21
**Total Files Created**: 4
**Total Services Defined**: 24

---

## Contact & Support

For questions or issues related to these Kubernetes configurations, please contact the DevOps team or create an issue in the project repository.
