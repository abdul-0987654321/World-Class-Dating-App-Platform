#!/bin/bash
# =============================================================================
# Flamoral Platform - Database Backup Script
# =============================================================================
# Purpose: Create PostgreSQL database backups, upload to Azure Blob Storage,
#          verify integrity, and send notifications
# Usage: ./database-backup.sh [OPTIONS]
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/tmp/database-backups}"
LOG_DIR="${SCRIPT_DIR}/../../logs/database-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/backup_${TIMESTAMP}.log"

# Database Configuration
DB_HOST="${DB_HOST:-flamoral-prod-postgres.postgres.database.azure.com}"
DB_USER="${DB_USER:-flamoraladmin}"
DB_PASSWORD="${DB_PASSWORD:-}" # Set via environment or Key Vault
DB_NAME="${DB_NAME:-flamoral}"
DB_PORT="${DB_PORT:-5432}"

# Backup Configuration
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_TYPE="${BACKUP_TYPE:-full}" # full, incremental, or emergency

# Azure Storage Configuration
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-flamoralprod}"
STORAGE_CONTAINER="${STORAGE_CONTAINER:-database-backups}"
STORAGE_ACCOUNT_KEY="${STORAGE_ACCOUNT_KEY:-}" # Set via environment or Key Vault

# Notification Configuration
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-ops@flamoral.com}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}" # Slack/Teams webhook
SEND_NOTIFICATIONS="${SEND_NOTIFICATIONS:-true}"

# Compression
COMPRESSION="${COMPRESSION:-gzip}" # gzip, bzip2, or none
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"

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

    # Send failure notification
    send_notification "FAILED" "$1"

    # Cleanup partial backup
    cleanup_failed_backup

    exit 1
}

trap 'error_exit "Script interrupted. Check logs at ${LOG_FILE}"' INT TERM

# =============================================================================
# Notification Functions
# =============================================================================
send_notification() {
    local status=$1
    local message=$2

    if [[ "${SEND_NOTIFICATIONS}" != "true" ]]; then
        return 0
    fi

    local subject="Database Backup ${status}: ${DB_NAME}"
    local body="${message}\n\nTimestamp: $(date)\nDatabase: ${DB_NAME}\nHost: ${DB_HOST}\nBackup Type: ${BACKUP_TYPE}"

    # Slack/Teams webhook notification
    if [[ -n "${NOTIFICATION_WEBHOOK}" ]]; then
        local color="good"
        if [[ "${status}" == "FAILED" ]]; then
            color="danger"
        elif [[ "${status}" == "WARNING" ]]; then
            color="warning"
        fi

        local payload=$(cat <<EOF
{
  "attachments": [{
    "color": "${color}",
    "title": "${subject}",
    "text": "${body}",
    "footer": "Flamoral Database Backup",
    "ts": $(date +%s)
  }]
}
EOF
)
        curl -X POST -H 'Content-type: application/json' \
            --data "${payload}" \
            "${NOTIFICATION_WEBHOOK}" &>> "${LOG_FILE}" || log_warning "Failed to send webhook notification"
    fi

    log_info "Notification sent: ${subject}"
}

# =============================================================================
# Prerequisite Checks
# =============================================================================
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required tools
    local required_tools=("pg_dump" "psql")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool not found: $tool. Install postgresql-client package."
        fi
    done

    # Check Azure CLI for blob upload
    if ! command -v az &> /dev/null; then
        log_warning "Azure CLI not found. Backups will not be uploaded to Azure Storage."
    fi

    # Check database password
    if [[ -z "${DB_PASSWORD}" ]]; then
        # Try to get from environment
        if [[ -n "${PGPASSWORD}" ]]; then
            DB_PASSWORD="${PGPASSWORD}"
        else
            error_exit "Database password not set. Set DB_PASSWORD or PGPASSWORD environment variable."
        fi
    fi

    # Test database connectivity
    log_info "Testing database connectivity..."
    export PGPASSWORD="${DB_PASSWORD}"

    if ! psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" \
        -c "SELECT 1" &>> "${LOG_FILE}"; then
        error_exit "Failed to connect to database"
    fi

    log_success "Database connectivity test passed"
    log_success "Prerequisites check passed"
}

