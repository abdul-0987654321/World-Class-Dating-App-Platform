# Azure SignalR Service Module

resource "azurerm_signalr_service" "main" {
  name                = "${var.prefix}-${var.env}-signalr"
  location            = var.location
  resource_group_name = var.resource_group_name

  sku {
    name     = var.sku_name
    capacity = var.capacity
  }

  service_mode                      = var.service_mode
  connectivity_logs_enabled         = true
  messaging_logs_enabled            = true
  live_trace_enabled                = var.env != "prod"
  public_network_access_enabled     = var.enable_public_access
  local_auth_enabled                = false

  cors {
    allowed_origins = var.cors_allowed_origins
  }

  upstream_endpoint {
    category_pattern = ["connections", "messages"]
    event_pattern    = ["*"]
    hub_pattern      = ["*"]
    url_template     = var.upstream_url_template
  }

  tags = var.tags
}

# Private Endpoint for SignalR
resource "azurerm_private_endpoint" "signalr" {
  count               = var.enable_private_endpoint ? 1 : 0
  name                = "${var.prefix}-${var.env}-signalr-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.prefix}-${var.env}-signalr-psc"
    private_connection_resource_id = azurerm_signalr_service.main.id
    is_manual_connection           = false
    subresource_names              = ["signalr"]
  }

  tags = var.tags
}

# Custom Domain (if provided)
resource "azurerm_signalr_service_custom_domain" "main" {
  count              = var.custom_domain_name != "" ? 1 : 0
  name               = replace(var.custom_domain_name, ".", "-")
  signalr_service_id = azurerm_signalr_service.main.id
  domain_name        = var.custom_domain_name

  signalr_custom_certificate_id = var.custom_certificate_id
}

# Network ACLs
resource "azurerm_signalr_service_network_acl" "main" {
  signalr_service_id = azurerm_signalr_service.main.id
  default_action     = var.default_network_action

  public_network {
    allowed_request_types = var.public_allowed_request_types
    denied_request_types  = var.public_denied_request_types
  }

  dynamic "private_endpoint" {
    for_each = var.enable_private_endpoint ? [1] : []
    content {
      id                    = azurerm_private_endpoint.signalr[0].id
      allowed_request_types = ["ServerConnection", "ClientConnection", "RESTAPI", "Trace"]
    }
  }
}

# Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "signalr" {
  count                      = var.log_analytics_workspace_id != "" ? 1 : 0
  name                       = "${var.prefix}-${var.env}-signalr-diagnostics"
  target_resource_id         = azurerm_signalr_service.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "AllLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
