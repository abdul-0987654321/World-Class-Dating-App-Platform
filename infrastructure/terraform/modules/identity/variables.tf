# ============================================================================
# FLAMORAL IDENTITY MODULE - VARIABLES
# ============================================================================
#
# This file defines all input variables for the identity module.
# Required variables must be provided when calling the module.
# Optional variables have sensible defaults.
# ============================================================================

# ============================================================================
# REQUIRED VARIABLES
# ============================================================================

variable "tenant_id" {
  type        = string
  description = "Azure AD Tenant ID (B2C tenant)"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "api_app_identifier" {
  type        = string
  description = "API Application identifier URI (e.g., api://flamoral-api-prod)"
}

# ============================================================================
# OPTIONAL VARIABLES - NAMING AND PREFIXES
# ============================================================================

variable "project_name" {
  type        = string
  description = "Project name"
  default     = "flamoral"
}

variable "group_name_prefix" {
  type        = string
  description = "Prefix for security group names (e.g., 'saas' creates 'saas-free-prod')"
  default     = "saas"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.group_name_prefix))
    error_message = "Group name prefix must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

# ============================================================================
# B2C CONFIGURATION
# ============================================================================

variable "b2c_tenant_id" {
  type        = string
  description = "Microsoft Entra ID B2C Tenant ID (if different from tenant_id)"
  default     = ""
}

variable "b2c_tenant_name" {
  type        = string
  description = "B2C Tenant name (e.g., flamoralb2c) - used for issuer URL construction"
  default     = ""
}

# ============================================================================
# APP REGISTRATION CONFIGURATION
# ============================================================================

variable "web_app_redirect_uris" {
  type        = list(string)
  description = "Web application redirect URIs for OAuth flow"
  default     = []
}

variable "spa_redirect_uris" {
  type        = list(string)
  description = "Single Page Application redirect URIs for OAuth flow"
  default     = []
}

variable "app_owners" {
  type        = list(string)
  description = "List of Azure AD object IDs to set as owners of the app registrations"
  default     = []
}

# ============================================================================
# SECURITY GROUPS CONFIGURATION
# ============================================================================

variable "create_security_groups" {
  type        = bool
  description = "Whether to create security groups (set false if groups already exist in Azure AD)"
  default     = true
}

variable "enable_dynamic_membership" {
  type        = bool
  description = "Whether to enable dynamic membership rules for groups (requires Azure AD P1/P2)"
  default     = false
}

variable "enable_role_assignments" {
  type        = bool
  description = "Whether to create app role assignments mapping groups to API roles"
  default     = true
}

# ============================================================================
# FEATURE FLAGS
# ============================================================================

variable "enable_automation_app" {
  type        = bool
  description = "Whether to create the automation app registration for group-sync"
  default     = true
}

# ============================================================================
# TAGS
# ============================================================================

variable "tags" {
  type        = map(string)
  description = "Resource tags to apply to all resources"
  default     = {}
}
