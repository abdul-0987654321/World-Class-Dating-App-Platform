# Terraform Backend Configuration
# This file configures remote state storage in Azure Storage Account
#
# IMPORTANT: Run bootstrap-backend.sh before first terraform init to create
# the storage account and container for remote state.
#
# The backend config is partially configured here, with the 'key' parameter
# passed via -backend-config during terraform init to support multiple environments.

terraform {
  backend "azurerm" {
    resource_group_name  = "flamoral-terraform-state-rg"
    storage_account_name = "flamoraltfstate"
    container_name       = "tfstate"
    # key is set via -backend-config during init: key="flamoral-{env}.tfstate"
  }
}

# Bootstrap instructions:
# 1. Run the bootstrap script to create backend resources:
#    cd infrastructure/terraform
#    chmod +x bootstrap-backend.sh
#    ./bootstrap-backend.sh dev
#
# 2. Then initialize terraform with environment-specific state file:
#    terraform init -backend-config="key=flamoral-dev.tfstate"
