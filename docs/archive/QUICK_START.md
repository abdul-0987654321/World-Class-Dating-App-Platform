# Flamoral Dating Platform - Quick Start Deployment

## TL;DR - Fast Track to Deployment

This guide gets you from zero to deployed infrastructure in ~60 minutes.

---

## Prerequisites (5 minutes)

### 1. Install Required Tools

```bash
# Verify Terraform is installed
terraform version  # Should be >= 1.4.0

# Verify Azure CLI is installed
az version  # Should be >= 2.50.0
```

### 2. Login to Azure

```bash
az login
az account set --subscription ba233460-2dbe-4603-a594-68f93ec9deb3
az account show  # Verify correct subscription
```

### 3. Set Environment Variables

```bash
# Create a .env file (DON'T COMMIT THIS!)
cat > .env << 'EOF'
export ARM_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
export ARM_CLIENT_SECRET="<GET-THIS-FROM-KEY-VAULT>"
export ARM_TENANT_ID="ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
export ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
EOF

# Load environment variables
source .env
```

**Get the Client Secret:**
```bash
# Option 1: From Azure Key Vault (if available)
az keyvault secret show --vault-name <vault-name> --name terraform-sp-secret --query value -o tsv

# Option 2: From Azure Portal
# Go to: Azure AD > App Registrations > terraform-datingapp-sp > Certificates & secrets
```

---

## Deploy Development Environment (30 minutes)

### Step 1: Create Backend Storage (5 minutes)

```bash
cd DatingPlatform/infrastructure/terraform

# Create storage account for Terraform state
chmod +x scripts/setup-backend.sh
./scripts/setup-backend.sh dev
```

**Expected Output:**
```
[INFO] Backend setup complete for dev environment!
Resource Group:    flamoral-tfstate-rg
Storage Account:   flamoraltfstatedev
Container:         tfstate
```

### Step 2: Initialize Terraform (2 minutes)

```bash
cd environments/dev

# Download providers and configure backend
terraform init
```

**Expected Output:**
```
Terraform has been successfully initialized!
```

### Step 3: Validate Configuration (1 minute)

```bash
# Validate syntax and configuration
terraform validate
```

**Expected Output:**
```
Success! The configuration is valid.
```

### Step 4: Preview Changes (2 minutes)

```bash
# Create execution plan
terraform plan -var-file="dev.tfvars" -out=tfplan
```

**Expected Output:**
```
Plan: 30 to add, 0 to change, 0 to destroy.
```

**Review the plan!** Make sure:
- Resource names look correct
- Locations are correct (westus2)
- No unexpected deletions

### Step 5: Deploy Infrastructure (20 minutes)

```bash
# Apply the plan
terraform apply tfplan
```

**What Gets Created:**
- ✅ Resource Group (Dating-dev-rg)
- ✅ Virtual Network with 4 subnets
- ✅ AKS Cluster (2 node pools)
- ✅ Container Registry
- ✅ PostgreSQL Database
- ✅ Redis Cache
- ✅ Storage Account with blob containers
- ✅ Key Vault
- ✅ Log Analytics & App Insights
- ✅ SignalR Service
- ✅ CDN Profile

**Expected Duration:** 15-25 minutes

### Step 6: Verify Deployment (5 minutes)

```bash
# View outputs
terraform output

# List all resources
az resource list --resource-group Dating-dev-rg --output table

# Get AKS credentials
az aks get-credentials --resource-group Dating-dev-rg --name flamoral-dev-aks

# Verify Kubernetes access
kubectl get nodes
```

---

## Using Deployment Scripts (Alternative Method)

### For Development

```bash
cd DatingPlatform/infrastructure/terraform

# Setup backend
./scripts/setup-backend.sh dev

# Initialize
./scripts/deploy.sh dev init

# Validate
./scripts/deploy.sh dev validate

# Plan
./scripts/deploy.sh dev plan

# Apply
./scripts/deploy.sh dev apply

# View outputs
./scripts/deploy.sh dev output
```

