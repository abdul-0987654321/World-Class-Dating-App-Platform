# Deployment Guide

## Prerequisites

### Required Tools
```bash
# Install required tools
brew install terraform        # v1.6.0+
brew install azure-cli         # v2.50.0+
brew install kubectl          # v1.28.0+
brew install helm             # v3.13.0+
brew install gh               # GitHub CLI

# Verify installations
terraform version
az version
kubectl version --client
helm version
```

### Azure Setup
```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "ba233460-2dbe-4603-a594-68f93ec9deb3"

# Verify service principal
az ad sp show --id a85e4029-4e37-4399-9390-6e18922b38e7
```

## Initial Infrastructure Setup

### 1. Create Terraform Backend

```bash
# Create resource group for Terraform state
az group create \
  --name datingapp-tfstate-rg \
  --location eastus

# Create storage account
az storage account create \
  --name datingapptfstate \
  --resource-group datingapp-tfstate-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Create container
az storage container create \
  --name tfstate \
  --account-name datingapptfstate
```

### 2. Configure OIDC for GitHub Actions

```bash
# Create federated credential for GitHub Actions
az ad app federated-credential create \
  --id a85e4029-4e37-4399-9390-6e18922b38e7 \
  --parameters '{
    "name": "github-actions-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:your-org/World-Class-Dating-App-Platform:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 3. Set GitHub Secrets

```bash
# Set required secrets
gh secret set AZURE_CLIENT_ID --body "a85e4029-4e37-4399-9390-6e18922b38e7"
gh secret set AZURE_TENANT_ID --body "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
gh secret set AZURE_SUBSCRIPTION_ID --body "ba233460-2dbe-4603-a594-68f93ec9deb3"
```

## Environment Deployment

### Deploy Development Environment

```bash
# Navigate to infrastructure directory
cd infrastructure

# Initialize Terraform
terraform init

# Review plan
terraform plan -var-file=envs/dev.tfvars

# Apply infrastructure
terraform apply -var-file=envs/dev.tfvars

# Get AKS credentials
az aks get-credentials \
  --resource-group datingapp-dev-rg \
  --name datingapp-dev-aks

# Verify cluster access
kubectl get nodes
```

### Deploy Staging Environment

```bash
# Plan staging deployment
terraform workspace new staging  # If using workspaces
terraform plan -var-file=envs/staging.tfvars

# Apply with approval
terraform apply -var-file=envs/staging.tfvars

# Get credentials
az aks get-credentials \
  --resource-group datingapp-staging-rg \
  --name datingapp-staging-aks \
  --overwrite-existing
```

### Deploy Production Environment

**IMPORTANT**: Production deployment requires change approval

```bash
# Create change request
# Document: Infrastructure changes, impact, rollback plan

# Get approvals from:
# - Tech Lead
# - Product Owner
# - Operations Team

# Schedule deployment window
# Recommended: Sunday 2-4 AM UTC

# Review production plan
terraform plan -var-file=envs/prod.tfvars > prod-plan.txt
# Carefully review the plan

# Apply infrastructure
terraform apply -var-file=envs/prod.tfvars

# Get credentials
az aks get-credentials \
  --resource-group datingapp-prod-rg \
  --name datingapp-prod-aks \
  --overwrite-existing

# Verify deployment
kubectl get nodes
kubectl get namespaces
```

## Application Deployment

### Install NGINX Ingress Controller

```bash
# Add Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install ingress controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

### Install Cert-Manager

```bash
# Add Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.crds.yaml

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0

# Create Let's Encrypt issuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@datingapp.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Deploy Application Services

```bash
# Create namespace
kubectl create namespace datingapp

# Deploy API service
helm install dating-api ./infrastructure/helm/dating-api \
  --namespace datingapp \
  --values ./infrastructure/helm/dating-api/values-prod.yaml \
  --set image.tag=v1.0.0

# Deploy media processor
helm install media-processor ./infrastructure/helm/media-processor \
  --namespace datingapp \
  --values ./infrastructure/helm/media-processor/values.yaml \
  --set image.tag=v1.0.0

