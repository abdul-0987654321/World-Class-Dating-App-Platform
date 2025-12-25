# Azure Front Door Configuration for Flamoral
# Standard/Premium with Azure-managed TLS certificates

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

variable "location" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "aks_ingress_ip" {
  type        = string
  description = "AKS Ingress Controller public IP"
}

variable "dns_zone_id" {
  type        = string
  description = "Azure DNS Zone ID for domain validation"
}

variable "environment" {
  type    = string
  default = "production"
}

# Local variables
locals {
  profile_name  = "flamoral-cdn"
  endpoint_name = "flamoral-app"

  # Origin host header configuration
  web_host_header = var.domain_name
  api_host_header = "api.${var.domain_name}"

  tags = {
    Environment = var.environment
    Service     = "flamoral"
    ManagedBy   = "terraform"
  }
}

# =============================================================================
# FRONT DOOR PROFILE (using existing or create new)
# =============================================================================

# Reference existing Front Door profile
data "azurerm_cdn_frontdoor_profile" "main" {
  name                = local.profile_name
  resource_group_name = var.resource_group_name
}

# =============================================================================
# FRONT DOOR ENDPOINT
# =============================================================================

# Reference existing endpoint
data "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = local.endpoint_name
  profile_name             = data.azurerm_cdn_frontdoor_profile.main.name
  resource_group_name      = var.resource_group_name
}

# =============================================================================
# ORIGIN GROUPS - Update existing with correct configuration
# =============================================================================

# Web App Origin Group
resource "azurerm_cdn_frontdoor_origin_group" "web" {
  name                     = "web-origins"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  health_probe {
    interval_in_seconds = 30
    path                = "/health"
    protocol            = "Https"
    request_type        = "HEAD"
  }

  load_balancing {
    additional_latency_in_milliseconds = 50
    sample_size                        = 4
    successful_samples_required        = 3
  }
}

# API Origin Group
resource "azurerm_cdn_frontdoor_origin_group" "api" {
  name                     = "api-origins"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  health_probe {
    interval_in_seconds = 30
    path                = "/health"
    protocol            = "Https"
    request_type        = "HEAD"
  }

  load_balancing {
    additional_latency_in_milliseconds = 50
    sample_size                        = 4
    successful_samples_required        = 3
  }
}

# =============================================================================
# ORIGINS - Point to AKS Ingress
# =============================================================================

# Web App Origin (AKS Ingress)
resource "azurerm_cdn_frontdoor_origin" "web_aks" {
  name                          = "web-aks-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.web.id
  enabled                       = true

  host_name          = var.aks_ingress_ip
  http_port          = 80
  https_port         = 443
  origin_host_header = local.web_host_header
  priority           = 1
  weight             = 1000

  certificate_name_check_enabled = false # Using IP, no cert check
}

# API Origin (AKS Ingress)
resource "azurerm_cdn_frontdoor_origin" "api_aks" {
  name                          = "api-aks-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  enabled                       = true

  host_name          = var.aks_ingress_ip
  http_port          = 80
  https_port         = 443
  origin_host_header = local.api_host_header
  priority           = 1
  weight             = 1000

  certificate_name_check_enabled = false # Using IP, no cert check
}

# =============================================================================
# CUSTOM DOMAINS WITH AZURE-MANAGED TLS
# =============================================================================

# Apex domain (flamoral.com)
resource "azurerm_cdn_frontdoor_custom_domain" "apex" {
  name                     = "flamoral-apex"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.main.id
  dns_zone_id              = var.dns_zone_id
  host_name                = var.domain_name

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

# WWW subdomain
resource "azurerm_cdn_frontdoor_custom_domain" "www" {
  name                     = "flamoral-www"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.main.id
  dns_zone_id              = var.dns_zone_id
  host_name                = "www.${var.domain_name}"

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

# API subdomain
resource "azurerm_cdn_frontdoor_custom_domain" "api" {
  name                     = "flamoral-api"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.main.id
  dns_zone_id              = var.dns_zone_id
  host_name                = "api.${var.domain_name}"

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

# App subdomain
resource "azurerm_cdn_frontdoor_custom_domain" "app" {
  name                     = "flamoral-app-subdomain"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.main.id
  dns_zone_id              = var.dns_zone_id
  host_name                = "app.${var.domain_name}"

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

# =============================================================================
# ROUTES
# =============================================================================

# Web App Route (apex and www)
resource "azurerm_cdn_frontdoor_route" "web" {
  name                          = "web-route"
  cdn_frontdoor_endpoint_id     = data.azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.web.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.web_aks.id]

  cdn_frontdoor_custom_domain_ids = [
    azurerm_cdn_frontdoor_custom_domain.apex.id,
    azurerm_cdn_frontdoor_custom_domain.www.id,
    azurerm_cdn_frontdoor_custom_domain.app.id,
  ]

  enabled                = true
  forwarding_protocol    = "HttpOnly" # AKS ingress handles HTTPS termination
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress     = [
      "text/html",
      "text/css",
      "application/javascript",
      "application/json",
      "image/svg+xml",
    ]
  }
}

# API Route
resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "api-route"
  cdn_frontdoor_endpoint_id     = data.azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.api_aks.id]

  cdn_frontdoor_custom_domain_ids = [
    azurerm_cdn_frontdoor_custom_domain.api.id,
  ]

  enabled                = true
  forwarding_protocol    = "HttpOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = false # API only through api.flamoral.com

  # No caching for API
  cache {
    query_string_caching_behavior = "UseQueryString"
    compression_enabled           = false
  }
}

# =============================================================================
# SECURITY POLICY (WAF) - Optional but recommended
# =============================================================================

# WAF Policy (Premium tier required for managed rules)
# Uncomment when upgrading to Premium tier
# resource "azurerm_cdn_frontdoor_security_policy" "waf" {
#   name                     = "flamoral-waf-policy"
#   cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.main.id
#
#   security_policies {
#     firewall {
#       cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id
#
#       association {
#         domain {
#           cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.apex.id
#         }
#         domain {
#           cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.www.id
#         }
#         domain {
#           cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.api.id
#         }
#         patterns_to_match = ["/*"]
#       }
#     }
#   }
# }

# =============================================================================
# OUTPUTS
# =============================================================================

output "endpoint_hostname" {
  value       = data.azurerm_cdn_frontdoor_endpoint.main.host_name
  description = "Front Door endpoint hostname"
}

output "custom_domain_ids" {
  value = {
    apex = azurerm_cdn_frontdoor_custom_domain.apex.id
    www  = azurerm_cdn_frontdoor_custom_domain.www.id
    api  = azurerm_cdn_frontdoor_custom_domain.api.id
    app  = azurerm_cdn_frontdoor_custom_domain.app.id
  }
}

output "origin_group_ids" {
  value = {
    web = azurerm_cdn_frontdoor_origin_group.web.id
    api = azurerm_cdn_frontdoor_origin_group.api.id
  }
}
