# Test Environment - Variables
# DatingPlatform Infrastructure

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "test"

  validation {
    condition     = var.environment == "test"
    error_message = "This configuration is for the test environment only."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "westus2"
}

variable "resource_name_prefix" {
  description = "Prefix for resource names"
  type        = string
  default     = "datingplatform"
}

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  default     = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
}

variable "tenant_id" {
  description = "Azure AD Tenant ID"
  type        = string
  default     = ""
}

variable "app_service_sku" {
  description = "SKU for App Service Plan"
  type        = string
  default     = "S1"

  validation {
    condition     = contains(["S1", "S2", "S3", "P1v2"], var.app_service_sku)
    error_message = "App Service SKU must be S1, S2, S3, or P1v2 for test."
  }
}

variable "sql_sku" {
  description = "SKU for SQL Database"
  type        = string
  default     = "S0"
}

variable "sql_max_size_gb" {
  description = "Maximum size of SQL Database in GB"
  type        = number
  default     = 10
}

variable "sql_admin_username" {
  description = "SQL Server administrator username"
  type        = string
  default     = "sqladmin"
}

variable "sql_admin_password" {
  description = "SQL Server administrator password (set via TF_VAR_sql_admin_password env var)"
  type        = string
  sensitive   = true
  default     = ""  # Must be set via environment variable or pipeline secret
}

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Standard"
}

variable "log_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 60

  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 120
    error_message = "Log retention must be between 30 and 120 days for test."
  }
}

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
