################################################################################
# Security Hub Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

################################################################################
# Security Standards
################################################################################

variable "enable_cis_standard" {
  description = "Enable CIS AWS Foundations Benchmark standard"
  type        = bool
  default     = true
}

variable "enable_pci_dss_standard" {
  description = "Enable PCI DSS v3.2.1 standard"
  type        = bool
  default     = false
}

variable "enable_nist_standard" {
  description = "Enable NIST 800-53 Rev. 5 standard"
  type        = bool
  default     = false
}

variable "enable_aws_foundational_standard" {
  description = "Enable AWS Foundational Security Best Practices standard"
  type        = bool
  default     = true
}

################################################################################
# Control Settings
################################################################################

variable "auto_enable_controls" {
  description = "Automatically enable new controls when they are added to enabled standards"
  type        = bool
  default     = true
}

variable "control_finding_generator" {
  description = "Control finding generator setting (SECURITY_CONTROL or STANDARD_CONTROL)"
  type        = string
  default     = "SECURITY_CONTROL"

  validation {
    condition     = contains(["SECURITY_CONTROL", "STANDARD_CONTROL"], var.control_finding_generator)
    error_message = "Control finding generator must be SECURITY_CONTROL or STANDARD_CONTROL."
  }
}

variable "disabled_controls" {
  description = "List of control IDs to disable (e.g., ['CIS.1.1', 'CIS.1.2'])"
  type        = list(string)
  default     = []
}

################################################################################
# Cross-Region Aggregation
################################################################################

variable "aggregation_region" {
  description = "Region for cross-region finding aggregation (leave empty to disable)"
  type        = string
  default     = null
}

variable "linking_mode" {
  description = "Linking mode for finding aggregation (ALL_REGIONS or SPECIFIED_REGIONS)"
  type        = string
  default     = "ALL_REGIONS"

  validation {
    condition     = contains(["ALL_REGIONS", "SPECIFIED_REGIONS"], var.linking_mode)
    error_message = "Linking mode must be ALL_REGIONS or SPECIFIED_REGIONS."
  }
}

################################################################################
# Alerting
################################################################################

variable "sns_topic_arn" {
  description = "SNS topic ARN for Security Hub alerts"
  type        = string
  default     = null
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
