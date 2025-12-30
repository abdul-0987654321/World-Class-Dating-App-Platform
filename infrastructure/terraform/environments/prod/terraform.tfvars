# Production Environment Configuration
# WARNING: Terraform apply is DISABLED for production
# Changes must be reviewed and applied via Kubernetes GitOps

project_name = "dating"
environment  = "prod"
aws_region   = "us-east-1"
dr_region    = "us-west-2"

# Tags
cost_center = "production"
owner       = "platform-team"

# Networking
vpc_cidr = "10.30.0.0/16"
availability_zones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1c"
]

# EKS Configuration - Upgraded from 1.29 to 1.31 (1.29 past standard support)
eks_cluster_version = "1.31"

# RDS Configuration
rds_engine_version = "15.6"

# Domain Configuration
domain_name = "flamoral.com"
domain_names = [
  "flamoral.com",
  "www.flamoral.com",
  "api.flamoral.com"
]

# Cognito URLs
cognito_callback_urls = [
  "https://flamoral.com/auth/callback"
]
cognito_logout_urls = [
  "https://flamoral.com"
]
cognito_mobile_callback_urls = [
  "flamoral://auth/callback"
]
cognito_mobile_logout_urls = [
  "flamoral://"
]

# CORS Origins
allowed_origins = [
  "https://flamoral.com",
  "https://www.flamoral.com",
  "https://api.flamoral.com"
]

# Monitoring
alarm_email_endpoints = [
  # Add production alert emails
]

# WAF - Optional country blocking
blocked_countries = []
