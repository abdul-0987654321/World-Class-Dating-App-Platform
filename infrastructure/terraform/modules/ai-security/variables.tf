################################################################################
# AI Security Module - Variables
################################################################################

variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "flamoral"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "development", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, development, production"
  }
}

################################################################################
# AI Kill Switch Configuration
################################################################################

variable "ai_services_default_enabled" {
  description = "Default enabled state for all AI services"
  type        = bool
  default     = true
}

################################################################################
# Circuit Breaker Configuration
################################################################################

variable "circuit_breaker_failure_threshold" {
  description = "Number of failures before opening the circuit"
  type        = number
  default     = 5

  validation {
    condition     = var.circuit_breaker_failure_threshold > 0
    error_message = "Failure threshold must be greater than 0"
  }
}

variable "circuit_breaker_failure_rate_threshold" {
  description = "Percentage of failures to trip the circuit (0-100)"
  type        = number
  default     = 50

  validation {
    condition     = var.circuit_breaker_failure_rate_threshold >= 0 && var.circuit_breaker_failure_rate_threshold <= 100
    error_message = "Failure rate threshold must be between 0 and 100"
  }
}

variable "circuit_breaker_reset_timeout_ms" {
  description = "Time in milliseconds to wait before trying half-open"
  type        = number
  default     = 30000

  validation {
    condition     = var.circuit_breaker_reset_timeout_ms >= 1000
    error_message = "Reset timeout must be at least 1000ms"
  }
}

variable "circuit_breaker_success_threshold" {
  description = "Number of successful calls in half-open to close circuit"
  type        = number
  default     = 3

  validation {
    condition     = var.circuit_breaker_success_threshold > 0
    error_message = "Success threshold must be greater than 0"
  }
}

variable "circuit_breaker_sliding_window_size" {
  description = "Sliding window size for calculating failure rate"
  type        = number
  default     = 10

  validation {
    condition     = var.circuit_breaker_sliding_window_size >= 5
    error_message = "Sliding window size must be at least 5"
  }
}

variable "circuit_breaker_request_timeout_ms" {
  description = "Request timeout in milliseconds"
  type        = number
  default     = 30000

  validation {
    condition     = var.circuit_breaker_request_timeout_ms >= 1000
    error_message = "Request timeout must be at least 1000ms"
  }
}

################################################################################
# Logging Configuration
################################################################################

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch Logs retention period"
  }
}

################################################################################
# Alerting Configuration
################################################################################

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms (empty string to disable)"
  type        = string
  default     = ""
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
