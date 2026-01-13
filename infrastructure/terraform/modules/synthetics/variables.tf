################################################################################
# Synthetics Module Variables
################################################################################

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

################################################################################
# Domain Configuration
################################################################################

variable "domain" {
  description = "Domain to monitor (e.g., www.flamoral.com)"
  type        = string
}

variable "custom_pages" {
  description = "Custom list of pages to monitor (overrides default)"
  type = list(object({
    name = string
    url  = string
    path = string
  }))
  default = []
}

################################################################################
# Canary Configuration
################################################################################

variable "runtime_version" {
  description = "Synthetics runtime version"
  type        = string
  default     = "syn-nodejs-puppeteer-6.2"
}

variable "schedule_expression" {
  description = "Schedule expression for canary runs"
  type        = string
  default     = "rate(5 minutes)"
}

variable "start_canary" {
  description = "Whether to start the canary immediately"
  type        = bool
  default     = true
}

variable "timeout_seconds" {
  description = "Canary timeout in seconds"
  type        = number
  default     = 60
}

variable "memory_mb" {
  description = "Memory allocation for canary (MB)"
  type        = number
  default     = 1024
}

variable "enable_xray" {
  description = "Enable X-Ray tracing for canary"
  type        = bool
  default     = true
}

################################################################################
# VPC Configuration (Optional)
################################################################################

variable "subnet_ids" {
  description = "Subnet IDs for canary (for internal endpoints)"
  type        = list(string)
  default     = []
}

variable "security_group_ids" {
  description = "Security group IDs for canary"
  type        = list(string)
  default     = []
}

################################################################################
# Retention Configuration
################################################################################

variable "success_retention_days" {
  description = "Days to retain successful run data"
  type        = number
  default     = 31
}

variable "failure_retention_days" {
  description = "Days to retain failed run data"
  type        = number
  default     = 31
}

variable "artifact_retention_days" {
  description = "Days to retain artifacts in S3"
  type        = number
  default     = 90
}

################################################################################
# Encryption
################################################################################

variable "kms_key_arn" {
  description = "KMS key ARN for S3 encryption"
  type        = string
  default     = null
}

################################################################################
# Monitoring
################################################################################

variable "create_alarms" {
  description = "Whether to create CloudWatch alarms"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarms trigger"
  type        = list(string)
  default     = []
}

variable "duration_alarm_threshold_ms" {
  description = "Duration threshold for alarm (milliseconds)"
  type        = number
  default     = 30000
}

################################################################################
# API Health Canary (Optional)
################################################################################

variable "create_api_health_canary" {
  description = "Whether to create an API health check canary"
  type        = bool
  default     = false
}

variable "api_health_endpoint" {
  description = "API health endpoint URL"
  type        = string
  default     = "https://api.flamoral.com/health"
}
