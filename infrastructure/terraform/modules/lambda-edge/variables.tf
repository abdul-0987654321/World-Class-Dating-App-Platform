################################################################################
# Lambda@Edge Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 14
}

variable "enable_auth_edge" {
  description = "Enable authentication Lambda@Edge function"
  type        = bool
  default     = false
}

variable "enable_ab_testing" {
  description = "Enable A/B testing Lambda@Edge function"
  type        = bool
  default     = false
}

variable "origin_request_handler_code" {
  description = "Custom origin request handler code (if empty, no origin request Lambda is created)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