# =============================================================================
# Backup Directory Setup
# =============================================================================
setup_backup_dirs() {
    local backup_date=$(date +%Y%m%d_%H%M%S)
    export BACKUP_DIR="${BACKUP_ROOT}/${backup_date}"

    # Create backup directories
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${LOG_DIR}"

    log_info "Backup directory: ${BACKUP_DIR}"
}

# =============================================================================
# Database Information
# =============================================================================
get_database_info() {
    log_info "Gathering database information..."

    export PGPASSWORD="${DB_PASSWORD}"

    # Get database size
    local db_size=$(psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" \
        -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" 2>/dev/null || echo "Unknown")

    # Get table count
    local table_count=$(psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" \
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "Unknown")

    # Get row counts for major tables
    log_info "Database size: ${db_size}"
    log_info "Table count: ${table_count}"

    # Store metadata
    cat > "${BACKUP_DIR}/metadata.txt" << EOF
Database Backup Metadata
========================
Timestamp: $(date)
Database Host: ${DB_HOST}
Database Name: ${DB_NAME}
Database Size: ${db_size}
Table Count: ${table_count}
Backup Type: ${BACKUP_TYPE}
Compression: ${COMPRESSION}
EOF

    log_success "Database information gathered"
}

# =============================================================================
# Perform Database Backup
# =============================================================================
perform_backup() {
    log_info "Starting ${BACKUP_TYPE} database backup..."

    local backup_file="${BACKUP_DIR}/${DB_NAME}_${BACKUP_TYPE}_${TIMESTAMP}.sql"
    local start_time=$(date +%s)

    export PGPASSWORD="${DB_PASSWORD}"

    # Perform backup based on type
    case ${BACKUP_TYPE} in
        full)
            log_info "Performing full backup..."
            if ! pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" \
                --verbose \
                --format=plain \
                --no-owner \
                --no-acl \
                --file="${backup_file}" &>> "${LOG_FILE}"; then
                error_exit "Database backup failed"
            fi
            ;;

        schema-only)
            log_info "Performing schema-only backup..."
            if ! pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" \
                --verbose \
                --schema-only \
                --no-owner \
                --no-acl \
                --file="${backup_file}" &>> "${LOG_FILE}"; then
                error_exit "Schema backup failed"
            fi
            ;;

        data-only)
            log_info "Performing data-only backup..."
            if ! pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" \
                --verbose \
                --data-only \
                --no-owner \
                --no-acl \
                --file="${backup_file}" &>> "${LOG_FILE}"; then
                error_exit "Data backup failed"
            fi
            ;;

        emergency)
            log_info "Performing emergency backup (custom format for faster restore)..."
            backup_file="${BACKUP_DIR}/${DB_NAME}_${BACKUP_TYPE}_${TIMESTAMP}.dump"
            if ! pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" \
                --verbose \
                --format=custom \
                --compress=9 \
                --file="${backup_file}" &>> "${LOG_FILE}"; then
                error_exit "Emergency backup failed"
            fi
            ;;

        *)
            error_exit "Unknown backup type: ${BACKUP_TYPE}"
            ;;
    esac

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_success "Backup completed in ${duration} seconds"

    # Store backup file path for later use
    export BACKUP_FILE="${backup_file}"
}

