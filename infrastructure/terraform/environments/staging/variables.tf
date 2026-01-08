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
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access public endpoints"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

################################################################################
# EKS Variables
################################################################################


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
# Monitoring Variables
################################################################################

variable "alarm_email_endpoints" {
  description = "Email endpoints for alarm notifications"
  type        = list(string)
  default     = []
}
