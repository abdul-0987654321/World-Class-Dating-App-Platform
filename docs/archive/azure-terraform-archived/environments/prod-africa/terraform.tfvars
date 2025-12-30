# =============================================================================
# Flamoral Dating Platform - Africa Region Configuration
# =============================================================================
# Region: Africa (South Africa North - Johannesburg)
# Data Residency: Africa
# Compliance: POPIA (South Africa), Regional Data Protection
# =============================================================================

subscription_id     = "ba233460-2dbe-4603-a594-68f93ec9deb3"
tenant_id           = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
resource_group_name = "flamoral-prod-africa-rg"
location            = "southafricanorth"

# Service Principal
terraform_sp_name      = "terraform-datingapp-sp"
terraform_sp_client_id = "a85e4029-4e37-4399-9390-6e18922b38e7"

# Shared Resources (Geo-replicated ACR)
shared_acr_name            = "flamoralacr"
shared_resource_group_name = "flamoral-shared-rg"

# Domain Configuration
domain_name       = "africa.flamoral.com"
ingress_public_ip = ""

# Network Configuration - Africa VNet
vnet_address_space              = ["10.60.0.0/16"]
aks_subnet_prefix               = "10.60.1.0/24"
db_subnet_prefix                = "10.60.2.0/24"
redis_subnet_prefix             = "10.60.3.0/24"
private_endpoints_subnet_prefix = "10.60.4.0/24"
appgw_subnet_prefix             = "10.60.5.0/24"

# AKS Configuration - Africa Cluster (Scaled for emerging market)
kubernetes_version = "1.28.3"

system_node_size      = "Standard_D4s_v3"
system_node_count     = 2
system_node_min_count = 2
system_node_max_count = 4
system_node_disk_size = 128

user_node_size      = "Standard_D4s_v3"
user_node_count     = 2
user_node_min_count = 2
user_node_max_count = 15
user_node_disk_size = 256

# PostgreSQL Configuration - Regional
postgres_version               = "15"
postgres_sku_name              = "GP_Standard_D2s_v3"
postgres_storage_mb            = 131072  # 128 GB
postgres_backup_retention_days = 35
postgres_geo_redundant_backup  = true

# Data Residency: Africa data stays in Africa
postgres_data_residency = "africa"

# Redis Configuration - Premium
redis_sku_name = "Premium"
redis_family   = "P"
redis_capacity = 1

# Storage Configuration - Africa region
storage_replication_type = "LRS"  # Zone redundancy limited in region

# Monitoring
log_analytics_retention_days = 90

# SignalR Configuration
signalr_sku      = "Standard_S1"
signalr_capacity = 1

# Regional Compliance Configuration - POPIA
compliance_config = {
  data_residency        = "africa"
  popia_enabled         = true  # South Africa POPIA
  gdpr_enabled          = false
  ccpa_enabled          = false
  retention_policy      = "popia_compliant"
  encryption_at_rest    = true
  encryption_in_transit = true
  audit_logging         = true
}

# Payment Providers - Africa specific
payment_providers = {
  stripe_enabled      = true
  paystack_enabled    = true   # Nigerian market
  flutterwave_enabled = true   # Pan-African payments
}

# Tags
tags = {
  Project         = "Flamoral"
  Environment     = "production"
  Region          = "africa"
  ManagedBy       = "Terraform"
  Owner           = "Engineering"
  Application     = "Dating Platform"
  Domain          = "africa.flamoral.com"
  CostCenter      = "Production-Africa"
  DataResidency   = "Africa"
  Compliance      = "POPIA"
}
