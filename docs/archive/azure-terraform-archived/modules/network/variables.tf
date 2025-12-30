# Network Module Variables

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "prefix" {
  description = "Resource naming prefix"
  type        = string
}

variable "env" {
  description = "Environment name"
  type        = string
}

variable "vnet_address_space" {
  description = "VNet address space"
  type        = list(string)
}

variable "aks_subnet_prefix" {
  description = "AKS subnet prefix"
  type        = string
}

variable "db_subnet_prefix" {
  description = "Database subnet prefix"
  type        = string
}

variable "redis_subnet_prefix" {
  description = "Redis subnet prefix"
  type        = string
}

variable "enable_ddos_protection" {
  description = "Enable DDoS protection"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
