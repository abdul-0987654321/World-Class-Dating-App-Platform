# =============================================================================
# Flamoral Dating Platform - Root Terraform Backend Configuration
# =============================================================================
# This file configures remote state storage in Azure Storage Account.
#
# IMPORTANT: This backend configuration is for managing infrastructure at the
# root level. Each environment (dev/staging/prod) has its own backend config.
#
# For environment-specific deployments, use the backend.tf in each environment:
#   - environments/dev/backend.tf
#   - environments/staging/backend.tf
#   - environments/prod/backend.tf
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
  backend "azurerm" {
    resource_group_name  = "flamoral-tfstate-rg"
    storage_account_name = "flamoraltfstate"
    container_name       = "tfstate"
    key                  = "flamoral-shared.terraform.tfstate"
  }
}

# =============================================================================
# IMPORTANT: Prerequisites for Backend Storage
# =============================================================================
# Before using this backend, the storage account must exist. Run:
#
# az group create --name flamoral-tfstate-rg --location eastus
# az storage account create \
#   --name flamoraltfstate \
#   --resource-group flamoral-tfstate-rg \
#   --location eastus \
#   --sku Standard_LRS \
#   --encryption-services blob
# az storage container create \
#   --name tfstate \
#   --account-name flamoraltfstate
# =============================================================================
