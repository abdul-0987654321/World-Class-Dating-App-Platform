variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "env" {
  description = "Environment name"
  type        = string
}

variable "sku_name" {
  description = "Front Door SKU (Standard_AzureFrontDoor or Premium_AzureFrontDoor)"
  type        = string
  default     = "Standard_AzureFrontDoor"
}

variable "waf_mode" {
  description = "WAF mode (Prevention or Detection)"
  type        = string
  default     = "Prevention"
}

variable "waf_redirect_url" {
  description = "URL to redirect blocked requests"
  type        = string
  default     = ""
}

variable "enable_geo_filtering" {
  description = "Enable geographic filtering"
  type        = bool
  default     = false
}

variable "blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = []
}

variable "aks_ingress_hostname" {
  description = "AKS ingress controller hostname"
  type        = string
}

variable "storage_cdn_hostname" {
  description = "Storage CDN hostname for static content"
  type        = string
  default     = ""
}

variable "custom_domain_ids" {
  description = "List of custom domain IDs"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
