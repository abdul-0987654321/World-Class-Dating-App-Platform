################################################################################
# Monitoring Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "default_kms_key_arn" {
  description = "Default KMS key ARN for encryption"
  type        = string
  default     = null
}

################################################################################
# CloudWatch Log Groups
################################################################################

variable "log_groups" {
  description = "Map of CloudWatch log group configurations"
  type = map(object({
    name_prefix       = optional(string, null)
    retention_in_days = optional(number, 30)
    kms_key_arn       = optional(string, null)
    tags              = optional(map(string), {})
  }))
  default = {}
}

################################################################################
# Metric Filters
################################################################################

variable "metric_filters" {
  description = "Map of CloudWatch log metric filter configurations"
  type = map(object({
    pattern          = string
    log_group_name   = optional(string, null)
    log_group_key    = optional(string, null)
    metric_name      = string
    metric_namespace = optional(string, null)
    metric_value     = string
    default_value    = optional(string, null)
    unit             = optional(string, null)
    dimensions       = optional(map(string), null)
  }))
  default = {}
}

################################################################################
# CloudWatch Alarms
################################################################################

variable "alarms" {
  description = "Map of CloudWatch alarm configurations"
  type = map(object({
    description               = optional(string, null)
    comparison_operator       = string
    evaluation_periods        = number
    metric_name               = string
    namespace                 = string
    period                    = number
    statistic                 = string
    threshold                 = number
    treat_missing_data        = optional(string, "missing")
    dimensions                = optional(map(string), {})
    alarm_actions             = optional(list(string), null)
    ok_actions                = optional(list(string), null)
    insufficient_data_actions = optional(list(string), null)
    severity                  = optional(string, "medium")
  }))
  default = {}
}

variable "composite_alarms" {
  description = "Map of composite alarm configurations"
  type = map(object({
    description               = optional(string, null)
    alarm_rule                = string
    alarm_actions             = optional(list(string), null)
    ok_actions                = optional(list(string), null)
    insufficient_data_actions = optional(list(string), null)
  }))
  default = {}
}

variable "default_alarm_actions" {
  description = "Default actions for alarms"
  type        = list(string)
  default     = []
}

variable "default_ok_actions" {
  description = "Default actions when alarms return to OK"
  type        = list(string)
  default     = []
}

################################################################################
# Anomaly Detection
################################################################################

variable "anomaly_detection_alarms" {
  description = "Map of anomaly detection alarm configurations"
  type = map(object({
    description        = optional(string, null)
    metric_name        = string
    namespace          = string
    period             = number
    statistic          = string
    evaluation_periods = number
    band_width         = optional(number, 2)
    dimensions         = optional(map(string), {})
    alarm_actions      = optional(list(string), null)
    ok_actions         = optional(list(string), null)
    severity           = optional(string, "medium")
  }))
  default = {}
}

################################################################################
# Dashboard
################################################################################

variable "create_dashboard" {
  description = "Create CloudWatch dashboard"
  type        = bool
  default     = true
}

variable "dashboard_body" {
  description = "Custom dashboard body JSON (overrides auto-generated)"
  type        = string
  default     = null
}

variable "eks_cluster_name" {
  description = "EKS cluster name for dashboard metrics"
  type        = string
  default     = null
}

variable "rds_cluster_identifier" {
  description = "RDS cluster identifier for dashboard metrics"
  type        = string
  default     = null
}

variable "elasticache_cluster_id" {
  description = "ElastiCache cluster ID for dashboard metrics"
  type        = string
  default     = null
}

variable "additional_dashboard_widgets" {
  description = "Additional dashboard widgets"
  type        = list(any)
  default     = []
}

################################################################################
# SNS Alarm Topics
################################################################################

variable "create_alarm_topic" {
  description = "Create SNS topic for alarms"
  type        = bool
  default     = true
}

variable "alarm_email_endpoints" {
  description = "Email endpoints for alarm notifications"
  type        = list(string)
  default     = []
}

################################################################################
# X-Ray Configuration
################################################################################

variable "xray_sampling_rules" {
  description = "Map of X-Ray sampling rule configurations"
  type = map(object({
    priority       = number
    reservoir_size = number
    fixed_rate     = number
    url_path       = optional(string, "*")
    host           = optional(string, "*")
    http_method    = optional(string, "*")
    service_type   = optional(string, "*")
    service_name   = optional(string, "*")
    resource_arn   = optional(string, "*")
    attributes     = optional(map(string), {})
  }))
  default = {}
}

variable "xray_groups" {
  description = "Map of X-Ray group configurations"
  type = map(object({
    filter_expression     = string
    insights_enabled      = optional(bool, true)
    notifications_enabled = optional(bool, false)
  }))
  default = {}
}

################################################################################
# Container Insights
################################################################################

variable "enable_container_insights" {
  description = "Enable Container Insights"
  type        = bool
  default     = true
}

variable "container_insights_retention_days" {
  description = "Retention days for Container Insights logs"
  type        = number
  default     = 30
}

################################################################################
# Application Insights
################################################################################

variable "enable_application_insights" {
  description = "Enable Application Insights"
  type        = bool
  default     = false
}

variable "application_insights_auto_config" {
  description = "Enable auto configuration for Application Insights"
  type        = bool
  default     = true
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
