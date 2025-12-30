################################################################################
# Staging Environment Terraform Variables
################################################################################

# General
aws_region   = "us-east-1"
project_name = "dating-app"
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

# EKS
eks_cluster_version = "1.28"

# RDS
rds_engine_version = "15.6"

# Cognito
cognito_callback_urls = [
  "https://staging.dating-app.example.com/callback"
]

cognito_logout_urls = [
  "https://staging.dating-app.example.com"
]

cognito_mobile_callback_urls = [
  "datingapp://callback"
]

cognito_mobile_logout_urls = [
  "datingapp://logout"
]

# S3 CORS
allowed_origins = [
  "https://staging.dating-app.example.com"
]

# Monitoring
alarm_email_endpoints = [
  # Add email addresses for alarm notifications
]
