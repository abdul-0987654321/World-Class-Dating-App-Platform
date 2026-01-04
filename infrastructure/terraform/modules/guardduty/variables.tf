################################################################################
# GuardDuty Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "enable_guardduty" {
  description = "Whether to enable GuardDuty detector"
  type        = bool
  default     = true
}

variable "finding_publishing_frequency" {
  description = "Frequency of findings export (FIFTEEN_MINUTES, ONE_HOUR, or SIX_HOURS)"
  type        = string
  default     = "FIFTEEN_MINUTES"

  validation {
    condition     = contains(["FIFTEEN_MINUTES", "ONE_HOUR", "SIX_HOURS"], var.finding_publishing_frequency)
    error_message = "Finding publishing frequency must be FIFTEEN_MINUTES, ONE_HOUR, or SIX_HOURS."
  }
}

################################################################################
# Protection Features
################################################################################

variable "enable_s3_protection" {
  description = "Enable S3 data event protection"
  type        = bool
  default     = true
}

variable "enable_eks_protection" {
  description = "Enable EKS audit log protection"
  type        = bool
  default     = true
}

variable "enable_eks_runtime_monitoring" {
  description = "Enable EKS runtime monitoring (container threat detection)"
  type        = bool
  default     = true
}

variable "auto_enable_eks_addon" {
  description = "Automatically manage EKS add-on for runtime monitoring"
  type        = bool
  default     = true
}

variable "enable_malware_protection" {
  description = "Enable malware protection for EBS volumes"
  type        = bool
  default     = true
}

variable "enable_rds_protection" {
  description = "Enable RDS login event protection"
  type        = bool
  default     = true
}

variable "enable_lambda_protection" {
  description = "Enable Lambda network activity monitoring"
  type        = bool
  default     = true
}

################################################################################
# Findings Bucket
################################################################################

variable "create_findings_bucket" {
  description = "Create S3 bucket for findings export"
  type        = bool
  default     = true
}

variable "publish_to_s3" {
  description = "Publish findings to S3 bucket"
  type        = bool
  default     = true
}

variable "force_destroy_findings_bucket" {
  description = "Allow force destroy of findings bucket"
  type        = bool
  default     = false
}

variable "kms_key_arn" {
  description = "KMS key ARN for encrypting findings"
  type        = string
  default     = null
}

variable "findings_transition_to_ia_days" {
  description = "Days before transitioning findings to STANDARD_IA"
  type        = number
  default     = 30
}

variable "findings_transition_to_glacier_days" {
  description = "Days before transitioning findings to GLACIER"
  type        = number
  default     = 90
}

variable "findings_expiration_days" {
  description = "Days before expiring findings"
  type        = number
  default     = 365
}

################################################################################
# Filters
################################################################################

variable "filters" {
  description = "Map of GuardDuty filters to create"
  type = map(object({
    action      = string
    rank        = number
    description = optional(string, "")
    criteria = list(object({
      field                 = string
      equals                = optional(list(string))
      not_equals            = optional(list(string))
      greater_than          = optional(string)
      greater_than_or_equal = optional(string)
      less_than             = optional(string)
      less_than_or_equal    = optional(string)
    }))
  }))
  default = {}
}

################################################################################
# Threat Intelligence Sets
################################################################################

variable "threat_intel_sets" {
  description = "Map of threat intelligence sets"
  type = map(object({
    format   = string
    location = string
    activate = optional(bool, true)
  }))
  default = {}
}

################################################################################
# Trusted IP Sets
################################################################################

variable "trusted_ip_sets" {
  description = "Map of trusted IP sets"
  type = map(object({
    format   = string
    location = string
    activate = optional(bool, true)
  }))
  default = {}
}

################################################################################
# Alerting
################################################################################

variable "create_finding_alerts" {
  description = "Create CloudWatch Event Rule for findings alerts"
  type        = bool
  default     = true
}

variable "alert_severity_threshold" {
  description = "Minimum severity to trigger alerts (1-8.9 scale)"
  type        = number
  default     = 4.0

  validation {
    condition     = var.alert_severity_threshold >= 1.0 && var.alert_severity_threshold <= 8.9
    error_message = "Alert severity threshold must be between 1.0 and 8.9."
  }
}

variable "alert_sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
  default     = null
}

################################################################################
# Organization Configuration
################################################################################

variable "enable_organization_admin" {
  description = "Enable as GuardDuty organization administrator"
  type        = bool
  default     = false
}

variable "delegated_admin_account_id" {
  description = "Delegated administrator account ID (defaults to current account)"
  type        = string
  default     = null
}

variable "auto_enable_organization_members" {
  description = "Auto-enable GuardDuty for new organization members (ALL, NEW, or NONE)"
  type        = string
  default     = "NEW"

  validation {
    condition     = contains(["ALL", "NEW", "NONE"], var.auto_enable_organization_members)
    error_message = "Auto enable organization members must be ALL, NEW, or NONE."
  }
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
