resource "azurerm_key_vault" "this" {
  name                       = var.name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  tenant_id                  = var.tenant_id
  sku_name                   = var.sku_name
  soft_delete_retention_days = 90
  purge_protection_enabled   = var.enable_purge_protection

  enabled_for_deployment          = true
  enabled_for_disk_encryption     = true
  enabled_for_template_deployment = true

  network_acls {
    bypass         = "AzureServices"
    default_action = var.environment == "prod" ? "Deny" : "Allow"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
