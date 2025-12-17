# Azure Auto-Retrievable Secrets - Flamoral Dating Platform

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Resource Group:** flamoral-prod-rg

---

## Overview

This document lists all Azure resources in the Flamoral production environment that can automatically provide connection strings, keys, and secrets without requiring manual API key generation from third-party providers.

These secrets can be automatically retrieved using Azure CLI commands and populated into Key Vaults programmatically.

---

## Azure Resources Inventory

### 1. Azure Storage Account

**Resource Name:** `flamoralprodzcqqgc`
**Resource Type:** Storage Account (Standard_LRS)
**Purpose:** Media storage for profile photos, videos, and uploaded content

#### Auto-Retrievable Secrets

| Secret Type | Key Vault Secret Name | Azure CLI Command |
|-------------|----------------------|-------------------|
| Connection String | `azure-storage-connection-string` | See below |
| Primary Key | `azure-storage-key` | See below |

#### Retrieval Commands

**Get Connection String:**
```bash
az storage account show-connection-string \
  --name flamoralprodzcqqgc \
  --resource-group flamoral-prod-rg \
  --output tsv
```

**Expected Output:**
```
DefaultEndpointsProtocol=https;AccountName=flamoralprodzcqqgc;AccountKey=<KEY>;EndpointSuffix=core.windows.net
```

**Get Primary Key Only:**
```bash
az storage account keys list \
  --account-name flamoralprodzcqqgc \
  --resource-group flamoral-prod-rg \
  --query "[0].value" \
  --output tsv
```

**Update Key Vault Secret (Automated):**
```bash
# Store connection string
STORAGE_CONN=$(az storage account show-connection-string \
  --name flamoralprodzcqqgc \
  --resource-group flamoral-prod-rg \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-infra-kv \
  --name azure-storage-connection-string \
  --value "$STORAGE_CONN" \
  --description "Azure Storage connection string (auto-retrieved)"

# Store primary key
STORAGE_KEY=$(az storage account keys list \
  --account-name flamoralprodzcqqgc \
  --resource-group flamoral-prod-rg \
  --query "[0].value" \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-infra-kv \
  --name azure-storage-key \
  --value "$STORAGE_KEY" \
  --description "Azure Storage primary key (auto-retrieved)"
```

**Verification:**
```bash
# Test storage access
az storage container list \
  --connection-string "$STORAGE_CONN" \
  --output table
```

**Key Rotation:**
```bash
# Regenerate key (use key2 while services use key1)
az storage account keys renew \
  --account-name flamoralprodzcqqgc \
  --resource-group flamoral-prod-rg \
  --key secondary

# After updating services, rotate primary
az storage account keys renew \
  --account-name flamoralprodzcqqgc \
  --resource-group flamoral-prod-rg \
  --key primary
```

---

### 2. Azure PostgreSQL Database

**Resource Name:** `flamoral-prod-postgres` (if exists)
**Resource Type:** Azure Database for PostgreSQL Flexible Server
**Purpose:** Primary application database

#### Auto-Retrievable Secrets

| Secret Type | Key Vault Secret Name | Notes |
|-------------|----------------------|-------|
| Connection String | `postgres-connection-string` | Requires admin password (set during creation) |
| Admin Password | N/A | Set during database creation, not retrievable |

#### Retrieval Commands

**Get Connection Info:**
```bash
# Get server FQDN
POSTGRES_HOST=$(az postgres flexible-server show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres \
  --query "fullyQualifiedDomainName" \
  --output tsv)

# Get admin username
POSTGRES_USER=$(az postgres flexible-server show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres \
  --query "administratorLogin" \
  --output tsv)

# Construct connection string (password must be known)
POSTGRES_PASSWORD="<your-admin-password>"
POSTGRES_CONN="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/flamoral?sslmode=require"

# Update Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-data-kv \
  --name postgres-connection-string \
  --value "$POSTGRES_CONN" \
  --description "PostgreSQL connection string"
```

**Note:** The admin password is set during database creation and cannot be retrieved. It must be:
1. Stored securely during initial setup
2. Or reset using: `az postgres flexible-server update --admin-password <new-password>`

---

### 3. Azure Redis Cache

**Resource Name:** `flamoral-prod-redis` (if exists)
**Resource Type:** Azure Cache for Redis
**Purpose:** Session storage, caching, real-time features

#### Auto-Retrievable Secrets

| Secret Type | Key Vault Secret Name | Azure CLI Command |
|-------------|----------------------|-------------------|
| Primary Key | `redis-password` | See below |
| Connection String | `redis-connection-string` | See below |

