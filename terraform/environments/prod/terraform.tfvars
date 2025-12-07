# Production Environment - Terraform Variables
# DatingPlatform Infrastructure
#
# PRODUCTION CONFIGURATION - Handle with care!

environment          = "prod"
location             = "westus2"
secondary_location   = "eastus2"
resource_name_prefix = "datingplatform"
subscription_id      = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"

# App Service - Premium tier for production
app_service_sku = "P1v3"

# SQL Database - Standard S3 for production workloads
sql_sku           = "S3"
sql_max_size_gb   = 100
sql_admin_username = "sqladmin"

# Container Registry - Premium for geo-replication
acr_sku = "Premium"

# Monitoring - Extended retention for compliance
log_retention_days = 90

# High Availability Features
enable_geo_replication = true
enable_ddos_protection = true

additional_tags = {
  Team           = "Platform"
  SLA            = "99.9"
  BackupPolicy   = "Daily"
  PatchWindow    = "Sunday-02:00-06:00-UTC"
}
