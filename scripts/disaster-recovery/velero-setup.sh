#!/bin/bash
# Velero Setup and Management Script
# Flamoral Dating Platform

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VELERO_VERSION="v1.12.0"
VELERO_NAMESPACE="velero"

# Azure Configuration
AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"
AZURE_TENANT_ID="${AZURE_TENANT_ID:-}"
AZURE_CLIENT_ID="${AZURE_CLIENT_ID:-}"
AZURE_CLIENT_SECRET="${AZURE_CLIENT_SECRET:-}"
AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-}"
BACKUP_STORAGE_ACCOUNT="${BACKUP_STORAGE_ACCOUNT:-}"
BACKUP_STORAGE_KEY="${BACKUP_STORAGE_KEY:-}"

# ============================================================================
# Logging Functions
# ============================================================================

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

error_exit() {
    log_error "$1"
    exit 1
}

# ============================================================================
# Prerequisites Check
# ============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl not found. Please install kubectl"
    fi

    # Check velero CLI
    if ! command -v velero &> /dev/null; then
        log_info "Velero CLI not found. Installing..."
        install_velero_cli
    fi

    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        error_exit "Azure CLI not found. Please install az CLI"
    fi

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi

    # Check Azure credentials
    if [[ -z "${AZURE_SUBSCRIPTION_ID}" ]]; then
        error_exit "AZURE_SUBSCRIPTION_ID not set"
    fi

    log_success "Prerequisites check passed"
}

# ============================================================================
# Install Velero CLI
# ============================================================================

install_velero_cli() {
    log_info "Installing Velero CLI ${VELERO_VERSION}..."

    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    if [[ "${arch}" == "x86_64" ]]; then
        arch="amd64"
    fi

    local velero_url="https://github.com/vmware-tanzu/velero/releases/download/${VELERO_VERSION}/velero-${VELERO_VERSION}-${os}-${arch}.tar.gz"

    wget -q "${velero_url}" -O /tmp/velero.tar.gz || error_exit "Failed to download Velero"

    tar -xzf /tmp/velero.tar.gz -C /tmp
    sudo mv "/tmp/velero-${VELERO_VERSION}-${os}-${arch}/velero" /usr/local/bin/
    sudo chmod +x /usr/local/bin/velero

    rm -rf /tmp/velero.tar.gz "/tmp/velero-${VELERO_VERSION}-${os}-${arch}"

    log_success "Velero CLI installed successfully"
}

# ============================================================================
# Setup Azure Storage
# ============================================================================

setup_azure_storage() {
    log_info "Setting up Azure Storage for backups..."

    # Get storage account key if not provided
    if [[ -z "${BACKUP_STORAGE_KEY}" ]]; then
        BACKUP_STORAGE_KEY=$(az storage account keys list \
            --resource-group "${AZURE_RESOURCE_GROUP}" \
            --account-name "${BACKUP_STORAGE_ACCOUNT}" \
            --query "[0].value" \
            --output tsv) || error_exit "Failed to get storage account key"
    fi

    # Create backup container if not exists
    az storage container create \
        --name "kubernetes-backups" \
        --account-name "${BACKUP_STORAGE_ACCOUNT}" \
        --account-key "${BACKUP_STORAGE_KEY}" \
        --public-access off \
        || log_info "Container may already exist"

    log_success "Azure Storage setup completed"
}

# ============================================================================
# Install Velero
# ============================================================================

install_velero() {
    log_info "Installing Velero in Kubernetes cluster..."

    # Create namespace
    kubectl create namespace "${VELERO_NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

    # Create credentials file
    cat > /tmp/credentials-velero <<EOF
AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID}
AZURE_TENANT_ID=${AZURE_TENANT_ID}
AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET}
AZURE_RESOURCE_GROUP=${AZURE_RESOURCE_GROUP}
AZURE_CLOUD_NAME=AzurePublicCloud
EOF

    # Install Velero using CLI
    velero install \
        --provider azure \
        --plugins velero/velero-plugin-for-microsoft-azure:v1.8.0,velero/velero-plugin-for-csi:v0.6.0 \
        --bucket kubernetes-backups \
        --secret-file /tmp/credentials-velero \
        --backup-location-config resourceGroup="${AZURE_RESOURCE_GROUP}",storageAccount="${BACKUP_STORAGE_ACCOUNT}",subscriptionId="${AZURE_SUBSCRIPTION_ID}" \
        --snapshot-location-config apiTimeout=5m,resourceGroup="${AZURE_RESOURCE_GROUP}",subscriptionId="${AZURE_SUBSCRIPTION_ID}" \
        --use-volume-snapshots=true \
        --features=EnableCSI \
        --wait \
        || error_exit "Velero installation failed"

    # Cleanup credentials file
    rm -f /tmp/credentials-velero

    log_success "Velero installed successfully"
}

