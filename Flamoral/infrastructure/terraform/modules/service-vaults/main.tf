# =============================================================================
# Service-Specific Key Vaults Module
# Implements vault-per-app-per-environment architecture
# =============================================================================

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

data "azurerm_client_config" "current" {}

locals {
  # Define service vault configurations
  service_vaults = {
    auth = {
      name        = "auth"
      description = "Authentication service secrets (JWT, OAuth, sessions)"
      secrets = [
        "jwt-secret",
        "jwt-access-secret",
        "jwt-refresh-secret",
        "session-secret",
        "google-client-secret",
        "facebook-app-secret",
        "apple-private-key"
      ]
    }
    payment = {
      name        = "payment"
      description = "Payment service secrets (Stripe, Paystack, Flutterwave, IAP)"
      secrets = [
        "stripe-secret-key",
        "stripe-publishable-key",
        "stripe-webhook-secret",
        "paystack-secret-key",
        "flutterwave-secret-key",
        "apple-iap-shared-secret",
        "google-play-service-account"
      ]
    }
    data = {
      name        = "data"
      description = "Database and cache connection secrets"
      secrets = [
        "postgres-connection-string",
        "mongodb-uri",
        "redis-password",
        "redis-connection-string",
        "redis-host",
        "cosmosdb-key",
        "db-host",
        "db-name",
        "db-user",
        "db-password",
        "db-read-replica-1-url",
        "db-read-replica-2-url"
      ]
    }
    external = {
      name        = "external"
      description = "Third-party service API keys"
      secrets = [
        "sendgrid-api-key",
        "twilio-account-sid",
        "twilio-auth-token",
        "firebase-private-key",
        "fcm-server-key",
        "agora-app-id",
        "agora-app-certificate",
        "agora-customer-key",
        "agora-customer-secret",
        "sentry-dsn",
        "openai-api-key"
      ]
    }
    infra = {
      name        = "infra"
      description = "Infrastructure and internal service secrets"
      secrets = [
        "service-api-key",
        "encryption-key",
        "azure-storage-key",
        "azure-storage-connection-string",
        "azure-face-api-key",
        "azure-content-moderator-key",
        "azure-computer-vision-key",
        "azure-service-bus-connection-string",
        "application-insights-connection-string",
        "elasticsearch-password"
      ]
    }
  }
}

# =============================================================================
# Create Key Vault for each service
# =============================================================================
resource "azurerm_key_vault" "service" {
  for_each = local.service_vaults

  name                        = "${var.prefix}${var.env}${each.value.name}kv"
  location                    = var.location
  resource_group_name         = var.resource_group_name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = var.sku_name

  enabled_for_disk_encryption = false
  enabled_for_deployment      = true
  enable_rbac_authorization   = true

  soft_delete_retention_days = var.soft_delete_retention_days
  purge_protection_enabled   = var.enable_purge_protection

  network_acls {
    bypass                     = "AzureServices"
    default_action             = var.env == "prod" ? "Deny" : "Allow"
    ip_rules                   = var.allowed_ip_addresses
    virtual_network_subnet_ids = var.allowed_subnet_ids
  }

  tags = merge(var.tags, {
    Service     = each.value.name
    Environment = var.env
    Description = each.value.description
  })
}

# =============================================================================
# RBAC Role Assignments
# =============================================================================

# Terraform/deployment service principal - Administrator on all vaults
resource "azurerm_role_assignment" "terraform_admin" {
  for_each = local.service_vaults

  scope                = azurerm_key_vault.service[each.key].id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id

  depends_on = [azurerm_key_vault.service]
}

# AKS managed identity - Secrets User on all vaults
resource "azurerm_role_assignment" "aks_secrets_user" {
  for_each = local.service_vaults

  scope                = azurerm_key_vault.service[each.key].id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.aks_kubelet_identity_object_id

  depends_on = [azurerm_key_vault.service]
}

# Service-specific managed identities
resource "azurerm_role_assignment" "service_identity" {
  for_each = {
    for pair in flatten([
      for vault_key, vault in local.service_vaults : [
        for identity_key, identity_id in var.service_identities : {
          key         = "${vault_key}-${identity_key}"
          vault_key   = vault_key
          identity_id = identity_id
          # Only grant access to relevant vault
          grant = (
            (vault_key == "auth" && contains(["auth-service"], identity_key)) ||
            (vault_key == "payment" && contains(["payment-service"], identity_key)) ||
            (vault_key == "data" && contains(["user-service", "matching-service", "messaging-service"], identity_key)) ||
            (vault_key == "external" && contains(["notification-service", "media-service", "ai-service"], identity_key)) ||
            (vault_key == "infra" && contains(["api-gateway", "admin-service"], identity_key))
          )
        }
      ]
    ]) : pair.key => pair if pair.grant && pair.identity_id != ""
  }

  scope                = azurerm_key_vault.service[each.value.vault_key].id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = each.value.identity_id
}

# =============================================================================
# Diagnostic Settings for Audit Logging
# =============================================================================
resource "azurerm_monitor_diagnostic_setting" "vault_diagnostics" {
  for_each = local.service_vaults

  name                       = "${azurerm_key_vault.service[each.key].name}-diagnostics"
  target_resource_id         = azurerm_key_vault.service[each.key].id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  depends_on = [azurerm_key_vault.service]

  enabled_log {
    category = "AuditEvent"
  }

  enabled_log {
    category = "AzurePolicyEvaluationDetails"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# =============================================================================
# Private Endpoints (Production only)
# =============================================================================
resource "azurerm_private_endpoint" "vault" {
  for_each = var.enable_private_endpoint ? azurerm_key_vault.service : {}

  name                = "${each.value.name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${each.value.name}-psc"
    private_connection_resource_id = each.value.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  tags = var.tags
}

# =============================================================================
# Alert Rules
# =============================================================================
resource "azurerm_monitor_metric_alert" "unauthorized_access" {
  for_each = var.enable_alerts ? azurerm_key_vault.service : {}

  name                = "${each.value.name}-unauthorized-access-alert"
  resource_group_name = var.resource_group_name
  scopes              = [each.value.id]
  description         = "Alert on unauthorized access attempts to ${each.value.name}"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.KeyVault/vaults"
    metric_name      = "ServiceApiResult"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 5

    dimension {
      name     = "StatusCode"
      operator = "Include"
      values   = ["401", "403"]
    }
  }

  action {
    action_group_id = var.alert_action_group_id
  }

  tags = var.tags
}
