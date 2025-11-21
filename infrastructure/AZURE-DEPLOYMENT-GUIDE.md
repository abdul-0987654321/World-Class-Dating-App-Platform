# Dating App Platform - Azure Deployment Guide

Complete guide for deploying the Dating App Platform on Microsoft Azure using AKS, Azure PostgreSQL, Azure Redis Cache, and other Azure services.

## 📋 Prerequisites

### Required Tools
- **Azure CLI**: 2.50 or higher
- **Terraform**: 1.5 or higher
- **kubectl**: 1.28 or higher
- **Helm**: 3.12 or higher
- **Ansible**: 2.14 or higher (optional)

### Azure Requirements
- Active Azure subscription
- Contributor or Owner role on the subscription
- Azure AD tenant (for AKS RBAC)
- Service Principal or Managed Identity

## 🚀 Quick Start

### 1. Initial Azure Setup

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create resource group for Terraform state
az group create --name dating-app-terraform-state --location eastus

# Create storage account for Terraform state
az storage account create \
  --resource-group dating-app-terraform-state \
  --name datingappterraformstate \
  --sku Standard_LRS \
  --encryption-services blob

# Get storage account key
ACCOUNT_KEY=$(az storage account keys list --resource-group dating-app-terraform-state --account-name datingappterraformstate --query '[0].value' -o tsv)

# Create blob container
az storage container create \
  --name tfstate \
  --account-name datingappterraformstate \
  --account-key $ACCOUNT_KEY
```

### 2. Deploy Infrastructure with Terraform

#### Production Environment

```bash
cd infrastructure/terraform/environments/azure-production

# Initialize Terraform
terraform init

# Review the plan
terraform plan -out=tfplan

# Apply the infrastructure
terraform apply tfplan

# Save outputs
terraform output -json > outputs.json
```

#### Staging Environment

```bash
cd infrastructure/terraform/environments/azure-staging

terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

#### Development Environment

```bash
cd infrastructure/terraform/environments/azure-dev

terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

### 3. Configure kubectl for AKS

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group production-dating-app-rg \
  --name production-dating-app-aks \
  --overwrite-existing

# Verify connection
kubectl get nodes

# Install Azure Kubernetes Service Secrets Provider
kubectl create namespace kube-system
helm repo add csi-secrets-store-provider-azure https://azure.github.io/secrets-store-csi-driver-provider-azure/charts
helm install csi-secrets-store-provider-azure/csi-secrets-store-provider-azure --generate-name --namespace kube-system
```

### 4. Deploy Application

```bash
cd infrastructure/kubernetes

# Apply Azure-specific configurations
kubectl apply -f azure-aks-config.yaml

# Create namespaces
kubectl apply -f base/namespace.yaml

# Apply secrets (update with actual values first)
kubectl apply -f base/secrets.yaml

# Apply ConfigMaps
kubectl apply -f base/configmap.yaml

# Deploy PostgreSQL and Redis connections
kubectl apply -f base/postgres-deployment.yaml
kubectl apply -f base/redis-deployment.yaml

# Deploy application services
kubectl apply -f base/api-gateway-deployment.yaml

# Deploy ingress
kubectl apply -f base/ingress.yaml
```

### 5. Deploy with Helm

```bash
cd infrastructure/kubernetes/helm

# Update values for Azure
cat > azure-values.yaml <<EOF
global:
  environment: production
  domain: datingapp.com
  registry: productiondatingappacr.azurecr.io

database:
  host: production-dating-app-postgres.postgres.database.azure.com
  port: 5432

redis:
  host: production-dating-app-redis.redis.cache.windows.net
  port: 6380
  ssl: true

storage:
  accountName: productiondatingappmedia
  containerName: user-photos

monitoring:
  applicationInsights:
    enabled: true
    instrumentationKey: YOUR_INSTRUMENTATION_KEY
EOF

# Install the chart
helm install dating-app ./dating-app \
  --namespace dating-app \
  --create-namespace \
  --values azure-values.yaml
```

