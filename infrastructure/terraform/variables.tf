# Global Variables for Dating App Infrastructure

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  default     = "ba233460-2dbe-4603-a594-68f93ec9deb3"
}

variable "tenant_id" {
  description = "Azure Tenant ID"
  type        = string
  default     = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
}

variable "prefix" {
  description = "Resource naming prefix"
  type        = string
  default     = "datingapp"
}

variable "env" {
  description = "Environment (dev/staging/prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "Dating App Platform"
    ManagedBy   = "Terraform"
    Repository  = "World-Class-Dating-App-Platform"
  }
}

# Network Configuration
variable "vnet_address_space" {
  description = "Virtual Network address space"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "aks_subnet_prefix" {
  description = "AKS subnet address prefix"
  type        = string
  default     = "10.0.1.0/24"
}

variable "db_subnet_prefix" {
  description = "Database subnet address prefix"
  type        = string
  default     = "10.0.2.0/24"
}

variable "redis_subnet_prefix" {
  description = "Redis subnet address prefix"
  type        = string
  default     = "10.0.3.0/24"
}

# AKS Configuration
variable "aks_node_count" {
  description = "Number of AKS nodes"
  type        = number
  default     = 3
}

variable "aks_node_vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28.3"
}

# Database Configuration
variable "postgres_sku" {
  description = "PostgreSQL SKU"
  type        = string
  default     = "GP_Standard_D4s_v3"
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 131072 # 128 GB
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "14"
}

# Redis Configuration
variable "redis_sku" {
  description = "Redis cache SKU"
  type        = string
  default     = "Premium"
}

variable "redis_family" {
  description = "Redis cache family"
  type        = string
  default     = "P"
}

variable "redis_capacity" {
  description = "Redis cache capacity"
  type        = number
  default     = 1
}

# CosmosDB Configuration
variable "cosmosdb_consistency_level" {
  description = "CosmosDB consistency level"
  type        = string
  default     = "Session"
}

variable "cosmosdb_throughput" {
  description = "CosmosDB throughput (RU/s)"
  type        = number
  default     = 400
}

# SignalR Configuration
variable "signalr_sku" {
  description = "SignalR service SKU"
  type        = string
  default     = "Standard_S1"
}

variable "signalr_capacity" {
  description = "SignalR service capacity"
  type        = number
  default     = 1
}

# Monitoring Configuration
variable "log_retention_days" {
  description = "Log retention in days"
  type        = number
  default     = 30
}

# Feature Flags
variable "enable_private_endpoints" {
  description = "Enable private endpoints for PaaS services"
  type        = bool
  default     = true
}

variable "enable_waf" {
  description = "Enable Web Application Firewall"
  type        = bool
  default     = true
}

variable "enable_ddos_protection" {
  description = "Enable DDoS protection"
  type        = bool
  default     = false # Can be expensive, enable for prod
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}
