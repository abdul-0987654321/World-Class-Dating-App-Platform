#!/bin/bash

##############################################################################
# Database Restore Script for Flamoral
# Restores PostgreSQL database from backup files
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/database}"

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
BLUE='\033[0;34m'
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

log_debug() {
  echo -e "${BLUE}[DEBUG]${NC} $1"
}

# List available backups
list_backups() {
  local db_name="${1:-}"

  log_info "Available backups in: $BACKUP_DIR"
  log_info "========================================="

  if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup directory does not exist: $BACKUP_DIR"
    return 1
  fi

  local pattern="*.sql.gz"
  if [ -n "$db_name" ]; then
    pattern="${db_name}_*.sql.gz"
  fi

  local backups=($(find "$BACKUP_DIR" -name "$pattern" -type f | sort -r))

  if [ ${#backups[@]} -eq 0 ]; then
    log_warn "No backups found"
    return 1
  fi

  local index=1
  for backup in "${backups[@]}"; do
    local filename=$(basename "$backup")
    local filesize=$(du -h "$backup" | cut -f1)
    local timestamp=$(stat -c %y "$backup" | cut -d'.' -f1)
    echo -e "${index}. ${BLUE}${filename}${NC} (${filesize}) - ${timestamp}"
    ((index++))
  done

  echo "${backups[@]}"
}

# Verify backup integrity
verify_backup_integrity() {
  local backup_file="$1"
  local checksum_file="${backup_file}.sha256"

  log_info "Verifying backup integrity..."

  if [ ! -f "$backup_file" ]; then
    log_error "Backup file not found: $backup_file"
    return 1
  fi

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

# Create database if it doesn't exist
create_database_if_not_exists() {
  local db_name="$1"

  log_info "Checking if database exists: $db_name"

  export PGPASSWORD="$DB_PASSWORD"

  # Check if database exists
  local db_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name'")

  if [ "$db_exists" != "1" ]; then
    log_info "Database $db_name does not exist, creating..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $db_name;"
    log_info "Database created successfully"
  else
    log_info "Database already exists"
  fi

  unset PGPASSWORD
}

# Drop database with confirmation
drop_database() {
  local db_name="$1"

  log_warn "WARNING: This will DROP the existing database: $db_name"
  read -p "Are you sure you want to continue? (yes/no): " confirmation

  if [ "$confirmation" != "yes" ]; then
    log_info "Database drop cancelled"
    return 1
  fi

  export PGPASSWORD="$DB_PASSWORD"

  log_info "Terminating active connections to database..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '$db_name'
    AND pid <> pg_backend_pid();
  " > /dev/null 2>&1 || true

  log_info "Dropping database..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $db_name;" > /dev/null 2>&1

  unset PGPASSWORD

  log_info "Database dropped successfully"
}

# Restore database from backup
restore_database() {
  local backup_file="$1"
  local target_db="${2:-$DB_NAME}"

  log_info "========================================="
  log_info "Starting database restore"
  log_info "========================================="
  log_info "Backup file: $(basename $backup_file)"
  log_info "Target database: $target_db"
  log_info "Host: $DB_HOST:$DB_PORT"
  log_info "========================================="

  # Verify backup integrity
  if ! verify_backup_integrity "$backup_file"; then
    log_error "Backup verification failed, aborting restore"
    return 1
  fi

  # Extract database name from filename if not provided
  if [ "$target_db" = "$DB_NAME" ]; then
    local filename=$(basename "$backup_file")
    target_db=$(echo "$filename" | sed -E 's/(.+)_[0-9]+_[0-9]+\.sql\.gz/\1/')
    log_info "Extracted database name from filename: $target_db"
  fi

  # Ask for confirmation
  log_warn "This will restore the database: $target_db"
  read -p "Continue with restore? (yes/no): " confirmation

  if [ "$confirmation" != "yes" ]; then
    log_info "Restore cancelled by user"
    return 1
  fi

  # Create database if it doesn't exist
  create_database_if_not_exists "$target_db"

  export PGPASSWORD="$DB_PASSWORD"

  # Decompress and restore
  log_info "Decompressing and restoring backup..."
  if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" > /dev/null 2>&1; then
    log_info "Database restored successfully!"
    unset PGPASSWORD
    return 0
  else
    log_error "Database restore failed"
    unset PGPASSWORD
    return 1
  fi
}

# Interactive restore mode
interactive_restore() {
  log_info "========================================="
  log_info "Interactive Database Restore"
  log_info "========================================="

  # List available backups
  local backups_output=$(list_backups)
  local backups=($backups_output)

  if [ ${#backups[@]} -eq 0 ]; then
    log_error "No backups available for restore"
    return 1
  fi

  # Prompt user to select backup
  echo ""
  read -p "Enter backup number to restore (or 'q' to quit): " selection

  if [ "$selection" = "q" ]; then
    log_info "Restore cancelled"
    return 0
  fi

  # Validate selection
  if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
    log_error "Invalid selection"
    return 1
  fi

  # Get selected backup file
  local backup_file="${backups[$((selection-1))]}"

  # Restore database
  restore_database "$backup_file"
}

# Show usage
usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Restore Flamoral database from backup

OPTIONS:
  -h, --help              Show this help message
  -i, --interactive       Interactive mode (select backup from list)
  -f, --file <FILE>       Restore from specific backup file
  -d, --database <NAME>   Target database name (default: extracted from filename)
  -l, --list              List available backups
  --drop                  Drop database before restore (use with caution!)

EXAMPLES:
  $0 -i                                    # Interactive mode
  $0 -f backups/flamoral_20250115.sql.gz  # Restore specific file
  $0 -l                                    # List available backups

EOF
}

# Main execution
main() {
  local backup_file=""
  local target_db=""
  local drop_first=false
  local interactive=false
  local list_only=false

  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      -h|--help)
        usage
        exit 0
        ;;
      -i|--interactive)
        interactive=true
        shift
        ;;
      -f|--file)
        backup_file="$2"
        shift 2
        ;;
      -d|--database)
        target_db="$2"
        shift 2
        ;;
      -l|--list)
        list_only=true
        shift
        ;;
      --drop)
        drop_first=true
        shift
        ;;
      *)
        log_error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done

  # List backups only
  if [ "$list_only" = true ]; then
    list_backups
    exit 0
  fi

  # Interactive mode
  if [ "$interactive" = true ]; then
    interactive_restore
    exit $?
  fi

  # File-based restore
  if [ -n "$backup_file" ]; then
    if [ "$drop_first" = true ]; then
      drop_database "${target_db:-$DB_NAME}"
    fi

    restore_database "$backup_file" "$target_db"
    exit $?
  fi

  # No options provided
  log_error "No restore option specified"
  usage
  exit 1
}

# Run main function
main "$@"