---

## Deploy Staging Environment (30 minutes)

```bash
# 1. Create backend storage
./scripts/setup-backend.sh staging

# 2. Initialize and deploy
cd environments/staging
terraform init
terraform plan -var-file="terraform.tfvars" -out=tfplan
terraform apply tfplan
```

**Or using scripts:**
```bash
./scripts/deploy.sh staging init
./scripts/deploy.sh staging plan
./scripts/deploy.sh staging apply
```

---

## Deploy Production Environment (45 minutes)

⚠️ **PRODUCTION DEPLOYMENT - REQUIRES APPROVAL**

```bash
# 1. Create backend storage
./scripts/setup-backend.sh prod

# 2. Initialize
cd environments/prod
terraform init

# 3. Plan and review CAREFULLY
terraform plan -var-file="terraform.tfvars" -out=tfplan

# 4. Get approval from team lead

# 5. Schedule maintenance window

# 6. Apply
terraform apply tfplan
```

**Production Safety Checks:**
- [ ] Reviewed terraform plan output
- [ ] Team lead approval obtained
- [ ] Maintenance window scheduled
- [ ] Backup plan in place
- [ ] Rollback procedure ready

---

## Common Commands Cheat Sheet

### Initialization
```bash
terraform init                    # Initialize working directory
terraform init -upgrade           # Upgrade providers
terraform init -reconfigure       # Reconfigure backend
```

### Planning
```bash
terraform plan                                    # Show execution plan
terraform plan -var-file="dev.tfvars"            # Use specific var file
terraform plan -out=tfplan                       # Save plan to file
terraform plan -target=azurerm_resource.example  # Plan specific resource
```

### Applying
```bash
terraform apply                   # Interactive apply
terraform apply tfplan            # Apply saved plan
terraform apply -auto-approve     # Skip confirmation (use carefully!)
```

### Destroying
```bash
terraform destroy                                    # Destroy all resources
terraform destroy -target=azurerm_resource.example   # Destroy specific resource
terraform destroy -auto-approve                      # Skip confirmation (dangerous!)
```

### State Management
```bash
terraform state list                        # List resources in state
terraform state show azurerm_resource.name  # Show resource details
terraform state rm azurerm_resource.name    # Remove from state (doesn't destroy)
terraform state pull                        # Download state
terraform state push                        # Upload state
```

### Other Useful Commands
```bash
terraform output                  # Show all outputs
terraform output -json            # Outputs in JSON
terraform validate                # Validate configuration
terraform fmt                     # Format .tf files
terraform fmt -recursive          # Format all .tf files
terraform providers               # Show required providers
terraform version                 # Show Terraform version
```

---

## Quick Troubleshooting

### Error: Backend not initialized
```bash
./scripts/setup-backend.sh dev
terraform init -reconfigure
```

### Error: Authentication failed
```bash
# Verify environment variables
echo $ARM_CLIENT_ID
echo $ARM_TENANT_ID

# Re-export if needed
source .env
```

### Error: Resource already exists
```bash
# Import existing resource
terraform import azurerm_resource_group.dating_dev /subscriptions/.../resourceGroups/Dating-dev-rg

# Or force destroy and recreate
terraform destroy
terraform apply
```

### Error: State locked
```bash
# Wait 15-20 minutes for lock to expire
# Or force unlock (use with caution!)
terraform force-unlock <lock-id>
```

### Error: Quota exceeded
```bash
# Check quotas
az vm list-usage --location westus2 --output table

# Reduce node counts in tfvars or request quota increase
```

---

## Post-Deployment Tasks

### 1. Retrieve Secrets

```bash
# Get Key Vault name
KV_NAME=$(terraform output -raw key_vault_name)

# Get PostgreSQL password
az keyvault secret show --vault-name $KV_NAME --name postgres-password --query value -o tsv

# Get Redis connection string
az keyvault secret show --vault-name $KV_NAME --name redis-connection-string --query value -o tsv

# Get Storage connection string
az keyvault secret show --vault-name $KV_NAME --name storage-connection-string --query value -o tsv
```

