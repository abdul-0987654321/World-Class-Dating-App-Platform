# Staging Environment Configuration

env      = "staging"
location = "eastus"
prefix   = "datingapp"

# Subscription and Tenant IDs
subscription_id = "ba233460-2dbe-4603-a594-68f93ec9deb3"
tenant_id       = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"

# Network Configuration
vnet_address_space = ["10.2.0.0/16"]
aks_subnet_prefix  = "10.2.1.0/24"
db_subnet_prefix   = "10.2.2.0/24"
redis_subnet_prefix = "10.2.3.0/24"

# AKS Configuration
aks_node_count    = 2
aks_node_vm_size  = "Standard_D4s_v3"
kubernetes_version = "1.28.3"

# PostgreSQL Configuration
postgres_sku_name    = "GP_Standard_D2s_v3"
postgres_storage_mb  = 65536
postgres_version     = "14"

# Redis Configuration
redis_sku_name  = "Standard"
redis_family    = "C"
redis_capacity  = 1

# Storage Configuration
storage_account_tier = "Standard"
storage_replication  = "GRS"
enable_cdn           = true
cdn_sku              = "Standard_Microsoft"

# Front Door Configuration
frontdoor_sku = "Standard_AzureFrontDoor"
waf_mode      = "Prevention"

# CosmosDB Configuration
cosmos_consistency_level = "Session"
cosmos_enable_serverless = true

# Monitoring Configuration
log_retention_days        = 60
appinsights_retention_days = 60
appinsights_daily_cap_gb  = 10
enable_alerts             = true

# Alert Configuration
alert_email_receivers = [
  {
    name  = "DevTeam"
    email = "dev-team@datingapp.com"
  }
]

# Tags
tags = {
  Environment = "Staging"
  ManagedBy   = "Terraform"
  Project     = "DatingApp"
  CostCenter  = "Engineering"
}
