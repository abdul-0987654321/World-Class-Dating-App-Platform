#!/bin/bash

##############################################################################
# Flamoral Dating Platform - Migration Runner Script
# Purpose: Run database migrations with comprehensive checks and reporting
# Usage: ./run-migrations.sh [--rollback|--reset|--status|--verify]
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
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}Flamoral Dating Platform - Database Migration Runner${NC}      ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
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
        print_warning ".env file not found"
        if [ -f "$ENV_EXAMPLE" ]; then
            print_info "Copying .env.example to .env"
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            print_success "Created .env file"
            print_warning "Please update .env with your database credentials"
            exit 1
        else
            print_error "Neither .env nor .env.example found"
            exit 1
        fi
    else
        print_success "Environment file found"
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

    print_success "All required environment variables set"
}

##############################################################################
# Database Connection Check
##############################################################################

check_database_connection() {
    print_section "Checking Database Connection"

    print_info "Connecting to: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

    # Try to connect to PostgreSQL
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
        print_success "PostgreSQL server is accessible"
    else
        print_error "Cannot connect to PostgreSQL server"
        print_info "Please check:"
        echo "  - PostgreSQL is running"
        echo "  - Host/Port are correct: ${DB_HOST}:${DB_PORT}"
        echo "  - Username/Password are correct"
        exit 1
    fi

    # Check if database exists
    DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")

    if [ "$DB_EXISTS" = "1" ]; then
        print_success "Database '$DB_NAME' exists"
    else
        print_warning "Database '$DB_NAME' does not exist"
        read -p "Create database '$DB_NAME'? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
            print_success "Database created successfully"
        else
            print_error "Database does not exist. Exiting."
            exit 1
        fi
    fi

    # Check PostgreSQL version
    PG_VERSION=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SHOW server_version;" 2>/dev/null | cut -d' ' -f1)
    print_info "PostgreSQL version: $PG_VERSION"

    # Check if pgcrypto extension is available
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null
    print_success "pgcrypto extension enabled"
}

##############################################################################
# Node.js and Dependencies Check
##############################################################################

check_dependencies() {
    print_section "Checking Dependencies"

    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js not found"
        print_info "Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_success "npm found: v$NPM_VERSION"
    else
        print_error "npm not found"
        exit 1
    fi

    # Check if node_modules exists
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        print_warning "node_modules not found"
        print_info "Installing dependencies..."
        cd "$SCRIPT_DIR"
        npm install
        print_success "Dependencies installed"
    else
        print_success "node_modules found"
    fi

    # Check if knex is installed
    if [ -f "$SCRIPT_DIR/node_modules/.bin/knex" ]; then
        print_success "Knex.js installed"
    else
        print_error "Knex.js not found in node_modules"
        print_info "Running npm install..."
        cd "$SCRIPT_DIR"
        npm install
    fi
}

##############################################################################
# Migration Functions
##############################################################################

run_migrations() {
    print_section "Running Migrations"

    cd "$SCRIPT_DIR"

    print_info "Executing: npm run migrate:latest"

    if npm run migrate:latest; then
        print_success "Migrations completed successfully"
    else
        print_error "Migration failed"
        exit 1
    fi
}

rollback_migrations() {
    print_section "Rolling Back Migrations"

    cd "$SCRIPT_DIR"

    print_warning "This will rollback the last batch of migrations"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Executing: npm run migrate:rollback"

        if npm run migrate:rollback; then
            print_success "Rollback completed successfully"
        else
            print_error "Rollback failed"
            exit 1
        fi
    else
        print_info "Rollback cancelled"
    fi
}

reset_database() {
    print_section "Resetting Database"

    cd "$SCRIPT_DIR"

    print_warning "This will rollback ALL migrations and re-run them"
    print_warning "ALL DATA WILL BE LOST!"
    read -p "Are you sure? Type 'RESET' to confirm: " -r
    echo
    if [[ $REPLY == "RESET" ]]; then
        print_info "Executing: npm run db:fresh"

        if npm run db:fresh; then
            print_success "Database reset completed successfully"
        else
            print_error "Database reset failed"
            exit 1
        fi
    else
        print_info "Reset cancelled"
    fi
}

show_migration_status() {
    print_section "Migration Status"

    cd "$SCRIPT_DIR"

    print_info "Checking migration status..."
    npm run migrate:status
}

