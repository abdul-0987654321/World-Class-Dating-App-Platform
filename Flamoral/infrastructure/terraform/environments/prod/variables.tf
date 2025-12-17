# =============================================================================
# Flamoral Dating Platform - Production Environment Variables
# =============================================================================

# =============================================================================
# Azure Subscription & Authentication
# =============================================================================
variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  default     = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
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
  default     = "flamoral-prod-rg"
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
# Shared Resources
# =============================================================================
variable "shared_acr_name" {
  description = "Name of shared ACR"
  type        = string
  default     = "flamoralacr"
}

variable "shared_resource_group_name" {
  description = "Resource group containing shared resources"
  type        = string
  default     = "flamoral-shared-rg"
}

# =============================================================================
# Domain Configuration
# =============================================================================
variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "flamoral.com"
}

variable "ingress_public_ip" {
  description = "Public IP for ingress (set after initial deployment)"
  type        = string
  default     = ""
}

# =============================================================================
# Tags
# =============================================================================
variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    Project     = "Flamoral"
    Environment = "production"
    ManagedBy   = "Terraform"
    Owner       = "Engineering"
    Application = "Dating Platform"
    Domain      = "flamoral.com"
    CostCenter  = "Production"
    AccessLevel = "Public"
    Compliance  = "GDPR"
  }
}

# =============================================================================
# Network Configuration
# =============================================================================
variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.30.0.0/16"]
}

variable "aks_subnet_prefix" {
  description = "Address prefix for AKS subnet"
  type        = string
  default     = "10.30.1.0/24"
}

variable "db_subnet_prefix" {
  description = "Address prefix for database subnet"
  type        = string
  default     = "10.30.2.0/24"
}

variable "redis_subnet_prefix" {
  description = "Address prefix for Redis subnet"
  type        = string
  default     = "10.30.3.0/24"
}

variable "private_endpoints_subnet_prefix" {
  description = "Address prefix for private endpoints subnet"
  type        = string
  default     = "10.30.4.0/24"
}

variable "appgw_subnet_prefix" {
  description = "Address prefix for Application Gateway subnet"
  type        = string
  default     = "10.30.5.0/24"
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
  default     = "Standard_D4s_v3"
}

variable "system_node_count" {
  description = "Initial node count"
  type        = number
  default     = 3
}

variable "system_node_min_count" {
  description = "Minimum nodes"
  type        = number
  default     = 3
}

variable "system_node_max_count" {
  description = "Maximum nodes"
  type        = number
  default     = 5
}

variable "system_node_disk_size" {
  description = "OS disk size in GB"
  type        = number
  default     = 128
}

variable "user_node_size" {
  description = "VM size for user node pool"
  type        = string
  default     = "Standard_D8s_v3"
}

variable "user_node_count" {
  description = "Initial user node count"
  type        = number
  default     = 3
}

variable "user_node_min_count" {
  description = "Minimum user nodes"
  type        = number
  default     = 3
}

variable "user_node_max_count" {
  description = "Maximum user nodes"
  type        = number
  default     = 20
}

variable "user_node_disk_size" {
  description = "User node OS disk size in GB"
  type        = number
  default     = 256
}

# =============================================================================
# PostgreSQL Configuration - Production Grade
# =============================================================================
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "postgres_sku_name" {
  description = "PostgreSQL SKU"
  type        = string
  default     = "GP_Standard_D4s_v3"
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 262144 # 256 GB
}

variable "postgres_backup_retention_days" {
  description = "Backup retention days"
  type        = number
  default     = 35
}

variable "postgres_geo_redundant_backup" {
  description = "Enable geo-redundant backups"
  type        = bool
  default     = true
}

# =============================================================================
# Redis Configuration - Premium
# =============================================================================
variable "redis_sku_name" {
  description = "Redis SKU"
  type        = string
  default     = "Premium"
}

variable "redis_family" {
  description = "Redis family"
  type        = string
  default     = "P"
}

variable "redis_capacity" {
  description = "Redis capacity"
  type        = number
  default     = 1
}

# =============================================================================
# Storage Configuration - GRS
# =============================================================================
variable "storage_replication_type" {
  description = "Storage replication type"
  type        = string
  default     = "GRS"
}

# =============================================================================
# Monitoring Configuration
# =============================================================================
variable "log_analytics_retention_days" {
  description = "Log retention days"
  type        = number
  default     = 90
}

# =============================================================================
# SignalR Configuration - Premium
# =============================================================================
variable "signalr_sku" {
  description = "SignalR SKU"
  type        = string
  default     = "Premium_P1"
}

variable "signalr_capacity" {
  description = "SignalR capacity"
  type        = number
  default     = 1
}
