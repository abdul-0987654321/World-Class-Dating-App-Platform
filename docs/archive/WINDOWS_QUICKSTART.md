# Windows Quick Start Guide

Step-by-step guide for deploying the infrastructure on Windows.

## Step 1: Install Required Tools

### 1.1 Install Azure CLI

**Option A: Using Windows Package Manager (Recommended)**
```powershell
# Open PowerShell as Administrator
winget install Microsoft.AzureCLI
```

**Option B: Using MSI Installer**
1. Download from: https://aka.ms/installazurecliwindows
2. Run the installer
3. Restart your terminal

**Verify Installation:**
```powershell
az version
```

### 1.2 Install Terraform

**Option A: Using Chocolatey**
```powershell
# If you have Chocolatey installed
choco install terraform
```

**Option B: Manual Installation**
1. Download from: https://www.terraform.io/downloads
2. Extract to `C:\terraform`
3. Add to PATH:
   - Search "Environment Variables" in Windows
   - Edit "Path" under System Variables
   - Add `C:\terraform`
4. Restart terminal

**Verify Installation:**
```powershell
terraform version
```

### 1.3 Install GitHub CLI

```powershell
# Using Windows Package Manager
winget install GitHub.cli
```

**Verify Installation:**
```powershell
gh --version
```

### 1.4 Install kubectl (Optional, for Kubernetes management)

```powershell
# Using Chocolatey
choco install kubernetes-cli

# Or using Windows Package Manager
winget install Kubernetes.kubectl
```

**Verify Installation:**
```powershell
kubectl version --client
```

### 1.5 Install Helm (Optional, for application deployment)

```powershell
# Using Chocolatey
choco install kubernetes-helm
```

**Verify Installation:**
```powershell
helm version
```

## Step 2: Authenticate with Azure

```powershell
# Login to Azure
az login

# This will open your browser for authentication
# After login, select your subscription

# Verify you're logged in
az account show

# Set the correct subscription if needed
az account set --subscription "ba233460-2dbe-4603-a594-68f93ec9deb3"
```

## Step 3: Run Deployment Scripts

### Option A: Using Git Bash (Recommended)

1. Open **Git Bash** (installed with Git for Windows)
2. Navigate to the scripts directory:
   ```bash
   cd /c/Users/kogun/OneDrive/Documents/Dating-Site/World-Class-Dating-App-Platform/infrastructure/scripts
   ```

3. Make scripts executable:
   ```bash
   chmod +x *.sh
   ```

4. Run scripts in order:
   ```bash
   # Step 1: Setup backend
   ./01-setup-backend.sh

   # Step 2: Configure GitHub secrets
   ./02-setup-github-secrets.sh

   # Step 3: Deploy infrastructure
   ./03-deploy-dev-environment.sh
   ```

### Option B: Using PowerShell

If you prefer PowerShell, run the commands manually:

#### 3.1 Setup Terraform Backend

```powershell
# Set variables
$resourceGroup = "datingapp-tfstate-rg"
$storageAccount = "datingapptfstate"
$containerName = "tfstate"
$location = "eastus"

# Create resource group
az group create --name $resourceGroup --location $location

# Create storage account
az storage account create `
  --name $storageAccount `
  --resource-group $resourceGroup `
  --location $location `
  --sku Standard_LRS `
  --encryption-services blob

# Create container
az storage container create `
  --name $containerName `
  --account-name $storageAccount
```

#### 3.2 Configure GitHub Secrets

```powershell
# Authenticate with GitHub
gh auth login

# Get Azure credentials
$clientId = az ad sp list --display-name "datingapp-github-actions" --query "[0].appId" -o tsv

# If service principal doesn't exist, create it
if ([string]::IsNullOrEmpty($clientId)) {
    $sp = az ad sp create-for-rbac `
      --name "datingapp-github-actions" `
      --role contributor `
      --scopes "/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3" `
      --json-auth | ConvertFrom-Json

    $clientId = $sp.clientId
}

$tenantId = az account show --query tenantId -o tsv
$subscriptionId = az account show --query id -o tsv

# Set GitHub secrets
gh secret set AZURE_CLIENT_ID --body "$clientId"
gh secret set AZURE_TENANT_ID --body "$tenantId"
gh secret set AZURE_SUBSCRIPTION_ID --body "$subscriptionId"

# Verify
gh secret list
```

#### 3.3 Deploy Infrastructure

```powershell
# Navigate to infrastructure directory
cd C:\Users\kogun\OneDrive\Documents\Dating-Site\World-Class-Dating-App-Platform\infrastructure

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file=envs/dev.tfvars -out=tfplan-dev