#### Retrieval Commands

**Get Primary Key:**
```bash
az redis list-keys \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-redis \
  --query "primaryKey" \
  --output tsv
```

**Get Connection String:**
```bash
# Get hostname
REDIS_HOST=$(az redis show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-redis \
  --query "hostName" \
  --output tsv)

# Get primary key
REDIS_KEY=$(az redis list-keys \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-redis \
  --query "primaryKey" \
  --output tsv)

# Get SSL port
REDIS_PORT=$(az redis show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-redis \
  --query "sslPort" \
  --output tsv)

# Construct connection string
REDIS_CONN="rediss://:${REDIS_KEY}@${REDIS_HOST}:${REDIS_PORT}/0"

# Update Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-data-kv \
  --name redis-password \
  --value "$REDIS_KEY" \
  --description "Redis primary key (auto-retrieved)"

az keyvault secret set \
  --vault-name flamoral-prod-data-kv \
  --name redis-connection-string \
  --value "$REDIS_CONN" \
  --description "Redis connection string (auto-retrieved)"
```

**Key Rotation:**
```bash
# Regenerate secondary key first
az redis regenerate-keys \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-redis \
  --key-type Secondary

# After updating services, regenerate primary
az redis regenerate-keys \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-redis \
  --key-type Primary
```

---

### 4. Azure Cosmos DB

**Resource Name:** `flamoral-prod-cosmos` (if exists)
**Resource Type:** Azure Cosmos DB (MongoDB API)
**Purpose:** NoSQL database for flexible data structures

#### Auto-Retrievable Secrets

| Secret Type | Key Vault Secret Name | Azure CLI Command |
|-------------|----------------------|-------------------|
| Primary Key | `cosmosdb-key` | See below |
| Connection String | `mongodb-uri` | See below |

#### Retrieval Commands

**Get Primary Key:**
```bash
az cosmosdb keys list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cosmos \
  --type keys \
  --query "primaryMasterKey" \
  --output tsv
```

