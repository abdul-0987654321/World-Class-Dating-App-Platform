# Development Environment - Terraform Variables
# DatingPlatform Infrastructure
#
# This file contains environment-specific variable values.
# DO NOT commit sensitive values - use environment variables instead.

# Environment Configuration
environment          = "dev"
location             = "westus2"
resource_name_prefix = "datingplatform"
subscription_id      = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
tenant_id            = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"

# App Service - Cost optimized for development
app_service_sku = "B1"

# SQL Database - Minimal configuration for development
sql_sku           = "Basic"
sql_max_size_gb   = 2
sql_admin_username = "sqladmin"
# sql_admin_password = "" # Set via TF_VAR_sql_admin_password environment variable

# Container Registry - Basic for development
acr_sku = "Basic"

# Monitoring - Minimal retention for cost savings
log_retention_days = 30

# Additional tags
additional_tags = {
  Team        = "Development"
  AutoShutdown = "true"
}
