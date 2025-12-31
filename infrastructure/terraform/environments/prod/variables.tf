################################################################################
# Production Environment Variables
################################################################################

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "flamoral"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-west-2"
}

variable "assume_role_arn" {
  description = "IAM role ARN to assume (for cross-account access)"
  type        = string
  default     = null
}

################################################################################
# Tags
################################################################################

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "production"
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "platform-team"
}

################################################################################
# Networking
################################################################################

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.30.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

################################################################################
# EKS
################################################################################

variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.29"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access EKS API (not used in prod - private only)"
  type        = list(string)
  default     = []
}

################################################################################
# RDS
################################################################################

variable "rds_engine_version" {
  description = "RDS PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

################################################################################
# Cognito
################################################################################

variable "cognito_callback_urls" {
  description = "Cognito web callback URLs"
  type        = list(string)
  default     = ["https://flamoral.com/auth/callback"]
}

variable "cognito_logout_urls" {
  description = "Cognito web logout URLs"
  type        = list(string)
  default     = ["https://flamoral.com"]
}

variable "cognito_mobile_callback_urls" {
  description = "Cognito mobile callback URLs"
  type        = list(string)
  default     = ["flamoral://auth/callback"]
}

variable "cognito_mobile_logout_urls" {
  description = "Cognito mobile logout URLs"
  type        = list(string)
  default     = ["flamoral://"]
}

################################################################################
# S3 / CloudFront
################################################################################

variable "allowed_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["https://flamoral.com", "https://www.flamoral.com", "https://api.flamoral.com"]
}

################################################################################
# Monitoring
################################################################################

variable "alarm_email_endpoints" {
  description = "Email addresses for alarm notifications"
  type        = list(string)
  default     = []
}

################################################################################
# Domain / DNS
################################################################################

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "flamoral.com"
}

variable "domain_names" {
  description = "All domain names for CloudFront"
  type        = list(string)
  default     = ["flamoral.com", "www.flamoral.com", "api.flamoral.com"]
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1)"
  type        = string
  default     = null
}

variable "create_route53_zone" {
  description = "Create Route53 hosted zone (set to false if zone already exists)"
  type        = bool
  default     = true
}

variable "dnssec_kms_key_arn" {
  description = "KMS key ARN for DNSSEC (must be in us-east-1)"
  type        = string
  default     = null
}

################################################################################
# Security
################################################################################

variable "origin_verify_header" {
  description = "Secret header value for CloudFront origin verification"
  type        = string
  sensitive   = true
  default     = ""
}

variable "blocked_countries" {
  description = "Country codes to block in WAF"
  type        = list(string)
  default     = []
}
