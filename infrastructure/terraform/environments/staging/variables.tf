################################################################################
# Staging Environment Variables
################################################################################

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "flamoral"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "staging"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "platform-team"
}

################################################################################
# Networking Variables
################################################################################

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]  # Only 2 AZs for staging
}

variable "domain_name" {
  description = "Domain name"
  type        = string
  default     = "flamoral.com"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access public endpoints"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

################################################################################
# ECS Variables (Serverless - no cluster version needed)
################################################################################

# Fargate is serverless, no version management required

################################################################################
# RDS Variables
################################################################################

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

################################################################################
# Cognito Variables
################################################################################

variable "cognito_callback_urls" {
  description = "Callback URLs for web client"
  type        = list(string)
  default     = ["https://staging.example.com/callback"]
}

variable "cognito_logout_urls" {
  description = "Logout URLs for web client"
  type        = list(string)
  default     = ["https://staging.example.com"]
}

variable "cognito_mobile_callback_urls" {
  description = "Callback URLs for mobile client"
  type        = list(string)
  default     = ["flamoral://callback"]
}

variable "cognito_mobile_logout_urls" {
  description = "Logout URLs for mobile client"
  type        = list(string)
  default     = ["flamoral://logout"]
}

################################################################################
# S3 Variables
################################################################################

variable "allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["https://staging.example.com"]
}

################################################################################
# SSL/TLS Variables
################################################################################

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
  default     = null
}

################################################################################
# Monitoring Variables
################################################################################

variable "alarm_email_endpoints" {
  description = "Email endpoints for alarm notifications"
  type        = list(string)
  default     = []
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarm triggers"
  type        = list(string)
  default     = []
}
