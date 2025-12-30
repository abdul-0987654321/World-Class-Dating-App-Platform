#!/bin/bash

##############################################################################
# Flamoral Dating Platform - Database Health Check Script
# Purpose: Comprehensive database health monitoring and diagnostics
# Usage: ./health-check.sh [--detailed|--quick|--json]
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
ENV_FILE="$DATABASE_DIR/.env"

# Check mode
CHECK_MODE="${1:-detailed}"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    if [ "$CHECK_MODE" != "--json" ]; then
        echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║${NC}  ${MAGENTA}Flamoral Dating Platform - Database Health Check${NC}            ${CYAN}║${NC}"
        echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
    fi
}

print_section() {
    if [ "$CHECK_MODE" != "--json" ]; then
        echo -e "\n${BLUE}▶ $1${NC}"
        echo -e "${BLUE}$(printf '─%.0s' {1..70})${NC}"
    fi
}

print_success() {
    if [ "$CHECK_MODE" != "--json" ]; then
        echo -e "${GREEN}✓ $1${NC}"
    fi
}

print_error() {
    if [ "$CHECK_MODE" != "--json" ]; then
        echo -e "${RED}✗ $1${NC}"
    fi
}

print_warning() {
    if [ "$CHECK_MODE" != "--json" ]; then
        echo -e "${YELLOW}⚠ $1${NC}"
    fi
}

print_info() {
    if [ "$CHECK_MODE" != "--json" ]; then
        echo -e "${CYAN}ℹ $1${NC}"
    fi
}

##############################################################################
# Environment Setup
##############################################################################

check_environment() {
    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env file not found at $ENV_FILE"
        exit 1
    fi

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
}

##############################################################################
# Health Check Functions
##############################################################################

check_connection() {
    print_section "Database Connection"

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        print_success "Connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        return 1
    fi
}

check_version() {
    print_section "PostgreSQL Version"

    local version=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();")
    print_info "$(echo $version | xargs)"

    local pg_version=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SHOW server_version;")
    print_success "PostgreSQL $(echo $pg_version | xargs)"
}

check_database_size() {
    print_section "Database Size"

    local db_size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")

    print_info "Total size: $(echo $db_size | xargs)"

    # Check table sizes
    print_info "Largest tables:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            schemaname || '.' || tablename AS table_name,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 5;
    " | sed 's/^/  /'
}

check_connections() {
    print_section "Active Connections"

    local total_conn=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';")

    local max_conn=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SHOW max_connections;")

    total_conn=$(echo $total_conn | xargs)
    max_conn=$(echo $max_conn | xargs)

    print_info "Active connections: $total_conn / $max_conn"

    local conn_percentage=$((100 * total_conn / max_conn))

    if [ $conn_percentage -gt 80 ]; then
        print_error "High connection usage: ${conn_percentage}%"
    elif [ $conn_percentage -gt 60 ]; then
        print_warning "Moderate connection usage: ${conn_percentage}%"
    else
        print_success "Connection usage: ${conn_percentage}%"
    fi

    # Show connection details
    if [ "$CHECK_MODE" = "--detailed" ]; then
        print_info "Connections by state:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT
                state,
                count(*) as count
            FROM pg_stat_activity
            WHERE datname = '$DB_NAME'
            GROUP BY state
            ORDER BY count DESC;
        " | sed 's/^/  /'
    fi
}

check_locks() {
    print_section "Database Locks"

    local lock_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT count(*) FROM pg_locks WHERE database = (SELECT oid FROM pg_database WHERE datname = '$DB_NAME');")

    lock_count=$(echo $lock_count | xargs)

    if [ $lock_count -gt 100 ]; then
        print_warning "High number of locks: $lock_count"

        # Show blocking queries
        print_info "Blocking queries:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT
                blocked_locks.pid AS blocked_pid,
                blocking_locks.pid AS blocking_pid,
                blocked_activity.query AS blocked_query
            FROM pg_catalog.pg_locks blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
            JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
            WHERE NOT blocked_locks.granted
            LIMIT 5;
        " | sed 's/^/  /'
    else
        print_success "Lock count: $lock_count"
    fi
}

check_long_running_queries() {
    print_section "Long Running Queries"

    local long_queries=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            pid,
            now() - query_start AS duration,
            state,
            LEFT(query, 60) AS query
        FROM pg_stat_activity
        WHERE state != 'idle'
          AND query NOT LIKE '%pg_stat_activity%'
          AND now() - query_start > interval '1 minute'
        ORDER BY duration DESC
        LIMIT 5;
    ")

    if [ -z "$long_queries" ]; then
        print_success "No long running queries"
    else
        print_warning "Long running queries detected:"
        echo "$long_queries" | sed 's/^/  /'
    fi
}

check_replication() {
    print_section "Replication Status"

    local is_replica=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT pg_is_in_recovery();")

    if [ "$(echo $is_replica | xargs)" = "t" ]; then
        print_info "This is a replica (read-only)"

        # Check replication lag
        local lag=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));")

        lag=$(echo $lag | xargs)
        print_info "Replication lag: ${lag}s"

        if (( $(echo "$lag > 60" | bc -l) )); then
            print_error "High replication lag: ${lag}s"
        else
            print_success "Replication lag: ${lag}s"
        fi
    else
        print_info "This is a primary (read-write)"
    fi
}

