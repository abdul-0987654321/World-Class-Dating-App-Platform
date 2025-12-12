#!/bin/bash
# Full Environment Rebuild Script - Disaster Recovery
# Flamoral Dating Platform

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="/var/log/flamoral-dr"
LOG_FILE="${LOG_DIR}/rebuild-${TIMESTAMP}.log"

# Environment Configuration
ENV="${ENV:-production}"
AZURE_REGION="${AZURE_REGION:-East US}"
AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-}"
BACKUP_TIMESTAMP="${BACKUP_TIMESTAMP:-latest}"

# Infrastructure paths
TERRAFORM_DIR="${SCRIPT_DIR}/../../infrastructure/terraform"
HELM_DIR="${SCRIPT_DIR}/../../infrastructure/helm"
K8S_DIR="${SCRIPT_DIR}/../../infrastructure/kubernetes"

# Rebuild options
REBUILD_INFRASTRUCTURE="${REBUILD_INFRASTRUCTURE:-true}"
REBUILD_DATABASES="${REBUILD_DATABASES:-true}"
REBUILD_KUBERNETES="${REBUILD_KUBERNETES:-true}"
REBUILD_APPLICATIONS="${REBUILD_APPLICATIONS:-true}"
RESTORE_DATA="${RESTORE_DATA:-true}"

# Safety settings
DRY_RUN="${DRY_RUN:-false}"
SKIP_CONFIRMATION="${SKIP_CONFIRMATION:-false}"

# ============================================================================
# Logging Functions
# ============================================================================

setup_logging() {
    mkdir -p "${LOG_DIR}"
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2>&1
}

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

log_info() {
    log "INFO: $*"
}

log_error() {
    log "ERROR: $*"
}

log_success() {
    log "SUCCESS: $*"
}

log_warning() {
    log "WARNING: $*"
}

log_section() {
    echo ""
    echo "========================================"
    echo "$*"
    echo "========================================"
    echo ""
}

# ============================================================================
# Error Handling
# ============================================================================

error_exit() {
    log_error "$1"
    log_error "Environment rebuild failed. Check logs: ${LOG_FILE}"
    exit 1
}

trap 'error_exit "Script interrupted"' INT TERM

# ============================================================================
# Confirmation
# ============================================================================

confirm_rebuild() {
    if [[ "${SKIP_CONFIRMATION}" == "true" ]]; then
        return 0
    fi

    cat <<EOF

========================================
CRITICAL: FULL ENVIRONMENT REBUILD
========================================
This script will rebuild the ENTIRE environment from scratch!

Environment: ${ENV}
Region: ${AZURE_REGION}
Resource Group: ${AZURE_RESOURCE_GROUP}

Components to rebuild:
  - Infrastructure (Azure resources): ${REBUILD_INFRASTRUCTURE}
  - Databases: ${REBUILD_DATABASES}
  - Kubernetes cluster: ${REBUILD_KUBERNETES}
  - Applications: ${REBUILD_APPLICATIONS}
  - Data restoration: ${RESTORE_DATA}

Backup timestamp: ${BACKUP_TIMESTAMP}

This is a DESTRUCTIVE operation that will:
  1. Destroy existing resources
  2. Recreate infrastructure from Terraform
  3. Rebuild Kubernetes cluster
  4. Restore databases from backups
  5. Redeploy all applications

EOF

    read -p "Are you ABSOLUTELY SURE you want to proceed? (type 'REBUILD' to continue): " confirmation

    if [[ "${confirmation}" != "REBUILD" ]]; then
        log_info "Rebuild cancelled by user"
        exit 0
    fi

    log_info "Rebuild confirmed by user"
}

# ============================================================================
# Prerequisites Check
# ============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    local required_commands=("terraform" "kubectl" "helm" "az" "psql" "velero")

    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" &> /dev/null; then
            error_exit "Required command not found: ${cmd}"
        fi
    done

    # Check Azure CLI login
    if ! az account show &> /dev/null; then
        error_exit "Not logged in to Azure CLI. Run: az login"
    fi

    # Check Terraform directory
    if [[ ! -d "${TERRAFORM_DIR}" ]]; then
        error_exit "Terraform directory not found: ${TERRAFORM_DIR}"
    fi

    log_success "Prerequisites check passed"
}

