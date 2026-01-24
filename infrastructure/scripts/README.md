# Infrastructure Deployment Scripts

Automated scripts to deploy the World-Class Dating App infrastructure to Azure.

## Prerequisites

### Required Tools

1. **Azure CLI** (v2.50.0+)
   - Windows: Download from https://aka.ms/installazurecliwindows
   - Mac: `brew install azure-cli`
   - Linux: `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash`

2. **Terraform** (v1.6.0+)
   - Windows: `choco install terraform` or download from https://www.terraform.io/downloads
   - Mac: `brew install terraform`
   - Linux: Download from https://www.terraform.io/downloads

3. **GitHub CLI** (for CI/CD setup)
   - Windows: `winget install GitHub.cli`
   - Mac: `brew install gh`
   - Linux: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md

4. **kubectl** (v1.28.0+) - for Kubernetes management
   - Windows: `choco install kubernetes-cli`
   - Mac: `brew install kubectl`
   - Linux: `sudo snap install kubectl --classic`

5. **Helm** (v3.13.0+) - for application deployment
   - Windows: `choco install kubernetes-helm`
   - Mac: `brew install helm`
   - Linux: `sudo snap install helm --classic`

### Verify Installations

```bash
# Check versions
terraform version
az version
gh --version
kubectl version --client
helm version
```

## Deployment Steps

### Step 1: Setup Terraform Backend

Creates Azure Storage Account for Terraform remote state.

```bash
# Login to Azure first
az login

# Run the script
cd infrastructure/scripts
chmod +x 01-setup-backend.sh
./01-setup-backend.sh
```

**What it does:**

- Creates resource group: `datingapp-tfstate-rg`
- Creates storage account: `datingapptfstate`
- Creates blob container: `tfstate`
- Location: `eastus`

**Expected time:** 2-3 minutes

### Step 2: Configure GitHub Secrets

Sets up OIDC authentication for GitHub Actions to deploy infrastructure.

```bash
# Login to GitHub first
gh auth login

# Run the script
./02-setup-github-secrets.sh
```

**What it does:**

- Creates Azure service principal: `datingapp-github-actions`
- Configures OIDC federated credentials
- Sets GitHub secrets:
  - `AZURE_CLIENT_ID`
  - `AZURE_TENANT_ID`
  - `AZURE_SUBSCRIPTION_ID`

**Expected time:** 2-3 minutes

### Step 3: Deploy Development Environment

Deploys the full infrastructure stack to Azure.

```bash
./03-deploy-dev-environment.sh
```

**What it deploys:**

- Azure Virtual Network (10.0.0.0/16)
- AKS Cluster (3-20 nodes, autoscaling)
- PostgreSQL Flexible Server
- Redis Premium Cache
- CosmosDB account
- Storage Account + CDN
- SignalR Service
- Key Vault
- Front Door + WAF
- Application Insights + Log Analytics

**Expected time:** 25-35 minutes

**Estimated cost:** ~$150/month

### Step 4: Verify Deployment

Check that all resources are deployed correctly.

```bash
# Get AKS credentials
az aks get-credentials --resource-group datingapp-dev-rg --name datingapp-dev-aks

# Verify cluster
kubectl get nodes
kubectl get namespaces

# Check all resources
az resource list --resource-group datingapp-dev-rg --output table
```

## Alternative: Manual Deployment

If you prefer to run commands manually:

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Review plan
terraform plan -var-file=envs/dev.tfvars

# Apply infrastructure
terraform apply -var-file=envs/dev.tfvars

# Get outputs
terraform output
```

## Alternative: GitHub Actions Deployment

Deploy via GitHub Actions (recommended for production):

```bash
# Trigger deployment workflow
gh workflow run terraform-apply.yml \
  -f environment=dev \
  -f auto_approve=true

# Monitor workflow
gh run watch

