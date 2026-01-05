################################################################################
# Cost Management Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

################################################################################
# Anomaly Detection Configuration
################################################################################

variable "anomaly_threshold_percentage" {
  description = "Percentage threshold for cost anomaly detection (e.g., 10 means alert when costs exceed 10% of expected)"
  type        = number
  default     = 10

  validation {
    condition     = var.anomaly_threshold_percentage >= 1 && var.anomaly_threshold_percentage <= 100
    error_message = "Anomaly threshold percentage must be between 1 and 100."
  }
}

variable "anomaly_absolute_threshold" {
  description = "Absolute dollar threshold for cost anomaly detection (0 to disable)"
  type        = number
  default     = 100

  validation {
    condition     = var.anomaly_absolute_threshold >= 0
    error_message = "Anomaly absolute threshold must be non-negative."
  }
}

variable "anomaly_notification_frequency" {
  description = "Frequency of anomaly notifications (DAILY, IMMEDIATE, WEEKLY)"
  type        = string
  default     = "DAILY"

  validation {
    condition     = contains(["DAILY", "IMMEDIATE", "WEEKLY"], var.anomaly_notification_frequency)
    error_message = "Anomaly notification frequency must be one of: DAILY, IMMEDIATE, WEEKLY."
  }
}

variable "enable_linked_account_monitor" {
  description = "Enable monitoring for linked accounts (useful for AWS Organizations)"
  type        = bool
  default     = false
}

################################################################################
# Alert Configuration
################################################################################

variable "alert_email_addresses" {
  description = "List of email addresses to receive cost anomaly alerts"
  type        = list(string)

  validation {
    condition     = length(var.alert_email_addresses) > 0
    error_message = "At least one alert email address must be provided."
  }

  validation {
    condition     = alltrue([for email in var.alert_email_addresses : can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", email))])
    error_message = "All email addresses must be valid."
  }
}

################################################################################
# Monitored Services
################################################################################

variable "monitored_services" {
  description = "List of AWS services to create custom anomaly monitors for"
  type        = list(string)
  default = [
    "Amazon Elastic Compute Cloud - Compute",
    "Amazon Relational Database Service",
    "Amazon Simple Storage Service",
    "Amazon Elastic Kubernetes Service",
    "Amazon ElastiCache",
    "AWS Data Transfer"
  ]
}

################################################################################
# Cost Allocation Tags
################################################################################

variable "custom_cost_allocation_tags" {
  description = "List of custom tag keys to activate for cost allocation"
  type        = list(string)
  default     = []
}

################################################################################
# Dashboard Configuration
################################################################################

variable "create_cost_dashboard" {
  description = "Create CloudWatch dashboard for cost optimization"
  type        = bool
  default     = true
}

################################################################################
# Savings Plans Notifications
################################################################################

variable "enable_savings_plans_notifications" {
  description = "Enable Lambda function to send Savings Plans and RI recommendations"
  type        = bool
  default     = false
}

variable "savings_plans_notification_schedule" {
  description = "Cron expression for Savings Plans notification schedule"
  type        = string
  default     = "cron(0 9 ? * MON *)" # Every Monday at 9 AM UTC
}

variable "min_savings_threshold" {
  description = "Minimum monthly savings threshold to trigger recommendations (USD)"
  type        = number
  default     = 100

  validation {
    condition     = var.min_savings_threshold >= 0
    error_message = "Minimum savings threshold must be non-negative."
  }
}

################################################################################
# Cost Categories
################################################################################

variable "create_cost_categories" {
  description = "Create Cost Categories for advanced cost allocation"
  type        = bool
  default     = false
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources created by this module"
  type        = map(string)
  default     = {}
}
