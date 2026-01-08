################################################################################
# AWS Terraform Provider Configuration
# AWS ECS FARGATE ONLY - NO KUBERNETES/EKS/HELM
################################################################################

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    # AWS Provider - PRIMARY AND ONLY CLOUD PROVIDER
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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
# - kubernetes (Kubernetes - use ECS instead)
# - helm (Helm - use ECS task definitions instead)
# - Any Azure-related providers
# - Any Kubernetes-related providers
#
# This infrastructure is AWS ECS FARGATE ONLY.
# NO EKS, NO KUBERNETES, NO HELM.
################################################################################