# Deploy chat worker
helm install chat-worker ./infrastructure/helm/chat-worker \
  --namespace datingapp \
  --values ./infrastructure/helm/chat-worker/values.yaml \
  --set image.tag=v1.0.0

# Verify deployments
kubectl get pods -n datingapp
kubectl get services -n datingapp
kubectl get ingress -n datingapp
```

## Post-Deployment Verification

### Health Checks

```bash
# Check pod status
kubectl get pods -n datingapp --watch

# Check service endpoints
kubectl get endpoints -n datingapp

# Test health endpoints
INGRESS_IP=$(kubectl get ingress -n datingapp -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
curl -H "Host: api.datingapp.com" http://${INGRESS_IP}/health
```

### Smoke Tests

```bash
# Run automated smoke tests
npm run test:smoke:prod

# Manual verification
# 1. Open https://api.datingapp.com/health
# 2. Verify response: {"status": "healthy"}
# 3. Check Application Insights for metrics
# 4. Verify Front Door is routing correctly
```

### Database Migration

```bash
# Connect to database via AKS pod
kubectl run -it --rm psql \
  --image=postgres:14 \
  --namespace datingapp \
  --restart=Never -- \
  psql postgresql://psqladmin@datingapp-prod-postgres.postgres.database.azure.com/datingapp

# Run migrations
npm run migrate:prod

# Verify schema
\dt
\d users
```

## CI/CD Setup

### GitHub Actions Workflow

The infrastructure includes pre-configured workflows:

1. **terraform-plan.yml**: Runs on PR, shows planned changes
2. **terraform-apply.yml**: Manual trigger, applies infrastructure
3. **docker-build-push.yml**: Builds and pushes container images
4. **helm-deploy.yml**: Deploys applications to AKS

### Trigger Deployment via GitHub Actions

```bash
# Deploy to staging
gh workflow run helm-deploy.yml \
  -f environment=staging \
  -f service=all \
  -f image_tag=v1.0.0

# Deploy to production (requires approval)
gh workflow run helm-deploy.yml \
  -f environment=prod \
  -f service=all \
  -f image_tag=v1.0.0
```

## Monitoring Setup

### Configure Alerts

```bash
# Alerts are automatically created by Terraform
# Review in Azure Portal:
# Monitor > Alerts > Alert Rules

# Key alerts:
# - High CPU (>85%)
# - High Memory (>85%)
# - High Error Rate (>5%)
# - Slow Response Time (>2000ms)
```

### Access Dashboards

1. **Application Insights**:
   - Navigate to: Azure Portal > Application Insights > datingapp-{env}-appinsights
   - View: Performance, Failures, Live Metrics

2. **Log Analytics**:
   - Navigate to: Azure Portal > Log Analytics > datingapp-{env}-logs
   - Run custom queries

3. **Kubernetes Dashboard** (optional):
   ```bash
   kubectl proxy
   # Open: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
   ```

## Troubleshooting

### Terraform Issues

```bash
# State lock error
terraform force-unlock <LOCK_ID>

# State drift detection
terraform plan -var-file=envs/prod.tfvars -detailed-exitcode

# Refresh state
terraform refresh -var-file=envs/prod.tfvars
```

### AKS Issues

```bash
# Pod not starting
kubectl describe pod <pod-name> -n datingapp
kubectl logs <pod-name> -n datingapp

# Service not accessible
kubectl get endpoints -n datingapp
kubectl describe service <service-name> -n datingapp

# Ingress not working
kubectl describe ingress -n datingapp
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

### Database Connection Issues

```bash
# Test connectivity from pod
kubectl run -it --rm debug \
  --image=postgres:14 \
  --namespace datingapp \
  --restart=Never -- \
  psql postgresql://psqladmin:<password>@datingapp-prod-postgres.postgres.database.azure.com/datingapp

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group datingapp-prod-rg \
  --name datingapp-prod-postgres
```

## Rollback

See [runbooks/rollback-procedure.md](../runbooks/rollback-procedure.md) for detailed rollback procedures.

## Support

- Documentation: ./docs/
- Runbooks: ./runbooks/
- GitHub Issues: https://github.com/your-org/dating-app/issues
- Slack: #dating-app-ops
