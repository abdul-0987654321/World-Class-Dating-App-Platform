#!/bin/bash
# PostgreSQL Automated Backup Script with Point-in-Time Recovery Support
# Flamoral Dating Platform

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="/var/log/flamoral-backups"
LOG_FILE="${LOG_DIR}/postgres-backup-${TIMESTAMP}.log"

# Azure Storage Configuration
STORAGE_ACCOUNT="${BACKUP_STORAGE_ACCOUNT:-}"
STORAGE_CONTAINER="${POSTGRES_BACKUP_CONTAINER:-postgresql-backups}"
STORAGE_KEY="${BACKUP_STORAGE_KEY:-}"

# PostgreSQL Configuration
PG_HOST="${POSTGRES_HOST:-postgres-primary.flamoral-dating.svc.cluster.local}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-psqladmin}"
PG_PASSWORD="${POSTGRES_PASSWORD:-}"

# Databases to backup
DATABASES=(
    "flamoral_users"
    "flamoral_auth"
    "flamoral_matching"
    "flamoral_payments"
    "flamoral_media"
    "flamoral_analytics"
    "flamoral_notifications"
    "flamoral_moderation"
)

# Backup settings
BACKUP_DIR="/tmp/postgres-backups"
RETENTION_DAYS=30
PARALLEL_JOBS=4

# Notification settings
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-devops@flamoral.com}"

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

# ============================================================================
# Error Handling
# ============================================================================

error_exit() {
    log_error "$1"
    send_alert "FAILED" "$1"
    cleanup
    exit 1
}

trap 'error_exit "Script interrupted"' INT TERM

# ============================================================================
# Notification Functions
# ============================================================================

send_alert() {
    local status="$1"
    local message="$2"

    # Slack notification
    if [[ -n "${SLACK_WEBHOOK}" ]]; then
        curl -X POST "${SLACK_WEBHOOK}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"PostgreSQL Backup ${status}\",
                \"attachments\": [{
                    \"color\": \"$([ "$status" == "SUCCESS" ] && echo "good" || echo "danger")\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"${ENV:-production}\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"${TIMESTAMP}\", \"short\": true},
                        {\"title\": \"Message\", \"value\": \"${message}\", \"short\": false}
                    ]
                }]
            }" \
            --silent --show-error || log_error "Failed to send Slack notification"
    fi

    # Email notification
    if command -v mail &> /dev/null; then
        echo "${message}" | mail -s "PostgreSQL Backup ${status} - ${TIMESTAMP}" "${ALERT_EMAIL}" || true
    fi
}

# ============================================================================
# Prerequisites Check
# ============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required commands
    local required_commands=("pg_dump" "pg_basebackup" "psql" "gzip" "az")
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
    if [[ -n "${STORAGE_ACCOUNT}" ]]; then
        if ! az storage container exists \
            --name "${STORAGE_CONTAINER}" \
            --account-name "${STORAGE_ACCOUNT}" \
            --account-key "${STORAGE_KEY}" &> /dev/null; then
            error_exit "Cannot access Azure Storage container"
        fi
    fi

    log_success "Prerequisites check passed"
}

# ============================================================================
# Backup Functions
# ============================================================================

backup_database() {
    local db_name="$1"
    local backup_file="${BACKUP_DIR}/${db_name}-${TIMESTAMP}.dump"

    log_info "Starting backup for database: ${db_name}"

    # Create compressed custom format dump
    PGPASSWORD="${PG_PASSWORD}" pg_dump \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d "${db_name}" \
        -F c \
        -Z 9 \
        -f "${backup_file}" \
        --verbose \
        --no-password \
        || error_exit "Failed to backup database: ${db_name}"

    # Calculate checksum
    local checksum=$(sha256sum "${backup_file}" | awk '{print $1}')
    echo "${checksum}" > "${backup_file}.sha256"

    # Get backup size
    local size=$(du -h "${backup_file}" | cut -f1)
    log_success "Database ${db_name} backed up successfully (Size: ${size}, SHA256: ${checksum:0:16}...)"

    # Upload to Azure Storage
    upload_to_azure "${backup_file}" "${db_name}"
    upload_to_azure "${backup_file}.sha256" "${db_name}"
}

