#!/bin/bash
# PostgreSQL Restore Script with Point-in-Time Recovery
# Flamoral Dating Platform

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="/var/log/flamoral-restore"
LOG_FILE="${LOG_DIR}/postgres-restore-${TIMESTAMP}.log"

# Azure Storage Configuration
STORAGE_ACCOUNT="${BACKUP_STORAGE_ACCOUNT:-}"
STORAGE_CONTAINER="${POSTGRES_BACKUP_CONTAINER:-postgresql-backups}"
STORAGE_KEY="${BACKUP_STORAGE_KEY:-}"

# PostgreSQL Configuration
PG_HOST="${POSTGRES_HOST:-postgres-primary.flamoral-dating.svc.cluster.local}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-psqladmin}"
PG_PASSWORD="${POSTGRES_PASSWORD:-}"

# Restore settings
RESTORE_DIR="/tmp/postgres-restore"
BACKUP_TIMESTAMP="${BACKUP_TIMESTAMP:-latest}"
RESTORE_TYPE="${RESTORE_TYPE:-full}" # full, database, pitr
RESTORE_DATABASE="${RESTORE_DATABASE:-all}"
PITR_TARGET="${PITR_TARGET:-}" # Format: YYYY-MM-DD HH:MM:SS

# Safety settings
DRY_RUN="${DRY_RUN:-false}"
CONFIRM="${CONFIRM:-false}"

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

# ============================================================================
# Error Handling
# ============================================================================

error_exit() {
    log_error "$1"
    cleanup
    exit 1
}

# ============================================================================
# Safety Checks
# ============================================================================

confirm_restore() {
    if [[ "${CONFIRM}" != "true" ]]; then
        cat <<EOF

========================================
WARNING: DESTRUCTIVE OPERATION
========================================
You are about to restore PostgreSQL databases.
This will OVERWRITE existing data!

Restore Type: ${RESTORE_TYPE}
Target: ${RESTORE_DATABASE}
Backup Timestamp: ${BACKUP_TIMESTAMP}
$([ -n "${PITR_TARGET}" ] && echo "PITR Target: ${PITR_TARGET}")

Environment: ${ENV:-production}
Database Host: ${PG_HOST}

EOF

        read -p "Are you absolutely sure you want to proceed? (type 'YES' to continue): " confirmation

        if [[ "${confirmation}" != "YES" ]]; then
            log_info "Restore cancelled by user"
            exit 0
        fi
    fi

    log_info "Restore confirmed"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required commands
    local required_commands=("pg_restore" "psql" "az")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" &> /dev/null; then
            error_exit "Required command not found: ${cmd}"
        fi
    done

    # Check PostgreSQL connectivity
    if ! PGPASSWORD="${PG_PASSWORD}" psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -c "SELECT 1" &> /dev/null; then
        error_exit "Cannot connect to PostgreSQL server"
    fi

    # Check Azure Storage access
    if ! az storage container exists \
        --name "${STORAGE_CONTAINER}" \
        --account-name "${STORAGE_ACCOUNT}" \
        --account-key "${STORAGE_KEY}" &> /dev/null; then
        error_exit "Cannot access Azure Storage container"
    fi

    log_success "Prerequisites check passed"
}

# ============================================================================
# Backup Discovery
# ============================================================================

list_available_backups() {
    log_info "Listing available backups..."

    az storage blob list \
        --container-name "${STORAGE_CONTAINER}" \
        --account-name "${STORAGE_ACCOUNT}" \
        --account-key "${STORAGE_KEY}" \
        --prefix "databases/" \
        --query "[].{Name:name, Created:properties.creationTime, Size:properties.contentLength}" \
        --output table
}

get_latest_backup() {
    local database="$1"

    az storage blob list \
        --container-name "${STORAGE_CONTAINER}" \
        --account-name "${STORAGE_ACCOUNT}" \
        --account-key "${STORAGE_KEY}" \
        --prefix "databases/${database}/" \
        --query "max_by([], &properties.creationTime).name" \
        --output tsv
}

# ============================================================================
# Download Backup
# ============================================================================

