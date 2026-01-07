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
  description = "Map of controls to disable with their reasons"
  type = map(object({
    control_arn = string
    reason      = string
  }))
  default = {}
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

################################################################################
# Additional Variables (Required by main.tf)
################################################################################

variable "enable_security_hub" {
  description = "Enable Security Hub"
  type        = bool
  default     = true
}

variable "enable_default_standards" {
  description = "Enable default security standards"
  type        = bool
  default     = false
}

variable "create_finding_alerts" {
  description = "Create CloudWatch event rules for findings alerts"
  type        = bool
  default     = false
}

variable "alert_severity_labels" {
  description = "Severity labels to alert on"
  type        = list(string)
  default     = ["CRITICAL", "HIGH"]
}

variable "alert_sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
  default     = null
}

################################################################################
# CIS Benchmark Variables
################################################################################

variable "enable_cis_benchmark" {
  description = "Enable CIS benchmark standard"
  type        = bool
  default     = false
}

variable "enable_cis_benchmark_v14" {
  description = "Enable CIS benchmark v1.4 standard"
  type        = bool
  default     = false
}

variable "cis_benchmark_version" {
  description = "CIS benchmark version"
  type        = string
  default     = "1.2.0"
}

################################################################################
# Integration Variables
################################################################################

variable "enable_guardduty_integration" {
  description = "Enable GuardDuty integration"
  type        = bool
  default     = false
}

variable "enable_inspector_integration" {
  description = "Enable Inspector integration"
  type        = bool
  default     = false
}

variable "enable_macie_integration" {
  description = "Enable Macie integration"
  type        = bool
  default     = false
}

variable "enable_access_analyzer_integration" {
  description = "Enable IAM Access Analyzer integration"
  type        = bool
  default     = false
}

variable "enable_config_integration" {
  description = "Enable AWS Config integration"
  type        = bool
  default     = false
}

variable "enable_firewall_manager_integration" {
  description = "Enable Firewall Manager integration"
  type        = bool
  default     = false
}

variable "enable_health_integration" {
  description = "Enable AWS Health integration"
  type        = bool
  default     = false
}

################################################################################
# Insights and Automation Rules
################################################################################

variable "insights" {
  description = "Custom Security Hub insights"
  type        = map(any)
  default     = {}
}

variable "automation_rules" {
  description = "Security Hub automation rules"
  type        = map(any)
  default     = {}
}

################################################################################
# Organization Variables
################################################################################

variable "enable_organization_admin" {
  description = "Enable organization admin account"
  type        = bool
  default     = false
}

variable "delegated_admin_account_id" {
  description = "Delegated admin account ID"
  type        = string
  default     = null
}

variable "auto_enable_organization_members" {
  description = "Auto-enable for organization members"
  type        = bool
  default     = false
}

variable "auto_enable_standards" {
  description = "Auto-enable standards setting"
  type        = string
  default     = "NONE"
}

variable "organization_configuration_type" {
  description = "Organization configuration type"
  type        = string
  default     = "LOCAL"
}

################################################################################
# Finding Aggregator Variables
################################################################################

variable "enable_finding_aggregator" {
  description = "Enable finding aggregator"
  type        = bool
  default     = false
}

variable "finding_aggregator_linking_mode" {
  description = "Finding aggregator linking mode"
  type        = string
  default     = "ALL_REGIONS"
}

################################################################################
# Action Targets
################################################################################

variable "action_targets" {
  description = "Custom action targets"
  type        = map(any)
  default     = {}
}
