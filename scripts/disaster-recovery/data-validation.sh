#!/bin/bash
# Data Validation and Integrity Check Script
# Flamoral Dating Platform - Disaster Recovery

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="/var/log/flamoral-validation"
LOG_FILE="${LOG_DIR}/validation-${TIMESTAMP}.log"

# Database Configuration
PG_HOST="${POSTGRES_HOST:-postgres-primary.flamoral-dating.svc.cluster.local}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-psqladmin}"
PG_PASSWORD="${POSTGRES_PASSWORD:-}"

# Cosmos DB Configuration
COSMOS_ENDPOINT="${COSMOS_ENDPOINT:-}"
COSMOS_KEY="${COSMOS_KEY:-}"

# Validation mode
VALIDATION_MODE="${VALIDATION_MODE:-full}" # quick, full, comprehensive
GENERATE_REPORT="${GENERATE_REPORT:-true}"

# Thresholds
MIN_USER_COUNT=100
MIN_MATCH_COUNT=50
MIN_MESSAGE_COUNT=100

# ============================================================================
# Logging Functions
# ============================================================================

setup_logging() {
    mkdir -p "${LOG_DIR}"
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2>&1
}

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

log_info() {
    log "INFO: $*"
}

log_error() {
    log "ERROR: $*"
}

log_success() {
    log "SUCCESS: $*"
}

log_warning() {
    log "WARNING: $*"
}

# Validation result tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# ============================================================================
# Validation Helper Functions
# ============================================================================

check_result() {
    local check_name="$1"
    local result="$2"
    local expected="$3"

    ((TOTAL_CHECKS++))

    if [[ "${result}" == "${expected}" ]]; then
        log_success "[PASS] ${check_name}"
        ((PASSED_CHECKS++))
        return 0
    else
        log_error "[FAIL] ${check_name}: Expected ${expected}, got ${result}"
        ((FAILED_CHECKS++))
        return 1
    fi
}

check_threshold() {
    local check_name="$1"
    local actual="$2"
    local threshold="$3"

    ((TOTAL_CHECKS++))

    if [[ ${actual} -ge ${threshold} ]]; then
        log_success "[PASS] ${check_name}: ${actual} >= ${threshold}"
        ((PASSED_CHECKS++))
        return 0
    else
        log_warning "[WARN] ${check_name}: ${actual} < ${threshold}"
        ((WARNING_CHECKS++))
        return 1
    fi
}

# ============================================================================
# PostgreSQL Validation
# ============================================================================

validate_postgresql() {
    log_info "Validating PostgreSQL databases..."

    # Check connectivity
    if ! PGPASSWORD="${PG_PASSWORD}" psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -c "SELECT 1" &> /dev/null; then
        log_error "Cannot connect to PostgreSQL"
        ((FAILED_CHECKS++))
        return 1
    fi

    log_success "PostgreSQL connectivity OK"

    local databases=(
        "flamoral_users"
        "flamoral_auth"
        "flamoral_matching"
        "flamoral_payments"
        "flamoral_media"
        "flamoral_analytics"
        "flamoral_notifications"
        "flamoral_moderation"
    )

    for db in "${databases[@]}"; do
        validate_database "${db}"
    done
}

validate_database() {
    local db_name="$1"

    log_info "Validating database: ${db_name}"

    # Check database exists
    local db_exists=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d postgres -t -c \
        "SELECT COUNT(*) FROM pg_database WHERE datname = '${db_name}';" | tr -d ' ')

    check_result "${db_name} exists" "${db_exists}" "1" || return 1

    # Check table count
    local table_count=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d "${db_name}" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

    log_info "${db_name}: ${table_count} tables"

    if [[ ${table_count} -eq 0 ]]; then
        log_error "${db_name} has no tables"
        ((FAILED_CHECKS++))
        return 1
    fi

    # Database-specific validations
    case "${db_name}" in
        flamoral_users)
            validate_users_database
            ;;
        flamoral_matching)
            validate_matching_database
            ;;
        flamoral_payments)
            validate_payments_database
            ;;
        flamoral_media)
            validate_media_database
            ;;
    esac
}

