# =============================================================================
# Flamoral Dating Platform - NGINX Ingress Controller Module
# =============================================================================
# Deploys NGINX Ingress Controller with:
# - Private ingress for dev/test environments
# - Public ingress for production with Let's Encrypt
# =============================================================================

# =============================================================================
# Namespace for Ingress Controller
# =============================================================================
resource "kubernetes_namespace" "ingress" {
  metadata {
    name = var.namespace

    labels = {
      name        = var.namespace
      environment = var.environment
    }
  }
}

# =============================================================================
# NGINX Ingress Controller - Helm Release
# =============================================================================
resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = var.chart_version
  namespace  = kubernetes_namespace.ingress.metadata[0].name

  # Controller configuration
  set {
    name  = "controller.replicaCount"
    value = var.replica_count
  }

  set {
    name  = "controller.nodeSelector.kubernetes\\.io/os"
    value = "linux"
  }

  # Service type and load balancer configuration
  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  # Azure Load Balancer annotations
  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-internal"
    value = var.use_internal_load_balancer ? "true" : "false"
  }

  # Use existing public IP for production
  dynamic "set" {
    for_each = var.public_ip_address != "" ? [1] : []
    content {
      name  = "controller.service.loadBalancerIP"
      value = var.public_ip_address
    }
  }

  # Resource group for public IP
  dynamic "set" {
    for_each = var.public_ip_resource_group != "" ? [1] : []
    content {
      name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-resource-group"
      value = var.public_ip_resource_group
    }
  }

  # Health probe configuration
  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-health-probe-request-path"
    value = "/healthz"
  }

  # Metrics
  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }

  set {
    name  = "controller.metrics.serviceMonitor.enabled"
    value = var.enable_service_monitor ? "true" : "false"
  }

  # Pod disruption budget
  set {
    name  = "controller.podDisruptionBudget.enabled"
    value = "true"
  }

  set {
    name  = "controller.podDisruptionBudget.minAvailable"
    value = "1"
  }

  # Autoscaling
  set {
    name  = "controller.autoscaling.enabled"
    value = var.enable_autoscaling ? "true" : "false"
  }

  set {
    name  = "controller.autoscaling.minReplicas"
    value = var.min_replicas
  }

  set {
    name  = "controller.autoscaling.maxReplicas"
    value = var.max_replicas
  }

  # Resources
  set {
    name  = "controller.resources.requests.cpu"
    value = var.cpu_request
  }

  set {
    name  = "controller.resources.requests.memory"
    value = var.memory_request
  }

  set {
    name  = "controller.resources.limits.cpu"
    value = var.cpu_limit
  }

  set {
    name  = "controller.resources.limits.memory"
    value = var.memory_limit
  }

  # Default backend
  set {
    name  = "defaultBackend.enabled"
    value = "true"
  }

  wait    = true
  timeout = 600
}

# =============================================================================
# Cert-Manager for Let's Encrypt (Production Only)
# =============================================================================
resource "kubernetes_namespace" "cert_manager" {
  count = var.enable_cert_manager ? 1 : 0

  metadata {
    name = "cert-manager"

    labels = {
      name = "cert-manager"
    }
  }
}

resource "helm_release" "cert_manager" {
  count = var.enable_cert_manager ? 1 : 0

  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = var.cert_manager_version
  namespace  = kubernetes_namespace.cert_manager[0].metadata[0].name

  set {
    name  = "installCRDs"
    value = "true"
  }

  set {
    name  = "prometheus.enabled"
    value = var.enable_service_monitor ? "true" : "false"
  }

  wait    = true
  timeout = 600
}

# =============================================================================
# Let's Encrypt Cluster Issuer (Production)
# =============================================================================
resource "kubernetes_manifest" "cluster_issuer_prod" {
  count = var.enable_cert_manager && var.letsencrypt_email != "" ? 1 : 0

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-prod"
    }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = var.letsencrypt_email
        privateKeySecretRef = {
          name = "letsencrypt-prod-account-key"
        }
        solvers = [
          {
            http01 = {
              ingress = {
                class = "nginx"
              }
            }
          }
        ]
      }
    }
  }

  depends_on = [helm_release.cert_manager]
}

# Let's Encrypt Staging (for testing)
resource "kubernetes_manifest" "cluster_issuer_staging" {
  count = var.enable_cert_manager && var.letsencrypt_email != "" ? 1 : 0

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-staging"
    }
    spec = {
      acme = {
        server = "https://acme-staging-v02.api.letsencrypt.org/directory"
        email  = var.letsencrypt_email
        privateKeySecretRef = {
          name = "letsencrypt-staging-account-key"
        }
        solvers = [
          {
            http01 = {
              ingress = {
                class = "nginx"
              }
            }
          }
        ]
      }
    }
  }

  depends_on = [helm_release.cert_manager]
}
