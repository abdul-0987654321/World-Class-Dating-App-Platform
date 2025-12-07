# Terraform and Provider Version Constraints
#
# This file defines the required versions for Terraform and all providers
# used across the DatingPlatform infrastructure.

terraform {
  # Minimum Terraform version required
  required_version = ">= 1.6.0"

  required_providers {
    # Azure Resource Manager Provider
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85.0"
    }

    # Azure Active Directory Provider
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47.0"
    }

    # Random Provider for unique naming
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }

    # Null Provider for provisioners
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2.0"
    }

    # Time Provider for time-based operations
    time = {
      source  = "hashicorp/time"
      version = "~> 0.10.0"
    }

    # TLS Provider for certificate management
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0.0"
    }
  }
}