download_backup() {
    local database="$1"
    local backup_timestamp="$2"

    log_info "Downloading backup for ${database}..."

    mkdir -p "${RESTORE_DIR}"

    local backup_file
    if [[ "${backup_timestamp}" == "latest" ]]; then
        backup_file=$(get_latest_backup "${database}")
    else
        backup_file="databases/${database}/${database}-${backup_timestamp}.dump"
    fi

    if [[ -z "${backup_file}" ]]; then
        error_exit "No backup found for ${database}"
    fi

    local local_backup="${RESTORE_DIR}/$(basename "${backup_file}")"

    az storage blob download \
        --container-name "${STORAGE_CONTAINER}" \
        --name "${backup_file}" \
        --file "${local_backup}" \
        --account-name "${STORAGE_ACCOUNT}" \
        --account-key "${STORAGE_KEY}" \
        --max-connections 4 \
        || error_exit "Failed to download backup: ${backup_file}"

    # Download and verify checksum
    local checksum_file="${backup_file}.sha256"
    local local_checksum="${RESTORE_DIR}/$(basename "${backup_file}").sha256"

    az storage blob download \
        --container-name "${STORAGE_CONTAINER}" \
        --name "${checksum_file}" \
        --file "${local_checksum}" \
        --account-name "${STORAGE_ACCOUNT}" \
        --account-key "${STORAGE_KEY}" \
        || log_warning "Checksum file not found"

    # Verify integrity
    if [[ -f "${local_checksum}" ]]; then
        local expected_checksum=$(cat "${local_checksum}")
        local actual_checksum=$(sha256sum "${local_backup}" | awk '{print $1}')

        if [[ "${expected_checksum}" != "${actual_checksum}" ]]; then
            error_exit "Checksum verification failed for ${database}"
        fi

        log_success "Backup integrity verified"
    fi

    echo "${local_backup}"
}

# ============================================================================
# Stop Application Services
# ============================================================================

stop_services() {
    log_warning "Stopping application services..."

    if command -v kubectl &> /dev/null; then
        # Scale down all deployments
        kubectl scale deployment --all --replicas=0 -n flamoral-dating || log_warning "Failed to scale down services"

        # Wait for pods to terminate
        sleep 30
    fi

    log_info "Services stopped"
}

start_services() {
    log_info "Starting application services..."

    if command -v kubectl &> /dev/null; then
        # Scale up deployments
        kubectl scale deployment --all --replicas=3 -n flamoral-dating || log_warning "Failed to scale up services"
    fi

    log_success "Services started"
}

# ============================================================================
# Database Restore
# ============================================================================

restore_database() {
    local database="$1"
    local backup_file="$2"

    log_info "Restoring database: ${database}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would restore ${database} from ${backup_file}"
        return 0
    fi

    # Drop existing database (with safety check)
    log_warning "Dropping existing database: ${database}"
    PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${database}';" \
        || log_warning "Failed to terminate connections"

    PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d postgres \
        -c "DROP DATABASE IF EXISTS ${database};" \
        || error_exit "Failed to drop database: ${database}"

    # Create new database
    log_info "Creating database: ${database}"
    PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d postgres \
        -c "CREATE DATABASE ${database} WITH ENCODING 'UTF8';" \
        || error_exit "Failed to create database: ${database}"

    # Restore from backup
    log_info "Restoring data to ${database}..."
    PGPASSWORD="${PG_PASSWORD}" pg_restore \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d "${database}" \
        --verbose \
        --no-owner \
        --no-acl \
        --jobs=4 \
        "${backup_file}" \
        || error_exit "Failed to restore database: ${database}"

    log_success "Database ${database} restored successfully"
}

# ============================================================================
# Point-in-Time Recovery
# ============================================================================

