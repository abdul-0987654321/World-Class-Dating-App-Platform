# =============================================================================
# Flamoral Dating Platform - ACR Geo-Replication Configuration
# =============================================================================
# Production ACR with geo-replication across Americas, Europe, and Africa
# Requires Premium SKU for geo-replication support
# =============================================================================

# ACR Configuration - Premium SKU required for geo-replication
acr_sku        = "Premium"
admin_enabled  = false  # Disable admin for production security (use service principals)

# Geo-replication locations for global container distribution
# Aligns with AKS cluster regions for optimal pull performance
georeplications = [
  {
    # Americas - Primary region
    location                = "eastus"
    zone_redundancy_enabled = true
  },
  {
    # Europe - Secondary region
    location                = "westeurope"
    zone_redundancy_enabled = true
  },
  {
    # Africa - Tertiary region (South Africa North)
    location                = "southafricanorth"
    zone_redundancy_enabled = false  # Zone redundancy not available in all regions
  }
]

# Retention policy for untagged manifests (Premium feature)
retention_days    = 30
retention_enabled = true

# Trust policy for signed images (Premium feature)
trust_policy_enabled = true

# Network rules - restrict to AKS subnets only
# Note: Update with actual subnet IDs after VNet deployment
allowed_subnet_ids = []

# Tags for cost tracking and compliance
tags = {
  Project         = "Flamoral"
  Environment     = "production"
  ManagedBy       = "Terraform"
  Component       = "Container-Registry"
  Compliance      = "GDPR,SOC2"
  CostCenter      = "Infrastructure"
  GeoReplicated   = "true"
  Regions         = "westus2,eastus,westeurope,southafricanorth"
}
