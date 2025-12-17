# Variables for Cost Management Module

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "env" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}

# ========================================
# BUDGET CONFIGURATION
# ========================================

variable "overall_monthly_budget" {
  description = "Overall monthly budget for the subscription (USD)"
  type        = number
  default     = 2500
}

variable "compute_monthly_budget" {
  description = "Monthly budget for compute resources (AKS, VMs)"
  type        = number
  default     = 600
}

variable "storage_monthly_budget" {
  description = "Monthly budget for storage resources"
  type        = number
  default     = 200
}

variable "networking_monthly_budget" {
  description = "Monthly budget for networking resources (Front Door, bandwidth)"
  type        = number
  default     = 400
}

variable "database_monthly_budget" {
  description = "Monthly budget for database resources (PostgreSQL, Redis, SignalR)"
  type        = number
  default     = 800
}

# ========================================
# NOTIFICATION CONFIGURATION
# ========================================

variable "notification_emails" {
  description = "List of email addresses to receive budget alerts"
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.notification_emails) > 0
    error_message = "At least one notification email must be provided."
  }
}

# ========================================
# COST ALLOCATION TAGS
# ========================================

variable "cost_center" {
  description = "Cost center for billing attribution"
  type        = string
  default     = "engineering"
}

variable "billing_owner" {
  description = "Team or person responsible for costs"
  type        = string
  default     = "platform-team"
}

variable "team" {
  description = "Team name for cost allocation"
  type        = string
  default     = "platform"
}

# ========================================
# FEATURE FLAGS
# ========================================

variable "enable_cost_export" {
  description = "Enable cost data export to storage account"
  type        = bool
  default     = true
}

variable "enforce_tagging_policy" {
  description = "Enforce required tags on all resources"
  type        = bool
  default     = true
}

# ========================================
# COST EXPORT CONFIGURATION
# ========================================

variable "cost_export_retention_days" {
  description = "Number of days to retain cost export data"
  type        = number
  default     = 365
}

variable "cost_export_schedule" {
  description = "Schedule for cost exports (Daily, Weekly, Monthly)"
  type        = string
  default     = "Daily"

  validation {
    condition     = contains(["Daily", "Weekly", "Monthly"], var.cost_export_schedule)
    error_message = "Cost export schedule must be Daily, Weekly, or Monthly."
  }
}
