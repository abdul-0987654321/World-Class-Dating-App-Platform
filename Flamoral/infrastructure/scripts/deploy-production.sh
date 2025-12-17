#!/bin/bash
# =============================================================================
# Flamoral Production Deployment Orchestration Script
# =============================================================================
# This master script orchestrates the complete production deployment process
# in the correct order with validation, error handling, and rollback capability.
# =============================================================================
# Author: Flamoral DevOps Team
# Version: 1.0.0
# Date: 2025-12-13
# =============================================================================

set -eo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$INFRA_DIR")"
LOG_DIR="${INFRA_DIR}/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/deployment_${TIMESTAMP}.log"
STATUS_FILE="${SCRIPT_DIR}/deployment-status.json"

# Azure Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
AKS_CLUSTER="${AKS_CLUSTER:-flamoral-prod-aks}"
ACR_NAME="${ACR_NAME:-flamoralacr}"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-flamoral-prod-kv}"
NAMESPACE="${NAMESPACE:-flamoral}"

# DNS Configuration
DOMAIN_NAME="${DOMAIN_NAME:-flamoral.com}"
TARGET_IP="${TARGET_IP:-48.200.65.15}"

# Front Door Configuration
FRONTDOOR_PROFILE="${FRONTDOOR_PROFILE:-flamoral-prod-afd}"
FRONTDOOR_ENDPOINT="${FRONTDOOR_ENDPOINT:-flamoral-prod}"

# Deployment Options
DRY_RUN=false
SKIP_DNS=false
SKIP_VALIDATION=false
SPECIFIC_STEP=""
ROLLBACK_ON_FAILURE=true
VERBOSE=false

# =============================================================================
# Color Codes for Output
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================
setup_logging() {
    mkdir -p "$LOG_DIR"
    touch "$LOG_FILE"
    echo "=========================================" | tee -a "$LOG_FILE"
    echo "Flamoral Production Deployment" | tee -a "$LOG_FILE"
    echo "Started: $(date)" | tee -a "$LOG_FILE"
    echo "=========================================" | tee -a "$LOG_FILE"
}

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" >> "$LOG_FILE"
}

log_info() {
    log "INFO" "$@"
    echo -e "${CYAN}[INFO]${NC} $@"
}

log_success() {
    log "SUCCESS" "$@"
    echo -e "${GREEN}[SUCCESS]${NC} $@"
}

log_warning() {
    log "WARNING" "$@"
    echo -e "${YELLOW}[WARNING]${NC} $@"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $@"
}

log_step() {
    local step_num=$1
    local step_name=$2
    echo ""
    echo -e "${MAGENTA}=========================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}STEP ${step_num}: ${step_name}${NC}" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}=========================================${NC}" | tee -a "$LOG_FILE"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        log "VERBOSE" "$@"
        echo -e "${GRAY}[VERBOSE]${NC} $@"
    fi
}

# =============================================================================
# Status Tracking Functions
# =============================================================================
init_status_file() {
    cat > "$STATUS_FILE" <<EOF
{
  "deployment_id": "${TIMESTAMP}",
  "started_at": "$(date -Iseconds)",
  "status": "in_progress",
  "steps": {
    "dns_deployment": {"status": "pending", "started_at": null, "completed_at": null, "error": null},
    "namespace_setup": {"status": "pending", "started_at": null, "completed_at": null, "error": null},
    "external_secrets": {"status": "pending", "started_at": null, "completed_at": null, "error": null},
    "tls_certificate": {"status": "pending", "started_at": null, "completed_at": null, "error": null},
    "frontdoor_routes": {"status": "pending", "started_at": null, "completed_at": null, "error": null},
    "verification": {"status": "pending", "started_at": null, "completed_at": null, "error": null}
  },
  "completed_at": null,
  "rollback_performed": false
}
EOF
    log_info "Status tracker initialized: $STATUS_FILE"
}

