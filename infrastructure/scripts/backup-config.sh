#!/bin/bash
# =============================================================================
# Flamoral Platform - Configuration Backup Script
# =============================================================================
# Purpose: Backup all critical configurations including Kubernetes configs,
#          secrets, DNS, and Front Door configurations
# Usage: ./backup-config.sh [OPTIONS]
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${SCRIPT_DIR}/../../backups}"
LOG_DIR="${SCRIPT_DIR}/../../logs/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/backup_${TIMESTAMP}.log"

# Azure Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
AKS_CLUSTER="${AKS_CLUSTER:-flamoral-prod-aks}"
FRONTDOOR_PROFILE="${FRONTDOOR_PROFILE:-flamoral-prod-afd}"
DNS_ZONE="${DNS_ZONE:-flamoral.com}"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-flamoral-prod-kv}"

# Kubernetes Configuration
NAMESPACE="${NAMESPACE:-default}"

# Backup retention
MAX_BACKUPS="${MAX_BACKUPS:-10}"

# Encryption
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}" # Set via environment variable for production

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
    log_error "Backup failed at $(date)"
    exit 1
}

trap 'error_exit "Script interrupted. Check logs at ${LOG_FILE}"' INT TERM

# =============================================================================
# Prerequisite Checks
# =============================================================================
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required tools
    local required_tools=("kubectl" "az" "helm" "jq" "yq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            if [[ "$tool" == "yq" ]]; then
                log_warning "yq not found. Installing yq..."
                if command -v wget &> /dev/null; then
                    wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
                    chmod +x /usr/local/bin/yq
                else
                    log_warning "yq not available. Some YAML operations may fail."
                fi
            else
                error_exit "Required tool not found: $tool"
            fi
        fi
    done

    # Check Azure login
    if ! az account show &> /dev/null; then
        error_exit "Not logged in to Azure. Run 'az login' first."
    fi

    log_success "Prerequisites check passed"
}

