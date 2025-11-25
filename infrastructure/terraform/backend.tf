# Terraform Backend Configuration
# This file configures remote state storage in Azure Storage Account

terraform {
  backend "azurerm" {
    resource_group_name  = "datingapp-tfstate-rg"
    storage_account_name = "datingapptfstate"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"

    # Use OIDC authentication from GitHub Actions
    use_oidc = true
  }
}

# Note: Before using this backend, create the storage account:
#
# az group create --name datingapp-tfstate-rg --location eastus
# az storage account create --name datingapptfstate --resource-group datingapp-tfstate-rg --location eastus --sku Standard_LRS
# az storage container create --name tfstate --account-name datingapptfstate
