# Backend Configuration & Authentication Recommendations

## Dating-dev Environment - Terraform State Management

This document provides recommendations for authenticating and handling state locking using the specified Service Principal (`terraform-datingapp-sp`).

---

## Service Principal Details

| Property | Value |
|----------|-------|
| **Service Principal Name** | `terraform-datingapp-sp` |
| **Service Principal ID (Client ID)** | `a85e4029-4e37-4399-9390-6e18922b38e7` |
| **Target Subscription ID** | `ba233460-2dbe-4603-a594-68f93ec9deb3` |
| **Target Resource Group** | `Dating-dev-rg` |

---

## Authentication Methods

### Method 1: Environment Variables (Recommended for Local Development)

Set the following environment variables before running Terraform commands:

**Linux/macOS (Bash):**
```bash
export ARM_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
export ARM_CLIENT_SECRET="<your-service-principal-secret>"
export ARM_TENANT_ID="<your-azure-ad-tenant-id>"
export ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
```

**Windows (PowerShell):**
```powershell
$env:ARM_CLIENT_ID = "a85e4029-4e37-4399-9390-6e18922b38e7"
$env:ARM_CLIENT_SECRET = "<your-service-principal-secret>"
$env:ARM_TENANT_ID = "<your-azure-ad-tenant-id>"
$env:ARM_SUBSCRIPTION_ID = "ba233460-2dbe-4603-a594-68f93ec9deb3"
```

**Windows (CMD):**
```cmd
set ARM_CLIENT_ID=a85e4029-4e37-4399-9390-6e18922b38e7
set ARM_CLIENT_SECRET=<your-service-principal-secret>
set ARM_TENANT_ID=<your-azure-ad-tenant-id>
set ARM_SUBSCRIPTION_ID=ba233460-2dbe-4603-a594-68f93ec9deb3
```

### Method 2: Azure CLI Authentication (Interactive Development)

For interactive development, authenticate using Azure CLI:

```bash
# Login with your Azure account
az login

# Set the subscription context
az account set --subscription "ba233460-2dbe-4603-a594-68f93ec9deb3"

# Verify the current context
az account show
```

Note: Terraform will automatically use Azure CLI credentials if ARM_* environment variables are not set.

### Method 3: OIDC Authentication (Recommended for CI/CD - GitHub Actions)

For GitHub Actions, use OpenID Connect (OIDC) for secure, secretless authentication:

1. **Configure Azure AD App Registration** for OIDC with GitHub:
   ```bash
   # Add federated credential to the service principal
   az ad app federated-credential create \
     --id <application-object-id> \
     --parameters '{
       "name": "github-actions-dating-dev",
       "issuer": "https://token.actions.githubusercontent.com",
       "subject": "repo:<your-org>/<your-repo>:ref:refs/heads/main",
       "audiences": ["api://AzureADTokenExchange"]
     }'
   ```

2. **GitHub Actions Workflow Configuration:**
   ```yaml
   - name: Azure Login
     uses: azure/login@v1
     with:
       client-id: a85e4029-4e37-4399-9390-6e18922b38e7
       tenant-id: ${{ secrets.AZURE_TENANT_ID }}
       subscription-id: ba233460-2dbe-4603-a594-68f93ec9deb3
   ```

3. **Update backend.tf** to use OIDC:
   ```hcl
   terraform {
     backend "azurerm" {
       use_oidc = true
     }
   }
   ```

---

## State Storage Configuration

### Prerequisites: Create State Storage Account

Before running Terraform, create the storage account for state files:

**Using Azure CLI:**
```bash
# Create resource group for Terraform state
az group create \
  --name flamoral-tfstate-rg \
  --location westus2

# Create storage account
az storage account create \
  --name flamoraltfstatedev \
  --resource-group flamoral-tfstate-rg \
  --location westus2 \
  --sku Standard_LRS \
  --encryption-services blob

# Create blob container
az storage container create \
  --name tfstate \
  --account-name flamoraltfstatedev

# Enable versioning for state file protection
az storage account blob-service-properties update \
  --account-name flamoraltfstatedev \
  --resource-group flamoral-tfstate-rg \
  --enable-versioning true
```

### State Locking

The Azure backend automatically handles state locking using blob leases. This prevents concurrent modifications to the state file.

**How it works:**
- When Terraform begins an operation, it acquires a lease on the state blob
- Other Terraform processes attempting to access the state will wait or fail
- The lease is released when the operation completes

**Force-unlock (if needed):**
```bash
# Only use this if a Terraform operation was interrupted
terraform force-unlock <lock-id>
```

---

## Backend Configuration File (backend.tf)

The current backend configuration is:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "flamoral-tfstate-rg"
    storage_account_name = "flamoraltfstatedev"
    container_name       = "tfstate"
    key                  = "dating-dev.terraform.tfstate"
    use_oidc             = false  # Set to true for GitHub Actions OIDC
  }
}
```

---

## Required Service Principal Permissions

Ensure the Service Principal (`terraform-datingapp-sp`) has the following roles:

### At Subscription Level:
| Role | Purpose |
|------|---------|
| Contributor | Create and manage Azure resources |
| User Access Administrator | Assign roles to managed identities |

### At State Storage Account Level:
| Role | Purpose |
|------|---------|
| Storage Blob Data Contributor | Read/write state files |

**Assign roles using Azure CLI:**
```bash
# Get Service Principal Object ID
SP_OBJECT_ID=$(az ad sp show --id a85e4029-4e37-4399-9390-6e18922b38e7 --query id -o tsv)

# Assign Contributor role at subscription level
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Contributor" \
  --scope "/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3"

# Assign User Access Administrator for role assignments
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "User Access Administrator" \
  --scope "/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3"

# Assign Storage Blob Data Contributor for state storage
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3/resourceGroups/flamoral-tfstate-rg/providers/Microsoft.Storage/storageAccounts/flamoraltfstatedev"
```

---

## Running Terraform

### Initialize Backend

```bash
cd infrastructure/terraform/environments/dating-dev

# Initialize Terraform with backend
terraform init

# If reconfiguring backend
terraform init -reconfigure
```

### Plan and Apply

```bash
# Review planned changes
terraform plan -var-file=terraform.tfvars

# Apply changes
terraform apply -var-file=terraform.tfvars

# Apply with auto-approve (CI/CD)
terraform apply -var-file=terraform.tfvars -auto-approve
```

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** or secure secret managers for the client secret
3. **Rotate Service Principal credentials** regularly
4. **Enable Azure AD audit logging** to track authentication events
5. **Use separate Service Principals** for different environments
6. **Implement least-privilege access** - only grant necessary permissions

---

## Troubleshooting

### Common Issues

**1. Authentication Failed:**
```
Error: building AzureRM Client: obtain subscription
```
Solution: Verify ARM_* environment variables are set correctly.

**2. State Lock Acquisition Failed:**
```
Error acquiring the state lock
```
Solution: Another process may be holding the lock. Wait or use `terraform force-unlock`.

**3. Insufficient Permissions:**
```
Error: authorization failed
```
Solution: Verify the Service Principal has required role assignments.

**4. Backend Not Initialized:**
```
Error: Backend initialization required
```
Solution: Run `terraform init` before any other commands.