## 🔐 Security Configuration

### 1. Azure Key Vault Setup

```bash
# Create Key Vault (if not created by Terraform)
az keyvault create \
  --name production-dating-kv \
  --resource-group production-dating-app-rg \
  --location eastus

# Add secrets
az keyvault secret set --vault-name production-dating-kv --name postgres-password --value "YOUR_SECURE_PASSWORD"
az keyvault secret set --vault-name production-dating-kv --name redis-password --value "YOUR_SECURE_PASSWORD"
az keyvault secret set --vault-name production-dating-kv --name jwt-secret --value "YOUR_JWT_SECRET"
az keyvault secret set --vault-name production-dating-kv --name encryption-key --value "YOUR_ENCRYPTION_KEY"

# Grant AKS access to Key Vault
AKS_IDENTITY_ID=$(az aks show --resource-group production-dating-app-rg --name production-dating-app-aks --query identityProfile.kubeletidentity.objectId -o tsv)

az keyvault set-policy \
  --name production-dating-kv \
  --object-id $AKS_IDENTITY_ID \
  --secret-permissions get list
```

### 2. Azure Container Registry

```bash
# Login to ACR
az acr login --name productiondatingappacr

# Build and push images
docker build -t productiondatingappacr.azurecr.io/api-gateway:v1.0.0 ./backend/services/api-gateway
docker push productiondatingappacr.azurecr.io/api-gateway:v1.0.0

# Or use Azure ACR Tasks
az acr build --registry productiondatingappacr --image api-gateway:v1.0.0 ./backend/services/api-gateway
```

### 3. Network Security

```bash
# Configure NSG rules
az network nsg rule create \
  --resource-group production-dating-app-rg \
  --nsg-name production-aks-nsg \
  --name AllowHTTPS \
  --priority 100 \
  --destination-port-ranges 443 \
  --protocol Tcp

# Enable Azure Firewall (optional)
az network firewall create \
  --name production-dating-app-fw \
  --resource-group production-dating-app-rg \
  --location eastus
```

## 📊 Monitoring Setup

### 1. Application Insights

```bash
# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app production-dating-app-insights \
  --resource-group production-dating-app-rg \
  --query instrumentationKey -o tsv)

# Update Kubernetes ConfigMap
kubectl create configmap app-insights-config \
  --from-literal=APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY \
  --namespace dating-app
```

### 2. Azure Monitor for Containers

```bash
# Enable monitoring
az aks enable-addons \
  --addons monitoring \
  --name production-dating-app-aks \
  --resource-group production-dating-app-rg

# View logs
az monitor log-analytics query \
  --workspace production-dating-app-logs \
  --analytics-query "ContainerLog | where TimeGenerated > ago(1h) | limit 100"
```

### 3. Grafana Dashboard

Access Grafana at: `http://grafana.yourdomain.com:3001`

Configure Azure Monitor datasource:
- Plugin: Azure Monitor
- Subscription ID: Your Azure subscription ID
- Tenant ID: Your Azure AD tenant ID
- Client ID: Service Principal client ID
- Client Secret: Service Principal secret

## 💾 Database Management

### Azure PostgreSQL Flexible Server

```bash
# Connect to database
psql "host=production-dating-app-postgres.postgres.database.azure.com port=5432 dbname=dating_app_production user=datingappadmin@production-dating-app-postgres sslmode=require"

# Create backup
az postgres flexible-server backup create \
  --resource-group production-dating-app-rg \
  --name production-dating-app-postgres \
  --backup-name manual-backup-$(date +%Y%m%d)

# Restore from backup
az postgres flexible-server restore \
  --resource-group production-dating-app-rg \
  --name production-dating-app-postgres-restored \
  --source-server production-dating-app-postgres \
  --restore-time "2024-01-01T00:00:00Z"

# Configure high availability
az postgres flexible-server update \
  --resource-group production-dating-app-rg \
  --name production-dating-app-postgres \
  --high-availability Enabled \
  --zone 1 \
  --standby-zone 2
```

