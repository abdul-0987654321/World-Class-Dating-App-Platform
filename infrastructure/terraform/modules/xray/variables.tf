################################################################################
# X-Ray Tracing Module - Variables
################################################################################

################################################################################
# Required Variables
################################################################################

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string

  validation {
    condition     = can(regex("^(dev|staging|prod|test|uat)$", var.environment))
    error_message = "Environment must be one of: dev, staging, prod, test, uat."
  }
}

variable "project_name" {
  description = "Name of the project for resource naming and tagging"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "service_names" {
  description = "List of service names to create sampling rules and groups for"
  type        = list(string)

  validation {
    condition     = length(var.service_names) > 0
    error_message = "At least one service name must be provided."
  }
}

################################################################################
# Sampling Configuration
################################################################################

variable "sampling_rate" {
  description = "Default fixed sampling rate for services (0.0 to 1.0)"
  type        = number
  default     = 0.05

  validation {
    condition     = var.sampling_rate >= 0 && var.sampling_rate <= 1
    error_message = "Sampling rate must be between 0.0 and 1.0."
  }
}

variable "reservoir_size" {
  description = "Number of requests per second to sample before applying fixed_rate"
  type        = number
  default     = 5

  validation {
    condition     = var.reservoir_size >= 0
    error_message = "Reservoir size must be non-negative."
  }
}

variable "default_sampling_rate" {
  description = "Default sampling rate for catch-all rule"
  type        = number
  default     = 0.01

  validation {
    condition     = var.default_sampling_rate >= 0 && var.default_sampling_rate <= 1
    error_message = "Default sampling rate must be between 0.0 and 1.0."
  }
}

variable "default_reservoir_size" {
  description = "Default reservoir size for catch-all rule"
  type        = number
  default     = 1
}

variable "health_check_sampling_rate" {
  description = "Sampling rate for health check endpoints (typically very low)"
  type        = number
  default     = 0.001

  validation {
    condition     = var.health_check_sampling_rate >= 0 && var.health_check_sampling_rate <= 1
    error_message = "Health check sampling rate must be between 0.0 and 1.0."
  }
}

variable "error_sampling_rate" {
  description = "Sampling rate for error traces (typically higher)"
  type        = number
  default     = 1.0

  validation {
    condition     = var.error_sampling_rate >= 0 && var.error_sampling_rate <= 1
    error_message = "Error sampling rate must be between 0.0 and 1.0."
  }
}

variable "error_reservoir_size" {
  description = "Reservoir size for error traces"
  type        = number
  default     = 10
}

variable "additional_sampling_rules" {
  description = "Additional custom sampling rules to create"
  type = map(object({
    priority       = number
    reservoir_size = number
    fixed_rate     = number
    url_path       = string
    host           = string
    http_method    = string
    service_type   = string
    service_name   = string
    resource_arn   = string
    attributes     = map(string)
  }))
  default = {}
}

################################################################################
# X-Ray Group Configuration
################################################################################

variable "enable_insights" {
  description = "Enable X-Ray Insights for anomaly detection"
  type        = bool
  default     = true
}

variable "enable_insights_notifications" {
  description = "Enable notifications for X-Ray Insights anomalies"
  type        = bool
  default     = true
}

variable "slow_request_threshold_ms" {
  description = "Threshold in milliseconds for slow request group filter"
  type        = number
  default     = 3000
}

################################################################################
# CloudWatch Log Configuration
################################################################################

variable "log_retention_days" {
  description = "Number of days to retain X-Ray CloudWatch logs"
  type        = number
  default     = 30

  validation {
    condition = contains([
      0, 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

################################################################################
# Encryption Configuration
################################################################################

variable "kms_key_arn" {
  description = "ARN of the KMS key for X-Ray encryption. If null, encryption is disabled."
  type        = string
  default     = null
}

################################################################################
# EKS Integration
################################################################################

variable "create_xray_daemon_role" {
  description = "Whether to create an IAM role for the X-Ray daemon in EKS"
  type        = bool
  default     = true
}

variable "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider for IRSA"
  type        = string
  default     = ""
}

variable "xray_daemon_namespace" {
  description = "Kubernetes namespace where the X-Ray daemon runs"
  type        = string
  default     = "amazon-cloudwatch"
}

variable "xray_daemon_service_account" {
  description = "Kubernetes service account name for the X-Ray daemon"
  type        = string
  default     = "xray-daemon"
}

################################################################################
# Alarm Configuration
################################################################################

variable "create_alarms" {
  description = "Whether to create CloudWatch alarms for X-Ray metrics"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarm triggers"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "List of ARNs to notify when alarm returns to OK state"
  type        = list(string)
  default     = []
}

variable "throttle_alarm_threshold" {
  description = "Threshold for throttled traces alarm"
  type        = number
  default     = 100
}

variable "error_rate_threshold" {
  description = "Threshold percentage for error rate alarm"
  type        = number
  default     = 5.0
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
