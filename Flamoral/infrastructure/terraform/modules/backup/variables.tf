# Backup Module Variables

variable "prefix" {
  description = "Resource prefix"
  type        = string
}

variable "env" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "location" {
  description = "Primary Azure region"
  type        = string
}

variable "secondary_location" {
  description = "Secondary Azure region for DR"
  type        = string
  default     = "West US 2"
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "postgres_server_id" {
  description = "PostgreSQL Flexible Server ID"
  type        = string
}

variable "keyvault_id" {
  description = "Key Vault ID for secrets backup"
  type        = string
  default     = ""
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  type        = string
}

variable "allowed_ip_addresses" {
  description = "Allowed IP addresses for backup storage access"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "Allowed subnet IDs for backup storage access"
  type        = list(string)
  default     = []
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address for backup alerts"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
}

variable "enable_cross_region_replication" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = true
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint for backup storage"
  type        = bool
  default     = false
}

variable "enable_cmk_encryption" {
  description = "Enable customer-managed key encryption"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
