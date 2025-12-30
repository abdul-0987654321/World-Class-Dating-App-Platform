# Azure Staging Environment Variables

# Network Configuration
vnet_address_space        = "10.2.0.0/16"
enable_nat_gateway        = true
enable_bastion            = false
enable_network_monitoring = true

# AKS Configuration
kubernetes_version     = "1.28.3"
system_node_size       = "Standard_D2s_v3"
system_node_count      = 2
system_node_min_count  = 2
system_node_max_count  = 3
system_node_disk_size  = 128

user_node_size        = "Standard_D4s_v3"
user_node_count       = 2
user_node_min_count   = 2
user_node_max_count   = 6
user_node_disk_size   = 256

enable_spot_instances = false

# PostgreSQL Configuration
postgres_sku_name              = "GP_Standard_D4s_v3"
postgres_storage_mb            = 131072 # 128 GB
postgres_backup_retention_days = 14
postgres_geo_redundant_backup  = true
postgres_high_availability     = true

# Redis Configuration
redis_sku_name  = "Standard"
redis_family    = "C"
redis_capacity  = 2
redis_replicas  = 1

# Storage Configuration
storage_account_replication_type = "GRS"
enable_geo_replication           = true

# Container Registry
acr_sku = "Standard"

# Monitoring
log_analytics_retention_days = 60
