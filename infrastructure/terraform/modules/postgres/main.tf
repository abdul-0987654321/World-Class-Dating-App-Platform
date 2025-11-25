# PostgreSQL Flexible Server Module

resource "random_password" "postgres" {
  length  = 24
  special = true
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "${var.prefix}-${var.env}-postgres"
  resource_group_name = var.resource_group_name
  location            = var.location
  version             = var.postgres_version
  delegated_subnet_id = var.subnet_id
  administrator_login    = "psqladmin"
  administrator_password = random_password.postgres.result
  zone                   = "1"
  storage_mb             = var.storage_mb
  sku_name               = var.sku_name
  backup_retention_days  = 7
  geo_redundant_backup_enabled = var.env == "prod" ? true : false

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_database" "dating" {
  name      = "datingapp"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
