################################################################################
# AWS WAF v2 Module - Variables
################################################################################

################################################################################
# Required Variables
################################################################################

variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string

  validation {
    condition     = length(var.project_name) > 0 && length(var.project_name) <= 50
    error_message = "Project name must be between 1 and 50 characters."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "production", "test"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, production, test."
  }
}

################################################################################
# WAF Configuration
################################################################################

variable "scope" {
  description = "Scope of the WAF Web ACL (REGIONAL or CLOUDFRONT)"
  type        = string
  default     = "REGIONAL"

  validation {
    condition     = contains(["REGIONAL", "CLOUDFRONT"], var.scope)
    error_message = "Scope must be either REGIONAL or CLOUDFRONT."
  }
}

variable "rate_limit" {
  description = "Maximum number of requests allowed per 5-minute period per IP address"
  type        = number
  default     = 2000

  validation {
    condition     = var.rate_limit >= 100 && var.rate_limit <= 20000000
    error_message = "Rate limit must be between 100 and 20,000,000."
  }
}

################################################################################
# Rule Enable Flags
################################################################################

variable "enable_rate_limiting" {
  description = "Enable rate-based rule to prevent DDoS attacks"
  type        = bool
  default     = true
}

variable "enable_common_rules" {
  description = "Enable AWS Managed Rules Common Rule Set"
  type        = bool
  default     = true
}

variable "enable_known_bad_inputs_rules" {
  description = "Enable AWS Managed Rules Known Bad Inputs Rule Set"
  type        = bool
  default     = true
}

variable "enable_sqli_rules" {
  description = "Enable AWS Managed Rules SQL Injection Rule Set"
  type        = bool
  default     = true
}

################################################################################
# Rule Exclusions
################################################################################

variable "common_rules_excluded_rules" {
  description = "List of rules to exclude from AWS Managed Rules Common Rule Set (set to count instead of block)"
  type        = list(string)
  default     = []
}

variable "known_bad_inputs_excluded_rules" {
  description = "List of rules to exclude from AWS Managed Rules Known Bad Inputs Rule Set"
  type        = list(string)
  default     = []
}

variable "sqli_excluded_rules" {
  description = "List of rules to exclude from AWS Managed Rules SQL Injection Rule Set"
  type        = list(string)
  default     = []
}

################################################################################
# IP Configuration
################################################################################

variable "allowed_ips" {
  description = "List of IP addresses/CIDR blocks to allow (bypass WAF rules)"
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for ip in var.allowed_ips : can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", ip))
    ])
    error_message = "All allowed IPs must be valid CIDR notation (e.g., 192.168.1.0/24)."
  }
}

variable "blocked_ips" {
  description = "List of IP addresses/CIDR blocks to block"
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for ip in var.blocked_ips : can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", ip))
    ])
    error_message = "All blocked IPs must be valid CIDR notation (e.g., 192.168.1.0/24)."
  }
}

################################################################################
# Geo-blocking Configuration
################################################################################

variable "blocked_countries" {
  description = "List of country codes to block (ISO 3166-1 alpha-2)"
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for code in var.blocked_countries : can(regex("^[A-Z]{2}$", code))
    ])
    error_message = "All country codes must be valid ISO 3166-1 alpha-2 codes (e.g., US, CN, RU)."
  }
}

################################################################################
# Logging Configuration
################################################################################

variable "enable_logging" {
  description = "Enable WAF logging to CloudWatch and S3"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain WAF logs in S3"
  type        = number
  default     = 90

  validation {
    condition     = var.log_retention_days >= 1 && var.log_retention_days <= 3650
    error_message = "Log retention days must be between 1 and 3650."
  }
}

variable "cloudwatch_log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.cloudwatch_log_retention_days)
    error_message = "CloudWatch log retention days must be a valid value."
  }
}

variable "log_bucket_kms_key_arn" {
  description = "ARN of KMS key for S3 bucket encryption (leave empty for AES256)"
  type        = string
  default     = ""
}

variable "redacted_fields" {
  description = "List of fields to redact from WAF logs"
  type = list(object({
    type = string
    name = string
  }))
  default = [
    {
      type = "single_header"
      name = "authorization"
    },
    {
      type = "single_header"
      name = "cookie"
    }
  ]
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
