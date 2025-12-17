# Enhanced Variables for Storage Blob Module with Cost Optimization
# To use: Merge with existing variables.tf

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "env" {
  description = "Environment name"
  type        = string
}

variable "account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
}

variable "replication_type" {
  description = "Storage replication type (LRS for cost savings, ZRS/GRS for critical data)"
  type        = string
  default     = "LRS" # Changed from GRS to LRS for cost optimization
  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.replication_type)
    error_message = "Replication type must be one of: LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS."
  }
}

variable "enable_versioning" {
  description = "Enable blob versioning"
  type        = bool
  default     = true
}

variable "soft_delete_retention_days" {
  description = "Soft delete retention period in days (14 days recommended for cost optimization)"
  type        = number
  default     = 14 # Reduced from 30 to 14 for cost savings
  validation {
    condition     = var.soft_delete_retention_days >= 1 && var.soft_delete_retention_days <= 365
    error_message = "Soft delete retention days must be between 1 and 365."
  }
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}

variable "allowed_ip_addresses" {
  description = "Allowed IP addresses for storage access"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "Allowed subnet IDs for storage access"
  type        = list(string)
  default     = []
}

variable "enable_cdn" {
  description = "Enable CDN for storage (recommended for cost savings on bandwidth)"
  type        = bool
  default     = true
}

variable "cdn_sku" {
  description = "CDN SKU (Standard_Microsoft recommended for cost optimization)"
  type        = string
  default     = "Standard_Microsoft"
  validation {
    condition     = contains(["Standard_Microsoft", "Standard_Akamai", "Standard_Verizon", "Premium_Verizon"], var.cdn_sku)
    error_message = "CDN SKU must be one of: Standard_Microsoft, Standard_Akamai, Standard_Verizon, Premium_Verizon."
  }
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint for blob storage"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = ""
}

variable "enable_analytics" {
  description = "Enable storage analytics and inventory for access pattern analysis"
  type        = bool
  default     = true
}

variable "enable_lifecycle_management" {
  description = "Enable advanced lifecycle management policies"
  type        = bool
  default     = true
}

variable "infrastructure_encryption" {
  description = "Enable infrastructure encryption for additional security"
  type        = bool
  default     = true
}

variable "change_feed_retention_days" {
  description = "Change feed retention period in days"
  type        = number
  default     = 7
  validation {
    condition     = var.change_feed_retention_days >= 1 && var.change_feed_retention_days <= 146000
    error_message = "Change feed retention days must be between 1 and 146000."
  }
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