restore_pitr() {
    local target_time="$1"

    log_info "Starting Point-in-Time Recovery to ${target_time}..."

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would perform PITR to ${target_time}"
        return 0
    fi

    # Download base backup
    log_info "Downloading base backup..."
    local base_backup_dir="${RESTORE_DIR}/base"
    mkdir -p "${base_backup_dir}"

    az storage blob download-batch \
        --source "${STORAGE_CONTAINER}" \
        --destination "${base_backup_dir}" \
        --pattern "base/*/base.tar.gz" \
        --account-name "${STORAGE_ACCOUNT}" \
        --account-key "${STORAGE_KEY}" \
        || error_exit "Failed to download base backup"

    # Download WAL files
    log_info "Downloading WAL files..."
    local wal_dir="${RESTORE_DIR}/wal"
    mkdir -p "${wal_dir}"

    az storage blob download-batch \
        --source "${STORAGE_CONTAINER}" \
        --destination "${wal_dir}" \
        --pattern "wal/*" \
        --account-name "${STORAGE_ACCOUNT}" \
        --account-key "${STORAGE_KEY}" \
        || error_exit "Failed to download WAL files"

    # Extract base backup
    log_info "Extracting base backup..."
    tar -xzf "${base_backup_dir}/base.tar.gz" -C "${RESTORE_DIR}" \
        || error_exit "Failed to extract base backup"

    # Configure recovery
    log_info "Configuring point-in-time recovery..."
    cat > "${RESTORE_DIR}/recovery.signal" <<EOF
restore_command = 'cp ${wal_dir}/%f %p'
recovery_target_time = '${target_time}'
recovery_target_action = 'promote'
EOF

    # Stop PostgreSQL
    log_warning "Stopping PostgreSQL..."
    kubectl scale statefulset postgres --replicas=0 -n flamoral-dating || error_exit "Failed to stop PostgreSQL"
    sleep 30

    # Replace data directory
    log_warning "Replacing PostgreSQL data directory..."
    kubectl exec -it postgres-0 -n flamoral-dating -- \
        bash -c "rm -rf /var/lib/postgresql/data/* && cp -r ${RESTORE_DIR}/* /var/lib/postgresql/data/" \
        || error_exit "Failed to replace data directory"

    # Start PostgreSQL
    log_info "Starting PostgreSQL for recovery..."
    kubectl scale statefulset postgres --replicas=1 -n flamoral-dating || error_exit "Failed to start PostgreSQL"

    # Wait for recovery to complete
    log_info "Waiting for recovery to complete..."
    sleep 60

    # Check recovery status
    local recovery_done=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d postgres \
        -t -c "SELECT pg_is_in_recovery();" | tr -d ' ')

    if [[ "${recovery_done}" == "f" ]]; then
        log_success "Point-in-time recovery completed successfully"
    else
        error_exit "Recovery did not complete"
    fi
}

# ============================================================================
# Post-Restore Verification
# ============================================================================

verify_restore() {
    log_info "Verifying restore..."

    local databases=("$@")

    for db in "${databases[@]}"; do
        # Check database exists
        local exists=$(PGPASSWORD="${PG_PASSWORD}" psql \
            -h "${PG_HOST}" \
            -p "${PG_PORT}" \
            -U "${PG_USER}" \
            -d postgres \
            -t -c "SELECT COUNT(*) FROM pg_database WHERE datname = '${db}';" | tr -d ' ')

        if [[ "${exists}" != "1" ]]; then
            log_error "Database ${db} not found after restore"
            continue
        fi

        # Check table count
        local table_count=$(PGPASSWORD="${PG_PASSWORD}" psql \
            -h "${PG_HOST}" \
            -p "${PG_PORT}" \
            -U "${PG_USER}" \
            -d "${db}" \
            -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

        log_info "Database ${db}: ${table_count} tables"

        # Run basic query test
        if PGPASSWORD="${PG_PASSWORD}" psql \
            -h "${PG_HOST}" \
            -p "${PG_PORT}" \
            -U "${PG_USER}" \
            -d "${db}" \
            -c "SELECT 1;" &> /dev/null; then
            log_success "Database ${db} is accessible"
        else
            log_error "Database ${db} is not accessible"
        fi
    done
}

# ============================================================================
# Cleanup
# ============================================================================

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "${RESTORE_DIR}"
}

# ============================================================================
# Generate Restore Report
# ============================================================================

