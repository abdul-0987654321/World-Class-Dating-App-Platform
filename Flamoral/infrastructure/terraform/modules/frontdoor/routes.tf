# =============================================================================
# Azure Front Door Routing Rules Module
# =============================================================================
# Additional routing rules for comprehensive traffic handling
# This file extends the base Front Door module with specialized routes
# =============================================================================

# Default Route - Catch-all for web application traffic
resource "azurerm_cdn_frontdoor_route" "default" {
  name                          = "default-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.aks.id]

  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true

  cdn_frontdoor_custom_domain_ids = var.custom_domain_ids
  link_to_default_domain          = true

  cache {
    query_string_caching_behavior = "IgnoreSpecifiedQueryStrings"
    query_strings                 = ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid"]
    compression_enabled           = true
    content_types_to_compress = [
      "application/javascript",
      "application/json",
      "application/x-javascript",
      "application/xml",
      "text/css",
      "text/html",
      "text/javascript",
      "text/plain",
      "text/xml"
    ]
  }
}

# WebSocket/Realtime Route - No caching for real-time connections
resource "azurerm_cdn_frontdoor_route" "websocket" {
  name                          = "websocket-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.aks.id]

  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/ws/*", "/socket.io/*", "/signalr/*", "/realtime/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true

  cdn_frontdoor_custom_domain_ids = var.custom_domain_ids
  link_to_default_domain          = true

  enabled_state = "Enabled"
}

# Health Check Route - No caching for health endpoints
resource "azurerm_cdn_frontdoor_route" "health" {
  name                          = "health-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.aks.id]

  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/health", "/health/*", "/healthz", "/ready", "/live"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true

  cdn_frontdoor_custom_domain_ids = var.custom_domain_ids
  link_to_default_domain          = true

  enabled_state = "Enabled"
}

# Media Route - For static storage origin if configured
resource "azurerm_cdn_frontdoor_route" "media" {
  count                         = var.storage_cdn_hostname != "" ? 1 : 0
  name                          = "media-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static[0].id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.storage[0].id]

  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/uploads/*", "/images/*", "/videos/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = false
  }
}
