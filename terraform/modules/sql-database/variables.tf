variable "server_name" {
  description = "The name of the SQL Server"
  type        = string
}

variable "database_name" {
  description = "The name of the SQL Database"
  type        = string
}

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region where the SQL Server will be created"
  type        = string
}

variable "sku_name" {
  description = "The SKU name for the database (e.g., Basic, S0, P1)"
  type        = string
  default     = "Basic"
}

variable "max_size_gb" {
  description = "The maximum size of the database in gigabytes"
  type        = number
  default     = 2
}

variable "environment" {
  description = "The environment name (dev, test, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}

variable "administrator_login" {
  description = "The administrator login for the SQL Server"
  type        = string
}

variable "administrator_password" {
  description = "The administrator password for the SQL Server"
  type        = string
  sensitive   = true
}

variable "storage_endpoint" {
  description = "Storage endpoint for vulnerability assessment (required for test/prod)"
  type        = string
  default     = ""
}

variable "storage_account_access_key" {
  description = "Storage account access key for vulnerability assessment (required for test/prod)"
  type        = string
  sensitive   = true
  default     = ""
}
