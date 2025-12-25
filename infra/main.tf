# Flamoral Production Infrastructure
# Azure DNS + Front Door + AKS Backend with Azure-Managed TLS

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }

  backend "azurerm" {
    resource_group_name  = "flamoral-terraform-state-rg"
    storage_account_name = "flamoraltfstate"
    container_name       = "tfstate"
    key                  = "flamoral-infra.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# Variables
variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = "ba233460-2dbe-4603-a594-68f93ec9deb3"
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "flamoral-prod-rg"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westus2"
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "flamoral.com"
}

variable "aks_ingress_ip" {
  description = "AKS Ingress Controller public IP"
  type        = string
  default     = "172.193.212.27"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Data sources for existing resources
data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

# Import existing DNS zone (already created)
data "azurerm_dns_zone" "main" {
  name                = var.domain_name
  resource_group_name = var.resource_group_name
}

# Modules
module "dns" {
  source = "./dns"

  resource_group_name = var.resource_group_name
  dns_zone_name       = var.domain_name
  frontdoor_endpoint  = module.frontdoor.endpoint_hostname
  aks_ingress_ip      = var.aks_ingress_ip
}

module "frontdoor" {
  source = "./frontdoor"

  resource_group_name = var.resource_group_name
  location            = var.location
  domain_name         = var.domain_name
  aks_ingress_ip      = var.aks_ingress_ip
  dns_zone_id         = data.azurerm_dns_zone.main.id
  environment         = var.environment
}

# Outputs
output "frontdoor_endpoint" {
  value       = module.frontdoor.endpoint_hostname
  description = "Azure Front Door endpoint hostname"
}

output "dns_nameservers" {
  value       = data.azurerm_dns_zone.main.name_servers
  description = "Azure DNS nameservers"
}

output "custom_domains" {
  value       = module.frontdoor.custom_domain_ids
  description = "Custom domain IDs in Front Door"
}
