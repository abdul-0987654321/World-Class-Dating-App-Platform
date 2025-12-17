# Flamoral Dating Platform - Environment Configuration Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Environment Setup](#environment-setup)
4. [Azure Key Vault Configuration](#azure-key-vault-configuration)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Docker Compose Deployment](#docker-compose-deployment)
7. [Configuration Validation](#configuration-validation)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Maintenance & Updates](#maintenance--updates)

---

## Overview

This guide covers the complete environment configuration and deployment process for the Flamoral Dating Platform across all environments (development, staging, and production).

### Key Components

- **Environment Templates**: `.env.{environment}.template` files
- **Kubernetes ConfigMaps**: Non-sensitive configuration
- **Kubernetes Secrets**: Sensitive credentials (via Azure Key Vault)
- **Docker Compose**: Alternative deployment for testing
- **Validation Scripts**: Automated configuration validation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Key Vault                          │
│  (Centralized Secret Management for Staging & Production)  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─────────────────────────────────────────┐
                 │                                         │
                 ▼                                         ▼
    ┌────────────────────────┐              ┌────────────────────────┐
    │   Kubernetes Secrets   │              │   Docker Containers    │
    │   (CSI Driver/ESO)     │              │  (.env files)          │
    └────────────┬───────────┘              └────────────┬───────────┘
                 │                                        │
                 ▼                                        ▼
    ┌────────────────────────┐              ┌────────────────────────┐
    │   ConfigMaps           │              │   Application          │
    │   (Non-sensitive)      │              │   Services             │
    └────────────┬───────────┘              └────────────────────────┘
                 │
                 ▼
    ┌────────────────────────┐
    │   Application Pods     │
    └────────────────────────┘
```

---

## Quick Start

### Development Environment (Local)

```bash
# 1. Copy environment template
cp infrastructure/config/.env.development.template infrastructure/config/.env.development

# 2. Update with your local values
nano infrastructure/config/.env.development

# 3. Start local infrastructure
docker-compose up -d

# 4. Validate configuration
./scripts/validate-env.sh development

# 5. Run migrations
npm run migrate

# 6. Start development server
npm run dev
```

### Staging Environment (Azure AKS)

```bash
# 1. Copy and configure staging environment
cp infrastructure/config/.env.staging.template infrastructure/config/.env.staging

# 2. Set up Azure Key Vault
./scripts/azure-keyvault-setup.sh staging

# 3. Sync secrets to Key Vault
./scripts/azure-keyvault-sync.sh staging

# 4. Validate configuration
./scripts/validate-env.sh staging

# 5. Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/configmaps/staging-configmap.yaml
kubectl apply -f infrastructure/kubernetes/secrets/staging-secrets.yaml
kubectl apply -f infrastructure/kubernetes/deployments/staging/
```

### Production Environment (Azure AKS)

```bash
# 1. Configure production environment
cp infrastructure/config/.env.production.template infrastructure/config/.env.production

# 2. Set up Azure Key Vault with production secrets
./scripts/azure-keyvault-setup.sh production

# 3. Sync secrets to Key Vault
./scripts/azure-keyvault-sync.sh production

# 4. Validate configuration (REQUIRED)
./scripts/validate-env.sh production

# 5. Deploy to production
kubectl apply -f infrastructure/kubernetes/configmaps/production-configmap.yaml
kubectl apply -f infrastructure/kubernetes/secrets/production-secrets.yaml
kubectl apply -f infrastructure/kubernetes/deployments/production/
```

---

## Environment Setup

### 1. Development Environment

**Purpose**: Local development with minimal external dependencies

**Configuration File**: `.env.development`

**Key Characteristics**:
- Use local Docker containers for databases (PostgreSQL, MongoDB, Redis)
- Use RabbitMQ instead of Azure Service Bus
- Use MinIO instead of Azure Storage
- Test credentials for external APIs
- Relaxed security settings for convenience
- Verbose logging for debugging

**Setup Steps**:

```bash
# 1. Create configuration
cp .env.development.template .env.development

# 2. Update local service URLs
# Most services run on localhost with different ports

# 3. Optional: Add test API keys
# - Stripe Test Keys
# - SendGrid Test Key
# - Twilio Test Credentials

# 4. Start local infrastructure
docker-compose up -d postgres redis mongodb rabbitmq minio

# 5. Verify connectivity
./scripts/validate-env.sh development --check-connectivity
```

### 2. Staging Environment

**Purpose**: Pre-production testing that mirrors production configuration

**Configuration File**: `.env.staging`

**Key Characteristics**:
- Uses Azure managed services (lower tier than production)
- Stripe TEST mode (no real payments)
- Similar structure to production
- Test data and sandbox credentials
- More permissive rate limits for testing

**Setup Steps**:

```bash
# 1. Provision Azure resources
cd infrastructure/terraform/environments/staging
terraform init
terraform plan
terraform apply

# 2. Create configuration
cp .env.staging.template .env.staging

# 3. Update with staging values
# - Database connection strings
# - Redis endpoints
# - Azure Service Bus connections
# - Test API credentials

# 4. Set up Key Vault
./scripts/azure-keyvault-setup.sh staging

# 5. Store secrets in Key Vault
./scripts/azure-keyvault-sync.sh staging

# 6. Validate
./scripts/validate-env.sh staging
```

### 3. Production Environment

**Purpose**: Live production deployment serving real users

**Configuration File**: `.env.production`

**Key Characteristics**:
- Azure Premium tier services
- Stripe LIVE mode (real payments)
- Maximum security settings
- Strict rate limiting
- Comprehensive monitoring
- High availability configuration

**Setup Steps**:

```bash
# 1. Provision production Azure resources
cd infrastructure/terraform/environments/production
terraform init
terraform plan
terraform apply

# 2. Create production configuration
cp .env.production.template .env.production

# 3. IMPORTANT: Use Azure Key Vault for ALL secrets
# Never store production secrets in files

# 4. Configure Azure Key Vault
./scripts/azure-keyvault-setup.sh production

# 5. Add secrets to Key Vault
./scripts/azure-keyvault-sync.sh production

# 6. Validate thoroughly
./scripts/validate-env.sh production

# 7. Security checklist (MANDATORY)
# - All secrets in Azure Key Vault ✓
# - SSL/TLS enabled ✓
# - CORS properly configured ✓
# - Rate limiting enabled ✓
# - Debug logging disabled ✓
# - API docs disabled ✓
```

---

## Azure Key Vault Configuration

### Why Azure Key Vault?

- **Centralized Secret Management**: Single source of truth for all secrets
- **Access Control**: Fine-grained RBAC permissions
- **Audit Logging**: Track all secret access
- **Automatic Rotation**: Support for automatic secret rotation
- **Integration**: Native Kubernetes integration via CSI Driver

### Setup Azure Key Vault

#### 1. Create Key Vault

```bash
# Set variables
ENVIRONMENT=production  # or staging
RESOURCE_GROUP=flamoral-${ENVIRONMENT}-rg
LOCATION=eastus
KEY_VAULT_NAME=flamoral-${ENVIRONMENT}-kv

# Create Key Vault
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization true

# Enable soft delete (enabled by default)
# Enable purge protection for production
if [ "$ENVIRONMENT" = "production" ]; then
  az keyvault update \
    --name $KEY_VAULT_NAME \
    --resource-group $RESOURCE_GROUP \
    --enable-purge-protection true
fi
```

#### 2. Configure Access Policies

```bash
# Get AKS managed identity
AKS_CLUSTER_NAME=flamoral-${ENVIRONMENT}-aks
MANAGED_IDENTITY=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --query identityProfile.kubeletidentity.clientId \
  --output tsv)

# Grant Key Vault access to AKS
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $MANAGED_IDENTITY \
  --scope $(az keyvault show --name $KEY_VAULT_NAME --query id --output tsv)
```

#### 3. Add Secrets to Key Vault

**Option 1: Using Azure CLI**

```bash
# Add secrets individually
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "DB-PASSWORD" \
  --value "your-secure-password"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "JWT-SECRET" \
  --value "$(openssl rand -base64 64 | tr -d '=+/' | cut -c1-64)"
```

**Option 2: Using Sync Script (Recommended)**

```bash
# The sync script reads from .env file and uploads to Key Vault
./scripts/azure-keyvault-sync.sh production
```

#### 4. Install CSI Driver on AKS

```bash
# Add Helm repository
helm repo add csi-secrets-store-provider-azure \
  https://azure.github.io/secrets-store-csi-driver-provider-azure/charts

# Install CSI driver
helm install csi-secrets-store-provider-azure \
  csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
  --namespace kube-system
```

---

## Kubernetes Deployment

### Architecture Overview

```
Kubernetes Cluster (AKS)
├── Namespace: flamoral-prod
│   ├── ConfigMaps (non-sensitive configuration)
│   ├── SecretProviderClass (Azure Key Vault integration)
│   ├── Deployments (application services)
│   ├── Services (internal networking)
│   ├── Ingress (external access)
│   └── HPA (horizontal pod autoscaler)
```

### 1. Create Namespace

```bash
ENVIRONMENT=production  # or staging, dev
NAMESPACE=flamoral-${ENVIRONMENT}

kubectl create namespace $NAMESPACE
kubectl label namespace $NAMESPACE environment=$ENVIRONMENT
```

### 2. Deploy ConfigMaps

ConfigMaps contain **non-sensitive** configuration that can be safely versioned.

```bash
# Deploy ConfigMap
kubectl apply -f infrastructure/kubernetes/configmaps/${ENVIRONMENT}-configmap.yaml

# Verify
kubectl get configmap -n $NAMESPACE
kubectl describe configmap flamoral-${ENVIRONMENT}-config -n $NAMESPACE
```

### 3. Deploy Secrets (via Azure Key Vault)

Secrets are **never** stored in Git. They are retrieved from Azure Key Vault.

#### Option A: CSI Driver (Recommended)

```bash
# 1. Deploy SecretProviderClass
kubectl apply -f infrastructure/kubernetes/secrets/${ENVIRONMENT}-secrets.yaml

# 2. Verify SecretProviderClass
kubectl get secretproviderclass -n $NAMESPACE

# 3. Secrets are automatically created when pods start
# The CSI driver mounts secrets from Key Vault
```

#### Option B: External Secrets Operator

```bash
# 1. Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace

# 2. Deploy SecretStore
kubectl apply -f infrastructure/kubernetes/secrets/${ENVIRONMENT}-secret-store.yaml

# 3. Deploy ExternalSecret
kubectl apply -f infrastructure/kubernetes/secrets/${ENVIRONMENT}-external-secret.yaml

# 4. Verify secrets are synced
kubectl get externalsecret -n $NAMESPACE
kubectl get secret flamoral-${ENVIRONMENT}-secrets -n $NAMESPACE
```

### 4. Deploy Application Services

```bash
# Deploy all services
kubectl apply -f infrastructure/kubernetes/deployments/${ENVIRONMENT}/

# Or deploy individual services
kubectl apply -f infrastructure/kubernetes/services/user-service.yaml
kubectl apply -f infrastructure/kubernetes/services/auth-service.yaml

# Verify deployments
kubectl get deployments -n $NAMESPACE
kubectl get pods -n $NAMESPACE
```

### 5. Configure Ingress

```bash
# Deploy ingress controller (if not already installed)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Deploy application ingress
kubectl apply -f infrastructure/kubernetes/ingress/ingress-nginx.yaml

# Verify
kubectl get ingress -n $NAMESPACE
```

### 6. Set up Monitoring

```bash
# Deploy Prometheus
kubectl apply -f infrastructure/monitoring/prometheus/prometheus-complete.yaml

# Deploy Grafana
kubectl apply -f infrastructure/monitoring/grafana/grafana-complete.yaml

# Deploy AlertManager
kubectl apply -f infrastructure/monitoring/alertmanager/alertmanager.yaml

# Verify
kubectl get pods -n monitoring
```

---

## Docker Compose Deployment

Docker Compose can be used for production-like testing, but **Kubernetes is recommended for actual production**.

### 1. Production Docker Compose

```bash
# Set required environment variables
export ACR_LOGIN_SERVER=flamoralacr8eq5eg.azurecr.io
export IMAGE_TAG=v1.0.0

# Log in to Azure Container Registry
az acr login --name flamoralacr8eq5eg

# Pull latest images
docker-compose -f infrastructure/docker/docker-compose.production.yml pull

# Start services
docker-compose -f infrastructure/docker/docker-compose.production.yml up -d

# View logs
docker-compose -f infrastructure/docker/docker-compose.production.yml logs -f

# Check health
docker-compose -f infrastructure/docker/docker-compose.production.yml ps
```

### 2. Monitoring

```bash
# Access monitoring dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/password from env)
# Jaeger: http://localhost:16686
```

---

## Configuration Validation

### Validation Script

The validation script checks for common configuration errors before deployment.

```bash
# Basic validation
./scripts/validate-env.sh production

# With connectivity tests
CHECK_CONNECTIVITY=true ./scripts/validate-env.sh production

# Validate specific service
./scripts/validate-env.sh production user-service
```

### What Gets Validated

- ✓ Required variables are set
- ✓ No placeholder values in production
- ✓ Secret length requirements met
- ✓ URL formats are valid
- ✓ Email formats are valid
- ✓ Port numbers are valid
- ✓ SSL/TLS enabled in production
- ✓ Debug logging disabled in production
- ✓ Stripe keys match environment (test/live)
- ✓ CORS configured correctly
- ✓ Security headers enabled
- ✓ Database connections (optional)

### Pre-Deployment Checklist

Before deploying to production, ensure:

```bash
# 1. Validate configuration
./scripts/validate-env.sh production
# Exit code 0 = passed, 1 = failed

# 2. Verify Azure Key Vault secrets
./scripts/verify-keyvault-secrets.sh production

# 3. Test database connections
./scripts/test-database-connection.sh production

# 4. Verify DNS configuration
./scripts/verify-dns-propagation.sh

# 5. Check SSL certificates
./scripts/verify-ssl-certificates.sh

# 6. Run smoke tests
npm run test:smoke:production
```

---

## Troubleshooting

### Common Issues

#### Issue: Secrets Not Loading

**Symptoms**:
- Pods fail to start
- Error: "secret not found"

**Solutions**:

```bash
# 1. Check SecretProviderClass
kubectl describe secretproviderclass flamoral-production-secrets -n flamoral-prod

# 2. Check pod events
kubectl describe pod <pod-name> -n flamoral-prod

# 3. Verify Key Vault access
az keyvault secret show --vault-name flamoral-prod-kv --name DB-PASSWORD

# 4. Check managed identity permissions
az role assignment list --assignee <managed-identity-id>
```

#### Issue: Database Connection Failures

**Symptoms**:
- Services can't connect to database
- Timeout errors

**Solutions**:

```bash
# 1. Test connectivity from pod
kubectl run -it --rm debug --image=postgres:14 -- bash
psql "postgresql://user:pass@host:5432/db"

# 2. Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres

# 3. Verify connection string format
# Should include ?ssl=true for Azure PostgreSQL

# 4. Check DNS resolution
kubectl run -it --rm debug --image=busybox -- nslookup <db-host>
```

#### Issue: Configuration Not Updated

**Symptoms**:
- Changes to ConfigMap not reflected in pods

**Solutions**:

```bash
# 1. Update ConfigMap
kubectl apply -f infrastructure/kubernetes/configmaps/production-configmap.yaml

# 2. Restart pods to pick up changes
kubectl rollout restart deployment -n flamoral-prod

# 3. Verify ConfigMap is updated
kubectl get configmap flamoral-production-config -n flamoral-prod -o yaml

# 4. Check pod environment
kubectl exec <pod-name> -n flamoral-prod -- env | grep <VARIABLE>
```

---

## Best Practices

### Secret Management

1. **Never Commit Secrets**
   - Add `.env*` to `.gitignore` (except `.env.*.template`)
   - Use Git pre-commit hooks to prevent accidents
   - Regular secret scanning with tools like git-secrets

2. **Use Azure Key Vault**
   - All staging and production secrets in Key Vault
   - Enable soft delete and purge protection in production
   - Regular access audits

3. **Rotate Secrets Regularly**
   ```bash
   # Automated rotation
   ./scripts/azure-keyvault-rotate.sh production
   ```

4. **Principle of Least Privilege**
   - Separate Key Vaults per environment
   - Fine-grained RBAC permissions
   - Service-specific managed identities

### Configuration Management

1. **Environment Parity**
   - Staging mirrors production configuration
   - Test configuration changes in staging first
   - Use identical deployment processes

2. **Version Control**
   - Tag configuration changes
   - Document changes in commit messages
   - Require PR reviews for production configs

3. **Validation**
   - Always run validation before deployment
   - Automated validation in CI/CD pipeline
   - Manual verification for production

### Deployment

1. **Blue-Green Deployments**
   ```bash
   # Deploy to green environment
   kubectl apply -f infrastructure/kubernetes/deployments/blue-green-deployment-config.yaml

   # Switch traffic
   kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"green"}}}'
   ```

2. **Canary Releases**
   - Test with 10% traffic first
   - Monitor metrics closely
   - Gradual rollout

3. **Rollback Plan**
   ```bash
   # Rollback deployment
   kubectl rollout undo deployment/<deployment-name> -n flamoral-prod

   # Check rollout status
   kubectl rollout status deployment/<deployment-name> -n flamoral-prod
   ```

---

## Maintenance & Updates

### Regular Tasks

#### Weekly
- Review application logs for errors
- Check resource utilization
- Verify backup completion

#### Monthly
- Rotate service API keys
- Review and update dependencies
- Security scan of container images
- Review Key Vault access logs

#### Quarterly
- Rotate JWT secrets
- Update SSL certificates (if not auto-renewing)
- Review and update security policies
- Disaster recovery drill

### Updating Configuration

```bash
# 1. Update configuration file
nano infrastructure/config/.env.production

# 2. Sync to Key Vault
./scripts/azure-keyvault-sync.sh production

# 3. Update ConfigMap
kubectl apply -f infrastructure/kubernetes/configmaps/production-configmap.yaml

# 4. Rolling restart (zero-downtime)
kubectl rollout restart deployment -n flamoral-prod

# 5. Verify deployment
kubectl rollout status deployment/<service-name> -n flamoral-prod
```

### Monitoring Updates

Set up alerts for:
- Pod restart frequency
- High error rates
- Secret expiration warnings
- SSL certificate expiration
- Resource quota exceeded

---

## Additional Resources

- [Environment Variables Documentation](./ENVIRONMENT_VARIABLES.md)
- [Azure Key Vault Setup Script](../../scripts/azure-keyvault-setup.sh)
- [Secret Rotation Script](../../scripts/azure-keyvault-rotate.sh)
- [Kubernetes Manifests](../kubernetes/)
- [Monitoring Configuration](../monitoring/)

---

## Support

For issues or questions:
- **DevOps Team**: devops@flamoral.com
- **On-Call**: oncall@flamoral.com
- **Slack**: #infrastructure-support

---

**Last Updated**: 2025-12-11
**Version**: 1.0.0
**Maintained By**: DevOps Team
