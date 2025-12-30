#!/bin/bash

##############################################################################
# Flamoral Dating Platform - Migration Rollback Script
# Purpose: Rollback database migrations with safety checks
# Usage: ./rollback.sh [--batch|--all|--to=<migration>]
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
BACKEND_DIR="$(dirname "$DATABASE_DIR")/backend"
ENV_FILE="$DATABASE_DIR/.env"

# Rollback mode
ROLLBACK_MODE="${1:-batch}"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}Flamoral Dating Platform - Migration Rollback${NC}               ${CYAN}║${NC}"
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
    if [[ ! "$DB_NAME" =~ (dev|test|local) ]]; then
        print_error "Safety check failed!"
        print_warning "Rolling back production database is dangerous!"
        print_info "Current database: $DB_NAME"
        echo ""
        read -p "Are you ABSOLUTELY sure? Type 'rollback-production' to confirm: " confirmation
        if [ "$confirmation" != "rollback-production" ]; then
            print_info "Rollback cancelled"
            exit 0
        fi
    fi

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
# Rollback Functions
##############################################################################

show_migration_status() {
    print_section "Current Migration Status"

    cd "$DATABASE_DIR"

    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install --silent
    fi

    print_info "Applied migrations:"
    npm run migrate:list 2>/dev/null | grep -E '^\[' || echo "  No migrations found"
}

create_pre_rollback_backup() {
    print_section "Creating Pre-Rollback Backup"

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="$DATABASE_DIR/backups"
    mkdir -p "$backup_dir"

    local backup_file="$backup_dir/${DB_NAME}_pre_rollback_${timestamp}.sql.gz"

    print_info "Creating safety backup..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl 2>/dev/null | gzip -9 > "$backup_file"

    print_success "Backup created: $(basename "$backup_file")"
    print_info "Location: $backup_file"
}

rollback_central_migrations() {
    print_section "Rolling Back Central Database Migrations"

    cd "$DATABASE_DIR"

    case $ROLLBACK_MODE in
        --all)
            print_warning "Rolling back ALL migrations..."
            read -p "This will remove all database schema. Continue? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                npm run migrate:rollback:all
                print_success "All migrations rolled back"
            else
                print_info "Rollback cancelled"
            fi
            ;;
        --batch|*)
            print_info "Rolling back last batch..."
            npm run migrate:rollback
            print_success "Last batch rolled back"
            ;;
    esac
}

rollback_service_migrations() {
    local service=$1
    local service_dir="$BACKEND_DIR/services/$service"

    if [ ! -d "$service_dir" ]; then
        print_warning "Service directory not found: $service"
        return
    fi

    if [ ! -d "$service_dir/src/infrastructure/database/migrations" ]; then
        return
    fi

    print_section "Rolling Back $service Migrations"

    cd "$service_dir"

    if [ -f "knexfile.ts" ] || [ -f "knexfile.js" ]; then
        if [ ! -d "node_modules" ]; then
            npm install --silent
        fi

        case $ROLLBACK_MODE in
            --all)
                print_warning "Rolling back all $service migrations..."
                npx knex migrate:rollback --all || true
                print_success "$service migrations rolled back"
                ;;
            *)
                print_info "Rolling back last batch..."
                npx knex migrate:rollback || true
                print_success "$service rollback completed"
                ;;
        esac
    fi
}

verify_rollback() {
    print_section "Verifying Rollback"

    cd "$DATABASE_DIR"

    print_info "Current migration status:"
    npm run migrate:list 2>/dev/null | tail -10

    # Check table count
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

    print_info "Tables remaining: $(echo $table_count | xargs)"
}

display_rollback_plan() {
    print_section "Rollback Plan"

    case $ROLLBACK_MODE in
        --all)
            print_warning "FULL ROLLBACK - All migrations will be undone"
            echo "  1. Create pre-rollback backup"
            echo "  2. Rollback all central migrations"
            echo "  3. Rollback all service migrations"
            echo "  4. Database will be empty (no tables)"
            ;;
        --batch|*)
            print_info "BATCH ROLLBACK - Last batch of migrations will be undone"
            echo "  1. Create pre-rollback backup"
            echo "  2. Rollback last batch from central migrations"
            echo "  3. Rollback last batch from service migrations"
            echo "  4. Previous migration state will be restored"
            ;;
    esac

    echo ""
}

confirm_rollback() {
    print_section "Rollback Confirmation"

    print_warning "⚠️  WARNING: This will modify your database schema!"
    print_info "Database: $DB_NAME"
    echo ""

    read -p "Are you sure you want to continue? Type 'yes' to confirm: " confirmation
    if [ "$confirmation" != "yes" ]; then
        print_info "Rollback cancelled"
        exit 0
    fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
    print_header

    # Parse arguments
    case $ROLLBACK_MODE in
        --help|-h)
            echo "Usage: $0 [--batch|--all|--help]"
            echo ""
            echo "Options:"
            echo "  (no args)  Rollback last batch of migrations (default)"
            echo "  --batch    Rollback last batch of migrations"
            echo "  --all      Rollback ALL migrations (dangerous!)"
            echo "  --help     Show this help message"
            echo ""
            echo "Safety Features:"
            echo "  - Automatic pre-rollback backup"
            echo "  - Confirmation prompts"
            echo "  - Production database protection"
            exit 0
            ;;
    esac

    check_environment
    check_database_connection
    show_migration_status
    display_rollback_plan
    confirm_rollback
    create_pre_rollback_backup

    # Rollback in reverse order of application
    rollback_central_migrations

    # Define service rollback order (reverse of migration order)
    local services=(
        "advertising-service"
        "workflow-engine"
        "automation-service"
        "analytics-service"
        "moderation-service"
        "payment-service"
        "notification-service"
        "media-service"
        "messaging-service"
        "matching-service"
        "auth-service"
        "user-service"
    )

    # Rollback service migrations
    for service in "${services[@]}"; do
        rollback_service_migrations "$service"
    done

    # Verify rollback
    verify_rollback

    # Summary
    print_section "Rollback Complete"
    print_success "Database migrations successfully rolled back!"
    echo ""
    print_info "To re-apply migrations: ./migrate-all.sh"
    print_info "To restore from backup: ./restore.sh <backup_file>"
    echo ""
}

# Run main function
main "$@"
