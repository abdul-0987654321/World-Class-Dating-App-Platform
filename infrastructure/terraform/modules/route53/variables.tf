################################################################################
# Route53 Variables
################################################################################

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
}

variable "private_domain_name" {
  description = "Private domain name (defaults to internal.{domain_name})"
  type        = string
  default     = null
}

variable "vpc_id" {
  description = "VPC ID for private hosted zone"
  type        = string
  default     = null
}

################################################################################
# Zone Creation
################################################################################

variable "create_public_zone" {
  description = "Create public hosted zone"
  type        = bool
  default     = true
}

variable "create_private_zone" {
  description = "Create private hosted zone"
  type        = bool
  default     = true
}

################################################################################
# CloudFront Integration
################################################################################

variable "cloudfront_distribution_domain_name" {
  description = "CloudFront distribution domain name"
  type        = string
  default     = null
}

variable "cloudfront_distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  type        = string
  default     = null
}

variable "create_www_record" {
  description = "Create www subdomain record"
  type        = bool
  default     = true
}

################################################################################
# API Integration
################################################################################

variable "api_domain_name" {
  description = "API endpoint domain name (CloudFront or ALB)"
  type        = string
  default     = null
}

variable "api_hosted_zone_id" {
  description = "API endpoint hosted zone ID"
  type        = string
  default     = null
}

################################################################################
# ALB Integration
################################################################################

variable "alb_dns_name" {
  description = "ALB DNS name"
  type        = string
  default     = null
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID"
  type        = string
  default     = null
}

variable "alb_subdomain" {
  description = "ALB subdomain (defaults to 'lb')"
  type        = string
  default     = null
}

################################################################################
# Database Endpoints (Private Zone)
################################################################################

variable "rds_endpoint" {
  description = "RDS endpoint for private zone"
  type        = string
  default     = null
}

variable "create_rds_record" {
  description = "Create RDS CNAME record in private zone"
  type        = bool
  default     = true
}

variable "elasticache_endpoint" {
  description = "ElastiCache endpoint for private zone"
  type        = string
  default     = null
}

variable "create_elasticache_record" {
  description = "Create ElastiCache CNAME record in private zone"
  type        = bool
  default     = true
}

################################################################################
# Custom Records
################################################################################

variable "custom_records" {
  description = "Custom DNS records"
  type = map(object({
    name    = string
    type    = string
    ttl     = number
    records = list(string)
    private = optional(bool, false)
  }))
  default = {}
}

variable "alias_records" {
  description = "Alias DNS records"
  type = map(object({
    name                   = string
    type                   = string
    alias_target           = string
    alias_zone_id          = string
    evaluate_target_health = optional(bool, true)
    private                = optional(bool, false)
  }))
  default = {}
}

################################################################################
# ACM Certificate Validation
################################################################################

variable "acm_validation_records" {
  description = "ACM certificate validation records"
  type = map(object({
    name   = string
    type   = string
    record = string
  }))
  default = {}
}

################################################################################
# Health Checks
################################################################################

variable "health_checks" {
  description = "Route53 health checks"
  type = map(object({
    fqdn              = string
    port              = number
    type              = string
    resource_path     = optional(string, "/health")
    failure_threshold = optional(number, 3)
    request_interval  = optional(number, 30)
    regions           = optional(list(string), ["us-east-1", "us-west-2", "eu-west-1"])
    create_alarm      = optional(bool, true)
  }))
  default = {}
}

variable "alarm_actions" {
  description = "SNS topic ARNs for health check alarms"
  type        = list(string)
  default     = []
}

################################################################################
# DNSSEC
################################################################################

variable "enable_dnssec" {
  description = "Enable DNSSEC for public zone"
  type        = bool
  default     = false
}

variable "dnssec_kms_key_arn" {
  description = "KMS key ARN for DNSSEC (must be in us-east-1)"
  type        = string
  default     = null
}

################################################################################
# Query Logging
################################################################################

variable "enable_query_logging" {
  description = "Enable Route53 query logging"
  type        = bool
  default     = false
}

variable "query_log_group_arn" {
  description = "CloudWatch log group ARN for query logging"
  type        = string
  default     = null
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
