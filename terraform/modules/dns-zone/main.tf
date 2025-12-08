/**
 * Azure DNS Zone Module
 *
 * Creates Azure DNS Zone and manages DNS records for flamoral.com domain.
 * Supports A, CNAME, TXT, and MX records for production deployment.
 */

# Azure DNS Zone for flamoral.com
resource "azurerm_dns_zone" "main" {
  name                = var.domain_name
  resource_group_name = var.resource_group_name

  tags = merge(var.tags, {
    managed_by = "terraform"
    domain     = var.domain_name
  })
}

# A Record - Root domain pointing to AKS Load Balancer
resource "azurerm_dns_a_record" "root" {
  count               = var.aks_public_ip != "" ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = [var.aks_public_ip]

  tags = var.tags
}

# A Record - www subdomain
resource "azurerm_dns_a_record" "www" {
  count               = var.aks_public_ip != "" ? 1 : 0
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = [var.aks_public_ip]

  tags = var.tags
}

# A Record - API subdomain
resource "azurerm_dns_a_record" "api" {
  count               = var.aks_public_ip != "" ? 1 : 0
  name                = "api"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = [var.aks_public_ip]

  tags = var.tags
}

# CNAME Records for environment-specific subdomains
resource "azurerm_dns_cname_record" "dev" {
  count               = var.create_environment_records ? 1 : 0
  name                = "dev"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.dev_cname_target != "" ? var.dev_cname_target : "flamoral-dev.azurewebsites.net"

  tags = var.tags
}

resource "azurerm_dns_cname_record" "test" {
  count               = var.create_environment_records ? 1 : 0
  name                = "test"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.test_cname_target != "" ? var.test_cname_target : "flamoral-test.azurewebsites.net"

  tags = var.tags
}

resource "azurerm_dns_cname_record" "staging" {
  count               = var.create_environment_records ? 1 : 0
  name                = "staging"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.staging_cname_target != "" ? var.staging_cname_target : "flamoral-staging.azurewebsites.net"

  tags = var.tags
}

# TXT Record - Domain verification
resource "azurerm_dns_txt_record" "verification" {
  count               = var.domain_verification_txt != "" ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    value = var.domain_verification_txt
  }

  tags = var.tags
}

# TXT Record - SPF for email
resource "azurerm_dns_txt_record" "spf" {
  count               = var.enable_email_records ? 1 : 0
  name                = "spf"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    value = "v=spf1 include:_spf.google.com include:sendgrid.net ~all"
  }

  tags = var.tags
}

# MX Records for email (optional)
resource "azurerm_dns_mx_record" "mail" {
  count               = var.enable_email_records ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  dynamic "record" {
    for_each = var.mx_records
    content {
      preference = record.value.preference
      exchange   = record.value.exchange
    }
  }

  tags = var.tags
}

# CAA Record - Certificate Authority Authorization
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
