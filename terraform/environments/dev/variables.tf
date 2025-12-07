# Development Environment - Variables
# DatingPlatform Infrastructure

# ====================
# Environment Configuration
# ====================

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"

  validation {
    condition     = var.environment == "dev"
    error_message = "This configuration is for the dev environment only."
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

# ====================
# Azure Configuration
# ====================

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  default     = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
}

variable "tenant_id" {
  description = "Azure AD Tenant ID"
  type        = string
  default     = ""  # Set via environment variable or tfvars
}

# ====================
# App Service Configuration
# ====================

variable "app_service_sku" {
  description = "SKU for App Service Plan"
  type        = string
  default     = "B1"  # Basic tier for development

  validation {
    condition     = contains(["B1", "B2", "B3", "S1"], var.app_service_sku)
    error_message = "App Service SKU must be B1, B2, B3, or S1 for development."
  }
}

# ====================
# SQL Database Configuration
# ====================

variable "sql_sku" {
  description = "SKU for SQL Database"
  type        = string
  default     = "Basic"
}

variable "sql_max_size_gb" {
  description = "Maximum size of SQL Database in GB"
  type        = number
  default     = 2
}

variable "sql_admin_username" {
  description = "SQL Server administrator username"
  type        = string
  default     = "sqladmin"
}

variable "sql_admin_password" {
  description = "SQL Server administrator password"
  type        = string
  sensitive   = true
}

# ====================
# Container Registry Configuration
# ====================

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Basic"
}

# ====================
# Monitoring Configuration
# ====================

variable "log_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 30

  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 90
    error_message = "Log retention must be between 30 and 90 days for development."
  }
}

# ====================
# Tags
# ====================

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
