# ============================================================================
# FLAMORAL IDENTITY MODULE - VARIABLES
# ============================================================================

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  type        = string
  description = "Project name"
  default     = "flamoral"
}

variable "b2c_tenant_id" {
  type        = string
  description = "Microsoft Entra ID B2C Tenant ID"
  default     = ""
}

variable "b2c_tenant_name" {
  type        = string
  description = "B2C Tenant name (e.g., flamoralb2c)"
  default     = ""
}

# ============================================================================
# APP REGISTRATION CONFIGURATION
# ============================================================================

variable "api_app_identifier" {
  type        = string
  description = "API Application identifier URI (e.g., api://flamoral-api-prod)"
}

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

# ============================================================================
# SECURITY GROUPS CONFIGURATION
# ============================================================================

variable "create_security_groups" {
  type        = bool
  description = "Whether to create security groups (set false if already exist)"
  default     = true
}

# ============================================================================
# TAGS
# ============================================================================

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
