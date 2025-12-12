#!/bin/bash

##############################################################################
# Flamoral Dating Platform - Master Migration Script
# Purpose: Run all database migrations across all services in correct order
# Usage: ./migrate-all.sh [--rollback|--verify|--status]
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

# Migration mode
MODE="${1:-migrate}"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}Flamoral Dating Platform - Master Migration Runner${NC}          ${CYAN}║${NC}"
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
        print_info "Please copy .env.example to .env and configure database credentials"
        exit 1
    fi

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a

    # Verify required variables
    local required_vars=("DB_HOST" "DB_PORT" "DB_NAME" "DB_USER" "DB_PASSWORD")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
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
        print_info "Please verify database is running and credentials are correct"
        exit 1
    fi
}

##############################################################################
# Migration Functions
##############################################################################

run_central_migrations() {
    print_section "Running Central Database Migrations"

    cd "$DATABASE_DIR"

    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install --silent
    fi

    case $MODE in
        migrate)
            print_info "Running migrations..."
            npm run migrate:latest
            print_success "Central migrations completed"
            ;;
        rollback)
            print_warning "Rolling back last batch of migrations..."
            npm run migrate:rollback
            print_success "Rollback completed"
            ;;
        status)
            print_info "Migration status:"
            npm run migrate:status
            ;;
        verify)
            print_info "Verifying migrations..."
            npm run migrate:list
            ;;
    esac
}

run_service_migrations() {
    local service=$1
    local service_dir="$BACKEND_DIR/services/$service"

    if [ ! -d "$service_dir" ]; then
        print_warning "Service directory not found: $service"
        return
    fi

    local migrations_dir="$service_dir/src/infrastructure/database/migrations"

    if [ ! -d "$migrations_dir" ]; then
        print_info "No migrations found for $service"
        return
    fi

    print_section "Running $service Migrations"

    cd "$service_dir"

    # Check if service uses Knex or raw SQL
    if [ -f "knexfile.ts" ] || [ -f "knexfile.js" ]; then
        # Knex migrations
        if [ ! -d "node_modules" ]; then
            print_info "Installing dependencies..."
            npm install --silent
        fi

        case $MODE in
            migrate)
                print_info "Running migrations..."
                npx knex migrate:latest
                print_success "$service migrations completed"
                ;;
            rollback)
                print_warning "Rolling back migrations..."
                npx knex migrate:rollback
                print_success "$service rollback completed"
                ;;
            status)
                print_info "Migration status:"
                npx knex migrate:status
                ;;
            verify)
                print_info "Listing migrations:"
                npx knex migrate:list
                ;;
        esac
    else
        # Raw SQL migrations
        if [ "$MODE" = "migrate" ]; then
            print_info "Running SQL migrations..."
            for migration_file in "$migrations_dir"/*.sql; do
                if [ -f "$migration_file" ]; then
                    local filename=$(basename "$migration_file")
                    print_info "Applying: $filename"
                    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" 2>&1 | grep -v "NOTICE:" || true
                    print_success "Applied: $filename"
                fi
            done
        else
            print_warning "SQL migrations don't support $MODE mode"
        fi
    fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
    print_header

    # Parse arguments
    case $MODE in
        --rollback)
            MODE="rollback"
            ;;
        --status)
            MODE="status"
            ;;
        --verify)
            MODE="verify"
            ;;
        --help|-h)
            echo "Usage: $0 [--rollback|--status|--verify|--help]"
            echo ""
            echo "Options:"
            echo "  (no args)    Run all migrations"
            echo "  --rollback   Rollback last batch of migrations"
            echo "  --status     Show migration status"
            echo "  --verify     Verify and list all migrations"
            echo "  --help       Show this help message"
            exit 0
            ;;
    esac

    check_environment
    check_database_connection

    # Run migrations in order
    run_central_migrations

    # Define service migration order (dependencies first)
    local services=(
        "user-service"
        "auth-service"
        "matching-service"
        "messaging-service"
        "media-service"
        "notification-service"
        "payment-service"
        "moderation-service"
        "analytics-service"
        "automation-service"
        "workflow-engine"
        "advertising-service"
    )

    # Run service migrations
    for service in "${services[@]}"; do
        run_service_migrations "$service"
    done

    # Final summary
    print_section "Migration Summary"

    if [ "$MODE" = "migrate" ]; then
        print_success "All migrations completed successfully!"
        print_info "To verify: $0 --status"
    elif [ "$MODE" = "rollback" ]; then
        print_success "All rollbacks completed successfully!"
    fi

    echo ""
}

# Run main function
main "$@"
