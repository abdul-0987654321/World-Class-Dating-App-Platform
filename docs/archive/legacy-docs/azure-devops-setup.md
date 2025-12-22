# Azure DevOps Variable Groups Setup Guide

## Overview

This document describes the Azure DevOps Variable Groups required for the Flamoral Dating Platform CI/CD pipelines. Variable Groups are used to store configuration values and secrets that are shared across multiple pipelines.

## Table of Contents

- [Variable Groups Structure](#variable-groups-structure)
- [Common Variables (All Environments)](#common-variables-all-environments)
- [Development Environment Variables](#development-environment-variables)
- [Test Environment Variables](#test-environment-variables)
- [Production Environment Variables](#production-environment-variables)
- [Terraform Variables](#terraform-variables)
- [Secrets Management](#secrets-management)
- [Setup Instructions](#setup-instructions)
- [Automation Script](#automation-script)

---

## Variable Groups Structure

The Flamoral platform uses the following Variable Groups:

| Variable Group Name | Purpose | Environments |
|---------------------|---------|--------------|
| `datingplatform-dev` | Development environment configuration | Dev |
| `datingplatform-test` | Test/Staging environment configuration | Test |
| `datingplatform-prod` | Production environment configuration | Production |
| `flamoral-shared-vars` | Shared variables across all environments | All |
| `flamoral-cd-vars` | Continuous Deployment specific variables | All |
| `datingplatform-terraform-common` | Terraform backend and Azure authentication | All |

---

## Common Variables (All Environments)

### Variable Group: `flamoral-shared-vars`

These variables are shared across all environments and pipelines.

| Variable Name | Description | Example Value | Secret |
|---------------|-------------|---------------|--------|
| `nodeVersion` | Node.js version for builds | `20.x` | No |
| `goVersion` | Go version for builds | `1.21` | No |
| `pythonVersion` | Python version for builds | `3.x` | No |
| `terraformVersion` | Terraform version | `1.6.0` | No |
| `helmVersion` | Helm version | `3.12.0` | No |
| `vmImageName` | Azure DevOps agent image | `ubuntu-latest` | No |
| `acrName` | Azure Container Registry name | `flamoralacr8eq5eg` | No |
| `acrLoginServer` | ACR login server URL | `flamoralacr8eq5eg.azurecr.io` | No |
| `imagePrefix` | Container image prefix | `flamoral` | No |
| `tfStateResourceGroup` | Terraform state resource group | `flamoral-terraform-state-rg` | No |
| `tfStateStorageAccount` | Terraform state storage account | `flamoraltfstate` | No |
| `tfStateContainer` | Terraform state container name | `tfstate` | No |

### Variable Group: `flamoral-cd-vars`

Continuous Deployment configuration variables.

| Variable Name | Description | Example Value | Secret |
|---------------|-------------|---------------|--------|
| `azureServiceConnection` | Azure Resource Manager service connection name | `azure-terraform-sp-connection` | No |
| `dockerRegistryServiceConnection` | ACR service connection name | `acr-datingapp-connection` | No |
| `kubernetesServiceConnection` | AKS service connection name | `aks-flamoral-connection` | No |

---

## Development Environment Variables

### Variable Group: `datingplatform-dev`

| Variable Name | Description | Example Value | Secret |
|---------------|-------------|---------------|--------|
| `environment` | Environment identifier | `dev` | No |
| `namespace` | Kubernetes namespace | `flamoral-dev` | No |
| `ingressHost` | Development domain | `dev.flamoral.app` | No |
| `apiHost` | API domain | `api.dev.flamoral.app` | No |
| `replicaCount` | Number of pod replicas | `1` | No |
| `autoscalingEnabled` | Enable autoscaling | `false` | No |
| `keyVaultName` | Azure Key Vault name | `flamoral-dev-kv` | No |
| `aksClusterName` | AKS cluster name | `flamoral-dev-aks` | No |
| `resourceGroup` | Azure resource group | `flamoral-dev-rg` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `MONGODB_URI` | MongoDB connection string | `mongodb://host:27017/flamoral-dev` | Yes |
| `REDIS_URL` | Redis connection string | `redis://:password@host:6379` | Yes |
| `REDIS_HOST` | Redis hostname | `flamoral-dev-redis.redis.cache.windows.net` | No |
| `REDIS_PASSWORD` | Redis password | `***` | Yes |
| `JWT_ACCESS_SECRET` | JWT access token secret (min 64 chars) | `***` | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (min 64 chars) | `***` | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_***` | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_***` | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_***` | Yes |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.***` | Yes |
| `SENDGRID_FROM_EMAIL` | SendGrid from email | `dev@flamoral.com` | No |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `AC***` | No |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `***` | Yes |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | `+1234567890` | No |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service SID | `VA***` | No |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection string | `DefaultEndpointsProtocol=https;...` | Yes |
| `AZURE_STORAGE_ACCOUNT` | Azure Storage account name | `flamoraldevst` | No |
| `AZURE_STORAGE_KEY` | Azure Storage account key | `***` | Yes |
| `AZURE_FACE_API_KEY` | Azure Face API key | `***` | Yes |
| `AZURE_FACE_API_ENDPOINT` | Azure Face API endpoint | `https://eastus.api.cognitive.microsoft.com` | No |
| `AGORA_APP_ID` | Agora video calling app ID | `***` | No |
| `AGORA_APP_CERTIFICATE` | Agora app certificate | `***` | Yes |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://***@sentry.io/***` | Yes |
| `SENTRY_ENVIRONMENT` | Sentry environment name | `development` | No |
| `ACR_USERNAME` | Azure Container Registry username | `flamoralacr8eq5eg` | No |
| `ACR_PASSWORD` | Azure Container Registry password | `***` | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173,https://dev.flamoral.app` | No |
| `NODE_ENV` | Node environment | `development` | No |
| `LOG_LEVEL` | Logging level | `debug` | No |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://user:pass@host:5672` | Yes |

---

## Test Environment Variables

### Variable Group: `datingplatform-test`

| Variable Name | Description | Example Value | Secret |
|---------------|-------------|---------------|--------|
| `environment` | Environment identifier | `test` | No |
| `namespace` | Kubernetes namespace | `flamoral-test` | No |
| `ingressHost` | Test domain | `test.flamoral.app` | No |
| `apiHost` | API domain | `api.test.flamoral.app` | No |
| `replicaCount` | Number of pod replicas | `2` | No |
| `autoscalingEnabled` | Enable autoscaling | `true` | No |
| `autoscalingMinReplicas` | Minimum replicas | `2` | No |
| `autoscalingMaxReplicas` | Maximum replicas | `5` | No |
| `keyVaultName` | Azure Key Vault name | `flamoral-test-kv` | No |
| `aksClusterName` | AKS cluster name | `flamoral-test-aks` | No |
| `resourceGroup` | Azure resource group | `flamoral-test-rg` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `MONGODB_URI` | MongoDB connection string | `mongodb://host:27017/flamoral-test` | Yes |
| `REDIS_URL` | Redis connection string | `redis://:password@host:6379` | Yes |
| `REDIS_HOST` | Redis hostname | `flamoral-test-redis.redis.cache.windows.net` | No |
| `REDIS_PASSWORD` | Redis password | `***` | Yes |
| `JWT_ACCESS_SECRET` | JWT access token secret (min 64 chars) | `***` | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (min 64 chars) | `***` | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_***` | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_***` | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_***` | Yes |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.***` | Yes |
| `SENDGRID_FROM_EMAIL` | SendGrid from email | `test@flamoral.com` | No |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `AC***` | No |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `***` | Yes |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | `+1234567890` | No |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service SID | `VA***` | No |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection string | `DefaultEndpointsProtocol=https;...` | Yes |
| `AZURE_STORAGE_ACCOUNT` | Azure Storage account name | `flamoraltestst` | No |
| `AZURE_STORAGE_KEY` | Azure Storage account key | `***` | Yes |
| `AZURE_FACE_API_KEY` | Azure Face API key | `***` | Yes |
| `AZURE_FACE_API_ENDPOINT` | Azure Face API endpoint | `https://eastus.api.cognitive.microsoft.com` | No |
| `AGORA_APP_ID` | Agora video calling app ID | `***` | No |
| `AGORA_APP_CERTIFICATE` | Agora app certificate | `***` | Yes |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://***@sentry.io/***` | Yes |
| `SENTRY_ENVIRONMENT` | Sentry environment name | `test` | No |
| `ACR_USERNAME` | Azure Container Registry username | `flamoralacr8eq5eg` | No |
| `ACR_PASSWORD` | Azure Container Registry password | `***` | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | `https://test.flamoral.app` | No |
| `NODE_ENV` | Node environment | `production` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://user:pass@host:5672` | Yes |

---

## Production Environment Variables

### Variable Group: `datingplatform-prod`

| Variable Name | Description | Example Value | Secret |
|---------------|-------------|---------------|--------|
| `environment` | Environment identifier | `production` | No |
| `namespace` | Kubernetes namespace | `flamoral-prod` | No |
| `ingressHost` | Production domain | `flamoral.app` | No |
| `apiHost` | API domain | `api.flamoral.app` | No |
| `replicaCount` | Number of pod replicas | `5` | No |
| `autoscalingEnabled` | Enable autoscaling | `true` | No |
| `autoscalingMinReplicas` | Minimum replicas | `5` | No |
| `autoscalingMaxReplicas` | Maximum replicas | `50` | No |
| `targetCPUUtilization` | CPU target for autoscaling | `70` | No |
| `resourceRequestMemory` | Memory request | `1Gi` | No |
| `resourceRequestCpu` | CPU request | `1000m` | No |
| `resourceLimitMemory` | Memory limit | `2Gi` | No |
| `resourceLimitCpu` | CPU limit | `2000m` | No |
| `keyVaultName` | Azure Key Vault name | `flamoral-prod-kv` | No |
| `aksClusterName` | AKS cluster name | `flamoral-prod-aks` | No |
| `resourceGroup` | Azure resource group | `flamoral-prod-rg` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `MONGODB_URI` | MongoDB connection string | `mongodb://host:27017/flamoral-prod` | Yes |
| `REDIS_URL` | Redis connection string | `redis://:password@host:6379` | Yes |
| `REDIS_HOST` | Redis hostname | `flamoral-prod-redis.redis.cache.windows.net` | No |
| `REDIS_PASSWORD` | Redis password | `***` | Yes |
| `JWT_ACCESS_SECRET` | JWT access token secret (min 64 chars) | `***` | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (min 64 chars) | `***` | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key (LIVE) | `sk_live_***` | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (LIVE) | `pk_live_***` | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_***` | Yes |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.***` | Yes |
| `SENDGRID_FROM_EMAIL` | SendGrid from email | `noreply@flamoral.com` | No |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `AC***` | No |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `***` | Yes |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | `+1234567890` | No |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service SID | `VA***` | No |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection string | `DefaultEndpointsProtocol=https;...` | Yes |
| `AZURE_STORAGE_ACCOUNT` | Azure Storage account name | `flamoralprodst` | No |
| `AZURE_STORAGE_KEY` | Azure Storage account key | `***` | Yes |
| `AZURE_FACE_API_KEY` | Azure Face API key | `***` | Yes |
| `AZURE_FACE_API_ENDPOINT` | Azure Face API endpoint | `https://eastus.api.cognitive.microsoft.com` | No |
| `AGORA_APP_ID` | Agora video calling app ID | `***` | No |
| `AGORA_APP_CERTIFICATE` | Agora app certificate | `***` | Yes |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://***@sentry.io/***` | Yes |
| `SENTRY_ENVIRONMENT` | Sentry environment name | `production` | No |
| `ACR_USERNAME` | Azure Container Registry username | `flamoralacr8eq5eg` | No |
| `ACR_PASSWORD` | Azure Container Registry password | `***` | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | `https://flamoral.app,https://www.flamoral.app` | No |
| `NODE_ENV` | Node environment | `production` | No |
| `LOG_LEVEL` | Logging level | `warn` | No |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://user:pass@host:5672` | Yes |

---

## Terraform Variables

### Variable Group: `datingplatform-terraform-common`

These variables are used by the Infrastructure Pipeline for Terraform deployments.

| Variable Name | Description | Example Value | Secret |
|---------------|-------------|---------------|--------|
| `ARM_CLIENT_ID` | Azure Service Principal client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Yes |
| `ARM_CLIENT_SECRET` | Azure Service Principal client secret | `***` | Yes |
| `ARM_SUBSCRIPTION_ID` | Azure subscription ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Yes |
| `ARM_TENANT_ID` | Azure tenant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Yes |

---

## Secrets Management

### Azure Key Vault Integration

For production and test environments, it's recommended to integrate Variable Groups with Azure Key Vault for enhanced security.

#### Step 1: Link Variable Group to Azure Key Vault

1. Navigate to Azure DevOps → Pipelines → Library
2. Select or create a Variable Group
3. Click "Link secrets from an Azure key vault as variables"
4. Select your Azure subscription
5. Select your Key Vault (e.g., `flamoral-prod-kv`)
6. Authorize the connection
7. Add secrets as variables

#### Step 2: Store Secrets in Azure Key Vault

Use Azure CLI to add secrets:

```bash
# Example: Add JWT secret
az keyvault secret set --vault-name flamoral-prod-kv --name JWT-ACCESS-SECRET --value "your-secret-here"

# Example: Add database password
az keyvault secret set --vault-name flamoral-prod-kv --name DATABASE-PASSWORD --value "your-password-here"

# Example: Add Stripe secret
az keyvault secret set --vault-name flamoral-prod-kv --name STRIPE-SECRET-KEY --value "sk_live_..."
```

### Variables That MUST Be Marked as Secrets

Always mark these variable types as secrets:

- **Passwords**: Database passwords, Redis passwords, RabbitMQ passwords
- **API Keys**: Stripe, SendGrid, Twilio, Azure services, Agora
- **Tokens**: JWT secrets, auth tokens
- **Connection Strings**: Full connection strings containing credentials
- **Certificates**: SSL/TLS certificates, app certificates
- **Service Principal Credentials**: ARM_CLIENT_SECRET
- **Container Registry Credentials**: ACR_PASSWORD
- **Webhook Secrets**: Stripe webhook secret, GitHub webhook secret

### Non-Secret Variables

These can be stored as plain text:

- Environment names
- Hostnames and domains
- Port numbers
- Non-sensitive IDs (Account SIDs, App IDs)
- Resource group names
- Replica counts
- Feature flags (boolean values)

---

## Setup Instructions

### Method 1: Manual Setup via Azure DevOps Portal

1. **Navigate to Library**
   - Go to Azure DevOps → Your Project → Pipelines → Library

2. **Create Variable Group**
   - Click "+ Variable group"
   - Enter the group name (e.g., `datingplatform-dev`)
   - Add description: "Development environment variables for Flamoral Dating Platform"

3. **Add Variables**
   - Click "+ Add" to add each variable
   - For secrets, click the lock icon to mark as secret
   - Fill in all variables from the tables above

4. **Set Permissions**
   - Click "Pipeline permissions" tab
   - Add pipelines that should have access:
     - `Flamoral-CI-Pipeline`
     - `Flamoral-CD-Pipeline`
     - `Infrastructure-Pipeline`

5. **Save**
   - Click "Save" to persist the variable group

### Method 2: Automated Setup via PowerShell Script

Use the provided PowerShell script at `scripts/setup-variable-groups.ps1`:

```powershell
# Basic usage
.\scripts\setup-variable-groups.ps1 -PAT "your-azure-devops-pat-token"

# Create specific environment
.\scripts\setup-variable-groups.ps1 -PAT "your-pat" -Environment "dev"

# Create all environments
.\scripts\setup-variable-groups.ps1 -PAT "your-pat" -Environment "all"
```

See [Automation Script](#automation-script) section for more details.

---

## Automation Script

The PowerShell script `scripts/setup-variable-groups.ps1` automates the creation of Variable Groups using the Azure DevOps REST API.

### Prerequisites

- Azure DevOps Personal Access Token (PAT) with Variable Groups (Read, Create, & Manage) permission
- PowerShell 5.1 or higher
- Organization and Project names configured in the script

### Script Features

- Creates all required Variable Groups
- Sets up common (non-secret) variables with default values
- Marks sensitive variables as secrets (you must set the values manually)
- Validates Azure DevOps connection
- Idempotent (safe to run multiple times)

### Usage

```powershell
# View help
Get-Help .\scripts\setup-variable-groups.ps1 -Detailed

# Create all variable groups
.\scripts\setup-variable-groups.ps1 -PAT "your-pat-token"

# Create specific environment
.\scripts\setup-variable-groups.ps1 -PAT "your-pat-token" -Environment "prod"

# Specify custom organization and project
.\scripts\setup-variable-groups.ps1 `
    -PAT "your-pat-token" `
    -Organization "citadelcloudmanagement" `
    -Project "DatingPlatform"
```

### Post-Script Actions

After running the script, you must manually:

1. Add secret values via Azure DevOps Portal (script creates placeholders)
2. Link Production/Test groups to Azure Key Vault
3. Set pipeline permissions for each Variable Group
4. Verify all variables are correctly configured

---

## Environment-Specific .env Files

For local development and documentation, environment-specific `.env.example` files are provided:

- `.env.dev.example` - Development environment template
- `.env.test.example` - Test environment template
- `.env.prod.example` - Production environment template

These files mirror the Variable Group structure and can be used to:
- Set up local development environments
- Document required environment variables
- Validate pipeline configurations
- Bootstrap new environments

---

## Validation Checklist

Before deploying, verify:

- [ ] All Variable Groups are created
- [ ] All secret variables are marked with lock icon
- [ ] Production uses Azure Key Vault integration
- [ ] Pipeline permissions are set for each group
- [ ] Connection strings are valid and tested
- [ ] API keys are for correct environment (test vs live)
- [ ] JWT secrets are minimum 64 characters
- [ ] Database credentials match actual resources
- [ ] Redis connection strings are correct
- [ ] CORS origins match actual domains
- [ ] Terraform ARM credentials are valid
- [ ] ACR credentials are correct
- [ ] All service-specific keys are configured (Stripe, Twilio, etc.)

---

## Troubleshooting

### Pipeline Cannot Access Variable Group

**Problem**: Pipeline fails with "Variable group 'xxx' could not be found"

**Solution**:
1. Go to Variable Group → Pipeline permissions
2. Add the pipeline to the access list
3. Save and re-run the pipeline

### Variable Not Available in Pipeline

**Problem**: Variable shows as empty in pipeline logs

**Solution**:
1. Check variable name matches exactly (case-sensitive)
2. Verify Variable Group is linked to pipeline stage
3. Check if variable is in correct group for environment
4. Verify service connection if using Key Vault

### Secret Variables Not Working

**Problem**: Secret variables are empty or show as asterisks

**Solution**:
1. Secret values are masked in logs (expected behavior)
2. Use `env:` section in pipeline to pass secrets to scripts
3. For Key Vault secrets, verify Key Vault permissions
4. Check Azure Service Connection has access to Key Vault

### Azure Key Vault Integration Issues

**Problem**: "Could not fetch secrets from Azure Key Vault"

**Solution**:
1. Verify Service Connection is authorized
2. Check Key Vault access policies include Azure DevOps service principal
3. Ensure secret names in Key Vault match variable names
4. Verify Azure subscription is active

---

## Best Practices

1. **Secrets Management**
   - Never commit secrets to source control
   - Use Azure Key Vault for production secrets
   - Rotate secrets regularly
   - Use different secrets for each environment

2. **Variable Naming**
   - Use UPPER_SNAKE_CASE for environment variables
   - Use descriptive names
   - Prefix with service name when applicable (e.g., `STRIPE_SECRET_KEY`)

3. **Environment Separation**
   - Keep dev/test/prod variables completely separate
   - Never share secrets between environments
   - Use test API keys in non-production environments

4. **Documentation**
   - Document all variables in this file
   - Update when adding new variables
   - Include example values (non-sensitive)
   - Specify which variables are required vs optional

5. **Access Control**
   - Limit Variable Group access to necessary pipelines
   - Use Azure Key Vault for production secrets
   - Regularly audit access permissions
   - Remove access for deprecated pipelines

6. **Validation**
   - Test variable groups in dev before using in production
   - Validate connection strings before deploying
   - Verify API keys are for correct environment
   - Check variable references in pipeline YAML match exactly

---

## Additional Resources

- [Azure DevOps Variable Groups Documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)
- [Azure Key Vault Integration](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops&tabs=yaml#link-secrets-from-an-azure-key-vault)
- [Azure DevOps REST API - Variable Groups](https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/variablegroups)
- [Flamoral Infrastructure Pipeline](../pipelines/infrastructure-pipeline.yml)
- [Flamoral CI Pipeline](../pipelines/ci-pipeline.yml)
- [Flamoral CD Pipeline](../pipelines/cd-pipeline.yml)

---

## Support

For questions or issues related to Variable Groups setup, contact:

- DevOps Team: devops@flamoral.com
- Azure Administrator: azure-admin@flamoral.com
- Technical Lead: tech-lead@flamoral.com

---

*Last Updated: 2025-12-07*
*Version: 1.0.0*
