#!/bin/bash

##############################################################################
# Flamoral Dating Platform - Database Restore Script
# Purpose: Restore PostgreSQL database from backup files
# Usage: ./restore.sh <backup_file> [--force|--decrypt]
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

# Restore settings
BACKUP_FILE="${1}"
FORCE="${2}"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}Flamoral Dating Platform - Database Restore${NC}                 ${CYAN}║${NC}"
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

    # Safety check for production
    if [[ ! "$DB_NAME" =~ (dev|test|local) ]] && [ "$FORCE" != "--force" ]; then
        print_error "Safety check failed!"
        print_warning "Restoring to non-dev database requires --force flag"
        print_info "Current database: $DB_NAME"
        exit 1
    fi

    print_success "Environment configured"
    print_info "Database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}"
}

##############################################################################
# Backup File Validation
##############################################################################

validate_backup_file() {
    print_section "Validating Backup File"

    # Check if backup file is provided
    if [ -z "$BACKUP_FILE" ]; then
        print_error "No backup file specified"
        print_info "Usage: $0 <backup_file> [--force|--decrypt]"
        echo ""
        print_info "Available backups:"
        ls -lh "$BACKUP_DIR" 2>/dev/null | grep -E '\.(sql\.gz|dump|enc)$' | awk '{print "  "$9, "("$5")"}'
        exit 1
    fi

    # Check if file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        # Try looking in backup directory
        if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
            BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
        else
            print_error "Backup file not found: $BACKUP_FILE"
            exit 1
        fi
    fi

    print_success "Backup file found: $(basename "$BACKUP_FILE")"

    # Check if file is encrypted
    if [[ "$BACKUP_FILE" == *.enc ]]; then
        print_info "Backup file is encrypted"
        if [ "$FORCE" = "--decrypt" ]; then
            decrypt_backup
        else
            print_error "Use --decrypt flag to restore from encrypted backup"
            exit 1
        fi
    fi

    # Display file info
    local file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    print_info "File size: $file_size"
}

decrypt_backup() {
    print_info "Decrypting backup..."

    if command -v openssl &> /dev/null; then
        local decrypted_file="${BACKUP_FILE%.enc}"
        read -sp "Enter decryption password: " password
        echo ""
        openssl enc -aes-256-cbc -d -pbkdf2 -in "$BACKUP_FILE" -out "$decrypted_file" -pass pass:"$password"
        BACKUP_FILE="$decrypted_file"
        print_success "Backup decrypted"
    else
        print_error "OpenSSL not found, cannot decrypt"
        exit 1
    fi
}

##############################################################################
# Database Connection Check
##############################################################################

check_database_connection() {
    print_section "Checking Database Connection"

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c '\q' 2>/dev/null; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database server"
        exit 1
    fi
}

##############################################################################
# Restore Functions
##############################################################################

confirm_restore() {
    print_section "Restore Confirmation"

    print_warning "⚠️  WARNING: This will DESTROY all existing data in the database!"
    print_info "Database: $DB_NAME"
    print_info "Backup file: $(basename "$BACKUP_FILE")"
    echo ""

    if [ "$FORCE" != "--force" ]; then
        read -p "Are you sure you want to continue? Type 'yes' to confirm: " confirmation
        if [ "$confirmation" != "yes" ]; then
            print_info "Restore cancelled"
            exit 0
        fi
    else
        print_info "Force mode enabled, skipping confirmation"
    fi
}

create_pre_restore_backup() {
    print_section "Creating Pre-Restore Backup"

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local pre_restore_backup="$BACKUP_DIR/${DB_NAME}_pre_restore_${timestamp}.sql.gz"

    print_info "Creating safety backup before restore..."

    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl 2>/dev/null | gzip -9 > "$pre_restore_backup"

    print_success "Pre-restore backup created: $(basename "$pre_restore_backup")"
}