**Get Connection String (MongoDB API):**
```bash
az cosmosdb keys list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cosmos \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

**Update Key Vault:**
```bash
# Get and store primary key
COSMOS_KEY=$(az cosmosdb keys list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cosmos \
  --type keys \
  --query "primaryMasterKey" \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-data-kv \
  --name cosmosdb-key \
  --value "$COSMOS_KEY" \
  --description "Cosmos DB primary master key (auto-retrieved)"

# Get and store connection string
COSMOS_CONN=$(az cosmosdb keys list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cosmos \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-data-kv \
  --name mongodb-uri \
  --value "$COSMOS_CONN" \
  --description "Cosmos DB MongoDB connection string (auto-retrieved)"
```

**Key Rotation:**
```bash
# Regenerate secondary key first
az cosmosdb keys regenerate \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cosmos \
  --key-kind secondaryMasterKey

# After updating services, regenerate primary
az cosmosdb keys regenerate \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-cosmos \
  --key-kind primaryMasterKey
```

---

### 5. Azure Application Insights

**Resource Name:** `flamoral-prod-insights` (if exists)
**Resource Type:** Application Insights
**Purpose:** Application monitoring, telemetry, logging

#### Auto-Retrievable Secrets

| Secret Type | Key Vault Secret Name | Azure CLI Command |
|-------------|----------------------|-------------------|
| Connection String | `application-insights-connection-string` | See below |
| Instrumentation Key | N/A | Legacy, connection string preferred |

#### Retrieval Commands

**Get Connection String:**
```bash
az monitor app-insights component show \
  --resource-group flamoral-prod-rg \
  --app flamoral-prod-insights \
  --query "connectionString" \
  --output tsv
```

**Update Key Vault:**
```bash
INSIGHTS_CONN=$(az monitor app-insights component show \
  --resource-group flamoral-prod-rg \
  --app flamoral-prod-insights \
  --query "connectionString" \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-infra-kv \
  --name application-insights-connection-string \
  --value "$INSIGHTS_CONN" \
  --description "Application Insights connection string (auto-retrieved)"
```

**Note:** Connection strings are regenerated when the Application Insights resource is recreated. No manual rotation needed.

---

### 6. Azure Service Bus

**Resource Name:** `flamoral-prod-servicebus` (if exists)
**Resource Type:** Service Bus Namespace
**Purpose:** Message queuing, event-driven architecture

#### Auto-Retrievable Secrets

| Secret Type | Key Vault Secret Name | Azure CLI Command |
|-------------|----------------------|-------------------|
| Connection String | `azure-service-bus-connection-string` | See below |

#### Retrieval Commands

**Get Primary Connection String:**
```bash
az servicebus namespace authorization-rule keys list \
  --resource-group flamoral-prod-rg \
  --namespace-name flamoral-prod-servicebus \
  --name RootManageSharedAccessKey \
  --query "primaryConnectionString" \
  --output tsv
```

**Update Key Vault:**
```bash
SERVICEBUS_CONN=$(az servicebus namespace authorization-rule keys list \
  --resource-group flamoral-prod-rg \
  --namespace-name flamoral-prod-servicebus \
  --name RootManageSharedAccessKey \
  --query "primaryConnectionString" \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-infra-kv \
  --name azure-service-bus-connection-string \
  --value "$SERVICEBUS_CONN" \
  --description "Service Bus connection string (auto-retrieved)"
```

**Key Rotation:**
```bash
# Regenerate secondary key first
az servicebus namespace authorization-rule keys renew \
  --resource-group flamoral-prod-rg \
  --namespace-name flamoral-prod-servicebus \
  --name RootManageSharedAccessKey \
  --key SecondaryKey

# After updating services, regenerate primary
az servicebus namespace authorization-rule keys renew \
  --resource-group flamoral-prod-rg \
  --namespace-name flamoral-prod-servicebus \
  --name RootManageSharedAccessKey \
  --key PrimaryKey
```

---

### 7. Azure Cognitive Services (Face API)

**Resource Name:** `flamoral-prod-face-api` (if exists)
**Resource Type:** Cognitive Services - Face
**Purpose:** Photo verification, face detection

#### Auto-Retrievable Secrets

| Secret Type | Key Vault Secret Name | Azure CLI Command |
|-------------|----------------------|-------------------|
| API Key | `azure-face-api-key` | See below |

#### Retrieval Commands

**Get Primary Key:**
```bash
az cognitiveservices account keys list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-face-api \
  --query "key1" \
  --output tsv
```

**Update Key Vault:**
```bash
FACE_API_KEY=$(az cognitiveservices account keys list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-face-api \
  --query "key1" \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-infra-kv \
  --name azure-face-api-key \
  --value "$FACE_API_KEY" \
  --description "Azure Face API key (auto-retrieved)"
```

**Key Rotation:**
```bash
# Regenerate key2 first
az cognitiveservices account keys regenerate \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-face-api \
  --key-name Key2

# After updating services, regenerate key1
az cognitiveservices account keys regenerate \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-face-api \
  --key-name Key1
```

---

### 8. Azure Content Moderator

**Resource Name:** `flamoral-prod-content-moderator` (if exists)
**Resource Type:** Cognitive Services - Content Moderator
**Purpose:** Content moderation for text, images, videos

#### Auto-Retrievable Secrets

| Secret Type | Key Vault Secret Name | Azure CLI Command |
|-------------|----------------------|-------------------|
| API Key | `azure-content-moderator-key` | See below |

#### Retrieval Commands

**Get Primary Key:**
```bash
az cognitiveservices account keys list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-content-moderator \
  --query "key1" \
  --output tsv
```

**Update Key Vault:**
```bash
MODERATOR_KEY=$(az cognitiveservices account keys list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-content-moderator \
  --query "key1" \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-infra-kv \
  --name azure-content-moderator-key \
  --value "$MODERATOR_KEY" \
  --description "Azure Content Moderator API key (auto-retrieved)"
```

---

## Automated Batch Retrieval Script

### All Azure Secrets in One Command

```bash
#!/bin/bash
# =============================================================================
# Auto-retrieve all Azure resource secrets
# =============================================================================

RESOURCE_GROUP="flamoral-prod-rg"

echo "Retrieving Azure secrets from resource group: $RESOURCE_GROUP"

# 1. Azure Storage
echo "1. Azure Storage..."
STORAGE_CONN=$(az storage account show-connection-string \
  --name flamoralprodzcqqgc \
  --resource-group $RESOURCE_GROUP \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-infra-kv \
  --name azure-storage-connection-string \
  --value "$STORAGE_CONN" \
  --output none

echo "✓ Azure Storage connection string updated"

# 2. Redis Cache (if exists)
if az redis show --resource-group $RESOURCE_GROUP --name flamoral-prod-redis &>/dev/null; then
    echo "2. Redis Cache..."
    REDIS_KEY=$(az redis list-keys \
      --resource-group $RESOURCE_GROUP \
      --name flamoral-prod-redis \
      --query "primaryKey" \
      --output tsv)

    az keyvault secret set \
      --vault-name flamoral-prod-data-kv \
      --name redis-password \
      --value "$REDIS_KEY" \
      --output none

    echo "✓ Redis password updated"
else
    echo "⊘ Redis Cache not found (skipping)"
fi

# 3. Cosmos DB (if exists)
if az cosmosdb show --resource-group $RESOURCE_GROUP --name flamoral-prod-cosmos &>/dev/null; then
    echo "3. Cosmos DB..."
    COSMOS_KEY=$(az cosmosdb keys list \
      --resource-group $RESOURCE_GROUP \
      --name flamoral-prod-cosmos \
      --type keys \
      --query "primaryMasterKey" \
      --output tsv)

    az keyvault secret set \
      --vault-name flamoral-prod-data-kv \
      --name cosmosdb-key \
      --value "$COSMOS_KEY" \
      --output none

    echo "✓ Cosmos DB key updated"
else
    echo "⊘ Cosmos DB not found (skipping)"
fi

# 4. Application Insights (if exists)
if az monitor app-insights component show --resource-group $RESOURCE_GROUP --app flamoral-prod-insights &>/dev/null; then
    echo "4. Application Insights..."
    INSIGHTS_CONN=$(az monitor app-insights component show \
      --resource-group $RESOURCE_GROUP \
      --app flamoral-prod-insights \
      --query "connectionString" \
      --output tsv)

    az keyvault secret set \
      --vault-name flamoral-prod-infra-kv \
      --name application-insights-connection-string \
      --value "$INSIGHTS_CONN" \
      --output none

    echo "✓ Application Insights connection string updated"
else
    echo "⊘ Application Insights not found (skipping)"
fi

# 5. Service Bus (if exists)
if az servicebus namespace show --resource-group $RESOURCE_GROUP --name flamoral-prod-servicebus &>/dev/null; then
    echo "5. Service Bus..."
    SERVICEBUS_CONN=$(az servicebus namespace authorization-rule keys list \
      --resource-group $RESOURCE_GROUP \
      --namespace-name flamoral-prod-servicebus \
      --name RootManageSharedAccessKey \
      --query "primaryConnectionString" \
      --output tsv)

    az keyvault secret set \
      --vault-name flamoral-prod-infra-kv \
      --name azure-service-bus-connection-string \
      --value "$SERVICEBUS_CONN" \
      --output none

    echo "✓ Service Bus connection string updated"
else
    echo "⊘ Service Bus not found (skipping)"
fi

echo ""
echo "✓ All Azure secrets updated successfully"
```

**Save as:** `scripts/auto-retrieve-azure-secrets.sh`

**Make executable:**
```bash
chmod +x scripts/auto-retrieve-azure-secrets.sh
```

**Run:**
```bash
./scripts/auto-retrieve-azure-secrets.sh
```

---

## Summary

### Auto-Retrievable Secrets Count

| Vault | Auto-Retrievable Secrets | Manual Secrets | Total |
|-------|-------------------------|----------------|-------|
| Data Vault | 4 (Postgres, Redis, Cosmos, MongoDB) | 0 | 4 |
| Infrastructure Vault | 5 (Storage, Insights, Service Bus, Face API, Moderator) | 0 | 5 |
| **Total Azure** | **9 secrets** | **0** | **9** |

### Third-Party Manual Secrets

| Vault | Manual Secrets Required |
|-------|------------------------|
| Payment Vault | 2 (Stripe) |
| External Vault | 6 (SendGrid, Twilio, Sentry, OpenAI, Firebase, Agora) |
| **Total Manual** | **8 secrets** |

### Key Rotation Strategy

**Azure Secrets:**
- All Azure services support dual-key rotation
- Rotate secondary key first
- Update applications to use secondary key
- Rotate primary key
- Switch back to primary key

**Recommended Rotation Schedule:**
- Storage keys: Every 90-180 days
- Cosmos DB keys: Every 180 days
- Cognitive Services keys: Every 180 days
- Application Insights: No rotation needed (auto-regenerated on resource recreation)

---

## Resource Verification

### Check All Azure Resources

```bash
# List all resources in the resource group
az resource list \
  --resource-group flamoral-prod-rg \
  --output table

# Check specific resource types
az storage account list --resource-group flamoral-prod-rg --output table
az redis list --resource-group flamoral-prod-rg --output table
az cosmosdb list --resource-group flamoral-prod-rg --output table
az postgres flexible-server list --resource-group flamoral-prod-rg --output table
```

---

**End of Document**
