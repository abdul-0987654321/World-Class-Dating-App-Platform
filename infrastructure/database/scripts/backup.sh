#!/bin/bash

##############################################################################
# Flamoral Dating Platform - Database Backup Script
# Purpose: Create compressed backups of PostgreSQL database
# Usage: ./backup.sh [--full|--schema-only|--data-only] [--encrypt]
##############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$DATABASE_DIR/backups"
ENV_FILE="$DATABASE_DIR/.env"

# Backup settings
BACKUP_TYPE="${1:-full}"
ENCRYPT="${2}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}Flamoral Dating Platform - Database Backup${NC}                  ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "\n${BLUE}▶ $1${NC}"
    echo -e "${BLUE}$(printf '─%.0s' {1..70})${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

##############################################################################
# Environment Setup
##############################################################################

check_environment() {
    print_section "Checking Environment"

    # Check if .env exists
    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env file not found at $ENV_FILE"
        exit 1
    fi

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    print_success "Environment configured"
    print_info "Database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}"
}

##############################################################################
# Database Connection Check
##############################################################################

check_database_connection() {
    print_section "Checking Database Connection"

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database"
        exit 1
    fi
}

##############################################################################
# Backup Functions
##############################################################################

get_database_size() {
    local size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    echo "$size" | xargs
}

create_full_backup() {
    print_section "Creating Full Database Backup"

    local db_size=$(get_database_size)
    print_info "Database size: $db_size"

    local backup_file="$BACKUP_DIR/${DB_NAME}_full_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"

    print_info "Creating backup..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        > "$backup_file" 2>/dev/null

    print_success "Backup created: $(basename "$backup_file")"

    # Compress backup
    print_info "Compressing backup..."
    gzip -9 "$backup_file"
    print_success "Backup compressed: $(basename "$compressed_file")"

    # Encrypt if requested
    if [ "$ENCRYPT" = "--encrypt" ]; then
        encrypt_backup "$compressed_file"
    fi

    # Display file size
    local backup_size=$(du -h "$compressed_file" | cut -f1)
    print_info "Backup size: $backup_size"

    echo "$compressed_file"
}

create_schema_backup() {
    print_section "Creating Schema-Only Backup"

    local backup_file="$BACKUP_DIR/${DB_NAME}_schema_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"

    print_info "Creating schema backup..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --schema-only \
        --no-owner \
        --no-acl \
        --verbose \
        > "$backup_file" 2>/dev/null

    print_success "Schema backup created: $(basename "$backup_file")"

    # Compress backup
    gzip -9 "$backup_file"
    print_success "Backup compressed: $(basename "$compressed_file")"

    echo "$compressed_file"
}

create_data_backup() {
    print_section "Creating Data-Only Backup"

    local backup_file="$BACKUP_DIR/${DB_NAME}_data_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"

    print_info "Creating data backup..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --data-only \
        --no-owner \
        --no-acl \
        --verbose \
        > "$backup_file" 2>/dev/null

    print_success "Data backup created: $(basename "$backup_file")"

    # Compress backup
    gzip -9 "$backup_file"
    print_success "Backup compressed: $(basename "$compressed_file")"

    echo "$compressed_file"
}

create_custom_backup() {
    print_section "Creating Custom Format Backup"

    local backup_file="$BACKUP_DIR/${DB_NAME}_custom_${TIMESTAMP}.dump"

    print_info "Creating custom format backup (for parallel restore)..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-acl \
        --verbose \
        --file="$backup_file" 2>/dev/null

    print_success "Custom backup created: $(basename "$backup_file")"

    local backup_size=$(du -h "$backup_file" | cut -f1)
    print_info "Backup size: $backup_size"

    echo "$backup_file"
}

encrypt_backup() {
    local backup_file=$1
    print_info "Encrypting backup..."

    if command -v openssl &> /dev/null; then
        read -sp "Enter encryption password: " password
        echo ""
        openssl enc -aes-256-cbc -salt -pbkdf2 -in "$backup_file" -out "${backup_file}.enc" -pass pass:"$password"
        rm "$backup_file"
        print_success "Backup encrypted: $(basename "${backup_file}.enc")"
    else
        print_warning "OpenSSL not found, skipping encryption"
    fi
}

create_backup_metadata() {
    local backup_file=$1
    local metadata_file="${backup_file}.meta"

    cat > "$metadata_file" << EOF
Flamoral Dating Platform - Backup Metadata
=============================================
Backup File: $(basename "$backup_file")
Database: $DB_NAME
Host: $DB_HOST
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Database Size: $(get_database_size)
Backup Type: $BACKUP_TYPE
Created By: $USER
Hostname: $(hostname)

Table Counts:
$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT
    schemaname || '.' || tablename AS table_name,
    n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 20;
")

PostgreSQL Version:
$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();")
EOF

    print_success "Metadata file created: $(basename "$metadata_file")"
}

cleanup_old_backups() {
    print_section "Cleaning Up Old Backups"

    local count=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -type f | wc -l)

    if [ $count -gt 0 ]; then
        print_info "Removing backups older than $RETENTION_DAYS days..."
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -type f -delete
        find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -type f -delete
        find "$BACKUP_DIR" -name "*.meta" -mtime +$RETENTION_DAYS -type f -delete
        find "$BACKUP_DIR" -name "*.enc" -mtime +$RETENTION_DAYS -type f -delete
        print_success "Removed $count old backup(s)"
    else
        print_info "No old backups to remove"
    fi
}

list_backups() {
    print_section "Existing Backups"

    if [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        print_info "No backups found"
    else
        echo ""
        ls -lh "$BACKUP_DIR" | grep -E '\.(sql\.gz|dump|enc)$' | awk '{print $9, "("$5")"}'
        echo ""
    fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
    print_header

    # Parse arguments
    case $BACKUP_TYPE in
        --help|-h)
            echo "Usage: $0 [--full|--schema-only|--data-only|--custom] [--encrypt]"
            echo ""
            echo "Options:"
            echo "  (no args)      Create full backup (default)"
            echo "  --full         Create full database backup"
            echo "  --schema-only  Create schema-only backup"
            echo "  --data-only    Create data-only backup"
            echo "  --custom       Create custom format backup (for parallel restore)"
            echo "  --encrypt      Encrypt the backup file"
            echo "  --list         List existing backups"
            echo "  --help         Show this help message"
            exit 0
            ;;
        --list)
            check_environment
            list_backups
            exit 0
            ;;
    esac

    check_environment
    check_database_connection

    # Create backup based on type
    case $BACKUP_TYPE in
        --full|full)
            backup_file=$(create_full_backup)
            ;;
        --schema-only|schema)
            backup_file=$(create_schema_backup)
            ;;
        --data-only|data)
            backup_file=$(create_data_backup)
            ;;
        --custom|custom)
            backup_file=$(create_custom_backup)
            ;;
        *)
            backup_file=$(create_full_backup)
            ;;
    esac

    # Create metadata
    create_backup_metadata "$backup_file"

    # Cleanup old backups
    cleanup_old_backups

    # Summary
    print_section "Backup Complete"
    print_success "Backup successfully created!"
    print_info "Backup location: $backup_file"
    echo ""
    print_info "To restore: ./restore.sh $(basename "$backup_file")"
    echo ""
}

# Run main function
main "$@"