# =============================================================================
# Compress Backup
# =============================================================================
compress_backup() {
    if [[ "${COMPRESSION}" == "none" ]]; then
        log_info "Skipping compression (none specified)"
        return 0
    fi

    if [[ "${BACKUP_TYPE}" == "emergency" ]]; then
        log_info "Skipping compression (emergency backup already compressed)"
        return 0
    fi

    log_info "Compressing backup with ${COMPRESSION}..."

    local start_time=$(date +%s)

    case ${COMPRESSION} in
        gzip)
            if ! gzip -${COMPRESSION_LEVEL} "${BACKUP_FILE}" &>> "${LOG_FILE}"; then
                error_exit "Compression failed"
            fi
            BACKUP_FILE="${BACKUP_FILE}.gz"
            ;;

        bzip2)
            if ! bzip2 -${COMPRESSION_LEVEL} "${BACKUP_FILE}" &>> "${LOG_FILE}"; then
                error_exit "Compression failed"
            fi
            BACKUP_FILE="${BACKUP_FILE}.bz2"
            ;;

        *)
            log_warning "Unknown compression type: ${COMPRESSION}. Skipping compression."
            return 0
            ;;
    esac

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Get compressed size
    local compressed_size=$(du -h "${BACKUP_FILE}" | awk '{print $1}')

    log_success "Compression completed in ${duration} seconds"
    log_info "Compressed size: ${compressed_size}"
}

# =============================================================================
# Verify Backup Integrity
# =============================================================================
verify_backup() {
    log_info "Verifying backup integrity..."

    # Check file exists and is not empty
    if [[ ! -f "${BACKUP_FILE}" ]]; then
        error_exit "Backup file not found: ${BACKUP_FILE}"
    fi

    local file_size=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")

    if [[ ${file_size} -eq 0 ]]; then
        error_exit "Backup file is empty"
    fi

    log_info "Backup file size: $(du -h "${BACKUP_FILE}" | awk '{print $1}')"

    # Calculate checksum
    local checksum=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
    echo "${checksum}" > "${BACKUP_FILE}.sha256"

    log_info "Backup checksum: ${checksum}"

    # Verify compressed file integrity
    if [[ "${BACKUP_FILE}" =~ \.gz$ ]]; then
        if ! gzip -t "${BACKUP_FILE}" &>> "${LOG_FILE}"; then
            error_exit "Compressed backup file is corrupted"
        fi
        log_success "Gzip integrity check passed"
    elif [[ "${BACKUP_FILE}" =~ \.bz2$ ]]; then
        if ! bzip2 -t "${BACKUP_FILE}" &>> "${LOG_FILE}"; then
            error_exit "Compressed backup file is corrupted"
        fi
        log_success "Bzip2 integrity check passed"
    fi

    log_success "Backup integrity verified"
}

# =============================================================================
# Upload to Azure Blob Storage
# =============================================================================
upload_to_azure() {
    if ! command -v az &> /dev/null; then
        log_warning "Azure CLI not found. Skipping upload to Azure Storage."
        return 0
    fi

    log_info "Uploading backup to Azure Blob Storage..."

    # Check Azure login
    if ! az account show &> /dev/null; then
        log_warning "Not logged in to Azure. Skipping upload."
        return 0
    fi

    local blob_name="$(basename ${BACKUP_FILE})"
    local start_time=$(date +%s)

    # Upload backup file
    if ! az storage blob upload \
        --account-name "${STORAGE_ACCOUNT}" \
        --container-name "${STORAGE_CONTAINER}" \
        --name "${blob_name}" \
        --file "${BACKUP_FILE}" \
        --overwrite \
        --output none &>> "${LOG_FILE}"; then
        log_error "Failed to upload backup to Azure Storage"
        send_notification "WARNING" "Backup completed but upload to Azure Storage failed"
        return 1
    fi

    # Upload checksum file
    az storage blob upload \
        --account-name "${STORAGE_ACCOUNT}" \
        --container-name "${STORAGE_CONTAINER}" \
        --name "${blob_name}.sha256" \
        --file "${BACKUP_FILE}.sha256" \
        --overwrite \
        --output none &>> "${LOG_FILE}" || log_warning "Failed to upload checksum file"

    # Upload metadata file
    az storage blob upload \
        --account-name "${STORAGE_ACCOUNT}" \
        --container-name "${STORAGE_CONTAINER}" \
        --name "$(basename ${BACKUP_DIR})/metadata.txt" \
        --file "${BACKUP_DIR}/metadata.txt" \
        --overwrite \
        --output none &>> "${LOG_FILE}" || log_warning "Failed to upload metadata file"

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_success "Upload completed in ${duration} seconds"
    log_info "Azure Blob URL: https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/${blob_name}"
}

