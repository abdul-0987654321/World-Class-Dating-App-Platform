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

variable "sku_name" {
  description = "SKU name (standard or premium)"
  type        = string
  default     = "standard"
}

variable "soft_delete_retention_days" {
  description = "Soft delete retention period in days"
  type        = number
  default     = 90
}

variable "allowed_ip_addresses" {
  description = "Allowed IP addresses for Key Vault access"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "Allowed subnet IDs for Key Vault access"
  type        = list(string)
  default     = []
}

variable "aks_kubelet_identity_object_id" {
  description = "Object ID of AKS kubelet managed identity"
  type        = string
  default     = ""
}

variable "create_aks_role_assignment" {
  description = "Whether to create the AKS role assignment (set to false to avoid count depends on unknown value)"
  type        = bool
  default     = false
}

variable "postgres_connection_string" {
  description = "PostgreSQL connection string to store in Key Vault"
  type        = string
  default     = ""
  sensitive   = true
}

variable "redis_connection_string" {
  description = "Redis connection string to store in Key Vault"
  type        = string
  default     = ""
  sensitive   = true
}

variable "storage_connection_string" {
  description = "Storage connection string to store in Key Vault"
  type        = string
  default     = ""
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret (will be auto-generated if not provided)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint for Key Vault"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = ""
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
