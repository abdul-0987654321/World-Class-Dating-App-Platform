################################################################################
# Development Environment Terraform Variables
################################################################################

# General
aws_region   = "us-east-1"
project_name = "flamoral"
environment  = "dev"
cost_center  = "development"
owner        = "platform-team"

# Networking
vpc_cidr = "10.0.0.0/16"
availability_zones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1c"
]

# EKS - Upgraded from 1.28 to 1.31 (1.29/1.30 past standard support)
eks_cluster_version = "1.31"

# RDS
rds_engine_version = "15.6"

# Cognito
cognito_callback_urls = [
  "http://localhost:3000/callback",
  "https://dev.flamoral.com/callback"
]

cognito_logout_urls = [
  "http://localhost:3000",
  "https://dev.flamoral.com"
]

cognito_mobile_callback_urls = [
  "flamoral://callback"
]

cognito_mobile_logout_urls = [
  "flamoral://logout"
]

# S3 CORS
allowed_origins = [
  "http://localhost:3000",
  "https://dev.flamoral.com"
]

# Monitoring
alarm_email_endpoints = [
  # Add email addresses for alarm notifications
]
