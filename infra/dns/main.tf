# Azure DNS Configuration for Flamoral
# Manages DNS records pointing to Azure Front Door

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

variable "resource_group_name" {
  type = string
}

variable "dns_zone_name" {
  type = string
}

variable "frontdoor_endpoint" {
  type        = string
  description = "Front Door endpoint hostname (e.g., flamoral-app-xxx.z01.azurefd.net)"
}

variable "aks_ingress_ip" {
  type        = string
  description = "AKS Ingress public IP (for fallback reference)"
}

# Reference existing DNS zone
data "azurerm_dns_zone" "main" {
  name                = var.dns_zone_name
  resource_group_name = var.resource_group_name
}

# =============================================================================
# APEX DOMAIN RECORDS
# =============================================================================

# Apex domain CNAME alias to Front Door (using ALIAS record)
# Note: Azure DNS doesn't support CNAME at apex, so we use ALIAS
resource "azurerm_dns_cname_record" "www" {
  name                = "www"
  zone_name           = data.azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.frontdoor_endpoint

  lifecycle {
    create_before_destroy = true
  }
}

# API subdomain CNAME to Front Door
resource "azurerm_dns_cname_record" "api" {
  name                = "api"
  zone_name           = data.azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.frontdoor_endpoint

  lifecycle {
    create_before_destroy = true
  }
}

# App subdomain CNAME to Front Door
resource "azurerm_dns_cname_record" "app" {
  name                = "app"
  zone_name           = data.azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.frontdoor_endpoint

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# EMAIL RECORDS (MX, SPF, DKIM, DMARC)
# =============================================================================

# MX Record - Using Google Workspace as example (adjust as needed)
resource "azurerm_dns_mx_record" "main" {
  name                = "@"
  zone_name           = data.azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  # Placeholder - update with actual email provider
  record {
    preference = 10
    exchange   = "mail.flamoral.com."
  }

  lifecycle {
    ignore_changes = [record] # Preserve existing email config
  }
}

# SPF Record - Authorize email senders
resource "azurerm_dns_txt_record" "spf" {
  name                = "@"
  zone_name           = data.azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    value = "v=spf1 include:_spf.google.com include:sendgrid.net ~all"
  }

  lifecycle {
    ignore_changes = [record] # Preserve existing SPF
  }
}

# DMARC Record
resource "azurerm_dns_txt_record" "dmarc" {
  name                = "_dmarc"
  zone_name           = data.azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    value = "v=DMARC1; p=quarantine; rua=mailto:dmarc@flamoral.com; pct=100"
  }
}

# =============================================================================
# FRONT DOOR DOMAIN VALIDATION RECORDS
# These are auto-managed by Front Door but we can pre-create them
# =============================================================================

# Outputs
output "dns_zone_id" {
  value = data.azurerm_dns_zone.main.id
}

output "nameservers" {
  value = data.azurerm_dns_zone.main.name_servers
}

output "www_cname" {
  value = azurerm_dns_cname_record.www.fqdn
}

output "api_cname" {
  value = azurerm_dns_cname_record.api.fqdn
}