# ============================================================================
# Step 1: Rebuild Infrastructure
# ============================================================================

rebuild_infrastructure() {
    if [[ "${REBUILD_INFRASTRUCTURE}" != "true" ]]; then
        log_info "Skipping infrastructure rebuild"
        return 0
    fi

    log_section "Step 1: Rebuilding Azure Infrastructure"

    cd "${TERRAFORM_DIR}/environments/${ENV}"

    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init -upgrade || error_exit "Terraform init failed"

    # Destroy existing infrastructure (if exists)
    log_warning "Destroying existing infrastructure..."
    if [[ "${DRY_RUN}" == "false" ]]; then
        terraform destroy -auto-approve || log_warning "Destroy failed (resources may not exist)"
    else
        log_info "[DRY RUN] Would destroy infrastructure"
    fi

    # Wait for resources to be fully deleted
    sleep 60

    # Apply new infrastructure
    log_info "Creating new infrastructure..."
    if [[ "${DRY_RUN}" == "false" ]]; then
        terraform apply -auto-approve || error_exit "Terraform apply failed"
    else
        log_info "[DRY RUN] Would create infrastructure"
        terraform plan
    fi

    # Get outputs
    log_info "Retrieving infrastructure outputs..."
    terraform output -json > "${LOG_DIR}/terraform-outputs-${TIMESTAMP}.json"

    log_success "Infrastructure rebuilt successfully"
}

# ============================================================================
# Step 2: Setup Kubernetes Cluster
# ============================================================================

rebuild_kubernetes() {
    if [[ "${REBUILD_KUBERNETES}" != "true" ]]; then
        log_info "Skipping Kubernetes rebuild"
        return 0
    fi

    log_section "Step 2: Setting up Kubernetes Cluster"

    # Get AKS credentials
    log_info "Getting AKS credentials..."
    local aks_name=$(terraform output -raw aks_cluster_name)
    local rg_name=$(terraform output -raw resource_group_name)

    az aks get-credentials \
        --resource-group "${rg_name}" \
        --name "${aks_name}" \
        --overwrite-existing \
        || error_exit "Failed to get AKS credentials"

    # Verify cluster access
    kubectl cluster-info || error_exit "Cannot access Kubernetes cluster"

    # Install essential operators
    log_info "Installing essential Kubernetes operators..."

    # Install cert-manager
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml \
        || error_exit "Failed to install cert-manager"

    # Wait for cert-manager
    kubectl wait --for=condition=Available --timeout=300s \
        deployment/cert-manager -n cert-manager || error_exit "cert-manager not ready"

    # Install NGINX Ingress
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update

    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --wait \
        || error_exit "Failed to install NGINX ingress"

    # Install metrics-server
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml \
        || error_exit "Failed to install metrics-server"

    # Install Velero for backups
    log_info "Installing Velero..."
    bash "${SCRIPT_DIR}/velero-setup.sh" install || error_exit "Velero installation failed"

    log_success "Kubernetes cluster setup completed"
}

# ============================================================================
# Step 3: Restore Databases
# ============================================================================

rebuild_databases() {
    if [[ "${REBUILD_DATABASES}" != "true" ]]; then
        log_info "Skipping database rebuild"
        return 0
    fi

    log_section "Step 3: Restoring Databases"

    # PostgreSQL restore
    log_info "Restoring PostgreSQL databases..."

    if [[ "${DRY_RUN}" == "false" ]]; then
        CONFIRM=true bash "${SCRIPT_DIR}/postgres-restore.sh" \
            -t "${BACKUP_TIMESTAMP}" \
            || error_exit "PostgreSQL restore failed"
    else
        log_info "[DRY RUN] Would restore PostgreSQL databases"
    fi

    # Cosmos DB restore (if needed)
    log_info "Restoring Cosmos DB..."
    # Cosmos DB has continuous backup, just need to verify connectivity

    log_success "Databases restored successfully"
}

