#!/bin/bash
# =============================================================================
# Flamoral Platform - Restore from Backup Script
# =============================================================================
# Purpose: Restore Kubernetes configurations, secrets, DNS, and Front Door
#          configurations from backup
# Usage: ./restore-from-backup.sh [OPTIONS]
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${SCRIPT_DIR}/../../backups}"
LOG_DIR="${SCRIPT_DIR}/../../logs/restore"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/restore_${TIMESTAMP}.log"

# Azure Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
AKS_CLUSTER="${AKS_CLUSTER:-flamoral-prod-aks}"
FRONTDOOR_PROFILE="${FRONTDOOR_PROFILE:-flamoral-prod-afd}"
DNS_ZONE="${DNS_ZONE:-flamoral.com}"

# Kubernetes Configuration
NAMESPACE="${NAMESPACE:-default}"

# Encryption
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}" # Set via environment variable

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
    log_error "Restore failed at $(date)"
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

    log_success "Prerequisites check passed"
}

# =============================================================================
# Find Latest Backup
# =============================================================================
find_latest_backup() {
    local backup_type=$1
    local latest_backup=$(ls -1dt "${BACKUP_ROOT}"/*/ 2>/dev/null | head -n 1)

    if [[ -z "${latest_backup}" ]]; then
        error_exit "No backups found in ${BACKUP_ROOT}"
    fi

    # Check if specific backup type exists
    if [[ ! -d "${latest_backup}${backup_type}" ]]; then
        error_exit "No ${backup_type} backup found in ${latest_backup}"
    fi

    echo "${latest_backup}"
}

# =============================================================================
# Find Specific Backup
# =============================================================================
find_specific_backup() {
    local backup_date=$1

    local backup_dir="${BACKUP_ROOT}/${backup_date}"

    if [[ ! -d "${backup_dir}" ]]; then
        error_exit "Backup not found: ${backup_dir}"
    fi

    echo "${backup_dir}"
}

# =============================================================================
# List Available Backups
# =============================================================================
list_backups() {
    log_info "Available backups:"
    echo ""

    local count=0
    for backup in $(ls -1dt "${BACKUP_ROOT}"/*/ 2>/dev/null); do
        count=$((count + 1))
        local backup_name=$(basename "${backup}")
        local backup_date=$(echo "${backup_name}" | cut -d'_' -f1-2)

        echo "[$count] ${backup_name}"

        if [[ -f "${backup}/backup_report.txt" ]]; then
            echo "    Report: ${backup}/backup_report.txt"
        fi

        echo ""
    done

    if [[ $count -eq 0 ]]; then
        log_warning "No backups found"
    fi
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
# Restore Kubernetes Configurations
# =============================================================================
restore_k8s_configs() {
    local backup_dir=$1

    log_info "Restoring Kubernetes configurations from: ${backup_dir}/k8s"

    if [[ ! -d "${backup_dir}/k8s" ]]; then
        log_warning "No Kubernetes backup found"
        return 1
    fi

    # Restore configmaps
    if [[ -d "${backup_dir}/k8s/configmaps" ]]; then
        log_info "Restoring configmaps..."
        for ns_dir in "${backup_dir}/k8s/configmaps"/*; do
            if [[ -d "${ns_dir}" ]]; then
                local ns=$(basename "${ns_dir}")

                # Create namespace if it doesn't exist
                kubectl create namespace "${ns}" --dry-run=client -o yaml | kubectl apply -f - &>> "${LOG_FILE}"

                # Apply each configmap
                for cm_file in "${ns_dir}"/*.yaml; do
                    if [[ -f "${cm_file}" ]]; then
                        log_info "Applying configmap: $(basename ${cm_file})"
                        kubectl apply -f "${cm_file}" -n "${ns}" &>> "${LOG_FILE}" || log_warning "Failed to apply $(basename ${cm_file})"
                    fi
                done
            fi
        done
        log_success "ConfigMaps restored"
    fi

    # Restore services
    if [[ -d "${backup_dir}/k8s/services" ]]; then
        log_info "Restoring services..."
        for ns_dir in "${backup_dir}/k8s/services"/*; do
            if [[ -d "${ns_dir}" ]]; then
                local ns=$(basename "${ns_dir}")

                for svc_file in "${ns_dir}"/*.yaml; do
                    if [[ -f "${svc_file}" ]]; then
                        log_info "Applying service: $(basename ${svc_file})"
                        kubectl apply -f "${svc_file}" -n "${ns}" &>> "${LOG_FILE}" || log_warning "Failed to apply $(basename ${svc_file})"
                    fi
                done
            fi
        done
        log_success "Services restored"
    fi

    # Restore PVCs
    if [[ -d "${backup_dir}/k8s/pvcs" ]]; then
        log_info "Restoring PVCs..."
        for ns_dir in "${backup_dir}/k8s/pvcs"/*; do
            if [[ -d "${ns_dir}" ]]; then
                local ns=$(basename "${ns_dir}")

                for pvc_file in "${ns_dir}"/*.yaml; do
                    if [[ -f "${pvc_file}" ]]; then
                        log_info "Applying PVC: $(basename ${pvc_file})"
                        kubectl apply -f "${pvc_file}" -n "${ns}" &>> "${LOG_FILE}" || log_warning "Failed to apply $(basename ${pvc_file})"
                    fi
                done
            fi
        done
        log_success "PVCs restored"
    fi

    # Restore deployments
    if [[ -d "${backup_dir}/k8s/deployments" ]]; then
        log_info "Restoring deployments..."
        for ns_dir in "${backup_dir}/k8s/deployments"/*; do
            if [[ -d "${ns_dir}" ]]; then
                local ns=$(basename "${ns_dir}")

                for deploy_file in "${ns_dir}"/*.yaml; do
                    if [[ -f "${deploy_file}" ]]; then
                        log_info "Applying deployment: $(basename ${deploy_file})"
                        kubectl apply -f "${deploy_file}" -n "${ns}" &>> "${LOG_FILE}" || log_warning "Failed to apply $(basename ${deploy_file})"
                    fi
                done
            fi
        done
        log_success "Deployments restored"
    fi

    # Restore ingresses
    if [[ -d "${backup_dir}/k8s/ingresses" ]]; then
        log_info "Restoring ingresses..."
        for ns_dir in "${backup_dir}/k8s/ingresses"/*; do
            if [[ -d "${ns_dir}" ]]; then
                local ns=$(basename "${ns_dir}")

                for ing_file in "${ns_dir}"/*.yaml; do
                    if [[ -f "${ing_file}" ]]; then
                        log_info "Applying ingress: $(basename ${ing_file})"
                        kubectl apply -f "${ing_file}" -n "${ns}" &>> "${LOG_FILE}" || log_warning "Failed to apply $(basename ${ing_file})"
                    fi
                done
            fi
        done
        log_success "Ingresses restored"
    fi

    log_success "Kubernetes configurations restored successfully"
}

# =============================================================================
# Restore Kubernetes Secrets
# =============================================================================
restore_k8s_secrets() {
    local backup_dir=$1

    log_info "Restoring Kubernetes secrets from: ${backup_dir}/secrets"

    # Check if secrets are encrypted
    if [[ -f "${backup_dir}/secrets.tar.gz.enc" ]]; then
        log_info "Decrypting secrets backup..."

        if [[ -z "${ENCRYPTION_KEY}" ]]; then
            error_exit "Encrypted secrets found but ENCRYPTION_KEY not set"
        fi

        if ! command -v openssl &> /dev/null; then
            error_exit "OpenSSL not found. Cannot decrypt secrets."
        fi

        # Decrypt
        openssl enc -aes-256-cbc -d -pbkdf2 \
            -in "${backup_dir}/secrets.tar.gz.enc" \
            -out "${backup_dir}/secrets.tar.gz" \
            -k "${ENCRYPTION_KEY}" &>> "${LOG_FILE}"

        # Extract
        tar -xzf "${backup_dir}/secrets.tar.gz" -C "${backup_dir}/" &>> "${LOG_FILE}"

        log_success "Secrets decrypted successfully"
    fi

    if [[ ! -d "${backup_dir}/secrets" ]]; then
        log_warning "No secrets backup found"
        return 1
    fi

    # Restore secrets
    log_info "Applying secrets..."
    for ns_dir in "${backup_dir}/secrets"/*; do
        if [[ -d "${ns_dir}" ]]; then
            local ns=$(basename "${ns_dir}")

            # Create namespace if it doesn't exist
            kubectl create namespace "${ns}" --dry-run=client -o yaml | kubectl apply -f - &>> "${LOG_FILE}"

            for secret_file in "${ns_dir}"/*.yaml; do
                if [[ -f "${secret_file}" ]] && [[ "$(basename ${secret_file})" != "summary.txt" ]]; then
                    log_info "Applying secret: $(basename ${secret_file})"
                    kubectl apply -f "${secret_file}" -n "${ns}" &>> "${LOG_FILE}" || log_warning "Failed to apply $(basename ${secret_file})"
                fi
            done
        fi
    done

    log_success "Kubernetes secrets restored successfully"
}

# =============================================================================
# Restore DNS Configuration
# =============================================================================
restore_dns_config() {
    local backup_dir=$1

    log_info "Restoring DNS configuration from: ${backup_dir}/dns"

    if [[ ! -f "${backup_dir}/dns/recordsets.json" ]]; then
        log_warning "No DNS backup found"
        return 1
    fi

    # Read record sets and restore
    local record_sets=$(cat "${backup_dir}/dns/recordsets.json")

    # Restore A records
    log_info "Restoring A records..."
    echo "${record_sets}" | jq -r '.[] | select(.type == "Microsoft.Network/dnszones/A") | "\(.name) \(.aRecords[0].ipv4Address)"' | while IFS= read -r record; do
        local name=$(echo "${record}" | awk '{print $1}')
        local ip=$(echo "${record}" | awk '{print $2}')

        if [[ -n "${ip}" ]]; then
            log_info "Restoring A record: ${name} -> ${ip}"

            if [[ "${name}" == "@" ]]; then
                # Root record
                az network dns record-set a update \
                    --resource-group "${RESOURCE_GROUP}" \
                    --zone-name "${DNS_ZONE}" \
                    --name "@" \
                    --set aRecords[0].ipv4Address="${ip}" &>> "${LOG_FILE}" || log_warning "Failed to update root A record"
            else
                # Create or update named record
                az network dns record-set a create \
                    --resource-group "${RESOURCE_GROUP}" \
                    --zone-name "${DNS_ZONE}" \
                    --name "${name}" &>> "${LOG_FILE}" 2>&1 || true

                az network dns record-set a add-record \
                    --resource-group "${RESOURCE_GROUP}" \
                    --zone-name "${DNS_ZONE}" \
                    --record-set-name "${name}" \
                    --ipv4-address "${ip}" &>> "${LOG_FILE}" || log_warning "Failed to update A record: ${name}"
            fi
        fi
    done

    # Restore CNAME records
    log_info "Restoring CNAME records..."
    echo "${record_sets}" | jq -r '.[] | select(.type == "Microsoft.Network/dnszones/CNAME") | "\(.name) \(.cnameRecord.cname)"' | while IFS= read -r record; do
        local name=$(echo "${record}" | awk '{print $1}')
        local cname=$(echo "${record}" | awk '{print $2}')

        if [[ -n "${cname}" ]] && [[ "${cname}" != "null" ]]; then
            log_info "Restoring CNAME record: ${name} -> ${cname}"

            az network dns record-set cname create \
                --resource-group "${RESOURCE_GROUP}" \
                --zone-name "${DNS_ZONE}" \
                --name "${name}" &>> "${LOG_FILE}" 2>&1 || true

            az network dns record-set cname set-record \
                --resource-group "${RESOURCE_GROUP}" \
                --zone-name "${DNS_ZONE}" \
                --record-set-name "${name}" \
                --cname "${cname}" &>> "${LOG_FILE}" || log_warning "Failed to update CNAME record: ${name}"
        fi
    done

    log_success "DNS configuration restored successfully"
}

# =============================================================================
# Restore Helm Releases
# =============================================================================
restore_helm_releases() {
    local backup_dir=$1

    log_info "Restoring Helm releases from: ${backup_dir}/helm"

    if [[ ! -d "${backup_dir}/helm" ]]; then
        log_warning "No Helm backup found"
        return 1
    fi

    for ns_dir in "${backup_dir}/helm"/*; do
        if [[ -d "${ns_dir}" ]]; then
            local ns=$(basename "${ns_dir}")

            if [[ -f "${ns_dir}/releases.json" ]]; then
                local releases=$(cat "${ns_dir}/releases.json")
                local release_count=$(echo "${releases}" | jq '. | length')

                log_info "Found ${release_count} Helm releases in namespace: ${ns}"

                # Note: This requires the Helm charts to be available
                log_warning "Helm release restoration requires manual intervention"
                log_info "Release values are available in: ${ns_dir}/"
                log_info "To restore, use: helm upgrade --install <release-name> <chart> -f ${ns_dir}/<release-name>_values.yaml"
            fi
        fi
    done

    log_success "Helm release information extracted"
}

# =============================================================================
# Verify Restoration
# =============================================================================
verify_restoration() {
    log_info "Verifying restoration..."

    # Check pod status
    log_info "Pod status:"
    kubectl get pods --all-namespaces | tee -a "${LOG_FILE}"

    # Check for unhealthy pods
    local unhealthy_pods=$(kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded 2>/dev/null | tail -n +2 | wc -l)

    if [[ ${unhealthy_pods} -gt 0 ]]; then
        log_warning "Found ${unhealthy_pods} unhealthy pods"
        kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded | tee -a "${LOG_FILE}"
    fi

    # Check deployments
    log_info "Deployment status:"
    kubectl get deployments --all-namespaces | tee -a "${LOG_FILE}"

    # Check services
    log_info "Service status:"
    kubectl get services --all-namespaces | tee -a "${LOG_FILE}"

    log_success "Restoration verification complete"
}

# =============================================================================
# Usage Information
# =============================================================================
usage() {
    cat << EOF
Flamoral Platform - Restore from Backup Script

Usage: $0 [OPTIONS]

OPTIONS:
    --k8s               Restore Kubernetes configurations
    --secrets           Restore Kubernetes secrets
    --dns               Restore DNS configuration
    --helm              Restore Helm releases (guidance only)
    --all               Restore everything
    --latest            Use latest backup (default)
    --backup <date>     Use specific backup (format: YYYYMMDD_HHMMSS)
    --list              List available backups
    --dry-run           Show what would be restored without executing
    --help              Show this help message

ENVIRONMENT VARIABLES:
    RESOURCE_GROUP      Azure resource group (default: flamoral-prod-rg)
    AKS_CLUSTER         AKS cluster name (default: flamoral-prod-aks)
    DNS_ZONE            DNS zone name (default: flamoral.com)
    BACKUP_ROOT         Backup root directory
    ENCRYPTION_KEY      Key for decrypting secrets (required if secrets are encrypted)

EXAMPLES:
    # List available backups
    $0 --list

    # Restore everything from latest backup
    $0 --all --latest

    # Restore only Kubernetes configs from specific backup
    $0 --k8s --backup 20240101_120000

    # Restore secrets with encryption key
    ENCRYPTION_KEY="your-key" $0 --secrets --latest

    # Dry run
    $0 --all --latest --dry-run

LOGS:
    Log file: ${LOG_FILE}

IMPORTANT:
    - Always verify backups before restoration
    - Test restorations in non-production environment first
    - Ensure you have the correct ENCRYPTION_KEY for encrypted secrets
    - Some restorations (like Helm releases) may require manual intervention

EOF
    exit 0
}

# =============================================================================
# Main Function
# =============================================================================
main() {
    # Create log directory
    mkdir -p "${LOG_DIR}"

    log_info "=== Flamoral Platform Restore from Backup ==="
    log_info "Started at: $(date)"
    log_info "Log file: ${LOG_FILE}"

    # Parse command line arguments
    local restore_k8s=false
    local restore_secrets=false
    local restore_dns=false
    local restore_helm=false
    local restore_all=false
    local use_latest=false
    local backup_date=""
    local dry_run=false

    if [[ $# -eq 0 ]]; then
        usage
    fi

    while [[ $# -gt 0 ]]; do
        case $1 in
            --k8s)
                restore_k8s=true
                shift
                ;;
            --secrets)
                restore_secrets=true
                shift
                ;;
            --dns)
                restore_dns=true
                shift
                ;;
            --helm)
                restore_helm=true
                shift
                ;;
            --all)
                restore_all=true
                shift
                ;;
            --latest)
                use_latest=true
                shift
                ;;
            --backup)
                backup_date="$2"
                shift 2
                ;;
            --list)
                list_backups
                exit 0
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

    # Check prerequisites
    check_prerequisites

    # Determine backup directory
    local backup_dir=""
    if [[ "${use_latest}" == true ]] || [[ -z "${backup_date}" ]]; then
        backup_dir=$(find_latest_backup "k8s")
        log_info "Using latest backup: ${backup_dir}"
    else
        backup_dir=$(find_specific_backup "${backup_date}")
        log_info "Using backup: ${backup_dir}"
    fi

    # Display backup report if available
    if [[ -f "${backup_dir}/backup_report.txt" ]]; then
        log_info "Backup report:"
        cat "${backup_dir}/backup_report.txt" | tee -a "${LOG_FILE}"
    fi

    if [[ "${dry_run}" == true ]]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi

    # Execute restoration based on options
    if [[ "${restore_all}" == true ]] || [[ "${restore_k8s}" == true ]]; then
        if [[ "${dry_run}" == false ]]; then
            connect_to_aks
            restore_k8s_configs "${backup_dir}"
        else
            log_info "Would restore Kubernetes configurations from: ${backup_dir}/k8s"
        fi
    fi

    if [[ "${restore_all}" == true ]] || [[ "${restore_secrets}" == true ]]; then
        if [[ "${dry_run}" == false ]]; then
            connect_to_aks
            restore_k8s_secrets "${backup_dir}"
        else
            log_info "Would restore Kubernetes secrets from: ${backup_dir}/secrets"
        fi
    fi

    if [[ "${restore_all}" == true ]] || [[ "${restore_dns}" == true ]]; then
        if [[ "${dry_run}" == false ]]; then
            restore_dns_config "${backup_dir}"
        else
            log_info "Would restore DNS configuration from: ${backup_dir}/dns"
        fi
    fi

    if [[ "${restore_all}" == true ]] || [[ "${restore_helm}" == true ]]; then
        if [[ "${dry_run}" == false ]]; then
            restore_helm_releases "${backup_dir}"
        else
            log_info "Would provide Helm release restoration guidance from: ${backup_dir}/helm"
        fi
    fi

    # Verify restoration if not dry run
    if [[ "${dry_run}" == false ]] && [[ "${restore_all}" == true || "${restore_k8s}" == true ]]; then
        verify_restoration
    fi

    log_success "=== Restoration completed ==="
    log_info "Completed at: $(date)"
    log_info "Check logs at: ${LOG_FILE}"

    if [[ "${dry_run}" == false ]]; then
        log_info "Next steps:"
        log_info "  1. Verify all services are running correctly"
        log_info "  2. Check application health endpoints"
        log_info "  3. Monitor logs for errors"
        log_info "  4. Test critical functionality"
    fi
}

# =============================================================================
# Script Entry Point
# =============================================================================
main "$@"
