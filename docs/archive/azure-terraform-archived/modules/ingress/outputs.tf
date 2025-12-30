# =============================================================================
# Flamoral Dating Platform - NGINX Ingress Controller Outputs
# =============================================================================

output "namespace" {
  description = "Ingress controller namespace"
  value       = kubernetes_namespace.ingress.metadata[0].name
}

output "ingress_class" {
  description = "Ingress class name"
  value       = "nginx"
}

output "helm_release_name" {
  description = "Helm release name"
  value       = helm_release.nginx_ingress.name
}

output "helm_release_status" {
  description = "Helm release status"
  value       = helm_release.nginx_ingress.status
}

output "is_internal" {
  description = "Whether this is an internal load balancer"
  value       = var.use_internal_load_balancer
}

output "cert_manager_enabled" {
  description = "Whether cert-manager is enabled"
  value       = var.enable_cert_manager
}

output "cluster_issuer_prod" {
  description = "Production ClusterIssuer name"
  value       = var.enable_cert_manager ? "letsencrypt-prod" : ""
}

output "cluster_issuer_staging" {
  description = "Staging ClusterIssuer name"
  value       = var.enable_cert_manager ? "letsencrypt-staging" : ""
}