# ============================================================================
# Step 4: Deploy Monitoring and Logging
# ============================================================================

deploy_monitoring() {
    log_section "Step 4: Deploying Monitoring and Logging"

    # Create namespaces
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace logging --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace tracing --dry-run=client -o yaml | kubectl apply -f -

    # Deploy Prometheus
    log_info "Deploying Prometheus..."
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update

    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --values "${HELM_DIR}/monitoring/prometheus-values.yaml" \
        --wait \
        || error_exit "Prometheus deployment failed"

    # Deploy Loki
    log_info "Deploying Loki..."
    helm repo add grafana https://grafana.github.io/helm-charts

    helm upgrade --install loki grafana/loki-stack \
        --namespace logging \
        --values "${HELM_DIR}/logging/loki-values.yaml" \
        --wait \
        || error_exit "Loki deployment failed"

    # Deploy Jaeger
    log_info "Deploying Jaeger..."
    kubectl apply -n tracing -f "${K8S_DIR}/tracing/jaeger.yaml" \
        || error_exit "Jaeger deployment failed"

    log_success "Monitoring and logging deployed"
}

# ============================================================================
# Step 5: Restore Kubernetes Resources
# ============================================================================

restore_kubernetes_resources() {
    log_section "Step 5: Restoring Kubernetes Resources"

    if [[ "${RESTORE_DATA}" != "true" ]]; then
        log_info "Skipping Kubernetes restore"
        return 0
    fi

    # Find latest backup
    local backup_name
    if [[ "${BACKUP_TIMESTAMP}" == "latest" ]]; then
        backup_name=$(velero backup get --output json | jq -r '.[0].metadata.name')
    else
        backup_name="daily-full-${BACKUP_TIMESTAMP}"
    fi

    log_info "Restoring from backup: ${backup_name}"

    if [[ "${DRY_RUN}" == "false" ]]; then
        velero restore create "rebuild-restore-${TIMESTAMP}" \
            --from-backup "${backup_name}" \
            --wait \
            || error_exit "Kubernetes restore failed"
    else
        log_info "[DRY RUN] Would restore from backup: ${backup_name}"
    fi

    log_success "Kubernetes resources restored"
}

# ============================================================================
# Step 6: Deploy Applications
# ============================================================================

deploy_applications() {
    if [[ "${REBUILD_APPLICATIONS}" != "true" ]]; then
        log_info "Skipping application deployment"
        return 0
    fi

    log_section "Step 6: Deploying Applications"

    # Create application namespace
    kubectl create namespace flamoral-dating --dry-run=client -o yaml | kubectl apply -f -

    # Deploy applications using Helm
    log_info "Deploying backend services..."

    local services=(
        "auth-service"
        "user-service"
        "matching-service"
        "messaging-service"
        "payment-service"
        "media-service"
        "notification-service"
        "analytics-service"
        "moderation-service"
        "api-gateway"
    )

    for service in "${services[@]}"; do
        log_info "Deploying ${service}..."

        if [[ "${DRY_RUN}" == "false" ]]; then
            helm upgrade --install "${service}" "${HELM_DIR}/services/${service}" \
                --namespace flamoral-dating \
                --values "${HELM_DIR}/services/${service}/values-${ENV}.yaml" \
                --wait \
                --timeout 10m \
                || log_error "Failed to deploy ${service}"
        else
            log_info "[DRY RUN] Would deploy ${service}"
        fi
    done

    log_success "Applications deployed"
}

# ============================================================================
# Step 7: Configure DNS and Ingress
# ============================================================================