# Review the plan, then apply
terraform apply tfplan-dev
```

## Step 4: Verify Deployment

```powershell
# Check all resources
az resource list --resource-group datingapp-dev-rg --output table

# Get AKS credentials
az aks get-credentials `
  --resource-group datingapp-dev-rg `
  --name datingapp-dev-aks

# Verify cluster
kubectl get nodes
kubectl get namespaces

# View Terraform outputs
cd C:\Users\kogun\OneDrive\Documents\Dating-Site\World-Class-Dating-App-Platform\infrastructure
terraform output
```

## Step 5: Deploy Applications (Optional)

```powershell
# Via GitHub Actions
gh workflow run helm-deploy.yml -f environment=dev -f service=all

# Or manually with Helm
kubectl create namespace datingapp

helm install dating-api ./infrastructure/helm/dating-api `
  --namespace datingapp `
  --values ./infrastructure/helm/dating-api/values-dev.yaml
```

## Troubleshooting

### Issue: "az: command not found"

**Solution:**
1. Restart your terminal after installing Azure CLI
2. Or run: `$env:PATH += ";C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin"`
3. Verify with: `az version`

### Issue: "terraform: command not found"

**Solution:**
1. Verify Terraform is in PATH
2. Run in PowerShell as Administrator:
   ```powershell
   $env:PATH += ";C:\terraform"
   [Environment]::SetEnvironmentVariable("Path", $env:PATH, "Machine")
   ```
3. Restart terminal

### Issue: Script execution is disabled

**Solution:**
```powershell
# Run in PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "Permission denied" on Git Bash scripts

**Solution:**
```bash
# In Git Bash
chmod +x /c/Users/kogun/OneDrive/Documents/Dating-Site/World-Class-Dating-App-Platform/infrastructure/scripts/*.sh
```

### Issue: "Subscription not found"

**Solution:**
```powershell
# List all subscriptions
az account list --output table

# Set the correct one
az account set --subscription "<your-subscription-id>"

# Verify
az account show
```

### Issue: Terraform initialization fails

**Solution:**
1. Ensure backend storage exists:
   ```powershell
   az storage account show --name datingapptfstate --resource-group datingapp-tfstate-rg
   ```
2. If not found, run Step 3.1 again
3. Then retry: `terraform init`

## Alternative: Using Windows Subsystem for Linux (WSL)

If you have WSL2 installed, you can run the Linux commands directly:

```bash
# Install WSL2 (if not already)
wsl --install

# Once in WSL2 (Ubuntu), install tools
sudo apt update
sudo apt install -y azure-cli terraform kubectl

# Then run the bash scripts normally
cd /mnt/c/Users/kogun/OneDrive/Documents/Dating-Site/World-Class-Dating-App-Platform/infrastructure/scripts
./01-setup-backend.sh
./02-setup-github-secrets.sh
./03-deploy-dev-environment.sh
```

## Quick Reference

### Azure Commands
```powershell
# Login
az login

# List subscriptions
az account list --output table

# Set subscription
az account set --subscription "<id>"

# List resource groups
az group list --output table

# List resources in a group
az resource list --resource-group datingapp-dev-rg --output table
```

### Terraform Commands
```powershell
# Initialize
terraform init

# Validate
terraform validate

# Plan
terraform plan -var-file=envs/dev.tfvars

# Apply
terraform apply -var-file=envs/dev.tfvars

# Show current state
terraform show

# List resources
terraform state list

# Output values
terraform output
```

### Kubernetes Commands
```powershell
# Get credentials
az aks get-credentials --resource-group datingapp-dev-rg --name datingapp-dev-aks

# View nodes
kubectl get nodes

# View all resources
kubectl get all -A

# View logs
kubectl logs -n datingapp -l app=dating-api --tail=100

# Execute command in pod
kubectl exec -it <pod-name> -n datingapp -- /bin/bash
```

## Next Steps

After successful deployment:

1. **Access Azure Portal**
   - https://portal.azure.com
   - Search for "datingapp-dev-rg"
   - Explore deployed resources

2. **Monitor Application**
   - Navigate to Application Insights
   - View live metrics, logs, and traces

3. **Deploy Applications**
   - See `infrastructure/helm/` directory
   - Run: `gh workflow run helm-deploy.yml -f environment=dev`

4. **Set up CI/CD**
   - GitHub Actions workflows are already configured
   - Every push to main triggers automated tests
   - Manual approval required for deployments

## Estimated Costs

- **Development Environment**: ~$150/month
- Can be reduced by stopping/starting AKS cluster when not in use

## Support

- **Documentation**: `infrastructure/docs/`
- **Issues**: https://github.com/oks-citadel/World-Class-Dating-App-Platform/issues
- **Scripts README**: `infrastructure/scripts/README.md`
