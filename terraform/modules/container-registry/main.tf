resource "azurerm_container_registry" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.sku
  admin_enabled       = var.admin_enabled

  # Enable content trust for production environments
  trust_policy {
    enabled = var.environment == "prod" ? true : false
  }

  # Enable retention policy for production
  retention_policy {
    days    = var.environment == "prod" ? 30 : 7
    enabled = true
  }

  tags = merge(
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.tags
  )
}