validate_users_database() {
    log_info "Validating users database..."

    # Check user count
    local user_count=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_users -t -c \
        "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;" | tr -d ' ')

    check_threshold "Active users" "${user_count}" "${MIN_USER_COUNT}"

    # Check for users without profiles
    local users_without_profiles=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_users -t -c \
        "SELECT COUNT(*) FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE p.id IS NULL AND u.deleted_at IS NULL;" | tr -d ' ')

    if [[ ${users_without_profiles} -gt 0 ]]; then
        log_warning "${users_without_profiles} users without profiles"
        ((WARNING_CHECKS++))
    fi

    # Check data integrity: email uniqueness
    local duplicate_emails=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_users -t -c \
        "SELECT COUNT(*) FROM (
            SELECT email, COUNT(*) as cnt
            FROM users
            WHERE deleted_at IS NULL
            GROUP BY email
            HAVING COUNT(*) > 1
        ) duplicates;" | tr -d ' ')

    check_result "No duplicate emails" "${duplicate_emails}" "0"

    # Check for orphaned records
    local orphaned_profiles=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_users -t -c \
        "SELECT COUNT(*) FROM profiles p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE u.id IS NULL;" | tr -d ' ')

    check_result "No orphaned profiles" "${orphaned_profiles}" "0"

    # Validate recent activity
    local recent_signups=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_users -t -c \
        "SELECT COUNT(*) FROM users
         WHERE created_at > NOW() - INTERVAL '24 hours';" | tr -d ' ')

    log_info "Recent signups (24h): ${recent_signups}"
}

validate_matching_database() {
    log_info "Validating matching database..."

    # Check match count
    local match_count=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_matching -t -c \
        "SELECT COUNT(*) FROM matches WHERE status = 'active';" | tr -d ' ')

    check_threshold "Active matches" "${match_count}" "${MIN_MATCH_COUNT}"

    # Check for invalid matches (same user)
    local self_matches=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_matching -t -c \
        "SELECT COUNT(*) FROM matches WHERE user_id = matched_user_id;" | tr -d ' ')

    check_result "No self-matches" "${self_matches}" "0"

    # Check swipe data integrity
    local total_swipes=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_matching -t -c \
        "SELECT COUNT(*) FROM swipes;" | tr -d ' ')

    log_info "Total swipes: ${total_swipes}"

    # Check for duplicate swipes
    local duplicate_swipes=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_matching -t -c \
        "SELECT COUNT(*) FROM (
            SELECT user_id, swiped_user_id, COUNT(*)
            FROM swipes
            GROUP BY user_id, swiped_user_id
            HAVING COUNT(*) > 1
        ) duplicates;" | tr -d ' ')

    check_result "No duplicate swipes" "${duplicate_swipes}" "0"
}

validate_payments_database() {
    log_info "Validating payments database..."

    # Check for transactions
    local transaction_count=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_payments -t -c \
        "SELECT COUNT(*) FROM transactions;" | tr -d ' ')

    log_info "Total transactions: ${transaction_count}"

    # Check for failed transactions needing attention
    local failed_transactions=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_payments -t -c \
        "SELECT COUNT(*) FROM transactions
         WHERE status = 'failed'
         AND created_at > NOW() - INTERVAL '7 days';" | tr -d ' ')

    if [[ ${failed_transactions} -gt 0 ]]; then
        log_warning "${failed_transactions} failed transactions in last 7 days"
    fi

    # Check payment integrity: no negative amounts
    local negative_amounts=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_payments -t -c \
        "SELECT COUNT(*) FROM transactions WHERE amount < 0;" | tr -d ' ')

    check_result "No negative amounts" "${negative_amounts}" "0"

    # Check subscription consistency
    local active_subscriptions=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_payments -t -c \
        "SELECT COUNT(*) FROM subscriptions WHERE status = 'active';" | tr -d ' ')

    log_info "Active subscriptions: ${active_subscriptions}"
}

validate_media_database() {
    log_info "Validating media database..."

    # Check media records
    local media_count=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_media -t -c \
        "SELECT COUNT(*) FROM media;" | tr -d ' ')

    log_info "Total media files: ${media_count}"

    # Check for orphaned media
    local orphaned_media=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_media -t -c \
        "SELECT COUNT(*) FROM media m
         WHERE NOT EXISTS (
            SELECT 1 FROM flamoral_users.profiles p
            WHERE m.user_id = p.user_id
         );" | tr -d ' ')

    if [[ ${orphaned_media} -gt 0 ]]; then
        log_warning "${orphaned_media} orphaned media files"
    fi

    # Check for missing storage paths
    local missing_paths=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_media -t -c \
        "SELECT COUNT(*) FROM media
         WHERE storage_path IS NULL OR storage_path = '';" | tr -d ' ')

    check_result "No missing storage paths" "${missing_paths}" "0"
}

