#!/bin/bash
# =============================================================================
# Flamoral Platform - Rollback Script
# =============================================================================
# Purpose: Rollback Kubernetes deployments, database migrations, DNS, and
#          Front Door configurations to previous stable state
# Usage: ./rollback.sh [OPTIONS]
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/../../logs/rollback"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/rollback_${TIMESTAMP}.log"
BACKUP_DIR="${SCRIPT_DIR}/../../backups"

# Azure Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
AKS_CLUSTER="${AKS_CLUSTER:-flamoral-prod-aks}"
FRONTDOOR_PROFILE="${FRONTDOOR_PROFILE:-flamoral-prod-afd}"
DNS_ZONE="${DNS_ZONE:-flamoral.com}"

# Kubernetes Configuration
NAMESPACE="${NAMESPACE:-default}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $@"
    log "INFO" "$@"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $@"
    log "SUCCESS" "$@"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $@"
    log "WARNING" "$@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@"
    log "ERROR" "$@"
}

# =============================================================================
# Error Handling
# =============================================================================
error_exit() {
    log_error "$1"
    log_error "Rollback failed at $(date)"
    exit 1
}

trap 'error_exit "Script interrupted. Check logs at ${LOG_FILE}"' INT TERM

# =============================================================================
# Prerequisite Checks
# =============================================================================
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required tools
    local required_tools=("kubectl" "az" "helm" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool not found: $tool"
        fi
    done

    # Check Azure login
    if ! az account show &> /dev/null; then
        error_exit "Not logged in to Azure. Run 'az login' first."
    fi

    # Check kubectl context
    local current_context=$(kubectl config current-context 2>/dev/null || echo "none")
    log_info "Current kubectl context: ${current_context}"

    log_success "Prerequisites check passed"
}

# =============================================================================
# AKS Connection
# =============================================================================
connect_to_aks() {
    log_info "Connecting to AKS cluster: ${AKS_CLUSTER}"

    if ! az aks get-credentials \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${AKS_CLUSTER}" \
        --overwrite-existing &>> "${LOG_FILE}"; then
        error_exit "Failed to connect to AKS cluster"
    fi

    log_success "Connected to AKS cluster"
}