update_step_status() {
    local step=$1
    local status=$2
    local error_msg="${3:-null}"

    local timestamp=$(date -Iseconds)

    if [ "$status" = "in_progress" ]; then
        jq ".steps.${step}.status = \"in_progress\" | .steps.${step}.started_at = \"${timestamp}\"" "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    elif [ "$status" = "completed" ]; then
        jq ".steps.${step}.status = \"completed\" | .steps.${step}.completed_at = \"${timestamp}\"" "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    elif [ "$status" = "failed" ]; then
        if [ "$error_msg" != "null" ]; then
            jq ".steps.${step}.status = \"failed\" | .steps.${step}.error = \"${error_msg}\" | .steps.${step}.completed_at = \"${timestamp}\"" "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
        else
            jq ".steps.${step}.status = \"failed\" | .steps.${step}.completed_at = \"${timestamp}\"" "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
        fi
    fi
}

mark_deployment_complete() {
    local status=$1
    local timestamp=$(date -Iseconds)
    jq ".status = \"${status}\" | .completed_at = \"${timestamp}\"" "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
}

# =============================================================================
# Validation Functions
# =============================================================================
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_tools=()

    # Check required tools
    command -v az >/dev/null 2>&1 || missing_tools+=("azure-cli")
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    command -v dig >/dev/null 2>&1 || missing_tools+=("dig")
    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install missing tools before proceeding"
        return 1
    fi

    # Check Azure CLI authentication
    if ! az account show >/dev/null 2>&1; then
        log_error "Not authenticated with Azure CLI"
        log_error "Please run: az login"
        return 1
    fi

    local account=$(az account show --query user.name -o tsv)
    log_success "Azure CLI authenticated as: $account"

    # Check kubectl context
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "kubectl is not configured or cluster is not accessible"
        log_error "Please configure kubectl with: az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER"
        return 1
    fi

    local context=$(kubectl config current-context)
    log_success "kubectl configured with context: $context"

    log_success "All prerequisites met"
    return 0
}

verify_azure_resources() {
    log_info "Verifying Azure resources..."

    # Check Resource Group
    if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
        log_error "Resource group $RESOURCE_GROUP does not exist"
        return 1
    fi
    log_verbose "Resource group verified: $RESOURCE_GROUP"

    # Check AKS Cluster
    if ! az aks show --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" >/dev/null 2>&1; then
        log_error "AKS cluster $AKS_CLUSTER does not exist"
        return 1
    fi
    log_verbose "AKS cluster verified: $AKS_CLUSTER"

    # Check ACR
    if ! az acr show --name "$ACR_NAME" >/dev/null 2>&1; then
        log_warning "ACR $ACR_NAME does not exist (may be created during deployment)"
    else
        log_verbose "ACR verified: $ACR_NAME"
    fi

    # Check Key Vault
    if ! az keyvault show --name "$KEY_VAULT_NAME" >/dev/null 2>&1; then
        log_error "Key Vault $KEY_VAULT_NAME does not exist"
        return 1
    fi
    log_verbose "Key Vault verified: $KEY_VAULT_NAME"

    log_success "Azure resources verified"
    return 0
}

