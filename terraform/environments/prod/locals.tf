# Production Environment - Local Values
# DatingPlatform Infrastructure

locals {
  common_tags = merge(
    {
      Environment       = var.environment
      Project           = "DatingPlatform"
      ManagedBy         = "Terraform"
      CostCenter        = "Engineering"
      Owner             = "Platform"
      Repository        = "https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
      DeployedDate      = timestamp()
      Compliance        = "SOC2,GDPR"
      DataClassification = "Confidential"
      CriticalityLevel  = "High"
    },
    var.additional_tags
  )

  name_prefix = "${var.resource_name_prefix}-${var.environment}"

  prod_config = {
    auto_shutdown_enabled  = false
    redundancy_enabled     = true
    network_security_level = "strict"
    scaling_enabled        = true
    detailed_monitoring    = true
    backup_enabled         = true
    geo_replication        = true
  }

  network_config = {
    vnet_cidr              = "10.2.0.0/16"
    app_subnet_cidr        = "10.2.1.0/24"
    db_subnet_cidr         = "10.2.2.0/24"
    cache_subnet_cidr      = "10.2.3.0/24"
    mgmt_subnet_cidr       = "10.2.4.0/24"
    private_endpoint_cidr  = "10.2.5.0/24"
  }

  # Production compliance requirements
  compliance = {
    encryption_at_rest    = true
    encryption_in_transit = true
    audit_logging         = true
    threat_detection      = true
    vulnerability_assessment = true
  }
}