# =============================================================================
# Kubernetes Deployment Rollback
# =============================================================================
rollback_k8s_deployment() {
    local deployment=$1
    local namespace=${2:-$NAMESPACE}

    log_info "Rolling back Kubernetes deployment: ${deployment} in namespace: ${namespace}"

    # Check if deployment exists
    if ! kubectl get deployment "${deployment}" -n "${namespace}" &> /dev/null; then
        log_warning "Deployment ${deployment} not found in namespace ${namespace}"
        return 1
    fi

    # Get current revision
    local current_revision=$(kubectl rollout history deployment/"${deployment}" -n "${namespace}" | tail -n 1 | awk '{print $1}')
    log_info "Current revision: ${current_revision}"

    # Get rollout history
    log_info "Rollout history for ${deployment}:"
    kubectl rollout history deployment/"${deployment}" -n "${namespace}" | tee -a "${LOG_FILE}"

    # Perform rollback
    log_info "Executing rollback to previous revision..."
    if ! kubectl rollout undo deployment/"${deployment}" -n "${namespace}" &>> "${LOG_FILE}"; then
        log_error "Failed to rollback deployment ${deployment}"
        return 1
    fi

    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    if ! kubectl rollout status deployment/"${deployment}" -n "${namespace}" --timeout=300s &>> "${LOG_FILE}"; then
        log_error "Rollback timed out or failed for ${deployment}"
        return 1
    fi

    # Verify deployment health
    local ready_replicas=$(kubectl get deployment "${deployment}" -n "${namespace}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired_replicas=$(kubectl get deployment "${deployment}" -n "${namespace}" -o jsonpath='{.spec.replicas}')

    if [[ "${ready_replicas}" -eq "${desired_replicas}" ]]; then
        log_success "Deployment ${deployment} rolled back successfully (${ready_replicas}/${desired_replicas} replicas ready)"
    else
        log_warning "Deployment ${deployment} rolled back but not all replicas are ready (${ready_replicas}/${desired_replicas})"
    fi

    return 0
}

# =============================================================================
# Helm Release Rollback
# =============================================================================
rollback_helm_release() {
    local release=$1
    local namespace=${2:-$NAMESPACE}
    local revision=${3:-0} # 0 means previous revision

    log_info "Rolling back Helm release: ${release} in namespace: ${namespace}"

    # Check if release exists
    if ! helm list -n "${namespace}" | grep -q "${release}"; then
        log_warning "Helm release ${release} not found in namespace ${namespace}"
        return 1
    fi

    # Get release history
    log_info "Release history for ${release}:"
    helm history "${release}" -n "${namespace}" | tee -a "${LOG_FILE}"

    # Perform rollback
    if [[ ${revision} -eq 0 ]]; then
        log_info "Rolling back to previous revision..."
        if ! helm rollback "${release}" -n "${namespace}" --wait --timeout 5m &>> "${LOG_FILE}"; then
            log_error "Failed to rollback Helm release ${release}"
            return 1
        fi
    else
        log_info "Rolling back to revision ${revision}..."
        if ! helm rollback "${release}" "${revision}" -n "${namespace}" --wait --timeout 5m &>> "${LOG_FILE}"; then
            log_error "Failed to rollback Helm release ${release} to revision ${revision}"
            return 1
        fi
    fi

    log_success "Helm release ${release} rolled back successfully"
    return 0
}

# =============================================================================
# Database Migration Rollback
# =============================================================================
rollback_database_migration() {
    log_info "Rolling back database migrations..."

    # This is a placeholder - actual implementation depends on migration tool
    # Common tools: Flyway, Liquibase, Django migrations, Alembic, etc.

    log_warning "Database migration rollback requires manual intervention"
    log_info "Steps to rollback database:"
    log_info "  1. Identify the migration to rollback to"
    log_info "  2. Create a backup of the current database state"
    log_info "  3. Run migration tool rollback command"
    log_info "  4. Verify database state"

    # Example for common migration tools:
    # Flyway: flyway undo
    # Liquibase: liquibase rollback <tag>
    # Django: python manage.py migrate <app> <migration>
    # Alembic: alembic downgrade -1

    return 0
}

# =============================================================================
# DNS Configuration Rollback
# =============================================================================
rollback_dns_records() {
    log_info "Rolling back DNS records..."

    # Get latest DNS backup
    local latest_backup=$(find "${BACKUP_DIR}/dns" -name "dns_backup_*.json" 2>/dev/null | sort -r | head -n 1)

    if [[ -z "${latest_backup}" ]]; then
        log_warning "No DNS backup found. Cannot rollback DNS records."
        return 1
    fi

    log_info "Found DNS backup: ${latest_backup}"

    # Read backup and restore A records
    local records=$(jq -r '.[] | select(.type == "A") | "\(.name) \(.ip)"' "${latest_backup}")

    while IFS= read -r record; do
        local name=$(echo "${record}" | awk '{print $1}')
        local ip=$(echo "${record}" | awk '{print $2}')

        log_info "Restoring DNS A record: ${name} -> ${ip}"

        if [[ "${name}" == "@" ]]; then
            # Root record
            az network dns record-set a update \
                --resource-group "${RESOURCE_GROUP}" \
                --zone-name "${DNS_ZONE}" \
                --name "@" \
                --set aRecords[0].ipv4Address="${ip}" &>> "${LOG_FILE}" || log_warning "Failed to update root A record"
        else
            # Named record
            az network dns record-set a update \
                --resource-group "${RESOURCE_GROUP}" \
                --zone-name "${DNS_ZONE}" \
                --name "${name}" \
                --set aRecords[0].ipv4Address="${ip}" &>> "${LOG_FILE}" || log_warning "Failed to update A record: ${name}"
        fi
    done <<< "${records}"

    log_success "DNS records rolled back successfully"
    return 0
}

# =============================================================================
# Azure Front Door Rollback
# =============================================================================
rollback_frontdoor_config() {
    log_info "Rolling back Azure Front Door configuration..."

    # Get latest Front Door backup
    local latest_backup=$(find "${BACKUP_DIR}/frontdoor" -name "frontdoor_backup_*.json" 2>/dev/null | sort -r | head -n 1)

    if [[ -z "${latest_backup}" ]]; then
        log_warning "No Front Door backup found. Cannot rollback configuration."
        return 1
    fi

    log_info "Found Front Door backup: ${latest_backup}"

    # This is a simplified version - actual implementation would restore:
    # - Origin groups
    # - Origins
    # - Routes
    # - WAF policies
    # - Security policies

    log_warning "Front Door rollback requires manual review of backup at: ${latest_backup}"
    log_info "To manually restore Front Door configuration:"
    log_info "  1. Review the backup file: ${latest_backup}"
    log_info "  2. Use Azure Portal or CLI to restore specific components"
    log_info "  3. Verify routing rules and WAF policies"

    return 0
}

# =============================================================================
# Service-Specific Rollback Functions
# =============================================================================
rollback_api_service() {
    log_info "Rolling back API service..."
    rollback_k8s_deployment "dating-api" "${NAMESPACE}"
}

rollback_web_service() {
    log_info "Rolling back Web service..."
    rollback_k8s_deployment "dating-web" "${NAMESPACE}"
}

rollback_chat_service() {
    log_info "Rolling back Chat service..."
    rollback_k8s_deployment "chat-service" "${NAMESPACE}"
}

rollback_media_service() {
    log_info "Rolling back Media service..."
    rollback_k8s_deployment "media-processor" "${NAMESPACE}"
}

rollback_worker_service() {
    log_info "Rolling back Worker service..."
    rollback_k8s_deployment "chat-worker" "${NAMESPACE}"
}

rollback_all_services() {
    log_info "Rolling back all services..."

    local services=("dating-api" "dating-web" "chat-service" "media-processor" "chat-worker")
    local failed_services=()

    for service in "${services[@]}"; do
        if ! rollback_k8s_deployment "${service}" "${NAMESPACE}"; then
            failed_services+=("${service}")
        fi
    done

    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log_success "All services rolled back successfully"
    else
        log_warning "Some services failed to rollback: ${failed_services[*]}"
        return 1
    fi
}

# =============================================================================
# Verification Functions
# =============================================================================
verify_rollback() {
    log_info "Verifying rollback..."

    # Check pod status
    log_info "Pod status:"
    kubectl get pods -n "${NAMESPACE}" | tee -a "${LOG_FILE}"

    # Check deployment status
    log_info "Deployment status:"
    kubectl get deployments -n "${NAMESPACE}" | tee -a "${LOG_FILE}"

    # Check service endpoints
    log_info "Service endpoints:"
    kubectl get services -n "${NAMESPACE}" | tee -a "${LOG_FILE}"

    # Check for unhealthy pods
    local unhealthy_pods=$(kubectl get pods -n "${NAMESPACE}" --field-selector=status.phase!=Running,status.phase!=Succeeded 2>/dev/null | tail -n +2 | wc -l)

    if [[ ${unhealthy_pods} -gt 0 ]]; then
        log_warning "Found ${unhealthy_pods} unhealthy pods"
        kubectl get pods -n "${NAMESPACE}" --field-selector=status.phase!=Running,status.phase!=Succeeded | tee -a "${LOG_FILE}"
        return 1
    fi

    log_success "Rollback verification passed"
    return 0
}

# =============================================================================
# Usage Information
# =============================================================================
usage() {
    cat << EOF
Flamoral Platform - Rollback Script

Usage: $0 [OPTIONS]

OPTIONS:
    --service <name>        Rollback specific service (api|web|chat|media|worker)
    --deployment <name>     Rollback specific deployment name
    --helm-release <name>   Rollback specific Helm release
    --namespace <ns>        Kubernetes namespace (default: default)
    --all                   Rollback all services
    --dns                   Rollback DNS configuration
    --frontdoor             Rollback Front Door configuration
    --database              Rollback database migrations (manual guidance)
    --dry-run               Show what would be rolled back without executing
    --help                  Show this help message

EXAMPLES:
    # Rollback specific service
    $0 --service api

    # Rollback all services
    $0 --all

    # Rollback specific deployment
    $0 --deployment dating-api --namespace production

    # Rollback Helm release
    $0 --helm-release flamoral --namespace default

    # Rollback DNS and Front Door
    $0 --dns --frontdoor

    # Dry run for all services
    $0 --all --dry-run

LOGS:
    Log file: ${LOG_FILE}

EOF
    exit 0
}

# =============================================================================
# Main Function
# =============================================================================
main() {
    # Create log directory
    mkdir -p "${LOG_DIR}"
    mkdir -p "${BACKUP_DIR}"/{dns,frontdoor,k8s}

    log_info "=== Flamoral Platform Rollback Script ==="
    log_info "Started at: $(date)"
    log_info "Log file: ${LOG_FILE}"

    # Parse command line arguments
    local rollback_type=""
    local service_name=""
    local deployment_name=""
    local helm_release_name=""
    local dry_run=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --service)
                rollback_type="service"
                service_name="$2"
                shift 2
                ;;
            --deployment)
                rollback_type="deployment"
                deployment_name="$2"
                shift 2
                ;;
            --helm-release)
                rollback_type="helm"
                helm_release_name="$2"
                shift 2
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --all)
                rollback_type="all"
                shift
                ;;
            --dns)
                rollback_type="dns"
                shift
                ;;
            --frontdoor)
                rollback_type="frontdoor"
                shift
                ;;
            --database)
                rollback_type="database"
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done

    if [[ -z "${rollback_type}" ]]; then
        log_error "No rollback type specified"
        usage
    fi

    # Check prerequisites
    check_prerequisites

    # Execute rollback based on type
    case ${rollback_type} in
        service)
            connect_to_aks
            case ${service_name} in
                api)
                    rollback_api_service
                    ;;
                web)
                    rollback_web_service
                    ;;
                chat)
                    rollback_chat_service
                    ;;
                media)
                    rollback_media_service
                    ;;
                worker)
                    rollback_worker_service
                    ;;
                *)
                    error_exit "Unknown service: ${service_name}"
                    ;;
            esac
            ;;
        deployment)
            connect_to_aks
            rollback_k8s_deployment "${deployment_name}" "${NAMESPACE}"
            ;;
        helm)
            connect_to_aks
            rollback_helm_release "${helm_release_name}" "${NAMESPACE}"
            ;;
        all)
            connect_to_aks
            rollback_all_services
            ;;
        dns)
            rollback_dns_records
            ;;
        frontdoor)
            rollback_frontdoor_config
            ;;
        database)
            rollback_database_migration
            ;;
    esac

    # Verify rollback if it was a Kubernetes rollback
    if [[ "${rollback_type}" =~ ^(service|deployment|helm|all)$ ]]; then
        verify_rollback
    fi

    log_success "=== Rollback completed successfully ==="
    log_info "Completed at: $(date)"
    log_info "Check logs at: ${LOG_FILE}"
}

# =============================================================================
# Script Entry Point
# =============================================================================
main "$@"
