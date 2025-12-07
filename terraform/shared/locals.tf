# Common Local Values
#
# These locals are shared across all environments and provide
# consistent naming conventions, tags, and configuration defaults.

locals {
  # Project identification
  project_name = "datingplatform"
  project_code = "dp"

  # Azure subscription and tenant
  subscription_id = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
  tenant_domain   = "citadelcloudmanagementgmail.onmicrosoft.com"

  # Primary and secondary regions
  primary_region   = "westus2"
  secondary_region = "eastus2"

  # Region abbreviations for naming
  region_abbreviations = {
    westus2   = "wus2"
    eastus2   = "eus2"
    centralus = "cus"
    westus    = "wus"
    eastus    = "eus"
  }

  # Environment configurations
  environment_configs = {
    dev = {
      short_name           = "dev"
      is_production        = false
      enable_delete_lock   = false
      log_retention_days   = 30
      backup_retention_days = 7
      replication_type     = "LRS"
      sku_tier             = "Basic"
    }
    test = {
      short_name           = "test"
      is_production        = false
      enable_delete_lock   = false
      log_retention_days   = 60
      backup_retention_days = 14
      replication_type     = "GRS"
      sku_tier             = "Standard"
    }
    prod = {
      short_name           = "prod"
      is_production        = true
      enable_delete_lock   = true
      log_retention_days   = 90
      backup_retention_days = 30
      replication_type     = "RAGRS"
      sku_tier             = "Premium"
    }
  }

  # Common tags applied to all resources
  common_tags = {
    Project     = "DatingPlatform"
    ManagedBy   = "Terraform"
    Repository  = "https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
    CostCenter  = "Engineering"
  }

  # Naming convention patterns
  # Format: {resource_type}-{project}-{environment}-{region}
  naming_patterns = {
    resource_group     = "rg-%s-%s-%s"      # rg-datingplatform-dev-westus2
    storage_account    = "st%s%s%s"          # stdatingplatformdevwus2 (no hyphens)
    key_vault          = "kv-%s-%s-%s"       # kv-datingplatform-dev-wus2
    container_registry = "acr%s%s"           # acrdatingplatformdev (no hyphens)
    app_service_plan   = "asp-%s-%s-%s"      # asp-datingplatform-dev-westus2
    app_service        = "app-%s-%s-%s"      # app-datingplatform-dev-westus2
    sql_server         = "sql-%s-%s-%s"      # sql-datingplatform-dev-westus2
    sql_database       = "sqldb-%s-%s"       # sqldb-datingplatform-dev
    vnet               = "vnet-%s-%s-%s"     # vnet-datingplatform-dev-westus2
    subnet             = "snet-%s-%s"        # snet-app-dev
    nsg                = "nsg-%s-%s-%s"      # nsg-datingplatform-dev-westus2
    log_analytics      = "log-%s-%s-%s"      # log-datingplatform-dev-westus2
    app_insights       = "appi-%s-%s-%s"     # appi-datingplatform-dev-westus2
  }

  # Network CIDR blocks
  network_cidrs = {
    dev = {
      vnet          = "10.0.0.0/16"
      app_subnet    = "10.0.1.0/24"
      db_subnet     = "10.0.2.0/24"
      cache_subnet  = "10.0.3.0/24"
      mgmt_subnet   = "10.0.4.0/24"
    }
    test = {
      vnet          = "10.1.0.0/16"
      app_subnet    = "10.1.1.0/24"
      db_subnet     = "10.1.2.0/24"
      cache_subnet  = "10.1.3.0/24"
      mgmt_subnet   = "10.1.4.0/24"
    }
    prod = {
      vnet          = "10.2.0.0/16"
      app_subnet    = "10.2.1.0/24"
      db_subnet     = "10.2.2.0/24"
      cache_subnet  = "10.2.3.0/24"
      mgmt_subnet   = "10.2.4.0/24"
    }
  }

  # SKU mappings by environment
  sku_mappings = {
    app_service = {
      dev  = "B1"
      test = "S1"
      prod = "P1v3"
    }
    sql_database = {
      dev  = "Basic"
      test = "S0"
      prod = "S3"
    }
    container_registry = {
      dev  = "Basic"
      test = "Standard"
      prod = "Premium"
    }
    key_vault = {
      dev  = "standard"
      test = "standard"
      prod = "premium"
    }
  }

  # Azure DevOps configuration
  azure_devops = {
    organization = "citadelcloudmanagement"
    project      = "DatingPlatform"
    repository   = "DatingPlatform"
    repo_url     = "https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
  }
}
