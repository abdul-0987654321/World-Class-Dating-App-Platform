# Development Environment - Local Values
# DatingPlatform Infrastructure

locals {
  # Common tags applied to all resources
  common_tags = merge(
    {
      Environment  = var.environment
      Project      = "DatingPlatform"
      ManagedBy    = "Terraform"
      CostCenter   = "Engineering"
      Owner        = "DevOps"
      Repository   = "https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
      DeployedDate = timestamp()
    },
    var.additional_tags
  )

  # Naming conventions
  name_prefix = "${var.resource_name_prefix}-${var.environment}"

  # Development-specific configurations
  dev_config = {
    # Cost optimization settings
    auto_shutdown_enabled = true
    redundancy_enabled    = false

    # Security (relaxed for dev)
    network_security_level = "permissive"

    # Performance
    scaling_enabled = false

    # Monitoring
    detailed_monitoring = false
  }

  # Network configuration
  network_config = {
    vnet_cidr        = "10.0.0.0/16"
    app_subnet_cidr  = "10.0.1.0/24"
    db_subnet_cidr   = "10.0.2.0/24"
    cache_subnet_cidr = "10.0.3.0/24"
    mgmt_subnet_cidr = "10.0.4.0/24"
  }
}
