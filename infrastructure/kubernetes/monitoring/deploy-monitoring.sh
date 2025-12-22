#!/bin/bash
# Flamoral Production Monitoring Deployment Script
# This script deploys Prometheus, Grafana, and Alertmanager using kube-prometheus-stack

set -euo pipefail

# Configuration
NAMESPACE="monitoring"
RELEASE_NAME="flamoral-prometheus"
CHART_VERSION="55.5.0"  # kube-prometheus-stack version
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi

    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install helm first."
        exit 1
    fi

    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi

    log_success "All prerequisites met."
}

# Add Helm repository
setup_helm_repo() {
    log_info "Setting up Helm repository..."

    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
    helm repo update

    log_success "Helm repository configured."
}

# Create namespace
create_namespace() {
    log_info "Creating namespace '${NAMESPACE}'..."

    if kubectl get namespace ${NAMESPACE} &> /dev/null; then
        log_warning "Namespace '${NAMESPACE}' already exists."
    else
        kubectl create namespace ${NAMESPACE}
        log_success "Namespace '${NAMESPACE}' created."
    fi

    # Label namespace for monitoring
    kubectl label namespace ${NAMESPACE} monitoring=enabled --overwrite
}

# Apply secrets (if not using external-secrets)
apply_secrets() {
    log_info "Applying secrets..."

    if [ -f "${SCRIPT_DIR}/alertmanager-secrets.yaml" ]; then
        log_warning "Applying secrets from file. Make sure to update with real values!"
        kubectl apply -f "${SCRIPT_DIR}/alertmanager-secrets.yaml"
        log_success "Secrets applied."
    else
        log_warning "alertmanager-secrets.yaml not found. Skipping..."
    fi
}

# Install/Upgrade kube-prometheus-stack
install_prometheus_stack() {
    log_info "Installing/Upgrading kube-prometheus-stack..."

    helm upgrade --install ${RELEASE_NAME} prometheus-community/kube-prometheus-stack \
        --namespace ${NAMESPACE} \
        --version ${CHART_VERSION} \
        --values "${SCRIPT_DIR}/kube-prometheus-stack-values.yaml" \
        --wait \
        --timeout 10m

    log_success "kube-prometheus-stack installed/upgraded."
}

# Apply ServiceMonitors
apply_service_monitors() {
    log_info "Applying ServiceMonitors..."

    if [ -f "${SCRIPT_DIR}/service-monitors.yaml" ]; then
        kubectl apply -f "${SCRIPT_DIR}/service-monitors.yaml"
        log_success "ServiceMonitors applied."
    else
        log_warning "service-monitors.yaml not found. Skipping..."
    fi
}

# Apply custom dashboards
apply_dashboards() {
    log_info "Applying custom Grafana dashboards..."

    if [ -f "${SCRIPT_DIR}/grafana-flamoral-dashboard.yaml" ]; then
        kubectl apply -f "${SCRIPT_DIR}/grafana-flamoral-dashboard.yaml"
        log_success "Custom dashboards applied."
    else
        log_warning "grafana-flamoral-dashboard.yaml not found. Skipping..."
    fi
}

# Apply Ingress resources
apply_ingress() {
    log_info "Applying Ingress resources..."

    if [ -f "${SCRIPT_DIR}/grafana-ingress.yaml" ]; then
        kubectl apply -f "${SCRIPT_DIR}/grafana-ingress.yaml"
        log_success "Ingress resources applied."
    else
        log_warning "grafana-ingress.yaml not found. Skipping..."
    fi
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    echo ""
    log_info "Checking pods in ${NAMESPACE} namespace..."
    kubectl get pods -n ${NAMESPACE}

    echo ""
    log_info "Checking services in ${NAMESPACE} namespace..."
    kubectl get svc -n ${NAMESPACE}

    echo ""
    log_info "Checking ServiceMonitors..."
    kubectl get servicemonitors -n ${NAMESPACE}

    echo ""
    log_info "Checking PrometheusRules..."
    kubectl get prometheusrules -n ${NAMESPACE}
}

