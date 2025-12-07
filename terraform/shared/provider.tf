# Azure Provider Configuration
#
# Authentication is handled via environment variables:
#   ARM_CLIENT_ID       - Service Principal App ID
#   ARM_CLIENT_SECRET   - Service Principal Password
#   ARM_SUBSCRIPTION_ID - Azure Subscription ID
#   ARM_TENANT_ID       - Azure AD Tenant ID
#
# For local development, set these in your shell:
#   PowerShell: $env:ARM_CLIENT_ID = "your-client-id"
#   Bash:       export ARM_CLIENT_ID="your-client-id"

provider "azurerm" {
  features {
    # Key Vault features
    key_vault {
      # Purge soft-deleted key vaults on destroy
      purge_soft_delete_on_destroy    = false
      # Recover soft-deleted key vaults instead of failing
      recover_soft_deleted_key_vaults = true
    }

    # Resource Group features
    resource_group {
      # Prevent destruction of resource groups that contain resources
      prevent_deletion_if_contains_resources = true
    }

    # Virtual Machine features
    virtual_machine {
      # Delete OS disk automatically when VM is deleted
      delete_os_disk_on_deletion     = true
      # Graceful shutdown before deletion
      graceful_shutdown              = true
      # Skip graceful shutdown on forced deletion
      skip_shutdown_and_force_delete = false
    }

    # Log Analytics Workspace features
    log_analytics_workspace {
      # Permanently delete workspace on destroy
      permanently_delete_on_destroy = false
    }

    # API Management features
    api_management {
      # Purge soft-deleted API Management instances
      purge_soft_delete_on_destroy = false
      # Recover soft-deleted instances
      recover_soft_deleted         = true
    }

    # Application Insights features
    application_insights {
      # Disable generated alert rules
      disable_generated_rule = false
    }

    # Cognitive Services features
    cognitive_account {
      # Purge soft-deleted cognitive services
      purge_soft_delete_on_destroy = false
    }

    # Template deployment features
    template_deployment {
      # Delete nested items on destroy
      delete_nested_items_during_deletion = true
    }
  }

  # Skip provider registration if already registered
  skip_provider_registration = false

  # Storage account features for state management
  storage_use_azuread = true
}

# Azure AD Provider for managing identities and service principals
provider "azuread" {
  # Uses the same authentication as azurerm provider
}

# Random provider for generating unique names
provider "random" {
}
