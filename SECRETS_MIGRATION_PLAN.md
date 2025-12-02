# Secrets Migration Plan: GitHub to Azure DevOps

## Executive Summary

This document provides a comprehensive plan for migrating secrets from GitHub Secrets to Azure DevOps Variable Groups and Azure Key Vault for the World-Class Dating App Platform.

**Project**: World-Class Dating App Platform
**Migration Date**: TBD
**Estimated Duration**: 4-6 hours
**Team Required**: DevOps Engineer, Security Engineer, Application Architect

---

## Table of Contents

1. [Secrets Inventory](#1-secrets-inventory)
2. [Azure DevOps Variable Groups Setup](#2-azure-devops-variable-groups-setup)
3. [Azure Key Vault Integration](#3-azure-key-vault-integration)
4. [Migration Checklist](#4-migration-checklist)
5. [Service Connections Required](#5-service-connections-required)
6. [Verification & Testing](#6-verification--testing)
7. [Rollback Plan](#7-rollback-plan)
8. [Post-Migration Tasks](#8-post-migration-tasks)

---

## 1. Secrets Inventory

### 1.1 Database Credentials

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `POSTGRES_HOST` | PostgreSQL server hostname | All | Backend services | Medium |
| `POSTGRES_PORT` | PostgreSQL port | All | Backend services | Low |
| `POSTGRES_DB` | Database name | All | Backend services | Low |
| `POSTGRES_USER` | Database username | All | Backend services | High |
| `POSTGRES_PASSWORD` | Database password | All | Backend services | Critical |
| `DATABASE_URL` | Full PostgreSQL connection string | All | Migrations, services | Critical |
| `STAGING_DATABASE_URL` | Staging database URL | Staging | CD workflows | Critical |
| `MONGODB_URI` | MongoDB connection string | All | Backend services | Critical |
| `MONGODB_DB` | MongoDB database name | All | Backend services | Low |
| `COSMOS_ENDPOINT` | Azure Cosmos DB endpoint | All | Messaging service | Medium |
| `COSMOS_KEY` | Azure Cosmos DB access key | All | Messaging service | Critical |
| `REDIS_HOST` | Redis hostname | All | All services | Medium |
| `REDIS_PORT` | Redis port | All | All services | Low |
| `REDIS_PASSWORD` | Redis password | All | All services | Critical |
| `REDIS_URL` | Full Redis connection string | All | All services | Critical |

### 1.2 Cloud Provider Credentials (Azure)

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `AZURE_CLIENT_ID` | Azure Service Principal Client ID | All | Terraform, deployments | Critical |
| `AZURE_CLIENT_SECRET` | Azure Service Principal Secret | All | Terraform, deployments | Critical |
| `AZURE_TENANT_ID` | Azure Active Directory Tenant ID | All | Terraform, deployments | High |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | All | Terraform, deployments | High |
| `AZURE_CREDENTIALS` | Combined Azure credentials JSON | All | Legacy workflows | Critical |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection string | All | Media service | Critical |
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account name | All | Media service | Medium |
| `AZURE_STORAGE_ACCOUNT_KEY` | Storage account access key | All | Media service | Critical |
| `AZURE_CONTAINER_NAME` | Blob container name | All | Media service | Low |
| `AZURE_CDN_URL` | Azure CDN endpoint URL | All | Frontend | Low |
| `AZURE_CV_ENDPOINT` | Computer Vision API endpoint | All | Media moderation | Medium |
| `AZURE_CV_API_KEY` | Computer Vision API key | All | Media moderation | Critical |
| `AZURE_FACE_API_KEY` | Face API key | All | Photo verification | Critical |
| `AZURE_FACE_ENDPOINT` | Face API endpoint | All | Photo verification | Medium |
| `AZURE_KEY_VAULT_URL` | Azure Key Vault URL | Production | Secret management | Medium |
| `AZURE_CONTAINER_REGISTRY` | ACR registry URL | All | Docker operations | Medium |
| `ACR_NAME` | ACR registry name | All | Docker operations | Medium |
| `ACR_LOGIN_SERVER` | ACR login server | All | Docker operations | Medium |
| `ACR_USERNAME` | ACR username | All | Docker pull/push | High |
| `ACR_PASSWORD` | ACR password | All | Docker pull/push | Critical |

### 1.3 Terraform State Management

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `TF_STATE_RG` | Terraform state resource group | All | Terraform init | Medium |
| `TF_STATE_STORAGE` | Terraform state storage account | All | Terraform init | Medium |

### 1.4 Kubernetes/AKS Credentials

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `KUBE_CONFIG_STAGING` | Staging Kubernetes config | Staging | CD workflows | Critical |
| `KUBE_CONFIG_PRODUCTION` | Production Kubernetes config | Production | CD workflows | Critical |
| `AKS_CLUSTER_NAME_STAGING` | Staging AKS cluster name | Staging | Deployments | Medium |
| `AKS_CLUSTER_NAME_PRODUCTION` | Production AKS cluster name | Production | Deployments | Medium |
| `AKS_RESOURCE_GROUP_STAGING` | Staging AKS resource group | Staging | Deployments | Medium |
| `AKS_RESOURCE_GROUP_PRODUCTION` | Production AKS resource group | Production | Deployments | Medium |

### 1.5 Authentication & JWT

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `JWT_SECRET` | Legacy JWT secret | All | Auth service | Critical |
| `JWT_ACCESS_SECRET` | JWT access token secret (min 32 chars) | All | All services | Critical |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (min 32 chars) | All | All services | Critical |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | All | All services | Low |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | All | All services | Low |
| `SERVICE_API_KEY` | Internal service-to-service auth | All | Microservices | Critical |
| `INTERNAL_SERVICE_KEY` | Internal service authentication | All | Service mesh | Critical |

### 1.6 Payment Provider (Stripe)

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | All | Payment service | Critical |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | All | Frontend | Medium |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | All | Payment webhooks | Critical |

### 1.7 Communication Services

#### Email (SendGrid)
| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `SENDGRID_API_KEY` | SendGrid API key | All | Notification service | Critical |
| `SENDGRID_FROM_EMAIL` | Sender email address | All | Email templates | Low |
| `SENDGRID_FROM_NAME` | Sender name | All | Email templates | Low |
| `EMAIL_FROM` | From email address | All | Notifications | Low |
| `EMAIL_USERNAME` | SMTP username (legacy) | All | Email workflows | High |
| `EMAIL_PASSWORD` | SMTP password (legacy) | All | Email workflows | Critical |

#### SMS (Twilio)
| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | All | Notification service | High |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | All | Notification service | Critical |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | All | SMS sending | Medium |
| `TWILIO_FROM_NUMBER` | From phone number | All | SMS sending | Medium |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service SID | All | Phone verification | High |

#### Push Notifications
| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase credentials | All | Push notifications | High |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase credentials JSON | All | Push notifications | Critical |
| `APNS_KEY_ID` | Apple Push Notification key ID | All | iOS notifications | High |
| `APNS_TEAM_ID` | Apple team ID | All | iOS notifications | Medium |
| `APNS_KEY_PATH` | Path to APNs key file | All | iOS notifications | High |
| `APNS_KEY` | APNs key content (base64) | All | iOS notifications | Critical |
| `APNS_BUNDLE_ID` | iOS app bundle ID | All | iOS notifications | Low |

### 1.8 Video/Voice (Agora)

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `AGORA_APP_ID` | Agora application ID | All | Video/voice calls | High |
| `AGORA_APP_CERTIFICATE` | Agora app certificate | All | Token generation | Critical |

### 1.9 Message Encryption

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `ENCRYPTION_KEY` | Message encryption key (32 chars) | All | Messaging service | Critical |

### 1.10 Container Registry (Docker Hub - Legacy)

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `DOCKER_PASSWORD` | Docker Hub password | All | Legacy docker workflows | Critical |
| `DOCKER_USERNAME` | Docker Hub username | All | Legacy docker workflows | Medium |

### 1.11 CI/CD & Code Quality

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `GITHUB_TOKEN` | GitHub Actions token | All | Workflows (auto-generated) | Critical |
| `SONAR_TOKEN` | SonarQube authentication token | All | Code quality scans | High |
| `SONAR_HOST_URL` | SonarQube server URL | All | Code quality scans | Low |
| `CODECOV_TOKEN` | Codecov upload token | All | Coverage reports | High |
| `SNYK_TOKEN` | Snyk security scan token | All | Vulnerability scanning | High |
| `SENTRY_DSN` | Sentry error tracking DSN | All | Error monitoring | High |

### 1.12 Monitoring & Notifications

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `SLACK_WEBHOOK` | Slack webhook URL (legacy) | All | Deployment notifications | High |
| `SLACK_WEBHOOK_URL` | Slack webhook URL | All | Deployment notifications | High |

### 1.13 Application URLs & Endpoints

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `DEV_API_URL` | Development API URL | Dev | Frontend builds | Low |
| `DEV_WS_URL` | Development WebSocket URL | Dev | Frontend builds | Low |
| `DEV_URL` | Development app URL | Dev | Smoke tests | Low |
| `STAGING_API_URL` | Staging API URL | Staging | Frontend builds, tests | Low |
| `STAGING_WS_URL` | Staging WebSocket URL | Staging | Frontend builds | Low |
| `STAGING_URL` | Staging app URL | Staging | E2E tests | Low |
| `PROD_API_URL` | Production API URL | Production | Health checks | Low |
| `PROD_URL` | Production app URL | Production | Smoke tests | Low |
| `PROD_CANARY_URL` | Production canary URL | Production | Canary validation | Low |

### 1.14 Test Credentials

| Secret Name | Description | Environment | Current Usage | Sensitivity |
|-------------|-------------|-------------|---------------|-------------|
| `TEST_USER_EMAIL` | E2E test user email | Staging | Playwright tests | Low |
| `TEST_USER_PASSWORD` | E2E test user password | Staging | Playwright tests | Medium |

---

## 2. Azure DevOps Variable Groups Setup

### 2.1 Variable Group: `common-secrets`

**Description**: Shared secrets across all environments
**Usage**: All pipelines
**Link to Key Vault**: Yes (recommended)

```yaml
Variables:
  # Container Registry (Should be Key Vault linked)
  - name: DOCKER_USERNAME
    value: citadelcloud1
    isSecret: false

  - name: DOCKER_PASSWORD
    value: $(KeyVault.DockerPassword)
    isSecret: true

  # Azure Service Principal (Key Vault linked)
  - name: AZURE_CLIENT_ID
    value: $(KeyVault.AzureClientId)
    isSecret: true

  - name: AZURE_CLIENT_SECRET
    value: $(KeyVault.AzureClientSecret)
    isSecret: true

  - name: AZURE_TENANT_ID
    value: $(KeyVault.AzureTenantId)
    isSecret: true

  - name: AZURE_SUBSCRIPTION_ID
    value: $(KeyVault.AzureSubscriptionId)
    isSecret: true

  # Terraform State (Non-secret)
  - name: TF_STATE_RG
    value: dating-app-tfstate-rg
    isSecret: false

  - name: TF_STATE_STORAGE
    value: datingapptfstate
    isSecret: false

  # Internal Service Authentication (Key Vault)
  - name: SERVICE_API_KEY
    value: $(KeyVault.ServiceApiKey)
    isSecret: true

  - name: INTERNAL_SERVICE_KEY
    value: $(KeyVault.InternalServiceKey)
    isSecret: true

  # CI/CD Tools (Key Vault)
  - name: SONAR_TOKEN
    value: $(KeyVault.SonarToken)
    isSecret: true

  - name: SONAR_HOST_URL
    value: https://sonarqube.yourcompany.com
    isSecret: false

  - name: CODECOV_TOKEN
    value: $(KeyVault.CodecovToken)
    isSecret: true

  - name: SNYK_TOKEN
    value: $(KeyVault.SnykToken)
    isSecret: true

  # Slack Notifications
  - name: SLACK_WEBHOOK_URL
    value: $(KeyVault.SlackWebhookUrl)
    isSecret: true
```

### 2.2 Variable Group: `dev-secrets`

**Description**: Development environment secrets
**Usage**: Dev deployment pipelines
**Link to Key Vault**: Yes

```yaml
Variables:
  # Environment URLs (Non-secret)
  - name: DEV_API_URL
    value: https://api-dev.datingapp.com
    isSecret: false

  - name: DEV_WS_URL
    value: wss://ws-dev.datingapp.com
    isSecret: false

  - name: DEV_URL
    value: https://dev.datingapp.com
    isSecret: false

  # Azure Resources (Non-secret)
  - name: AZURE_RESOURCE_GROUP
    value: dating-app-dev-rg
    isSecret: false

  - name: AZURE_AKS_CLUSTER
    value: dating-app-dev-aks
    isSecret: false

  - name: ACR_NAME
    value: datingappdevacr
    isSecret: false

  - name: ACR_LOGIN_SERVER
    value: datingappdevacr.azurecr.io
    isSecret: false

  # Database (Key Vault linked)
  - name: DATABASE_URL
    value: $(KeyVault.DevDatabaseUrl)
    isSecret: true

  - name: POSTGRES_PASSWORD
    value: $(KeyVault.DevPostgresPassword)
    isSecret: true

  - name: REDIS_PASSWORD
    value: $(KeyVault.DevRedisPassword)
    isSecret: true

  - name: MONGODB_URI
    value: $(KeyVault.DevMongoDbUri)
    isSecret: true

  # JWT Secrets (Key Vault)
  - name: JWT_ACCESS_SECRET
    value: $(KeyVault.DevJwtAccessSecret)
    isSecret: true

  - name: JWT_REFRESH_SECRET
    value: $(KeyVault.DevJwtRefreshSecret)
    isSecret: true

  # Third-party Services (Key Vault) - Use test keys
  - name: STRIPE_SECRET_KEY
    value: $(KeyVault.DevStripeSecretKey)
    isSecret: true

  - name: SENDGRID_API_KEY
    value: $(KeyVault.DevSendGridApiKey)
    isSecret: true

  - name: TWILIO_AUTH_TOKEN
    value: $(KeyVault.DevTwilioAuthToken)
    isSecret: true

  - name: AZURE_STORAGE_ACCOUNT_KEY
    value: $(KeyVault.DevStorageAccountKey)
    isSecret: true

  - name: AZURE_FACE_API_KEY
    value: $(KeyVault.DevFaceApiKey)
    isSecret: true

  - name: COSMOS_KEY
    value: $(KeyVault.DevCosmosKey)
    isSecret: true

  - name: ENCRYPTION_KEY
    value: $(KeyVault.DevEncryptionKey)
    isSecret: true

  - name: AGORA_APP_CERTIFICATE
    value: $(KeyVault.DevAgoraAppCertificate)
    isSecret: true
```

### 2.3 Variable Group: `test-secrets` (Staging)

**Description**: Test/Staging environment secrets
**Usage**: Staging deployment pipelines
**Link to Key Vault**: Yes

```yaml
Variables:
  # Environment URLs
  - name: STAGING_API_URL
    value: https://api-staging.datingapp.com
    isSecret: false

  - name: STAGING_WS_URL
    value: wss://ws-staging.datingapp.com
    isSecret: false

  - name: STAGING_URL
    value: https://staging.datingapp.com
    isSecret: false

  # Azure Resources
  - name: AZURE_RESOURCE_GROUP
    value: dating-app-staging-rg
    isSecret: false

  - name: AZURE_AKS_CLUSTER
    value: dating-app-staging-aks
    isSecret: false

  - name: AKS_CLUSTER_NAME_STAGING
    value: dating-app-staging-aks
    isSecret: false

  - name: AKS_RESOURCE_GROUP_STAGING
    value: dating-app-staging-rg
    isSecret: false

  - name: ACR_NAME
    value: datingappstagingacr
    isSecret: false

  - name: ACR_LOGIN_SERVER
    value: datingappstagingacr.azurecr.io
    isSecret: false

  # Database (Key Vault)
  - name: STAGING_DATABASE_URL
    value: $(KeyVault.StagingDatabaseUrl)
    isSecret: true

  - name: DATABASE_URL
    value: $(KeyVault.StagingDatabaseUrl)
    isSecret: true

  - name: POSTGRES_PASSWORD
    value: $(KeyVault.StagingPostgresPassword)
    isSecret: true

  - name: REDIS_PASSWORD
    value: $(KeyVault.StagingRedisPassword)
    isSecret: true

  - name: MONGODB_URI
    value: $(KeyVault.StagingMongoDbUri)
    isSecret: true

  # JWT Secrets
  - name: JWT_ACCESS_SECRET
    value: $(KeyVault.StagingJwtAccessSecret)
    isSecret: true

  - name: JWT_REFRESH_SECRET
    value: $(KeyVault.StagingJwtRefreshSecret)
    isSecret: true

  # Third-party Services (Key Vault)
  - name: STRIPE_SECRET_KEY
    value: $(KeyVault.StagingStripeSecretKey)
    isSecret: true

  - name: STRIPE_WEBHOOK_SECRET
    value: $(KeyVault.StagingStripeWebhookSecret)
    isSecret: true

  - name: SENDGRID_API_KEY
    value: $(KeyVault.StagingSendGridApiKey)
    isSecret: true

  - name: TWILIO_AUTH_TOKEN
    value: $(KeyVault.StagingTwilioAuthToken)
    isSecret: true

  - name: AZURE_STORAGE_ACCOUNT_KEY
    value: $(KeyVault.StagingStorageAccountKey)
    isSecret: true

  - name: AZURE_FACE_API_KEY
    value: $(KeyVault.StagingFaceApiKey)
    isSecret: true

  - name: AZURE_CV_API_KEY
    value: $(KeyVault.StagingCvApiKey)
    isSecret: true

  - name: COSMOS_KEY
    value: $(KeyVault.StagingCosmosKey)
    isSecret: true

  - name: ENCRYPTION_KEY
    value: $(KeyVault.StagingEncryptionKey)
    isSecret: true

  - name: AGORA_APP_CERTIFICATE
    value: $(KeyVault.StagingAgoraAppCertificate)
    isSecret: true

  - name: FIREBASE_SERVICE_ACCOUNT
    value: $(KeyVault.StagingFirebaseServiceAccount)
    isSecret: true

  - name: APNS_KEY
    value: $(KeyVault.StagingApnsKey)
    isSecret: true

  # Test User Credentials
  - name: TEST_USER_EMAIL
    value: test@datingapp.com
    isSecret: false

  - name: TEST_USER_PASSWORD
    value: $(KeyVault.TestUserPassword)
    isSecret: true

  # Kubernetes Config
  - name: KUBE_CONFIG_STAGING
    value: $(KeyVault.KubeConfigStaging)
    isSecret: true
```

### 2.4 Variable Group: `prod-secrets`

**Description**: Production environment secrets
**Usage**: Production deployment pipelines
**Link to Key Vault**: Yes (REQUIRED)

```yaml
Variables:
  # Environment URLs
  - name: PROD_API_URL
    value: https://api.datingapp.com
    isSecret: false

  - name: PROD_URL
    value: https://datingapp.com
    isSecret: false

  - name: PROD_CANARY_URL
    value: https://canary.datingapp.com
    isSecret: false

  # Azure Resources
  - name: AZURE_RESOURCE_GROUP
    value: dating-app-prod-rg
    isSecret: false

  - name: AZURE_AKS_CLUSTER
    value: dating-app-prod-aks
    isSecret: false

  - name: AKS_CLUSTER_NAME_PRODUCTION
    value: dating-app-prod-aks
    isSecret: false

  - name: AKS_RESOURCE_GROUP_PRODUCTION
    value: dating-app-prod-rg
    isSecret: false

  - name: ACR_NAME
    value: datingappprodacr
    isSecret: false

  - name: ACR_LOGIN_SERVER
    value: datingappprodacr.azurecr.io
    isSecret: false

  - name: AZURE_CONTAINER_REGISTRY
    value: datingappprodacr.azurecr.io
    isSecret: false

  # Database (Key Vault) - CRITICAL
  - name: DATABASE_URL
    value: $(KeyVault.ProdDatabaseUrl)
    isSecret: true

  - name: POSTGRES_PASSWORD
    value: $(KeyVault.ProdPostgresPassword)
    isSecret: true

  - name: REDIS_PASSWORD
    value: $(KeyVault.ProdRedisPassword)
    isSecret: true

  - name: MONGODB_URI
    value: $(KeyVault.ProdMongoDbUri)
    isSecret: true

  # JWT Secrets (Key Vault) - CRITICAL
  - name: JWT_ACCESS_SECRET
    value: $(KeyVault.ProdJwtAccessSecret)
    isSecret: true

  - name: JWT_REFRESH_SECRET
    value: $(KeyVault.ProdJwtRefreshSecret)
    isSecret: true

  # Third-party Services (Key Vault) - CRITICAL
  - name: STRIPE_SECRET_KEY
    value: $(KeyVault.ProdStripeSecretKey)
    isSecret: true

  - name: STRIPE_WEBHOOK_SECRET
    value: $(KeyVault.ProdStripeWebhookSecret)
    isSecret: true

  - name: SENDGRID_API_KEY
    value: $(KeyVault.ProdSendGridApiKey)
    isSecret: true

  - name: TWILIO_AUTH_TOKEN
    value: $(KeyVault.ProdTwilioAuthToken)
    isSecret: true

  - name: AZURE_STORAGE_ACCOUNT_KEY
    value: $(KeyVault.ProdStorageAccountKey)
    isSecret: true

  - name: AZURE_FACE_API_KEY
    value: $(KeyVault.ProdFaceApiKey)
    isSecret: true

  - name: AZURE_CV_API_KEY
    value: $(KeyVault.ProdCvApiKey)
    isSecret: true

  - name: COSMOS_KEY
    value: $(KeyVault.ProdCosmosKey)
    isSecret: true

  - name: ENCRYPTION_KEY
    value: $(KeyVault.ProdEncryptionKey)
    isSecret: true

  - name: AGORA_APP_CERTIFICATE
    value: $(KeyVault.ProdAgoraAppCertificate)
    isSecret: true

  - name: FIREBASE_SERVICE_ACCOUNT
    value: $(KeyVault.ProdFirebaseServiceAccount)
    isSecret: true

  - name: APNS_KEY
    value: $(KeyVault.ProdApnsKey)
    isSecret: true

  - name: SENTRY_DSN
    value: $(KeyVault.ProdSentryDsn)
    isSecret: true

  # Kubernetes Config (Key Vault) - CRITICAL
  - name: KUBE_CONFIG_PRODUCTION
    value: $(KeyVault.KubeConfigProduction)
    isSecret: true

  # ACR Credentials (Key Vault)
  - name: ACR_USERNAME
    value: $(KeyVault.ProdAcrUsername)
    isSecret: true

  - name: ACR_PASSWORD
    value: $(KeyVault.ProdAcrPassword)
    isSecret: true
```

---

## 3. Azure Key Vault Integration

### 3.1 Key Vault Setup

**Recommended Structure**: Create separate Key Vaults per environment for better security isolation.

```
Key Vaults:
├── dating-app-dev-kv (Development)
├── dating-app-staging-kv (Staging)
└── dating-app-prod-kv (Production)
```

### 3.2 Key Vault Naming Conventions

Azure Key Vault secret names must follow these rules:
- Alphanumeric characters and hyphens only
- No underscores allowed
- Must start with a letter
- Must be 1-127 characters

**Convention**: `{environment}-{service}-{secret-name}`

Examples:
```
dev-database-url
dev-jwt-access-secret
staging-stripe-secret-key
prod-cosmos-key
prod-encryption-key
```

### 3.3 Key Vault Secret Mapping

#### Development Key Vault (`dating-app-dev-kv`)

```
Secret Name in Key Vault              → Variable Group Reference
─────────────────────────────────────────────────────────────────
dev-database-url                      → DevDatabaseUrl
dev-postgres-password                 → DevPostgresPassword
dev-redis-password                    → DevRedisPassword
dev-mongodb-uri                       → DevMongoDbUri
dev-jwt-access-secret                 → DevJwtAccessSecret
dev-jwt-refresh-secret                → DevJwtRefreshSecret
dev-stripe-secret-key                 → DevStripeSecretKey
dev-sendgrid-api-key                  → DevSendGridApiKey
dev-twilio-auth-token                 → DevTwilioAuthToken
dev-storage-account-key               → DevStorageAccountKey
dev-face-api-key                      → DevFaceApiKey
dev-cosmos-key                        → DevCosmosKey
dev-encryption-key                    → DevEncryptionKey
dev-agora-app-certificate             → DevAgoraAppCertificate
```

#### Staging Key Vault (`dating-app-staging-kv`)

```
Secret Name in Key Vault              → Variable Group Reference
─────────────────────────────────────────────────────────────────
staging-database-url                  → StagingDatabaseUrl
staging-postgres-password             → StagingPostgresPassword
staging-redis-password                → StagingRedisPassword
staging-mongodb-uri                   → StagingMongoDbUri
staging-jwt-access-secret             → StagingJwtAccessSecret
staging-jwt-refresh-secret            → StagingJwtRefreshSecret
staging-stripe-secret-key             → StagingStripeSecretKey
staging-stripe-webhook-secret         → StagingStripeWebhookSecret
staging-sendgrid-api-key              → StagingSendGridApiKey
staging-twilio-auth-token             → StagingTwilioAuthToken
staging-storage-account-key           → StagingStorageAccountKey
staging-face-api-key                  → StagingFaceApiKey
staging-cv-api-key                    → StagingCvApiKey
staging-cosmos-key                    → StagingCosmosKey
staging-encryption-key                → StagingEncryptionKey
staging-agora-app-certificate         → StagingAgoraAppCertificate
staging-firebase-service-account      → StagingFirebaseServiceAccount
staging-apns-key                      → StagingApnsKey
staging-test-user-password            → TestUserPassword
staging-kube-config                   → KubeConfigStaging
```

#### Production Key Vault (`dating-app-prod-kv`)

```
Secret Name in Key Vault              → Variable Group Reference
─────────────────────────────────────────────────────────────────
prod-database-url                     → ProdDatabaseUrl
prod-postgres-password                → ProdPostgresPassword
prod-redis-password                   → ProdRedisPassword
prod-mongodb-uri                      → ProdMongoDbUri
prod-jwt-access-secret                → ProdJwtAccessSecret
prod-jwt-refresh-secret               → ProdJwtRefreshSecret
prod-stripe-secret-key                → ProdStripeSecretKey
prod-stripe-webhook-secret            → ProdStripeWebhookSecret
prod-sendgrid-api-key                 → ProdSendGridApiKey
prod-twilio-auth-token                → ProdTwilioAuthToken
prod-storage-account-key              → ProdStorageAccountKey
prod-face-api-key                     → ProdFaceApiKey
prod-cv-api-key                       → ProdCvApiKey
prod-cosmos-key                       → ProdCosmosKey
prod-encryption-key                   → ProdEncryptionKey
prod-agora-app-certificate            → ProdAgoraAppCertificate
prod-firebase-service-account         → ProdFirebaseServiceAccount
prod-apns-key                         → ProdApnsKey
prod-sentry-dsn                       → ProdSentryDsn
prod-kube-config                      → KubeConfigProduction
prod-acr-username                     → ProdAcrUsername
prod-acr-password                     → ProdAcrPassword
```

#### Common Key Vault (`dating-app-common-kv`)

```
Secret Name in Key Vault              → Variable Group Reference
─────────────────────────────────────────────────────────────────
docker-password                       → DockerPassword
azure-client-id                       → AzureClientId
azure-client-secret                   → AzureClientSecret
azure-tenant-id                       → AzureTenantId
azure-subscription-id                 → AzureSubscriptionId
service-api-key                       → ServiceApiKey
internal-service-key                  → InternalServiceKey
sonar-token                           → SonarToken
codecov-token                         → CodecovToken
snyk-token                            → SnykToken
slack-webhook-url                     → SlackWebhookUrl
```

### 3.4 Azure DevOps Service Connection to Key Vault

**Prerequisites**:
1. Service Principal with Key Vault access
2. RBAC permissions: "Key Vault Secrets User" role

**Steps to Link Variable Group to Key Vault**:

1. Go to Azure DevOps → Project Settings → Service connections
2. Create new service connection → Azure Resource Manager
3. Select "Service principal (automatic)" or use existing
4. Grant it access to Key Vaults
5. Go to Pipelines → Library → Variable groups
6. Create new variable group
7. Enable "Link secrets from an Azure key vault as variables"
8. Select Azure subscription and Key Vault
9. Select secrets to import

**Azure CLI Commands**:

```bash
# Create Service Principal for Azure DevOps
az ad sp create-for-rbac --name "azure-devops-dating-app" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}

# Grant Key Vault access to Service Principal
az keyvault set-policy --name dating-app-dev-kv \
  --spn {service-principal-id} \
  --secret-permissions get list

az keyvault set-policy --name dating-app-staging-kv \
  --spn {service-principal-id} \
  --secret-permissions get list

az keyvault set-policy --name dating-app-prod-kv \
  --spn {service-principal-id} \
  --secret-permissions get list

az keyvault set-policy --name dating-app-common-kv \
  --spn {service-principal-id} \
  --secret-permissions get list
```

---

## 4. Migration Checklist

### Phase 1: Pre-Migration (Day 1)

#### Task 1.1: Export GitHub Secrets
- [ ] Document all GitHub secrets from Settings → Secrets and variables → Actions
- [ ] Export secrets to secure password manager (1Password, LastPass, etc.)
- [ ] Verify all secrets are documented in this migration plan
- [ ] Create backup of GitHub secrets in encrypted vault

#### Task 1.2: Create Azure Key Vaults
```bash
# Create Resource Group for Key Vaults
az group create --name dating-app-keyvault-rg --location eastus

# Create Key Vaults
az keyvault create --name dating-app-common-kv \
  --resource-group dating-app-keyvault-rg \
  --location eastus \
  --enable-soft-delete true \
  --enable-purge-protection true

az keyvault create --name dating-app-dev-kv \
  --resource-group dating-app-keyvault-rg \
  --location eastus \
  --enable-soft-delete true \
  --enable-purge-protection true

az keyvault create --name dating-app-staging-kv \
  --resource-group dating-app-keyvault-rg \
  --location eastus \
  --enable-soft-delete true \
  --enable-purge-protection true

az keyvault create --name dating-app-prod-kv \
  --resource-group dating-app-keyvault-rg \
  --location eastus \
  --enable-soft-delete true \
  --enable-purge-protection true
```

#### Task 1.3: Configure Key Vault Access Policies
```bash
# Get Azure DevOps Service Principal Object ID
SP_OBJECT_ID=$(az ad sp list --display-name "azure-devops-dating-app" --query "[0].id" -o tsv)

# Set access policies for all Key Vaults
for KV in dating-app-common-kv dating-app-dev-kv dating-app-staging-kv dating-app-prod-kv; do
  az keyvault set-policy --name $KV \
    --object-id $SP_OBJECT_ID \
    --secret-permissions get list
done
```

#### Task 1.4: Create Service Connections in Azure DevOps
- [ ] Create Azure Resource Manager service connection
- [ ] Test connection to all Key Vaults
- [ ] Document connection names for pipeline reference

### Phase 2: Migrate Common Secrets (Day 1-2)

#### Task 2.1: Upload Common Secrets to Key Vault
```bash
# Example: Upload Docker credentials
az keyvault secret set --vault-name dating-app-common-kv \
  --name docker-password \
  --value "{DOCKER_PASSWORD_VALUE}"

# Upload Azure Service Principal credentials
az keyvault secret set --vault-name dating-app-common-kv \
  --name azure-client-id \
  --value "{AZURE_CLIENT_ID}"

az keyvault secret set --vault-name dating-app-common-kv \
  --name azure-client-secret \
  --value "{AZURE_CLIENT_SECRET}"

az keyvault secret set --vault-name dating-app-common-kv \
  --name azure-tenant-id \
  --value "{AZURE_TENANT_ID}"

az keyvault secret set --vault-name dating-app-common-kv \
  --name azure-subscription-id \
  --value "{AZURE_SUBSCRIPTION_ID}"

# Upload CI/CD tool tokens
az keyvault secret set --vault-name dating-app-common-kv \
  --name sonar-token \
  --value "{SONAR_TOKEN}"

az keyvault secret set --vault-name dating-app-common-kv \
  --name codecov-token \
  --value "{CODECOV_TOKEN}"

az keyvault secret set --vault-name dating-app-common-kv \
  --name snyk-token \
  --value "{SNYK_TOKEN}"
```

**Batch Upload Script** (`upload-common-secrets.sh`):
```bash
#!/bin/bash
KV_NAME="dating-app-common-kv"

# Read from secure file (ensure this file is .gitignored)
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^# ]] && continue

  # Convert underscores to hyphens for Key Vault
  kv_key=$(echo "$key" | tr '_' '-' | tr '[:upper:]' '[:lower:]')

  echo "Uploading $kv_key..."
  az keyvault secret set --vault-name "$KV_NAME" \
    --name "$kv_key" \
    --value "$value" \
    --output none
done < common-secrets.txt

echo "Common secrets uploaded successfully!"
```

#### Task 2.2: Create `common-secrets` Variable Group
- [ ] Navigate to Pipelines → Library → Variable groups
- [ ] Click "+ Variable group"
- [ ] Name: `common-secrets`
- [ ] Description: "Shared secrets across all environments"
- [ ] Enable "Link secrets from an Azure key vault as variables"
- [ ] Select service connection and `dating-app-common-kv`
- [ ] Add all common secrets from Key Vault
- [ ] Save variable group

#### Task 2.3: Configure Variable Group Permissions
- [ ] Go to variable group "common-secrets"
- [ ] Click "Security" tab
- [ ] Add pipeline permissions for all pipelines that need access
- [ ] Remove unnecessary permissions

### Phase 3: Migrate Development Secrets (Day 2)

#### Task 3.1: Upload Dev Secrets to Key Vault
```bash
#!/bin/bash
KV_NAME="dating-app-dev-kv"

# Database secrets
az keyvault secret set --vault-name $KV_NAME \
  --name dev-database-url \
  --value "{DEV_DATABASE_URL}"

az keyvault secret set --vault-name $KV_NAME \
  --name dev-postgres-password \
  --value "{DEV_POSTGRES_PASSWORD}"

az keyvault secret set --vault-name $KV_NAME \
  --name dev-redis-password \
  --value "{DEV_REDIS_PASSWORD}"

az keyvault secret set --vault-name $KV_NAME \
  --name dev-mongodb-uri \
  --value "{DEV_MONGODB_URI}"

# JWT secrets (generate new 64-char secrets)
az keyvault secret set --vault-name $KV_NAME \
  --name dev-jwt-access-secret \
  --value "$(openssl rand -base64 48)"

az keyvault secret set --vault-name $KV_NAME \
  --name dev-jwt-refresh-secret \
  --value "$(openssl rand -base64 48)"

# Third-party services (use test keys for dev)
az keyvault secret set --vault-name $KV_NAME \
  --name dev-stripe-secret-key \
  --value "{DEV_STRIPE_TEST_KEY}"

az keyvault secret set --vault-name $KV_NAME \
  --name dev-sendgrid-api-key \
  --value "{DEV_SENDGRID_KEY}"

# ... continue for all dev secrets
```

#### Task 3.2: Create `dev-secrets` Variable Group
- [ ] Create variable group linked to `dating-app-dev-kv`
- [ ] Import all dev secrets
- [ ] Add non-secret variables (URLs, resource names)
- [ ] Configure pipeline access permissions

### Phase 4: Migrate Staging Secrets (Day 2-3)

#### Task 4.1: Upload Staging Secrets to Key Vault
```bash
#!/bin/bash
KV_NAME="dating-app-staging-kv"

# Use similar structure as dev, but with staging values
# IMPORTANT: Generate NEW JWT secrets for staging, don't reuse dev
az keyvault secret set --vault-name $KV_NAME \
  --name staging-jwt-access-secret \
  --value "$(openssl rand -base64 48)"

az keyvault secret set --vault-name $KV_NAME \
  --name staging-jwt-refresh-secret \
  --value "$(openssl rand -base64 48)"

# Use production-like third-party keys (but separate accounts)
# ... continue for all staging secrets
```

#### Task 4.2: Create `test-secrets` Variable Group
- [ ] Create variable group linked to `dating-app-staging-kv`
- [ ] Import all staging secrets
- [ ] Add test user credentials
- [ ] Configure pipeline access permissions

### Phase 5: Migrate Production Secrets (Day 3-4)

**CRITICAL**: This is the most sensitive phase. Schedule during maintenance window.

#### Task 5.1: Upload Production Secrets to Key Vault
```bash
#!/bin/bash
KV_NAME="dating-app-prod-kv"

# Database secrets - PRODUCTION VALUES
az keyvault secret set --vault-name $KV_NAME \
  --name prod-database-url \
  --value "{PROD_DATABASE_URL}" \
  --tags environment=production critical=true

az keyvault secret set --vault-name $KV_NAME \
  --name prod-postgres-password \
  --value "{PROD_POSTGRES_PASSWORD}" \
  --tags environment=production critical=true

# JWT secrets - PRODUCTION (Generate NEW, rotate after migration)
az keyvault secret set --vault-name $KV_NAME \
  --name prod-jwt-access-secret \
  --value "$(openssl rand -base64 48)" \
  --tags environment=production critical=true

az keyvault secret set --vault-name $KV_NAME \
  --name prod-jwt-refresh-secret \
  --value "$(openssl rand -base64 48)" \
  --tags environment=production critical=true

# Third-party production keys
az keyvault secret set --vault-name $KV_NAME \
  --name prod-stripe-secret-key \
  --value "{PROD_STRIPE_KEY}" \
  --tags environment=production critical=true pci-dss=true

# ... continue for all production secrets
```

#### Task 5.2: Create `prod-secrets` Variable Group
- [ ] Create variable group linked to `dating-app-prod-kv`
- [ ] Import all production secrets
- [ ] Add production URLs and resource names
- [ ] Configure strict pipeline access permissions (production pipelines ONLY)
- [ ] Enable approval requirement for accessing this variable group

#### Task 5.3: Configure Production Security
- [ ] Enable "Require approval for variable group" in security settings
- [ ] Add only authorized personnel as approvers
- [ ] Enable audit logging for Key Vault access
- [ ] Set up alerts for unauthorized access attempts

### Phase 6: Update Azure DevOps Pipelines (Day 4-5)

#### Task 6.1: Update Pipeline YAML Files

**Before (GitHub Actions)**:
```yaml
- name: Deploy to staging
  env:
    DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
    JWT_ACCESS_SECRET: ${{ secrets.JWT_ACCESS_SECRET }}
```

**After (Azure DevOps)**:
```yaml
- task: AzureCLI@2
  displayName: 'Deploy to staging'
  inputs:
    azureSubscription: 'Azure-ServiceConnection'
    scriptType: 'bash'
    scriptLocation: 'inlineScript'
    inlineScript: |
      echo "Deploying to staging..."
      # Variables are automatically available from variable groups
  env:
    DATABASE_URL: $(DATABASE_URL)
    JWT_ACCESS_SECRET: $(JWT_ACCESS_SECRET)
```

**Pipeline Variable Group Reference**:
```yaml
variables:
  - group: common-secrets
  - group: dev-secrets  # or test-secrets or prod-secrets based on environment
```

#### Task 6.2: Create New Azure DevOps Pipelines

Create separate pipelines for each workflow type:

1. **CI Pipeline** (`azure-pipelines-ci.yml`)
   - Variable groups: `common-secrets`
   - Triggers: PR, push to feature branches

2. **CD Dev Pipeline** (`azure-pipelines-cd-dev.yml`)
   - Variable groups: `common-secrets`, `dev-secrets`
   - Triggers: push to develop branch

3. **CD Staging Pipeline** (`azure-pipelines-cd-staging.yml`)
   - Variable groups: `common-secrets`, `test-secrets`
   - Triggers: push to main branch

4. **CD Production Pipeline** (`azure-pipelines-cd-prod.yml`)
   - Variable groups: `common-secrets`, `prod-secrets`
   - Triggers: manual/release tag
   - Requires approval

5. **Terraform Pipeline** (`azure-pipelines-terraform.yml`)
   - Variable groups: `common-secrets`, environment-specific groups
   - Triggers: infrastructure changes

#### Task 6.3: Test Pipelines in Development
- [ ] Run CI pipeline and verify all secrets are accessible
- [ ] Run dev deployment and verify application starts correctly
- [ ] Check application logs for any missing environment variables
- [ ] Verify database connections work
- [ ] Test third-party integrations (Stripe, SendGrid, Twilio)

### Phase 7: Verification & Smoke Tests (Day 5)

#### Task 7.1: Dev Environment Verification
- [ ] Deploy to dev using new pipeline
- [ ] Run automated smoke tests
- [ ] Manually verify key features:
  - [ ] User registration/login
  - [ ] Photo upload (Azure Storage)
  - [ ] Messaging (Cosmos DB)
  - [ ] Payment processing (Stripe test mode)
  - [ ] Email notifications (SendGrid)
  - [ ] SMS verification (Twilio)

#### Task 7.2: Staging Environment Verification
- [ ] Deploy to staging using new pipeline
- [ ] Run full E2E test suite
- [ ] Run performance tests
- [ ] Verify all microservices are communicating
- [ ] Check monitoring dashboards (Application Insights)
- [ ] Test rollback procedure

#### Task 7.3: Production Dry Run
- [ ] Review production variable group one final time
- [ ] Verify all production secrets are correct in Key Vault
- [ ] Confirm approval gates are configured
- [ ] Document production deployment procedure
- [ ] Schedule production deployment window

### Phase 8: Production Migration (Day 6 - During Maintenance Window)

#### Task 8.1: Pre-Production Checklist
- [ ] Announce maintenance window to users
- [ ] Backup production database
- [ ] Export current Kubernetes deployments as backup
- [ ] Verify rollback procedure is ready
- [ ] Have incident response team on standby

#### Task 8.2: Production Deployment
- [ ] Trigger production pipeline with approvals
- [ ] Monitor deployment progress closely
- [ ] Watch application logs for errors
- [ ] Check error rates in monitoring dashboards
- [ ] Verify health endpoints

#### Task 8.3: Post-Production Verification
- [ ] Run production smoke tests
- [ ] Monitor error rates for 30 minutes
- [ ] Test critical user flows:
  - [ ] User login
  - [ ] Profile updates
  - [ ] Payment processing (make test transaction)
  - [ ] Messaging
  - [ ] Notifications
- [ ] Check third-party service logs (Stripe, Twilio, SendGrid)
- [ ] Verify no secrets are exposed in logs

### Phase 9: Cleanup (Day 7)

#### Task 9.1: GitHub Secrets Cleanup
**DO NOT DELETE immediately** - keep for 30 days as backup

- [ ] Document that GitHub secrets are deprecated
- [ ] Add comment in GitHub Actions workflows: "DEPRECATED - Migrated to Azure DevOps"
- [ ] Disable old GitHub Actions workflows (don't delete yet)
- [ ] After 30 days of stable operation, delete GitHub secrets

#### Task 9.2: Documentation Updates
- [ ] Update developer onboarding documentation
- [ ] Update deployment runbooks
- [ ] Create Azure DevOps pipeline guide
- [ ] Document Key Vault secret naming conventions
- [ ] Update incident response procedures

#### Task 9.3: Audit & Compliance
- [ ] Review Key Vault access logs
- [ ] Verify no unauthorized access
- [ ] Document migration in change management system
- [ ] Update security audit checklist

---

## 5. Service Connections Required

### 5.1 Azure Resource Manager Service Connection

**Purpose**: Deploy to Azure resources, access Key Vault, manage AKS

**Setup**:
1. Go to Project Settings → Service connections → New service connection
2. Select "Azure Resource Manager"
3. Choose authentication method: "Service principal (automatic)"
4. Scope: Subscription
5. Name: `Azure-Production-ServiceConnection`
6. Grant access to all pipelines (or specific ones)

**Permissions Required**:
- Contributor on subscription (for infrastructure)
- Key Vault Secrets User (for secret access)
- AKS Cluster Admin (for Kubernetes deployments)

**Validation**:
```bash
# Test service connection
az login --service-principal \
  --username {CLIENT_ID} \
  --password {CLIENT_SECRET} \
  --tenant {TENANT_ID}

# Verify Key Vault access
az keyvault secret show --vault-name dating-app-prod-kv --name prod-database-url
```

### 5.2 Azure Container Registry Service Connection

**Purpose**: Push/pull Docker images to/from ACR

**Setup**:
1. New service connection → Docker Registry
2. Registry type: Azure Container Registry
3. Azure subscription: Select your subscription
4. Azure container registry: Select `datingappprodacr`
5. Name: `ACR-Production`

**Alternative - Use Service Principal**:
```yaml
- task: Docker@2
  inputs:
    containerRegistry: 'ACR-Production'
    repository: 'dating-app/user-service'
    command: 'buildAndPush'
    Dockerfile: '**/Dockerfile'
    tags: |
      $(Build.BuildId)
      latest
```

### 5.3 Kubernetes Service Connection

**Purpose**: Deploy to AKS clusters

**Setup**:
1. New service connection → Kubernetes
2. Authentication method: Azure Subscription
3. Cluster: Select AKS cluster
4. Namespace: `default` (or environment-specific)
5. Name: `AKS-Production`

**Alternative - KubeConfig**:
```yaml
- task: Kubernetes@1
  inputs:
    connectionType: 'Kubernetes Service Connection'
    kubernetesServiceEndpoint: 'AKS-Production'
    namespace: 'production'
    command: 'apply'
    useConfigurationFile: true
    configuration: 'k8s/deployments/*.yaml'
```

### 5.4 Third-Party Service Connections

#### 5.4.1 Stripe Webhook Service Connection (Optional)
**Purpose**: Validate webhook signatures in pipeline

Not needed as service connection - handle in application code

#### 5.4.2 SendGrid Service Connection (Optional)
**Purpose**: Send build notification emails

Not needed - use secrets directly in pipeline tasks

#### 5.4.3 Twilio Service Connection (Optional)
**Purpose**: Send SMS notifications for critical failures

Not needed - use secrets directly in pipeline tasks

#### 5.4.4 SonarQube Service Connection
**Purpose**: Code quality analysis

**Setup**:
1. New service connection → SonarQube
2. Server URL: `https://sonarqube.yourcompany.com`
3. Token: Use `$(SONAR_TOKEN)` from variable group
4. Name: `SonarQube-Production`

**Usage**:
```yaml
- task: SonarQubePrepare@5
  inputs:
    SonarQube: 'SonarQube-Production'
    scannerMode: 'CLI'
    configMode: 'file'
```

#### 5.4.5 Snyk Service Connection
**Purpose**: Security vulnerability scanning

**Setup**:
1. New service connection → Generic
2. Server URL: `https://snyk.io/api`
3. Token: Use `$(SNYK_TOKEN)` from variable group
4. Name: `Snyk-Security`

#### 5.4.6 Slack Incoming Webhook
**Purpose**: Deployment notifications

**Setup**:
1. Store webhook URL in Key Vault: `slack-webhook-url`
2. Reference in pipeline:
```yaml
- task: Bash@3
  displayName: 'Send Slack Notification'
  inputs:
    targetType: 'inline'
    script: |
      curl -X POST $(SLACK_WEBHOOK_URL) \
        -H 'Content-Type: application/json' \
        -d '{"text":"Deployment to production succeeded!"}'
```

### 5.5 GitHub Service Connection (for migration period)
**Purpose**: Pull code from GitHub repository

**Setup**:
1. New service connection → GitHub
2. Grant access: OAuth or Personal Access Token
3. Name: `GitHub-DatingApp`

**Usage**:
```yaml
resources:
  repositories:
    - repository: datingapp
      type: github
      endpoint: GitHub-DatingApp
      name: yourorg/World-Class-Dating-App-Platform
```

---

## 6. Verification & Testing

### 6.1 Secret Accessibility Test

Create a test pipeline to verify all secrets are accessible:

**File**: `azure-pipelines-secret-test.yml`
```yaml
trigger: none  # Manual trigger only

variables:
  - group: common-secrets
  - group: dev-secrets

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: Bash@3
    displayName: 'Verify Common Secrets'
    inputs:
      targetType: 'inline'
      script: |
        echo "Testing secret accessibility..."

        # Test if secrets are loaded (don't print values!)
        test -n "$(AZURE_CLIENT_ID)" && echo "✓ AZURE_CLIENT_ID loaded" || echo "✗ AZURE_CLIENT_ID missing"
        test -n "$(SERVICE_API_KEY)" && echo "✓ SERVICE_API_KEY loaded" || echo "✗ SERVICE_API_KEY missing"
        test -n "$(SONAR_TOKEN)" && echo "✓ SONAR_TOKEN loaded" || echo "✗ SONAR_TOKEN missing"

  - task: Bash@3
    displayName: 'Verify Dev Secrets'
    inputs:
      targetType: 'inline'
      script: |
        test -n "$(DATABASE_URL)" && echo "✓ DATABASE_URL loaded" || echo "✗ DATABASE_URL missing"
        test -n "$(JWT_ACCESS_SECRET)" && echo "✓ JWT_ACCESS_SECRET loaded" || echo "✗ JWT_ACCESS_SECRET missing"
        test -n "$(STRIPE_SECRET_KEY)" && echo "✓ STRIPE_SECRET_KEY loaded" || echo "✗ STRIPE_SECRET_KEY missing"

        # Verify secret lengths (security check)
        if [ ${#JWT_ACCESS_SECRET} -ge 32 ]; then
          echo "✓ JWT_ACCESS_SECRET has sufficient length"
        else
          echo "✗ JWT_ACCESS_SECRET too short!"
          exit 1
        fi
```

### 6.2 Integration Test

**File**: `scripts/verify-secrets-integration.sh`
```bash
#!/bin/bash
set -e

echo "=== Secrets Integration Test ==="

# Test Database Connection
echo "Testing PostgreSQL connection..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT version();" > /dev/null
echo "✓ Database connection successful"

# Test Redis Connection
echo "Testing Redis connection..."
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD PING > /dev/null
echo "✓ Redis connection successful"

# Test Azure Storage
echo "Testing Azure Storage..."
az storage container list --connection-string "$AZURE_STORAGE_CONNECTION_STRING" > /dev/null
echo "✓ Azure Storage connection successful"

# Test SendGrid API
echo "Testing SendGrid API..."
curl -s -o /dev/null -w "%{http_code}" -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" | grep -q "40[01]"
echo "✓ SendGrid API accessible"

# Test Stripe API
echo "Testing Stripe API..."
curl -s -o /dev/null -w "%{http_code}" -X GET https://api.stripe.com/v1/balance \
  -u "$STRIPE_SECRET_KEY:" | grep -q "200"
echo "✓ Stripe API accessible"

echo "=== All integration tests passed! ==="
```

### 6.3 Health Check Verification

After deployment, verify all services are healthy:

```bash
#!/bin/bash
ENVIRONMENT=$1  # dev, staging, prod
BASE_URL="https://api-${ENVIRONMENT}.datingapp.com"

echo "=== Health Check: $ENVIRONMENT ==="

services=(
  "api-gateway"
  "user-service"
  "matching-service"
  "messaging-service"
  "media-service"
  "notification-service"
  "payment-service"
  "moderation-service"
  "analytics-service"
)

for service in "${services[@]}"; do
  echo -n "Checking $service... "
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/$service/health")

  if [ "$status" -eq 200 ]; then
    echo "✓ Healthy"
  else
    echo "✗ Unhealthy (HTTP $status)"
    exit 1
  fi
done

echo "=== All services healthy! ==="
```

---

## 7. Rollback Plan

### 7.1 Rollback Triggers

Initiate rollback if:
- Any service fails health checks for > 5 minutes
- Error rate increases by > 50%
- Database connections fail
- Third-party service integrations break
- User-reported critical issues

### 7.2 Rollback Procedure

#### Option A: Revert to GitHub Actions (Emergency Only)

**If Azure DevOps pipelines fail completely**:

1. Re-enable GitHub Actions workflows:
   ```bash
   # In GitHub repository
   git checkout .github/workflows/*.yml
   git commit -m "Emergency rollback to GitHub Actions"
   git push
   ```

2. GitHub secrets are still available (not deleted in Phase 9)

3. Trigger GitHub Actions workflow manually

4. Monitor deployment

**Timeline**: 10-15 minutes

#### Option B: Fix Secrets in Azure DevOps (Preferred)

**If specific secrets are incorrect**:

1. Identify the problematic secret from logs
2. Update secret in Key Vault:
   ```bash
   az keyvault secret set --vault-name dating-app-prod-kv \
     --name {secret-name} \
     --value "{correct-value}"
   ```
3. Secrets in variable groups update automatically (may take 1-2 minutes)
4. Re-run pipeline or restart affected pods:
   ```bash
   kubectl rollout restart deployment/{service-name} -n production
   ```

**Timeline**: 5-10 minutes

#### Option C: Rollback Kubernetes Deployment

**If application deployment fails**:

1. Use Kubernetes rollback:
   ```bash
   kubectl rollout undo deployment/{service-name} -n production
   ```

2. Verify rollback:
   ```bash
   kubectl rollout status deployment/{service-name} -n production
   ```

3. Check health endpoints

**Timeline**: 3-5 minutes

### 7.3 Rollback Communication

1. **Immediate notification**:
   - Post in Slack #incidents channel
   - Alert on-call team
   - Update status page

2. **During rollback**:
   - Provide regular updates every 5 minutes
   - Document actions taken
   - Monitor error rates and metrics

3. **Post-rollback**:
   - Conduct incident retrospective
   - Document lessons learned
   - Update rollback procedures

### 7.4 Rollback Validation

After rollback, verify:
- [ ] All services return to healthy state
- [ ] Error rates return to baseline
- [ ] User can complete critical flows (login, messaging, payments)
- [ ] Database connections stable
- [ ] Third-party integrations working

---

## 8. Post-Migration Tasks

### 8.1 Security Hardening (Week 1)

- [ ] Rotate all JWT secrets in production
- [ ] Review Key Vault access logs
- [ ] Enable Azure Key Vault alerts for unauthorized access
- [ ] Configure diagnostic settings on Key Vault
- [ ] Review service principal permissions (principle of least privilege)
- [ ] Enable Azure AD Privileged Identity Management for Key Vault access
- [ ] Set up periodic secret rotation (90 days for critical secrets)

### 8.2 Documentation (Week 1-2)

- [ ] Update deployment runbooks
- [ ] Create "How to add new secrets" guide
- [ ] Document variable group naming conventions
- [ ] Update developer onboarding checklist
- [ ] Create troubleshooting guide for secret access issues
- [ ] Document Key Vault secret rotation procedures

### 8.3 Monitoring & Alerting (Week 2)

- [ ] Set up Azure Monitor alerts for Key Vault access
- [ ] Configure alerts for secret expiration (if using expiring secrets)
- [ ] Create dashboard for pipeline success/failure rates
- [ ] Set up notification for failed secret retrievals
- [ ] Monitor Key Vault request latency

### 8.4 Optimization (Week 3-4)

- [ ] Review and remove unused secrets
- [ ] Consolidate duplicate secrets
- [ ] Evaluate secret caching strategies to reduce Key Vault calls
- [ ] Optimize pipeline performance (parallel jobs, caching)
- [ ] Consider managed identities for Azure resources (reduce secrets)

### 8.5 Compliance & Audit (Month 1)

- [ ] Conduct security audit of Key Vault configuration
- [ ] Review access logs for anomalies
- [ ] Document compliance with security policies (SOC 2, PCI-DSS)
- [ ] Update disaster recovery procedures
- [ ] Test secret restore from backup

### 8.6 GitHub Cleanup (Day 30)

**After 30 days of stable Azure DevOps operation**:

- [ ] Verify no rollbacks needed in past 30 days
- [ ] Delete GitHub repository secrets:
  ```bash
  # Use GitHub CLI to delete secrets
  gh secret list
  gh secret delete {SECRET_NAME}
  ```
- [ ] Archive old GitHub Actions workflows
- [ ] Update GitHub repository README to indicate migration to Azure DevOps
- [ ] Remove GitHub Actions badges from README

---

## 9. Appendix

### 9.1 Secret Generation Commands

Generate secure secrets for new environments:

```bash
# Generate 32-character alphanumeric secret
openssl rand -base64 32

# Generate 64-character secret
openssl rand -base64 48

# Generate hex secret
openssl rand -hex 32

# Generate JWT secret (64 characters)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Generate encryption key (exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex').substring(0, 32))"
```

### 9.2 Key Vault CLI Cheat Sheet

```bash
# List all secrets in Key Vault
az keyvault secret list --vault-name dating-app-prod-kv --query "[].name" -o tsv

# Get secret value
az keyvault secret show --vault-name dating-app-prod-kv --name prod-database-url --query "value" -o tsv

# Set secret with expiration
az keyvault secret set --vault-name dating-app-prod-kv \
  --name prod-api-key \
  --value "secret-value" \
  --expires $(date -u -d "+90 days" +"%Y-%m-%dT%H:%M:%SZ")

# Update secret (new version)
az keyvault secret set --vault-name dating-app-prod-kv \
  --name prod-database-url \
  --value "new-value"

# List secret versions
az keyvault secret list-versions --vault-name dating-app-prod-kv --name prod-database-url

# Restore deleted secret (soft delete must be enabled)
az keyvault secret recover --vault-name dating-app-prod-kv --name prod-database-url

# Purge deleted secret permanently
az keyvault secret purge --vault-name dating-app-prod-kv --name prod-database-url

# Backup secret
az keyvault secret backup --vault-name dating-app-prod-kv --name prod-database-url --file backup.blob

# Restore secret
az keyvault secret restore --vault-name dating-app-prod-kv --file backup.blob
```

### 9.3 Azure DevOps CLI Cheat Sheet

```bash
# List variable groups
az pipelines variable-group list --org https://dev.azure.com/yourorg --project dating-app

# Create variable group
az pipelines variable-group create \
  --name dev-secrets \
  --variables KEY1=value1 KEY2=value2 \
  --org https://dev.azure.com/yourorg \
  --project dating-app

# Update variable in group
az pipelines variable-group variable update \
  --group-id {group-id} \
  --name DATABASE_URL \
  --value "new-value" \
  --org https://dev.azure.com/yourorg \
  --project dating-app

# List service connections
az devops service-endpoint list \
  --org https://dev.azure.com/yourorg \
  --project dating-app
```

### 9.4 Troubleshooting Guide

#### Issue: Secret not found in pipeline

**Symptoms**: Pipeline fails with "Secret not found" or empty variable

**Solutions**:
1. Verify variable group is linked to pipeline:
   ```yaml
   variables:
     - group: common-secrets  # Check this is present
   ```

2. Check secret exists in Key Vault:
   ```bash
   az keyvault secret show --vault-name dating-app-prod-kv --name {secret-name}
   ```

3. Verify service connection has Key Vault access:
   ```bash
   az keyvault show --name dating-app-prod-kv --query "properties.accessPolicies"
   ```

4. Check variable group refresh (may take 1-2 minutes after Key Vault update)

#### Issue: Permission denied accessing Key Vault

**Symptoms**: `403 Forbidden` error when accessing secrets

**Solutions**:
1. Verify service principal has correct access policy:
   ```bash
   az keyvault set-policy --name dating-app-prod-kv \
     --object-id {sp-object-id} \
     --secret-permissions get list
   ```

2. Check service connection configuration in Azure DevOps

3. Verify service principal credentials are not expired

#### Issue: Secret value incorrect

**Symptoms**: Application fails to connect to service (database, API, etc.)

**Solutions**:
1. Verify secret value in Key Vault (view in Azure Portal)
2. Check for extra whitespace or newlines in secret value
3. Verify secret is loaded correctly (log length, not value):
   ```bash
   echo "JWT secret length: ${#JWT_ACCESS_SECRET}"
   ```
4. Test connection manually with secret value
5. Update secret if incorrect and restart pods

#### Issue: Pipeline timeout accessing Key Vault

**Symptoms**: Pipeline hangs or times out when loading variable groups

**Solutions**:
1. Check Key Vault firewall settings (allow Azure services)
2. Verify Key Vault is not under DDoS protection
3. Check Azure DevOps service health status
4. Retry pipeline run

---

## 10. Contact & Support

**Migration Team**:
- DevOps Lead: {name} - {email}
- Security Engineer: {name} - {email}
- Application Architect: {name} - {email}

**Escalation Contacts**:
- On-call Engineer: {phone}
- Manager: {name} - {email}

**Support Channels**:
- Slack: #devops-support
- Email: devops@datingapp.com
- Emergency: {emergency-phone}

**Key Resources**:
- Azure DevOps: https://dev.azure.com/yourorg/dating-app
- Azure Portal: https://portal.azure.com
- GitHub (legacy): https://github.com/yourorg/World-Class-Dating-App-Platform
- Documentation: https://docs.datingapp.com/devops

---

**Document Version**: 1.0
**Last Updated**: {date}
**Next Review**: {date + 90 days}

**Change Log**:
- v1.0 - Initial migration plan created
