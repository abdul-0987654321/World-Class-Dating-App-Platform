################################################################################
# ACM Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name for the certificate"
  type        = string
}

variable "subject_alternative_names" {
  description = "List of additional domain names to include in the certificate"
  type        = list(string)
  default     = []
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS validation"
  type        = string
  default     = null
}

variable "create_route53_records" {
  description = "Whether to create Route53 records for DNS validation"
  type        = bool
  default     = true
}

variable "wait_for_validation" {
  description = "Whether to wait for certificate validation to complete"
  type        = bool
  default     = true
}

variable "validation_timeout" {
  description = "Timeout for certificate validation"
  type        = string
  default     = "45m"
}

variable "validation_record_fqdns" {
  description = "List of FQDNs for validation (if not using Route53)"
  type        = list(string)
  default     = []
}

variable "certificate_transparency_logging" {
  description = "Whether to enable certificate transparency logging"
  type        = bool
  default     = true
}

variable "create_regional_certificate" {
  description = "Whether to create a regional certificate (for ALB)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
