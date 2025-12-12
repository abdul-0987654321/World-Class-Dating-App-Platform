# =============================================================================
# Flamoral Dating Platform - Development Environment Configuration
# =============================================================================
# This file contains environment-specific values for the dev environment
# Use with: terraform apply -var-file="dev.tfvars"
# =============================================================================

# =============================================================================
# Azure Subscription & Authentication
# =============================================================================
subscription_id = "ba233460-2dbe-4603-a594-68f93ec9deb3"
tenant_id       = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"

# =============================================================================
# Resource Configuration
# =============================================================================
resource_group_name = "Dating-dev-rg"
location            = "westus2"

# Service Principal
terraform_sp_name      = "terraform-datingapp-sp"
terraform_sp_client_id = "a85e4029-4e37-4399-9390-6e18922b38e7"

# =============================================================================
# Network Configuration
# =============================================================================
vnet_address_space              = ["10.10.0.0/16"]
aks_subnet_prefix               = "10.10.1.0/24"
db_subnet_prefix                = "10.10.2.0/24"
redis_subnet_prefix             = "10.10.3.0/24"
private_endpoints_subnet_prefix = "10.10.4.0/24"

# =============================================================================
# AKS Configuration - Development (Cost-Optimized)
# =============================================================================
kubernetes_version = "1.28.3"

# System Node Pool
system_node_size      = "Standard_B4ms"
system_node_count     = 1
system_node_min_count = 1
system_node_max_count = 2
system_node_disk_size = 64

# User Node Pool
user_node_size      = "Standard_D4s_v3"
user_node_count     = 1
user_node_min_count = 1
user_node_max_count = 3
user_node_disk_size = 128

# =============================================================================
# PostgreSQL Configuration - Development
# =============================================================================
postgres_version               = "15"
postgres_sku_name              = "B_Standard_B1ms"
postgres_storage_mb            = 32768 # 32 GB
postgres_backup_retention_days = 7
postgres_geo_redundant_backup  = false

# =============================================================================
# Redis Configuration - Development
# =============================================================================
redis_sku_name = "Basic"
redis_family   = "C"
redis_capacity = 0

# =============================================================================
# Storage Configuration - Development
# =============================================================================
storage_replication_type = "LRS"

# =============================================================================
# Container Registry
# =============================================================================
acr_sku = "Basic"

# =============================================================================
# Monitoring Configuration - Development
# =============================================================================
log_analytics_retention_days = 30

# =============================================================================
# SignalR Configuration - Development
# =============================================================================
signalr_sku      = "Free_F1"
signalr_capacity = 1

# =============================================================================
# Tags
# =============================================================================
tags = {
  Project       = "Flamoral"
  Environment   = "dev-environment"
  ManagedBy     = "Terraform"
  Owner         = "Engineering"
  Application   = "Dating Platform"
  Domain        = "flamoral.com"
  CostCenter    = "Development"
  ResourceGroup = "Dating-dev-rg"
}