# =============================================================================
# Backup Directory Setup
# =============================================================================
setup_backup_dirs() {
    local backup_date=$(date +%Y%m%d_%H%M%S)
    export BACKUP_DIR="${BACKUP_ROOT}/${backup_date}"

    # Create backup directories
    mkdir -p "${BACKUP_DIR}"/{k8s,secrets,dns,frontdoor,helm,keyvault}
    mkdir -p "${LOG_DIR}"

    log_info "Backup directory: ${BACKUP_DIR}"
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
# Kubernetes Configuration Backup
# =============================================================================
backup_k8s_configs() {
    log_info "Backing up Kubernetes configurations..."

    local k8s_backup_dir="${BACKUP_DIR}/k8s"

    # Get all namespaces
    local namespaces=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

    # Backup all deployments
    log_info "Backing up deployments..."
    for ns in ${namespaces}; do
        local deployments=$(kubectl get deployments -n "${ns}" -o name 2>/dev/null || echo "")
        if [[ -n "${deployments}" ]]; then
            mkdir -p "${k8s_backup_dir}/deployments/${ns}"
            for deployment in ${deployments}; do
                local dep_name=$(echo "${deployment}" | cut -d'/' -f2)
                kubectl get "${deployment}" -n "${ns}" -o yaml > "${k8s_backup_dir}/deployments/${ns}/${dep_name}.yaml" 2>> "${LOG_FILE}"
            done
            log_info "Backed up deployments in namespace: ${ns}"
        fi
    done

    # Backup all services
    log_info "Backing up services..."
    for ns in ${namespaces}; do
        local services=$(kubectl get services -n "${ns}" -o name 2>/dev/null | grep -v "kubernetes" || echo "")
        if [[ -n "${services}" ]]; then
            mkdir -p "${k8s_backup_dir}/services/${ns}"
            for service in ${services}; do
                local svc_name=$(echo "${service}" | cut -d'/' -f2)
                kubectl get "${service}" -n "${ns}" -o yaml > "${k8s_backup_dir}/services/${ns}/${svc_name}.yaml" 2>> "${LOG_FILE}"
            done
            log_info "Backed up services in namespace: ${ns}"
        fi
    done

    # Backup all configmaps
    log_info "Backing up configmaps..."
    for ns in ${namespaces}; do
        local configmaps=$(kubectl get configmaps -n "${ns}" -o name 2>/dev/null | grep -v "kube-root-ca.crt" || echo "")
        if [[ -n "${configmaps}" ]]; then
            mkdir -p "${k8s_backup_dir}/configmaps/${ns}"
            for cm in ${configmaps}; do
                local cm_name=$(echo "${cm}" | cut -d'/' -f2)
                kubectl get "${cm}" -n "${ns}" -o yaml > "${k8s_backup_dir}/configmaps/${ns}/${cm_name}.yaml" 2>> "${LOG_FILE}"
            done
            log_info "Backed up configmaps in namespace: ${ns}"
        fi
    done

    # Backup all ingresses
    log_info "Backing up ingresses..."
    for ns in ${namespaces}; do
        local ingresses=$(kubectl get ingress -n "${ns}" -o name 2>/dev/null || echo "")
        if [[ -n "${ingresses}" ]]; then
            mkdir -p "${k8s_backup_dir}/ingresses/${ns}"
            for ingress in ${ingresses}; do
                local ing_name=$(echo "${ingress}" | cut -d'/' -f2)
                kubectl get "${ingress}" -n "${ns}" -o yaml > "${k8s_backup_dir}/ingresses/${ns}/${ing_name}.yaml" 2>> "${LOG_FILE}"
            done
            log_info "Backed up ingresses in namespace: ${ns}"
        fi
    done

    # Backup all persistent volume claims
    log_info "Backing up PVCs..."
    for ns in ${namespaces}; do
        local pvcs=$(kubectl get pvc -n "${ns}" -o name 2>/dev/null || echo "")
        if [[ -n "${pvcs}" ]]; then
            mkdir -p "${k8s_backup_dir}/pvcs/${ns}"
            for pvc in ${pvcs}; do
                local pvc_name=$(echo "${pvc}" | cut -d'/' -f2)
                kubectl get "${pvc}" -n "${ns}" -o yaml > "${k8s_backup_dir}/pvcs/${ns}/${pvc_name}.yaml" 2>> "${LOG_FILE}"
            done
            log_info "Backed up PVCs in namespace: ${ns}"
        fi
    done

    # Create a summary
    cat > "${k8s_backup_dir}/summary.txt" << EOF
Kubernetes Configuration Backup Summary
========================================
Timestamp: $(date)
Cluster: ${AKS_CLUSTER}
Resource Group: ${RESOURCE_GROUP}

Namespaces: $(echo ${namespaces} | wc -w)
Deployments: $(find "${k8s_backup_dir}/deployments" -name "*.yaml" 2>/dev/null | wc -l)
Services: $(find "${k8s_backup_dir}/services" -name "*.yaml" 2>/dev/null | wc -l)
ConfigMaps: $(find "${k8s_backup_dir}/configmaps" -name "*.yaml" 2>/dev/null | wc -l)
Ingresses: $(find "${k8s_backup_dir}/ingresses" -name "*.yaml" 2>/dev/null | wc -l)
PVCs: $(find "${k8s_backup_dir}/pvcs" -name "*.yaml" 2>/dev/null | wc -l)
EOF

    log_success "Kubernetes configurations backed up successfully"
}

# =============================================================================
# Secrets Backup (Encrypted)
# =============================================================================
backup_k8s_secrets() {
    log_info "Backing up Kubernetes secrets..."

    local secrets_backup_dir="${BACKUP_DIR}/secrets"

    # Get all namespaces
    local namespaces=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

    # Backup all secrets
    for ns in ${namespaces}; do
        local secrets=$(kubectl get secrets -n "${ns}" -o name 2>/dev/null | grep -v "default-token\|kubernetes.io/service-account-token" || echo "")
        if [[ -n "${secrets}" ]]; then
            mkdir -p "${secrets_backup_dir}/${ns}"
            for secret in ${secrets}; do
                local secret_name=$(echo "${secret}" | cut -d'/' -f2)
                kubectl get "${secret}" -n "${ns}" -o yaml > "${secrets_backup_dir}/${ns}/${secret_name}.yaml" 2>> "${LOG_FILE}"
            done
            log_info "Backed up secrets in namespace: ${ns}"
        fi
    done

    # Encrypt secrets backup if encryption key is provided
    if [[ -n "${ENCRYPTION_KEY}" ]]; then
        log_info "Encrypting secrets backup..."
        tar -czf "${secrets_backup_dir}.tar.gz" -C "${BACKUP_DIR}" secrets/

        if command -v openssl &> /dev/null; then
            openssl enc -aes-256-cbc -salt -pbkdf2 \
                -in "${secrets_backup_dir}.tar.gz" \
                -out "${secrets_backup_dir}.tar.gz.enc" \
                -k "${ENCRYPTION_KEY}" &>> "${LOG_FILE}"

            # Remove unencrypted archive
            rm -f "${secrets_backup_dir}.tar.gz"
            log_success "Secrets backup encrypted successfully"
        else
            log_warning "OpenSSL not found. Secrets backup not encrypted!"
        fi
    else
        log_warning "No encryption key provided. Secrets backed up in plain text!"
        log_warning "Set ENCRYPTION_KEY environment variable for production use."
    fi

    # Create a summary (without sensitive data)
    cat > "${secrets_backup_dir}/summary.txt" << EOF
Kubernetes Secrets Backup Summary
==================================
Timestamp: $(date)
Cluster: ${AKS_CLUSTER}
Resource Group: ${RESOURCE_GROUP}
Encrypted: $([ -n "${ENCRYPTION_KEY}" ] && echo "Yes" || echo "No")

Total Secrets: $(find "${secrets_backup_dir}" -name "*.yaml" 2>/dev/null | wc -l)
EOF

    log_success "Kubernetes secrets backed up successfully"
}

# =============================================================================
# DNS Configuration Backup
# =============================================================================
backup_dns_config() {
    log_info "Backing up DNS configuration for zone: ${DNS_ZONE}"

    local dns_backup_dir="${BACKUP_DIR}/dns"

    # Export DNS zone configuration
    az network dns zone export \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${DNS_ZONE}" \
        --file-name "${dns_backup_dir}/zone_export.txt" &>> "${LOG_FILE}"

    # Get all record sets in JSON format
    az network dns record-set list \
        --resource-group "${RESOURCE_GROUP}" \
        --zone-name "${DNS_ZONE}" \
        --output json > "${dns_backup_dir}/recordsets.json" 2>> "${LOG_FILE}"

    # Create a human-readable summary
    cat > "${dns_backup_dir}/summary.txt" << EOF
DNS Configuration Backup Summary
=================================
Timestamp: $(date)
Zone: ${DNS_ZONE}
Resource Group: ${RESOURCE_GROUP}

Record Sets:
EOF

    # List all record types and counts
    for record_type in A AAAA CNAME MX TXT NS SOA; do
        local count=$(az network dns record-set list \
            --resource-group "${RESOURCE_GROUP}" \
            --zone-name "${DNS_ZONE}" \
            --query "[?type=='Microsoft.Network/dnszones/${record_type}'] | length(@)" \
            --output tsv 2>/dev/null || echo "0")
        echo "  ${record_type}: ${count}" >> "${dns_backup_dir}/summary.txt"
    done

    log_success "DNS configuration backed up successfully"
}

# =============================================================================
# Azure Front Door Configuration Backup
# =============================================================================
backup_frontdoor_config() {
    log_info "Backing up Azure Front Door configuration..."

    local fd_backup_dir="${BACKUP_DIR}/frontdoor"

    # Get Front Door profile details
    az afd profile show \
        --resource-group "${RESOURCE_GROUP}" \
        --profile-name "${FRONTDOOR_PROFILE}" \
        --output json > "${fd_backup_dir}/profile.json" 2>> "${LOG_FILE}"

    # Get all endpoints
    az afd endpoint list \
        --resource-group "${RESOURCE_GROUP}" \
        --profile-name "${FRONTDOOR_PROFILE}" \
        --output json > "${fd_backup_dir}/endpoints.json" 2>> "${LOG_FILE}"

    # Get all origin groups
    az afd origin-group list \
        --resource-group "${RESOURCE_GROUP}" \
        --profile-name "${FRONTDOOR_PROFILE}" \
        --output json > "${fd_backup_dir}/origin_groups.json" 2>> "${LOG_FILE}"

    # Get all origins for each origin group
    local origin_groups=$(az afd origin-group list \
        --resource-group "${RESOURCE_GROUP}" \
        --profile-name "${FRONTDOOR_PROFILE}" \
        --query "[].name" \
        --output tsv 2>/dev/null || echo "")

    if [[ -n "${origin_groups}" ]]; then
        mkdir -p "${fd_backup_dir}/origins"
        while IFS= read -r og_name; do
            if [[ -n "${og_name}" ]]; then
                az afd origin list \
                    --resource-group "${RESOURCE_GROUP}" \
                    --profile-name "${FRONTDOOR_PROFILE}" \
                    --origin-group-name "${og_name}" \
                    --output json > "${fd_backup_dir}/origins/${og_name}.json" 2>> "${LOG_FILE}"
            fi
        done <<< "${origin_groups}"
    fi

    # Get all routes
    local endpoints=$(az afd endpoint list \
        --resource-group "${RESOURCE_GROUP}" \
        --profile-name "${FRONTDOOR_PROFILE}" \
        --query "[].name" \
        --output tsv 2>/dev/null || echo "")

    if [[ -n "${endpoints}" ]]; then
        mkdir -p "${fd_backup_dir}/routes"
        while IFS= read -r endpoint_name; do
            if [[ -n "${endpoint_name}" ]]; then
                az afd route list \
                    --resource-group "${RESOURCE_GROUP}" \
                    --profile-name "${FRONTDOOR_PROFILE}" \
                    --endpoint-name "${endpoint_name}" \
                    --output json > "${fd_backup_dir}/routes/${endpoint_name}.json" 2>> "${LOG_FILE}"
            fi
        done <<< "${endpoints}"
    fi

    # Get WAF policy
    local waf_policies=$(az network front-door waf-policy list \
        --resource-group "${RESOURCE_GROUP}" \
        --output json 2>/dev/null || echo "[]")

    echo "${waf_policies}" > "${fd_backup_dir}/waf_policies.json"

    # Create summary
    cat > "${fd_backup_dir}/summary.txt" << EOF
Azure Front Door Configuration Backup Summary
==============================================
Timestamp: $(date)
Profile: ${FRONTDOOR_PROFILE}
Resource Group: ${RESOURCE_GROUP}

Endpoints: $(echo "${endpoints}" | wc -l)
Origin Groups: $(echo "${origin_groups}" | wc -l)
WAF Policies: $(echo "${waf_policies}" | jq '. | length' 2>/dev/null || echo "0")
EOF

    log_success "Front Door configuration backed up successfully"
}

# =============================================================================
# Helm Releases Backup
# =============================================================================
backup_helm_releases() {
    log_info "Backing up Helm releases..."

    local helm_backup_dir="${BACKUP_DIR}/helm"

    # Get all namespaces
    local namespaces=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

    # Backup Helm releases in each namespace
    for ns in ${namespaces}; do
        local releases=$(helm list -n "${ns}" --output json 2>/dev/null || echo "[]")

        if [[ "${releases}" != "[]" ]] && [[ -n "${releases}" ]]; then
            mkdir -p "${helm_backup_dir}/${ns}"
            echo "${releases}" > "${helm_backup_dir}/${ns}/releases.json"

            # Get values for each release
            local release_names=$(echo "${releases}" | jq -r '.[].name' 2>/dev/null || echo "")
            while IFS= read -r release_name; do
                if [[ -n "${release_name}" ]]; then
                    helm get values "${release_name}" -n "${ns}" --output yaml > "${helm_backup_dir}/${ns}/${release_name}_values.yaml" 2>> "${LOG_FILE}"
                    helm get manifest "${release_name}" -n "${ns}" > "${helm_backup_dir}/${ns}/${release_name}_manifest.yaml" 2>> "${LOG_FILE}"
                fi
            done <<< "${release_names}"

            log_info "Backed up Helm releases in namespace: ${ns}"
        fi
    done

    log_success "Helm releases backed up successfully"
}

# =============================================================================
# Azure Key Vault Backup
# =============================================================================
backup_keyvault() {
    log_info "Backing up Azure Key Vault secrets list..."

    local kv_backup_dir="${BACKUP_DIR}/keyvault"

    # Note: We only backup the list of secrets and their metadata, not the actual values
    # Actual secret values should remain in Key Vault and are protected by Azure's backup system

    # Find Key Vaults in the resource group
    local key_vaults=$(az keyvault list \
        --resource-group "${RESOURCE_GROUP}" \
        --query "[].name" \
        --output tsv 2>/dev/null || echo "")

    if [[ -n "${key_vaults}" ]]; then
        while IFS= read -r kv_name; do
            if [[ -n "${kv_name}" ]]; then
                mkdir -p "${kv_backup_dir}/${kv_name}"

                # List all secrets (metadata only)
                az keyvault secret list \
                    --vault-name "${kv_name}" \
                    --output json > "${kv_backup_dir}/${kv_name}/secrets_list.json" 2>> "${LOG_FILE}" || log_warning "Failed to backup secrets list from ${kv_name}"

                # List all keys
                az keyvault key list \
                    --vault-name "${kv_name}" \
                    --output json > "${kv_backup_dir}/${kv_name}/keys_list.json" 2>> "${LOG_FILE}" || log_warning "Failed to backup keys list from ${kv_name}"

                # List all certificates
                az keyvault certificate list \
                    --vault-name "${kv_name}" \
                    --output json > "${kv_backup_dir}/${kv_name}/certificates_list.json" 2>> "${LOG_FILE}" || log_warning "Failed to backup certificates list from ${kv_name}"

                log_info "Backed up Key Vault metadata: ${kv_name}"
            fi
        done <<< "${key_vaults}"
    fi

    log_success "Key Vault metadata backed up successfully"
}

# =============================================================================
# Backup Rotation
# =============================================================================
rotate_old_backups() {
    log_info "Rotating old backups (keeping last ${MAX_BACKUPS})..."

    # Count backups
    local backup_count=$(ls -1dt "${BACKUP_ROOT}"/*/ 2>/dev/null | wc -l)

    if [[ ${backup_count} -gt ${MAX_BACKUPS} ]]; then
        local to_delete=$((backup_count - MAX_BACKUPS))
        log_info "Found ${backup_count} backups. Removing ${to_delete} oldest backup(s)..."

        # Remove oldest backups
        ls -1dt "${BACKUP_ROOT}"/*/ | tail -n ${to_delete} | while read -r old_backup; do
            log_info "Removing old backup: ${old_backup}"
            rm -rf "${old_backup}"
        done

        log_success "Removed ${to_delete} old backup(s)"
    else
        log_info "Backup count (${backup_count}) within retention limit (${MAX_BACKUPS})"
    fi
}

# =============================================================================
# Create Backup Archive
# =============================================================================
create_backup_archive() {
    log_info "Creating backup archive..."

    local archive_name="flamoral_backup_${TIMESTAMP}.tar.gz"
    local archive_path="${BACKUP_ROOT}/${archive_name}"

    # Create tar archive
    tar -czf "${archive_path}" -C "${BACKUP_DIR}" . &>> "${LOG_FILE}"

    # Calculate checksum
    local checksum=$(sha256sum "${archive_path}" | awk '{print $1}')
    echo "${checksum}" > "${archive_path}.sha256"

    log_success "Backup archive created: ${archive_path}"
    log_info "SHA256: ${checksum}"

    # Get archive size
    local size=$(du -h "${archive_path}" | awk '{print $1}')
    log_info "Archive size: ${size}"
}

# =============================================================================
# Generate Backup Report
# =============================================================================
generate_backup_report() {
    log_info "Generating backup report..."

    local report_file="${BACKUP_DIR}/backup_report.txt"

    cat > "${report_file}" << EOF
===============================================================================
Flamoral Platform - Configuration Backup Report
===============================================================================
Backup Date: $(date)
Backup Directory: ${BACKUP_DIR}
Resource Group: ${RESOURCE_GROUP}
AKS Cluster: ${AKS_CLUSTER}

===============================================================================
BACKUP CONTENTS
===============================================================================

Kubernetes Configurations:
  - Deployments: $(find "${BACKUP_DIR}/k8s/deployments" -name "*.yaml" 2>/dev/null | wc -l)
  - Services: $(find "${BACKUP_DIR}/k8s/services" -name "*.yaml" 2>/dev/null | wc -l)
  - ConfigMaps: $(find "${BACKUP_DIR}/k8s/configmaps" -name "*.yaml" 2>/dev/null | wc -l)
  - Ingresses: $(find "${BACKUP_DIR}/k8s/ingresses" -name "*.yaml" 2>/dev/null | wc -l)
  - PVCs: $(find "${BACKUP_DIR}/k8s/pvcs" -name "*.yaml" 2>/dev/null | wc -l)

Secrets:
  - Total Secrets: $(find "${BACKUP_DIR}/secrets" -name "*.yaml" 2>/dev/null | wc -l)
  - Encrypted: $([ -f "${BACKUP_DIR}/secrets.tar.gz.enc" ] && echo "Yes" || echo "No")

DNS Configuration:
  - Zone: ${DNS_ZONE}
  - Zone Export: $([ -f "${BACKUP_DIR}/dns/zone_export.txt" ] && echo "Available" || echo "Missing")
  - Record Sets: $([ -f "${BACKUP_DIR}/dns/recordsets.json" ] && echo "Available" || echo "Missing")

Front Door:
  - Profile: ${FRONTDOOR_PROFILE}
  - Configuration: $([ -f "${BACKUP_DIR}/frontdoor/profile.json" ] && echo "Available" || echo "Missing")

Helm Releases:
  - Total Releases: $(find "${BACKUP_DIR}/helm" -name "releases.json" 2>/dev/null | wc -l)

Key Vault:
  - Vaults Backed Up: $(ls -1d "${BACKUP_DIR}/keyvault"/*/ 2>/dev/null | wc -l)

===============================================================================
RESTORATION NOTES
===============================================================================

To restore from this backup:
1. Use restore-from-backup.sh script in disaster-recovery directory
2. Verify backup integrity before restoration
3. Review all configurations before applying to production
4. Test in non-production environment first

===============================================================================
BACKUP VERIFICATION
===============================================================================

Checksum File: backup_report.txt.sha256
Log File: ${LOG_FILE}

===============================================================================
EOF

    # Create checksum for the report
    sha256sum "${report_file}" | awk '{print $1}' > "${report_file}.sha256"

    log_success "Backup report generated: ${report_file}"
}

# =============================================================================
# Usage Information
# =============================================================================
usage() {
    cat << EOF
Flamoral Platform - Configuration Backup Script

Usage: $0 [OPTIONS]

OPTIONS:
    --k8s               Backup Kubernetes configurations
    --secrets           Backup Kubernetes secrets (encrypted if ENCRYPTION_KEY set)
    --dns               Backup DNS configuration
    --frontdoor         Backup Front Door configuration
    --helm              Backup Helm releases
    --keyvault          Backup Key Vault metadata
    --all               Backup everything (default)
    --no-rotate         Skip old backup rotation
    --help              Show this help message

ENVIRONMENT VARIABLES:
    RESOURCE_GROUP      Azure resource group (default: flamoral-prod-rg)
    AKS_CLUSTER         AKS cluster name (default: flamoral-prod-aks)
    FRONTDOOR_PROFILE   Front Door profile name (default: flamoral-prod-afd)
    DNS_ZONE            DNS zone name (default: flamoral.com)
    BACKUP_ROOT         Backup root directory
    MAX_BACKUPS         Number of backups to retain (default: 10)
    ENCRYPTION_KEY      Key for encrypting secrets (required for production)

EXAMPLES:
    # Backup everything
    $0 --all

    # Backup only Kubernetes configs
    $0 --k8s

    # Backup with custom encryption key
    ENCRYPTION_KEY="your-secure-key" $0 --all

    # Backup without rotation
    $0 --all --no-rotate

LOGS:
    Log file: ${LOG_FILE}

EOF
    exit 0
}

# =============================================================================
# Main Function
# =============================================================================
main() {
    # Parse command line arguments
    local backup_k8s=false
    local backup_secrets=false
    local backup_dns=false
    local backup_frontdoor=false
    local backup_helm=false
    local backup_keyvault=false
    local backup_all=true
    local rotate_backups=true

    if [[ $# -gt 0 ]]; then
        backup_all=false
    fi

    while [[ $# -gt 0 ]]; do
        case $1 in
            --k8s)
                backup_k8s=true
                shift
                ;;
            --secrets)
                backup_secrets=true
                shift
                ;;
            --dns)
                backup_dns=true
                shift
                ;;
            --frontdoor)
                backup_frontdoor=true
                shift
                ;;
            --helm)
                backup_helm=true
                shift
                ;;
            --keyvault)
                backup_keyvault=true
                shift
                ;;
            --all)
                backup_all=true
                shift
                ;;
            --no-rotate)
                rotate_backups=false
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

    # Setup logging and backup directories
    setup_backup_dirs

    log_info "=== Flamoral Platform Configuration Backup ==="
    log_info "Started at: $(date)"
    log_info "Log file: ${LOG_FILE}"

    # Check prerequisites
    check_prerequisites

    # Execute backups based on options
    if [[ "${backup_all}" == true ]] || [[ "${backup_k8s}" == true ]]; then
        connect_to_aks
        backup_k8s_configs
    fi

    if [[ "${backup_all}" == true ]] || [[ "${backup_secrets}" == true ]]; then
        connect_to_aks
        backup_k8s_secrets
    fi

    if [[ "${backup_all}" == true ]] || [[ "${backup_dns}" == true ]]; then
        backup_dns_config
    fi

    if [[ "${backup_all}" == true ]] || [[ "${backup_frontdoor}" == true ]]; then
        backup_frontdoor_config
    fi

    if [[ "${backup_all}" == true ]] || [[ "${backup_helm}" == true ]]; then
        connect_to_aks
        backup_helm_releases
    fi

    if [[ "${backup_all}" == true ]] || [[ "${backup_keyvault}" == true ]]; then
        backup_keyvault
    fi

    # Generate backup report
    generate_backup_report

    # Create backup archive
    create_backup_archive

    # Rotate old backups
    if [[ "${rotate_backups}" == true ]]; then
        rotate_old_backups
    fi

    log_success "=== Backup completed successfully ==="
    log_info "Backup location: ${BACKUP_DIR}"
    log_info "Completed at: $(date)"
    log_info "Review backup report: ${BACKUP_DIR}/backup_report.txt"
}

# =============================================================================
# Script Entry Point
# =============================================================================
main "$@"
