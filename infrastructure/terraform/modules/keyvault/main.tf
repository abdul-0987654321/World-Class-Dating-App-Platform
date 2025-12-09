# Azure Key Vault Module

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                        = "${var.prefix}-${var.env}-kv"
  location                    = var.location
  resource_group_name         = var.resource_group_name
  enabled_for_disk_encryption = true
  enabled_for_deployment      = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = var.soft_delete_retention_days
  purge_protection_enabled    = var.env == "prod" ? true : false
  sku_name                    = var.sku_name

  enable_rbac_authorization = true

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    ip_rules                   = var.allowed_ip_addresses
    virtual_network_subnet_ids = var.allowed_subnet_ids
  }

  tags = var.tags
}

# RBAC Role Assignment for AKS managed identity (replaces access policies)
# When enable_rbac_authorization = true, access policies are ignored
resource "azurerm_role_assignment" "aks_secrets_user" {
  count                = var.aks_kubelet_identity_object_id != "" ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.aks_kubelet_identity_object_id
}

# RBAC Role Assignment for Terraform/deployment service principal
resource "azurerm_role_assignment" "terraform_admin" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Store secrets
resource "azurerm_key_vault_secret" "postgres_connection_string" {
  count        = var.postgres_connection_string != "" ? 1 : 0
  name         = "postgres-connection-string"
  value        = var.postgres_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.terraform_admin]
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  count        = var.redis_connection_string != "" ? 1 : 0
  name         = "redis-connection-string"
  value        = var.redis_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.terraform_admin]
}

resource "azurerm_key_vault_secret" "storage_connection_string" {
  count        = var.storage_connection_string != "" ? 1 : 0
  name         = "storage-connection-string"
  value        = var.storage_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.terraform_admin]
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.terraform_admin]
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# Private Endpoint for Key Vault
resource "azurerm_private_endpoint" "keyvault" {
  count               = var.enable_private_endpoint ? 1 : 0
  name                = "${var.prefix}-${var.env}-kv-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.prefix}-${var.env}-kv-psc"
    private_connection_resource_id = azurerm_key_vault.main.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  tags = var.tags
}

# Diagnostic settings for Key Vault
resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  count                      = var.log_analytics_workspace_id != "" ? 1 : 0
  name                       = "${var.prefix}-${var.env}-kv-diagnostics"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

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
