################################################################################
# CloudFront + WAF Variables
################################################################################

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_names" {
  description = "List of domain names for the distribution"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate (must be in us-east-1)"
  type        = string
  default     = null
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe
}

variable "default_root_object" {
  description = "Default root object"
  type        = string
  default     = null
}

variable "default_origin_id" {
  description = "Default origin ID for cache behavior"
  type        = string
}

################################################################################
# Origins
################################################################################

variable "s3_origins" {
  description = "S3 origins configuration"
  type = list(object({
    bucket_regional_domain_name = string
    origin_id                   = string
    path_pattern                = string
    enable_origin_shield        = optional(bool, false)
  }))
  default = []
}

variable "alb_origins" {
  description = "ALB/API origins configuration"
  type = list(object({
    domain_name = string
    origin_id   = string
    custom_headers = optional(list(object({
      name  = string
      value = string
    })), [])
  }))
  default = []
}

variable "origin_shield_region" {
  description = "Region for Origin Shield"
  type        = string
  default     = "us-east-1"
}

################################################################################
# Cache Policies
################################################################################

variable "api_cache_policy_id" {
  description = "Custom cache policy ID for API (uses default if null)"
  type        = string
  default     = null
}

variable "media_cache_policy_id" {
  description = "Custom cache policy ID for media (uses default if null)"
  type        = string
  default     = null
}

variable "api_origin_request_policy_id" {
  description = "Custom origin request policy ID for API (uses default if null)"
  type        = string
  default     = null
}

################################################################################
# Functions
################################################################################

variable "default_function_associations" {
  description = "CloudFront function associations for default behavior"
  type = list(object({
    event_type   = string
    function_arn = string
  }))
  default = []
}

################################################################################
# Error Responses
################################################################################

variable "custom_error_responses" {
  description = "Custom error responses"
  type = list(object({
    error_code            = number
    response_code         = number
    response_page_path    = string
    error_caching_min_ttl = number
  }))
  default = []
}

################################################################################
# Geo Restrictions
################################################################################

variable "geo_restriction_type" {
  description = "Geo restriction type (none, whitelist, blacklist)"
  type        = string
  default     = "none"
}

variable "geo_restriction_locations" {
  description = "List of country codes for geo restriction"
  type        = list(string)
  default     = []
}

################################################################################
# Logging
################################################################################

variable "enable_logging" {
  description = "Enable CloudFront access logging"
  type        = bool
  default     = false
}

variable "logging_bucket" {
  description = "S3 bucket for CloudFront logs"
  type        = string
  default     = null
}

variable "logging_prefix" {
  description = "Prefix for CloudFront log files"
  type        = string
  default     = "cloudfront/"
}

################################################################################
# WAF Configuration
################################################################################

variable "enable_waf" {
  description = "Enable WAF for the distribution"
  type        = bool
  default     = true
}

variable "blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = []
}

variable "enable_bot_control" {
  description = "Enable AWS Bot Control managed rule"
  type        = bool
  default     = false
}

variable "waf_logging_enabled" {
  description = "Enable WAF logging"
  type        = bool
  default     = false
}

variable "waf_log_destination_arn" {
  description = "ARN for WAF log destination (Kinesis Firehose or CloudWatch)"
  type        = string
  default     = null
}

variable "waf_logging_filter" {
  description = "WAF logging filter configuration"
  type = object({
    default_behavior = string
    filters = list(object({
      behavior    = string
      requirement = string
      conditions = list(object({
        action_condition = optional(object({
          action = string
        }))
      }))
    }))
  })
  default = null
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
