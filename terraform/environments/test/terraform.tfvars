# Test Environment - Terraform Variables
# DatingPlatform Infrastructure

environment          = "test"
location             = "westus2"
resource_name_prefix = "datingplatform"
subscription_id      = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"

# App Service - Standard tier for testing
app_service_sku = "S1"

# SQL Database - Standard tier for testing
sql_sku           = "S0"
sql_max_size_gb   = 10
sql_admin_username = "sqladmin"

# Container Registry - Standard for testing
acr_sku = "Standard"

# Monitoring - Moderate retention
log_retention_days = 60

additional_tags = {
  Team = "QA"
}
