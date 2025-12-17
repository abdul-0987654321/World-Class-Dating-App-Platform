# =============================================================================
# Service-Specific Key Vaults Module - Variables
# =============================================================================

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "prefix" {
  description = "Prefix for resource names (e.g., flamoral)"
  type        = string
  default     = "flamoral"
}

variable "env" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "sku_name" {
  description = "SKU name for Key Vault (standard or premium)"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "SKU must be either 'standard' or 'premium'."
  }
}

variable "soft_delete_retention_days" {
  description = "Soft delete retention period in days (7-90)"
  type        = number
  default     = 90

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "Soft delete retention must be between 7 and 90 days."
  }
}

variable "enable_purge_protection" {
  description = "Enable purge protection (recommended for production)"
  type        = bool
  default     = true
}

variable "allowed_ip_addresses" {
  description = "List of IP addresses allowed to access Key Vault"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "List of subnet IDs allowed to access Key Vault"
  type        = list(string)
  default     = []
}

variable "aks_kubelet_identity_object_id" {
  description = "Object ID of AKS kubelet managed identity"
  type        = string
  default     = ""
}

variable "service_identities" {
  description = "Map of service names to their managed identity object IDs"
  type        = map(string)
  default     = {}
  # Example:
  # {
  #   "auth-service"         = "abc123..."
  #   "payment-service"      = "def456..."
  #   "user-service"         = "ghi789..."
  #   "matching-service"     = "jkl012..."
  #   "messaging-service"    = "mno345..."
  #   "notification-service" = "pqr678..."
  #   "media-service"        = "stu901..."
  #   "ai-service"           = "vwx234..."
  #   "api-gateway"          = "yza567..."
  #   "admin-service"        = "bcd890..."
  # }
}

variable "enable_private_endpoint" {
  description = "Enable private endpoints for Key Vaults"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoints"
  type        = string
  default     = ""
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = ""
}

variable "enable_alerts" {
  description = "Enable metric alerts for Key Vaults"
  type        = bool
  default     = false
}

variable "alert_action_group_id" {
  description = "Action group ID for alerts"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
