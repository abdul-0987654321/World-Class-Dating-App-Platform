# =============================================================================
# Flamoral Dating Platform - Shared ACR Module Variables
# =============================================================================

variable "resource_group_name" {
  description = "Name of the resource group for shared resources"
  type        = string
  default     = "flamoral-shared-rg"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westus2"
}

variable "acr_name" {
  description = "Base name for ACR (will have random suffix appended)"
  type        = string
  default     = "flamoralacr"
}

variable "acr_sku" {
  description = "SKU for ACR (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "ACR SKU must be Basic, Standard, or Premium."
  }
}

variable "admin_enabled" {
  description = "Enable admin user"
  type        = bool
  default     = true
}

variable "georeplications" {
  description = "Geo-replication locations for Premium SKU"
  type = list(object({
    location                = string
    zone_redundancy_enabled = bool
  }))
  default = []
}

variable "allowed_subnet_ids" {
  description = "List of subnet IDs allowed to access ACR"
  type        = list(string)
  default     = []
}

variable "retention_days" {
  description = "Number of days to retain untagged manifests"
  type        = number
  default     = 7
}

variable "retention_enabled" {
  description = "Enable retention policy"
  type        = bool
  default     = true
}

variable "trust_policy_enabled" {
  description = "Enable trust policy for signed images"
  type        = bool
  default     = false
}

variable "cicd_service_principal_id" {
  description = "Service Principal Object ID for CI/CD push access"
  type        = string
  default     = ""
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for diagnostics"
  type        = string
  default     = ""
}

variable "webhooks" {
  description = "Map of webhooks to create"
  type = map(object({
    service_uri    = string
    status         = string
    scope          = string
    actions        = list(string)
    custom_headers = map(string)
  }))
  default = {}
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project     = "Flamoral"
    ManagedBy   = "Terraform"
    Component   = "Shared-ACR"
    Application = "Dating Platform"
  }
}
