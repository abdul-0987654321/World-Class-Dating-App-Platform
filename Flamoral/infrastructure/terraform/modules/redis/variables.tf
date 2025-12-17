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

variable "subnet_id" {
  description = "ID of the subnet for Redis VNet integration"
  type        = string
}

variable "private_endpoint_subnet_id" {
  description = "ID of the subnet for private endpoint"
  type        = string
  default     = ""
}

variable "sku_name" {
  description = "SKU name (Basic, Standard, Premium)"
  type        = string
  default     = "Premium"
}

variable "family" {
  description = "SKU family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "P"
}

variable "capacity" {
  description = "SKU capacity"
  type        = number
  default     = 1
}

variable "maxmemory_reserved" {
  description = "Maxmemory reserved in MB"
  type        = number
  default     = 125
}

variable "maxmemory_delta" {
  description = "Maxmemory delta in MB"
  type        = number
  default     = 125
}

variable "backup_storage_connection_string" {
  description = "Storage connection string for RDB backups (prod only)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint for Redis"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
