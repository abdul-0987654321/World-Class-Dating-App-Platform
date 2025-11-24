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

variable "cosmos_kind" {
  description = "CosmosDB kind (GlobalDocumentDB or MongoDB)"
  type        = string
  default     = "GlobalDocumentDB"
}

variable "consistency_level" {
  description = "Consistency level (BoundedStaleness, Eventual, Session, Strong, ConsistentPrefix)"
  type        = string
  default     = "Session"
}

variable "secondary_location" {
  description = "Secondary region for geo-replication (prod only)"
  type        = string
  default     = ""
}

variable "enable_public_access" {
  description = "Enable public network access"
  type        = bool
  default     = false
}

variable "aks_subnet_id" {
  description = "AKS subnet ID for VNet rule"
  type        = string
}

variable "allowed_ip_addresses" {
  description = "Allowed IP addresses"
  type        = list(string)
  default     = []
}

variable "backup_type" {
  description = "Backup type (Continuous or Periodic)"
  type        = string
  default     = "Periodic"
}

variable "backup_interval_minutes" {
  description = "Backup interval in minutes (for Periodic)"
  type        = number
  default     = 240
}

variable "backup_retention_hours" {
  description = "Backup retention in hours (for Periodic)"
  type        = number
  default     = 720
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint for CosmosDB"
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