# ============================================================================
# Cosmos DB Validation
# ============================================================================

validate_cosmosdb() {
    log_info "Validating Cosmos DB..."

    if [[ -z "${COSMOS_ENDPOINT}" ]] || [[ -z "${COSMOS_KEY}" ]]; then
        log_warning "Cosmos DB credentials not provided, skipping"
        return 0
    fi

    # Check connectivity
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: ${COSMOS_KEY}" \
        "${COSMOS_ENDPOINT}/dbs")

    if [[ "${response}" == "200" ]]; then
        log_success "Cosmos DB connectivity OK"
        ((PASSED_CHECKS++))
    else
        log_error "Cosmos DB connectivity failed: ${response}"
        ((FAILED_CHECKS++))
    fi

    ((TOTAL_CHECKS++))

    # Note: For detailed Cosmos DB validation, you would use the Azure SDK
    log_info "Detailed Cosmos DB validation requires Azure SDK"
}

# ============================================================================
# Redis Validation
# ============================================================================

validate_redis() {
    log_info "Validating Redis..."

    local redis_host="${REDIS_HOST:-redis-cluster.flamoral-dating.svc.cluster.local}"
    local redis_port="${REDIS_PORT:-6379}"

    # Check connectivity
    if redis-cli -h "${redis_host}" -p "${redis_port}" PING | grep -q "PONG"; then
        log_success "Redis connectivity OK"
        ((PASSED_CHECKS++))
    else
        log_error "Redis connectivity failed"
        ((FAILED_CHECKS++))
        return 1
    fi

    ((TOTAL_CHECKS++))

    # Check key count
    local key_count=$(redis-cli -h "${redis_host}" -p "${redis_port}" DBSIZE | awk '{print $2}')
    log_info "Redis key count: ${key_count}"

    # Check memory usage
    local memory_used=$(redis-cli -h "${redis_host}" -p "${redis_port}" INFO memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r\n ')
    log_info "Redis memory used: ${memory_used}"

    # Check for expired keys
    local expired_keys=$(redis-cli -h "${redis_host}" -p "${redis_port}" INFO stats | grep "expired_keys" | cut -d: -f2 | tr -d '\r\n ')
    log_info "Expired keys: ${expired_keys}"
}

# ============================================================================
# Kubernetes Resources Validation
# ============================================================================

validate_kubernetes() {
    log_info "Validating Kubernetes resources..."

    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not found, skipping Kubernetes validation"
        return 0
    fi

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        ((FAILED_CHECKS++))
        ((TOTAL_CHECKS++))
        return 1
    fi

    log_success "Kubernetes connectivity OK"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))

    # Check pods
    local namespace="flamoral-dating"
    local total_pods=$(kubectl get pods -n "${namespace}" --no-headers 2>/dev/null | wc -l)
    local running_pods=$(kubectl get pods -n "${namespace}" --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    local failed_pods=$(kubectl get pods -n "${namespace}" --field-selector=status.phase=Failed --no-headers 2>/dev/null | wc -l)

    log_info "Pods: ${running_pods}/${total_pods} running"

    if [[ ${failed_pods} -gt 0 ]]; then
        log_error "${failed_pods} pods in Failed state"
        ((FAILED_CHECKS++))
    else
        ((PASSED_CHECKS++))
    fi

    ((TOTAL_CHECKS++))

    # Check services
    local services=$(kubectl get svc -n "${namespace}" --no-headers 2>/dev/null | wc -l)
    log_info "Services: ${services}"

    # Check ingress
    local ingress_count=$(kubectl get ingress -n "${namespace}" --no-headers 2>/dev/null | wc -l)
    log_info "Ingress resources: ${ingress_count}"
}

# ============================================================================
# Application Health Check
# ============================================================================