# ============================================================================
# Configure Backup Schedules
# ============================================================================

configure_schedules() {
    log_info "Configuring backup schedules..."

    # Hourly critical services backup
    velero schedule create hourly-critical \
        --schedule="0 * * * *" \
        --include-namespaces flamoral-dating \
        --selector backup-tier=critical \
        --ttl 168h0m0s \
        --snapshot-volumes=true \
        || log_info "Schedule 'hourly-critical' may already exist"

    # Daily full backup
    velero schedule create daily-full \
        --schedule="0 2 * * *" \
        --include-namespaces flamoral-dating,flamoral-ai,monitoring,logging,tracing \
        --ttl 720h0m0s \
        --snapshot-volumes=true \
        --include-cluster-resources=true \
        || log_info "Schedule 'daily-full' may already exist"

    # Weekly comprehensive backup
    velero schedule create weekly-comprehensive \
        --schedule="0 1 * * 0" \
        --include-namespaces "*" \
        --ttl 2160h0m0s \
        --snapshot-volumes=true \
        --include-cluster-resources=true \
        || log_info "Schedule 'weekly-comprehensive' may already exist"

    # Config and secrets backup (every 2 hours)
    velero schedule create configs-and-secrets \
        --schedule="0 */2 * * *" \
        --include-namespaces flamoral-dating,flamoral-ai \
        --include-resources configmaps,secrets \
        --ttl 168h0m0s \
        || log_info "Schedule 'configs-and-secrets' may already exist"

    log_success "Backup schedules configured"
}

# ============================================================================
# Label Resources for Backup
# ============================================================================

label_resources() {
    log_info "Labeling resources for backup..."

    # Label critical services
    local critical_services=(
        "auth-service"
        "payment-service"
        "api-gateway"
    )

    for service in "${critical_services[@]}"; do
        kubectl label deployment "${service}" backup-tier=critical -n flamoral-dating --overwrite || true
    done

    log_success "Resources labeled"
}

# ============================================================================
# Test Backup
# ============================================================================

test_backup() {
    log_info "Running test backup..."

    local backup_name="test-backup-$(date +%Y%m%d-%H%M%S)"

    velero backup create "${backup_name}" \
        --include-namespaces flamoral-dating \
        --selector app=auth-service \
        --wait \
        || error_exit "Test backup failed"

    # Check backup status
    local status=$(velero backup describe "${backup_name}" --details | grep "Phase:" | awk '{print $2}')

    if [[ "${status}" == "Completed" ]]; then
        log_success "Test backup completed successfully"
    else
        error_exit "Test backup failed with status: ${status}"
    fi

    # Cleanup test backup
    velero backup delete "${backup_name}" --confirm || true
}

# ============================================================================
# Verify Installation
# ============================================================================

verify_installation() {
    log_info "Verifying Velero installation..."

    # Check Velero pod
    if ! kubectl get pods -n "${VELERO_NAMESPACE}" -l app.kubernetes.io/name=velero | grep -q "Running"; then
        error_exit "Velero pod is not running"
    fi

    # Check backup locations
    if ! velero backup-location get &> /dev/null; then
        error_exit "Backup location not configured"
    fi

    # Check volume snapshot locations
    if ! velero snapshot-location get &> /dev/null; then
        error_exit "Volume snapshot location not configured"
    fi

    # List schedules
    velero schedule get

    log_success "Velero installation verified"
}

# ============================================================================
# Backup Commands
# ============================================================================

create_backup() {
    local backup_name="${1:-manual-backup-$(date +%Y%m%d-%H%M%S)}"
    local namespace="${2:-flamoral-dating}"

    log_info "Creating backup: ${backup_name}"

    velero backup create "${backup_name}" \
        --include-namespaces "${namespace}" \
        --wait \
        || error_exit "Backup creation failed"

    log_success "Backup created: ${backup_name}"
}

list_backups() {
    log_info "Listing all backups..."
    velero backup get
}

describe_backup() {
    local backup_name="$1"

    if [[ -z "${backup_name}" ]]; then
        error_exit "Backup name required"
    fi

    velero backup describe "${backup_name}" --details
}

delete_backup() {
    local backup_name="$1"

    if [[ -z "${backup_name}" ]]; then
        error_exit "Backup name required"
    fi

    log_info "Deleting backup: ${backup_name}"

    velero backup delete "${backup_name}" --confirm \
        || error_exit "Backup deletion failed"

    log_success "Backup deleted: ${backup_name}"
}

