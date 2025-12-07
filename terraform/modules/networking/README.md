# Networking Module

This module creates an Azure Virtual Network with multiple subnets, network security groups, and subnet-NSG associations.

## Features

- Virtual Network with configurable address space
- Multiple subnets with individual address prefixes
- Network Security Groups for each subnet
- Automatic NSG-subnet associations
- Support for subnet delegations (e.g., for App Service, Container Instances)

## Usage

```hcl
module "networking" {
  source = "./modules/networking"

  vnet_name           = "vnet-datingplatform-prod"
  resource_group_name = module.resource_group.name
  location            = "eastus"
  environment         = "prod"
  address_space       = ["10.0.0.0/16"]

  subnets = [
    {
      name             = "subnet-app-services"
      address_prefixes = ["10.0.1.0/24"]
      delegation = {
        name         = "app-service-delegation"
        service_name = "Microsoft.Web/serverFarms"
        actions      = ["Microsoft.Network/virtualNetworks/subnets/action"]
      }
    },
    {
      name             = "subnet-databases"
      address_prefixes = ["10.0.2.0/24"]
    },
    {
      name             = "subnet-containers"
      address_prefixes = ["10.0.3.0/24"]
    }
  ]
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| vnet_name | The name of the Virtual Network | `string` | n/a | yes |
| address_space | The address space for the Virtual Network | `list(string)` | n/a | yes |
| subnets | List of subnet configurations | `list(object)` | n/a | yes |
| resource_group_name | The name of the resource group | `string` | n/a | yes |
| location | The Azure region where the Virtual Network will be created | `string` | n/a | yes |
| environment | The environment name (dev, test, prod) | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| vnet_id | The ID of the Virtual Network |
| subnet_ids | Map of subnet names to their IDs |

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0

## Notes

- Each subnet automatically gets its own Network Security Group
- Subnet delegations are optional and can be configured for specific Azure services
- NSG rules should be added separately based on security requirements
- Use the subnet_ids output to reference subnets in other modules