# Or view in browser
gh workflow view terraform-apply.yml --web
```

## Script Details

### 01-setup-backend.sh

**Purpose:** Create Terraform remote state storage

**Requirements:**

- Azure CLI installed and authenticated
- Contributor permissions on subscription

**Actions:**

1. Checks Azure authentication
2. Creates resource group for Terraform state
3. Creates storage account with blob encryption
4. Creates container for state files

**Idempotent:** Yes (safe to run multiple times)

### 02-setup-github-secrets.sh

**Purpose:** Configure GitHub Actions OIDC authentication

**Requirements:**

- Azure CLI installed and authenticated
- GitHub CLI installed and authenticated
- Admin access to GitHub repository

**Actions:**

1. Creates Azure service principal
2. Configures OIDC federated credentials for main branch
3. Configures OIDC federated credentials for PRs
4. Sets GitHub repository secrets

**Idempotent:** Yes (safe to run multiple times)

### 03-deploy-dev-environment.sh

**Purpose:** Deploy complete infrastructure stack

**Requirements:**

- Terraform installed
- Azure CLI authenticated
- Backend storage created (script 01)

**Actions:**

1. Initializes Terraform with remote backend
2. Validates configuration
3. Creates deployment plan
4. Prompts for confirmation
5. Applies infrastructure changes

**Idempotent:** Yes (Terraform detects existing resources)

**Destroys nothing:** Only creates/updates resources

## Troubleshooting

### Azure CLI Not Found

```bash
# Windows (PowerShell as Administrator)
winget install Microsoft.AzureCLI

# Or download installer
# https://aka.ms/installazurecliwindows

# Mac
brew install azure-cli

# Verify
az version
```

### Terraform Not Found

```bash
# Windows
choco install terraform

# Mac
brew install terraform

# Verify
terraform version
```

### GitHub CLI Not Found

```bash
# Windows
winget install GitHub.cli

# Mac
brew install gh

# Verify
gh --version
```

### "Not Authenticated with Azure"

```bash
# Login
az login

# Select subscription
az account list --output table
az account set --subscription "<subscription-id>"

# Verify
az account show
```

### "Not Authenticated with GitHub"

```bash
# Login
gh auth login

# Follow prompts to authenticate

# Verify
gh auth status
```

### "Permission Denied" on Scripts

```bash
# Make scripts executable (Git Bash / Linux / Mac)
chmod +x *.sh

# Or run with bash explicitly
bash 01-setup-backend.sh
```

### Terraform Backend Initialization Failed

```bash
# Ensure backend storage exists
az storage account show --name datingapptfstate --resource-group datingapp-tfstate-rg

# If not, run:
./scripts/01-setup-backend.sh

# Then try again:
cd infrastructure
terraform init
```

### "Resource Already Exists" Error

This is expected if re-running scripts. Terraform and the scripts are designed to be idempotent (safe to run multiple times).

### Insufficient Permissions

Ensure your Azure account has:

- Contributor role on subscription (for creating resources)
- User Access Administrator role (for creating service principals)

```bash
# Check your permissions
az role assignment list --assignee $(az account show --query user.name -o tsv)
```

## Cost Management

### Development Environment (~$150/month)

- AKS: ~$70/month (3 nodes)
- PostgreSQL: ~$25/month
- Redis: ~$15/month
- CosmosDB: ~$10/month
- Storage + CDN: ~$10/month
- Other services: ~$20/month

### Reducing Costs

```bash
# Stop AKS cluster when not in use
az aks stop --resource-group datingapp-dev-rg --name datingapp-dev-aks

# Start when needed
az aks start --resource-group datingapp-dev-rg --name datingapp-dev-aks