validate_application_health() {
    log_info "Validating application health endpoints..."

    local services=(
        "auth-service:3001"
        "user-service:3002"
        "matching-service:3003"
        "messaging-service:3004"
        "payment-service:3005"
        "api-gateway:3000"
    )

    for service_port in "${services[@]}"; do
        local service="${service_port%%:*}"
        local port="${service_port##*:}"
        local health_url="http://${service}.flamoral-dating.svc.cluster.local:${port}/health"

        local response=$(curl -s -o /dev/null -w "%{http_code}" "${health_url}" 2>/dev/null || echo "000")

        if [[ "${response}" == "200" ]]; then
            log_success "${service} health check passed"
            ((PASSED_CHECKS++))
        else
            log_error "${service} health check failed: ${response}"
            ((FAILED_CHECKS++))
        fi

        ((TOTAL_CHECKS++))
    done
}

# ============================================================================
# Cross-Service Data Consistency
# ============================================================================

validate_data_consistency() {
    log_info "Validating cross-service data consistency..."

    # Check user count consistency
    local users_in_users_db=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_users -t -c \
        "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;" | tr -d ' ')

    local users_with_profiles=$(PGPASSWORD="${PG_PASSWORD}" psql \
        -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" \
        -d flamoral_users -t -c \
        "SELECT COUNT(DISTINCT user_id) FROM profiles;" | tr -d ' ')

    log_info "Users in users table: ${users_in_users_db}"
    log_info "Users with profiles: ${users_with_profiles}"

    local diff=$((users_in_users_db - users_with_profiles))
    if [[ ${diff} -gt 10 ]]; then
        log_warning "Significant difference in user counts: ${diff}"
        ((WARNING_CHECKS++))
    else
        ((PASSED_CHECKS++))
    fi

    ((TOTAL_CHECKS++))
}

# ============================================================================
# Generate Validation Report
# ============================================================================

generate_report() {
    if [[ "${GENERATE_REPORT}" != "true" ]]; then
        return 0
    fi

    local report_file="${LOG_DIR}/validation-report-${TIMESTAMP}.txt"
    local pass_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

    cat > "${report_file}" <<EOF
========================================
Data Validation Report
========================================
Date: $(date)
Timestamp: ${TIMESTAMP}
Environment: ${ENV:-production}
Validation Mode: ${VALIDATION_MODE}

Summary:
  Total Checks: ${TOTAL_CHECKS}
  Passed: ${PASSED_CHECKS}
  Failed: ${FAILED_CHECKS}
  Warnings: ${WARNING_CHECKS}
  Pass Rate: ${pass_rate}%

Status: $([ ${FAILED_CHECKS} -eq 0 ] && echo "PASSED" || echo "FAILED")

Components Validated:
  - PostgreSQL databases
  - Cosmos DB
  - Redis
  - Kubernetes resources
  - Application health
  - Data consistency

Log File: ${LOG_FILE}

$([ ${FAILED_CHECKS} -gt 0 ] && echo "CRITICAL ISSUES FOUND - REVIEW REQUIRED")

========================================
EOF

    cat "${report_file}"

    log_success "Validation report generated: ${report_file}"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    setup_logging

    log_info "========================================"
    log_info "Data Validation Started"
    log_info "Mode: ${VALIDATION_MODE}"
    log_info "========================================"

    # Parse options
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --quick) VALIDATION_MODE="quick"; shift ;;
            --full) VALIDATION_MODE="full"; shift ;;
            --comprehensive) VALIDATION_MODE="comprehensive"; shift ;;
            --no-report) GENERATE_REPORT="false"; shift ;;
            *) shift ;;
        esac
    done

    # Run validations based on mode
    case "${VALIDATION_MODE}" in
        quick)
            validate_postgresql
            validate_kubernetes
            ;;
        full)
            validate_postgresql
            validate_cosmosdb
            validate_redis
            validate_kubernetes
            validate_application_health
            ;;
        comprehensive)
            validate_postgresql
            validate_cosmosdb
            validate_redis
            validate_kubernetes
            validate_application_health
            validate_data_consistency
            ;;
        *)
            log_error "Invalid validation mode: ${VALIDATION_MODE}"
            exit 1
            ;;
    esac

    generate_report

    log_info "========================================"
    log_info "Validation Completed"
    log_info "Passed: ${PASSED_CHECKS}/${TOTAL_CHECKS}"
    log_info "Failed: ${FAILED_CHECKS}"
    log_info "Warnings: ${WARNING_CHECKS}"
    log_info "========================================"

    # Exit with appropriate code
    if [[ ${FAILED_CHECKS} -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

main "$@"
