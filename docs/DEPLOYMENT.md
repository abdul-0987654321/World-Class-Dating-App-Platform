# Flamoral Dating Platform - Deployment Guide

## Overview

This guide covers deploying the Flamoral dating platform across three environments:
- **Dev**: Development environment with minimal resources, internal access only
- **Test**: Staging environment for QA, internal access only
- **Prod**: Production environment with public access via flamoral.com

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Azure Infrastructure                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Dev (Dating-  │  │      Test       │  │         Production          │ │
│  │     dev-rg)     │  │  (flamoral-     │  │    (flamoral-prod-rg)       │ │
│  │                 │  │   test-rg)      │  │                             │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────────────────┐ │ │
│  │ │ AKS Cluster │ │  │ │ AKS Cluster │ │  │ │     AKS Cluster         │ │ │
│  │ │ (Private)   │ │  │ │ (Private)   │ │  │ │     (Public)            │ │ │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └───────────┬─────────────┘ │ │
│  │                 │  │                 │  │             │               │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌───────────▼─────────────┐ │ │
│  │ │  Internal   │ │  │ │  Internal   │ │  │ │    Azure Front Door     │ │ │
│  │ │     LB      │ │  │ │     LB      │ │  │ │    (WAF + CDN)          │ │ │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └───────────┬─────────────┘ │ │
│  │                 │  │                 │  │             │               │ │
│  └─────────────────┘  └─────────────────┘  │ ┌───────────▼─────────────┐ │ │
│                                             │ │      flamoral.com       │ │ │
│                                             │ │   (Azure DNS Zone)      │ │ │
│                                             │ └─────────────────────────┘ │ │
│                                             └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Shared Resources (flamoral-shared-rg)           │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                         │   │
│  │  │ Azure Container  │  │   Terraform      │                         │   │
│  │  │    Registry      │  │  State Storage   │                         │   │
│  │  └──────────────────┘  └──────────────────┘                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Azure Subscription Setup

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "ba233460-2dbe-4603-a594-68f93ec9deb3"

# Register required providers
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.ContainerService
az provider register --namespace Microsoft.Cdn
az provider register --namespace Microsoft.SignalRService
```

### 2. Create Service Principal

```bash
# Create service principal for Terraform
az ad sp create-for-rbac \
  --name "terraform-datingapp-sp" \
  --role "Contributor" \
  --scopes "/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3"

# Note down the output:
# - appId (Client ID): a85e4029-4e37-4399-9390-6e18922b38e7
# - password (Client Secret): <save securely>
# - tenant
```

### 3. Create Terraform State Storage

```bash
# Create resource group for state
az group create --name flamoral-tfstate-rg --location westus2

# Create storage account
az storage account create \
  --name flamoraltfstate \
  --resource-group flamoral-tfstate-rg \
  --location westus2 \
  --sku Standard_LRS

# Create container
az storage container create \
  --name tfstate \
  --account-name flamoraltfstate
```

### 4. Set Up GitHub Secrets

Add these secrets to your GitHub repository:

| Secret Name | Description |
|-------------|-------------|
| `AZURE_CLIENT_ID` | Service Principal Client ID |
| `AZURE_TENANT_ID` | Azure AD Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID |
| `ACR_NAME` | Azure Container Registry name |
| `ACR_LOGIN_SERVER` | ACR login server URL |
| `ACR_USERNAME` | ACR admin username |
| `ACR_PASSWORD` | ACR admin password |

## Deployment Steps

### Phase 1: Deploy Shared Infrastructure

```bash
cd infrastructure/terraform/modules/acr

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply
terraform apply tfplan
```

### Phase 2: Deploy Dev Environment

```bash
cd infrastructure/terraform/environments/dating-dev

# Set environment variables
export ARM_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
export ARM_CLIENT_SECRET="<your-secret>"
export ARM_TENANT_ID="<your-tenant-id>"
export ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"

# Initialize
terraform init

# Plan
terraform plan -var-file=terraform.tfvars -out=tfplan

# Apply
terraform apply tfplan
```

### Phase 3: Deploy Test Environment

```bash
cd infrastructure/terraform/environments/test

