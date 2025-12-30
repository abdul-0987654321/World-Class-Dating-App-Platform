# ============================================================================
# FLAMORAL IDENTITY MODULE - PROVIDER CONFIGURATION
# ============================================================================
#
# This file documents the required providers for the identity module.
# Providers should be configured in the root/environment module that
# calls this identity module, not within the module itself.
#
# The identity module requires the following providers to be configured:
# - azuread: For Azure AD groups and app registrations
# - random: For generating UUIDs for scopes and roles
# ============================================================================

# ============================================================================
# PROVIDER REQUIREMENTS
# ============================================================================
#
# These providers must be configured in the calling module (e.g., environments/prod)
# with appropriate authentication credentials.
#
# Example provider configuration in the root module:
#
# provider "azuread" {
#   tenant_id = var.tenant_id
#   # Authentication can be via:
#   # - Service Principal with client_id and client_secret
#   # - Azure CLI (az login)
#   # - Managed Identity (when running in Azure)
#   # - OIDC (for GitHub Actions)
# }
#
# ============================================================================

# Note: The terraform {} block with required_providers is defined in main.tf
# to keep all resource definitions together with their provider requirements.

# ============================================================================
# IMPORTANT: PROVIDER AUTHENTICATION
# ============================================================================
#
# For CI/CD pipelines (GitHub Actions, Azure DevOps):
# - Use OIDC authentication with federated credentials
# - Set ARM_TENANT_ID, ARM_CLIENT_ID, ARM_SUBSCRIPTION_ID environment variables
# - For OIDC: Set ARM_USE_OIDC=true
#
# For local development:
# - Use Azure CLI authentication: az login
# - Ensure you have appropriate permissions in Azure AD
#
# Required Azure AD Permissions for Terraform Service Principal:
# - Application.ReadWrite.All (to manage app registrations)
# - Group.ReadWrite.All (to manage security groups)
# - Directory.ReadWrite.All (to assign app roles to groups)
# - RoleManagement.ReadWrite.Directory (for role-assignable groups)
#
# ============================================================================
