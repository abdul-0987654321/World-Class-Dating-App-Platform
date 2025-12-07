resource "azurerm_mssql_server" "this" {
  name                         = var.server_name
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.administrator_login
  administrator_login_password = var.administrator_password

  minimum_tls_version = "1.2"

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_mssql_database" "this" {
  name           = var.database_name
  server_id      = azurerm_mssql_server.this.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  max_size_gb    = var.max_size_gb
  sku_name       = var.sku_name
  zone_redundant = var.environment == "prod" ? true : false

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Enable threat detection for test and prod environments
resource "azurerm_mssql_server_security_alert_policy" "this" {
  count              = var.environment != "dev" ? 1 : 0
  resource_group_name = var.resource_group_name
  server_name        = azurerm_mssql_server.this.name
  state              = "Enabled"
  retention_days     = var.environment == "prod" ? 90 : 30
}

# Enable vulnerability assessment for test and prod environments
resource "azurerm_mssql_server_vulnerability_assessment" "this" {
  count              = var.environment != "dev" ? 1 : 0
  server_security_alert_policy_id = azurerm_mssql_server_security_alert_policy.this[0].id
  storage_container_path = "${var.storage_endpoint}vulnerability-assessment/"
  storage_account_access_key = var.storage_account_access_key

  recurring_scans {
    enabled                   = true
    email_subscription_admins = true
  }
}
