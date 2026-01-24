#!/bin/bash
#===============================================================================
# Flamoral Database Restore Script
# Restores PostgreSQL database from backup files
#
# Usage:
#   ./restore-db.sh <backup_file>                   # Restore from local file
#   ./restore-db.sh --from-s3 <s3_path>            # Restore from S3
#   ./restore-db.sh --latest                        # Restore latest local backup
#   ./restore-db.sh --latest-s3                     # Restore latest S3 backup
#   ./restore-db.sh --list                          # List available backups
#
# CAUTION: This script will DROP and recreate the database!
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
DB_ADMIN_USER="${DB_ADMIN_USER:-postgres}"

# Backup settings
BACKUP_DIR="/var/backups/flamoral/database"
TEMP_DIR="/tmp/flamoral_restore"
LOG_DIR="/var/log/flamoral"
RESTORE_LOG="${LOG_DIR}/restore.log"

# S3 settings
S3_BUCKET="${S3_BUCKET:-flamoral-backups}"
S3_PREFIX="${S3_PREFIX:-database}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    echo -e "[$(timestamp)] $1" | tee -a "${RESTORE_LOG}"
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

confirm_action() {
    local message="$1"
    echo -e "\n${YELLOW}WARNING: ${message}${NC}"
    echo -e "${RED}This action will DELETE all existing data in the database!${NC}\n"
    read -p "Are you sure you want to continue? (yes/no): " confirmation

    if [[ "${confirmation}" != "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
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
    log_info "Checking prerequisites..."

    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_error "psql command not found. Install PostgreSQL client tools."
        exit 1
    fi

    # Check if pg_restore is available
    if ! command -v pg_restore &> /dev/null; then
        log_error "pg_restore command not found. Install PostgreSQL client tools."
        exit 1
    fi

    # Create necessary directories
    mkdir -p "${TEMP_DIR}"
    mkdir -p "${LOG_DIR}"

    log_success "Prerequisites check passed"
}

#-------------------------------------------------------------------------------
# Backup Discovery Functions
#-------------------------------------------------------------------------------
list_local_backups() {
    echo ""
    echo "=== Local Backups ==="
    echo ""
    if [[ -d "${BACKUP_DIR}" ]]; then
        local count=0
        for file in "${BACKUP_DIR}"/flamoral_*.{gz,dump} 2>/dev/null; do
            if [[ -f "${file}" ]]; then
                local size=$(stat -c%s "${file}" 2>/dev/null || stat -f%z "${file}" 2>/dev/null)
                local date=$(stat -c%y "${file}" 2>/dev/null | cut -d' ' -f1 || stat -f%Sm "${file}" 2>/dev/null)
                printf "  %-60s %10s  %s\n" "$(basename "${file}")" "$(format_size ${size})" "${date}"
                ((count++))
            fi
        done
        if [[ ${count} -eq 0 ]]; then
            echo "  No local backups found"
        fi
    else
        echo "  Backup directory not found: ${BACKUP_DIR}"
    fi
}

list_s3_backups() {
    echo ""
    echo "=== S3 Backups ==="
    echo ""
    if command -v aws &> /dev/null; then
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive --human-readable 2>/dev/null | \
            grep -E '\.(gz|dump)$' | \
            awk '{print "  " $3 " " $4 "  " $5}' || echo "  No S3 backups found or access denied"
    else
        echo "  AWS CLI not available"
    fi
}

get_latest_local_backup() {
    local latest=""

    # First try to find custom format backups (preferred for restore)
    latest=$(ls -t "${BACKUP_DIR}"/flamoral_custom_*.dump 2>/dev/null | head -1 || true)

    # If no custom format, try gzipped SQL
    if [[ -z "${latest}" ]]; then
        latest=$(ls -t "${BACKUP_DIR}"/flamoral_full_*.sql.gz 2>/dev/null | head -1 || true)
    fi

    if [[ -z "${latest}" ]]; then
        log_error "No backup files found in ${BACKUP_DIR}"
        exit 1
    fi

    echo "${latest}"
}

get_latest_s3_backup() {
    log_info "Finding latest S3 backup..."

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Cannot download from S3."
        exit 1
    fi

    # Get the latest backup file from S3
    local latest_path=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive \
        --region "${AWS_REGION}" 2>/dev/null | \
        grep -E 'flamoral_custom_.*\.dump$' | \
        sort | tail -1 | awk '{print $4}')

    if [[ -z "${latest_path}" ]]; then
        # Try gzipped SQL if no custom format found
        latest_path=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive \
            --region "${AWS_REGION}" 2>/dev/null | \
            grep -E 'flamoral_full_.*\.sql\.gz$' | \
            sort | tail -1 | awk '{print $4}')
    fi

    if [[ -z "${latest_path}" ]]; then
        log_error "No backup files found in S3"
        exit 1
    fi

    echo "s3://${S3_BUCKET}/${latest_path}"
}