# Get access information
get_access_info() {
    echo ""
    echo "=============================================="
    echo "       FLAMORAL MONITORING ACCESS INFO       "
    echo "=============================================="
    echo ""

    # Grafana password
    GRAFANA_PASSWORD=$(kubectl get secret -n ${NAMESPACE} ${RELEASE_NAME}-grafana -o jsonpath="{.data.admin-password}" 2>/dev/null | base64 --decode 2>/dev/null || echo "FlamoralAdmin123!")

    echo -e "${GREEN}Grafana Access:${NC}"
    echo "  URL:      https://monitoring.flamoral.com"
    echo "  Username: admin"
    echo "  Password: ${GRAFANA_PASSWORD}"
    echo ""

    echo -e "${GREEN}Prometheus Access:${NC}"
    echo "  URL:      https://prometheus.flamoral.com"
    echo "  Username: admin"
    echo "  Password: FlamoralAdmin123! (basic auth)"
    echo ""

    echo -e "${GREEN}Alertmanager Access:${NC}"
    echo "  URL:      https://alertmanager.flamoral.com"
    echo "  Username: admin"
    echo "  Password: FlamoralAdmin123! (basic auth)"
    echo ""

    echo -e "${YELLOW}Port-Forward Commands (for local access):${NC}"
    echo "  Grafana:      kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-grafana 3000:80"
    echo "  Prometheus:   kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-prometheus 9090:9090"
    echo "  Alertmanager: kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-alertmanager 9093:9093"
    echo ""

    echo -e "${BLUE}Standard Dashboards Imported:${NC}"
    echo "  - Kubernetes Cluster (ID: 315)"
    echo "  - NGINX Ingress Controller (ID: 9614)"
    echo "  - Node Exporter Full (ID: 1860)"
    echo "  - Kubernetes Resources Cluster (ID: 7249)"
    echo "  - Kubernetes Resources Namespace (ID: 7250)"
    echo ""

    echo -e "${BLUE}Custom Dashboards:${NC}"
    echo "  - Flamoral Services Overview"
    echo ""

    echo -e "${GREEN}Alerting Rules Configured:${NC}"
    echo "  - High error rate (>5% 5xx responses)"
    echo "  - Pod restarts"
    echo "  - High memory usage (>80%)"
    echo "  - Certificate expiry warning (7 days)"
    echo "  - Service down alerts"
    echo "  - High latency alerts"
    echo ""
}

# Test alert (optional)
test_alert() {
    log_info "To test alerting, you can create a test alert:"
    echo ""
    echo "kubectl run test-alert --image=alpine --restart=Never -- /bin/sh -c 'exit 1'"
    echo ""
    echo "This will trigger a pod restart alert. Clean up with:"
    echo "kubectl delete pod test-alert"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "=============================================="
    echo "   FLAMORAL MONITORING DEPLOYMENT SCRIPT     "
    echo "=============================================="
    echo ""

    # Parse arguments
    SKIP_INGRESS=false
    DRY_RUN=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-ingress)
                SKIP_INGRESS=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                log_warning "Unknown option: $1"
                shift
                ;;
        esac
    done

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN mode - no changes will be made"
        echo ""
        echo "Would execute:"
        echo "  1. Check prerequisites"
        echo "  2. Add Helm repo: prometheus-community"
        echo "  3. Create namespace: ${NAMESPACE}"
        echo "  4. Apply secrets"
        echo "  5. Install kube-prometheus-stack"
        echo "  6. Apply ServiceMonitors"
        echo "  7. Apply custom dashboards"
        if [ "$SKIP_INGRESS" = false ]; then
            echo "  8. Apply Ingress resources"
        fi
        echo "  9. Verify deployment"
        exit 0
    fi

    check_prerequisites
    setup_helm_repo
    create_namespace
    apply_secrets
    install_prometheus_stack
    apply_service_monitors
    apply_dashboards

    if [ "$SKIP_INGRESS" = false ]; then
        apply_ingress
    else
        log_warning "Skipping Ingress deployment. Use port-forward for access."
    fi

    verify_deployment
    get_access_info
    test_alert

    log_success "Monitoring deployment completed successfully!"
}

main "$@"
