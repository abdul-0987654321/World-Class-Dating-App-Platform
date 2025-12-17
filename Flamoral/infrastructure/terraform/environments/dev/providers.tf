# =============================================================================
# Flamoral Dating Platform - Dating-dev Environment
# Provider Configuration
# =============================================================================
# Environment: Dating-dev
# Subscription ID: ba233460-2dbe-4603-a594-68f93ec9deb3
# Service Principal: terraform-datingapp-sp (a85e4029-4e37-4399-9390-6e18922b38e7)
# =============================================================================

# Note: The terraform block with required_version, required_providers, and
# backend configuration is defined in backend.tf to keep backend settings
# separate from provider configurations.

# =============================================================================
# Azure Resource Manager Provider
# =============================================================================
# Explicitly configured to target the Dating-dev subscription
# Authentication via Service Principal (terraform-datingapp-sp)
#
# Required Environment Variables:
#   ARM_CLIENT_ID     = "a85e4029-4e37-4399-9390-6e18922b38e7"
#   ARM_CLIENT_SECRET = "<your-service-principal-secret>"
#   ARM_TENANT_ID     = "<your-azure-ad-tenant-id>"
#   ARM_SUBSCRIPTION_ID = "ba233460-2dbe-4603-a594-68f93ec9deb3"
# =============================================================================
provider "azurerm" {
  features {
    # Key Vault configuration
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    # Resource Group configuration - allows destruction of non-empty RGs
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    # Virtual Machine configuration
    virtual_machine {
      delete_os_disk_on_deletion     = true
      graceful_shutdown              = false
      skip_shutdown_and_force_delete = false
    }
  }

  # Explicitly target the Dating-dev subscription
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id

  # Note: client_id and client_secret should be set via environment variables
  # for security reasons, not hardcoded in configuration files
}

# =============================================================================
# Azure Active Directory Provider
# =============================================================================
# Used for managing Azure AD resources and service principal lookups
# =============================================================================
provider "azuread" {
  tenant_id = var.tenant_id
}
