#!/bin/bash

###############################################################################
# Database Migration Script with Rollback Capability
#
# Runs database migrations for all services with automatic rollback on failure
#
# Usage:
#   ./migrate-databases.sh [OPTIONS]
#
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="production"
DRY_RUN=false
BACKUP_BEFORE_MIGRATE=true
AUTO_ROLLBACK=true
SPECIFIC_SERVICE=""
NAMESPACE="flamoral-dating"

# Database services
DB_SERVICES=(
    "user-service"
    "auth-service"
    "matching-service"
    "messaging-service"
    "media-service"
    "payment-service"
    "notification-service"
    "analytics-service"
    "moderation-service"
    "admin-service"
)

MIGRATED_SERVICES=()
BACKUP_IDS=()

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    cat << EOF
Database Migration Script with Rollback

Usage: $0 [OPTIONS]

Options:
  --env ENV             Environment (dev|staging|production)
  --service NAME        Migrate specific service only
  --dry-run             Show migrations without applying
  --no-backup           Skip backup before migration
  --no-auto-rollback    Don't automatically rollback on failure
  --namespace NS        Kubernetes namespace [default: flamoral-dating]
  --help                Show this help

Examples:
  $0 --env production
  $0 --env staging --service user-service
  $0 --env production --dry-run
EOF
    exit 0
}

# Get database connection info
get_db_connection() {
    local service_name="$1"

    # Get from Kubernetes secrets
    local db_host db_user db_password db_name

    db_host=$(kubectl get secret "${service_name}-secrets" -n "$NAMESPACE" \
        -o jsonpath='{.data.POSTGRES_HOST}' 2>/dev/null | base64 -d || echo "postgres-primary.flamoral-dating.svc.cluster.local")

    db_user=$(kubectl get secret "${service_name}-secrets" -n "$NAMESPACE" \
        -o jsonpath='{.data.POSTGRES_USER}' 2>/dev/null | base64 -d || echo "flamoral")

    db_password=$(kubectl get secret "${service_name}-secrets" -n "$NAMESPACE" \
        -o jsonpath='{.data.POSTGRES_PASSWORD}' 2>/dev/null | base64 -d || echo "")

    db_name=$(kubectl get configmap "${service_name}-config" -n "$NAMESPACE" \
        -o jsonpath='{.data.POSTGRES_DB}' 2>/dev/null || echo "flamoral_${service_name//-/_}")

    if [[ -z "$db_password" ]]; then
        log_error "Cannot retrieve database password for $service_name"
        return 1
    fi

    echo "$db_host|$db_user|$db_password|$db_name"
}

# Create database backup
create_database_backup() {
    local service_name="$1"

    log_info "Creating database backup for $service_name..."

    local db_info
    db_info=$(get_db_connection "$service_name") || return 1

    IFS='|' read -r db_host db_user db_password db_name <<< "$db_info"

    local backup_id="backup_${service_name}_${TIMESTAMP}"
    local backup_file="/tmp/${backup_id}.sql"

    if [[ "$DRY_RUN" == "false" ]]; then
        # Create backup using pg_dump via Kubernetes job
        cat <<EOF | kubectl apply -f - -n "$NAMESPACE"
apiVersion: batch/v1
kind: Job
metadata:
  name: ${backup_id}
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: pg-backup
        image: postgres:15-alpine
        env:
        - name: PGHOST
          value: "$db_host"
        - name: PGUSER
          value: "$db_user"
        - name: PGPASSWORD
          value: "$db_password"
        - name: PGDATABASE
          value: "$db_name"
        command:
        - sh
        - -c
        - |
          pg_dump -Fc -f /backup/${backup_id}.dump
        volumeMounts:
        - name: backup
          mountPath: /backup
      volumes:
      - name: backup
        persistentVolumeClaim:
          claimName: database-backups
EOF

        # Wait for backup job to complete
        if kubectl wait --for=condition=complete \
            --timeout=300s \
            job/"${backup_id}" -n "$NAMESPACE"; then
            log_success "Backup created: $backup_id"
            BACKUP_IDS+=("$backup_id")
            return 0
        else
            log_error "Backup failed for $service_name"
            return 1
        fi
    else
        log_info "DRY RUN: Would create backup for $service_name"
        return 0
    fi
}