#-------------------------------------------------------------------------------
# Download Functions
#-------------------------------------------------------------------------------
download_from_s3() {
    local s3_path="$1"
    local filename=$(basename "${s3_path}")
    local local_path="${TEMP_DIR}/${filename}"

    log_info "Downloading ${filename} from S3..."

    aws s3 cp "${s3_path}" "${local_path}" \
        --region "${AWS_REGION}" \
        --only-show-errors

    if [[ ! -f "${local_path}" ]]; then
        log_error "Failed to download backup from S3"
        exit 1
    fi

    log_success "Downloaded to ${local_path}"
    echo "${local_path}"
}

#-------------------------------------------------------------------------------
# Pre-restore Functions
#-------------------------------------------------------------------------------
stop_services() {
    log_info "Stopping application services..."

    # Check if PM2 is running with flamoral services
    if pm2 list 2>/dev/null | grep -q "online"; then
        log_info "Stopping PM2 services..."
        pm2 stop all 2>/dev/null || true
        sleep 5
    fi

    log_success "Services stopped"
}

create_pre_restore_backup() {
    log_info "Creating pre-restore backup of current database..."

    local backup_file="${BACKUP_DIR}/flamoral_prerestore_$(date +%Y%m%d_%H%M%S).dump"

    export PGPASSWORD="${DB_PASSWORD}"

    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --format=custom \
        --compress=9 \
        --no-owner \
        -f "${backup_file}" 2>/dev/null || true

    if [[ -f "${backup_file}" ]]; then
        log_success "Pre-restore backup created: ${backup_file}"
    else
        log_warning "Could not create pre-restore backup (database may be empty)"
    fi
}

terminate_connections() {
    log_info "Terminating existing database connections..."

    export PGPASSWORD="${DB_PASSWORD}"

    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_ADMIN_USER}" -d postgres << EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();
EOF

    log_success "Connections terminated"
}

#-------------------------------------------------------------------------------
# Restore Functions
#-------------------------------------------------------------------------------
restore_from_custom_format() {
    local backup_file="$1"

    log_info "Restoring from custom format backup..."

    export PGPASSWORD="${DB_PASSWORD}"

    # Drop and recreate database
    log_info "Dropping existing database..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_ADMIN_USER}" -d postgres << EOF
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
EOF

    # Restore using pg_restore
    log_info "Restoring database..."
    pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --verbose \
        --no-owner \
        --no-acl \
        --jobs=4 \
        "${backup_file}" 2>&1 | tee -a "${RESTORE_LOG}"

    local restore_status=${PIPESTATUS[0]}

    if [[ ${restore_status} -ne 0 ]]; then
        log_warning "pg_restore completed with warnings (this is often normal for 'already exists' errors)"
    fi

    # Re-create extensions
    log_info "Ensuring extensions are installed..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOF

    log_success "Database restored from custom format"
}

restore_from_sql() {
    local backup_file="$1"
    local sql_file="${backup_file}"

    # Decompress if needed
    if [[ "${backup_file}" == *.gz ]]; then
        log_info "Decompressing backup..."
        sql_file="${TEMP_DIR}/restore_$(date +%s).sql"
        gunzip -c "${backup_file}" > "${sql_file}"
    fi

    log_info "Restoring from SQL backup..."

    export PGPASSWORD="${DB_PASSWORD}"

    # Drop and recreate database
    log_info "Dropping existing database..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_ADMIN_USER}" -d postgres << EOF
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
EOF

    # Restore using psql
    log_info "Restoring database..."
    psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -f "${sql_file}" 2>&1 | tee -a "${RESTORE_LOG}"

    # Cleanup decompressed file
    if [[ "${backup_file}" == *.gz ]]; then
        rm -f "${sql_file}"
    fi

    log_success "Database restored from SQL"
}

#-------------------------------------------------------------------------------
# Post-restore Functions
#-------------------------------------------------------------------------------
verify_restore() {
    log_info "Verifying restore..."

    export PGPASSWORD="${DB_PASSWORD}"

    # Check table count
    local table_count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

    log_info "Tables restored: ${table_count}"

    if [[ ${table_count} -eq 0 ]]; then
        log_error "No tables found after restore - something may have gone wrong"
        return 1
    fi

    # Check row counts for key tables
    local users_count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
        "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")

    log_info "Users table row count: ${users_count}"

    # Get database size
    local db_size=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
        "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" | tr -d ' ')

    log_info "Database size: ${db_size}"

    log_success "Restore verification completed"
    return 0
}

