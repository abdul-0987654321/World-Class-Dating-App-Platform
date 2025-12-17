# =============================================================================
# Flamoral Dating Platform - Staging Environment Variables
# =============================================================================

# =============================================================================
# Azure Subscription & Authentication
# =============================================================================
variable "subscription_id" {
  description = "Azure Subscription ID for staging environment"
  type        = string
  default     = "ba233460-2dbe-4603-a594-68f93ec9deb3"
}

variable "tenant_id" {
  description = "Azure AD Tenant ID"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "westus2"
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "flamoral-staging-rg"
}

# =============================================================================
# Service Principal Configuration
# =============================================================================
variable "terraform_sp_name" {
  description = "Service Principal name"
  type        = string
  default     = "terraform-datingapp-sp"
}

variable "terraform_sp_client_id" {
  description = "Service Principal Client ID"
  type        = string
  default     = "a85e4029-4e37-4399-9390-6e18922b38e7"
}

# =============================================================================
# Tags
# =============================================================================
variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    Project     = "Flamoral"
    Environment = "staging"
    ManagedBy   = "Terraform"
    Owner       = "Engineering"
    Application = "Dating Platform"
    Domain      = "flamoral.com"
    CostCenter  = "Staging"
  }
}

# =============================================================================
# Network Configuration
# =============================================================================
variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.20.0.0/16"]
}

variable "aks_subnet_prefix" {
  description = "Address prefix for AKS subnet"
  type        = string
  default     = "10.20.1.0/24"
}

variable "db_subnet_prefix" {
  description = "Address prefix for database subnet"
  type        = string
  default     = "10.20.2.0/24"
}

variable "redis_subnet_prefix" {
  description = "Address prefix for Redis subnet"
  type        = string
  default     = "10.20.3.0/24"
}

variable "private_endpoints_subnet_prefix" {
  description = "Address prefix for private endpoints subnet"
  type        = string
  default     = "10.20.4.0/24"
}

# =============================================================================
# AKS Configuration
# =============================================================================
variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28.3"
}

variable "system_node_size" {
  description = "VM size for system node pool"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "system_node_count" {
  description = "Initial node count"
  type        = number
  default     = 2
}

variable "system_node_min_count" {
  description = "Minimum nodes"
  type        = number
  default     = 2
}

variable "system_node_max_count" {
  description = "Maximum nodes"
  type        = number
  default     = 3
}

variable "system_node_disk_size" {
  description = "OS disk size in GB"
  type        = number
  default     = 64
}

variable "user_node_size" {
  description = "VM size for user node pool"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "user_node_count" {
  description = "Initial user node count"
  type        = number
  default     = 2
}

variable "user_node_min_count" {
  description = "Minimum user nodes"
  type        = number
  default     = 2
}

variable "user_node_max_count" {
  description = "Maximum user nodes"
  type        = number
  default     = 5
}

variable "user_node_disk_size" {
  description = "User node OS disk size in GB"
  type        = number
  default     = 128
}

# =============================================================================
# Container Registry Configuration
# =============================================================================
variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Standard"
}

# =============================================================================
# PostgreSQL Configuration
# =============================================================================
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "postgres_sku_name" {
  description = "PostgreSQL SKU"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 65536 # 64 GB
}

variable "postgres_backup_retention_days" {
  description = "Backup retention days"
  type        = number
  default     = 14
}

variable "postgres_geo_redundant_backup" {
  description = "Enable geo-redundant backups"
  type        = bool
  default     = false
}

# =============================================================================
# Redis Configuration
# =============================================================================
variable "redis_sku_name" {
  description = "Redis SKU"
  type        = string
  default     = "Standard"
}

variable "redis_family" {
  description = "Redis family"
  type        = string
  default     = "C"
}

variable "redis_capacity" {
  description = "Redis capacity"
  type        = number
  default     = 1
}

# =============================================================================
# Storage Configuration
# =============================================================================
variable "storage_replication_type" {
  description = "Storage replication type"
  type        = string
  default     = "LRS"
}

# =============================================================================
# Monitoring Configuration
# =============================================================================
variable "log_analytics_retention_days" {
  description = "Log retention days"
  type        = number
  default     = 30
}

# =============================================================================
# SignalR Configuration
# =============================================================================
variable "signalr_sku" {
  description = "SignalR SKU"
  type        = string
  default     = "Standard_S1"
}

variable "signalr_capacity" {
  description = "SignalR capacity"
  type        = number
  default     = 1
}
