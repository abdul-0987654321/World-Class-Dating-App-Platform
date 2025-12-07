# Test Environment - Local Values
# DatingPlatform Infrastructure

locals {
  common_tags = merge(
    {
      Environment  = var.environment
      Project      = "DatingPlatform"
      ManagedBy    = "Terraform"
      CostCenter   = "Engineering"
      Owner        = "QA"
      Repository   = "https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
      DeployedDate = timestamp()
    },
    var.additional_tags
  )

  name_prefix = "${var.resource_name_prefix}-${var.environment}"

  test_config = {
    auto_shutdown_enabled  = false
    redundancy_enabled     = true
    network_security_level = "moderate"
    scaling_enabled        = true
    detailed_monitoring    = true
  }

  network_config = {
    vnet_cidr        = "10.1.0.0/16"
    app_subnet_cidr  = "10.1.1.0/24"
    db_subnet_cidr   = "10.1.2.0/24"
    cache_subnet_cidr = "10.1.3.0/24"
    mgmt_subnet_cidr = "10.1.4.0/24"
  }
}
