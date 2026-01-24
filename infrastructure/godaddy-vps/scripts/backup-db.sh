#!/bin/bash
#===============================================================================
# Flamoral Database Backup Script
# Creates PostgreSQL backups and uploads them to S3 or local storage
#
# Usage:
#   ./backup-db.sh              # Create backup with default settings
#   ./backup-db.sh --upload-s3  # Create backup and upload to S3
#   ./backup-db.sh --local-only # Create backup locally only
#   ./backup-db.sh --schema     # Backup schema only (no data)
#
# Recommended cron schedule:
#   # Daily full backup at 2 AM
#   0 2 * * * /home/flamoral/app/infrastructure/godaddy-vps/scripts/backup-db.sh --upload-s3
#
#   # Hourly incremental backup
#   0 * * * * /home/flamoral/app/infrastructure/godaddy-vps/scripts/backup-db.sh --local-only
#
# Author: Flamoral DevOps Team
# Version: 1.0.0
#===============================================================================

set -euo pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
# Database settings
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-flamoral_production}"
DB_USER="${DB_USER:-flamoral}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

# Backup settings
BACKUP_DIR="/var/backups/flamoral/database"
LOG_DIR="/var/log/flamoral"
BACKUP_LOG="${LOG_DIR}/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_TODAY=$(date +%Y%m%d)

# S3 settings
S3_BUCKET="${S3_BUCKET:-flamoral-backups}"
S3_PREFIX="${S3_PREFIX:-database}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Retention settings
LOCAL_RETENTION_DAYS=${LOCAL_RETENTION_DAYS:-7}
S3_RETENTION_DAYS=${S3_RETENTION_DAYS:-30}

# Notification settings
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    echo -e "[$(timestamp)] $1" | tee -a "${BACKUP_LOG}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "[INFO] $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "[SUCCESS] $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "[WARNING] $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "[ERROR] $1"
}

notify_slack() {
    local message="$1"
    local color="${2:-good}"

    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        curl -s -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"text\": \"${message}\",
                    \"footer\": \"Flamoral DB Backup\",
                    \"ts\": $(date +%s)
                }]
            }" > /dev/null 2>&1 || true
    fi
}

format_size() {
    local size=$1
    if [[ ${size} -ge 1073741824 ]]; then
        echo "$(echo "scale=2; ${size}/1073741824" | bc)GB"
    elif [[ ${size} -ge 1048576 ]]; then
        echo "$(echo "scale=2; ${size}/1048576" | bc)MB"
    elif [[ ${size} -ge 1024 ]]; then
        echo "$(echo "scale=2; ${size}/1024" | bc)KB"
    else
        echo "${size}B"
    fi
}

check_prerequisites() {
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump command not found. Install PostgreSQL client tools."
        exit 1
    fi

    # Check if gzip is available
    if ! command -v gzip &> /dev/null; then
        log_error "gzip command not found."
        exit 1
    fi

    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${LOG_DIR}"

    # Test database connection
    export PGPASSWORD="${DB_PASSWORD}"
    if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c '\q' 2>/dev/null; then
        log_error "Cannot connect to database. Check credentials and connectivity."
        exit 1
    fi

    log_info "Prerequisites check passed"
}

#-------------------------------------------------------------------------------
# Backup Functions
#-------------------------------------------------------------------------------
create_full_backup() {
    local backup_file="${BACKUP_DIR}/flamoral_full_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"

    log_info "Creating full database backup..."

    export PGPASSWORD="${DB_PASSWORD}"

    # Create backup with pg_dump
    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --verbose \
        --format=plain \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        --create \
        2>> "${BACKUP_LOG}" \
        > "${backup_file}"

    local backup_status=$?

    if [[ ${backup_status} -ne 0 ]]; then
        log_error "pg_dump failed with exit code ${backup_status}"
        rm -f "${backup_file}"
        return 1
    fi

    # Compress backup
    log_info "Compressing backup..."
    gzip -9 "${backup_file}"

    local file_size=$(stat -c%s "${compressed_file}" 2>/dev/null || stat -f%z "${compressed_file}" 2>/dev/null)
    local formatted_size=$(format_size ${file_size})

    log_success "Full backup created: ${compressed_file} (${formatted_size})"
    echo "${compressed_file}"
}

create_schema_backup() {
    local backup_file="${BACKUP_DIR}/flamoral_schema_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"

    log_info "Creating schema-only backup..."

    export PGPASSWORD="${DB_PASSWORD}"

    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --schema-only \
        --no-owner \
        --no-acl \
        2>> "${BACKUP_LOG}" \
        > "${backup_file}"

    gzip -9 "${backup_file}"

    log_success "Schema backup created: ${compressed_file}"
    echo "${compressed_file}"
}

create_data_backup() {
    local backup_file="${BACKUP_DIR}/flamoral_data_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"

    log_info "Creating data-only backup..."

    export PGPASSWORD="${DB_PASSWORD}"

    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --data-only \
        --no-owner \
        --no-acl \
        2>> "${BACKUP_LOG}" \
        > "${backup_file}"

    gzip -9 "${backup_file}"

    log_success "Data backup created: ${compressed_file}"
    echo "${compressed_file}"
}

