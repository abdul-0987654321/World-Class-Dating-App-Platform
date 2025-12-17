# =============================================================================
# Azure Front Door Routing Rules Configuration for flamoral.com
# =============================================================================
# This file contains all routing rules for the Azure Front Door instance
# Routes are configured to handle different traffic patterns:
# - Default route: All web traffic
# - API route: Backend API with dynamic content
# - WebSocket route: Real-time connections (no caching)
# - Static assets: CSS, JS, images with aggressive caching
# - Media route: Large files (videos, uploads)
# =============================================================================

# =============================================================================
# Default Route - Catch-all for web application traffic
# =============================================================================
resource "azurerm_cdn_frontdoor_route" "default" {
  name                          = "default-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.main.id]

  # Protocol Configuration
  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true

  # Caching Configuration
  cache {
    query_string_caching_behavior = "IgnoreSpecifiedQueryStrings"
    # Ignore marketing/tracking parameters for better cache hit ratio
    query_strings = ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid"]
    compression_enabled = true
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

# =============================================================================
# API Route - Backend API traffic with dynamic content
# =============================================================================
resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "api-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.main.id]

  # Protocol Configuration
  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/api/*", "/graphql", "/v1/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true

  # Caching Configuration - Use query strings for API caching
  cache {
    query_string_caching_behavior = "UseQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "application/json",
      "application/xml",
      "text/plain"
    ]
  }
}

# =============================================================================
# WebSocket/Realtime Route - Real-time connections (SignalR, Socket.IO)
# =============================================================================
resource "azurerm_cdn_frontdoor_route" "websocket" {
  name                          = "websocket-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.main.id]

  # Protocol Configuration
  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/ws/*", "/socket.io/*", "/signalr/*", "/realtime/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true

  # No caching for WebSocket connections
  # Cache block omitted for routes that should not be cached
}

# =============================================================================
# Static Assets Route - CSS, JavaScript, fonts with aggressive caching
# =============================================================================
resource "azurerm_cdn_frontdoor_route" "static" {
  name                          = "static-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.main.id]

  # Protocol Configuration
  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = [
    "/static/*",
    "/assets/*",
    "/_next/static/*",
    
    
    "/fonts/*"
  ]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true

  # Aggressive caching for static assets
  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "application/javascript",
      "application/x-javascript",
      "text/css",
      "text/javascript",
      "text/html",
      "font/eot",
      "font/ttf"
    ]
  }
}

# =============================================================================
# Media Route - Images, videos, uploads (no compression, aggressive caching)
# =============================================================================
resource "azurerm_cdn_frontdoor_route" "media" {
  name                          = "media-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.main.id]

  # Protocol Configuration
  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = [
    "/media/*",
    "/uploads/*",
    "/images/*",
    "/videos/*",
    
    
    
    
    
    
    
  ]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true

  # Cache configuration - no compression for already-compressed media
  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = false # Media files are already compressed
  }
}

# =============================================================================
# Health Check Route - No caching for health endpoints
# =============================================================================
resource "azurerm_cdn_frontdoor_route" "health" {
  name                          = "health-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.main.id]

  # Protocol Configuration
  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/health", "/health/*", "/healthz", "/ready", "/live"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true

  # No caching for health checks
  # Cache block omitted for routes that should not be cached
}

# =============================================================================
# Outputs
# =============================================================================
output "frontdoor_routes" {
  description = "Front Door routing rules configuration"
  value = {
    default_route   = azurerm_cdn_frontdoor_route.default.name
    api_route       = azurerm_cdn_frontdoor_route.api.name
    websocket_route = azurerm_cdn_frontdoor_route.websocket.name
    static_route    = azurerm_cdn_frontdoor_route.static.name
    media_route     = azurerm_cdn_frontdoor_route.media.name
    health_route    = azurerm_cdn_frontdoor_route.health.name
  }
}