# =============================================================================
# Cleanup Old Backups
# =============================================================================
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."

    # Cleanup local backups
    local deleted_count=0
    while IFS= read -r old_backup; do
        log_info "Removing old backup: ${old_backup}"
        rm -rf "${old_backup}"
        deleted_count=$((deleted_count + 1))
    done < <(find "${BACKUP_ROOT}" -maxdepth 1 -type d -mtime +${BACKUP_RETENTION_DAYS} 2>/dev/null)

    if [[ ${deleted_count} -gt 0 ]]; then
        log_success "Removed ${deleted_count} old local backup(s)"
    else
        log_info "No old local backups to remove"
    fi

    # Cleanup Azure Storage backups
    if command -v az &> /dev/null && az account show &> /dev/null; then
        log_info "Cleaning up old backups from Azure Storage..."

        local cutoff_date=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y-%m-%d 2>/dev/null || date -v-${BACKUP_RETENTION_DAYS}d +%Y-%m-%d 2>/dev/null || echo "")

        if [[ -n "${cutoff_date}" ]]; then
            # List and delete old blobs
            az storage blob list \
                --account-name "${STORAGE_ACCOUNT}" \
                --container-name "${STORAGE_CONTAINER}" \
                --query "[?properties.creationTime<'${cutoff_date}'].name" \
                --output tsv 2>/dev/null | while read -r blob_name; do
                if [[ -n "${blob_name}" ]]; then
                    log_info "Deleting old Azure blob: ${blob_name}"
                    az storage blob delete \
                        --account-name "${STORAGE_ACCOUNT}" \
                        --container-name "${STORAGE_CONTAINER}" \
                        --name "${blob_name}" \
                        --output none &>> "${LOG_FILE}" || log_warning "Failed to delete blob: ${blob_name}"
                fi
            done
        fi
    fi

    log_success "Cleanup completed"
}

# =============================================================================
# Cleanup Failed Backup
# =============================================================================
cleanup_failed_backup() {
    if [[ -n "${BACKUP_DIR}" ]] && [[ -d "${BACKUP_DIR}" ]]; then
        log_info "Cleaning up failed backup: ${BACKUP_DIR}"
        rm -rf "${BACKUP_DIR}"
    fi
}

# =============================================================================
# Generate Backup Report
# =============================================================================
generate_report() {
    log_info "Generating backup report..."

    local report_file="${BACKUP_DIR}/backup_report.txt"
    local backup_size=$(du -h "${BACKUP_FILE}" | awk '{print $1}')

    cat > "${report_file}" << EOF
===============================================================================
Flamoral Database Backup Report
===============================================================================
Backup Date: $(date)
Backup Type: ${BACKUP_TYPE}
Database: ${DB_NAME}
Database Host: ${DB_HOST}

===============================================================================
BACKUP DETAILS
===============================================================================
Backup File: $(basename ${BACKUP_FILE})
Backup Size: ${backup_size}
Compression: ${COMPRESSION}
Checksum: $(cat ${BACKUP_FILE}.sha256 2>/dev/null || echo "N/A")

===============================================================================
AZURE STORAGE
===============================================================================
Storage Account: ${STORAGE_ACCOUNT}
Container: ${STORAGE_CONTAINER}
Blob URL: https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/$(basename ${BACKUP_FILE})

===============================================================================
RESTORATION
===============================================================================
To restore this backup:

1. Download from Azure Storage:
   az storage blob download \\
     --account-name ${STORAGE_ACCOUNT} \\
     --container-name ${STORAGE_CONTAINER} \\
     --name $(basename ${BACKUP_FILE}) \\
     --file ./$(basename ${BACKUP_FILE})

2. Verify checksum:
   sha256sum $(basename ${BACKUP_FILE})
   # Compare with: $(cat ${BACKUP_FILE}.sha256 2>/dev/null || echo "N/A")

3. Decompress (if compressed):
   $(if [[ "${BACKUP_FILE}" =~ \.gz$ ]]; then echo "gunzip $(basename ${BACKUP_FILE})"; elif [[ "${BACKUP_FILE}" =~ \.bz2$ ]]; then echo "bunzip2 $(basename ${BACKUP_FILE})"; else echo "# Not compressed"; fi)

4. Restore database:
   $(if [[ "${BACKUP_TYPE}" == "emergency" ]]; then
       echo "pg_restore -h <host> -U <user> -d <database> --clean --if-exists $(basename ${BACKUP_FILE})"
   else
       echo "psql -h <host> -U <user> -d <database> < $(basename ${BACKUP_FILE} | sed 's/\.gz$//' | sed 's/\.bz2$//')"
   fi)

===============================================================================
NOTES
===============================================================================
- Always verify checksum before restoration
- Test restore in non-production environment first
- Ensure database version compatibility

===============================================================================
EOF

    log_success "Backup report generated: ${report_file}"
}

