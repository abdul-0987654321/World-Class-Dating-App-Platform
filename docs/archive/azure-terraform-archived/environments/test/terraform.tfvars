# =============================================================================
# Flamoral Dating Platform - Test Environment Configuration
# =============================================================================
# Environment: Test (Staging)
# Access: PRIVATE ONLY - No public endpoints
# =============================================================================

subscription_id     = "ba233460-2dbe-4603-a594-68f93ec9deb3"
tenant_id           = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
resource_group_name = "flamoral-test-rg"
location            = "westus2"

# Service Principal
terraform_sp_name      = "terraform-datingapp-sp"
terraform_sp_client_id = "a85e4029-4e37-4399-9390-6e18922b38e7"

# Shared Resources
shared_acr_name            = "flamoralacr"
shared_resource_group_name = "flamoral-shared-rg"

# Network Configuration
vnet_address_space              = ["10.20.0.0/16"]
aks_subnet_prefix               = "10.20.1.0/24"
db_subnet_prefix                = "10.20.2.0/24"
redis_subnet_prefix             = "10.20.3.0/24"
private_endpoints_subnet_prefix = "10.20.4.0/24"

# AKS Configuration - PRIVATE CLUSTER
kubernetes_version      = "1.28.3"
private_cluster_enabled = true

system_node_size      = "Standard_B4ms"
system_node_count     = 1
system_node_min_count = 1
system_node_max_count = 3
system_node_disk_size = 64

user_node_size      = "Standard_D4s_v3"
user_node_count     = 2
user_node_min_count = 1
user_node_max_count = 5
user_node_disk_size = 128

# PostgreSQL Configuration
postgres_version               = "15"
postgres_sku_name              = "GP_Standard_D2s_v3"
postgres_storage_mb            = 65536
postgres_backup_retention_days = 14
postgres_geo_redundant_backup  = false

# Redis Configuration
redis_sku_name = "Standard"
redis_family   = "C"
redis_capacity = 1

# Storage Configuration
storage_replication_type = "LRS"

# Monitoring
log_analytics_retention_days = 30

# SignalR Configuration
signalr_sku      = "Standard_S1"
signalr_capacity = 1

# Tags
tags = {
  Project     = "Flamoral"
  Environment = "test"
  ManagedBy   = "Terraform"
  Owner       = "Engineering"
  Application = "Dating Platform"
  Domain      = "flamoral.com"
  CostCenter  = "Test"
  AccessLevel = "Private"
}
