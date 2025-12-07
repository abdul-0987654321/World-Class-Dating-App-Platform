# Production Environment - Variables
# DatingPlatform Infrastructure

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"

  validation {
    condition     = var.environment == "prod"
    error_message = "This configuration is for the prod environment only."
  }
}

variable "location" {
  description = "Azure region for resources (primary)"
  type        = string
  default     = "westus2"
}

variable "secondary_location" {
  description = "Azure region for disaster recovery"
  type        = string
  default     = "eastus2"
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
  default     = "P1v3"

  validation {
    condition     = contains(["P1v3", "P2v3", "P3v3"], var.app_service_sku)
    error_message = "App Service SKU must be P1v3, P2v3, or P3v3 for production."
  }
}

variable "sql_sku" {
  description = "SKU for SQL Database"
  type        = string
  default     = "S3"
}

variable "sql_max_size_gb" {
  description = "Maximum size of SQL Database in GB"
  type        = number
  default     = 100
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

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Premium"
}

variable "log_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 90

  validation {
    condition     = var.log_retention_days >= 90 && var.log_retention_days <= 730
    error_message = "Log retention must be at least 90 days for production compliance."
  }
}

variable "enable_geo_replication" {
  description = "Enable geo-replication for databases"
  type        = bool
  default     = true
}

variable "enable_ddos_protection" {
  description = "Enable DDoS protection"
  type        = bool
  default     = true
}

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