# Run migrations for a service
run_service_migrations() {
    local service_name="$1"

    log_info "Running migrations for $service_name..."

    local migration_dir="$PROJECT_ROOT/backend/services/$service_name/src/infrastructure/database/migrations"

    if [[ ! -d "$migration_dir" ]]; then
        log_warning "No migrations found for $service_name"
        return 0
    fi

    local db_info
    db_info=$(get_db_connection "$service_name") || return 1

    IFS='|' read -r db_host db_user db_password db_name <<< "$db_info"

    if [[ "$DRY_RUN" == "false" ]]; then
        # Create migration job
        local migration_job="migrate-${service_name}-${TIMESTAMP}"

        cat <<EOF | kubectl apply -f - -n "$NAMESPACE"
apiVersion: batch/v1
kind: Job
metadata:
  name: ${migration_job}
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: flamoral/${service_name}:latest
        env:
        - name: POSTGRES_HOST
          value: "$db_host"
        - name: POSTGRES_USER
          value: "$db_user"
        - name: POSTGRES_PASSWORD
          value: "$db_password"
        - name: POSTGRES_DB
          value: "$db_name"
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        command:
        - npm
        - run
        - migrate:up
EOF

        # Wait for migration job
        if kubectl wait --for=condition=complete \
            --timeout=300s \
            job/"${migration_job}" -n "$NAMESPACE"; then
            log_success "Migrations completed for $service_name"
            MIGRATED_SERVICES+=("$service_name")
            return 0
        else
            log_error "Migration failed for $service_name"

            # Show logs
            kubectl logs job/"${migration_job}" -n "$NAMESPACE" || true

            return 1
        fi
    else
        log_info "DRY RUN: Would run migrations for $service_name"

        # Show pending migrations
        log_info "Pending migrations:"
        ls -1 "$migration_dir" | tail -5
        return 0
    fi
}

# Rollback specific service migration
rollback_service_migration() {
    local service_name="$1"
    local backup_id="$2"

    log_warning "Rolling back $service_name to backup: $backup_id"

    if [[ "$DRY_RUN" == "false" ]]; then
        local db_info
        db_info=$(get_db_connection "$service_name") || return 1

        IFS='|' read -r db_host db_user db_password db_name <<< "$db_info"

        # Create restore job
        local restore_job="restore-${service_name}-${TIMESTAMP}"

        cat <<EOF | kubectl apply -f - -n "$NAMESPACE"
apiVersion: batch/v1
kind: Job
metadata:
  name: ${restore_job}
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: pg-restore
        image: postgres:15-alpine
        env:
        - name: PGHOST
          value: "$db_host"
        - name: PGUSER
          value: "$db_user"
        - name: PGPASSWORD
          value: "$db_password"
        - name: PGDATABASE
          value: "$db_name"
        command:
        - sh
        - -c
        - |
          pg_restore -Fc --clean --if-exists /backup/${backup_id}.dump
        volumeMounts:
        - name: backup
          mountPath: /backup
      volumes:
      - name: backup
        persistentVolumeClaim:
          claimName: database-backups
EOF

        if kubectl wait --for=condition=complete \
            --timeout=300s \
            job/"${restore_job}" -n "$NAMESPACE"; then
            log_success "Rollback completed for $service_name"
        else
            log_error "Rollback failed for $service_name"
            return 1
        fi
    else
        log_info "DRY RUN: Would rollback $service_name"
    fi
}

