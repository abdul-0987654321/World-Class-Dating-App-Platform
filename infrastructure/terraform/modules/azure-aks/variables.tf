variable "environment" {
  description = "Environment name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "aks_subnet_id" {
  description = "ID of the AKS subnet"
  type        = string
}

variable "vnet_id" {
  description = "ID of the Virtual Network"
  type        = string
}

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
  description = "Initial node count for system pool"
  type        = number
  default     = 3
}

variable "system_node_min_count" {
  description = "Minimum nodes for system pool"
  type        = number
  default     = 3
}

variable "system_node_max_count" {
  description = "Maximum nodes for system pool"
  type        = number
  default     = 5
}

variable "system_node_disk_size" {
  description = "OS disk size for system nodes (GB)"
  type        = number
  default     = 128
}

variable "user_node_size" {
  description = "VM size for user node pool"
  type        = string
  default     = "Standard_D8s_v3"
}

variable "user_node_count" {
  description = "Initial node count for user pool"
  type        = number
  default     = 3
}

variable "user_node_min_count" {
  description = "Minimum nodes for user pool"
  type        = number
  default     = 3
}

variable "user_node_max_count" {
  description = "Maximum nodes for user pool"
  type        = number
  default     = 10
}

variable "user_node_disk_size" {
  description = "OS disk size for user nodes (GB)"
  type        = number
  default     = 256
}

variable "enable_spot_instances" {
  description = "Enable spot instance node pool"
  type        = bool
  default     = false
}

variable "spot_node_size" {
  description = "VM size for spot instances"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "spot_node_count" {
  description = "Initial node count for spot pool"
  type        = number
  default     = 0
}

variable "spot_node_min_count" {
  description = "Minimum nodes for spot pool"
  type        = number
  default     = 0
}

variable "spot_node_max_count" {
  description = "Maximum nodes for spot pool"
  type        = number
  default     = 5
}

variable "admin_group_object_ids" {
  description = "List of Azure AD group object IDs for AKS admins"
  type        = list(string)
  default     = []
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for monitoring"
  type        = string
}

variable "container_registry_id" {
  description = "Azure Container Registry ID"
  type        = string
  default     = null
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
