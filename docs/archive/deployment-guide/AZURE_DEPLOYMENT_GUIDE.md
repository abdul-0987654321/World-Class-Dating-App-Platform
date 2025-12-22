# Azure Deployment Guide

> Step-by-step instructions for deploying Flamoral to Azure

---

## Prerequisites

- Azure CLI installed (`az --version`)
- Terraform installed (`terraform --version`)
- kubectl installed (`kubectl version`)
- Helm installed (`helm version`)
- Docker installed (`docker --version`)

---

## Step 1: Azure Account Setup

### 1.1 Login to Azure

```bash
az login
```

### 1.2 Set Subscription

```bash
# List subscriptions
az account list --output table

# Set subscription
az account set --subscription "ba233460-2dbe-4603-a594-68f93ec9deb3"

# Verify
az account show
```

### 1.3 Create Service Principal

```bash
# Create service principal for Terraform
az ad sp create-for-rbac \
  --name "terraform-flamoral-sp" \
  --role="Contributor" \
  --scopes="/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3" \
  --output json

# Save the output:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",      <- ARM_CLIENT_ID
#   "displayName": "terraform-flamoral-sp",
#   "password": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",   <- ARM_CLIENT_SECRET
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"      <- ARM_TENANT_ID
# }
```

---

## Step 2: Terraform State Storage

### 2.1 Create Storage Account for State

```bash
# Create resource group for state
az group create \
  --name flamoral-tfstate-rg \
  --location eastus

# Create storage account
az storage account create \
  --name flamoraltfstate \
  --resource-group flamoral-tfstate-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Get storage account key
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group flamoral-tfstate-rg \
  --account-name flamoraltfstate \
  --query '[0].value' -o tsv)

# Create container
az storage container create \
  --name tfstate \
  --account-name flamoraltfstate \
  --account-key $ACCOUNT_KEY
```

---

## Step 3: Deploy Infrastructure with Terraform

### 3.1 Configure Environment Variables

```bash
export ARM_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export ARM_CLIENT_SECRET="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
export ARM_TENANT_ID="ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
```

### 3.2 Deploy Dev Environment

```bash
cd infrastructure/terraform/environments/dev

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply (review changes first!)
terraform apply tfplan
```

### 3.3 Deploy Staging Environment

```bash
cd infrastructure/terraform/environments/staging

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 3.4 Deploy Production Environment

```bash
cd infrastructure/terraform/environments/prod

terraform init
terraform plan -out=tfplan

# CAREFUL: Review all changes before applying!
terraform apply tfplan
```

### 3.5 Verify Resources

```bash
# List resource groups
az group list --output table

# List AKS clusters
az aks list --output table

# List databases
az postgres flexible-server list --output table

# List Redis caches
az redis list --output table
```

---

## Step 4: Configure AKS

### 4.1 Get Credentials

```bash
# Dev
az aks get-credentials \
  --resource-group flamoral-dev-rg \
  --name flamoral-dev-aks

# Production
az aks get-credentials \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks
```

### 4.2 Verify Connection

```bash
kubectl get nodes
kubectl get namespaces
```

### 4.3 Create Namespace

```bash
kubectl create namespace flamoral
kubectl config set-context --current --namespace=flamoral
```

---

## Step 5: Configure Container Registry

### 5.1 Login to ACR

```bash
# Get ACR name from Terraform output
ACR_NAME=$(terraform output -raw acr_name)

# Login
az acr login --name $ACR_NAME
```

### 5.2 Configure AKS to Pull from ACR

```bash
# Attach ACR to AKS (if not done by Terraform)
az aks update \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg \
  --attach-acr $ACR_NAME
```

---

## Step 6: Deploy Secrets

### 6.1 Create Kubernetes Secrets

```bash
# From env file
kubectl create secret generic flamoral-secrets \
  --from-env-file=.env.production \
  --namespace=flamoral

# Or manually
kubectl create secret generic flamoral-secrets \
  --namespace=flamoral \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=JWT_SECRET="..." \
  --from-literal=STRIPE_SECRET_KEY="sk_live_..." \
  # ... more secrets
```

### 6.2 Create Docker Registry Secret (if needed)

```bash
kubectl create secret docker-registry acr-secret \
  --namespace=flamoral \
  --docker-server=$ACR_NAME.azurecr.io \
  --docker-username=$ACR_NAME \
  --docker-password=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
```

---

## Step 7: Build and Push Docker Images

### 7.1 Build All Services

```bash
cd backend/services

# Build each service
services=(
  "api-gateway"
  "auth-service"
  "user-service"
  "matching-service"
  "messaging-service"
  "media-service"
  "payment-service"
  "notification-service"
  "analytics-service"
  "moderation-service"
  "realtime-service"
  "admin-service"
)

for service in "${services[@]}"; do
  echo "Building $service..."
  docker build -t $ACR_NAME.azurecr.io/$service:v1.0.0 ./$service
done
```

### 7.2 Push Images

```bash
for service in "${services[@]}"; do
  echo "Pushing $service..."
  docker push $ACR_NAME.azurecr.io/$service:v1.0.0
