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

# Note: Variables subscription_id, tenant_id, prefix, env are defined in variables.tf
# to avoid duplicate declarations

variable "enable_aks" {
  description = "Whether AKS is enabled (for kubernetes/helm providers)"
  type        = bool
  default     = false
}
