# =============================================================================
# Azure DNS Zone Module for flamoral.com
# =============================================================================
# Creates Azure DNS Zone with A records for all subdomains
# =============================================================================

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

# DNS Zone
resource "azurerm_dns_zone" "main" {
  name                = var.domain_name
  resource_group_name = var.resource_group_name

  tags = merge(var.tags, {
    Purpose = "DNS Management"
  })
}

# A Record for root domain (flamoral.com)
# Using A record for root domain as CNAME is not allowed for apex domains
resource "azurerm_dns_a_record" "root" {
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = var.ttl
  records             = var.use_frontdoor ? [] : [var.target_ip]

  tags = var.tags

  lifecycle {
    ignore_changes = [records]
  }
}

# Alternative: Use Azure Alias record for root domain pointing to Front Door
resource "azurerm_dns_a_record" "root_alias" {
  count               = var.frontdoor_id != "" ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = var.ttl

  target_resource_id = var.frontdoor_id

  tags = var.tags
}

# CNAME Record for www subdomain pointing to Front Door or target
resource "azurerm_dns_cname_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = var.ttl
  record              = var.use_frontdoor ? var.frontdoor_hostname : var.domain_name

  tags = merge(var.tags, {
    Subdomain = "www"
  })
}

# CNAME Record for api subdomain pointing to Front Door or AKS ingress
resource "azurerm_dns_cname_record" "api" {
  name                = "api"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = var.ttl
  record              = var.use_frontdoor ? var.frontdoor_hostname : var.aks_ingress_hostname

  tags = merge(var.tags, {
    Subdomain = "api"
    Purpose   = "API Gateway"
  })
}

# CNAME Record for admin subdomain
resource "azurerm_dns_cname_record" "admin" {
  name                = "admin"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = var.ttl
  record              = var.use_frontdoor ? var.frontdoor_hostname : var.domain_name

  tags = merge(var.tags, {
    Subdomain = "admin"
    Purpose   = "Admin Dashboard"
  })
}

# Optional CNAME records (commented out - use A records by default)
# Uncomment if you prefer CNAME records for subdomains
/*
resource "azurerm_dns_cname_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = var.ttl
  record              = var.domain_name

  tags = var.tags
}

resource "azurerm_dns_cname_record" "api" {
  name                = "api"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = var.ttl
  record              = var.domain_name

  tags = var.tags
}

resource "azurerm_dns_cname_record" "admin" {
  name                = "admin"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = var.ttl
  record              = var.domain_name

  tags = var.tags
}
*/

# TXT record for domain verification (if needed)
resource "azurerm_dns_txt_record" "verification" {
  count               = var.verification_txt != "" ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300

  record {
    value = var.verification_txt
  }

  tags = var.tags
}

# CAA record for Let's Encrypt (recommended for SSL/TLS)
resource "azurerm_dns_caa_record" "letsencrypt" {
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    flags = 0
    tag   = "issue"
    value = "letsencrypt.org"
  }

  record {
    flags = 0
    tag   = "issuewild"
    value = "letsencrypt.org"
  }

  tags = var.tags
}
