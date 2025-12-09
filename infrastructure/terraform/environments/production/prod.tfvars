# Production Environment Configuration

env      = "prod"
location = "eastus"
prefix   = "datingapp"

# Subscription and Tenant IDs
subscription_id = "ba233460-2dbe-4603-a594-68f93ec9deb3"
tenant_id       = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"

# Network Configuration
vnet_address_space = ["10.0.0.0/16"]
aks_subnet_prefix  = "10.0.1.0/24"
db_subnet_prefix   = "10.0.2.0/24"
redis_subnet_prefix = "10.0.3.0/24"

# AKS Configuration
aks_node_count    = 3
aks_node_vm_size  = "Standard_D8s_v3"
kubernetes_version = "1.28.3"

# PostgreSQL Configuration
postgres_sku_name    = "GP_Standard_D8s_v3"
postgres_storage_mb  = 262144
postgres_version     = "14"
postgres_geo_redundant_backup = true

# Redis Configuration
redis_sku_name  = "Premium"
redis_family    = "P"
redis_capacity  = 2
redis_enable_rdb_backup = true

# Storage Configuration
storage_account_tier = "Standard"
storage_replication  = "GZRS"
enable_cdn           = true
cdn_sku              = "Premium_Verizon"

# Front Door Configuration
frontdoor_sku = "Premium_AzureFrontDoor"
waf_mode      = "Prevention"
enable_geo_filtering = false

# CosmosDB Configuration
cosmos_consistency_level = "Session"
cosmos_enable_serverless = false
cosmos_secondary_location = "westus"
cosmos_automatic_failover = true

# Monitoring Configuration
log_retention_days        = 365
appinsights_retention_days = 365
appinsights_daily_cap_gb  = 50
enable_alerts             = true

# Alert Configuration
alert_email_receivers = [
  {
    name  = "OpsTeam"
    email = "ops-team@flamoral.com"
  },
  {
    name  = "OnCallEngineer"
    email = "oncall@flamoral.com"
  }
]

alert_webhook_receivers = [
  {
    name = "PagerDuty"
    uri  = "https://events.pagerduty.com/integration/YOUR_INTEGRATION_KEY/enqueue"
  }
]

# Security Configuration
enable_private_endpoints = true

# Tags
tags = {
  Environment = "Production"
  ManagedBy   = "Terraform"
  Project     = "DatingApp"
  CostCenter  = "Engineering"
  Compliance  = "Required"
}