done
```

---

## Step 8: Deploy with Helm

### 8.1 Add Helm Repos

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 8.2 Install Ingress Controller

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

### 8.3 Deploy Flamoral Platform

```bash
cd infrastructure/helm/flamoral-platform

# Dev
helm upgrade --install flamoral . \
  -f values-dev.yaml \
  -n flamoral \
  --wait

# Production
helm upgrade --install flamoral . \
  -f values-prod.yaml \
  -n flamoral \
  --wait
```

### 8.4 Verify Deployment

```bash
# Check pods
kubectl get pods -n flamoral

# Check services
kubectl get services -n flamoral

# Check ingress
kubectl get ingress -n flamoral

# Check logs
kubectl logs -n flamoral deployment/api-gateway
```

---

## Step 9: Database Setup

### 9.1 Run Migrations

```bash
# Get database connection string from Azure
DB_HOST=$(az postgres flexible-server show \
  --name flamoral-prod-db \
  --resource-group flamoral-prod-rg \
  --query "fullyQualifiedDomainName" -o tsv)

# Run migrations
cd backend/services/user-service
DATABASE_URL="postgresql://flamoral:$DB_PASSWORD@$DB_HOST:5432/flamoral?sslmode=require" \
  npm run migrate
```

### 9.2 Verify Database

```bash
# Connect to database
psql "postgresql://flamoral:$DB_PASSWORD@$DB_HOST:5432/flamoral?sslmode=require"

# Check tables
\dt

# Check migrations
SELECT * FROM migrations;
```

---

## Step 10: Deploy Monitoring

### 10.1 Deploy Prometheus Stack

```bash
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### 10.2 Deploy Custom Monitoring

```bash
kubectl apply -f infrastructure/monitoring/prometheus/
kubectl apply -f infrastructure/monitoring/grafana/
kubectl apply -f infrastructure/monitoring/alertmanager/
```

### 10.3 Deploy Logging

```bash
kubectl apply -f infrastructure/logging/loki-stack-config.yaml
```

### 10.4 Deploy Tracing

```bash
kubectl apply -f infrastructure/monitoring/tracing/jaeger-deployment.yaml
```

---

## Step 11: Configure DNS

### 11.1 Get Load Balancer IP

```bash
kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### 11.2 Configure DNS Records

```
# In your DNS provider (e.g., Azure DNS, Cloudflare)

A     @              -> <LOAD_BALANCER_IP>
A     www            -> <LOAD_BALANCER_IP>
A     api            -> <LOAD_BALANCER_IP>
A     realtime       -> <LOAD_BALANCER_IP>
A     admin          -> <LOAD_BALANCER_IP>
CNAME cdn            -> <CDN_ENDPOINT>
```

### 11.3 Configure SSL (if not using Azure Front Door)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@flamoral.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

---

## Step 12: Verify Deployment

### 12.1 Health Checks

```bash
# API Gateway
curl https://api.flamoral.com/health

# All services
for service in api-gateway user-service matching-service messaging-service; do
  echo "Checking $service..."
  kubectl exec -n flamoral deployment/$service -- curl -s localhost:3000/health
done
```

### 12.2 Smoke Tests

```bash
# Test authentication
curl -X POST https://api.flamoral.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Test API
curl https://api.flamoral.com/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 12.3 Monitor Logs

```bash
# Tail logs
kubectl logs -n flamoral -f deployment/api-gateway

# Check events
kubectl get events -n flamoral --sort-by='.lastTimestamp'
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod
kubectl describe pod <pod-name> -n flamoral

# Check events
kubectl get events -n flamoral

# Check resource limits
kubectl top pods -n flamoral
```

### Database Connection Issues

```bash
# Test connection from pod
kubectl exec -it deployment/api-gateway -n flamoral -- \
  nc -zv flamoral-prod-db.postgres.database.azure.com 5432

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db
```

### Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n flamoral
kubectl describe certificate flamoral-tls -n flamoral

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

### Scaling Issues

```bash
# Check HPA
kubectl get hpa -n flamoral

# Describe HPA
kubectl describe hpa api-gateway -n flamoral

# Manual scale
kubectl scale deployment api-gateway --replicas=3 -n flamoral
```

---

## Rollback Procedures

### Helm Rollback

```bash
# List revisions
helm history flamoral -n flamoral

# Rollback to previous
helm rollback flamoral -n flamoral

# Rollback to specific revision
helm rollback flamoral 2 -n flamoral
```

### Database Rollback

```bash
# Run down migration
DATABASE_URL=$DB_URL npm run migrate:down

# Restore from backup
az postgres flexible-server backup restore \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db \
  --restore-point-in-time "2024-01-01T00:00:00Z" \
  --target-server-name flamoral-prod-db-restored
```

---

## Cost Optimization

### Auto-Scaling Configuration

```yaml
# HPA settings in values-prod.yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Reserved Instances

```bash
# Purchase reserved capacity for AKS nodes
# Azure Portal > Reservations > Add
```

### Right-Sizing

```bash
# Check resource usage
kubectl top pods -n flamoral
kubectl top nodes

# Adjust requests/limits based on actual usage
```

---

*Document maintained by Flamoral Engineering Team*
