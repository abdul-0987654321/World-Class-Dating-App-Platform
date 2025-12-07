variable "workspace_name" {
  description = "The name of the Log Analytics Workspace"
  type        = string
}

variable "app_insights_name" {
  description = "The name of the Application Insights instance"
  type        = string
}

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region where the monitoring resources will be created"
  type        = string
}

variable "retention_days" {
  description = "The number of days to retain logs in the workspace"
  type        = number
  default     = 30
  validation {
    condition     = var.retention_days >= 30 && var.retention_days <= 730
    error_message = "Retention days must be between 30 and 730."
  }
}

variable "environment" {
  description = "The environment name (dev, test, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}
