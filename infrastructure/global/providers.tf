terraform {
  required_version = ">= 1.4"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.80"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }

  # Authentication via OIDC (GitHub Actions) or Service Principal
  # Set via environment variables or workload identity
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

provider "kubernetes" {
  host                   = try(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.host, null)
  client_certificate     = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.client_certificate), null)
  client_key             = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.client_key), null)
  cluster_ca_certificate = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.cluster_ca_certificate), null)
}

provider "helm" {
  kubernetes {
    host                   = try(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.host, null)
    client_certificate     = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.client_certificate), null)
    client_key             = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.client_key), null)
    cluster_ca_certificate = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.cluster_ca_certificate), null)
  }
}

# Data source for existing AKS cluster (if creating kubernetes/helm resources)
data "azurerm_kubernetes_cluster" "aks" {
  count               = var.enable_aks ? 1 : 0
  name                = "${var.prefix}-${var.env}-aks"
  resource_group_name = "${var.prefix}-${var.env}-rg"
}

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  default     = "ba233460-2dbe-4603-a594-68f93ec9deb3"
}

variable "tenant_id" {
  description = "Azure Tenant ID"
  type        = string
  default     = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
}

variable "prefix" {
  description = "Resource naming prefix"
  type        = string
  default     = "datingapp"
}

variable "env" {
  description = "Environment (dev/staging/prod)"
  type        = string
}

variable "enable_aks" {
  description = "Whether AKS is enabled (for kubernetes/helm providers)"
  type        = bool
  default     = false
}