verify_keyvault_secrets() {
    log_info "Verifying Key Vault secrets..."

    local required_secrets=(
        "database-password"
        "jwt-secret"
        "jwt-access-secret"
        "jwt-refresh-secret"
        "stripe-secret-key"
    )

    local missing_secrets=()

    for secret in "${required_secrets[@]}"; do
        if ! az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret" >/dev/null 2>&1; then
            missing_secrets+=("$secret")
        fi
    done

    if [ ${#missing_secrets[@]} -ne 0 ]; then
        log_error "Missing required secrets in Key Vault: ${missing_secrets[*]}"
        return 1
    fi

    log_success "All required secrets present in Key Vault"
    return 0
}

# =============================================================================
# DNS Deployment Functions
# =============================================================================
wait_for_dns_propagation() {
    local domain=$1
    local expected_ip=$2
    local max_attempts=30
    local attempt=1

    log_info "Waiting for DNS propagation for $domain..."
    log_info "Expected IP: $expected_ip"

    while [ $attempt -le $max_attempts ]; do
        log_verbose "DNS check attempt $attempt of $max_attempts"

        # Try to resolve the domain
        local resolved_ip=$(dig +short "$domain" @8.8.8.8 | tail -n1)

        if [ -n "$resolved_ip" ] && [ "$resolved_ip" = "$expected_ip" ]; then
            log_success "DNS propagated successfully for $domain → $resolved_ip"
            return 0
        fi

        log_verbose "DNS not yet propagated (got: $resolved_ip, expected: $expected_ip)"
        log_info "Waiting 60 seconds before next check... ($attempt/$max_attempts)"
        sleep 60
        ((attempt++))
    done

    log_warning "DNS propagation timeout after $max_attempts attempts"
    log_warning "This may be normal - DNS can take up to 48 hours to fully propagate"
    return 1
}

deploy_dns() {
    log_step 1 "DNS Deployment"
    update_step_status "dns_deployment" "in_progress"

    if [ "$SKIP_DNS" = true ]; then
        log_warning "Skipping DNS deployment (--skip-dns flag)"
        update_step_status "dns_deployment" "completed"
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy DNS for $DOMAIN_NAME to IP $TARGET_IP"
        update_step_status "dns_deployment" "completed"
        return 0
    fi

    local dns_script="${INFRA_DIR}/dns/configure-dns.sh"

    if [ ! -f "$dns_script" ]; then
        log_error "DNS script not found: $dns_script"
        update_step_status "dns_deployment" "failed" "DNS script not found"
        return 1
    fi

    log_info "Executing DNS configuration script..."
    if bash "$dns_script"; then
        log_success "DNS configuration completed"

        # Wait for DNS propagation
        log_info "Checking DNS propagation (this may take time)..."
        wait_for_dns_propagation "$DOMAIN_NAME" "$TARGET_IP" || true
        wait_for_dns_propagation "www.$DOMAIN_NAME" "$TARGET_IP" || true
        wait_for_dns_propagation "api.$DOMAIN_NAME" "$TARGET_IP" || true

        update_step_status "dns_deployment" "completed"
        return 0
    else
        log_error "DNS configuration failed"
        update_step_status "dns_deployment" "failed" "DNS script execution failed"
        return 1
    fi
}

# =============================================================================
# Kubernetes Setup Functions
# =============================================================================
deploy_namespace_and_configs() {
    log_step 2 "Kubernetes Namespace and Configurations"
    update_step_status "namespace_setup" "in_progress"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would create namespace: $NAMESPACE"
        update_step_status "namespace_setup" "completed"
        return 0
    fi

    # Create namespace
    log_info "Creating namespace: $NAMESPACE"
    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        log_success "Namespace created: $NAMESPACE"
    fi

    # Label namespace
    kubectl label namespace "$NAMESPACE" environment=production --overwrite
    kubectl label namespace "$NAMESPACE" managed-by=flamoral-deploy --overwrite

    # Apply ConfigMaps
    log_info "Applying ConfigMaps..."
    local configmap_dir="${INFRA_DIR}/kubernetes/configmaps"
    if [ -d "$configmap_dir" ]; then
        kubectl apply -f "$configmap_dir" -n "$NAMESPACE" || log_warning "No ConfigMaps found or error applying"
    fi

    update_step_status "namespace_setup" "completed"
    log_success "Namespace and configurations deployed"
    return 0
}

# =============================================================================
# External Secrets Functions
# =============================================================================
deploy_external_secrets() {
    log_step 3 "External Secrets Operator"
    update_step_status "external_secrets" "in_progress"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy External Secrets"
        update_step_status "external_secrets" "completed"
        return 0
    fi

    # Check if External Secrets Operator is installed
    log_info "Checking External Secrets Operator installation..."
    if ! kubectl get deployment -n external-secrets external-secrets >/dev/null 2>&1; then
        log_info "Installing External Secrets Operator..."
        helm repo add external-secrets https://charts.external-secrets.io
        helm repo update
        helm install external-secrets \
            external-secrets/external-secrets \
            -n external-secrets \
            --create-namespace \
            --set installCRDs=true

        # Wait for operator to be ready
        kubectl wait --for=condition=available --timeout=300s \
            deployment/external-secrets -n external-secrets
        log_success "External Secrets Operator installed"
    else
        log_info "External Secrets Operator already installed"
    fi

    # Deploy SecretProviderClass
    log_info "Deploying Azure Key Vault SecretProviderClass..."
    local secret_provider="${INFRA_DIR}/kubernetes/secrets/azure-keyvault-secretprovider.yaml"

    if [ -f "$secret_provider" ]; then
        # Replace environment variables in template
        sed -e "s/\${ENVIRONMENT}/production/g" \
            -e "s/\${KEY_VAULT_NAME}/${KEY_VAULT_NAME}/g" \
            -e "s/\${AZURE_TENANT_ID}/$(az account show --query tenantId -o tsv)/g" \
            -e "s/\${AZURE_CLIENT_ID}/$(az aks show -g $RESOURCE_GROUP -n $AKS_CLUSTER --query identityProfile.kubeletidentity.clientId -o tsv)/g" \
            "$secret_provider" | kubectl apply -f - -n "$NAMESPACE"

        log_success "SecretProviderClass deployed"
    else
        log_warning "SecretProviderClass file not found: $secret_provider"
    fi

    update_step_status "external_secrets" "completed"
    log_success "External Secrets deployed"
    return 0
}

# =============================================================================
# TLS Certificate Functions
# =============================================================================
deploy_tls_certificate() {
    log_step 4 "TLS Certificate (Let's Encrypt)"
    update_step_status "tls_certificate" "in_progress"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy TLS certificate"
        update_step_status "tls_certificate" "completed"
        return 0
    fi

    # Check if cert-manager is installed
    log_info "Checking cert-manager installation..."
    if ! kubectl get namespace cert-manager >/dev/null 2>&1; then
        log_info "Installing cert-manager..."
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

        # Wait for cert-manager to be ready
        kubectl wait --for=condition=available --timeout=300s \
            deployment/cert-manager -n cert-manager
        kubectl wait --for=condition=available --timeout=300s \
            deployment/cert-manager-webhook -n cert-manager
        kubectl wait --for=condition=available --timeout=300s \
            deployment/cert-manager-cainjector -n cert-manager

        log_success "cert-manager installed"
    else
        log_info "cert-manager already installed"
    fi

    # Deploy ClusterIssuer
    log_info "Deploying Let's Encrypt ClusterIssuer..."
    local issuer_file="${PROJECT_ROOT}/../letsencrypt-prod-issuer.yaml"

    if [ -f "$issuer_file" ]; then
        kubectl apply -f "$issuer_file"
        log_success "ClusterIssuer deployed"
    else
        log_warning "ClusterIssuer file not found: $issuer_file"
    fi

    # Deploy Ingress with TLS
    log_info "Deploying Ingress with TLS..."
    local ingress_file="${PROJECT_ROOT}/../flamoral-ingress-tls.yaml"

    if [ -f "$ingress_file" ]; then
        kubectl apply -f "$ingress_file" -n "$NAMESPACE"
        log_success "Ingress with TLS deployed"

        # Wait for certificate to be issued
        log_info "Waiting for certificate to be issued (this may take a few minutes)..."
        local max_wait=300
        local waited=0
        while [ $waited -lt $max_wait ]; do
            if kubectl get certificate flamoral-tls -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null | grep -q "True"; then
                log_success "TLS certificate issued successfully"
                break
            fi
            sleep 10
            ((waited+=10))
            log_verbose "Waiting for certificate... ($waited/$max_wait seconds)"
        done

        if [ $waited -ge $max_wait ]; then
            log_warning "Certificate issuance timeout - check status manually with: kubectl describe certificate flamoral-tls -n $NAMESPACE"
        fi
    else
        log_warning "Ingress file not found: $ingress_file"
    fi

    update_step_status "tls_certificate" "completed"
    log_success "TLS certificate deployed"
    return 0
}

# =============================================================================
# Front Door Functions
# =============================================================================
deploy_frontdoor_routes() {
    log_step 5 "Azure Front Door Routing Rules"
    update_step_status "frontdoor_routes" "in_progress"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy Front Door routes"
        update_step_status "frontdoor_routes" "completed"
        return 0
    fi

    local frontdoor_script="${INFRA_DIR}/azure/deploy-frontdoor-routes.sh"

    if [ ! -f "$frontdoor_script" ]; then
        log_error "Front Door script not found: $frontdoor_script"
        update_step_status "frontdoor_routes" "failed" "Front Door script not found"
        return 1
    fi

    log_info "Executing Front Door routing deployment..."
    if bash "$frontdoor_script"; then
        log_success "Front Door routes deployed"
        update_step_status "frontdoor_routes" "completed"
        return 0
    else
        log_error "Front Door deployment failed"
        update_step_status "frontdoor_routes" "failed" "Front Door script execution failed"
        return 1
    fi
}

# =============================================================================
# Verification Functions
# =============================================================================
verify_deployment() {
    log_step 6 "Deployment Verification"
    update_step_status "verification" "in_progress"

    local verification_failed=false

    # Check namespace
    log_info "Verifying namespace..."
    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_success "Namespace exists: $NAMESPACE"
    else
        log_error "Namespace not found: $NAMESPACE"
        verification_failed=true
    fi

    # Check pods
    log_info "Checking pod status..."
    local pod_count=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    log_info "Found $pod_count pods in namespace $NAMESPACE"

    if [ "$pod_count" -gt 0 ]; then
        kubectl get pods -n "$NAMESPACE" -o wide
    fi

    # Check services
    log_info "Checking services..."
    local svc_count=$(kubectl get services -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    log_info "Found $svc_count services in namespace $NAMESPACE"

    if [ "$svc_count" -gt 0 ]; then
        kubectl get services -n "$NAMESPACE"
    fi

    # Check ingress
    log_info "Checking ingress..."
    if kubectl get ingress -n "$NAMESPACE" >/dev/null 2>&1; then
        kubectl get ingress -n "$NAMESPACE"
        log_success "Ingress configured"
    else
        log_warning "No ingress found in namespace"
    fi

    # Check TLS certificate
    log_info "Checking TLS certificate..."
    if kubectl get certificate -n "$NAMESPACE" >/dev/null 2>&1; then
        kubectl get certificate -n "$NAMESPACE"
        log_success "TLS certificates found"
    else
        log_warning "No TLS certificates found"
    fi

    # DNS verification
    if [ "$SKIP_DNS" != true ]; then
        log_info "Verifying DNS resolution..."
        for subdomain in "" "www." "api." "admin."; do
            local fqdn="${subdomain}${DOMAIN_NAME}"
            local ip=$(dig +short "$fqdn" @8.8.8.8 | tail -n1)
            if [ -n "$ip" ]; then
                log_success "DNS resolved: $fqdn → $ip"
            else
                log_warning "DNS not resolved: $fqdn"
            fi
        done
    fi

    # Health check
    log_info "Performing health checks..."
    if curl -sf "https://api.${DOMAIN_NAME}/health" >/dev/null 2>&1; then
        log_success "API health check passed"
    else
        log_warning "API health check failed (this may be normal if services are still starting)"
    fi

    if [ "$verification_failed" = true ]; then
        update_step_status "verification" "failed" "Verification checks failed"
        return 1
    else
        update_step_status "verification" "completed"
        log_success "Deployment verification completed"
        return 0
    fi
}

# =============================================================================
# Rollback Functions
# =============================================================================
perform_rollback() {
    log_error "Deployment failed - initiating rollback..."

    if [ "$ROLLBACK_ON_FAILURE" != true ]; then
        log_warning "Rollback disabled (--no-rollback flag)"
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would perform rollback"
        return 0
    fi

    log_warning "Rolling back changes..."

    # Mark rollback in status
    jq '.rollback_performed = true' "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"

    # Delete namespace (this removes all resources)
    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_info "Deleting namespace: $NAMESPACE"
        kubectl delete namespace "$NAMESPACE" --timeout=120s || log_warning "Failed to delete namespace"
    fi

    log_warning "Rollback completed - please review logs at: $LOG_FILE"
}

# =============================================================================
# Help and Usage
# =============================================================================
show_usage() {
    cat <<EOF
Flamoral Production Deployment Orchestration Script

Usage: $0 [OPTIONS]

Options:
    --dry-run              Perform a dry run without making actual changes
    --skip-dns             Skip DNS deployment step
    --skip-validation      Skip pre-deployment validation
    --step STEP_NAME       Run only a specific step (dns, namespace, secrets, tls, frontdoor, verify)
    --no-rollback          Disable automatic rollback on failure
    --verbose              Enable verbose logging
    -h, --help             Show this help message

Environment Variables:
    RESOURCE_GROUP         Azure resource group (default: flamoral-prod-rg)
    AKS_CLUSTER            AKS cluster name (default: flamoral-prod-aks)
    NAMESPACE              Kubernetes namespace (default: flamoral)
    DOMAIN_NAME            Domain name (default: flamoral.com)
    TARGET_IP              Target IP for DNS (default: 48.200.65.15)

Examples:
    # Full deployment
    $0

    # Dry run to see what would happen
    $0 --dry-run

    # Skip DNS if already configured
    $0 --skip-dns

    # Run only TLS certificate step
    $0 --step tls

    # Verbose output
    $0 --verbose

Deployment Steps:
    1. DNS Deployment (configure-dns.sh)
    2. Namespace and Configs (kubectl create namespace)
    3. External Secrets (Azure Key Vault integration)
    4. TLS Certificate (cert-manager + Let's Encrypt)
    5. Front Door Routes (deploy-frontdoor-routes.sh)
    6. Verification (health checks and validation)

Logs:
    Deployment log: $LOG_FILE
    Status tracker: $STATUS_FILE

EOF
}

# =============================================================================
# Main Deployment Flow
# =============================================================================
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-dns)
                SKIP_DNS=true
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --step)
                SPECIFIC_STEP="$2"
                shift 2
                ;;
            --no-rollback)
                ROLLBACK_ON_FAILURE=false
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Setup
    setup_logging
    init_status_file

    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${WHITE}Flamoral Production Deployment Orchestration${NC}              ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi

    # Pre-deployment validation
    if [ "$SKIP_VALIDATION" != true ]; then
        log_info "Running pre-deployment checks..."
        if ! check_prerequisites; then
            log_error "Prerequisites check failed"
            exit 1
        fi

        if ! verify_azure_resources; then
            log_error "Azure resources verification failed"
            exit 1
        fi

        if ! verify_keyvault_secrets; then
            log_error "Key Vault secrets verification failed"
            exit 1
        fi
    fi

    # Execute deployment steps
    local failed=false

    if [ -n "$SPECIFIC_STEP" ]; then
        log_info "Running specific step: $SPECIFIC_STEP"
        case "$SPECIFIC_STEP" in
            dns)
                deploy_dns || failed=true
                ;;
            namespace)
                deploy_namespace_and_configs || failed=true
                ;;
            secrets)
                deploy_external_secrets || failed=true
                ;;
            tls)
                deploy_tls_certificate || failed=true
                ;;
            frontdoor)
                deploy_frontdoor_routes || failed=true
                ;;
            verify)
                verify_deployment || failed=true
                ;;
            *)
                log_error "Unknown step: $SPECIFIC_STEP"
                log_error "Valid steps: dns, namespace, secrets, tls, frontdoor, verify"
                exit 1
                ;;
        esac
    else
        # Run all steps in order
        deploy_dns || failed=true
        [ "$failed" = false ] && deploy_namespace_and_configs || failed=true
        [ "$failed" = false ] && deploy_external_secrets || failed=true
        [ "$failed" = false ] && deploy_tls_certificate || failed=true
        [ "$failed" = false ] && deploy_frontdoor_routes || failed=true
        [ "$failed" = false ] && verify_deployment || failed=true
    fi

    # Handle deployment result
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    if [ "$failed" = true ]; then
        log_error "Deployment failed!"
        mark_deployment_complete "failed"
        perform_rollback
        echo -e "${CYAN}=========================================${NC}"
        log_error "Deployment failed - check logs at: $LOG_FILE"
        exit 1
    else
        log_success "Deployment completed successfully!"
        mark_deployment_complete "completed"
        echo -e "${CYAN}=========================================${NC}"
        echo ""
        log_success "All deployment steps completed successfully"
        log_info "Deployment log: $LOG_FILE"
        log_info "Status tracker: $STATUS_FILE"
        echo ""
        log_info "Your application should now be accessible at:"
        echo -e "  ${WHITE}https://${DOMAIN_NAME}${NC}"
        echo -e "  ${WHITE}https://www.${DOMAIN_NAME}${NC}"
        echo -e "  ${WHITE}https://api.${DOMAIN_NAME}${NC}"
        echo ""
    fi
}

# Execute main function
main "$@"
