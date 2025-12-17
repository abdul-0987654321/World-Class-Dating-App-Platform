#!/bin/bash

##############################################################################
# Database Backup Script for Flamoral
# Creates PostgreSQL database backups with compression and rotation
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/database}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
  source "$PROJECT_ROOT/.env"
fi

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-flamoral}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
create_backup_dir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
  fi
}

# Perform database backup
backup_database() {
  local backup_file="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
  local compressed_file="${backup_file}.gz"

  log_info "Starting backup of database: $DB_NAME"
  log_info "Backup file: $compressed_file"

  # Set password for pg_dump
  export PGPASSWORD="$DB_PASSWORD"

  # Perform backup with pg_dump
  if pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    > "$backup_file"; then

    log_info "Database dump completed successfully"

    # Compress the backup
    log_info "Compressing backup..."
    gzip "$backup_file"

    # Get file size
    local file_size=$(du -h "$compressed_file" | cut -f1)
    log_info "Backup created: $compressed_file (size: $file_size)"

    # Create checksum
    log_info "Creating checksum..."
    sha256sum "$compressed_file" > "${compressed_file}.sha256"

    return 0
  else
    log_error "Database backup failed"
    rm -f "$backup_file"
    return 1
  fi

  # Unset password
  unset PGPASSWORD
}

# Backup individual service databases
backup_all_services() {
  local services=(
    "flamoral_users"
    "flamoral_matching"
    "flamoral_media"
    "flamoral_payments"
    "flamoral_notifications"
    "flamoral_analytics"
    "flamoral_moderation"
  )

  log_info "Starting backup of all service databases..."

  for service_db in "${services[@]}"; do
    log_info "Backing up service database: $service_db"

    local backup_file="$BACKUP_DIR/${service_db}_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"

    export PGPASSWORD="$DB_PASSWORD"

    if pg_dump \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$service_db" \
      --format=plain \
      --no-owner \
      --no-acl \
      --clean \
      --if-exists \
      2>/dev/null > "$backup_file"; then

      gzip "$backup_file"
      sha256sum "$compressed_file" > "${compressed_file}.sha256"
      local file_size=$(du -h "$compressed_file" | cut -f1)
      log_info "  Backed up $service_db (size: $file_size)"
    else
      log_warn "  Service database $service_db does not exist or backup failed, skipping..."
      rm -f "$backup_file"
    fi

    unset PGPASSWORD
  done
}

# Cleanup old backups
cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETENTION_DAYS days..."

  local deleted_count=0

  # Find and delete old backups
  if [ -d "$BACKUP_DIR" ]; then
    while IFS= read -r -d '' file; do
      rm -f "$file"
      rm -f "${file}.sha256"
      ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0)

    if [ $deleted_count -gt 0 ]; then
      log_info "Deleted $deleted_count old backup(s)"
    else
      log_info "No old backups to delete"
    fi
  fi
}

# Upload to cloud storage (optional)
upload_to_cloud() {
  local backup_file="$1"

  # AWS S3 upload (uncomment and configure if needed)
  # if command -v aws &> /dev/null; then
  #   log_info "Uploading backup to S3..."
  #   aws s3 cp "$backup_file" "s3://your-backup-bucket/flamoral/database/"
  #   log_info "Upload to S3 completed"
  # fi

  # Azure Blob Storage upload (uncomment and configure if needed)
  # if command -v az &> /dev/null; then
  #   log_info "Uploading backup to Azure Blob Storage..."
  #   az storage blob upload --file "$backup_file" --container-name backups --name "flamoral/database/$(basename $backup_file)"
  #   log_info "Upload to Azure completed"
  # fi

  log_info "Cloud upload skipped (configure if needed)"
}

# Verify backup integrity
verify_backup() {
  local compressed_file="$1"
  local checksum_file="${compressed_file}.sha256"

  log_info "Verifying backup integrity..."

  if [ -f "$checksum_file" ]; then
    if sha256sum -c "$checksum_file" --status; then
      log_info "Backup integrity verified successfully"
      return 0
    else
      log_error "Backup integrity check failed!"
      return 1
    fi
  else
    log_warn "Checksum file not found, skipping verification"
    return 0
  fi
}

# Main execution
main() {
  log_info "========================================="
  log_info "Flamoral Database Backup"
  log_info "========================================="
  log_info "Timestamp: $TIMESTAMP"
  log_info "Database: $DB_NAME"
  log_info "Host: $DB_HOST:$DB_PORT"
  log_info "========================================="

  # Create backup directory
  create_backup_dir

  # Backup main database
  if backup_database; then
    local main_backup="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
    verify_backup "$main_backup"
  fi

  # Backup service databases
  backup_all_services

  # Cleanup old backups
  cleanup_old_backups

  log_info "========================================="
  log_info "Backup completed successfully!"
  log_info "Backup location: $BACKUP_DIR"
  log_info "========================================="
}

# Run main function
main "$@"