generate_report() {
    local report_file="${LOG_DIR}/restore-report-${TIMESTAMP}.txt"

    cat > "${report_file}" <<EOF
========================================
PostgreSQL Restore Report
========================================
Date: $(date)
Timestamp: ${TIMESTAMP}
Environment: ${ENV:-production}

Restore Type: ${RESTORE_TYPE}
Target: ${RESTORE_DATABASE}
Backup Timestamp: ${BACKUP_TIMESTAMP}
$([ -n "${PITR_TARGET}" ] && echo "PITR Target: ${PITR_TARGET}")

Dry Run: ${DRY_RUN}

Status: SUCCESS

Log File: ${LOG_FILE}
========================================
EOF

    cat "${report_file}"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    setup_logging

    log_info "========================================"
    log_info "PostgreSQL Restore Started"
    log_info "========================================"

    # Parse options
    while getopts "d:t:p:lh" opt; do
        case ${opt} in
            d) RESTORE_DATABASE="${OPTARG}" ;;
            t) BACKUP_TIMESTAMP="${OPTARG}" ;;
            p) PITR_TARGET="${OPTARG}"; RESTORE_TYPE="pitr" ;;
            l) list_available_backups; exit 0 ;;
            h) usage; exit 0 ;;
            *) usage; exit 1 ;;
        esac
    done

    confirm_restore
    check_prerequisites

    # Perform restore based on type
    case "${RESTORE_TYPE}" in
        full)
            stop_services

            local databases=("flamoral_users" "flamoral_auth" "flamoral_matching" "flamoral_payments" "flamoral_media" "flamoral_analytics" "flamoral_notifications" "flamoral_moderation")

            for db in "${databases[@]}"; do
                local backup_file=$(download_backup "${db}" "${BACKUP_TIMESTAMP}")
                restore_database "${db}" "${backup_file}"
            done

            verify_restore "${databases[@]}"
            start_services
            ;;

        database)
            if [[ "${RESTORE_DATABASE}" == "all" ]]; then
                error_exit "Please specify a database with -d option"
            fi

            stop_services
            local backup_file=$(download_backup "${RESTORE_DATABASE}" "${BACKUP_TIMESTAMP}")
            restore_database "${RESTORE_DATABASE}" "${backup_file}"
            verify_restore "${RESTORE_DATABASE}"
            start_services
            ;;

        pitr)
            if [[ -z "${PITR_TARGET}" ]]; then
                error_exit "PITR target time not specified. Use -p 'YYYY-MM-DD HH:MM:SS'"
            fi

            stop_services
            restore_pitr "${PITR_TARGET}"
            start_services
            ;;

        *)
            error_exit "Invalid restore type: ${RESTORE_TYPE}"
            ;;
    esac

    generate_report

    log_info "========================================"
    log_info "PostgreSQL Restore Completed Successfully"
    log_info "========================================"

    cleanup
}

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
    -d DATABASE    Database name to restore (required for single database restore)
    -t TIMESTAMP   Backup timestamp (default: latest)
    -p TIME        Point-in-time recovery target (format: 'YYYY-MM-DD HH:MM:SS')
    -l             List available backups
    -h             Show this help message

Environment Variables:
    BACKUP_STORAGE_ACCOUNT    Azure Storage account name
    POSTGRES_BACKUP_CONTAINER Backup container name
    BACKUP_STORAGE_KEY        Storage account key
    POSTGRES_HOST             PostgreSQL host
    POSTGRES_USER             PostgreSQL user
    POSTGRES_PASSWORD         PostgreSQL password
    CONFIRM                   Skip confirmation prompt (CONFIRM=true)
    DRY_RUN                   Test run without making changes (DRY_RUN=true)

Examples:
    # List available backups
    $0 -l

    # Restore single database from latest backup
    $0 -d flamoral_users

    # Restore single database from specific backup
    $0 -d flamoral_users -t 20241211-143000

    # Point-in-time recovery
    $0 -p '2024-12-11 14:30:00'

    # Dry run
    DRY_RUN=true $0 -d flamoral_users
EOF
}

# Run main function
main "$@"
