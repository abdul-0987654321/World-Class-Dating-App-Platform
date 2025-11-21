# Azure Development Environment Variables

# Network Configuration
vnet_address_space        = "10.1.0.0/16"
enable_nat_gateway        = false # Save costs in dev
enable_bastion            = false
enable_network_monitoring = false

# AKS Configuration
kubernetes_version     = "1.28.3"
system_node_size       = "Standard_B4ms"
system_node_count      = 1
system_node_min_count  = 1
system_node_max_count  = 2
system_node_disk_size  = 64

user_node_size        = "Standard_D4s_v3"
user_node_count       = 1
user_node_min_count   = 1
user_node_max_count   = 3
user_node_disk_size   = 128

enable_spot_instances = true
spot_node_min_count   = 0
spot_node_max_count   = 2

# PostgreSQL Configuration
postgres_sku_name              = "B_Standard_B1ms"
postgres_storage_mb            = 32768 # 32 GB
postgres_backup_retention_days = 7
postgres_geo_redundant_backup  = false
postgres_high_availability     = false

# Redis Configuration
redis_sku_name  = "Basic"
redis_family    = "C"
redis_capacity  = 0
redis_replicas  = 0

# Storage Configuration
storage_account_replication_type = "LRS"
enable_geo_replication           = false

# Container Registry
acr_sku = "Basic"

# Monitoring
log_analytics_retention_days = 30
