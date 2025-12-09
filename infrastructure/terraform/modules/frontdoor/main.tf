# Azure Front Door Module

resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${var.prefix}-${var.env}-fd"
  resource_group_name = var.resource_group_name
  sku_name            = var.sku_name

  tags = var.tags
}

# WAF Policy
resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                              = "${var.prefix}${var.env}wafpolicy"
  resource_group_name               = var.resource_group_name
  sku_name                          = azurerm_cdn_frontdoor_profile.main.sku_name
  enabled                           = true
  mode                              = var.waf_mode
  redirect_url                      = var.waf_redirect_url
  custom_block_response_status_code = 403
  custom_block_response_body        = base64encode("{\"error\": \"Access denied by WAF\"}")

  # OWASP Managed Rule Set
  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  # Custom rate limiting rules
  custom_rule {
    name                           = "RateLimitRule"
    enabled                        = true
    priority                       = 100
    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 100
    type                           = "RateLimitRule"
    action                         = "Block"

    match_condition {
      match_variable     = "RequestUri"
      operator           = "Contains"
      match_values       = ["/api/"]
      transforms         = ["Lowercase"]
    }
  }

  # Block known bad IPs
  custom_rule {
    name     = "GeoBlockRule"
    enabled  = var.enable_geo_filtering
    priority = 200
    type     = "MatchRule"
    action   = "Block"

    match_condition {
      match_variable = "RemoteAddr"
      operator       = "GeoMatch"
      match_values   = var.blocked_countries
    }
  }

  tags = var.tags
}

# Front Door Endpoint
resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "${var.prefix}-${var.env}-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = var.tags
}

# Origin Group for API
resource "azurerm_cdn_frontdoor_origin_group" "api" {
  name                     = "api-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
    additional_latency_in_milliseconds = 50
  }

  health_probe {
    protocol            = "Https"
    interval_in_seconds = 30
    path                = "/health"
    request_type        = "GET"
  }
}

# Origin for AKS
resource "azurerm_cdn_frontdoor_origin" "aks" {
  name                          = "aks-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  enabled                       = true

  certificate_name_check_enabled = true
  host_name                      = var.aks_ingress_hostname
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = var.aks_ingress_hostname
  priority                       = 1
  weight                         = 1000
}

# Origin Group for Static Content (Storage/CDN)
resource "azurerm_cdn_frontdoor_origin_group" "static" {
  count                    = var.storage_cdn_hostname != "" ? 1 : 0
  name                     = "static-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }

  health_probe {
    protocol            = "Https"
    interval_in_seconds = 100
    path                = "/"
    request_type        = "HEAD"
  }
}

# Origin for Storage CDN
resource "azurerm_cdn_frontdoor_origin" "storage" {
  count                         = var.storage_cdn_hostname != "" ? 1 : 0
  name                          = "storage-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static[0].id
  enabled                       = true

  certificate_name_check_enabled = true
  host_name                      = var.storage_cdn_hostname
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = var.storage_cdn_hostname
  priority                       = 1
  weight                         = 1000
}

# Route for API
resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "api-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.aks.id]

  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/api/*", "/graphql"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true

  cdn_frontdoor_custom_domain_ids = var.custom_domain_ids
  link_to_default_domain          = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "application/json",
      "text/plain",
      "text/html"
    ]
  }
}

# Route for Static Content
resource "azurerm_cdn_frontdoor_route" "static" {
  count                         = var.storage_cdn_hostname != "" ? 1 : 0
  name                          = "static-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static[0].id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.storage[0].id]

  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/media/*", "/static/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true

  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4"
    ]
  }
}

# Security Policy (link WAF to endpoints)
# Note: Security policies can only be associated with custom domains, not endpoints directly.
# When custom domains are configured, this resource should be enabled.
# For now, the WAF policy is created but not associated until custom domains are added.

# To enable security policy with custom domains, uncomment and configure:
# resource "azurerm_cdn_frontdoor_security_policy" "main" {
#   name                     = "security-policy"
#   cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
#
#   security_policies {
#     firewall {
#       cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id
#
#       association {
#         domain {
#           cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.main.id
#         }
#         patterns_to_match = ["/*"]
#       }
#     }
#   }
# }