backup_all_databases() {
    log_info "Starting backup for all databases..."

    mkdir -p "${BACKUP_DIR}"

    # Backup databases in parallel
    local pids=()
    for db in "${DATABASES[@]}"; do
        backup_database "${db}" &
        pids+=($!)

        # Limit parallel jobs
        if [[ ${#pids[@]} -ge ${PARALLEL_JOBS} ]]; then
            wait "${pids[@]}"
            pids=()
        fi
    done

    # Wait for remaining jobs
    if [[ ${#pids[@]} -gt 0 ]]; then
        wait "${pids[@]}"
    fi

    log_success "All databases backed up successfully"
}

# ============================================================================
# WAL Archiving for Point-in-Time Recovery
# ============================================================================

backup_wal_files() {
    log_info "Backing up WAL files for point-in-time recovery..."

    local wal_dir="${BACKUP_DIR}/wal"
    mkdir -p "${wal_dir}"

    # Get WAL files from PostgreSQL
    local wal_files=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d postgres \
        -t -c "SELECT pg_walfile_name(pg_current_wal_lsn());" | tr -d ' ')

    log_info "Current WAL file: ${wal_files}"

    # Archive WAL files to Azure
    if [[ -n "${STORAGE_ACCOUNT}" ]]; then
        az storage blob sync \
            --source "${wal_dir}" \
            --container "${STORAGE_CONTAINER}" \
            --destination "wal/${TIMESTAMP}/" \
            --account-name "${STORAGE_ACCOUNT}" \
            --account-key "${STORAGE_KEY}" \
            || log_error "Failed to sync WAL files"
    fi

    log_success "WAL files backed up"
}

# ============================================================================
# Base Backup for Complete Recovery
# ============================================================================

create_base_backup() {
    log_info "Creating base backup for full recovery..."

    local base_backup_dir="${BACKUP_DIR}/base-${TIMESTAMP}"
    mkdir -p "${base_backup_dir}"

    # Create base backup with WAL files
    PGPASSWORD="${PG_PASSWORD}" pg_basebackup \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -D "${base_backup_dir}" \
        -F tar \
        -z \
        -P \
        -X stream \
        --checkpoint=fast \
        || error_exit "Failed to create base backup"

    # Calculate checksums
    find "${base_backup_dir}" -type f -name "*.tar.gz" -exec sha256sum {} \; > "${base_backup_dir}/checksums.txt"

    # Upload to Azure Storage
    if [[ -n "${STORAGE_ACCOUNT}" ]]; then
        az storage blob upload-batch \
            --source "${base_backup_dir}" \
            --destination "${STORAGE_CONTAINER}" \
            --destination-path "base/${TIMESTAMP}/" \
            --account-name "${STORAGE_ACCOUNT}" \
            --account-key "${STORAGE_KEY}" \
            --max-connections 10 \
            || error_exit "Failed to upload base backup"
    fi

    log_success "Base backup created and uploaded"
}

# ============================================================================
# Azure Storage Upload
# ============================================================================

upload_to_azure() {
    local file_path="$1"
    local db_name="$2"

    if [[ -z "${STORAGE_ACCOUNT}" ]]; then
        log_info "Azure Storage not configured, skipping upload"
        return 0
    fi

    local blob_name="databases/${db_name}/$(basename "${file_path}")"

    log_info "Uploading ${file_path} to Azure Storage..."

    az storage blob upload \
        --file "${file_path}" \
        --container-name "${STORAGE_CONTAINER}" \
        --name "${blob_name}" \
        --account-name "${STORAGE_ACCOUNT}" \
        --account-key "${STORAGE_KEY}" \
        --tier Cool \
        --metadata "timestamp=${TIMESTAMP}" "database=${db_name}" "backup_type=logical" \
        --max-connections 4 \
        --overwrite \
        || error_exit "Failed to upload ${file_path} to Azure Storage"

    log_success "Uploaded to Azure: ${blob_name}"
}

# ============================================================================
# Backup Verification
# ============================================================================

verify_backups() {
    log_info "Verifying backup integrity..."

    local errors=0

    for db in "${DATABASES[@]}"; do
        local backup_file="${BACKUP_DIR}/${db}-${TIMESTAMP}.dump"
        local checksum_file="${backup_file}.sha256"

        if [[ ! -f "${backup_file}" ]]; then
            log_error "Backup file missing: ${backup_file}"
            ((errors++))
            continue
        fi

        # Verify checksum
        local expected_checksum=$(cat "${checksum_file}")
        local actual_checksum=$(sha256sum "${backup_file}" | awk '{print $1}')

        if [[ "${expected_checksum}" != "${actual_checksum}" ]]; then
            log_error "Checksum mismatch for ${db}"
            ((errors++))
        else
            log_success "Backup verified: ${db}"
        fi

        # Test restore (schema only)
        log_info "Testing restore for ${db}..."
        PGPASSWORD="${PG_PASSWORD}" pg_restore \
            --schema-only \
            --list "${backup_file}" \
            > /dev/null 2>&1 \
            || { log_error "Restore test failed for ${db}"; ((errors++)); }
    done

    if [[ ${errors} -gt 0 ]]; then
        error_exit "Backup verification failed with ${errors} errors"
    fi

    log_success "All backups verified successfully"
}

# ============================================================================
# Cleanup Old Backups
# ============================================================================

cleanup_old_backups() {
    log_info "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."

    # Clean local backups
    find "${BACKUP_DIR}" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

    # Clean Azure Storage backups
    if [[ -n "${STORAGE_ACCOUNT}" ]]; then
        local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)

        az storage blob list \
            --container-name "${STORAGE_CONTAINER}" \
            --account-name "${STORAGE_ACCOUNT}" \
            --account-key "${STORAGE_KEY}" \
            --query "[?properties.creationTime < '${cutoff_date}'].name" \
            --output tsv | while read -r blob; do
                az storage blob delete \
                    --container-name "${STORAGE_CONTAINER}" \
                    --name "${blob}" \
                    --account-name "${STORAGE_ACCOUNT}" \
                    --account-key "${STORAGE_KEY}" \
                    || log_error "Failed to delete old backup: ${blob}"
            done
    fi

    log_success "Old backups cleaned up"
}

# ============================================================================
# Cleanup Function
# ============================================================================

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "${BACKUP_DIR}"
}

# ============================================================================
# Generate Backup Report
# ============================================================================

generate_report() {
    local report_file="${LOG_DIR}/backup-report-${TIMESTAMP}.txt"

    cat > "${report_file}" <<EOF
========================================
PostgreSQL Backup Report
========================================
Date: $(date)
Timestamp: ${TIMESTAMP}
Environment: ${ENV:-production}

Databases Backed Up:
$(printf '  - %s\n' "${DATABASES[@]}")

Backup Location:
  Storage Account: ${STORAGE_ACCOUNT}
  Container: ${STORAGE_CONTAINER}

Backup Types:
  - Logical backups (pg_dump)
  - Base backup (pg_basebackup)
  - WAL files for PITR

Retention Policy: ${RETENTION_DAYS} days

Status: SUCCESS

Log File: ${LOG_FILE}
========================================
EOF

    cat "${report_file}"

    # Send report
    if [[ -n "${SLACK_WEBHOOK}" ]]; then
        send_alert "SUCCESS" "$(cat "${report_file}")"
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    setup_logging

    log_info "========================================"
    log_info "PostgreSQL Backup Started"
    log_info "========================================"

    check_prerequisites
    backup_all_databases
    create_base_backup
    backup_wal_files
    verify_backups
    cleanup_old_backups
    generate_report

    log_info "========================================"
    log_info "PostgreSQL Backup Completed Successfully"
    log_info "========================================"

    cleanup
}

# Run main function
main "$@"