##############################################################################
# Database Verification
##############################################################################

verify_database() {
    print_section "Verifying Database Schema"

    # Count tables
    TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null)

    if [ "$TABLE_COUNT" -eq 40 ]; then
        print_success "Found 40 tables (expected: 40)"
    else
        print_warning "Found $TABLE_COUNT tables (expected: 40)"
    fi

    # List all tables
    print_info "Tables in database:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null

    # Count indexes
    INDEX_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null)
    print_info "Total indexes: $INDEX_COUNT"

    # Count triggers
    TRIGGER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';" 2>/dev/null)
    print_info "Total triggers: $TRIGGER_COUNT"

    # Check for required tables
    print_info "Verifying critical tables..."

    local critical_tables=("users" "profiles" "swipes" "matches" "messages" "subscriptions" "coins" "boosts")
    local missing_tables=()

    for table in "${critical_tables[@]}"; do
        EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" 2>/dev/null)
        if [ "$EXISTS" -eq 1 ]; then
            echo -e "  ${GREEN}✓${NC} $table"
        else
            echo -e "  ${RED}✗${NC} $table"
            missing_tables+=("$table")
        fi
    done

    if [ ${#missing_tables[@]} -eq 0 ]; then
        print_success "All critical tables exist"
    else
        print_error "Missing critical tables: ${missing_tables[*]}"
    fi
}

##############################################################################
# Generate Summary Report
##############################################################################

generate_report() {
    print_section "Migration Summary Report"

    # Get migration info
    cd "$SCRIPT_DIR"

    echo -e "\n${CYAN}Database Information:${NC}"
    echo "  Host: $DB_HOST:$DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"

    echo -e "\n${CYAN}Migration Status:${NC}"
    npm run migrate:status 2>/dev/null || echo "  No migrations run yet"

    echo -e "\n${CYAN}Schema Statistics:${NC}"
    TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")
    INDEX_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null || echo "0")
    TRIGGER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';" 2>/dev/null || echo "0")

    echo "  Tables: $TABLE_COUNT"
    echo "  Indexes: $INDEX_COUNT"
    echo "  Triggers: $TRIGGER_COUNT"

    # Get record counts for seeded data
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "\n${CYAN}Seeded Data:${NC}"

        PLANS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM subscription_plans;" 2>/dev/null || echo "0")
        COINS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM coin_packages;" 2>/dev/null || echo "0")
        BOOSTS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM boost_products;" 2>/dev/null || echo "0")
        PROMPTS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM prompts;" 2>/dev/null || echo "0")
        TEMPLATES_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM notification_templates;" 2>/dev/null || echo "0")

        echo "  Subscription Plans: $PLANS_COUNT (expected: 4)"
        echo "  Coin Packages: $COINS_COUNT (expected: 5)"
        echo "  Boost Products: $BOOSTS_COUNT (expected: 3)"
        echo "  Prompts: $PROMPTS_COUNT (expected: 8)"
        echo "  Notification Templates: $TEMPLATES_COUNT (expected: 10)"
    fi

    echo ""
}

##############################################################################
# Main Script
##############################################################################

main() {
    print_header

    # Parse arguments
    case "${1:-}" in
        --rollback)
            check_environment
            check_database_connection
            check_dependencies
            rollback_migrations
            show_migration_status
            verify_database
            ;;
        --reset)
            check_environment
            check_database_connection
            check_dependencies
            reset_database
            show_migration_status
            verify_database
            ;;
        --status)
            check_environment
            check_database_connection
            check_dependencies
            show_migration_status
            verify_database
            ;;
        --verify)
            check_environment
            check_database_connection
            verify_database
            generate_report
            ;;
        --help|-h)
            echo "Usage: $0 [OPTION]"
            echo ""
            echo "Options:"
            echo "  (no option)   Run migrations (default)"
            echo "  --rollback    Rollback last migration batch"
            echo "  --reset       Reset database (rollback all + re-migrate)"
            echo "  --status      Show migration status"
            echo "  --verify      Verify database schema"
            echo "  --help, -h    Show this help message"
            echo ""
            exit 0
            ;;
        "")
            # Default action: run migrations
            check_environment
            check_database_connection
            check_dependencies
            run_migrations
            show_migration_status
            verify_database
            generate_report
            print_success "All operations completed successfully!"
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
