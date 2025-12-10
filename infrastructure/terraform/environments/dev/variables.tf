# =============================================================================
# Flamoral Dating Platform - Dating-dev Environment
# Input Variables Definition
# =============================================================================
# All necessary input variables for the Dating-dev Azure infrastructure
# =============================================================================

# =============================================================================
# Azure Subscription & Authentication Variables
# =============================================================================

variable "subscription_id" {
  description = "Azure Subscription ID for Dating-dev environment"
  type        = string
  default     = "ba233460-2dbe-4603-a594-68f93ec9deb3"

  validation {
    condition     = can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.subscription_id))
    error_message = "Subscription ID must be a valid UUID format."
  }
}

variable "tenant_id" {
  description = "Azure AD Tenant ID for authentication"
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.tenant_id))
    error_message = "Tenant ID must be a valid UUID format."
  }
}

variable "location" {
  description = "Azure region for all Dating-dev resources"
  type        = string
  default     = "westus2"

  validation {
    condition = contains([
      "eastus", "eastus2", "westus", "westus2", "westus3",
      "centralus", "northcentralus", "southcentralus",
      "northeurope", "westeurope", "uksouth", "ukwest"
    ], var.location)
    error_message = "Location must be a valid Azure region."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group (with standard -rg suffix)"
  type        = string
  default     = "Dating-dev-rg"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]+$", var.resource_group_name))
    error_message = "Resource group name can only contain alphanumeric characters, hyphens, and underscores."
  }
}

# =============================================================================
# Service Principal Configuration (terraform-datingapp-sp)
# =============================================================================

variable "terraform_sp_name" {
  description = "Service Principal name used for Terraform operations"
  type        = string
  default     = "terraform-datingapp-sp"
}

variable "terraform_sp_client_id" {
  description = "Service Principal Client (Application) ID for Terraform authentication"
  type        = string
  default     = "a85e4029-4e37-4399-9390-6e18922b38e7"

  validation {
    condition     = can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.terraform_sp_client_id))
    error_message = "Service Principal Client ID must be a valid UUID format."
  }
}

# =============================================================================
# Resource Tags
# =============================================================================

variable "tags" {
  description = "Common tags applied to all resources following dev-environment pattern"
  type        = map(string)
  default = {
    Project       = "Flamoral"
    Environment   = "dev-environment"
    ManagedBy     = "Terraform"
    Owner         = "Engineering"
    Application   = "Dating Platform"
    Domain        = "flamoral.com"
    CostCenter    = "Development"
    ResourceGroup = "Dating-dev-rg"
  }
}

# =============================================================================
# Network Configuration Variables
# =============================================================================

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.10.0.0/16"]
}

variable "aks_subnet_prefix" {
  description = "Address prefix for AKS subnet"
  type        = string
  default     = "10.10.1.0/24"
}

variable "db_subnet_prefix" {
  description = "Address prefix for database subnet"
  type        = string
  default     = "10.10.2.0/24"
}

variable "redis_subnet_prefix" {
  description = "Address prefix for Redis subnet"
  type        = string
  default     = "10.10.3.0/24"
}

variable "private_endpoints_subnet_prefix" {
  description = "Address prefix for private endpoints subnet"
  type        = string
  default     = "10.10.4.0/24"
}

# =============================================================================
# AKS (Azure Kubernetes Service) Configuration
# =============================================================================

variable "kubernetes_version" {
  description = "Kubernetes version for AKS cluster"
  type        = string
  default     = "1.28.3"
}

# System Node Pool
variable "system_node_size" {
  description = "VM size for system node pool"
  type        = string
  default     = "Standard_B4ms"
}

variable "system_node_count" {
  description = "Initial node count for system node pool"
  type        = number
  default     = 1
}

variable "system_node_min_count" {
  description = "Minimum node count for system node pool autoscaling"
  type        = number
  default     = 1
}

variable "system_node_max_count" {
  description = "Maximum node count for system node pool autoscaling"
  type        = number
  default     = 2
}

variable "system_node_disk_size" {
  description = "OS disk size in GB for system nodes"
  type        = number
  default     = 64
}

# User Node Pool
variable "user_node_size" {
  description = "VM size for user workload node pool"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "user_node_count" {
  description = "Initial node count for user node pool"
  type        = number
  default     = 1
}

variable "user_node_min_count" {
  description = "Minimum node count for user node pool autoscaling"
  type        = number
  default     = 1
}

variable "user_node_max_count" {
  description = "Maximum node count for user node pool autoscaling"
  type        = number
  default     = 3
}

variable "user_node_disk_size" {
  description = "OS disk size in GB for user nodes"
  type        = number
  default     = 128
}

# =============================================================================
# Container Registry Configuration
# =============================================================================

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Basic"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "ACR SKU must be Basic, Standard, or Premium."
  }
}

# =============================================================================
# PostgreSQL Configuration
# =============================================================================

variable "postgres_version" {
  description = "PostgreSQL server version"
  type        = string
  default     = "15"

  validation {
    condition     = contains(["13", "14", "15", "16"], var.postgres_version)
    error_message = "PostgreSQL version must be 13, 14, 15, or 16."
  }
}

variable "postgres_sku_name" {
  description = "PostgreSQL SKU name (tier_family_cores format)"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 32768 # 32 GB

  validation {
    condition     = var.postgres_storage_mb >= 32768
    error_message = "PostgreSQL storage must be at least 32768 MB (32 GB)."
  }
}

variable "postgres_backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 7

  validation {
    condition     = var.postgres_backup_retention_days >= 7 && var.postgres_backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

variable "postgres_geo_redundant_backup" {
  description = "Enable geo-redundant backups"
  type        = bool
  default     = false
}

# =============================================================================
# Redis Cache Configuration
# =============================================================================

variable "redis_sku_name" {
  description = "Redis cache SKU name"
  type        = string
  default     = "Basic"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.redis_sku_name)
    error_message = "Redis SKU must be Basic, Standard, or Premium."
  }
}

variable "redis_family" {
  description = "Redis cache family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"

  validation {
    condition     = contains(["C", "P"], var.redis_family)
    error_message = "Redis family must be C or P."
  }
}

variable "redis_capacity" {
  description = "Redis cache capacity (0-6 for Basic/Standard, 1-5 for Premium)"
  type        = number
  default     = 0
}

# =============================================================================
# Storage Configuration
# =============================================================================

variable "storage_replication_type" {
  description = "Storage account replication type"
  type        = string
  default     = "LRS"

  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.storage_replication_type)
    error_message = "Storage replication type must be LRS, GRS, RAGRS, ZRS, GZRS, or RAGZRS."
  }
}

# =============================================================================
# Monitoring Configuration
# =============================================================================

variable "log_analytics_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 30

  validation {
    condition     = var.log_analytics_retention_days >= 30 && var.log_analytics_retention_days <= 730
    error_message = "Log Analytics retention must be between 30 and 730 days."
  }
}

# =============================================================================
# SignalR Configuration
# =============================================================================

variable "signalr_sku" {
  description = "SignalR service SKU"
  type        = string
  default     = "Free_F1"

  validation {
    condition     = contains(["Free_F1", "Standard_S1", "Premium_P1"], var.signalr_sku)
    error_message = "SignalR SKU must be Free_F1, Standard_S1, or Premium_P1."
  }
}

variable "signalr_capacity" {
  description = "SignalR service capacity (number of units)"
  type        = number
  default     = 1

  validation {
    condition     = var.signalr_capacity >= 1 && var.signalr_capacity <= 100
    error_message = "SignalR capacity must be between 1 and 100."
  }
}