# Scale down node count
az aks scale --resource-group datingapp-dev-rg --name datingapp-dev-aks --node-count 1
```

### Destroying Environment

**WARNING:** This will delete all resources and data.

```bash
cd infrastructure
terraform destroy -var-file=envs/dev.tfvars
```

## Next Steps After Deployment

1. **Get AKS Access**

   ```bash
   az aks get-credentials --resource-group datingapp-dev-rg --name datingapp-dev-aks
   kubectl get nodes
   ```

2. **Deploy Applications**

   ```bash
   # Via Helm
   helm install dating-api ./helm/dating-api --namespace datingapp --create-namespace

   # Or via GitHub Actions
   gh workflow run helm-deploy.yml -f environment=dev
   ```

3. **Access Monitoring**
   - Navigate to Azure Portal
   - Search for "datingapp-dev-appinsights"
   - View performance metrics, logs, and traces

4. **Run Database Migrations**
   ```bash
   kubectl run -it --rm migrate --image=your-migrations-image --restart=Never -- npm run migrate
   ```

## Support

- **Documentation**: `infrastructure/docs/`
- **Runbooks**: `infrastructure/runbooks/`
- **Issues**: https://github.com/oks-citadel/World-Class-Dating-App-Platform/issues

## Security Notes

- Never commit Azure credentials to git
- GitHub secrets are encrypted at rest
- OIDC authentication eliminates need for long-lived credentials
- All scripts check for existing resources before creating
- Service principal has minimal required permissions (Contributor on subscription)

## Environment Variables

Scripts will use these if set:

```bash
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_TENANT_ID="your-tenant-id"
export TF_VAR_environment="dev"
```

## Stripe Products Setup

The `setup-stripe-products.js` script creates subscription products and prices in Stripe.

### Prerequisites

1. **Node.js** (v20.0.0+)
2. **Stripe Account** with API access
3. **Stripe Secret Key** (starts with `sk_live_` or `sk_test_`)

### Running the Script

```bash
# Navigate to project root
cd World-Class-Dating-App-Platform

# Install Stripe dependency (if not already installed)
npm install stripe

# Option 1: Dry run first (recommended) - preview what will be created
# Windows (PowerShell)
$env:STRIPE_SECRET_KEY="sk_live_your_key_here"
$env:DRY_RUN="true"
node infrastructure/scripts/setup-stripe-products.js

# Windows (Command Prompt)
set STRIPE_SECRET_KEY=sk_live_your_key_here
set DRY_RUN=true
node infrastructure/scripts/setup-stripe-products.js

# Linux/Mac
STRIPE_SECRET_KEY=sk_live_your_key_here DRY_RUN=true node infrastructure/scripts/setup-stripe-products.js

# Option 2: Create actual products (live)
# Windows (PowerShell)
$env:STRIPE_SECRET_KEY="sk_live_your_key_here"
node infrastructure/scripts/setup-stripe-products.js

# Windows (Command Prompt)
set STRIPE_SECRET_KEY=sk_live_your_key_here
node infrastructure/scripts/setup-stripe-products.js

# Linux/Mac
STRIPE_SECRET_KEY=sk_live_your_key_here node infrastructure/scripts/setup-stripe-products.js
```

### What It Creates

| Tier     | Price        | Product           |
| -------- | ------------ | ----------------- |
| Basic    | $9.99/month  | Flamoral Basic    |
| Plus     | $19.99/month | Flamoral Plus     |
| Premium  | $29.99/month | Flamoral Premium  |
| Premium+ | $39.99/month | Flamoral Premium+ |
| Elite    | $59.99/month | Flamoral Elite    |

### Script Features

- **Idempotent**: Safe to run multiple times - detects existing products/prices
- **Dry Run Mode**: Preview changes without creating anything
- **Metadata**: Products include tier metadata and marketing features
- **Output**: Generates environment variables ready to copy/paste

### After Running

The script outputs environment variables to add to your configuration:

```bash
# Add to .env or Azure Key Vault
STRIPE_PRODUCT_BASIC=prod_xxxxx
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRODUCT_PLUS=prod_xxxxx
STRIPE_PRICE_PLUS=price_xxxxx
STRIPE_PRODUCT_PREMIUM=prod_xxxxx
STRIPE_PRICE_PREMIUM=price_xxxxx
STRIPE_PRODUCT_PREMIUM_PLUS=prod_xxxxx
STRIPE_PRICE_PREMIUM_PLUS=price_xxxxx
STRIPE_PRODUCT_ELITE=prod_xxxxx
STRIPE_PRICE_ELITE=price_xxxxx
```

### TypeScript Version

A TypeScript version is also available at `setup-stripe-products.ts`. Run with:

```bash
npx ts-node infrastructure/scripts/setup-stripe-products.ts
```
