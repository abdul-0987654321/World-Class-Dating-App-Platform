variable "name" {
  description = "The name of the App Service"
  type        = string
}

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region where the App Service will be created"
  type        = string
}

variable "sku_name" {
  description = "The SKU for the App Service Plan (e.g., B1, P1v2, P2v2)"
  type        = string
  default     = "B1"
}

variable "app_settings" {
  description = "A map of app settings to configure for the App Service"
  type        = map(string)
  default     = {}
}

variable "environment" {
  description = "The environment name (dev, test, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}