# ============================================================================
# Restore Commands
# ============================================================================

restore_backup() {
    local backup_name="$1"
    local namespace="${2:-}"

    if [[ -z "${backup_name}" ]]; then
        error_exit "Backup name required"
    fi

    local restore_name="restore-${backup_name}-$(date +%Y%m%d-%H%M%S)"

    log_info "Restoring from backup: ${backup_name}"

    local restore_cmd="velero restore create ${restore_name} --from-backup ${backup_name} --wait"

    if [[ -n "${namespace}" ]]; then
        restore_cmd="${restore_cmd} --include-namespaces ${namespace}"
    fi

    eval "${restore_cmd}" || error_exit "Restore failed"

    log_success "Restore completed: ${restore_name}"
}

list_restores() {
    log_info "Listing all restores..."
    velero restore get
}

describe_restore() {
    local restore_name="$1"

    if [[ -z "${restore_name}" ]]; then
        error_exit "Restore name required"
    fi

    velero restore describe "${restore_name}" --details
}

# ============================================================================
# Monitoring and Logs
# ============================================================================

show_logs() {
    log_info "Showing Velero logs..."
    kubectl logs -n "${VELERO_NAMESPACE}" -l app.kubernetes.io/name=velero --tail=100 -f
}

show_backup_logs() {
    local backup_name="$1"

    if [[ -z "${backup_name}" ]]; then
        error_exit "Backup name required"
    fi

    velero backup logs "${backup_name}"
}

show_restore_logs() {
    local restore_name="$1"

    if [[ -z "${restore_name}" ]]; then
        error_exit "Restore name required"
    fi

    velero restore logs "${restore_name}"
}

# ============================================================================
# Uninstall
# ============================================================================

uninstall_velero() {
    log_info "Uninstalling Velero..."

    read -p "Are you sure you want to uninstall Velero? (yes/no): " confirmation

    if [[ "${confirmation}" != "yes" ]]; then
        log_info "Uninstall cancelled"
        exit 0
    fi

    velero uninstall --force || error_exit "Uninstall failed"

    log_success "Velero uninstalled"
}

# ============================================================================
# Usage
# ============================================================================

usage() {
    cat <<EOF
Usage: $0 <command> [options]

Commands:
    install             Install Velero with backup schedules
    verify              Verify Velero installation
    test                Run test backup

    backup create       Create manual backup [name] [namespace]
    backup list         List all backups
    backup describe     Describe backup [name]
    backup delete       Delete backup [name]

    restore create      Restore from backup [backup-name] [namespace]
    restore list        List all restores
    restore describe    Describe restore [name]

    schedule list       List backup schedules
    schedule get        Get schedule details [name]

    logs                Show Velero logs
    backup-logs         Show backup logs [name]
    restore-logs        Show restore logs [name]

    uninstall           Uninstall Velero

Examples:
    # Install Velero
    $0 install

    # Create manual backup
    $0 backup create my-backup flamoral-dating

    # List all backups
    $0 backup list

    # Restore from backup
    $0 restore create daily-full-20241211

    # Show logs
    $0 logs
EOF
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    if [[ $# -eq 0 ]]; then
        usage
        exit 1
    fi

    local command="$1"
    shift

    case "${command}" in
        install)
            check_prerequisites
            setup_azure_storage
            install_velero
            configure_schedules
            label_resources
            verify_installation
            test_backup
            ;;

        verify)
            verify_installation
            ;;

        test)
            test_backup
            ;;

        backup)
            local subcommand="${1:-}"
            shift || true

            case "${subcommand}" in
                create) create_backup "$@" ;;
                list) list_backups ;;
                describe) describe_backup "$@" ;;
                delete) delete_backup "$@" ;;
                *) usage; exit 1 ;;
            esac
            ;;

        restore)
            local subcommand="${1:-}"
            shift || true

            case "${subcommand}" in
                create) restore_backup "$@" ;;
                list) list_restores ;;
                describe) describe_restore "$@" ;;
                *) usage; exit 1 ;;
            esac
            ;;

        schedule)
            local subcommand="${1:-}"
            shift || true

            case "${subcommand}" in
                list) velero schedule get ;;
                get) velero schedule get "$@" ;;
                *) usage; exit 1 ;;
            esac
            ;;

        logs) show_logs ;;
        backup-logs) show_backup_logs "$@" ;;
        restore-logs) show_restore_logs "$@" ;;

        uninstall) uninstall_velero ;;

        *) usage; exit 1 ;;
    esac
}

main "$@"