check_table_bloat() {
    print_section "Table Bloat Analysis"

    print_info "Tables with potential bloat:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            schemaname || '.' || tablename AS table_name,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
            n_dead_tup AS dead_tuples
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
        ORDER BY n_dead_tup DESC
        LIMIT 5;
    " | sed 's/^/  /'

    # Recommend vacuum if needed
    local dead_tuple_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT SUM(n_dead_tup) FROM pg_stat_user_tables;")

    dead_tuple_count=$(echo $dead_tuple_count | xargs)

    if [ -n "$dead_tuple_count" ] && [ $dead_tuple_count -gt 10000 ]; then
        print_warning "High dead tuple count: $dead_tuple_count"
        print_info "Recommendation: Run VACUUM ANALYZE"
    fi
}

check_index_health() {
    print_section "Index Health"

    # Unused indexes
    print_info "Unused indexes (never scanned):"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            schemaname || '.' || tablename AS table_name,
            indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) AS size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND schemaname = 'public'
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 5;
    " | sed 's/^/  /'

    # Missing indexes (high seq scans)
    print_info "Tables with high sequential scans (may need indexes):"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            schemaname || '.' || tablename AS table_name,
            seq_scan,
            seq_tup_read,
            idx_scan,
            n_live_tup
        FROM pg_stat_user_tables
        WHERE seq_scan > 100
          AND n_live_tup > 1000
        ORDER BY seq_scan DESC
        LIMIT 5;
    " | sed 's/^/  /'
}

check_cache_hit_ratio() {
    print_section "Cache Hit Ratio"

    local cache_hit=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2) AS cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = '$DB_NAME';
    ")

    cache_hit=$(echo $cache_hit | xargs)

    if (( $(echo "$cache_hit < 90" | bc -l) )); then
        print_warning "Low cache hit ratio: ${cache_hit}%"
        print_info "Recommendation: Consider increasing shared_buffers"
    elif (( $(echo "$cache_hit < 95" | bc -l) )); then
        print_success "Moderate cache hit ratio: ${cache_hit}%"
    else
        print_success "Excellent cache hit ratio: ${cache_hit}%"
    fi
}

check_transaction_stats() {
    print_section "Transaction Statistics"

    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            'Commits: ' || xact_commit,
            'Rollbacks: ' || xact_rollback,
            'Ratio: ' || ROUND(100.0 * xact_commit / NULLIF(xact_commit + xact_rollback, 0), 2) || '%'
        FROM pg_stat_database
        WHERE datname = '$DB_NAME';
    " | sed 's/^/  /'
}

check_table_statistics() {
    print_section "Table Statistics"

    print_info "Table row counts:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT
            schemaname || '.' || tablename AS table_name,
            n_live_tup AS row_count,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
        FROM pg_stat_user_tables
        WHERE n_live_tup > 0
        ORDER BY n_live_tup DESC
        LIMIT 10;
    " | sed 's/^/  /'
}

check_migration_status() {
    print_section "Migration Status"

    # Check if migrations table exists
    local has_migrations=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'knex_migrations');")

    if [ "$(echo $has_migrations | xargs)" = "t" ]; then
        local migration_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT count(*) FROM knex_migrations;")

        print_success "Migrations applied: $(echo $migration_count | xargs)"

        if [ "$CHECK_MODE" = "--detailed" ]; then
            print_info "Recent migrations:"
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                SELECT name, migration_time
                FROM knex_migrations
                ORDER BY migration_time DESC
                LIMIT 5;
            " | sed 's/^/  /'
        fi
    else
        print_warning "No migration tracking table found"
    fi
}

generate_health_score() {
    print_section "Overall Health Score"

    # This is a simplified health score calculation
    # In production, you'd want more sophisticated metrics

    local score=100

    # Deduct points for issues
    local conn_percentage=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT ROUND(100.0 * count(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'))
         FROM pg_stat_activity WHERE datname = '$DB_NAME';" | xargs)

    if [ $conn_percentage -gt 80 ]; then
        score=$((score - 20))
    elif [ $conn_percentage -gt 60 ]; then
        score=$((score - 10))
    fi

    # Cache hit ratio
    local cache_hit=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0))
        FROM pg_stat_database WHERE datname = '$DB_NAME';" | xargs)

    if [ -n "$cache_hit" ]; then
        if [ $cache_hit -lt 90 ]; then
            score=$((score - 15))
        elif [ $cache_hit -lt 95 ]; then
            score=$((score - 5))
        fi
    fi

    # Display score
    if [ $score -ge 90 ]; then
        print_success "Health Score: ${score}/100 - Excellent"
    elif [ $score -ge 70 ]; then
        print_success "Health Score: ${score}/100 - Good"
    elif [ $score -ge 50 ]; then
        print_warning "Health Score: ${score}/100 - Fair"
    else
        print_error "Health Score: ${score}/100 - Poor"
    fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
    # Parse arguments
    case $CHECK_MODE in
        --help|-h)
            echo "Usage: $0 [--detailed|--quick|--json]"
            echo ""
            echo "Options:"
            echo "  (no args)   Run detailed health check (default)"
            echo "  --detailed  Run comprehensive health check"
            echo "  --quick     Run quick health check"
            echo "  --json      Output results in JSON format"
            echo "  --help      Show this help message"
            exit 0
            ;;
    esac

    print_header
    check_environment

    # Run checks
    if ! check_connection; then
        exit 1
    fi

    check_version
    check_database_size
    check_connections
    check_migration_status

    if [ "$CHECK_MODE" = "--detailed" ] || [ -z "$CHECK_MODE" ]; then
        check_locks
        check_long_running_queries
        check_replication
        check_table_bloat
        check_index_health
        check_cache_hit_ratio
        check_transaction_stats
        check_table_statistics
    fi

    generate_health_score

    # Summary
    if [ "$CHECK_MODE" != "--json" ]; then
        print_section "Health Check Complete"
        echo ""
        print_info "For detailed analysis: $0 --detailed"
        echo ""
    fi
}

# Run main function
main "$@"
