################################################################################
# AWS Terraform Provider Configuration
# AZURE IS FORBIDDEN - AWS ONLY
################################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    # AWS Provider - PRIMARY AND ONLY CLOUD PROVIDER
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Kubernetes Provider - For EKS integration
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }

    # Helm Provider - For Kubernetes package management
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }

    # Random Provider - For generating random values
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }

    # TLS Provider - For certificate generation
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }

    # Null Provider - For null resources
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }

    # Time Provider - For time-based resources
    time = {
      source  = "hashicorp/time"
      version = "~> 0.10"
    }

    # Archive Provider - For Lambda packaging
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

################################################################################
# PROVIDER RESTRICTIONS
# The following providers are EXPLICITLY FORBIDDEN:
# - azurerm (Azure Resource Manager)
# - azuread (Azure Active Directory)
# - azurestack
# - Any Azure-related providers
#
# This infrastructure is AWS-ONLY.
# Any attempt to add Azure providers will fail validation.
################################################################################
