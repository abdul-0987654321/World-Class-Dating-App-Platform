# =============================================================================
# Flamoral Dating Platform - Shared ACR Module
# =============================================================================
# This module creates a shared Azure Container Registry used by all environments
# =============================================================================

resource "azurerm_resource_group" "shared" {
  name     = var.resource_group_name
  location = var.location

  tags = var.tags
}

resource "random_string" "acr_suffix" {
  length  = 6
  special = false
  upper   = false
}

# =============================================================================
# Azure Container Registry - Shared across environments
# =============================================================================
resource "azurerm_container_registry" "main" {
  name                = "${var.acr_name}${random_string.acr_suffix.result}"
  resource_group_name = azurerm_resource_group.shared.name
  location            = azurerm_resource_group.shared.location
  sku                 = var.acr_sku
  admin_enabled       = var.admin_enabled

  # Geo-replication for production
  dynamic "georeplications" {
    for_each = var.acr_sku == "Premium" ? var.georeplications : []
    content {
      location                = georeplications.value.location
      zone_redundancy_enabled = georeplications.value.zone_redundancy_enabled
      tags                    = var.tags
    }
  }

  # Network rules for Premium SKU
  dynamic "network_rule_set" {
    for_each = var.acr_sku == "Premium" && length(var.allowed_subnet_ids) > 0 ? [1] : []
    content {
      default_action = "Deny"

      dynamic "virtual_network" {
        for_each = var.allowed_subnet_ids
        content {
          action    = "Allow"
          subnet_id = virtual_network.value
        }
      }
    }
  }

  # Retention policy for untagged manifests (Premium SKU only)
  dynamic "retention_policy" {
    for_each = var.acr_sku == "Premium" ? [1] : []
    content {
      days    = var.retention_days
      enabled = var.retention_enabled
    }
  }

  # Trust policy for signed images (Premium SKU only)
  dynamic "trust_policy" {
    for_each = var.acr_sku == "Premium" ? [1] : []
    content {
      enabled = var.trust_policy_enabled
    }
  }

  tags = var.tags
}

# =============================================================================
# Service Principal Access for CI/CD
# =============================================================================
resource "azurerm_role_assignment" "acr_push" {
  count                = var.cicd_service_principal_id != "" ? 1 : 0
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = var.cicd_service_principal_id
}

# =============================================================================
# Diagnostic Settings
# =============================================================================
resource "azurerm_monitor_diagnostic_setting" "acr" {
  count                      = var.log_analytics_workspace_id != "" ? 1 : 0
  name                       = "${var.acr_name}-diagnostics"
  target_resource_id         = azurerm_container_registry.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "ContainerRegistryRepositoryEvents"
  }

  enabled_log {
    category = "ContainerRegistryLoginEvents"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# =============================================================================
# Webhooks for CI/CD notifications
# =============================================================================
resource "azurerm_container_registry_webhook" "main" {
  for_each            = var.webhooks
  name                = each.key
  registry_name       = azurerm_container_registry.main.name
  resource_group_name = azurerm_resource_group.shared.name
  location            = azurerm_resource_group.shared.location
  service_uri         = each.value.service_uri
  status              = each.value.status
  scope               = each.value.scope
  actions             = each.value.actions
  custom_headers      = each.value.custom_headers

  tags = var.tags
}