terraform init
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform apply tfplan
```

### Phase 4: Deploy Production Environment

```bash
cd infrastructure/terraform/environments/prod

terraform init
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform apply tfplan
```

## GoDaddy DNS Configuration

After deploying production, configure your GoDaddy domain:

### Option 1: Use Azure DNS (Recommended)

1. Get Azure DNS nameservers from Terraform output:
   ```bash
   terraform output dns_zone_name_servers
   ```

2. In GoDaddy:
   - Go to Domain Settings → DNS
   - Click "Change" under Nameservers
   - Select "Enter my own nameservers"
   - Enter the Azure DNS nameservers
   - Save

### Option 2: Point Records Directly

Create these records in GoDaddy:

| Type | Name | Value |
|------|------|-------|
| A | @ | `<ingress_public_ip>` |
| A | www | `<ingress_public_ip>` |
| A | api | `<ingress_public_ip>` |
| CNAME | cdn | `<cdn_endpoint_fqdn>` |

## CI/CD Pipelines

### Branch Strategy

| Branch | Environment | Access |
|--------|-------------|--------|
| `dev` | Dev | Internal only |
| `test` | Test | Internal only |
| `main` | Production | Public (flamoral.com) |

### Automatic Deployments

Pushes to each branch trigger automatic deployments:

```yaml
# dev branch → deploy-dev.yml → Dev AKS
# test branch → deploy-test.yml → Test AKS
# main branch → deploy-prod.yml → Prod AKS (with approval)
```

### Manual Deployment

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks

# Deploy with Helm
helm upgrade --install flamoral-prod ./k8s/helm/flamoral \
  --namespace flamoral-prod \
  --values ./k8s/helm/flamoral/values-prod.yaml \
  --set global.image.tag=<version>
```

## SSL Certificates

### Let's Encrypt (Automatic)

Production uses cert-manager with Let's Encrypt:

```yaml
# Ingress annotation
cert-manager.io/cluster-issuer: letsencrypt-prod
```

### Manual Certificate (Azure Key Vault)

```bash
# Upload certificate to Key Vault
az keyvault certificate import \
  --vault-name flamoral-prod-kv \
  --name tls-cert \
  --file certificate.pfx
```

## Monitoring & Logging

### Application Insights

Access via Azure Portal:
- Dev: `flamoral-dev-appinsights`
- Test: `flamoral-test-appinsights`
- Prod: `flamoral-prod-appinsights`

### Log Analytics

Query logs:
```kusto
ContainerLog
| where ContainerName contains "flamoral"
| where TimeGenerated > ago(1h)
| project TimeGenerated, ContainerName, LogEntry
| order by TimeGenerated desc
```

### Kubernetes Dashboard

```bash
# Port-forward to dashboard
kubectl port-forward svc/kubernetes-dashboard -n kubernetes-dashboard 8443:443
```

## Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod <pod-name> -n flamoral-prod
   kubectl logs <pod-name> -n flamoral-prod
   ```

2. **Ingress not working**
   ```bash
   kubectl get ingress -n flamoral-prod
   kubectl describe ingress -n flamoral-prod
   ```

3. **Database connection issues**
   ```bash
   # Check secrets are mounted
   kubectl exec -it <pod> -n flamoral-prod -- env | grep DATABASE
   ```

### Rollback

```bash
# List Helm releases
helm history flamoral-prod -n flamoral-prod

# Rollback to previous version
helm rollback flamoral-prod <revision> -n flamoral-prod
```

## Security Checklist

- [ ] Service Principal uses minimum required permissions
- [ ] All secrets stored in Azure Key Vault
- [ ] Network policies enabled on AKS
- [ ] Azure Defender enabled for AKS
- [ ] WAF rules configured on Front Door
- [ ] TLS 1.2+ enforced everywhere
- [ ] Pod Security Standards enforced
- [ ] Container images scanned for vulnerabilities

## Cost Optimization

### Dev Environment
- B-series VMs for AKS nodes
- Basic SKUs for services
- Single replicas

### Test Environment
- Standard VMs
- Standard SKUs
- 2 replicas minimum

### Production Environment
- D-series VMs with autoscaling
- Premium SKUs with zone redundancy
- 3+ replicas for HA