create_custom_backup() {
    local backup_file="${BACKUP_DIR}/flamoral_custom_${TIMESTAMP}.dump"

    log_info "Creating custom format backup (for pg_restore)..."

    export PGPASSWORD="${DB_PASSWORD}"

    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-acl \
        2>> "${BACKUP_LOG}" \
        > "${backup_file}"

    local file_size=$(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}" 2>/dev/null)
    local formatted_size=$(format_size ${file_size})

    log_success "Custom backup created: ${backup_file} (${formatted_size})"
    echo "${backup_file}"
}

#-------------------------------------------------------------------------------
# S3 Upload Functions
#-------------------------------------------------------------------------------
upload_to_s3() {
    local file_path="$1"
    local filename=$(basename "${file_path}")
    local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${DATE_TODAY}/${filename}"

    log_info "Uploading ${filename} to S3..."

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Cannot upload to S3."
        return 1
    fi

    # Upload with server-side encryption
    aws s3 cp "${file_path}" "${s3_path}" \
        --region "${AWS_REGION}" \
        --storage-class STANDARD_IA \
        --sse AES256 \
        --only-show-errors

    local upload_status=$?

    if [[ ${upload_status} -eq 0 ]]; then
        log_success "Uploaded to ${s3_path}"
        return 0
    else
        log_error "Failed to upload to S3"
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Retention Management
#-------------------------------------------------------------------------------
cleanup_local_backups() {
    log_info "Cleaning up local backups older than ${LOCAL_RETENTION_DAYS} days..."

    local deleted_count=0

    while IFS= read -r -d '' file; do
        rm -f "${file}"
        ((deleted_count++))
        log_info "Deleted: $(basename "${file}")"
    done < <(find "${BACKUP_DIR}" -name "flamoral_*.gz" -o -name "flamoral_*.dump" -mtime +${LOCAL_RETENTION_DAYS} -print0 2>/dev/null)

    if [[ ${deleted_count} -gt 0 ]]; then
        log_success "Deleted ${deleted_count} old backup(s)"
    else
        log_info "No old backups to delete"
    fi
}

cleanup_s3_backups() {
    log_info "Cleaning up S3 backups older than ${S3_RETENTION_DAYS} days..."

    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not found. Skipping S3 cleanup."
        return
    fi

    local cutoff_date=$(date -d "-${S3_RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${S3_RETENTION_DAYS}d +%Y-%m-%d)

    # List and delete old objects
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" \
        --region "${AWS_REGION}" \
        --recursive 2>/dev/null | \
    while read -r line; do
        local file_date=$(echo "${line}" | awk '{print $1}')
        local file_path=$(echo "${line}" | awk '{print $4}')

        if [[ "${file_date}" < "${cutoff_date}" ]]; then
            log_info "Deleting old S3 backup: ${file_path}"
            aws s3 rm "s3://${S3_BUCKET}/${file_path}" --region "${AWS_REGION}" 2>/dev/null || true
        fi
    done

    log_success "S3 cleanup completed"
}

#-------------------------------------------------------------------------------
# Verification
#-------------------------------------------------------------------------------
verify_backup() {
    local backup_file="$1"

    log_info "Verifying backup integrity..."

    # Check if file exists and is not empty
    if [[ ! -f "${backup_file}" ]]; then
        log_error "Backup file not found: ${backup_file}"
        return 1
    fi

    local file_size=$(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}" 2>/dev/null)
    if [[ ${file_size} -lt 1000 ]]; then
        log_error "Backup file is suspiciously small: ${file_size} bytes"
        return 1
    fi

    # For gzipped files, verify gzip integrity
    if [[ "${backup_file}" == *.gz ]]; then
        if gzip -t "${backup_file}" 2>/dev/null; then
            log_success "Gzip integrity check passed"
        else
            log_error "Gzip integrity check failed"
            return 1
        fi
    fi

    # For custom format, verify with pg_restore
    if [[ "${backup_file}" == *.dump ]]; then
        if pg_restore --list "${backup_file}" > /dev/null 2>&1; then
            log_success "pg_restore integrity check passed"
        else
            log_error "pg_restore integrity check failed"
            return 1
        fi
    fi

    log_success "Backup verification passed"
    return 0
}

#-------------------------------------------------------------------------------
# Generate Backup Report
#-------------------------------------------------------------------------------
generate_report() {
    local backup_file="$1"
    local start_time="$2"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local file_size=$(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}" 2>/dev/null)
    local formatted_size=$(format_size ${file_size})

    # Get database statistics
    export PGPASSWORD="${DB_PASSWORD}"
    local db_size=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
        "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" 2>/dev/null | tr -d ' ')
    local table_count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

    cat << EOF

================================================================================
                        FLAMORAL DATABASE BACKUP REPORT
================================================================================

Timestamp:      $(date)
Duration:       ${duration} seconds
Status:         SUCCESS

Database:
  Host:         ${DB_HOST}
  Name:         ${DB_NAME}
  Size:         ${db_size}
  Tables:       ${table_count}

Backup:
  File:         $(basename "${backup_file}")
  Size:         ${formatted_size}
  Location:     ${BACKUP_DIR}

Retention:
  Local:        ${LOCAL_RETENTION_DAYS} days
  S3:           ${S3_RETENTION_DAYS} days

================================================================================
EOF
}

#-------------------------------------------------------------------------------
# Main Functions
#-------------------------------------------------------------------------------
backup_with_s3() {
    local start_time=$(date +%s)

    log_info "Starting database backup with S3 upload..."
    notify_slack "Starting database backup..." "warning"

    check_prerequisites

    # Create full backup
    local backup_file=$(create_full_backup)

    if [[ -z "${backup_file}" ]]; then
        log_error "Backup creation failed"
        notify_slack "Database backup FAILED" "danger"
        exit 1
    fi

    # Verify backup
    if ! verify_backup "${backup_file}"; then
        log_error "Backup verification failed"
        notify_slack "Database backup verification FAILED" "danger"
        exit 1
    fi

    # Also create custom format backup for faster restores
    local custom_backup=$(create_custom_backup)

    # Upload to S3
    if upload_to_s3 "${backup_file}"; then
        upload_to_s3 "${custom_backup}" || true
    fi

    # Cleanup old backups
    cleanup_local_backups
    cleanup_s3_backups

    # Generate report
    generate_report "${backup_file}" "${start_time}"

    log_success "Backup completed successfully"
    notify_slack "Database backup completed successfully. Size: $(format_size $(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}"))" "good"
}