## 🗄️ Azure Storage

### Blob Storage for Media

```bash
# Upload files
az storage blob upload-batch \
  --source ./local-media \
  --destination user-photos \
  --account-name productiondatingappmedia

# Set access tier
az storage blob set-tier \
  --container-name user-photos \
  --name photo.jpg \
  --tier Cool \
  --account-name productiondatingappmedia

# Enable lifecycle management
az storage account management-policy create \
  --account-name productiondatingappmedia \
  --policy @lifecycle-policy.json
```

## 🔄 Scaling

### Auto-scaling AKS

```bash
# Cluster autoscaler
az aks update \
  --resource-group production-dating-app-rg \
  --name production-dating-app-aks \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 15

# Scale node pool
az aks nodepool scale \
  --resource-group production-dating-app-rg \
  --cluster-name production-dating-app-aks \
  --name user \
  --node-count 5
```

### Database Scaling

```bash
# Scale up PostgreSQL
az postgres flexible-server update \
  --resource-group production-dating-app-rg \
  --name production-dating-app-postgres \
  --sku-name Standard_D16s_v3

# Scale Redis Cache
az redis update \
  --resource-group production-dating-app-rg \
  --name production-dating-app-redis \
  --sku Premium \
  --vm-size P3
```

## 🛠️ Troubleshooting

### Common Issues

1. **AKS nodes not ready**
   ```bash
   kubectl get nodes
   kubectl describe node <node-name>
   az aks show --resource-group production-dating-app-rg --name production-dating-app-aks
   ```

2. **Pod identity issues**
   ```bash
   kubectl get azureidentity -n dating-app
   kubectl get azureidentitybinding -n dating-app
   kubectl logs <pod-name> -n dating-app
   ```

3. **Key Vault access denied**
   ```bash
   az keyvault show --name production-dating-kv
   az keyvault set-policy --name production-dating-kv --object-id <IDENTITY_ID> --secret-permissions get list
   ```

4. **PostgreSQL connection issues**
   ```bash
   az postgres flexible-server list
   az postgres flexible-server firewall-rule list --resource-group production-dating-app-rg --name production-dating-app-postgres
   ```

## 💰 Cost Optimization

### Development Environment
- Use Burstable (B-series) VMs for AKS
- Use Basic tier for PostgreSQL
- Use Basic tier for Redis
- Disable geo-replication
- Use spot instances for non-critical workloads

### Staging Environment
- Use Standard tier services
- Enable auto-shutdown for non-business hours
- Use managed disks with lower tiers
- Implement resource tagging for cost tracking

### Production Environment
- Use Azure Reserved Instances (1 or 3 years)
- Enable Azure Hybrid Benefit if applicable
- Use Azure Cost Management + Billing
- Set up budget alerts
- Review and right-size resources monthly

### Cost Monitoring

```bash
# View cost analysis
az consumption usage list \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --query "[?contains(instanceName,'dating-app')]" \
  --output table

# Set budget alert
az consumption budget create \
  --amount 5000 \
  --budget-name dating-app-monthly \
  --time-grain Monthly \
  --time-period @budget-timeperiod.json
```

## 📚 Additional Resources

- [Azure AKS Documentation](https://docs.microsoft.com/azure/aks/)
- [Azure PostgreSQL Documentation](https://docs.microsoft.com/azure/postgresql/)
- [Azure Redis Cache Documentation](https://docs.microsoft.com/azure/azure-cache-for-redis/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault/)
- [Azure Monitor Documentation](https://docs.microsoft.com/azure/azure-monitor/)

## 📞 Support

For Azure-specific issues:
- Azure Support: https://azure.microsoft.com/support/
- Platform Team: platform@datingapp.com

## 📝 License

Copyright © 2025 Dating App Platform. All rights reserved.
