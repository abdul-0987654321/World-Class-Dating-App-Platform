# Backend Configuration for Development Environment
# Terraform state is stored in Azure Storage Account

terraform {
  backend "azurerm" {
    resource_group_name  = "flamoral-rg"
    storage_account_name = "flamoralstate"
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"

    # Optional: Use Azure AD authentication instead of storage account key
    # use_azuread_auth = true
  }
}
