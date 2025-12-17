# PostgreSQL Flexible Server Module

resource "random_password" "postgres" {
  length  = 24
  special = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgres" {
  name                = "${var.prefix}-${var.env}.postgres.database.azure.com"
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# Link Private DNS Zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  count                 = var.vnet_id != "" ? 1 : 0
  name                  = "${var.prefix}-${var.env}-postgres-vnet-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.prefix}-${var.env}-postgres"
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = var.postgres_version
  delegated_subnet_id    = var.subnet_id
  private_dns_zone_id    = azurerm_private_dns_zone.postgres.id
  administrator_login    = "psqladmin"
  administrator_password = random_password.postgres.result
  zone                   = "1"
  storage_mb             = var.storage_mb
  sku_name               = var.sku_name
  backup_retention_days  = 7
  geo_redundant_backup_enabled = var.env == "prod" ? true : false

  tags = var.tags

  depends_on = [azurerm_private_dns_zone.postgres]
}

resource "azurerm_postgresql_flexible_server_database" "dating" {
  name      = "datingapp"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Firewall rules removed - PostgreSQL is deployed in VNet with delegated subnet
# Access is controlled via VNet integration and private DNS, not public firewall rules
# If specific IP access is needed, use authorized_network_ids or service endpoints