backup_local_only() {
    local start_time=$(date +%s)

    log_info "Starting local database backup..."

    check_prerequisites

    local backup_file=$(create_full_backup)

    if [[ -z "${backup_file}" ]]; then
        log_error "Backup creation failed"
        exit 1
    fi

    verify_backup "${backup_file}"
    cleanup_local_backups

    generate_report "${backup_file}" "${start_time}"

    log_success "Local backup completed"
}

backup_schema_only() {
    log_info "Starting schema-only backup..."

    check_prerequisites

    local backup_file=$(create_schema_backup)
    verify_backup "${backup_file}"

    log_success "Schema backup completed: ${backup_file}"
}

#-------------------------------------------------------------------------------
# List Existing Backups
#-------------------------------------------------------------------------------
list_backups() {
    echo ""
    echo "=== Local Backups ==="
    echo ""
    if [[ -d "${BACKUP_DIR}" ]]; then
        ls -lh "${BACKUP_DIR}"/flamoral_*.{gz,dump} 2>/dev/null || echo "No local backups found"
    fi

    echo ""
    echo "=== S3 Backups ==="
    echo ""
    if command -v aws &> /dev/null; then
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive --human-readable 2>/dev/null || echo "Could not list S3 backups"
    else
        echo "AWS CLI not available"
    fi
}

#-------------------------------------------------------------------------------
# Help
#-------------------------------------------------------------------------------
show_help() {
    cat << EOF
Flamoral Database Backup Script

Usage: $0 [OPTIONS]

Options:
    --upload-s3     Create backup and upload to S3 (default)
    --local-only    Create backup locally only
    --schema        Backup schema only (no data)
    --custom        Create custom format backup only
    --list          List existing backups
    --verify FILE   Verify a backup file
    --help          Show this help message

Environment Variables:
    DB_HOST                 Database host (default: localhost)
    DB_PORT                 Database port (default: 5432)
    DB_NAME                 Database name (default: flamoral_production)
    DB_USER                 Database user (default: flamoral)
    POSTGRES_PASSWORD       Database password
    S3_BUCKET               S3 bucket name (default: flamoral-backups)
    S3_PREFIX               S3 prefix/folder (default: database)
    AWS_REGION              AWS region (default: us-east-1)
    LOCAL_RETENTION_DAYS    Local backup retention (default: 7)
    S3_RETENTION_DAYS       S3 backup retention (default: 30)
    SLACK_WEBHOOK_URL       Slack webhook for notifications

Examples:
    $0                              # Full backup with S3 upload
    $0 --local-only                 # Local backup only
    POSTGRES_PASSWORD=secret $0     # With password

Cron Examples:
    # Daily backup at 2 AM
    0 2 * * * /path/to/backup-db.sh --upload-s3

    # Hourly local backup
    0 * * * * /path/to/backup-db.sh --local-only

EOF
}

#-------------------------------------------------------------------------------
# Main Entry Point
#-------------------------------------------------------------------------------
main() {
    case "${1:-}" in
        --upload-s3|"")
            backup_with_s3
            ;;
        --local-only)
            backup_local_only
            ;;
        --schema)
            backup_schema_only
            ;;
        --custom)
            check_prerequisites
            create_custom_backup
            ;;
        --list)
            list_backups
            ;;
        --verify)
            if [[ -n "${2:-}" ]]; then
                verify_backup "$2"
            else
                log_error "Please provide a file to verify"
                exit 1
            fi
            ;;
        --help|-h)
            show_help
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
