# Development Environment Configuration

env      = "dev"
location = "eastus"
prefix   = "datingapp"

# Subscription and Tenant IDs
subscription_id = "ba233460-2dbe-4603-a594-68f93ec9deb3"
tenant_id       = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"

# Network Configuration
vnet_address_space = ["10.1.0.0/16"]
aks_subnet_prefix  = "10.1.1.0/24"
db_subnet_prefix   = "10.1.2.0/24"
redis_subnet_prefix = "10.1.3.0/24"

# AKS Configuration
aks_node_count    = 1
aks_node_vm_size  = "Standard_D2s_v3"
kubernetes_version = "1.28.3"

# PostgreSQL Configuration
postgres_sku_name    = "B_Standard_B1ms"
postgres_storage_mb  = 32768
postgres_version     = "14"

# Redis Configuration
redis_sku_name  = "Basic"
redis_family    = "C"
redis_capacity  = 0

# Storage Configuration
storage_account_tier = "Standard"
storage_replication  = "LRS"
enable_cdn           = false

# Front Door Configuration
frontdoor_sku = "Standard_AzureFrontDoor"
waf_mode      = "Detection"

# CosmosDB Configuration
cosmos_consistency_level = "Session"
cosmos_enable_serverless = true

# Monitoring Configuration
log_retention_days        = 30
appinsights_retention_days = 30
appinsights_daily_cap_gb  = 5
enable_alerts             = false

# Tags
tags = {
  Environment = "Development"
  ManagedBy   = "Terraform"
  Project     = "DatingApp"
  CostCenter  = "Engineering"
}
