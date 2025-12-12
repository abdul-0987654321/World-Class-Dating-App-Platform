# =============================================================================
# Flamoral Dating Platform - Production Environment
# Terraform Settings and Backend Configuration
# =============================================================================
# This file configures Terraform version requirements, provider versions,
# and the remote state backend.
#
# Service Principal: terraform-datingapp-sp
# Service Principal ID: a85e4029-4e37-4399-9390-6e18922b38e7
# Target Subscription: ba233460-2dbe-4603-a594-68f93ec9deb3
# Resource Group: flamoral-prod-rg
# =============================================================================

terraform {
  # Terraform Version Requirement
  required_version = ">= 1.4"

  # Required Provider Versions
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Remote Backend Configuration for State Management
  # -------------------------------------------------------------------------
  # Uses Azure Blob Storage for state storage and locking
  # -------------------------------------------------------------------------
  backend "azurerm" {
    # Storage Account for Terraform State
    resource_group_name  = "flamoral-tfstate-rg"
    storage_account_name = "flamoraltfstateprod"
    container_name       = "tfstate"
    key                  = "flamoral-prod.terraform.tfstate"

    # Authentication Configuration
    # -----------------------------------------------------------------------
    # Option 1: Service Principal with environment variables (recommended)
    # Set these environment variables before running terraform:
    #
    # export ARM_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
    # export ARM_CLIENT_SECRET="<your-service-principal-secret>"
    # export ARM_TENANT_ID="<your-tenant-id>"
    # export ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
    #
    # Option 2: OIDC for GitHub Actions (set use_oidc = true)
    # -----------------------------------------------------------------------

    use_oidc = false
  }
}

# =============================================================================
# IMPORTANT: Prerequisites for Backend Storage
# =============================================================================
# Before using this backend, the storage account must exist. Run the following
# Azure CLI commands to create it:
#
# # Create resource group for Terraform state (if not exists)
# az group create --name flamoral-tfstate-rg --location eastus
#
# # Create storage account for production
# az storage account create \
#   --name flamoraltfstateprod \
#   --resource-group flamoral-tfstate-rg \
#   --location eastus \
#   --sku Standard_GRS \
#   --encryption-services blob
#
# # Create blob container
# az storage container create \
#   --name tfstate \
#   --account-name flamoraltfstateprod
#
# =============================================================================