# =============================================================================
# Usage Information
# =============================================================================
usage() {
    cat << EOF
Flamoral Platform - Database Backup Script

Usage: $0 [OPTIONS]

OPTIONS:
    --type <type>       Backup type: full, schema-only, data-only, emergency
                        Default: full
    --emergency         Shortcut for --type emergency
    --no-upload         Skip upload to Azure Storage
    --no-cleanup        Skip cleanup of old backups
    --retention <days>  Backup retention in days (default: 30)
    --help              Show this help message

ENVIRONMENT VARIABLES:
    DB_HOST             Database host
    DB_USER             Database user
    DB_PASSWORD         Database password (or use PGPASSWORD)
    DB_NAME             Database name
    STORAGE_ACCOUNT     Azure storage account name
    STORAGE_CONTAINER   Azure storage container name
    NOTIFICATION_WEBHOOK  Slack/Teams webhook URL

EXAMPLES:
    # Full backup (default)
    $0

    # Emergency backup (custom format, faster restore)
    $0 --emergency

    # Schema-only backup
    $0 --type schema-only

    # Backup without uploading to Azure
    $0 --no-upload

    # Backup with custom retention
    $0 --retention 60

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
    local upload_to_azure=true
    local cleanup_old=true

    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            --emergency)
                BACKUP_TYPE="emergency"
                shift
                ;;
            --no-upload)
                upload_to_azure=false
                shift
                ;;
            --no-cleanup)
                cleanup_old=false
                shift
                ;;
            --retention)
                BACKUP_RETENTION_DAYS="$2"
                shift 2
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

    # Setup
    setup_backup_dirs

    log_info "=== Flamoral Database Backup Script ==="
    log_info "Started at: $(date)"
    log_info "Backup type: ${BACKUP_TYPE}"
    log_info "Log file: ${LOG_FILE}"

    # Execute backup workflow
    check_prerequisites
    get_database_info
    perform_backup
    compress_backup
    verify_backup

    if [[ "${upload_to_azure}" == true ]]; then
        upload_to_azure
    fi

    generate_report

    if [[ "${cleanup_old}" == true ]]; then
        cleanup_old_backups
    fi

    # Success notification
    local backup_size=$(du -h "${BACKUP_FILE}" | awk '{print $1}')
    send_notification "SUCCESS" "Database backup completed successfully. Size: ${backup_size}"

    log_success "=== Backup completed successfully ==="
    log_info "Backup file: ${BACKUP_FILE}"
    log_info "Backup size: ${backup_size}"
    log_info "Completed at: $(date)"
    log_info "Report: ${BACKUP_DIR}/backup_report.txt"
}

# =============================================================================
# Script Entry Point
# =============================================================================
main "$@"
