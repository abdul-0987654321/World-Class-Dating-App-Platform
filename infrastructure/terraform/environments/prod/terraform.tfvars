# =============================================================================
# Flamoral Dating Platform - Production Environment Configuration
# =============================================================================
# Environment: Production
# Access: PUBLIC - flamoral.com domain integration
# =============================================================================

subscription_id     = "ba233460-2dbe-4603-a594-68f93ec9deb3"
tenant_id           = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
resource_group_name = "flamoral-prod-rg"
location            = "westus2"

# Service Principal
terraform_sp_name      = "terraform-datingapp-sp"
terraform_sp_client_id = "a85e4029-4e37-4399-9390-6e18922b38e7"

# Shared Resources
shared_acr_name            = "flamoralprodacr"
shared_resource_group_name = "flamoral-shared-rg"

# Domain Configuration
domain_name       = "flamoral.com"
ingress_public_ip = "" # Will be set after initial deployment

# Network Configuration
vnet_address_space              = ["10.30.0.0/16"]
aks_subnet_prefix               = "10.30.1.0/24"
db_subnet_prefix                = "10.30.2.0/24"
redis_subnet_prefix             = "10.30.3.0/24"
private_endpoints_subnet_prefix = "10.30.4.0/24"
appgw_subnet_prefix             = "10.30.5.0/24"

# AKS Configuration - Production Grade
kubernetes_version = "1.28.3"

system_node_size      = "Standard_D4s_v3"
system_node_count     = 3
system_node_min_count = 3
system_node_max_count = 5
system_node_disk_size = 128

user_node_size      = "Standard_D8s_v3"
user_node_count     = 3
user_node_min_count = 3
user_node_max_count = 20
user_node_disk_size = 256

# PostgreSQL Configuration - High Availability
postgres_version               = "15"
postgres_sku_name              = "GP_Standard_D4s_v3"
postgres_storage_mb            = 262144 # 256 GB
postgres_backup_retention_days = 35
postgres_geo_redundant_backup  = true

# Redis Configuration - Premium with Zone Redundancy
redis_sku_name = "Premium"
redis_family   = "P"
redis_capacity = 1

# Storage Configuration - Geo-Redundant
storage_replication_type = "GRS"

# Monitoring - Extended Retention
log_analytics_retention_days = 90

# SignalR Configuration - Premium
signalr_sku      = "Premium_P1"
signalr_capacity = 1

# Tags
tags = {
  Project     = "Flamoral"
  Environment = "production"
  ManagedBy   = "Terraform"
  Owner       = "Engineering"
  Application = "Dating Platform"
  Domain      = "flamoral.com"
  CostCenter  = "Production"
  AccessLevel = "Public"
  Compliance  = "GDPR"
}
