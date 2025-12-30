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

variable "log_analytics_sku" {
  description = "Log Analytics SKU (Free, PerGB2018, PerNode, Premium, Standalone, Standard)"
  type        = string
  default     = "PerGB2018"
}

variable "log_retention_days" {
  description = "Log retention in days"
  type        = number
  default     = 90
}

variable "daily_quota_gb" {
  description = "Daily ingestion quota in GB (-1 for unlimited)"
  type        = number
  default     = -1
}

variable "appinsights_retention_days" {
  description = "Application Insights retention in days"
  type        = number
  default     = 90
}

variable "appinsights_daily_cap_gb" {
  description = "Application Insights daily cap in GB"
  type        = number
  default     = 10
}

variable "enable_alerts" {
  description = "Enable metric and query alerts"
  type        = bool
  default     = true
}

variable "alert_resource_scopes" {
  description = "Resource IDs to monitor for alerts"
  type        = list(string)
  default     = []
}

variable "alert_email_receivers" {
  description = "Email receivers for alerts"
  type = list(object({
    name  = string
    email = string
  }))
  default = []
}

variable "alert_webhook_receivers" {
  description = "Webhook receivers for alerts"
  type = list(object({
    name = string
    uri  = string
  }))
  default = []
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
