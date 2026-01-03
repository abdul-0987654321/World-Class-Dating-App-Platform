/**
 * AWS Budgets Module Variables
 */

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "monthly_budget_amount" {
  description = "Monthly budget limit in USD"
  type        = string
  default     = "1000"
}

variable "budget_start_date" {
  description = "Budget start date (YYYY-MM-DD_HH:MM format)"
  type        = string
  default     = "2024-01-01_00:00"
}

variable "alert_email_addresses" {
  description = "Email addresses to receive budget alerts"
  type        = list(string)
  default     = []
}

variable "alert_sns_topic_arns" {
  description = "SNS topic ARNs to receive budget alerts"
  type        = list(string)
  default     = []
}

variable "create_service_budgets" {
  description = "Create individual service budgets"
  type        = bool
  default     = true
}

variable "eks_budget_amount" {
  description = "Monthly budget for EKS in USD"
  type        = string
  default     = "300"
}

variable "rds_budget_amount" {
  description = "Monthly budget for RDS in USD"
  type        = string
  default     = "200"
}

variable "s3_budget_amount" {
  description = "Monthly budget for S3 in USD"
  type        = string
  default     = "100"
}

variable "data_transfer_budget_amount" {
  description = "Monthly budget for data transfer in USD"
  type        = string
  default     = "100"
}

variable "create_usage_budgets" {
  description = "Create usage-based budgets"
  type        = bool
  default     = false
}

variable "ec2_hours_limit" {
  description = "Monthly EC2 hours limit"
  type        = string
  default     = "1000"
}

variable "enable_budget_actions" {
  description = "Enable automatic budget actions (e.g., stop instances)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
