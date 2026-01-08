################################################################################
# Staging Environment Terraform Variables
################################################################################

# General
aws_region   = "us-east-1"
project_name = "flamoral"
environment  = "staging"
cost_center  = "staging"
owner        = "platform-team"

# Networking
vpc_cidr = "10.1.0.0/16"
availability_zones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1c"
]

# EKS - Upgraded from 1.28 to 1.31 (1.29/1.30 past standard support)

# RDS
rds_engine_version = "15.6"

# Cognito
cognito_callback_urls = [
  "https://staging.flamoral.com/callback"
]

cognito_logout_urls = [
  "https://staging.flamoral.com"
]

cognito_mobile_callback_urls = [
  "flamoral://callback"
]

cognito_mobile_logout_urls = [
  "flamoral://logout"
]

# S3 CORS
allowed_origins = [
  "https://staging.flamoral.com"
]

# Monitoring
alarm_email_endpoints = [
  # Add email addresses for alarm notifications
]