terminate_connections() {
    print_section "Terminating Active Connections"

    print_info "Closing active database connections..."

    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '$DB_NAME'
          AND pid <> pg_backend_pid();
    " > /dev/null 2>&1 || true

    print_success "Connections terminated"
}

drop_and_recreate_database() {
    print_section "Recreating Database"

    print_info "Dropping existing database..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null 2>&1

    print_info "Creating fresh database..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1

    print_success "Database recreated"
}

restore_from_sql() {
    print_section "Restoring from SQL Backup"

    local sql_file="$BACKUP_FILE"

    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        print_info "Decompressing backup..."
        sql_file="${BACKUP_FILE%.gz}"
        gunzip -c "$BACKUP_FILE" > "$sql_file"
    fi

    print_info "Restoring database..."
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$sql_file" \
        --quiet \
        --single-transaction 2>&1 | grep -v "NOTICE:" || true

    # Clean up decompressed file
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        rm -f "$sql_file"
    fi

    print_success "Database restored"
}

restore_from_custom() {
    print_section "Restoring from Custom Format Backup"

    print_info "Restoring database (using parallel restore)..."

    PGPASSWORD="$DB_PASSWORD" pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        --jobs=4 \
        --verbose \
        "$BACKUP_FILE" 2>&1 | grep -v "NOTICE:" || true

    print_success "Database restored"
}

verify_restore() {
    print_section "Verifying Restore"

    # Check table count
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

    print_info "Tables restored: $(echo $table_count | xargs)"

    # Check for data
    local has_data=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) > 0 FROM users;" 2>/dev/null || echo "0")

    if [ "$(echo $has_data | xargs)" = "t" ]; then
        print_success "Restore verification passed"
    else
        print_warning "No user data found (may be a schema-only restore)"
    fi

    # Display table row counts
    print_info "Table row counts:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            schemaname || '.' || tablename AS table_name,
            n_live_tup AS row_count
        FROM pg_stat_user_tables
        WHERE n_live_tup > 0
        ORDER BY n_live_tup DESC
        LIMIT 10;
    " | sed 's/^/  /'
}

run_post_restore_tasks() {
    print_section "Post-Restore Tasks"

    print_info "Analyzing database..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" > /dev/null 2>&1
    print_success "Database analyzed"

    print_info "Vacuuming database..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM;" > /dev/null 2>&1
    print_success "Database vacuumed"

    print_info "Updating statistics..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" > /dev/null 2>&1
    print_success "Statistics updated"
}

##############################################################################
# Main Execution
##############################################################################

main() {
    print_header

    # Check for help
    if [ "$BACKUP_FILE" = "--help" ] || [ "$BACKUP_FILE" = "-h" ]; then
        echo "Usage: $0 <backup_file> [--force|--decrypt]"
        echo ""
        echo "Options:"
        echo "  backup_file    Path to backup file to restore"
        echo "  --force        Skip confirmation and safety checks"
        echo "  --decrypt      Decrypt encrypted backup before restore"
        echo "  --help         Show this help message"
        echo ""
        echo "Available backups:"
        ls -lh "$BACKUP_DIR" 2>/dev/null | grep -E '\.(sql\.gz|dump|enc)$' | awk '{print "  "$9, "("$5")"}'
        exit 0
    fi

    check_environment
    validate_backup_file
    check_database_connection
    confirm_restore

    # Create safety backup (skip if database doesn't exist yet)
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        create_pre_restore_backup
        terminate_connections
    fi

    # Drop and recreate database
    drop_and_recreate_database

    # Restore based on file type
    if [[ "$BACKUP_FILE" == *.dump ]]; then
        restore_from_custom
    else
        restore_from_sql
    fi

    # Verify and optimize
    verify_restore
    run_post_restore_tasks

    # Summary
    print_section "Restore Complete"
    print_success "Database successfully restored!"
    print_info "Database: $DB_NAME"
    print_info "Backup file: $(basename "$BACKUP_FILE")"
    echo ""
}

# Run main function
main "$@"