# Rollback all migrations
rollback_all_migrations() {
    log_warning "Rolling back all migrations..."

    local i=0
    for service in "${MIGRATED_SERVICES[@]}"; do
        if [[ $i -lt ${#BACKUP_IDS[@]} ]]; then
            rollback_service_migration "$service" "${BACKUP_IDS[$i]}"
        fi
        ((i++))
    done
}

# Verify migration success
verify_migrations() {
    log_info "Verifying migrations..."

    local all_verified=true

    for service in "${MIGRATED_SERVICES[@]}"; do
        local db_info
        db_info=$(get_db_connection "$service") || continue

        IFS='|' read -r db_host db_user db_password db_name <<< "$db_info"

        # Check if migration tracking table exists
        if kubectl run -n "$NAMESPACE" --rm -i --restart=Never \
            verify-${RANDOM} --image=postgres:15-alpine \
            --env="PGHOST=$db_host" \
            --env="PGUSER=$db_user" \
            --env="PGPASSWORD=$db_password" \
            --env="PGDATABASE=$db_name" \
            -- psql -c "SELECT * FROM knex_migrations ORDER BY id DESC LIMIT 1;" &> /dev/null; then
            log_success "$service: Migration tracking verified"
        else
            log_error "$service: Migration tracking not found"
            all_verified=false
        fi
    done

    if [[ "$all_verified" == "true" ]]; then
        log_success "All migrations verified successfully"
        return 0
    else
        return 1
    fi
}

# Main execution
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --service)
                SPECIFIC_SERVICE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --no-backup)
                BACKUP_BEFORE_MIGRATE=false
                shift
                ;;
            --no-auto-rollback)
                AUTO_ROLLBACK=false
                shift
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    log_info "Database Migration Started"
    log_info "Environment: $ENVIRONMENT"
    log_info "Dry Run: $DRY_RUN"
    log_info "Auto Backup: $BACKUP_BEFORE_MIGRATE"
    log_info "Auto Rollback: $AUTO_ROLLBACK"

    # Determine services to migrate
    local services_to_migrate=()
    if [[ -n "$SPECIFIC_SERVICE" ]]; then
        services_to_migrate=("$SPECIFIC_SERVICE")
    else
        services_to_migrate=("${DB_SERVICES[@]}")
    fi

    # Ensure backup PVC exists
    if [[ "$BACKUP_BEFORE_MIGRATE" == "true" && "$DRY_RUN" == "false" ]]; then
        if ! kubectl get pvc database-backups -n "$NAMESPACE" &> /dev/null; then
            log_warning "Creating database backup PVC..."
            cat <<EOF | kubectl apply -f - -n "$NAMESPACE"
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-backups
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
EOF
        fi
    fi

    # Process each service
    local migration_failed=false

    for service in "${services_to_migrate[@]}"; do
        log_info "Processing $service..."

        # Create backup
        if [[ "$BACKUP_BEFORE_MIGRATE" == "true" ]]; then
            if ! create_database_backup "$service"; then
                log_error "Backup failed for $service, skipping migration"
                migration_failed=true
                continue
            fi
        fi

        # Run migration
        if ! run_service_migrations "$service"; then
            log_error "Migration failed for $service"
            migration_failed=true

            if [[ "$AUTO_ROLLBACK" == "true" ]]; then
                log_warning "Auto-rollback enabled, rolling back all migrations..."
                rollback_all_migrations
                exit 1
            else
                log_error "Auto-rollback disabled. Manual intervention required."
                exit 1
            fi
        fi

        # Brief pause between services
        sleep 2
    done

    if [[ "$migration_failed" == "true" ]]; then
        log_error "Some migrations failed"
        exit 1
    fi

    # Verify all migrations
    if [[ "$DRY_RUN" == "false" ]]; then
        if ! verify_migrations; then
            log_error "Migration verification failed"

            if [[ "$AUTO_ROLLBACK" == "true" ]]; then
                rollback_all_migrations
            fi

            exit 1
        fi
    fi

    log_success "All database migrations completed successfully!"
    log_info "Migrated services: ${MIGRATED_SERVICES[*]}"
}

main "$@"
