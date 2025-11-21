# Azure Virtual Network Module for Dating App Platform

resource "azurerm_resource_group" "main" {
  name     = "${var.environment}-dating-app-rg"
  location = var.location

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-dating-app-resource-group"
    }
  )
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.environment}-dating-app-vnet"
  address_space       = [var.vnet_address_space]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-dating-app-vnet"
    }
  )
}

# Application Gateway Subnet
resource "azurerm_subnet" "app_gateway" {
  name                 = "${var.environment}-appgw-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_address_space, 8, 0)]
}

# AKS Subnet
resource "azurerm_subnet" "aks" {
  name                 = "${var.environment}-aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_address_space, 4, 1)]
}

# Database Subnet
resource "azurerm_subnet" "database" {
  name                 = "${var.environment}-database-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_address_space, 8, 2)]

  delegation {
    name = "database-delegation"

    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Redis Subnet
resource "azurerm_subnet" "redis" {
  name                 = "${var.environment}-redis-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_address_space, 8, 3)]

  delegation {
    name = "redis-delegation"

    service_delegation {
      name = "Microsoft.Cache/redis"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

# Private Endpoints Subnet
resource "azurerm_subnet" "private_endpoints" {
  name                 = "${var.environment}-private-endpoints-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_address_space, 8, 4)]

  private_endpoint_network_policies_enabled = true
}

# Network Security Group for AKS
resource "azurerm_network_security_group" "aks" {
  name                = "${var.environment}-aks-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = var.common_tags
}

# NSG Association for AKS Subnet
resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

# Network Security Group for Database
resource "azurerm_network_security_group" "database" {
  name                = "${var.environment}-database-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowPostgreSQL"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = azurerm_subnet.aks.address_prefixes[0]
    destination_address_prefix = "*"
  }

  tags = var.common_tags
}

# NSG Association for Database Subnet
resource "azurerm_subnet_network_security_group_association" "database" {
  subnet_id                 = azurerm_subnet.database.id
  network_security_group_id = azurerm_network_security_group.database.id
}

# NAT Gateway (Optional)
resource "azurerm_public_ip" "nat" {
  count               = var.enable_nat_gateway ? 1 : 0
  name                = "${var.environment}-nat-gateway-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = var.common_tags
}

resource "azurerm_nat_gateway" "main" {
  count               = var.enable_nat_gateway ? 1 : 0
  name                = "${var.environment}-nat-gateway"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Standard"

  tags = var.common_tags
}

resource "azurerm_nat_gateway_public_ip_association" "main" {
  count                = var.enable_nat_gateway ? 1 : 0
  nat_gateway_id       = azurerm_nat_gateway.main[0].id
  public_ip_address_id = azurerm_public_ip.nat[0].id
}

resource "azurerm_subnet_nat_gateway_association" "aks" {
  count          = var.enable_nat_gateway ? 1 : 0
  subnet_id      = azurerm_subnet.aks.id
  nat_gateway_id = azurerm_nat_gateway.main[0].id
}

# Azure Bastion (Optional for secure VM access)
resource "azurerm_subnet" "bastion" {
  count                = var.enable_bastion ? 1 : 0
  name                 = "AzureBastionSubnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_address_space, 8, 5)]
}

resource "azurerm_public_ip" "bastion" {
  count               = var.enable_bastion ? 1 : 0
  name                = "${var.environment}-bastion-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = var.common_tags
}

resource "azurerm_bastion_host" "main" {
  count               = var.enable_bastion ? 1 : 0
  name                = "${var.environment}-bastion"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                 = "configuration"
    subnet_id            = azurerm_subnet.bastion[0].id
    public_ip_address_id = azurerm_public_ip.bastion[0].id
  }

  tags = var.common_tags
}

# Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgres" {
  name                = "${var.environment}-dating-app.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name

  tags = var.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.environment}-postgres-vnet-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id

  tags = var.common_tags
}

# Log Analytics Workspace for Network Monitoring
resource "azurerm_log_analytics_workspace" "network" {
  count               = var.enable_network_monitoring ? 1 : 0
  name                = "${var.environment}-network-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.common_tags
}

# Network Watcher
resource "azurerm_network_watcher" "main" {
  count               = var.enable_network_monitoring ? 1 : 0
  name                = "${var.environment}-network-watcher"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = var.common_tags
}
