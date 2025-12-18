# =============================================================================
# Flamoral Dating Platform - Americas Region Configuration
# =============================================================================
# Region: Americas (East US - Primary)
# Data Residency: North America
# Compliance: SOC2, CCPA
# =============================================================================

subscription_id     = "ba233460-2dbe-4603-a594-68f93ec9deb3"
tenant_id           = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
resource_group_name = "flamoral-prod-americas-rg"
location            = "eastus"

# Service Principal
terraform_sp_name      = "terraform-datingapp-sp"
terraform_sp_client_id = "a85e4029-4e37-4399-9390-6e18922b38e7"

# Shared Resources (Geo-replicated ACR)
shared_acr_name            = "flamoralacr"
shared_resource_group_name = "flamoral-shared-rg"

# Domain Configuration
domain_name       = "americas.flamoral.com"
ingress_public_ip = ""

# Network Configuration - Americas VNet
vnet_address_space              = ["10.40.0.0/16"]
aks_subnet_prefix               = "10.40.1.0/24"
db_subnet_prefix                = "10.40.2.0/24"
redis_subnet_prefix             = "10.40.3.0/24"
private_endpoints_subnet_prefix = "10.40.4.0/24"
appgw_subnet_prefix             = "10.40.5.0/24"

# AKS Configuration - Americas Cluster
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

# PostgreSQL Configuration - Regional with Read Replicas
postgres_version               = "15"
postgres_sku_name              = "GP_Standard_D4s_v3"
postgres_storage_mb            = 262144
postgres_backup_retention_days = 35
postgres_geo_redundant_backup  = true

# Data Residency: Americas data stays in Americas
postgres_data_residency = "americas"

# Redis Configuration - Premium with Zone Redundancy
redis_sku_name = "Premium"
redis_family   = "P"
redis_capacity = 1

# Storage Configuration - Americas region
storage_replication_type = "ZRS"  # Zone-redundant within region

# Monitoring
log_analytics_retention_days = 90

# SignalR Configuration
signalr_sku      = "Premium_P1"
signalr_capacity = 1

# Regional Compliance Configuration
compliance_config = {
  data_residency     = "north_america"
  ccpa_enabled       = true
  hipaa_enabled      = false
  gdpr_enabled       = false  # GDPR not primary for Americas
  retention_policy   = "7_years"
  encryption_at_rest = true
  encryption_in_transit = true
}

# Tags
tags = {
  Project         = "Flamoral"
  Environment     = "production"
  Region          = "americas"
  ManagedBy       = "Terraform"
  Owner           = "Engineering"
  Application     = "Dating Platform"
  Domain          = "americas.flamoral.com"
  CostCenter      = "Production-Americas"
  DataResidency   = "NorthAmerica"
  Compliance      = "SOC2,CCPA"
}
