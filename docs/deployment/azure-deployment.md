# Azure Deployment Guide - Flamoral Platform

Complete guide for deploying the Flamoral dating platform to Microsoft Azure.

**Last Updated:** 2025-12-18
**Target Environment:** Azure Container Apps + Azure Database for PostgreSQL

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Account Setup](#azure-account-setup)
3. [Infrastructure Deployment](#infrastructure-deployment)
4. [Container Registry Setup](#container-registry-setup)
5. [Database Setup](#database-setup)
6. [Secrets Management](#secrets-management)
7. [Service Deployment](#service-deployment)
8. [DNS and Domain Setup](#dns-and-domain-setup)
9. [Monitoring Setup](#monitoring-setup)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

Install the following tools before starting:

```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az --version

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
docker --version

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version

# GitHub CLI (optional, for CI/CD)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### Azure Subscription

You need an Azure subscription with:
- **Subscription ID:** `ba233460-2dbe-4603-a594-68f93ec9deb3`
- **Contributor role** or higher
- **Resource providers registered:** Microsoft.ContainerRegistry, Microsoft.App, Microsoft.DBforPostgreSQL

---

## Azure Account Setup

### 1. Login to Azure

```bash
# Login with browser
az login

# Or login with service principal (CI/CD)
az login --service-principal \
  --username $ARM_CLIENT_ID \
  --password $ARM_CLIENT_SECRET \
  --tenant $ARM_TENANT_ID
```

### 2. Set Active Subscription

```bash
# List available subscriptions
az account list --output table

# Set the Flamoral subscription
az account set --subscription "ba233460-2dbe-4603-a594-68f93ec9deb3"

# Verify
az account show --output table
```

### 3. Create Service Principal (for CI/CD)

```bash
# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "flamoral-github-actions-sp" \
  --role "Contributor" \
  --scopes "/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3" \
  --sdk-auth \
  --output json > azure-credentials.json

# Output will contain:
# - clientId (ARM_CLIENT_ID)
# - clientSecret (ARM_CLIENT_SECRET)
# - subscriptionId (ARM_SUBSCRIPTION_ID)
# - tenantId (ARM_TENANT_ID)

# IMPORTANT: Save these credentials securely!
# Add to GitHub Secrets as AZURE_CREDENTIALS
```

---

## Infrastructure Deployment

### 1. Create Resource Groups

```bash
# Production resource group
az group create \
  --name flamoral-prod-rg \
  --location eastus \
  --tags environment=production project=flamoral

# Staging resource group
az group create \
  --name flamoral-staging-rg \
  --location eastus \
  --tags environment=staging project=flamoral

# Development resource group
az group create \
  --name flamoral-dev-rg \
  --location eastus \
  --tags environment=development project=flamoral
```

### 2. Create Virtual Network

```bash
# Production VNet
az network vnet create \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name services-subnet \
  --subnet-prefix 10.0.1.0/24

# Create additional subnets
az network vnet subnet create \
  --resource-group flamoral-prod-rg \
  --vnet-name flamoral-prod-vnet \
  --name database-subnet \
  --address-prefix 10.0.2.0/24

az network vnet subnet create \
  --resource-group flamoral-prod-rg \
  --vnet-name flamoral-prod-vnet \
  --name cache-subnet \
  --address-prefix 10.0.3.0/24
```

### 3. Create Container Apps Environment

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group flamoral-prod-rg \
  --workspace-name flamoral-prod-logs

# Get workspace ID and key
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group flamoral-prod-rg \
  --workspace-name flamoral-prod-logs \
  --query customerId -o tsv)

WORKSPACE_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group flamoral-prod-rg \
  --workspace-name flamoral-prod-logs \
  --query primarySharedKey -o tsv)

# Create Container Apps environment
az containerapp env create \
  --name flamoral-prod-env \
  --resource-group flamoral-prod-rg \
  --location eastus \
  --logs-workspace-id $WORKSPACE_ID \
  --logs-workspace-key $WORKSPACE_KEY
```

---

## Container Registry Setup

### 1. Create Azure Container Registry

```bash
# Create ACR
az acr create \
  --resource-group flamoral-prod-rg \
  --name flomodalregistry \
  --sku Standard \
  --admin-enabled true

# Login to ACR
az acr login --name flomodalregistry

# Get ACR credentials
ACR_USERNAME=$(az acr credential show \
  --name flomodalregistry \
  --query username -o tsv)

ACR_PASSWORD=$(az acr credential show \
  --name flomodalregistry \
  --query passwords[0].value -o tsv)

echo "ACR Username: $ACR_USERNAME"
echo "ACR Password: $ACR_PASSWORD"
```

### 2. Build and Push Images

```bash
# Navigate to project root
cd /path/to/flamoral

# Build all service images
npm run docker:build

# Tag images for ACR
docker tag flamoral/api-gateway:latest flomodalregistry.azurecr.io/api-gateway:latest
docker tag flamoral/auth-service:latest flomodalregistry.azurecr.io/auth-service:latest
docker tag flamoral/user-service:latest flomodalregistry.azurecr.io/user-service:latest
# ... (repeat for all 18 services)

# Push all images
docker push flomodalregistry.azurecr.io/api-gateway:latest
docker push flomodalregistry.azurecr.io/auth-service:latest
docker push flomodalregistry.azurecr.io/user-service:latest
# ... (repeat for all 18 services)
```

### 3. Automated Build Script

```bash
#!/bin/bash
# infrastructure/scripts/build-and-push-all.sh

REGISTRY="flomodalregistry.azurecr.io"
SERVICES=(
  "api-gateway"
  "auth-service"
  "user-service"
  "matching-service"
  "messaging-service"
  "media-service"
  "notification-service"
  "payment-service"
  "analytics-service"
  "moderation-service"
  "automation-service"
  "admin-service"
  "realtime-service"
  "policy-service"
  "workflow-engine"
  "dating-coach-service"
  "fraud-detection-service"
  "nlp-service"
  "photo-analysis-service"
  "recommendation-service"
)

for SERVICE in "${SERVICES[@]}"; do
  echo "Building $SERVICE..."
  docker build -t $REGISTRY/$SERVICE:latest -f backend/services/$SERVICE/Dockerfile .
  docker push $REGISTRY/$SERVICE:latest
done
```

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db \
  --location eastus \
  --admin-user flomoraladmin \
  --admin-password 'YourSecurePassword123!' \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 16 \
  --high-availability Enabled \
  --backup-retention 30

# Create database
az postgres flexible-server db create \
  --resource-group flamoral-prod-rg \
  --server-name flamoral-prod-db \
  --database-name flamoral

# Configure firewall (allow Azure services)
az postgres flexible-server firewall-rule create \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Get connection string
az postgres flexible-server show-connection-string \
  --server-name flamoral-prod-db \
  --database-name flamoral \
  --admin-user flomoraladmin \
  --admin-password 'YourSecurePassword123!'
```

### 2. Run Database Migrations

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://flomoraladmin:YourSecurePassword123!@flamoral-prod-db.postgres.database.azure.com:5432/flamoral?sslmode=require"

# Run migrations
cd infrastructure/database
npm install
npx knex migrate:latest --knexfile knexfile.ts

# Verify migrations
npx knex migrate:status --knexfile knexfile.ts
```

### 3. Create Azure Cache for Redis

```bash
# Create Redis cache
az redis create \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cache \
  --location eastus \
  --sku Standard \
  --vm-size c1 \
  --enable-non-ssl-port false

# Get Redis connection string
REDIS_KEY=$(az redis list-keys \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cache \
  --query primaryKey -o tsv)

REDIS_HOST="flamoral-prod-cache.redis.cache.windows.net"
REDIS_URL="rediss://:$REDIS_KEY@$REDIS_HOST:6380"

echo "Redis URL: $REDIS_URL"
```

### 4. Create MongoDB (Azure Cosmos DB)

```bash
# Create Cosmos DB account with MongoDB API
az cosmosdb create \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cosmos \
  --kind MongoDB \
  --server-version 4.2 \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=False

# Create database
az cosmosdb mongodb database create \
  --account-name flamoral-prod-cosmos \
  --resource-group flamoral-prod-rg \
  --name flamoral

# Get connection string
az cosmosdb keys list \
  --name flamoral-prod-cosmos \
  --resource-group flamoral-prod-rg \
  --type connection-strings
```

---

## Secrets Management

### 1. Create Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-kv \
  --location eastus \
  --enable-rbac-authorization false

# Set access policy for your user
az keyvault set-policy \
  --name flamoral-prod-kv \
  --upn your-email@domain.com \
  --secret-permissions get list set delete

# Set access policy for service principal
az keyvault set-policy \
  --name flamoral-prod-kv \
  --spn $ARM_CLIENT_ID \
  --secret-permissions get list
```

### 2. Store Secrets in Key Vault

```bash
# Database credentials
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name DATABASE-URL \
  --value "$DATABASE_URL"

# Redis connection
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name REDIS-URL \
  --value "$REDIS_URL"

# MongoDB connection
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name MONGODB-URI \
  --value "$MONGODB_URI"

# JWT secrets
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name JWT-SECRET \
  --value "$(openssl rand -base64 64)"

# Stripe keys
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name STRIPE-SECRET-KEY \
  --value "sk_live_..."

# SendGrid API key
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name SENDGRID-API-KEY \
  --value "SG...."

# Twilio credentials
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name TWILIO-ACCOUNT-SID \
  --value "AC..."

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name TWILIO-AUTH-TOKEN \
  --value "..."
```

---

## Service Deployment

### 1. Deploy API Gateway

```bash
az containerapp create \
  --name flamoral-api-gateway \
  --resource-group flamoral-prod-rg \
  --environment flamoral-prod-env \
  --image flomodalregistry.azurecr.io/api-gateway:latest \
  --registry-server flomodalregistry.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 2 \
  --max-replicas 10 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
  --secrets \
    jwt-secret=keyvaultref:https://flamoral-prod-kv.vault.azure.net/secrets/JWT-SECRET,identityref:system \
    database-url=keyvaultref:https://flamoral-prod-kv.vault.azure.net/secrets/DATABASE-URL,identityref:system
```

### 2. Deploy Auth Service

```bash
az containerapp create \
  --name flamoral-auth-service \
  --resource-group flamoral-prod-rg \
  --environment flamoral-prod-env \
  --image flomodalregistry.azurecr.io/auth-service:latest \
  --registry-server flomodalregistry.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3001 \
  --ingress internal \
  --min-replicas 2 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    NODE_ENV=production \
    PORT=3001
```

### 3. Deploy All Services Script

```bash
#!/bin/bash
# infrastructure/scripts/deploy-all-services.sh

RESOURCE_GROUP="flamoral-prod-rg"
ENVIRONMENT="flamoral-prod-env"
REGISTRY="flomodalregistry.azurecr.io"

# Service configurations
declare -A SERVICES=(
  ["api-gateway"]="3000:external:2:10:1.0:2.0"
  ["auth-service"]="3001:internal:2:5:0.5:1.0"
  ["user-service"]="3002:internal:2:5:0.5:1.0"
  ["matching-service"]="3003:internal:1:5:0.5:1.0"
  ["messaging-service"]="3004:internal:2:10:1.0:2.0"
  ["media-service"]="3005:internal:1:5:1.0:2.0"
  ["notification-service"]="3006:internal:1:5:0.5:1.0"
  ["payment-service"]="3007:internal:1:3:0.5:1.0"
  ["analytics-service"]="3008:internal:1:3:0.5:1.0"
  ["moderation-service"]="3009:internal:1:3:0.5:1.0"
  ["automation-service"]="3010:internal:1:3:0.5:1.0"
  ["admin-service"]="3011:internal:1:3:0.5:1.0"
  ["realtime-service"]="5000:external:2:10:1.0:2.0"
  ["policy-service"]="3013:internal:1:2:0.25:0.5"
  ["workflow-engine"]="3014:internal:1:3:0.5:1.0"
)

for SERVICE in "${!SERVICES[@]}"; do
  IFS=':' read -r PORT INGRESS MIN_REPLICAS MAX_REPLICAS CPU MEMORY <<< "${SERVICES[$SERVICE]}"

  echo "Deploying $SERVICE..."
  az containerapp create \
    --name flamoral-$SERVICE \
    --resource-group $RESOURCE_GROUP \
    --environment $ENVIRONMENT \
    --image $REGISTRY/$SERVICE:latest \
    --registry-server $REGISTRY \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --target-port $PORT \
    --ingress $INGRESS \
    --min-replicas $MIN_REPLICAS \
    --max-replicas $MAX_REPLICAS \
    --cpu $CPU \
    --memory ${MEMORY}Gi \
    --env-vars NODE_ENV=production PORT=$PORT
done
```

---

## DNS and Domain Setup

### 1. Create Azure Front Door

```bash
# Create Front Door profile
az afd profile create \
  --profile-name flamoral-prod-fd \
  --resource-group flamoral-prod-rg \
  --sku Standard_AzureFrontDoor

# Create endpoint
az afd endpoint create \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-fd \
  --endpoint-name flamoral-api \
  --enabled-state Enabled

# Get endpoint hostname
az afd endpoint show \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-fd \
  --endpoint-name flamoral-api \
  --query hostName -o tsv
```

### 2. Configure Custom Domain

```bash
# Add custom domain
az afd custom-domain create \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-fd \
  --custom-domain-name flamoral-api-domain \
  --host-name api.flamoral.com \
  --minimum-tls-version TLS12

# Enable HTTPS
az afd custom-domain update \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-fd \
  --custom-domain-name flamoral-api-domain \
  --certificate-type ManagedCertificate
```

### 3. Configure DNS (Azure DNS or external)

```txt
# Add CNAME record in your DNS provider:
api.flamoral.com  CNAME  flamoral-api-xxxxx.azurefd.net
www.flamoral.com  CNAME  flamoral-api-xxxxx.azurefd.net
```

---

## Monitoring Setup

### 1. Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app flamoral-prod-insights \
  --location eastus \
  --resource-group flamoral-prod-rg \
  --workspace $WORKSPACE_ID

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app flamoral-prod-insights \
  --resource-group flamoral-prod-rg \
  --query instrumentationKey -o tsv)

# Add to Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name APPINSIGHTS-INSTRUMENTATION-KEY \
  --value "$INSTRUMENTATION_KEY"
```

### 2. Configure Alerts

```bash
# CPU alert
az monitor metrics alert create \
  --name "High CPU Usage" \
  --resource-group flamoral-prod-rg \
  --scopes $(az containerapp show --name flamoral-api-gateway --resource-group flamoral-prod-rg --query id -o tsv) \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m

# Error rate alert
az monitor metrics alert create \
  --name "High Error Rate" \
  --resource-group flamoral-prod-rg \
  --scopes $(az monitor app-insights component show --app flamoral-prod-insights --resource-group flamoral-prod-rg --query id -o tsv) \
  --condition "avg requests/failed > 10" \
  --window-size 5m \
  --evaluation-frequency 1m
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy-production.yml

name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_SUBSCRIPTION_ID: ba233460-2dbe-4603-a594-68f93ec9deb3
  RESOURCE_GROUP: flamoral-prod-rg
  REGISTRY: flomodalregistry.azurecr.io

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to ACR
        run: az acr login --name flomodalregistry

      - name: Build and Push Images
        run: |
          ./infrastructure/scripts/build-and-push-all.sh

      - name: Deploy Services
        run: |
          ./infrastructure/scripts/deploy-all-services.sh

      - name: Run Health Checks
        run: |
          ./infrastructure/scripts/health-check.sh
```

---

## Troubleshooting

### Common Issues

#### 1. Container App Not Starting

```bash
# Check logs
az containerapp logs show \
  --name flamoral-api-gateway \
  --resource-group flamoral-prod-rg \
  --follow

# Check revision status
az containerapp revision list \
  --name flamoral-api-gateway \
  --resource-group flamoral-prod-rg \
  --output table
```

#### 2. Database Connection Issues

```bash
# Test connection from local machine
psql "postgresql://flomoraladmin:YourSecurePassword123!@flamoral-prod-db.postgres.database.azure.com:5432/flamoral?sslmode=require"

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db \
  --output table
```

#### 3. Key Vault Access Issues

```bash
# Check access policies
az keyvault show \
  --name flamoral-prod-kv \
  --resource-group flamoral-prod-rg \
  --query properties.accessPolicies

# Grant access to managed identity
az keyvault set-policy \
  --name flamoral-prod-kv \
  --object-id $(az containerapp identity show --name flamoral-api-gateway --resource-group flamoral-prod-rg --query principalId -o tsv) \
  --secret-permissions get list
```

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Security Overview](../security/security-overview.md)
- [Operations Runbooks](../operations/)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Rollback Plan](./ROLLBACK_PLAN.md)

---

**Maintained by:** Flamoral DevOps Team
**Last Deployment:** 2025-12-18
**Environment:** Production (Azure East US)
