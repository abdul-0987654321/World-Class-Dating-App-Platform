# Backend Configuration for Production Environment
# Terraform state is stored in Azure Storage Account

terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state-westus2"
    storage_account_name = "sttfstatedatingplatform"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"

    # Optional: Use Azure AD authentication instead of storage account key
    # use_azuread_auth = true

    # Production state file has additional protection
    # State locking is enabled by default with Azure Storage
  }
}