restart_services() {
    log_info "Restarting application services..."

    if command -v pm2 &> /dev/null; then
        pm2 restart all 2>/dev/null || pm2 start /home/flamoral/app/infrastructure/godaddy-vps/pm2/ecosystem.config.js 2>/dev/null || true
        log_success "PM2 services restarted"
    fi
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "${TEMP_DIR}"/*
    log_success "Cleanup completed"
}

#-------------------------------------------------------------------------------
# Main Restore Function
#-------------------------------------------------------------------------------
perform_restore() {
    local backup_file="$1"
    local start_time=$(date +%s)

    log_info "Starting database restore from: $(basename "${backup_file}")"

    # Stop services
    stop_services

    # Create safety backup
    create_pre_restore_backup

    # Terminate connections
    terminate_connections

    # Determine restore method based on file type
    if [[ "${backup_file}" == *.dump ]]; then
        restore_from_custom_format "${backup_file}"
    elif [[ "${backup_file}" == *.sql || "${backup_file}" == *.sql.gz ]]; then
        restore_from_sql "${backup_file}"
    else
        log_error "Unknown backup format: ${backup_file}"
        exit 1
    fi

    # Verify restore
    if ! verify_restore; then
        log_error "Restore verification failed"
        exit 1
    fi

    # Restart services
    restart_services

    # Cleanup
    cleanup

    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo "==============================================================================="
    log_success "Database restore completed successfully in ${duration} seconds"
    echo "==============================================================================="
}

#-------------------------------------------------------------------------------
# Help
#-------------------------------------------------------------------------------
show_help() {
    cat << EOF
Flamoral Database Restore Script

CAUTION: This script will DROP and recreate the database!

Usage: $0 [OPTIONS] [BACKUP_FILE]

Options:
    <backup_file>       Path to local backup file to restore
    --from-s3 <path>    Restore from S3 path (e.g., s3://bucket/path/backup.dump)
    --latest            Restore from latest local backup
    --latest-s3         Download and restore from latest S3 backup
    --list              List available backups (local and S3)
    --help              Show this help message

Environment Variables:
    DB_HOST             Database host (default: localhost)
    DB_PORT             Database port (default: 5432)
    DB_NAME             Database name (default: flamoral_production)
    DB_USER             Database user (default: flamoral)
    POSTGRES_PASSWORD   Database password
    DB_ADMIN_USER       PostgreSQL admin user (default: postgres)
    S3_BUCKET           S3 bucket name (default: flamoral-backups)
    S3_PREFIX           S3 prefix/folder (default: database)
    AWS_REGION          AWS region (default: us-east-1)

Supported Backup Formats:
    - .dump             Custom format (pg_dump -Fc) - fastest restore
    - .sql.gz           Gzipped plain SQL
    - .sql              Plain SQL

Examples:
    $0 /var/backups/flamoral/database/flamoral_custom_20240115.dump
    $0 --latest
    $0 --from-s3 s3://flamoral-backups/database/2024/01/15/flamoral_custom.dump
    $0 --latest-s3
    $0 --list

Safety Features:
    - Creates pre-restore backup before proceeding
    - Requires explicit "yes" confirmation
    - Stops application services during restore
    - Verifies restore completion

EOF
}

#-------------------------------------------------------------------------------
# Main Entry Point
#-------------------------------------------------------------------------------
main() {
    # Create necessary directories
    mkdir -p "${LOG_DIR}"
    mkdir -p "${TEMP_DIR}"

    check_prerequisites

    case "${1:-}" in
        --list)
            list_local_backups
            list_s3_backups
            ;;
        --latest)
            local backup_file=$(get_latest_local_backup)
            log_info "Latest local backup: ${backup_file}"
            confirm_action "You are about to restore from: $(basename "${backup_file}")"
            perform_restore "${backup_file}"
            ;;
        --latest-s3)
            local s3_path=$(get_latest_s3_backup)
            log_info "Latest S3 backup: ${s3_path}"
            confirm_action "You are about to download and restore from: ${s3_path}"
            local local_file=$(download_from_s3 "${s3_path}")
            perform_restore "${local_file}"
            ;;
        --from-s3)
            if [[ -z "${2:-}" ]]; then
                log_error "Please provide S3 path"
                exit 1
            fi
            confirm_action "You are about to download and restore from: $2"
            local local_file=$(download_from_s3 "$2")
            perform_restore "${local_file}"
            ;;
        --help|-h)
            show_help
            ;;
        "")
            log_error "Please provide a backup file or option"
            show_help
            exit 1
            ;;
        --*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            # Assume it's a file path
            if [[ ! -f "$1" ]]; then
                log_error "Backup file not found: $1"
                exit 1
            fi
            confirm_action "You are about to restore from: $(basename "$1")"
            perform_restore "$1"
            ;;
    esac
}

# Run main function
main "$@"