### 2. Configure AKS Access

```bash
# Get credentials
az aks get-credentials --resource-group Dating-dev-rg --name flamoral-dev-aks

# Verify access
kubectl get nodes
kubectl get namespaces

# Create namespaces if needed
kubectl create namespace dating-api
kubectl create namespace dating-web
kubectl create namespace monitoring
```

### 3. Deploy Applications

```bash
# Build and push Docker images
cd ../../backend
docker build -t flamoraldevacr.azurecr.io/dating-api:latest .
az acr login --name flamoraldevacr
docker push flamoraldevacr.azurecr.io/dating-api:latest

# Apply Kubernetes manifests
cd ../k8s
kubectl apply -f deployments/
kubectl apply -f services/
kubectl apply -f ingress/
```

### 4. Configure Monitoring

```bash
# Get Application Insights key
AI_KEY=$(terraform output -raw app_insights_instrumentation_key)

# Add to application configuration
echo "APPINSIGHTS_INSTRUMENTATIONKEY=$AI_KEY" >> .env
```

---

## Environment Variables Reference

### Required for Deployment

```bash
# Service Principal Authentication
ARM_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
ARM_CLIENT_SECRET="<from-key-vault>"
ARM_TENANT_ID="ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
```

### Optional for Advanced Configuration

```bash
# Enable detailed logging
TF_LOG=DEBUG

# Set working directory
TF_WORKING_DIR=/path/to/terraform

# Use different backend config
TF_CLI_ARGS_init="-backend-config=backend.hcl"
```

---

## Cost Estimates

| Environment | Monthly Cost |
|-------------|--------------|
| Development | ~$130        |
| Staging     | ~$540        |
| Production  | ~$1,480      |

**Cost Optimization Tips:**
- Use B-series VMs for dev (burstable)
- Scale down outside business hours
- Use Azure Reserved Instances for prod (up to 72% savings)
- Enable auto-scaling to match demand
- Use spot instances for non-critical workloads

---

## Resource Naming Convention

| Resource Type | Dev Name Pattern | Staging Name Pattern | Prod Name Pattern |
|---------------|------------------|----------------------|-------------------|
| Resource Group | Dating-dev-rg | flamoral-staging-rg | flamoral-prod-rg |
| AKS Cluster | flamoral-dev-aks | flamoral-staging-aks | flamoral-prod-aks |
| PostgreSQL | flamoral-dev-postgres | flamoral-staging-postgres | flamoral-prod-postgres |
| Redis | flamoral-dev-redis | flamoral-staging-redis | flamoral-prod-redis |
| Storage | flamoraldev{random} | flamoralstg{random} | flam oralprod{random} |
| ACR | flamoraldevacr{random} | flamoralstgacr{random} | flam oralprodacr{random} |
| Key Vault | flamoral-dev-kv-{random} | flamoral-staging-kv-{random} | flamoral-prod-kv-{random} |

---

## Next Steps After Deployment

1. **Configure DNS** (Production only)
   - Point `flamoral.com` to Application Gateway IP
   - Configure SSL certificates

2. **Set up CI/CD**
   - Configure GitHub Actions
   - Set up deployment pipelines
   - Configure automated testing

3. **Configure Monitoring**
   - Set up Application Insights alerts
   - Configure log analytics queries
   - Set up dashboards

4. **Deploy Applications**
   - Build Docker images
   - Push to ACR
   - Deploy to AKS

5. **Run Integration Tests**
   - Test database connectivity
   - Test Redis caching
   - Test storage access
   - Test AKS deployments

---

## Support and Documentation

- **Full Deployment Guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Issues and Fixes:** [ISSUES_AND_FIXES.md](ISSUES_AND_FIXES.md)
- **Terraform Docs:** https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- **Azure CLI Reference:** https://docs.microsoft.com/en-us/cli/azure/

---

**Last Updated:** 2025-12-11
**Version:** 1.0.0