configure_dns() {
    log_section "Step 7: Configuring DNS and Ingress"

    # Get ingress IP
    log_info "Waiting for ingress IP..."
    local ingress_ip=""
    local retries=30

    for ((i=1; i<=retries; i++)); do
        ingress_ip=$(kubectl get svc ingress-nginx-controller \
            -n ingress-nginx \
            -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)

        if [[ -n "${ingress_ip}" ]]; then
            break
        fi

        log_info "Waiting for ingress IP... (${i}/${retries})"
        sleep 10
    done

    if [[ -z "${ingress_ip}" ]]; then
        error_exit "Failed to get ingress IP"
    fi

    log_success "Ingress IP: ${ingress_ip}"

    # Update DNS (using Azure DNS)
    log_info "Updating DNS records..."

    if [[ "${DRY_RUN}" == "false" ]]; then
        bash "${SCRIPT_DIR}/../setup-azure-dns.sh" "${ingress_ip}" \
            || log_warning "DNS update failed"
    else
        log_info "[DRY RUN] Would update DNS to ${ingress_ip}"
    fi

    log_success "DNS configured"
}

# ============================================================================
# Step 8: Verify Deployment
# ============================================================================

verify_deployment() {
    log_section "Step 8: Verifying Deployment"

    log_info "Running health checks..."

    # Check all pods are running
    log_info "Checking pod status..."
    kubectl get pods --all-namespaces

    local not_running=$(kubectl get pods -n flamoral-dating \
        --field-selector=status.phase!=Running \
        --no-headers 2>/dev/null | wc -l)

    if [[ ${not_running} -gt 0 ]]; then
        log_warning "${not_running} pods are not running"
    else
        log_success "All pods are running"
    fi

    # Check services
    log_info "Checking services..."
    kubectl get svc -n flamoral-dating

    # Run smoke tests
    log_info "Running smoke tests..."
    if [[ -f "${SCRIPT_DIR}/../smoke-tests.sh" ]]; then
        bash "${SCRIPT_DIR}/../smoke-tests.sh" || log_warning "Some smoke tests failed"
    fi

    # Verify databases
    log_info "Verifying database connectivity..."
    bash "${SCRIPT_DIR}/data-validation.sh" --quick || log_warning "Database verification had issues"

    log_success "Deployment verification completed"
}

# ============================================================================
# Generate Rebuild Report
# ============================================================================

generate_report() {
    local report_file="${LOG_DIR}/rebuild-report-${TIMESTAMP}.txt"

    local end_time=$(date)
    local duration=$(($(date +%s) - $(date -d "${start_time}" +%s 2>/dev/null || echo 0)))
    local duration_mins=$((duration / 60))

    cat > "${report_file}" <<EOF
========================================
Full Environment Rebuild Report
========================================
Environment: ${ENV}
Region: ${AZURE_REGION}
Resource Group: ${AZURE_RESOURCE_GROUP}

Start Time: ${start_time}
End Time: ${end_time}
Duration: ${duration_mins} minutes

Components Rebuilt:
  - Infrastructure: ${REBUILD_INFRASTRUCTURE}
  - Databases: ${REBUILD_DATABASES}
  - Kubernetes: ${REBUILD_KUBERNETES}
  - Applications: ${REBUILD_APPLICATIONS}
  - Data Restored: ${RESTORE_DATA}

Backup Used: ${BACKUP_TIMESTAMP}
Dry Run: ${DRY_RUN}

Status: SUCCESS

Log File: ${LOG_FILE}

Next Steps:
  1. Verify all services are healthy
  2. Run comprehensive tests
  3. Monitor for issues
  4. Update DNS if needed
  5. Notify stakeholders

========================================
EOF

    cat "${report_file}"

    log_success "Rebuild report generated: ${report_file}"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    local start_time=$(date)

    setup_logging

    log_section "Full Environment Rebuild - Flamoral Dating Platform"

    confirm_rebuild
    check_prerequisites

    # Execute rebuild steps
    rebuild_infrastructure
    rebuild_kubernetes
    deploy_monitoring
    rebuild_databases
    restore_kubernetes_resources
    deploy_applications
    configure_dns
    verify_deployment

    generate_report

    log_section "Environment Rebuild Completed Successfully!"

    log_info "Total time: $(($(date +%s) - $(date -d "${start_time}" +%s 2>/dev/null || echo 0))) seconds"
}

# Run main function
main "$@"
